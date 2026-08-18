import { Request, Response } from "express";
import { AttendanceService } from "./attendance.service.js";
import { AttendanceStatus } from "../../generated/prisma/enums.js";

export const recordStudentAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, enrollmentId, classPeriodId, date, status, remarks } = req.body;
        if (!academicYearId || !enrollmentId || !date || !status) {
            return res.status(400).json({ error: "academicYearId, enrollmentId, date, and status are required" });
        }

        const attendance = await AttendanceService.recordStudentAttendance(organizationId, {
            academicYearId,
            enrollmentId,
            classPeriodId,
            date,
            status: status as AttendanceStatus,
            remarks,
            recordedById: req.user?.id
        });

        return res.status(201).json(attendance);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record student attendance" });
    }
};

export const recordBulkStudentAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, sectionId, date, classPeriodId, records } = req.body;
        if (!academicYearId || !sectionId || !date || !Array.isArray(records)) {
            return res.status(400).json({ error: "academicYearId, sectionId, date, and records array are required" });
        }

        const results = await AttendanceService.recordBulkStudentAttendance(organizationId, {
            academicYearId,
            sectionId,
            date,
            classPeriodId,
            records,
            recordedById: req.user?.id
        });

        return res.status(201).json({ success: true, count: results.length, data: results });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record bulk student attendance" });
    }
};

export const getSectionAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { sectionId } = req.params;
        const { date, classPeriodId } = req.query;

        if (!date) {
            return res.status(400).json({ error: "date query parameter is required (YYYY-MM-DD)" });
        }

        const data = await AttendanceService.getSectionAttendance(
            organizationId, 
            sectionId as string, 
            date as string, 
            classPeriodId as string
        );
        return res.json(data);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getStudentAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId } = req.params;
        const { startDate, endDate } = req.query;

        const attendance = await AttendanceService.getStudentAttendance(organizationId, enrollmentId as string, startDate as string, endDate as string);
        return res.json(attendance);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const recordTeacherAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, teacherId, date, status, remarks } = req.body;
        if (!academicYearId || !teacherId || !date || !status) {
            return res.status(400).json({ error: "academicYearId, teacherId, date, and status are required" });
        }

        const attendance = await AttendanceService.recordTeacherAttendance(organizationId, {
            academicYearId,
            teacherId,
            date,
            status: status as AttendanceStatus,
            remarks,
            recordedById: req.user?.id
        });

        return res.status(201).json(attendance);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record teacher attendance" });
    }
};

export const recordBulkTeacherAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, date, records } = req.body;
        if (!academicYearId || !date || !Array.isArray(records)) {
            return res.status(400).json({ error: "academicYearId, date, and records array are required" });
        }

        const results = await AttendanceService.recordBulkTeacherAttendance(organizationId, {
            academicYearId,
            date,
            records,
            recordedById: req.user?.id
        });

        return res.status(201).json({ success: true, count: results.length, data: results });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record bulk teacher attendance" });
    }
};

export const getTeacherAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teacherId } = req.params;
        const { startDate, endDate } = req.query;

        const attendance = await AttendanceService.getTeacherAttendance(organizationId, teacherId as string, startDate as string, endDate as string);
        return res.json(attendance);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getDailyTeacherAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "date query parameter is required" });

        const data = await AttendanceService.getDailyTeacherAttendance(organizationId, date as string);
        return res.json(data);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};
