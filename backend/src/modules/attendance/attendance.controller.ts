import { Request, Response } from "express";
import { AttendanceService } from "./attendance.service.js";
import { AttendanceAdminService } from "./attendance.admin.service.js";
import { AttendanceStatus, AttendanceCorrectionStatus } from "../../generated/prisma/enums.js";

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

// ============================================================
// SCHOOL ADMINISTRATOR / PRINCIPAL OVERSIGHT CONTROLLERS
// ============================================================

export const getExecutiveOverview = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, rangeDays } = req.query;
        const data = await AttendanceAdminService.getExecutiveOverview(organizationId, {
            academicYearId: academicYearId as string,
            rangeDays: rangeDays ? Number(rangeDays) : 30
        });

        return res.json(data);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch executive overview" });
    }
};

export const getSchoolStudentAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, gradeId, sectionId, search, status, date, startDate, endDate, page, limit } = req.query;
        const data = await AttendanceAdminService.getSchoolStudentAttendance(organizationId, {
            academicYearId: academicYearId as string,
            gradeId: gradeId as string,
            sectionId: sectionId as string,
            search: search as string,
            status: status as AttendanceStatus,
            date: date as string,
            startDate: startDate as string,
            endDate: endDate as string,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20
        });

        return res.json(data);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch school student attendance" });
    }
};

export const getStudentAttendanceDetail = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId } = req.params;
        const { academicYearId } = req.query;

        const data = await AttendanceAdminService.getStudentAttendanceDetail(
            organizationId,
            enrollmentId as string,
            academicYearId as string
        );

        return res.json(data);
    } catch (error: any) {
        return res.status(error.message?.includes("not found") ? 404 : 500).json({
            error: error.message || "Failed to fetch student attendance detail"
        });
    }
};

export const getSchoolTeacherAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, search, status, date, startDate, endDate, page, limit } = req.query;
        const data = await AttendanceAdminService.getSchoolTeacherAttendance(organizationId, {
            academicYearId: academicYearId as string,
            search: search as string,
            status: status as AttendanceStatus,
            date: date as string,
            startDate: startDate as string,
            endDate: endDate as string,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20
        });

        return res.json(data);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch teacher attendance oversight" });
    }
};

export const getTeacherAttendanceDetail = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teacherId } = req.params;
        const { academicYearId } = req.query;

        const data = await AttendanceAdminService.getTeacherAttendanceDetail(
            organizationId,
            teacherId as string,
            academicYearId as string
        );

        return res.json(data);
    } catch (error: any) {
        return res.status(error.message?.includes("not found") ? 404 : 500).json({
            error: error.message || "Failed to fetch teacher attendance detail"
        });
    }
};

export const getAbsenceRiskAlerts = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;
        const data = await AttendanceAdminService.getAbsenceRiskAlerts(
            organizationId,
            academicYearId as string
        );

        return res.json(data);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch absence risk alerts" });
    }
};

export const getCorrections = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, status, page, limit } = req.query;
        const data = await AttendanceAdminService.getCorrections(organizationId, {
            academicYearId: academicYearId as string,
            status: status as AttendanceCorrectionStatus,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20
        });

        return res.json(data);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch corrections" });
    }
};

export const createCorrectionRequest = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing authentication / scope" });

        const { enrollmentId, academicYearId, attendanceId, date, classPeriodId, originalStatus, requestedStatus, reasonCategory, justification, evidenceDocumentUrl } = req.body;

        if (!enrollmentId || !academicYearId || !date || !originalStatus || !requestedStatus || !reasonCategory || !justification) {
            return res.status(400).json({
                error: "enrollmentId, academicYearId, date, originalStatus, requestedStatus, reasonCategory, and justification are required"
            });
        }

        const correction = await AttendanceAdminService.createCorrectionRequest(organizationId, userId, {
            enrollmentId,
            academicYearId,
            attendanceId,
            date,
            classPeriodId,
            originalStatus,
            requestedStatus,
            reasonCategory,
            justification,
            evidenceDocumentUrl
        });

        return res.status(201).json(correction);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create correction request" });
    }
};

export const approveCorrection = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing authentication / scope" });

        const { id } = req.params;
        const result = await AttendanceAdminService.approveCorrection(organizationId, userId, id as string);

        return res.json({ success: true, ...result });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to approve correction request" });
    }
};

export const rejectCorrection = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing authentication / scope" });

        const { id } = req.params;
        const { rejectionReason } = req.body;

        if (!rejectionReason || rejectionReason.trim().length === 0) {
            return res.status(400).json({ error: "rejectionReason is required" });
        }

        const result = await AttendanceAdminService.rejectCorrection(
            organizationId,
            userId,
            id as string,
            rejectionReason
        );

        return res.json({ success: true, data: result });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to reject correction request" });
    }
};
