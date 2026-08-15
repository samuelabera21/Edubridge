import { Request, Response } from "express";
import { AssessmentService } from "./assessment.service.js";
import { AssessmentType } from "../../generated/prisma/enums.js";

export const createAssessment = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, teachingAssignmentId, title, description, type, maxScore, passingScore, dueDate } = req.body;
        
        if (!academicYearId || !teachingAssignmentId || !title || maxScore === undefined) {
            return res.status(400).json({ error: "academicYearId, teachingAssignmentId, title, and maxScore are required" });
        }

        const assessment = await AssessmentService.createAssessment(organizationId, {
            academicYearId,
            teachingAssignmentId,
            title,
            description,
            type: type as AssessmentType || AssessmentType.EXAM,
            maxScore: Number(maxScore),
            passingScore: passingScore ? Number(passingScore) : undefined,
            dueDate
        });

        return res.status(201).json(assessment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create assessment" });
    }
};

export const getAssessments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teachingAssignmentId } = req.query;

        const assessments = await AssessmentService.getAssessments(organizationId, teachingAssignmentId as string);
        return res.json(assessments);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const recordResult = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { assessmentId, enrollmentId, score, feedback } = req.body;
        if (!assessmentId || !enrollmentId || score === undefined) {
            return res.status(400).json({ error: "assessmentId, enrollmentId, and score are required" });
        }

        const result = await AssessmentService.recordResult(organizationId, {
            assessmentId,
            enrollmentId,
            score: Number(score),
            feedback,
            gradedById: req.user?.id
        });

        return res.status(201).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record result" });
    }
};

export const getStudentResults = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId } = req.params;
        const { academicYearId } = req.query;

        const results = await AssessmentService.getStudentResults(organizationId, enrollmentId as string, academicYearId as string);
        return res.json(results);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};
