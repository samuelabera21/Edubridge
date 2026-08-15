import { prisma } from "../../infrastructure/prisma/client.js";
import { ActivityType, SubmissionStatus, SupportFlagType } from "../../generated/prisma/enums.js";

export class LearningService {
    static async createActivity(organizationId: string, data: { academicYearId: string; teachingAssignmentId: string; title: string; description?: string; type: ActivityType; dueDate?: string }) {
        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: data.teachingAssignmentId, teacher: { organizationId } }
        });
        
        if (!assignment) {
            throw new Error("Teaching assignment not found");
        }

        const activity = await prisma.learningActivity.create({
            data: {
                organizationId,
                academicYearId: data.academicYearId,
                teachingAssignmentId: data.teachingAssignmentId,
                title: data.title,
                description: data.description,
                type: data.type,
                dueDate: data.dueDate ? new Date(data.dueDate) : null
            }
        });

        return activity;
    }

    static async getActivities(organizationId: string, teachingAssignmentId?: string) {
        return prisma.learningActivity.findMany({
            where: {
                organizationId,
                ...(teachingAssignmentId ? { teachingAssignmentId } : {})
            },
            include: { teachingAssignment: { include: { subject: true, schoolGrade: true, section: true } } },
            orderBy: { createdAt: "desc" }
        });
    }

    static async submitActivity(organizationId: string, data: { learningActivityId: string; enrollmentId: string; contentUrl?: string }) {
        // Validate activity exists in organization
        const activity = await prisma.learningActivity.findFirst({
            where: { id: data.learningActivityId, organizationId }
        });

        if (!activity) {
            throw new Error("Learning activity not found");
        }

        const submission = await prisma.submission.upsert({
            where: {
                learningActivityId_enrollmentId: {
                    learningActivityId: data.learningActivityId,
                    enrollmentId: data.enrollmentId
                }
            },
            update: {
                status: SubmissionStatus.SUBMITTED,
                contentUrl: data.contentUrl,
                submittedAt: new Date()
            },
            create: {
                learningActivityId: data.learningActivityId,
                enrollmentId: data.enrollmentId,
                status: SubmissionStatus.SUBMITTED,
                contentUrl: data.contentUrl,
                submittedAt: new Date()
            }
        });

        return submission;
    }

    static async raiseSupportFlag(organizationId: string, data: { enrollmentId: string; type: SupportFlagType; description: string; raisedById?: string }) {
        // Validate enrollment exists in organization
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { id: data.enrollmentId, organizationId }
        });

        if (!enrollment) {
            throw new Error("Student enrollment not found");
        }

        const flag = await prisma.supportFlag.create({
            data: {
                organizationId,
                enrollmentId: data.enrollmentId,
                type: data.type,
                description: data.description,
                raisedById: data.raisedById
            }
        });

        return flag;
    }

    static async getSupportFlags(organizationId: string, enrollmentId?: string) {
        return prisma.supportFlag.findMany({
            where: {
                organizationId,
                ...(enrollmentId ? { enrollmentId } : {})
            },
            include: { enrollment: { include: { student: true } }, raisedBy: true },
            orderBy: { createdAt: "desc" }
        });
    }
}
