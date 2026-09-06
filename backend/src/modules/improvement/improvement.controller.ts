import { Request, Response } from "express";
import { ImprovementService } from "./improvement.service.js";

// 1. Problems
export const getProblems = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await ImprovementService.getProblems(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch school problems" });
    }
};

export const createProblem = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await ImprovementService.createProblem(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to log school problem" });
    }
};

// 2. Plans (SIP)
export const getPlans = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await ImprovementService.getPlans(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch improvement plans" });
    }
};

export const createPlan = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await ImprovementService.createPlan(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to create improvement plan" });
    }
};

// 3. Activities
export const getActivities = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await ImprovementService.getActivities(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch activities" });
    }
};

export const createActivity = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await ImprovementService.createActivity(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to log activity" });
    }
};

// 4. Targets
export const getTargets = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await ImprovementService.getTargets(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch targets" });
    }
};

export const createTarget = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await ImprovementService.createTarget(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to create target" });
    }
};

// 5. Outcomes
export const getOutcomes = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await ImprovementService.getOutcomes(organizationId);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch outcomes" });
    }
};

export const createOutcome = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await ImprovementService.createOutcome(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to record outcome" });
    }
};
