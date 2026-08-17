import { prisma } from "../../infrastructure/prisma/client.js";
import { IssuePriority, SupportFlagType, ActivityType, SubmissionStatus, AttendanceStatus } from "../../generated/prisma/enums.js";

export class TeacherService {
    static async createTeacher(organizationId: string, data: any) {
        // Run as a transaction so that if assignment fails, the teacher creation rolls back
        return await prisma.$transaction(async (tx) => {
            const teacher = await tx.teacher.create({
                data: {
                    organizationId,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    fatherName: data.fatherName || null,
                    grandfatherName: data.grandfatherName || null,
                    gender: data.gender || null,
                    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                    qualification: data.qualification || null,
                    fieldOfStudy: data.fieldOfStudy || null,
                    yearsOfExperience: data.yearsOfExperience ? parseInt(data.yearsOfExperience, 10) : null,
                    phoneNumber: data.phoneNumber || null,
                    email: data.email || null,
                    region: data.region || null,
                    zone: data.zone || null,
                    woreda: data.woreda || null,
                    city: data.city || null,
                    kebele: data.kebele || null,
                    houseNumber: data.houseNumber || null,
                    photoUrl: data.photoUrl || null,
                    documents: data.documents || null,
                    employeeId: data.employeeId || null,
                    userId: data.userId || null,
                }
            });

            await tx.auditLog.create({
                data: {
                    organizationId,
                    action: "TEACHER_CREATED",
                    resource: "Teacher",
                    resourceId: teacher.id,
                    newValue: JSON.parse(JSON.stringify(teacher)),
                    userId: data.userId || null
                }
            });

            // Initial Assignment handling
            if (data.initialAssignment && data.initialAssignment.academicYearId && data.initialAssignment.subjectId && data.initialAssignment.schoolGradeId) {
                // Validate subject belongs to school
                const subject = await tx.subject.findFirst({
                    where: { id: data.initialAssignment.subjectId, organizationId }
                });
                if (!subject) throw new Error("Subject not found in this school");

                // Validate grade belongs to school and academic year
                const schoolGrade = await tx.schoolGrade.findFirst({
                    where: { id: data.initialAssignment.schoolGradeId, academicYearId: data.initialAssignment.academicYearId, academicYear: { organizationId } }
                });
                if (!schoolGrade) throw new Error("Invalid school grade or academic year");

                const assignment = await tx.teachingAssignment.create({
                    data: {
                        teacherId: teacher.id,
                        academicYearId: data.initialAssignment.academicYearId,
                        subjectId: data.initialAssignment.subjectId,
                        schoolGradeId: data.initialAssignment.schoolGradeId,
                        sectionId: data.initialAssignment.sectionId || null
                    }
                });

                await tx.auditLog.create({
                    data: {
                        organizationId,
                        action: "TEACHING_ASSIGNMENT_CREATED",
                        resource: "TeachingAssignment",
                        resourceId: assignment.id,
                        newValue: JSON.parse(JSON.stringify(assignment)),
                        userId: data.userId || null
                    }
                });
            }

            return teacher;
        });
    }

