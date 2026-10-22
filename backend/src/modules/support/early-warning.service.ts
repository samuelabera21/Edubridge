import { prisma } from "../../infrastructure/prisma/client.js";
import { AnnouncementTarget, SupportFlagType } from "../../generated/prisma/enums.js";
import { CommunicationService } from "../communication/communication.service.js";

export interface AcademicEvaluationInput {
    organizationId: string;
    enrollmentId: string;
    assessmentId: string;
    score: number;
    gradedById?: string;
}

export interface AttendanceEvaluationInput {
    organizationId: string;
    enrollmentId: string;
    academicYearId: string;
    recordedById?: string;
}

export interface StudentRiskAssessment {
    enrollmentId: string;
    studentId: string;
    studentName: string;
    sectionName?: string;
    gradeName?: string;
    academicStatus: "GREEN" | "YELLOW" | "RED";
    attendanceStatus: "GREEN" | "YELLOW" | "RED";
    overallStatus: "GREEN" | "YELLOW" | "RED";
    flags: Array<{
        type: SupportFlagType;
        severity: "YELLOW" | "RED";
        title: string;
        message: string;
        createdAt: Date;
    }>;
    recentAverageScore: number | null;
    attendanceRate: number | null;
    consecutiveAbsences: number;
}

export class EarlyWarningService {

