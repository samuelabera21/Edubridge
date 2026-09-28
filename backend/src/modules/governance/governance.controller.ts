import { Request, Response } from "express";
import { GovernanceDashboardService } from "./governance.service.js";

export async function getGovernanceDashboardHandler(req: Request, res: Response) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User session required",
            });
        }

        const targetOrgId = req.query.targetOrgId ? String(req.query.targetOrgId) : undefined;
        const dashboard = await GovernanceDashboardService.getGovernanceDashboard(userId, targetOrgId);

        return res.status(200).json({
            success: true,
            data: dashboard,
        });
    } catch (error: any) {
        console.error("Error in getGovernanceDashboardHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden") || error.message?.includes("No authorized");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to load governance dashboard",
        });
    }
}
