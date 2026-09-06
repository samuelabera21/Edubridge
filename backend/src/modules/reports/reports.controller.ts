import { Request, Response } from "express";
import { ReportsService } from "./reports.service.js";

export const getReports = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { type } = req.query;
        const items = await ReportsService.getReports(organizationId, type as string);
        return res.json(items);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch reports" });
    }
};

export const createReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const item = await ReportsService.createReport(organizationId, req.body);
        return res.status(201).json(item);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to generate report" });
    }
};

// 1. Enrollment Analytics
export const getEnrollmentReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await ReportsService.getEnrollmentAnalytics(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch enrollment analytics" });
    }
};

// 2. Attendance Analytics
export const getAttendanceReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await ReportsService.getAttendanceAnalytics(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch attendance analytics" });
    }
};

// 3. Teacher Analytics
export const getTeacherReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await ReportsService.getTeacherAnalytics(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch teacher analytics" });
    }
};

// 4. Assessment Analytics
export const getAssessmentReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await ReportsService.getAssessmentAnalytics(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch assessment analytics" });
    }
};

// 5. Performance Analytics
export const getPerformanceReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await ReportsService.getPerformanceAnalytics(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch performance analytics" });
    }
};

// 6. Curriculum Analytics
export const getCurriculumReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await ReportsService.getCurriculumAnalytics(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch curriculum analytics" });
    }
};

// 7. Student Support Analytics
export const getSupportReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await ReportsService.getSupportAnalytics(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch support analytics" });
    }
};

// 8. Overall School Performance Scorecard
export const getSchoolPerformanceScorecard = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const data = await ReportsService.getSchoolPerformanceScorecard(organizationId);
        return res.json(data);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to fetch school performance scorecard" });
    }
};
