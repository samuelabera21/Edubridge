import { Request, Response } from "express";
import { SupportService } from "./support.service.js";

// Learning Difficulties
export const getLearningDifficulties = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await SupportService.getLearningDifficulties(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch learning difficulties" });
    }
};

export const createLearningDifficulty = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await SupportService.createLearningDifficulty(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to create learning difficulty record" });
    }
};

// Remedial Programs
export const getRemedialPrograms = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await SupportService.getRemedialPrograms(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch remedial programs" });
    }
};

export const createRemedialProgram = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await SupportService.createRemedialProgram(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to create remedial program" });
    }
};

// Enrichment Programs
export const getEnrichmentPrograms = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await SupportService.getEnrichmentPrograms(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch enrichment programs" });
    }
};

export const createEnrichmentProgram = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await SupportService.createEnrichmentProgram(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to create enrichment program" });
    }
};

// Intervention Plans
export const getInterventionPlans = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await SupportService.getInterventionPlans(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch intervention plans" });
    }
};

export const createInterventionPlan = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await SupportService.createInterventionPlan(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to create intervention plan" });
    }
};

// Outcomes
export const getInterventionOutcomes = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await SupportService.getInterventionOutcomes(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch intervention outcomes" });
    }
};

export const createInterventionOutcome = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await SupportService.createInterventionOutcome(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to record intervention outcome" });
    }
};

// Monitoring
export const getInterventionMonitoring = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await SupportService.getInterventionMonitoring(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch intervention monitoring logs" });
    }
};

export const createInterventionMonitoring = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await SupportService.createInterventionMonitoring(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to record monitoring log" });
    }
};
