import { prisma } from "../../infrastructure/prisma/client.js";
import { ResourceType, IssueStatus, IssuePriority } from "../../generated/prisma/enums.js";

export class OperationalService {
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
}
