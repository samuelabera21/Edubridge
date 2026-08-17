import { Request, Response } from "express";
import { TimetableService } from "./timetable.service.js";
import { TimetableConfigService } from "./timetable.config.service.js";

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

export const getTimetableForRoom = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { roomId } = req.params;
        const timetable = await TimetableService.getTimetableForRoom(organizationId, roomId as string);
        return res.json(timetable);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const updateTeacherAvailability = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teacherId } = req.params;
        const { availability } = req.body;

        if (availability === undefined) {
            return res.status(400).json({ error: "availability field is required" });
        }

        const teacher = await TimetableService.updateTeacherAvailability(organizationId, teacherId as string, availability);
        return res.json(teacher);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update teacher availability" });
    }
};

export const deleteTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id } = req.params;
        const result = await TimetableService.deleteTimetable(organizationId, id as string);
        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to delete timetable entry" });
    }
};

export const getTimetableConfig = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.params;
        const config = await TimetableConfigService.getTimetableConfig(organizationId, academicYearId as string);
        return res.json(config);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const saveTimetableConfig = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, operatingDays, startTime, periodDuration, periodsPerDay, breakDuration, breakAfter, lunchDuration, lunchAfter, shift } = req.body;

        if (!academicYearId || !operatingDays || !startTime || !periodDuration || !periodsPerDay || !shift) {
            return res.status(400).json({ error: "Missing required configuration fields" });
        }

        const config = await TimetableConfigService.saveTimetableConfig(organizationId, {
            academicYearId,
            operatingDays,
            startTime,
            periodDuration,
            periodsPerDay,
            breakDuration,
            breakAfter,
            lunchDuration,
            lunchAfter,
            shift
        });

        return res.status(200).json(config);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to save configuration" });
    }
};

export const updateRoomAvailability = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { roomId } = req.params;
        const { availability } = req.body;

        if (availability === undefined) {
            return res.status(400).json({ error: "availability field is required" });
        }

        const room = await TimetableConfigService.updateRoomAvailability(organizationId, roomId as string, availability);
        return res.json(room);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update room availability" });
    }
};
