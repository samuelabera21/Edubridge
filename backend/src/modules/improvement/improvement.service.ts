import { prisma } from "../../infrastructure/prisma/client.js";

export class ImprovementService {
    // 1. Problems
    static async getProblems(organizationId: string) {
        return prisma.schoolProblem.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createProblem(organizationId: string, data: any) {
        return prisma.schoolProblem.create({
            data: {
                organizationId,
                problemTitle: data.problemTitle,
                category: data.category || "ACADEMIC",
                severity: data.severity || "HIGH",
                description: data.description,
                status: "OPEN"
            }
        });
    }

    // 2. Improvement Plans (SIP)
    static async getPlans(organizationId: string) {
        return prisma.improvementPlan.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createPlan(organizationId: string, data: any) {
        return prisma.improvementPlan.create({
            data: {
                organizationId,
                title: data.planTitle || data.title,
                description: data.description || "School Improvement Plan",
                objectives: data.objectives || data.description || "SIP Goals",
                startDate: data.startDate ? new Date(data.startDate) : new Date(),
                status: "PLANNED"
            }
        });
    }

    // 3. Improvement Activities
    static async getActivities(organizationId: string) {
        return prisma.improvementActivity.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createActivity(organizationId: string, data: any) {
        return prisma.improvementActivity.create({
            data: {
                organizationId,
                improvementPlanId: data.improvementPlanId || null,
                activityTitle: data.activityTitle,
                assignedTeam: data.assignedTeam || "Academic Steering Committee",
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                status: "PENDING"
            }
        });
    }

    // 4. Targets / KPIs
    static async getTargets(organizationId: string) {
        return prisma.improvementTarget.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createTarget(organizationId: string, data: any) {
        return prisma.improvementTarget.create({
            data: {
                organizationId,
                metricTitle: data.metricTitle,
                baselineValue: Number(data.baselineValue) || 0,
                targetValue: Number(data.targetValue) || 100,
                currentValue: Number(data.currentValue) || Number(data.baselineValue) || 0,
                unit: data.unit || "%"
            }
        });
    }

    // 5. Outcomes
    static async getOutcomes(organizationId: string) {
        return prisma.improvementOutcome.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createOutcome(organizationId: string, data: any) {
        return prisma.improvementOutcome.create({
            data: {
                organizationId,
                planTitle: data.planTitle,
                achievedPercentage: Number(data.achievedPercentage) || 100,
                impactRating: data.impactRating || "EXCELLENT",
                notes: data.notes
            }
        });
    }
}
