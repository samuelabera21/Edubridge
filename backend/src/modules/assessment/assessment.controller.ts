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

        const { sectionId, academicYearId } = req.query;

        const assessments = await AssessmentService.getAssessments(
            organizationId, 
            sectionId as string, 
            academicYearId as string
        );
        return res.json(assessments);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getAssessmentWithResults = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id } = req.params;
        const data = await AssessmentService.getAssessmentWithResults(organizationId, id as string);
        return res.json(data);
    } catch (error: any) {
        return res.status(404).json({ error: error.message || "Assessment not found" });
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

export const recordBulkResults = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { assessmentId, results } = req.body;
        if (!assessmentId || !Array.isArray(results)) {
            return res.status(400).json({ error: "assessmentId and results array are required" });
        }

        const savedResults = await AssessmentService.recordBulkResults(organizationId, {
            assessmentId,
            results,
            gradedById: req.user?.id
        });

        return res.status(201).json({ success: true, count: savedResults.length, data: savedResults });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record bulk assessment results" });
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

export const getStudentReportCard = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId } = req.params;
        const report = await AssessmentService.getStudentReportCard(organizationId, enrollmentId as string);
        return res.json(report);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to generate report card" });
    }
};

import { AssessmentAdminService } from "./assessment.admin.service.js";

export const getSubjectAnalytics = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;
        const analytics = await AssessmentService.getSubjectAnalytics(organizationId, academicYearId as string);
        return res.json(analytics);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch subject analytics" });
    }
};

export const getAtRiskStudents = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const students = await AssessmentService.getAtRiskStudents(organizationId);
        return res.json(students);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch at-risk students" });
    }
};

export const getGradebookApprovals = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const gradebooks = await AssessmentService.getGradebookApprovals(organizationId);
        return res.json(gradebooks);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch gradebook approvals" });
    }
};

// ============================================================
// SCHOOL ADMINISTRATOR / PRINCIPAL OVERSIGHT CONTROLLERS
// ============================================================

export const getAdminOverview = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, schoolGradeId, sectionId, subjectId, assessmentId } = req.query;

        const overview = await AssessmentAdminService.getOverview(organizationId, {
            academicYearId: academicYearId as string,
            schoolGradeId: schoolGradeId as string,
            sectionId: sectionId as string,
            subjectId: subjectId as string,
            assessmentId: assessmentId as string
        });

        return res.json(overview);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch assessment overview" });
    }
};

export const getAdminResults = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, schoolGradeId, sectionId, subjectId, assessmentId, search, page, limit } = req.query;

        const data = await AssessmentAdminService.getSchoolResults(organizationId, {
            academicYearId: academicYearId as string,
            schoolGradeId: schoolGradeId as string,
            sectionId: sectionId as string,
            subjectId: subjectId as string,
            assessmentId: assessmentId as string,
            search: search as string,
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 20
        });

        return res.json(data);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch school results" });
    }
};

export const getAdminStudentResultDetail = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId } = req.params;
        const { academicYearId } = req.query;

        const detail = await AssessmentAdminService.getStudentResultDetail(
            organizationId,
            enrollmentId as string,
            academicYearId as string
        );

        return res.json(detail);
    } catch (error: any) {
        return res.status(404).json({ error: error.message || "Failed to fetch student result detail" });
    }
};

export const getAdminFilterOptions = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;

        const options = await AssessmentAdminService.getFilterOptions(
            organizationId,
            academicYearId as string
        );

        return res.json(options);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch filter options" });
    }
};

export const getAdminStudentsRoster = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, schoolGradeId, sectionId, search } = req.query;

        const roster = await AssessmentAdminService.getStudentsRoster(organizationId, {
            academicYearId: academicYearId as string,
            schoolGradeId: schoolGradeId as string,
            sectionId: sectionId as string,
            search: search as string
        });

        return res.json(roster);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch student roster" });
    }
};


