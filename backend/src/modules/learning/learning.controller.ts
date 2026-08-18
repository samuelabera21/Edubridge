import { Request, Response } from "express";
import { LearningService } from "./learning.service.js";
import { ActivityType, SupportFlagType } from "../../generated/prisma/enums.js";

export const createActivity = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, teachingAssignmentId, title, description, type, dueDate } = req.body;
        
        if (!academicYearId || !teachingAssignmentId || !title) {
            return res.status(400).json({ error: "academicYearId, teachingAssignmentId, and title are required" });
        }

        const activity = await LearningService.createActivity(organizationId, {
            academicYearId,
            teachingAssignmentId,
            title,
            description,
            type: type as ActivityType || ActivityType.HOMEWORK,
            dueDate
        });

        return res.status(201).json(activity);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create learning activity" });
    }
};

export const getActivities = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teachingAssignmentId } = req.query;

        const activities = await LearningService.getActivities(organizationId, teachingAssignmentId as string);
        return res.json(activities);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const submitActivity = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { learningActivityId, enrollmentId, contentUrl } = req.body;
        if (!learningActivityId || !enrollmentId) {
            return res.status(400).json({ error: "learningActivityId and enrollmentId are required" });
        }

        const submission = await LearningService.submitActivity(organizationId, {
            learningActivityId,
            enrollmentId,
            contentUrl
        });

        return res.status(201).json(submission);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to submit activity" });
    }
};

export const raiseSupportFlag = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId, type, description } = req.body;
        if (!enrollmentId || !type || !description) {
            return res.status(400).json({ error: "enrollmentId, type, and description are required" });
        }

        const flag = await LearningService.raiseSupportFlag(organizationId, {
            enrollmentId,
            type: type as SupportFlagType,
            description,
            raisedById: req.user?.id
        });

        return res.status(201).json(flag);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to raise support flag" });
    }
};

export const getSupportFlags = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { sectionId, enrollmentId } = req.query;
        const flags = await LearningService.getSupportFlags(
            organizationId, 
            sectionId as string, 
            enrollmentId as string
        );
        return res.json(flags);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const resolveSupportFlag = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id } = req.params;
        const { resolution } = req.body;

        if (!resolution) {
            return res.status(400).json({ error: "resolution notes are required" });
        }

        const flag = await LearningService.resolveSupportFlag(organizationId, id as string, resolution);
        return res.json(flag);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to resolve support flag" });
    }
};

export const deleteSupportFlag = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id } = req.params;
        await LearningService.deleteSupportFlag(organizationId, id as string);
        return res.json({ success: true, message: "Support flag deleted" });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to delete support flag" });
    }
};
