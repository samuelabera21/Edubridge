import { prisma } from "../../infrastructure/prisma/client.js";

export class SupportService {
    // 1. Learning Difficulties
    static async getLearningDifficulties(organizationId: string) {
        return prisma.learningDifficulty.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createLearningDifficulty(organizationId: string, data: any) {
        return prisma.learningDifficulty.create({
            data: {
                organizationId,
                studentId: data.studentId || null,
                studentName: data.studentName,
                gradeName: data.gradeName,
                conditionType: data.conditionType || "OTHER",
                accommodationNotes: data.accommodationNotes,
                examTimeExtensionMinutes: Number(data.examTimeExtensionMinutes) || 0
            }
        });
    }

    // 2. Remedial Programs
    static async getRemedialPrograms(organizationId: string) {
        return prisma.remedialProgram.findMany({
            where: { organizationId },
            include: { _count: { select: { assignments: true } } },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createRemedialProgram(organizationId: string, data: any) {
        const enrollmentIds: string[] = Array.from(new Set<string>(Array.isArray(data.enrollmentIds)
            ? data.enrollmentIds.filter((id: unknown): id is string => typeof id === "string")
            : []));
        if (enrollmentIds.length === 0) throw new Error("Select at least one active student for the remedial program");
        const maxCapacity = Number(data.maxCapacity) || 30;
        if (enrollmentIds.length > maxCapacity) throw new Error("Selected student count exceeds the program capacity");

        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                id: { in: enrollmentIds },
                organizationId,
                status: { in: ["ACTIVE", "ENROLLED"] }
            },
            select: { id: true }
        });
        if (enrollments.length !== enrollmentIds.length) throw new Error("Selected students must have active enrollment in this school");

        return prisma.$transaction(async (transaction) => {
            const program = await transaction.remedialProgram.create({
                data: {
                    organizationId,
                    programTitle: data.programTitle,
                    subjectName: data.subjectName,
                    gradeName: data.gradeName,
                    leadTeacher: data.leadTeacher,
                    scheduleTime: data.scheduleTime,
                    enrolledCount: enrollmentIds.length,
                    maxCapacity
                }
            });
            await transaction.remedialProgramAssignment.createMany({
                data: enrollmentIds.map((enrollmentId) => ({ remedialProgramId: program.id, enrollmentId }))
            });
            return program;
        });
    }

    // 3. Enrichment Programs
    static async getEnrichmentPrograms(organizationId: string) {
        return prisma.enrichmentProgram.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createEnrichmentProgram(organizationId: string, data: any) {
        return prisma.enrichmentProgram.create({
            data: {
                organizationId,
                clubName: data.clubName,
                category: data.category || "STEM",
                coordinatorTeacher: data.coordinatorTeacher,
                meetingSchedule: data.meetingSchedule,
                description: data.description
            }
        });
    }

    // 4. Intervention Plans
    static async getInterventionPlans(organizationId: string) {
        return prisma.interventionPlan.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createInterventionPlan(organizationId: string, data: any) {
        const enrollment = data.studentId ? await prisma.studentEnrollment.findFirst({
            where: {
                organizationId,
                studentId: data.studentId,
                status: { in: ["ACTIVE", "ENROLLED"] }
            },
            include: {
                student: true,
                schoolGrade: { include: { grade: true } }
            },
            orderBy: { createdAt: "desc" }
        }) : null;
        if (!enrollment) throw new Error("Select a student with an active enrollment in this school");

        return prisma.interventionPlan.create({
            data: {
                organizationId,
                studentId: enrollment.studentId,
                studentName: [enrollment.student.firstName, enrollment.student.lastName].filter(Boolean).join(" "),
                gradeName: enrollment.schoolGrade.grade.name,
                targetScore: data.targetScore || "65%",
                counselorName: data.counselorName,
                reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
                strategyNotes: data.strategyNotes,
                status: "DRAFTED"
            }
        });
    }

    // 5. Outcomes
    static async getInterventionOutcomes(organizationId: string) {
        return prisma.interventionOutcome.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createInterventionOutcome(organizationId: string, data: any) {
        const initial = Number(data.initialScore) || 45;
        const post = Number(data.postScore) || 68;
        return prisma.interventionOutcome.create({
            data: {
                organizationId,
                studentId: data.studentId || null,
                studentName: data.studentName,
                initialScore: initial,
                postScore: post,
                gain: post - initial,
                status: data.status || "IMPROVED"
            }
        });
    }

    // 6. Monitoring
    static async getInterventionMonitoring(organizationId: string) {
        return prisma.interventionMonitoring.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createInterventionMonitoring(organizationId: string, data: any) {
        return prisma.interventionMonitoring.create({
            data: {
                organizationId,
                studentId: data.studentId || null,
                studentName: data.studentName,
                programName: data.programName,
                attendanceRate: Number(data.attendanceRate) || 100,
                status: data.status || "IN_PROGRESS"
            }
        });
    }
}
