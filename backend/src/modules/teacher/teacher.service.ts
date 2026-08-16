import { prisma } from "../../infrastructure/prisma/client.js";
import { IssuePriority } from "../../generated/prisma/enums.js";

export class TeacherService {
    static async createTeacher(organizationId: string, data: { firstName: string; lastName: string; employeeId?: string; userId?: string }) {
        const teacher = await prisma.teacher.create({
            data: {
                organizationId,
                firstName: data.firstName,
                lastName: data.lastName,
                employeeId: data.employeeId || null,
                userId: data.userId || null,
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_CREATED",
                resource: "Teacher",
                resourceId: teacher.id,
                newValue: JSON.parse(JSON.stringify(teacher)),
                userId: data.userId || null
            }
        });

        return teacher;
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
        // Validate teacher belongs to the school
        const teacher = await prisma.teacher.findFirst({
            where: { id: data.teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found in this school");

        // Validate subject belongs to school
        const subject = await prisma.subject.findFirst({
            where: { id: data.subjectId, organizationId }
        });
        if (!subject) throw new Error("Subject not found in this school");

        // Validate grade belongs to school and academic year
        const schoolGrade = await prisma.schoolGrade.findFirst({
            where: { id: data.schoolGradeId, academicYearId: data.academicYearId, academicYear: { organizationId } }
        });
        if (!schoolGrade) throw new Error("Invalid school grade or academic year");

        // Validate section if provided
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
                sectionId: data.sectionId || null
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

        // 1. Today's classes & timetable
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

        // 2. Total active students across assigned sections
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

        // 3. Pending assessments count
        const assignmentIds = teacher.assignments.map((a) => a.id);
        const pendingAssessmentsCount = assignmentIds.length > 0 ? await prisma.assessment.count({
            where: {
                organizationId,
                teachingAssignmentId: { in: assignmentIds }
            }
        }) : 0;

        // 4. Pending submissions count
        const pendingSubmissionsCount = assignmentIds.length > 0 ? await prisma.submission.count({
            where: {
                activity: {
                    organizationId,
                    teachingAssignmentId: { in: assignmentIds }
                },
                status: "SUBMITTED"
            }
        }) : 0;

        // 5. Students requiring attention
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

        // 6. AI Teaching Insights
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
