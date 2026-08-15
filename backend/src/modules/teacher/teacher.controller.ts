import { Request, Response } from "express";
import { TeacherService } from "./teacher.service.js";

// Create a Teacher profile attached to an organization
export const createTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { firstName, lastName, employeeId } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({ error: "firstName and lastName are required" });
        }

        const teacher = await TeacherService.createTeacher(organizationId, {
            firstName,
            lastName,
            employeeId,
            userId: req.user?.id
        });

        return res.status(201).json(teacher);
    } catch (error: any) {
        return res.status(409).json({ error: "Employee ID already exists or invalid request" });
    }
};

export const getTeachers = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const teachers = await TeacherService.getTeachers(organizationId);
        return res.json(teachers);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Create a teaching assignment
export const assignTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teacherId, academicYearId, subjectId, schoolGradeId, sectionId } = req.body;

        if (!teacherId || !academicYearId || !subjectId || !schoolGradeId) {
            return res.status(400).json({ error: "teacherId, academicYearId, subjectId, and schoolGradeId are required" });
        }

        const assignment = await TeacherService.assignTeacher(organizationId, {
            teacherId,
            academicYearId,
            subjectId,
            schoolGradeId,
            sectionId
        });

        return res.status(201).json(assignment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to assign teacher" });
    }
};

// Get active assignments for the school context
export const getAssignments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;

        const assignments = await TeacherService.getAssignments(organizationId, academicYearId as string);
        return res.json(assignments);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get the currently logged in teacher's profile and active assignments
export const getTeacherProfile = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const profile = await TeacherService.getTeacherByUserId(userId, organizationId);
        if (!profile) return res.status(404).json({ error: "Teacher profile not found" });

        return res.json(profile);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};
