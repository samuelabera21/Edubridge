import { Request, Response } from "express";
import { TimetableService } from "./timetable.service.js";
import { TimetableConfigService } from "./timetable.config.service.js";
import { TimetableAutoSchedulerService } from "./timetable-auto-scheduler.service.js";

export const getSectionWorkspace = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, schoolGradeId, sectionId } = req.query;
        const workspace = await TimetableService.getSectionWorkspace(organizationId, {
            academicYearId: typeof academicYearId === "string" ? academicYearId : undefined,
            schoolGradeId: typeof schoolGradeId === "string" ? schoolGradeId : undefined,
            sectionId: typeof sectionId === "string" ? sectionId : undefined
        });
        return res.json(workspace);
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ error: error.message || "Failed to load timetable workspace" });
    }
};

export const createClassPeriod = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { name, startTime, endTime, isBreak } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Period name is required" });
        }

        const period = await TimetableService.createClassPeriod(organizationId, { 
            name: name.trim(), 
            startTime, 
            endTime, 
            isBreak: Boolean(isBreak) 
        });
        return res.status(201).json(period);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create class period" });
    }
};

export const deleteClassPeriod = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) return res.status(400).json({ error: "Period ID is required" });

        await TimetableService.deleteClassPeriod(organizationId, id);
        return res.json({ success: true, message: "Class period deleted successfully" });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to delete class period" });
    }
};

export const getClassPeriods = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const periods = await TimetableService.getClassPeriods(organizationId);
        return res.json(periods);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const generateDefaultPeriods = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const periods = await TimetableService.generateDefaultPeriods(organizationId);
        return res.status(201).json(periods);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to generate default periods" });
    }
};

export const assignTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const userId = (req as any).user?.id || null;

        const { academicYearId, teachingAssignmentId, classPeriodId, dayOfWeek, roomId } = req.body;

        if (!academicYearId || !teachingAssignmentId || !classPeriodId || dayOfWeek === undefined) {
            return res.status(400).json({ error: "academicYearId, teachingAssignmentId, classPeriodId, and dayOfWeek are required" });
        }

        const timetable = await TimetableService.assignTimetable(organizationId, userId, {
            academicYearId,
            teachingAssignmentId,
            classPeriodId,
            dayOfWeek: Number(dayOfWeek),
            roomId
        });

        return res.status(201).json(timetable);
    } catch (error: any) {
        const status = error.statusCode || 400;
        return res.status(status).json({ error: error.message || "Failed to assign timetable" });
    }
};

export const deleteTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const userId = (req as any).user?.id || null;

        const { id } = req.params;
        const result = await TimetableService.deleteTimetable(organizationId, userId, id as string);
        return res.json(result);
    } catch (error: any) {
        const status = error.statusCode || 400;
        return res.status(status).json({ error: error.message || "Failed to delete timetable entry" });
    }
};

export const reassignSlot = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const userId = (req as any).user?.id || null;

        const { timetableId, newTeachingAssignmentId, reason } = req.body;
        if (!timetableId || !newTeachingAssignmentId) {
            return res.status(400).json({ error: "timetableId and newTeachingAssignmentId are required" });
        }

        const result = await TimetableService.reassignSlot(organizationId, userId, {
            timetableId,
            newTeachingAssignmentId,
            reason
        });
        return res.json(result);
    } catch (error: any) {
        const status = error.statusCode || 400;
        return res.status(status).json({ error: error.message || "Failed to reassign slot" });
    }
};

export const publishTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const userId = (req as any).user?.id || null;

        const { academicYearId } = req.body;
        if (!academicYearId) return res.status(400).json({ error: "academicYearId is required" });

        const result = await TimetableService.publishTimetable(organizationId, userId, academicYearId);
        return res.json(result);
    } catch (error: any) {
        const status = error.statusCode || 400;
        return res.status(status).json({ error: error.message || "Failed to publish timetable" });
    }
};

export const unpublishTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const userId = (req as any).user?.id || null;

        const { academicYearId } = req.body;
        if (!academicYearId) return res.status(400).json({ error: "academicYearId is required" });

        const result = await TimetableService.unpublishTimetable(organizationId, userId, academicYearId);
        return res.json(result);
    } catch (error: any) {
        const status = error.statusCode || 400;
        return res.status(status).json({ error: error.message || "Failed to unpublish timetable" });
    }
};

export const getMyTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const result = await TimetableService.getMyTimetable(organizationId, userId);
        return res.json(result);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to load personal timetable" });
    }
};

export const getTimetableForSection = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { sectionId } = req.params;
        const academicYearId = typeof req.query.academicYearId === "string" ? req.query.academicYearId : undefined;
        const timetable = await TimetableService.getTimetableForSection(organizationId, sectionId as string, academicYearId);
        return res.json(timetable);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getTimetableForTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teacherId } = req.params;
        const timetable = await TimetableService.getTimetableForTeacher(organizationId, teacherId as string);
        return res.json(timetable);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getTimetableForRoom = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { roomId } = req.params;
        const timetable = await TimetableService.getTimetableForRoom(organizationId, roomId as string);
        return res.json(timetable);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
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

export const getTimetableConfig = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.params;
        const config = await TimetableConfigService.getTimetableConfig(organizationId, academicYearId as string);
        return res.json(config);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
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

export const autoGenerateTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.body;
        if (!academicYearId) {
            return res.status(400).json({ error: "academicYearId is required" });
        }

        const result = await TimetableAutoSchedulerService.generateTimetable(organizationId, academicYearId);
        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to auto-generate timetable" });
    }
};
