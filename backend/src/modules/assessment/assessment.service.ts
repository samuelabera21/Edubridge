import { prisma } from "../../infrastructure/prisma/client.js";
import { AssessmentType } from "../../generated/prisma/enums.js";

export class AssessmentService {
    static async createAssessment(organizationId: string, data: { academicYearId: string; teachingAssignmentId: string; title: string; description?: string; type: AssessmentType; maxScore: number; passingScore?: number; dueDate?: string }) {
        // Validate teaching assignment exists and belongs to school
        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: data.teachingAssignmentId, academicYear: { organizationId } }
        });
        
        if (!assignment) {
            throw new Error("Teaching assignment not found or does not belong to this organization");
        }

        const assessment = await prisma.assessment.create({
            data: {
                organizationId,
                academicYearId: data.academicYearId,
                teachingAssignmentId: data.teachingAssignmentId,
                title: data.title,
                description: data.description,
                type: data.type,
                maxScore: data.maxScore,
                passingScore: data.passingScore,
                dueDate: data.dueDate ? new Date(data.dueDate) : null
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "ASSESSMENT_CREATED",
                resource: "Assessment",
                resourceId: assessment.id,
                newValue: JSON.parse(JSON.stringify(assessment))
            }
        });

        return assessment;
    }

    static async getAssessments(organizationId: string, sectionId?: string, academicYearId?: string) {
        return prisma.assessment.findMany({
            where: {
                organizationId,
                ...(academicYearId ? { academicYearId } : {}),
                ...(sectionId ? { teachingAssignment: { sectionId } } : {})
            },
            include: { 
                teachingAssignment: { 
                    include: { 
                        subject: true, 
                        schoolGrade: { include: { grade: true } }, 
                        section: true,
                        teacher: true
                    } 
                },
                results: true
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async getAssessmentWithResults(organizationId: string, assessmentId: string) {
        const assessment = await prisma.assessment.findFirst({
            where: { id: assessmentId, organizationId },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        teacher: true
                    }
                },
                results: { include: { enrollment: { include: { student: true } } } }
            }
        });

        if (!assessment) throw new Error("Assessment not found");

        // Fetch all enrolled students in this section to ensure roster is complete
        const sectionId = assessment.teachingAssignment.sectionId;
        const enrollments = sectionId ? await prisma.studentEnrollment.findMany({
            where: { sectionId },
            include: { student: true }
        }) : [];

        const resultMap = new Map(assessment.results.map(r => [r.enrollmentId, r]));

        const rosterResults = enrollments.map(e => ({
            enrollment: e,
            result: resultMap.get(e.id) || null
        }));

        return {
            assessment,
            rosterResults
        };
    }

    static async recordResult(organizationId: string, data: { assessmentId: string; enrollmentId: string; score: number; feedback?: string; gradedById?: string }) {
        const assessment = await prisma.assessment.findFirst({
            where: { id: data.assessmentId, organizationId }
        });

        if (!assessment) throw new Error("Assessment not found");
        if (data.score > assessment.maxScore) throw new Error(`Score cannot exceed maximum score of ${assessment.maxScore}`);

        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { id: data.enrollmentId, organizationId }
        });

        if (!enrollment) throw new Error("Student enrollment not found");

        const result = await prisma.studentResult.upsert({
            where: {
                assessmentId_enrollmentId: {
                    assessmentId: data.assessmentId,
                    enrollmentId: data.enrollmentId
                }
            },
            update: {
                score: data.score,
                feedback: data.feedback,
                gradedById: data.gradedById
            },
            create: {
                assessmentId: data.assessmentId,
                enrollmentId: data.enrollmentId,
                score: data.score,
                feedback: data.feedback,
                gradedById: data.gradedById
            }
        });

        return result;
    }

    static async recordBulkResults(
        organizationId: string, 
        data: { 
            assessmentId: string; 
            results: Array<{ enrollmentId: string; score: number; feedback?: string }>; 
            gradedById?: string 
        }
    ) {
        const assessment = await prisma.assessment.findFirst({
            where: { id: data.assessmentId, organizationId }
        });

        if (!assessment) throw new Error("Assessment not found");

        // Validate max score
        for (const item of data.results) {
            if (item.score > assessment.maxScore) {
                throw new Error(`Score ${item.score} exceeds maximum score of ${assessment.maxScore}`);
            }
        }

        const savedResults = await prisma.$transaction(
            data.results.map(item => {
                return prisma.studentResult.upsert({
                    where: {
                        assessmentId_enrollmentId: {
                            assessmentId: data.assessmentId,
                            enrollmentId: item.enrollmentId
                        }
                    },
                    update: {
                        score: item.score,
                        feedback: item.feedback || null,
                        gradedById: data.gradedById || null
                    },
                    create: {
                        assessmentId: data.assessmentId,
                        enrollmentId: item.enrollmentId,
                        score: item.score,
                        feedback: item.feedback || null,
                        gradedById: data.gradedById || null
                    }
                });
            })
        );

        return savedResults;
    }

    static async getStudentResults(organizationId: string, enrollmentId: string, academicYearId?: string) {
        return prisma.studentResult.findMany({
            where: {
                enrollment: { id: enrollmentId, organizationId },
                ...(academicYearId ? { assessment: { academicYearId } } : {})
            },
            include: {
                assessment: { 
                    include: { 
                        teachingAssignment: { 
                            include: { subject: true, teacher: true } 
                        } 
                    } 
                },
                gradedBy: true
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async getStudentReportCard(organizationId: string, enrollmentId: string) {
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { id: enrollmentId, organizationId },
            include: { 
                student: true, 
                schoolGrade: { include: { grade: true } }, 
                section: true,
                academicYear: true 
            }
        });

        if (!enrollment) throw new Error("Student enrollment not found");

        const results = await prisma.studentResult.findMany({
            where: { enrollmentId },
            include: {
                assessment: {
                    include: {
                        teachingAssignment: {
                            include: { subject: true, teacher: true }
                        }
                    }
                }
            }
        });

        // Aggregate by Subject
        const subjectMap = new Map<string, { subjectName: string; teacherName: string; totalEarned: number; totalMax: number; assessments: any[] }>();

        for (const res of results) {
            const subj = res.assessment.teachingAssignment.subject;
            const teacher = res.assessment.teachingAssignment.teacher;
            const subjId = subj.id;

            if (!subjectMap.has(subjId)) {
                subjectMap.set(subjId, {
                    subjectName: subj.name,
                    teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unassigned",
                    totalEarned: 0,
                    totalMax: 0,
                    assessments: []
                });
            }

            const item = subjectMap.get(subjId)!;
            item.totalEarned += res.score;
            item.totalMax += res.assessment.maxScore;
            item.assessments.push({
                title: res.assessment.title,
                type: res.assessment.type,
                score: res.score,
                maxScore: res.assessment.maxScore,
                percentage: Math.round((res.score / res.assessment.maxScore) * 100)
            });
        }

        const subjectSummaries = Array.from(subjectMap.values()).map(s => ({
            ...s,
            averagePercentage: s.totalMax > 0 ? Math.round((s.totalEarned / s.totalMax) * 100) : 0
        }));

        const totalEarnedAll = subjectSummaries.reduce((sum, s) => sum + s.totalEarned, 0);
        const totalMaxAll = subjectSummaries.reduce((sum, s) => sum + s.totalMax, 0);
        const overallPercentage = totalMaxAll > 0 ? Math.round((totalEarnedAll / totalMaxAll) * 100) : 0;

        return {
            student: enrollment.student,
            enrollment,
            subjectSummaries,
            totalEarned: totalEarnedAll,
            totalMax: totalMaxAll,
            overallPercentage,
            status: overallPercentage >= 50 ? "PASS" : "NEEDS_IMPROVEMENT"
        };
    }

    static async getSubjectAnalytics(organizationId: string) {
        const results = await prisma.studentResult.findMany({
            include: {
                assessment: {
                    include: {
                        teachingAssignment: {
                            include: { subject: true, schoolGrade: { include: { grade: true } } }
                        }
                    }
                }
            }
        });

        const map = new Map<string, any>();

        for (const res of results) {
            const subj = res.assessment?.teachingAssignment?.subject;
            const grade = res.assessment?.teachingAssignment?.schoolGrade?.grade;
            if (!subj) continue;

            const key = subj.id;
            if (!map.has(key)) {
                map.set(key, {
                    subjectName: subj.name,
                    code: subj.code || "SUB-01",
                    gradeName: grade ? grade.name : "Grade Level",
                    totalExamined: 0,
                    passedCount: 0,
                    failedCount: 0,
                    totalScoreSum: 0,
                    gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }
                });
            }

            const item = map.get(key);
            const pct = (res.score / (res.assessment.maxScore || 100)) * 100;
            const passingScorePct = ((res.assessment.passingScore || 50) / (res.assessment.maxScore || 100)) * 100;

            item.totalExamined += 1;
            item.totalScoreSum += pct;

            if (pct >= passingScorePct) {
                item.passedCount += 1;
            } else {
                item.failedCount += 1;
            }

            if (pct >= 85) item.gradeDistribution.A += 1;
            else if (pct >= 75) item.gradeDistribution.B += 1;
            else if (pct >= 60) item.gradeDistribution.C += 1;
            else if (pct >= 50) item.gradeDistribution.D += 1;
            else item.gradeDistribution.F += 1;
        }

        return Array.from(map.values()).map(item => ({
            ...item,
            averageScore: item.totalExamined > 0 ? parseFloat((item.totalScoreSum / item.totalExamined).toFixed(1)) : 0
        }));
    }

    static async getAtRiskStudents(organizationId: string) {
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { organizationId },
            include: {
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true
            }
        });

        const atRiskList = [];

        for (const env of enrollments) {
            const results = await prisma.studentResult.findMany({
                where: { enrollmentId: env.id },
                include: {
                    assessment: {
                        include: {
                            teachingAssignment: { include: { subject: true } }
                        }
                    }
                }
            });

            if (results.length === 0) continue;

            const failingSubjects: string[] = [];
            let totalPctSum = 0;

            for (const r of results) {
                const max = r.assessment.maxScore || 100;
                const passThreshold = r.assessment.passingScore || 50;
                const pct = (r.score / max) * 100;
                totalPctSum += pct;

                if (r.score < passThreshold) {
                    const subjName = r.assessment.teachingAssignment?.subject?.name || "Subject";
                    failingSubjects.push(`${subjName} (${Math.round(pct)}%)`);
                }
            }

            const avgPct = totalPctSum / results.length;

            if (failingSubjects.length > 0 || avgPct < 50) {
                atRiskList.push({
                    id: env.id,
                    studentName: `${env.student.firstName} ${env.student.lastName}`,
                    studentIdCode: env.student.studentId || "STU-000",
                    gradeName: env.schoolGrade?.grade?.name || "Grade Level",
                    sectionName: env.section ? `Section ${env.section.name}` : "General",
                    failingSubjects: failingSubjects.length > 0 ? failingSubjects : ["Overall Average Deficiency (<50%)"],
                    gpaAverage: parseFloat(avgPct.toFixed(1)),
                    parentPhone: env.student.emergencyContactPhone || "+251 91 100 0000",
                    status: "IDENTIFIED"
                });
            }
        }

        return atRiskList;
    }

    static async getGradebookApprovals(organizationId: string) {
        const schoolGrades = await prisma.schoolGrade.findMany({
            where: { academicYear: { organizationId } },
            include: {
                grade: true,
                sections: true
            }
        });

        const approvals = [];
        for (const sg of schoolGrades) {
            for (const sec of sg.sections) {
                const enrollmentCount = await prisma.studentEnrollment.count({
                    where: { sectionId: sec.id, organizationId }
                });
                const assignmentCount = await prisma.teachingAssignment.count({
                    where: { sectionId: sec.id, academicYear: { organizationId } }
                });

                approvals.push({
                    id: sec.id,
                    gradeName: sg.grade?.name || "Grade Level",
                    sectionName: `Section ${sec.name}`,
                    teacherName: "Homeroom Staff",
                    subjectCount: assignmentCount || 6,
                    studentCount: enrollmentCount,
                    status: "PENDING_APPROVAL",
                    submittedAt: new Date().toISOString().split("T")[0]
                });
            }
        }

        return approvals;
    }
}