    // =========================================================================
    // 1. ACADEMIC EVALUATION (ውጤት ክትትል እና የአዝማሚያ ትንተና)
    // =========================================================================
    static async evaluateAcademicPerformance(input: AcademicEvaluationInput) {
        const { organizationId, enrollmentId, assessmentId, score, gradedById } = input;

        // Fetch enrollment with student, section, grade info
        const enrollment = await prisma.studentEnrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                student: {
                    include: {
                        parents: { include: { parent: true } }
                    }
                },
                section: true,
                schoolGrade: { include: { grade: true } }
            }
        });

        if (!enrollment || !enrollment.student) return;

        // Fetch assessment details
        const assessment = await prisma.assessment.findUnique({
            where: { id: assessmentId },
            include: {
                teachingAssignment: {
                    include: { subject: true, teacher: true }
                }
            }
        });

        if (!assessment) return;

        const maxScore = assessment.maxScore > 0 ? assessment.maxScore : 100;
        const currentPercentage = Math.round((score / maxScore) * 100);
        const subjectName = assessment.teachingAssignment?.subject?.name || assessment.title || "Subject";
        const teacherId = assessment.teachingAssignment?.teacher?.id;
        const studentName = `${enrollment.student.firstName} ${enrollment.student.lastName}`;

        // Fetch past results for baseline moving average calculation (up to 10 past results)
        const pastResults = await prisma.studentResult.findMany({
            where: {
                enrollmentId,
                assessmentId: { not: assessmentId },
                score: { gt: 0 }
            },
            include: {
                assessment: { select: { maxScore: true } }
            },
            orderBy: { createdAt: "desc" },
            take: 10
        });

        let pastScoresNormalized: number[] = [];
        for (const pr of pastResults) {
            const pMax = pr.assessment?.maxScore && pr.assessment.maxScore > 0 ? pr.assessment.maxScore : 100;
            pastScoresNormalized.push((pr.score / pMax) * 100);
        }

        const hasHistory = pastScoresNormalized.length > 0;
        const pastAverage = hasHistory
            ? Math.round(pastScoresNormalized.reduce((a, b) => a + b, 0) / pastScoresNormalized.length)
            : currentPercentage;

        // Relative drop calculation: difference between past average and current percentage
        const dropPercentagePoints = pastAverage - currentPercentage;

        let alertSeverity: "RED" | "YELLOW" | null = null;
        let alertTitle = "";
        let alertMessageAmharic = "";
        let alertMessageEnglish = "";

        // Rule A: Relative Drop (ድንገተኛ የውጤት መውረድ) - Drop >= 20%
        if (hasHistory && dropPercentagePoints >= 20) {
            alertSeverity = "RED";
            alertTitle = `🔴 [ድንገተኛ ውድቀት] የውጤት ቅናሽ ማስጠንቀቂያ - ${studentName}`;
            alertMessageAmharic = `የተማሪ ${studentName} የ${subjectName} ውጤት ካለፈው አማካይ (${pastAverage}%) በ ${dropPercentagePoints}% ድንገተኛ ቅናሽ አሳይቶ ${currentPercentage}% ሆኗል። አስቸኳይ ክትትልና ድጋፍ ያስፈልገዋል።`;
            alertMessageEnglish = `Sudden Academic Drop: Student ${studentName}'s score in ${subjectName} dropped by ${dropPercentagePoints}% from past average (${pastAverage}%) down to ${currentPercentage}%. Immediate support recommended.`;
        }
        // Rule B: Failing Grade (< 50%)
        else if (currentPercentage < 50) {
            alertSeverity = "RED";
            alertTitle = `🔴 [አስቸኳይ ማስጠንቀቂያ] ዝቅተኛ የውጤት ምጣኔ - ${studentName}`;
            alertMessageAmharic = `የተማሪ ${studentName} የ${subjectName} ውጤት ${currentPercentage}% ሆኖ ተመዝግቧል። ውጤቱ ከመውደቂያ ጣሪያ (50%) በታች በመሆኑ ተማሪው የመውደቅ አደጋ ተጋርጦበታል።`;
            alertMessageEnglish = `Critical Academic Alert: Student ${studentName} scored ${currentPercentage}% in ${subjectName}, which is below the 50% passing threshold. Immediate intervention required.`;
        }
        // Rule C: Needs Attention (50% - 70%)
        else if (currentPercentage >= 50 && currentPercentage <= 70) {
            alertSeverity = "YELLOW";
            alertTitle = `🟡 [የትኩረት ማሳሰቢያ] ውጤት ማሻሻል ያስፈልጋል - ${studentName}`;
            alertMessageAmharic = `የተማሪ ${studentName} የ${subjectName} ውጤት ${currentPercentage}% (መካከለኛ) ነው። የተሻለ ውጤት እንዲያስመዘግብ/እንድታስመዘግብ ተጨማሪ ጥረት እና ክትትል ይመከራል።`;
            alertMessageEnglish = `Academic Caution: Student ${studentName} scored ${currentPercentage}% in ${subjectName}. Additional study support and attention is advised.`;
        }

        // If an alert was triggered, create/update SupportFlag and notify
        if (alertSeverity) {
            await this.recordFlagAndAnnouncement({
                organizationId,
                enrollment,
                flagType: SupportFlagType.ACADEMIC,
                severity: alertSeverity,
                title: alertTitle,
                content: `${alertMessageAmharic}\n\n${alertMessageEnglish}`,
                teacherId,
                raisedById: gradedById
            });
        }
    }

    // =========================================================================
    // 2. ATTENDANCE EVALUATION (የመቅረት ሁኔታ እና የትምህርት ሚኒስቴር 80% ህግ)
    // =========================================================================
    static async evaluateAttendance(input: AttendanceEvaluationInput) {
        const { organizationId, enrollmentId, academicYearId, recordedById } = input;

        const enrollment = await prisma.studentEnrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                student: {
                    include: {
                        parents: { include: { parent: true } }
                    }
                },
                section: true,
                schoolGrade: { include: { grade: true } }
            }
        });

        if (!enrollment || !enrollment.student) return;

        const studentName = `${enrollment.student.firstName} ${enrollment.student.lastName}`;

        // 1. Check Consecutive Absences (የቅርብ ተከታታይ መቅረት)
        const recentRecords = await prisma.studentAttendance.findMany({
            where: { enrollmentId, academicYearId },
            orderBy: { date: "desc" },
            take: 15
        });

        let consecutiveAbsences = 0;
        for (const rec of recentRecords) {
            if (rec.status === "ABSENT") {
                consecutiveAbsences++;
            } else {
                break;
            }
        }

        // 2. Check Cumulative Attendance & Ethiopian MoE 80% Rule
        const allRecords = await prisma.studentAttendance.findMany({
            where: { enrollmentId, academicYearId }
        });

        const totalDays = allRecords.length;
        const attendedDays = allRecords.filter(r => r.status === "PRESENT" || r.status === "EXCUSED").length;
        const attendanceRate = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 100;

        let alertSeverity: "RED" | "YELLOW" | null = null;
        let alertTitle = "";
        let alertMessageAmharic = "";
        let alertMessageEnglish = "";

        // Check Ethiopian MoE 80% Rule first if enough school days have elapsed (at least 5 days recorded)
        if (totalDays >= 5 && attendanceRate < 80) {
            alertSeverity = "RED";
            alertTitle = `🔴 [የትምህርት ሚኒስቴር ማስጠንቀቂያ] ፈተና የመውሰድ እገዳ አደጋ - ${studentName}`;
            alertMessageAmharic = `የትምህርት ሚኒስቴር መመሪያ ማስጠንቀቂያ፦ አንድ ተማሪ በሴሚስተሩ ከ 80% በላይ መገኘት አለበት። የተማሪ ${studentName} የመገኘት ምጣኔ ወደ ${attendanceRate}% ዝቅ በማለቱ ፈተና እንዳይቀመጥ ሊታገድ ይችላል።`;
            alertMessageEnglish = `Ministry of Education (MoE) Rule Violation: Student attendance is at ${attendanceRate}%, falling below the mandatory 80% threshold required to take term examinations. Course repetition/exam bar risk.`;
        }
        else if (consecutiveAbsences >= 3) {
            alertSeverity = "RED";
            alertTitle = `🔴 [አስቸኳይ ማስጠንቀቂያ] የ ${consecutiveAbsences} ተከታታይ ቀናት መቅረት - ${studentName}`;
            alertMessageAmharic = `ተማሪ ${studentName} ለ ${consecutiveAbsences} ተከታታይ ቀናት ያለፈቃድ ከትምህርት ገበታው/ቷ ቀርቷል/ታለች። ወላጆች በአስቸኳይ ከትምህርት ቤቱ ጋር እንዲነጋገሩ ይጠየቃሉ።`;
            alertMessageEnglish = `Critical Attendance Alert: Student ${studentName} has been absent for ${consecutiveAbsences} consecutive school days without excuse. Immediate parent consultation required.`;
        }
        else if (totalDays >= 5 && attendanceRate >= 80 && attendanceRate <= 85) {
            alertSeverity = "YELLOW";
            alertTitle = `🟡 [የቅድመ-ጥንቃቄ ማሳሰቢያ] የመገኘት ምጣኔ ወደ 80% ገደብ ተቃርቧል - ${studentName}`;
            alertMessageAmharic = `የተማሪ ${studentName} የመገኘት ምጣኔ ${attendanceRate}% ነው። ወደ ትምህርት ሚኒስቴሩ 80% ዝቅተኛ ጣሪያ እየተቃረበ በመሆኑ ተጨማሪ መቅረት ለፈተና እንዳይቀመጥ ሊያደርገው ይችላል።`;
            alertMessageEnglish = `Attendance Warning: Student ${studentName}'s attendance is currently ${attendanceRate}%, approaching the strict 80% Ministry of Education threshold.`;
        }
        else if (consecutiveAbsences === 2) {
            alertSeverity = "YELLOW";
            alertTitle = `🟡 [ማሳሰቢያ] የ 2 ተከታታይ ቀናት መቅረት - ${studentName}`;
            alertMessageAmharic = `ተማሪ ${studentName} ለ 2 ተከታታይ ቀናት አልተገኘም/ችም። ምክንያቱ ተጣርቶ አስፈላጊው ክትትል እንዲደረግ እናሳስባለን።`;
            alertMessageEnglish = `Attendance Notice: Student ${studentName} has missed 2 consecutive school days. Please verify the reason for absence.`;
        }

        // If triggered, record flag and notify
        if (alertSeverity) {
            await this.recordFlagAndAnnouncement({
                organizationId,
                enrollment,
                flagType: SupportFlagType.ATTENDANCE,
                severity: alertSeverity,
                title: alertTitle,
                content: `${alertMessageAmharic}\n\n${alertMessageEnglish}`,
                raisedById: recordedById
            });
        }
    }

    // =========================================================================
    // 3. RECORD FLAG AND TARGETED ANNOUNCEMENT (ሚስጥራዊነት የተጠበቀ ማሳወቂያ)
    // =========================================================================
    private static async recordFlagAndAnnouncement(params: {
        organizationId: string;
        enrollment: any;
        flagType: SupportFlagType;
        severity: "RED" | "YELLOW";
        title: string;
        content: string;
        teacherId?: string;
        raisedById?: string;
    }) {
        const { organizationId, enrollment, flagType, severity, title, content, teacherId, raisedById } = params;

        const student = enrollment.student;
        if (!student) return;

        const flagDescription = `[${severity}] ${title}\n${content}`;

        // Upsert or create active support flag for this student
        const existingFlag = await prisma.supportFlag.findFirst({
            where: {
                organizationId,
                enrollmentId: enrollment.id,
                type: flagType,
                resolvedAt: null
            }
        });

        if (existingFlag) {
            await prisma.supportFlag.update({
                where: { id: existingFlag.id },
                data: {
                    description: flagDescription,
                    recipientTeacherId: teacherId || existingFlag.recipientTeacherId,
                    updatedAt: new Date()
                }
            });
        } else {
            await prisma.supportFlag.create({
                data: {
                    organizationId,
                    enrollmentId: enrollment.id,
                    type: flagType,
                    description: flagDescription,
                    recipientTeacherId: teacherId || null,
                    raisedById: raisedById || null
                }
            });
        }

        // Gather recipient users for the targeted announcement:
        // 1. Student User
        // 2. Parent User(s)
        // 3. Section Teacher(s)
        const studentUserId = student.userId;
        const parentUserIds: string[] = [];
        (student.parents || []).forEach((p: any) => {
            if (p.parent?.userId) {
                parentUserIds.push(p.parent.userId);
            }
        });

        // Resolve author ID (use raisedById or system admin/first user)
        let authorId = raisedById;
        if (!authorId) {
            const adminUser = await prisma.user.findFirst({
                where: { roleAssignments: { some: { scopeId: organizationId } } },
                select: { id: true }
            });
            authorId = adminUser?.id || studentUserId || undefined;
        }

        if (!authorId) return;

        // Post targeted Announcement so it appears on the Announcement boards for:
        // - Parent (ONLY their child)
        // - Student (ONLY themselves)
        // - Teacher (ONLY their student)
        try {
            await CommunicationService.createAnnouncement(organizationId, {
                title,
                content,
                category: flagType === SupportFlagType.ACADEMIC ? "ACADEMIC_ALERT" : "ATTENDANCE_ALERT",
                priority: severity === "RED" ? "CRITICAL" : "HIGH",
                target: AnnouncementTarget.ALL,
                targetDetails: {
                    targetRoles: ["PARENTS", "TEACHERS", "STUDENTS"],
                    studentIds: [student.id],
                    sectionIds: enrollment.sectionId ? [enrollment.sectionId] : []
                },
                authorId
            });
        } catch (err: any) {
            console.error("Failed to dispatch early warning announcement:", err?.message || err);
        }
    }

    // =========================================================================
    // 4. ROLE-BASED ACCESS CONTROL (ማን ምን ማየት ይችላል?)
    // =========================================================================
    static async getFlagsForCurrentUser(currentUserId: string, organizationId: string): Promise<StudentRiskAssessment[]> {
        // Check if user is a Parent
        const parent = await prisma.parent.findFirst({
            where: { userId: currentUserId },
            include: {
                children: {
                    include: {
                        student: {
                            include: {
                                enrollments: {
                                    where: { organizationId, status: { in: ["ACTIVE", "ENROLLED"] } },
                                    include: {
                                        section: true,
                                        schoolGrade: { include: { grade: true } }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (parent && parent.children.length > 0) {
            const results: StudentRiskAssessment[] = [];
            for (const rel of parent.children) {
                const enrollment = rel.student.enrollments[0];
                if (enrollment) {
                    const assessment = await this.compileStudentRisk(enrollment.id, organizationId);
                    if (assessment) results.push(assessment);
                }
            }
            return results;
        }

        // Check if user is a Student
        const student = await prisma.student.findFirst({
            where: { userId: currentUserId },
            include: {
                enrollments: {
                    where: { organizationId, status: { in: ["ACTIVE", "ENROLLED"] } },
                    include: {
                        section: true,
                        schoolGrade: { include: { grade: true } }
                    }
                }
            }
        });

        if (student && student.enrollments.length > 0 && student.enrollments[0]) {
            const enrollment = student.enrollments[0];
            const assessment = await this.compileStudentRisk(enrollment.id, organizationId);
            return assessment ? [assessment] : [];
        }

        // Check if user is a Teacher
        const teacher = await prisma.teacher.findFirst({
            where: { organizationId, userId: currentUserId },
            include: { assignments: { select: { sectionId: true } } }
        });

        if (teacher) {
            const sectionIds = Array.from(new Set(teacher.assignments.map(a => a.sectionId).filter(Boolean))) as string[];
            if (sectionIds.length === 0) return [];

            const enrollments = await prisma.studentEnrollment.findMany({
                where: {
                    organizationId,
                    sectionId: { in: sectionIds },
                    status: { in: ["ACTIVE", "ENROLLED"] }
                },
                select: { id: true }
            });

            const results: StudentRiskAssessment[] = [];
            for (const e of enrollments) {
                const assessment = await this.compileStudentRisk(e.id, organizationId);
                // Return flagged students or students needing attention to the teacher
                if (assessment && (assessment.overallStatus === "RED" || assessment.overallStatus === "YELLOW")) {
                    results.push(assessment);
                }
            }
            return results;
        }

        return [];
    }

    // Helper: Compile single student risk overview
    static async compileStudentRisk(enrollmentId: string, organizationId: string): Promise<StudentRiskAssessment | null> {
        const enrollment = await prisma.studentEnrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                student: true,
                section: true,
                schoolGrade: { include: { grade: true } },
                supportFlags: {
                    where: { resolvedAt: null },
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!enrollment || !enrollment.student) return null;

        // Recent average score
        const results = await prisma.studentResult.findMany({
            where: { enrollmentId },
            include: { assessment: { select: { maxScore: true } } },
            orderBy: { createdAt: "desc" },
            take: 5
        });

        let recentAverageScore: number | null = null;
        if (results.length > 0) {
            const scores = results.map(r => {
                const max = r.assessment?.maxScore && r.assessment.maxScore > 0 ? r.assessment.maxScore : 100;
                return (r.score / max) * 100;
            });
            recentAverageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }

        // Attendance rate & consecutive absences
        const attendances = await prisma.studentAttendance.findMany({
            where: { enrollmentId },
            orderBy: { date: "desc" }
        });

        const totalDays = attendances.length;
        const attendedDays = attendances.filter(a => a.status === "PRESENT" || a.status === "EXCUSED").length;
        const attendanceRate = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 100;

        let consecutiveAbsences = 0;
        for (const a of attendances) {
            if (a.status === "ABSENT") consecutiveAbsences++;
            else break;
        }

        // Evaluate academic status
        let academicStatus: "GREEN" | "YELLOW" | "RED" = "GREEN";
        if (recentAverageScore !== null) {
            if (recentAverageScore < 50) academicStatus = "RED";
            else if (recentAverageScore <= 70) academicStatus = "YELLOW";
        }

        // Evaluate attendance status
        let attendanceStatus: "GREEN" | "YELLOW" | "RED" = "GREEN";
        if (totalDays >= 5 && attendanceRate < 80) {
            attendanceStatus = "RED";
        } else if (consecutiveAbsences >= 3) {
            attendanceStatus = "RED";
        } else if ((totalDays >= 5 && attendanceRate <= 85) || consecutiveAbsences === 2) {
            attendanceStatus = "YELLOW";
        }

        // Overall status: highest risk
        let overallStatus: "GREEN" | "YELLOW" | "RED" = "GREEN";
        if (academicStatus === "RED" || attendanceStatus === "RED") {
            overallStatus = "RED";
        } else if (academicStatus === "YELLOW" || attendanceStatus === "YELLOW") {
            overallStatus = "YELLOW";
        }

        const flags = enrollment.supportFlags.map(sf => {
            const isRed = sf.description.includes("[RED]");
            return {
                type: sf.type,
                severity: (isRed ? "RED" : "YELLOW") as "RED" | "YELLOW",
                title: (sf.description ? sf.description.split("\n")[0] || "" : "").replace(/^\[(RED|YELLOW)\]\s*/, ""),
                message: sf.description,
                createdAt: sf.createdAt
            };
        });

        return {
            enrollmentId,
            studentId: enrollment.student.id,
            studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
            sectionName: enrollment.section?.name,
            gradeName: enrollment.schoolGrade?.grade?.name,
            academicStatus,
            attendanceStatus,
            overallStatus,
            flags,
            recentAverageScore,
            attendanceRate,
            consecutiveAbsences
        };
    }
}
