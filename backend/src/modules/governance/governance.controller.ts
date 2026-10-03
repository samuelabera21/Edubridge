import { Request, Response } from "express";
import { GovernanceDashboardService } from "./governance.service.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";

async function handleTierDashboard(req: Request, res: Response, tier?: OrganizationUnitType) {
    try {
        const userId = (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User session required",
            });
        }

        const targetOrgId = req.query.targetOrgId ? String(req.query.targetOrgId) : undefined;
        const dashboard = await GovernanceDashboardService.getGovernanceDashboard(userId, targetOrgId, tier);

        return res.status(200).json({
            success: true,
            data: dashboard,
        });
    } catch (error: any) {
        console.error(`Error in ${tier || "Governance"} DashboardHandler:`, error);
        const isForbidden = error.message?.startsWith("Forbidden") || error.message?.includes("No authorized") || error.message?.includes("not authorized");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to load governance dashboard",
        });
    }
}

export async function getFederalDashboardHandler(req: Request, res: Response) {
    return handleTierDashboard(req, res, "FEDERAL");
}

export async function getRegionDashboardHandler(req: Request, res: Response) {
    return handleTierDashboard(req, res, "REGION");
}

export async function getZoneDashboardHandler(req: Request, res: Response) {
    return handleTierDashboard(req, res, "ZONE");
}

export async function getWoredaDashboardHandler(req: Request, res: Response) {
    return handleTierDashboard(req, res, "WOREDA");
}

export async function getGovernanceDashboardHandler(req: Request, res: Response) {
    return handleTierDashboard(req, res);
}

