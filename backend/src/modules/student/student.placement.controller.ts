import { Request, Response } from "express";
import { StudentPlacementService } from "./student.placement.service.js";

export const getPlacementWorkspaceHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { academicYearId, schoolGradeId } = req.query;

        const data = await StudentPlacementService.getPlacementWorkspace(organizationId, {
            academicYearId: academicYearId as string | undefined,
            schoolGradeId: schoolGradeId as string | undefined
        });

        return res.status(200).json(data);
    } catch (error: any) {
        console.error("[Placement Workspace Error]:", error);
        return res.status(400).json({ error: error.message || "Failed to load placement workspace" });
    }
};

export const assignStudentHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { enrollmentId, sectionId } = req.body;
        if (!enrollmentId || !sectionId) {
            return res.status(400).json({ error: "enrollmentId and sectionId are required" });
        }

        const result = await StudentPlacementService.assignStudent(
            organizationId,
            enrollmentId,
            sectionId,
            req.user?.id
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("[Assign Student Error]:", error);
        const status = error.message?.startsWith("SECTION_CAPACITY_EXCEEDED") ? 409 : 400;
        return res.status(status).json({ error: error.message || "Failed to assign student to section" });
    }
};

export const bulkAssignStudentsHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { enrollmentIds, sectionId } = req.body;
        if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0 || !sectionId) {
            return res.status(400).json({ error: "enrollmentIds array and sectionId are required" });
        }

        const result = await StudentPlacementService.bulkAssignStudents(
            organizationId,
            enrollmentIds,
            sectionId,
            req.user?.id
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("[Bulk Assign Error]:", error);
        const status = error.message?.startsWith("SECTION_CAPACITY_EXCEEDED") ? 409 : 400;
        return res.status(status).json({ error: error.message || "Failed to bulk assign students" });
    }
};

export const reassignStudentSectionHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { enrollmentId, targetSectionId, reason } = req.body;
        if (!enrollmentId || !targetSectionId) {
            return res.status(400).json({ error: "enrollmentId and targetSectionId are required" });
        }

        const result = await StudentPlacementService.reassignStudentSection(
            organizationId,
            { enrollmentId, targetSectionId, reason },
            req.user?.id
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("[Reassign Student Error]:", error);
        const status = error.message?.startsWith("SECTION_CAPACITY_EXCEEDED") ? 409 : 400;
        return res.status(status).json({ error: error.message || "Failed to reassign student" });
    }
};

export const getSectionRosterHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { sectionId } = req.params;
        const { sortBy, sortOrder } = req.query;

        const roster = await StudentPlacementService.getSectionRoster(organizationId, sectionId as string, {
            sortBy: sortBy as "name" | "studentId" | "gender" | undefined,
            sortOrder: sortOrder as "asc" | "desc" | undefined
        });

        return res.status(200).json(roster);
    } catch (error: any) {
        console.error("[Section Roster Error]:", error);
        return res.status(400).json({ error: error.message || "Failed to fetch section roster" });
    }
};

export const getEnrollmentPlacementHistoryHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { enrollmentId } = req.params;
        const history = await StudentPlacementService.getEnrollmentPlacementHistory(organizationId, enrollmentId as string);

        return res.status(200).json(history);
    } catch (error: any) {
        console.error("[Placement History Error]:", error);
        return res.status(400).json({ error: error.message || "Failed to fetch placement history" });
    }
};