    static async getTeacherById(organizationId: string, teacherId: string) {
        return prisma.teacher.findFirst({
            where: { id: teacherId, organizationId },
            include: {
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        academicYear: true
                    }
                }
            }
        });
    }

    static async getTeachers(organizationId: string) {
        return prisma.teacher.findMany({
            where: { organizationId },
            include: {
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async assignTeacher(organizationId: string, data: { teacherId: string; academicYearId: string; subjectId: string; schoolGradeId: string; sectionId?: string }) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: data.teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found in this school");

        const subject = await prisma.subject.findFirst({
            where: { id: data.subjectId, organizationId }
        });
        if (!subject) throw new Error("Subject not found in this school");

        const schoolGrade = await prisma.schoolGrade.findFirst({
            where: { id: data.schoolGradeId, academicYearId: data.academicYearId, academicYear: { organizationId } }
        });
        if (!schoolGrade) throw new Error("Invalid school grade or academic year");

        if (data.sectionId) {
            const section = await prisma.section.findFirst({
                where: { id: data.sectionId, schoolGradeId: data.schoolGradeId }
            });
            if (!section) throw new Error("Section does not belong to this grade");
        }

        const existing = await prisma.teachingAssignment.findFirst({
            where: { 
                teacherId: data.teacherId, 
                academicYearId: data.academicYearId, 
                subjectId: data.subjectId, 
                sectionId: data.sectionId || null 
            }
        });

        if (existing) {
            throw new Error("This exact teaching assignment already exists");
        }

        const assignment = await prisma.teachingAssignment.create({
            data: {
                teacherId: data.teacherId,
                academicYearId: data.academicYearId,
                subjectId: data.subjectId,
                schoolGradeId: data.schoolGradeId,
                sectionId: data.sectionId || null,
                periodsPerWeek: data.periodsPerWeek ? Number(data.periodsPerWeek) : 0
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_CREATED",
                resource: "TeachingAssignment",
                resourceId: assignment.id,
                newValue: JSON.parse(JSON.stringify(assignment)),
            }
        });

        return assignment;
    }

    static async getAssignments(organizationId: string, academicYearId?: string) {
        return prisma.teachingAssignment.findMany({
            where: {
                teacher: { organizationId },
                ...(academicYearId ? { academicYearId: String(academicYearId) } : {})
            },
            include: {
                teacher: true,
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: true
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async updateAssignment(id: string, organizationId: string, data: { subjectId?: string; schoolGradeId?: string; sectionId?: string; isPrimary?: boolean; periodsPerWeek?: number }) {
        const existing = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } }
        });
        if (!existing) throw new Error("Teaching assignment not found");

        if (data.schoolGradeId) {
            const schoolGrade = await prisma.schoolGrade.findFirst({
                where: { id: data.schoolGradeId, academicYearId: existing.academicYearId, academicYear: { organizationId } }
            });
            if (!schoolGrade) throw new Error("Invalid school grade for this academic year");
        }

        if (data.sectionId) {
            const gradeId = data.schoolGradeId || existing.schoolGradeId;
            const section = await prisma.section.findFirst({
                where: { id: data.sectionId, schoolGradeId: gradeId }
            });
            if (!section) throw new Error("Section does not belong to the selected grade");
        }

        const assignment = await prisma.teachingAssignment.update({
            where: { id },
            data: {
                ...(data.subjectId && { subjectId: data.subjectId }),
                ...(data.schoolGradeId && { schoolGradeId: data.schoolGradeId }),
                ...(data.sectionId !== undefined && { sectionId: data.sectionId || null }),
                ...(data.periodsPerWeek !== undefined && { periodsPerWeek: Number(data.periodsPerWeek) })
            },
            include: {
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: true
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_UPDATED",
                resource: "TeachingAssignment",
                resourceId: assignment.id,
                newValue: JSON.parse(JSON.stringify(assignment)),
            }
        });

        return assignment;
    }

    static async deleteAssignment(id: string, organizationId: string) {
        const existing = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } }
        });
        if (!existing) throw new Error("Teaching assignment not found");

        await prisma.teachingAssignment.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_DELETED",
                resource: "TeachingAssignment",
                resourceId: id,
                oldValue: JSON.parse(JSON.stringify(existing)),
            }
        });
    }

    static async getTeacherByUserId(userId: string, organizationId: string) {
        return prisma.teacher.findFirst({
            where: { userId, organizationId },
            include: {
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: {
                            include: {
                                studentEnrollments: {
                                    include: {
                                        student: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    static async getMyClasses(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) return [];

        const assignments = await prisma.teachingAssignment.findMany({
            where: { teacherId: teacher.id },
            include: {
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: {
                    include: {
                        studentEnrollments: {
                            include: {
                                student: true
                            }
                        }
                    }
                }
            }
        });

        return assignments.map((a) => ({
            assignment: a,
            students: a.section?.studentEnrollments || []
        }));
    }

    static async getMyTimetable(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) return [];

        return prisma.timetable.findMany({
            where: {
                organizationId,
                teachingAssignment: {
                    teacherId: teacher.id
                }
            },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                },
                classPeriod: true
            },
            orderBy: [
                { dayOfWeek: "asc" }
            ]
        });
    }

    static async getMyStudents(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) return [];

        const sectionIds = teacher.assignments
            .map((a) => a.sectionId)
            .filter((id): id is string => Boolean(id));

        if (sectionIds.length === 0) return [];

        return prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                sectionId: { in: sectionIds },
                status: "ACTIVE"
            },
            include: {
                student: true,
                section: true,
                schoolGrade: { include: { grade: true } },
                attendances: {
                    take: 10,
                    orderBy: { date: "desc" }
                },
                results: {
                    take: 5,
                    include: { assessment: true },
                    orderBy: { createdAt: "desc" }
                }
            }
        });
    }

    static async getDashboardSummary(userId: string, organizationId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) {
            return {
                profile: null,
                todayClasses: [],
                totalStudents: 0,
                pendingAssessmentsCount: 0,
                pendingSubmissionsCount: 0,
                studentsRequiringAttention: [],
                aiTeachingInsights: {
                    summary: "No teacher profile linked to this user account.",
                    priorities: ["Contact school administrator to link your staff record."]
                }
            };
        }

        const today = new Date();
        const currentDayOfWeek = today.getDay();

        const todayTimetable = await prisma.timetable.findMany({
            where: {
                organizationId,
                teachingAssignment: { teacherId: teacher.id },
                dayOfWeek: currentDayOfWeek
            },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: {
                            include: {
                                studentEnrollments: {
                                    where: { status: "ACTIVE" }
                                }
                            }
                        }
                    }
                },
                classPeriod: true
            },
            orderBy: { classPeriod: { startTime: "asc" } }
        });

        const todayClasses = todayTimetable.map((t) => ({
            id: t.id,
            time: `${t.classPeriod.startTime} - ${t.classPeriod.endTime}`,
            subject: t.teachingAssignment.subject.name,
            section: `Grade ${t.teachingAssignment.schoolGrade.grade.level} ${t.teachingAssignment.section?.name || ''}`,
            room: t.roomId || "Standard Classroom",
            studentCount: t.teachingAssignment.section?.studentEnrollments.length || 0,
            sectionId: t.teachingAssignment.sectionId,
            classPeriodId: t.classPeriodId,
            teachingAssignmentId: t.teachingAssignmentId
        }));

        const sectionIds = teacher.assignments
            .map((a) => a.sectionId)
            .filter((id): id is string => Boolean(id));

        const totalStudents = sectionIds.length > 0 ? await prisma.studentEnrollment.count({
            where: {
                organizationId,
                sectionId: { in: sectionIds },
                status: "ACTIVE"
            }
        }) : 0;

        const assignmentIds = teacher.assignments.map((a) => a.id);
        const pendingAssessmentsCount = assignmentIds.length > 0 ? await prisma.assessment.count({
            where: {
                organizationId,
                teachingAssignmentId: { in: assignmentIds }
            }
        }) : 0;

        const pendingSubmissionsCount = assignmentIds.length > 0 ? await prisma.submission.count({
            where: {
                activity: {
                    organizationId,
                    teachingAssignmentId: { in: assignmentIds }
                },
                status: "SUBMITTED"
            }
        }) : 0;

        const supportFlags = sectionIds.length > 0 ? await prisma.supportFlag.findMany({
            where: {
                organizationId,
                enrollment: { sectionId: { in: sectionIds } },
                resolvedAt: null
            },
            include: {
                enrollment: {
                    include: {
                        student: true,
                        section: true,
                        schoolGrade: { include: { grade: true } }
                    }
                }
            },
            take: 5
        }) : [];

        const studentsRequiringAttention = supportFlags.map((sf) => ({
            id: sf.id,
            studentName: `${sf.enrollment.student.firstName} ${sf.enrollment.student.lastName}`,
            section: `Grade ${sf.enrollment.schoolGrade.grade.level} ${sf.enrollment.section?.name || ''}`,
            reason: sf.description,
            type: sf.type
        }));

        const insightsSummary = todayClasses.length > 0
            ? `You have ${todayClasses.length} class(es) scheduled for today. ${studentsRequiringAttention.length} student(s) currently have open support flags requiring attention.`
            : `No live classes scheduled for today. ${pendingAssessmentsCount} active assessment(s) are recorded for your classes.`;

        const priorities: string[] = [];
        const firstClass = todayClasses[0];
        if (firstClass) priorities.push(`Complete attendance for ${firstClass.subject} (${firstClass.section})`);
        if (pendingSubmissionsCount > 0) priorities.push(`Review ${pendingSubmissionsCount} pending student submission(s)`);
        const firstStudent = studentsRequiringAttention[0];
        if (firstStudent) priorities.push(`Review support recommendation for ${firstStudent.studentName}`);
        if (priorities.length === 0) priorities.push("Prepare upcoming lesson materials and review curriculum progress.");

        return {
            profile: teacher,
            todayClasses,
            totalStudents,
            pendingAssessmentsCount,
            pendingSubmissionsCount,
            studentsRequiringAttention,
            aiTeachingInsights: {
                summary: insightsSummary,
                priorities
            }
        };
    }

    // Subdomain 3: Detailed Student Profile
    static async getStudentDetail(userId: string, organizationId: string, studentId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const sectionIds = teacher.assignments
            .map((a) => a.sectionId)
            .filter((id): id is string => Boolean(id));

        const enrollment = await prisma.studentEnrollment.findFirst({
            where: {
                organizationId,
                studentId,
                sectionId: { in: sectionIds }
            },
            include: {
                student: true,
                section: true,
                schoolGrade: { include: { grade: true } },
                attendances: {
                    take: 20,
                    orderBy: { date: "desc" },
                    include: { classPeriod: true }
                },
                results: {
                    take: 10,
                    include: { assessment: true },
                    orderBy: { createdAt: "desc" }
                },
                supportFlags: {
                    orderBy: { createdAt: "desc" }
                },
                submissions: {
                    take: 10,
                    include: { activity: true },
                    orderBy: { createdAt: "desc" }
                }
            }
        });

        if (!enrollment) throw new Error("Student enrollment not found in your assigned classes");
        return enrollment;
    }

    // Subdomain 4: Batch Section Attendance
    static async recordBatchAttendance(userId: string, organizationId: string, data: {
        academicYearId: string;
        sectionId: string;
        classPeriodId?: string;
        date: string;
        attendances: Array<{ enrollmentId: string; status: AttendanceStatus; remarks?: string }>;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const targetDate = new Date(data.date);

        const results = [];
        for (const item of data.attendances) {
            const existing = await prisma.studentAttendance.findFirst({
                where: {
                    enrollmentId: item.enrollmentId,
                    date: targetDate,
                    classPeriodId: data.classPeriodId || null
                }
            });

            if (existing) {
                const updated = await prisma.studentAttendance.update({
                    where: { id: existing.id },
                    data: {
                        status: item.status,
                        remarks: item.remarks,
                        recordedById: userId
                    }
                });
                results.push(updated);
            } else {
                const created = await prisma.studentAttendance.create({
                    data: {
                        organizationId,
                        academicYearId: data.academicYearId,
                        enrollmentId: item.enrollmentId,
                        classPeriodId: data.classPeriodId || null,
                        date: targetDate,
                        status: item.status,
                        remarks: item.remarks,
                        recordedById: userId
                    }
                });
                results.push(created);
            }
        }

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_BATCH_ATTENDANCE_RECORDED",
                resource: "StudentAttendance",
                resourceId: data.sectionId,
                newValue: { date: data.date, count: results.length },
                userId
            }
        });

        return results;
    }

    // Subdomain 6: Create Assessment & Batch Results
    static async createAssessmentWithResults(userId: string, organizationId: string, data: {
        title: string;
        type?: string;
        maxScore: number;
        passingScore?: number;
        dueDate?: string;
        teachingAssignmentId: string;
        results?: Array<{ enrollmentId: string; score: number; feedback?: string }>;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: data.teachingAssignmentId, teacherId: teacher.id }
        });
        if (!assignment) throw new Error("Teaching assignment not found or unassigned");

        const assessmentType = data.type?.toUpperCase() || "QUIZ";

        const assessment = await prisma.assessment.create({
            data: {
                organizationId,
                academicYearId: assignment.academicYearId,
                teachingAssignmentId: data.teachingAssignmentId,
                title: data.title,
                type: assessmentType as any,
                maxScore: data.maxScore,
                passingScore: data.passingScore || (data.maxScore * 0.5),
                dueDate: data.dueDate ? new Date(data.dueDate) : null
            }
        });

        if (data.results && data.results.length > 0) {
            for (const r of data.results) {
                await prisma.studentResult.upsert({
                    where: {
                        assessmentId_enrollmentId: {
                            assessmentId: assessment.id,
                            enrollmentId: r.enrollmentId
                        }
                    },
                    update: {
                        score: r.score,
                        feedback: r.feedback,
                        gradedById: userId
                    },
                    create: {
                        assessmentId: assessment.id,
                        enrollmentId: r.enrollmentId,
                        score: r.score,
                        feedback: r.feedback,
                        gradedById: userId
                    }
                });
            }
        }

        return prisma.assessment.findUnique({
            where: { id: assessment.id },
            include: { results: { include: { enrollment: { include: { student: true } } } } }
        });
    }

    // Subdomain 7: Grade Submission
    static async gradeActivitySubmission(userId: string, organizationId: string, submissionId: string, data: {
        status?: SubmissionStatus;
        grade?: string;
        feedback?: string;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const submission = await prisma.submission.findFirst({
            where: {
                id: submissionId,
                activity: { organizationId }
            }
        });

        if (!submission) throw new Error("Activity submission not found");

        return prisma.submission.update({
            where: { id: submissionId },
            data: {
                status: data.status || SubmissionStatus.GRADED,
                grade: data.grade,
                feedback: data.feedback
            }
        });
    }

    // Subdomain 8: Create Support Flag / Intervention
    static async createStudentSupportFlag(userId: string, organizationId: string, data: {
        enrollmentId: string;
        type: SupportFlagType;
        description: string;
    }) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const flag = await prisma.supportFlag.create({
            data: {
                organizationId,
                enrollmentId: data.enrollmentId,
                type: data.type,
                description: data.description,
                raisedById: userId
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_SUPPORT_FLAG_RAISED",
                resource: "SupportFlag",
                resourceId: flag.id,
                newValue: JSON.parse(JSON.stringify(flag)),
                userId
            }
        });

        return flag;
    }

    static async resolveSupportFlag(userId: string, organizationId: string, flagId: string, data: { resolution: string }) {
        const flag = await prisma.supportFlag.findFirst({
            where: { id: flagId, organizationId }
        });
        if (!flag) throw new Error("Support flag not found");

        return prisma.supportFlag.update({
            where: { id: flagId },
            data: {
                resolvedAt: new Date(),
                resolution: data.resolution
            }
        });
    }

    // Subdomain 9: Send Parent Message
    static async sendParentMessage(userId: string, organizationId: string, data: { parentUserId: string; content: string }) {
        const message = await prisma.message.create({
            data: {
                senderId: userId,
                receiverId: data.parentUserId,
                content: data.content,
                isRead: false
            }
        });

        return message;
    }

    // Subdomain 12: Class Performance Report
    static async getClassPerformanceReport(userId: string, organizationId: string, teachingAssignmentId: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: teachingAssignmentId, teacherId: teacher.id },
            include: {
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: {
                    include: {
                        studentEnrollments: {
                            where: { status: "ACTIVE" },
                            include: {
                                student: true,
                                results: { where: { assessment: { teachingAssignmentId } } },
                                attendances: { take: 30 }
                            }
                        }
                    }
                }
            }
        });

        if (!assignment) throw new Error("Teaching assignment not found");

        const students = assignment.section?.studentEnrollments || [];
        const totalStudents = students.length;

        let totalScores = 0;
        let totalCount = 0;

        students.forEach((s) => {
            s.results.forEach((r) => {
                totalScores += r.score;
                totalCount += 1;
            });
        });

        const classAverage = totalCount > 0 ? Number((totalScores / totalCount).toFixed(1)) : 0;

        return {
            assignmentId: assignment.id,
            subject: assignment.subject.name,
            grade: `Grade ${assignment.schoolGrade.grade.level}`,
            section: assignment.section?.name || "General",
            totalStudents,
            classAverage,
            totalAssessmentsRecorded: totalCount
        };
    }

    // Subdomain 13: AI Teacher Assistant Insight
    static async generateAiTeachingAssistantInsight(userId: string, organizationId: string, prompt: string, type?: string) {
        const teacher = await this.getTeacherByUserId(userId, organizationId);
        if (!teacher) throw new Error("Teacher profile not found");

        let category = type?.toUpperCase() || "LESSON_PLANNING";
        let recommendation = "";

        if (category === "LESSON_PLANNING") {
            recommendation = `AI Lesson Plan Suggestion for "${prompt}": Break the session into 10min Hook, 25min Concept Demonstration, 15min Guided Group Practice, and 10min Formative Exit Ticket.`;
        } else if (category === "QUESTION_GENERATION") {
            recommendation = `Generated 3 Practice Questions for "${prompt}":\n1. Concept Recall (Easy)\n2. Analytical Problem Solving (Medium)\n3. Real-world Application Scenario (Advanced).`;
        } else {
            recommendation = `AI Performance Insight: Focus additional group practice on fundamental concepts related to "${prompt}". Recommend assigning a targeted practice worksheet.`;
        }

        return {
            prompt,
            category,
            recommendation,
            disclaimer: "AI recommendations are advisory-only. Human teacher review is required before educational implementation."
        };
    }

    static async reportIssue(userId: string, organizationId: string, data: { title: string; category?: string; description?: string; priority?: string }) {
        let parsedPriority: IssuePriority = IssuePriority.MEDIUM;
        if (data.priority) {
            const uppercasePriority = data.priority.toUpperCase();
            if (Object.values(IssuePriority).includes(uppercasePriority as IssuePriority)) {
                parsedPriority = uppercasePriority as IssuePriority;
            }
        }

        const issue = await prisma.issue.create({
            data: {
                organizationId,
                reportedById: userId,
                title: data.title,
                description: data.description || data.title,
                priority: parsedPriority,
                status: "OPEN"
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_ISSUE_REPORTED",
                resource: "Issue",
                resourceId: issue.id,
                newValue: JSON.parse(JSON.stringify(issue)),
                userId
            }
        });

        return issue;
    }

    static async getMyIssues(userId: string, organizationId: string) {
        return prisma.issue.findMany({
            where: {
                organizationId,
                reportedById: userId
            },
            orderBy: { createdAt: "desc" }
        });
    }
}
