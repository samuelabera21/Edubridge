import { Request, Response } from "express";
import { SchoolSettingsService } from "./school-settings.service.js";

export const getSettings = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { category } = req.query;
        const items = await SchoolSettingsService.getSettings(organizationId, category as string);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch school settings" });
    }
};

export const setSetting = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { key, value, category } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ error: "key and value are required" });
        }

        const item = await SchoolSettingsService.setSetting(organizationId, key, value, category);
        
        // Log action in AuditLog
        await SchoolSettingsService.createAuditLog(organizationId, {
            userId: (req as any).user?.id,
            action: "UPDATE_SETTING",
            entityType: "SCHOOL_SETTING",
            details: `Updated setting ${key} to ${value}`
        });

        return res.json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to update school setting" });
    }
};

export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const logs = await SchoolSettingsService.getAuditLogs(organizationId);
        return res.json(logs);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch audit activity logs" });
    }
};

export const exportSchoolData = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const exportSummary = await SchoolSettingsService.exportSchoolData(organizationId);
        
        // Log action in AuditLog
        await SchoolSettingsService.createAuditLog(organizationId, {
            userId: (req as any).user?.id,
            action: "EXPORT_DATA",
            entityType: "DATABASE_BACKUP",
            details: "Generated full institutional backup package"
        });

        return res.json(exportSummary);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to export school data" });
    }
};
