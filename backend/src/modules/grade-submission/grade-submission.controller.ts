import { Request, Response } from "express";
import { GradeSubmissionService } from "./grade-submission.service.js";

export const downloadTemplate = async (req: Request, res: Response) => {
    try {
        const { teachingAssignmentId, semester } = req.query;
        if (!teachingAssignmentId) {
            return res.status(400).json({ error: "teachingAssignmentId query parameter is required." });
        }

        const { filename, buffer } = await GradeSubmissionService.generateTemplate(
            String(teachingAssignmentId),
            (semester as any) || "SEMESTER_1"
        );

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(buffer);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to generate template" });
    }
};

export const previewImport = async (req: Request, res: Response) => {
    try {
        const { teachingAssignmentId, semester, fileBase64 } = req.body;
        if (!teachingAssignmentId) {
            return res.status(400).json({ error: "teachingAssignmentId is required." });
        }
        if (!fileBase64) {
            return res.status(400).json({ error: "fileBase64 data is required." });
        }

        const result = await GradeSubmissionService.previewImport(
            teachingAssignmentId,
            semester || "SEMESTER_1",
            fileBase64
        );

        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to parse grade spreadsheet." });
    }
};

export const saveDraft = async (req: Request, res: Response) => {
    try {
        const { teachingAssignmentId, semester, marks } = req.body;
        const actorUserId = req.user?.id;

        if (!teachingAssignmentId || !marks || !Array.isArray(marks)) {
            return res.status(400).json({ error: "teachingAssignmentId and marks array are required." });
        }

        const result = await GradeSubmissionService.saveDraft(
            teachingAssignmentId,
            semester || "SEMESTER_1",
            marks,
            actorUserId || ""
        );

        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to save draft marks." });
    }
};

export const submitBatch = async (req: Request, res: Response) => {
    try {
        const batchId = req.params.batchId as string;
        const actorUserId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;

        if (!batchId) {
            return res.status(400).json({ error: "batchId parameter is required." });
        }
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope." });
        }

        const result = await GradeSubmissionService.submitBatch(
            batchId,
            actorUserId || "",
            organizationId
        );

        return res.status(200).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to submit grades to administration." });
    }
};

export const getSubmission = async (req: Request, res: Response) => {
    try {
        const assignmentId = req.params.assignmentId as string;
        const semester = req.query.semester as any || "SEMESTER_1";

        if (!assignmentId) {
            return res.status(400).json({ error: "assignmentId parameter is required." });
        }

        const submission = await GradeSubmissionService.getSubmission(assignmentId, semester);
        return res.json(submission || null);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to retrieve grade submission." });
    }
};

export const listAdminSubmissions = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope." });
        }

        const { status, semester, academicYearId } = req.query;

        const submissions = await GradeSubmissionService.listAdminSubmissions(organizationId, {
            status: status as any,
            semester: semester as any,
            academicYearId: academicYearId ? String(academicYearId) : undefined
        });

        return res.json(submissions);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to list grade submissions." });
    }
};

export const reviewSubmission = async (req: Request, res: Response) => {
    try {
        const batchId = req.params.batchId as string;
        const adminUserId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;

        if (!batchId) return res.status(400).json({ error: "batchId is required." });
        if (!organizationId || !adminUserId) return res.status(403).json({ error: "Unauthorized." });

        const { action, rejectionReason } = req.body;
        if (!action || !["APPROVE", "REJECT"].includes(action)) {
            return res.status(400).json({ error: "action must be 'APPROVE' or 'REJECT'." });
        }

        const result = await GradeSubmissionService.reviewSubmission(
            batchId,
            adminUserId,
            organizationId,
            action,
            rejectionReason
        );

        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to review grade submission." });
    }
};
