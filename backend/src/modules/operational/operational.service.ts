import { prisma } from "../../infrastructure/prisma/client.js";
import { ResourceType, IssueStatus, IssuePriority } from "../../generated/prisma/enums.js";

export class OperationalService {
    static async createDigitalResource(organizationId: string, createdById: string, data: any) {
        return prisma.digitalResource.create({
            data: {
                organizationId,
                createdById,
                title: data.title,
                description: data.description,
                subjectName: data.subjectName,
                gradeName: data.gradeName,
                academicYearId: data.academicYearId || null,
                resourceType: data.resourceType || "HANDOUT",
                fileUrl: data.fileUrl || null,
                externalUrl: data.externalUrl || null,
                source: data.source || null,
                status: "PUBLISHED"
            }
        });
    }

    static async getDigitalResources(organizationId: string) {
        return prisma.digitalResource.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async recommendDigitalResource(organizationId: string, userId: string, data: any) {
        const teacher = await prisma.teacher.findFirst({ where: { organizationId, userId }, select: { id: true } });
        if (!teacher) throw new Error("Teacher profile not found");

        const assignment = await prisma.teachingAssignment.findFirst({
            where: {
                teacherId: teacher.id,
                academicYearId: data.academicYearId,
                schoolGradeId: data.schoolGradeId,
                sectionId: data.sectionId || null
            }
        });
        if (!assignment) throw new Error("You can only recommend resources for your assigned class");

        const resource = await prisma.digitalResource.findFirst({
            where: { id: data.resourceId, organizationId, status: "PUBLISHED" }
        });
        if (!resource) throw new Error("Published resource not found");

        if (data.enrollmentId) {
            const enrollment = await prisma.studentEnrollment.findFirst({
                where: {
                    id: data.enrollmentId,
                    organizationId,
                    academicYearId: assignment.academicYearId,
                    schoolGradeId: assignment.schoolGradeId,
                    sectionId: assignment.sectionId,
                    status: { in: ["ACTIVE", "ENROLLED"] }
                }
            });
            if (!enrollment) throw new Error("Student is not in your assigned class");
        }

        return prisma.resourceRecommendation.create({
            data: {
                resourceId: resource.id,
                teacherId: teacher.id,
                academicYearId: assignment.academicYearId,
                schoolGradeId: assignment.schoolGradeId,
                sectionId: assignment.sectionId,
                enrollmentId: data.enrollmentId || null,
                note: data.note || null
            }
        });
    }

    static async createResource(organizationId: string, data: { name: string; type: ResourceType; capacity?: number; status?: string; description?: string }) {
        return prisma.schoolResource.create({
            data: {
                organizationId,
                name: data.name,
                type: data.type,
                capacity: data.capacity,
                status: data.status || "AVAILABLE",
                description: data.description
            }
        });
    }

    static async getResources(organizationId: string) {
        return prisma.schoolResource.findMany({
            where: { organizationId }
        });
    }

    static async reportIssue(organizationId: string, data: { title: string; description: string; priority?: IssuePriority; reportedById: string; resourceId?: string }) {
        return prisma.issue.create({
            data: {
                organizationId,
                title: data.title,
                description: data.description,
                priority: data.priority || IssuePriority.MEDIUM,
                reportedById: data.reportedById,
                resourceId: data.resourceId,
                status: IssueStatus.OPEN
            }
        });
    }

    static async getIssues(organizationId: string, status?: IssueStatus) {
        return prisma.issue.findMany({
            where: {
                organizationId,
                ...(status ? { status } : {})
            },
            include: { reportedBy: { select: { id: true, name: true } }, assignedTo: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" }
        });
    }

    static async updateIssueStatus(id: string, status: IssueStatus, assignedToId?: string) {
        return prisma.issue.update({
            where: { id },
            data: {
                status,
                ...(assignedToId ? { assignedToId } : {})
            }
        });
    }

    static async createImprovementPlan(organizationId: string, data: { title: string; description: string; objectives: string; startDate: string; endDate?: string }) {
        return prisma.improvementPlan.create({
            data: {
                organizationId,
                title: data.title,
                description: data.description,
                objectives: data.objectives,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,
                status: "PLANNED"
            }
        });
    }

    static async getImprovementPlans(organizationId: string) {
        return prisma.improvementPlan.findMany({
            where: { organizationId },
            orderBy: { startDate: "asc" }
        });
    }

    static async updateResource(id: string, organizationId: string, data: { name?: string; type?: ResourceType; capacity?: number; status?: string; description?: string }) {
        const resource = await prisma.schoolResource.findFirst({
            where: { id, organizationId }
        });
        if (!resource) throw new Error("Resource not found");

        return prisma.schoolResource.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.type && { type: data.type }),
                ...(data.capacity !== undefined && { capacity: data.capacity !== null ? Number(data.capacity) : null }),
                ...(data.status && { status: data.status }),
                ...(data.description !== undefined && { description: data.description })
            }
        });
    }

    static async deleteResource(id: string, organizationId: string) {
        const resource = await prisma.schoolResource.findFirst({
            where: { id, organizationId }
        });
        if (!resource) throw new Error("Resource not found");

        await prisma.schoolResource.delete({
            where: { id }
        });

        return { success: true };
    }

    static async updateImprovementPlanStatus(id: string, organizationId: string, status: string) {
        const plan = await prisma.improvementPlan.findFirst({
            where: { id, organizationId }
        });
        if (!plan) throw new Error("Improvement plan not found");

        return prisma.improvementPlan.update({
            where: { id },
            data: { status }
        });
    }
}
