import { Request, Response } from "express";
import { SchoolSettingsService } from "./school-settings.service.js";

export const getSettings = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const settings = await SchoolSettingsService.getSettings(organizationId);
        return res.json(settings);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch school operational settings" });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { category, data, general, attendance, notifications } = req.body;

        let targetCategory: "general" | "attendance" | "notifications" | "all" = "all";
        let targetData: any = {};

        if (category) {
            targetCategory = category;
            targetData = data !== undefined ? data : req.body;
        } else if (general) {
            targetCategory = "general";
            targetData = general;
        } else if (attendance) {
            targetCategory = "attendance";
            targetData = attendance;
        } else if (notifications) {
            targetCategory = "notifications";
            targetData = notifications;
        } else {
            targetCategory = "all";
            targetData = req.body;
        }

        const updated = await SchoolSettingsService.updateSettings(
            organizationId,
            targetCategory,
            targetData,
            userId
        );

        return res.json({
            message: "School operational settings updated successfully",
            settings: updated
        });
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to update school operational settings" });
    }
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 20;

        const result = await SchoolSettingsService.getAuditLogs(organizationId, page, limit);
        return res.json(result);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch audit activity logs" });
    }
};
