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
