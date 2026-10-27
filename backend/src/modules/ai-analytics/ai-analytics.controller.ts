import { Request, Response } from "express";
import { AiAnalyticsService } from "./ai-analytics.service.js";
import { HierarchyScopeService } from "../hierarchy/hierarchy-scope.service.js";

export class AiAnalyticsController {
    /**
     * Process natural language analytical query from educational official.
     */
    static async handleQuery(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user?.id) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const { question } = req.body;
            if (!question || typeof question !== "string" || !question.trim()) {
                return res.status(400).json({ error: "Valid question string is required." });
            }

            const result = await AiAnalyticsService.processQuery(user.id, question.trim());
            return res.json({
                success: true,
                data: result
            });
        } catch (error: any) {
            console.error("[AiAnalyticsController] Error processing query:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Failed to process analytical AI query."
            });
        }
    }

    /**
     * Get tailored starter prompts based on the user's administrative level.
     */
    static async getSuggestedPrompts(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user?.id) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const scope = await HierarchyScopeService.getAccessibleOrganizationScope(user.id);
            const level = scope.currentOrganizationType;

            let prompts: string[] = [];
            switch (level) {
                case "FEDERAL":
                    prompts = [
                        "How many schools have below 100 teachers?",
                        "What is the total student enrollment count across all regions?",
                        "Which regions have the highest number of schools?",
                        "List all regions and their active teacher counts",
                        "How many active national directives have been issued?"
                    ];
                    break;
                case "REGION":
                    prompts = [
                        `How many schools in ${scope.currentOrganization.name} have fewer than 100 teachers?`,
                        "Compare student enrollment across our zones",
                        "Which zone has the largest number of registered schools?",
                        "Show teacher distribution across all zones"
                    ];
                    break;
                case "ZONE":
                    prompts = [
                        `List all woredas in ${scope.currentOrganization.name} with school counts`,
                        "How many schools have below 50 teachers in our zone?",
                        "What is the total student count across our woredas?"
                    ];
                    break;
                case "WOREDA":
                    prompts = [
                        `List all schools in ${scope.currentOrganization.name} with teacher counts`,
                        "Which school has the highest student enrollment in our woreda?",
                        "Show total registered teachers across all schools"
                    ];
                    break;
                case "SCHOOL":
                    prompts = [
                        "How many active teachers are registered in our school?",
                        "What is the total enrolled student count?",
                        "Breakdown of student enrollment by grade"
                    ];
                    break;
                default:
                    prompts = [
                        "How many schools have below 100 teachers?",
                        "Show total student enrollment count",
                        "List schools by region"
                    ];
            }

            return res.json({
                success: true,
                scope: {
                    level,
                    name: scope.currentOrganization.name
                },
                prompts
            });
        } catch (error: any) {
            console.error("[AiAnalyticsController] Error getting suggested prompts:", error);
            return res.status(500).json({
                success: false,
                error: error.message || "Failed to load suggested prompts."
            });
        }
    }
}
