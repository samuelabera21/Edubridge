import { Request, Response } from "express";
import { TimetableService } from "./timetable.service.js";

export const createClassPeriod = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { name, startTime, endTime } = req.body;
        if (!name || !startTime || !endTime) {
            return res.status(400).json({ error: "name, startTime, and endTime are required" });
        }

        const period = await TimetableService.createClassPeriod(organizationId, { name, startTime, endTime });
        return res.status(201).json(period);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create class period" });
    }
};

export const getClassPeriods = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const periods = await TimetableService.getClassPeriods(organizationId);
        return res.json(periods);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const assignTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, teachingAssignmentId, classPeriodId, dayOfWeek, roomId } = req.body;

        if (!academicYearId || !teachingAssignmentId || !classPeriodId || dayOfWeek === undefined) {
            return res.status(400).json({ error: "academicYearId, teachingAssignmentId, classPeriodId, and dayOfWeek are required" });
        }

        const timetable = await TimetableService.assignTimetable(organizationId, {
            academicYearId,
            teachingAssignmentId,
            classPeriodId,
            dayOfWeek: Number(dayOfWeek),
            roomId
        });

        return res.status(201).json(timetable);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to assign timetable" });
    }
};

export const getTimetableForSection = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { sectionId } = req.params;
        const timetable = await TimetableService.getTimetableForSection(organizationId, sectionId as string);
        return res.json(timetable);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getTimetableForTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teacherId } = req.params;
        const timetable = await TimetableService.getTimetableForTeacher(organizationId, teacherId as string);
        return res.json(timetable);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};
