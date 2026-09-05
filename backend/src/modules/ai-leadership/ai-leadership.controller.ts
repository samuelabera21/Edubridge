import { Request, Response } from "express";
import { AILeadershipService } from "./ai-leadership.service.js";

// Generic Insights History & Generation
export const getInsights = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { category } = req.query;
        const items = await AILeadershipService.getInsights(organizationId, category as string);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch AI insights" });
    }
};

export const createInsight = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const item = await AILeadershipService.createInsight(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to generate AI insight" });
    }
};

// 1. School Performance AI
export const getSchoolPerformanceAI = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await AILeadershipService.getSchoolPerformanceAI(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to execute AI performance analysis" });
    }
};

// 2. Attendance AI
export const getAttendanceAI = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await AILeadershipService.getAttendanceAI(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to execute AI attendance analysis" });
    }
};

// 3. Student Risk AI
export const getStudentRiskAI = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await AILeadershipService.getStudentRiskAI(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to execute AI risk analysis" });
    }
};

// 4. Performance Trends AI
export const getPerformanceTrendsAI = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await AILeadershipService.getPerformanceTrendsAI(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to execute AI trend analysis" });
    }
};

// 5. Intervention AI
export const getInterventionAI = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await AILeadershipService.getInterventionAI(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to execute AI intervention analysis" });
    }
};

// 6. Improvement Recommendations AI
export const getImprovementRecommendationsAI = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await AILeadershipService.getImprovementRecommendationsAI(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to generate AI recommendations" });
    }
};

// 7. Natural Language Query AI
export const processNaturalLanguageQuery = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { query } = req.body;
        if (!query) return res.status(400).json({ error: "query string is required" });

        const data = await AILeadershipService.processNaturalLanguageQuery(organizationId, query);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to process natural language query" });
    }
};

// 8. Executive Summary Briefing AI
export const getExecutiveSummaryAI = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await AILeadershipService.getExecutiveSummaryAI(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to generate executive AI summary" });
    }
};
