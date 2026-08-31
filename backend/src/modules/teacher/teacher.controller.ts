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
            ...req.body
        });

        return res.status(201).json(teacher);
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return res.status(400).json({ error: "A teacher with this information already exists." });
        }
        return res.status(400).json({ error: error.message || "Failed to create teacher" });
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



export const getTeacherById = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const teacher = await TeacherService.getTeacherById(organizationId, req.params.id as string);
        if (!teacher) return res.status(404).json({ error: "Teacher not found" });

        return res.json(teacher);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Create a teaching assignment
export const assignTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teacherId, academicYearId, subjectId, schoolGradeId, sectionId, sectionIds, periodsPerWeek } = req.body;

        if (!teacherId || !academicYearId || !subjectId || !schoolGradeId) {
            return res.status(400).json({ error: "teacherId, academicYearId, subjectId, and schoolGradeId are required" });
        }

        const assignment = await TeacherService.assignTeacher(organizationId, {
            teacherId,
            academicYearId,
            subjectId,
            schoolGradeId,
            sectionId,
            sectionIds,
            periodsPerWeek: periodsPerWeek !== undefined ? Number(periodsPerWeek) : undefined
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

// Update an assignment
export const updateAssignment = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = req.params.id as string;
        const assignment = await TeacherService.updateAssignment(id, organizationId, req.body);
        return res.json(assignment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update assignment" });
    }
};

// Delete an assignment
export const deleteAssignment = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = req.params.id as string;
        await TeacherService.deleteAssignment(id, organizationId);
        return res.status(204).send();
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to delete assignment" });
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

export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const summary = await TeacherService.getDashboardSummary(userId, organizationId);
        return res.json(summary);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getMyClasses = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const classes = await TeacherService.getMyClasses(userId, organizationId);
        return res.json(classes);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getMyTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const timetable = await TeacherService.getMyTimetable(userId, organizationId);
        return res.json(timetable);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getMyStudents = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const students = await TeacherService.getMyStudents(userId, organizationId);
        return res.json(students);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getStudentDetail = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const student = await TeacherService.getStudentDetail(userId, organizationId, req.params.studentId as string);
        return res.json(student);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to get student detail" });
    }
};

export const recordBatchAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const result = await TeacherService.recordBatchAttendance(userId, organizationId, req.body);
        return res.status(201).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record batch attendance" });
    }
};

export const createAssessmentWithResults = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const assessment = await TeacherService.createAssessmentWithResults(userId, organizationId, req.body);
        return res.status(201).json(assessment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create assessment with results" });
    }
};

export const gradeActivitySubmission = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const submission = await TeacherService.gradeActivitySubmission(userId, organizationId, req.params.submissionId as string, req.body);
        return res.json(submission);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to grade submission" });
    }
};

export const createStudentSupportFlag = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const flag = await TeacherService.createStudentSupportFlag(userId, organizationId, req.body);
        return res.status(201).json(flag);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to raise support flag" });
    }
};

export const resolveSupportFlag = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const flag = await TeacherService.resolveSupportFlag(userId, organizationId, req.params.flagId as string, req.body);
        return res.json(flag);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to resolve support flag" });
    }
};

export const sendParentMessage = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const message = await TeacherService.sendParentMessage(userId, organizationId, req.body);
        return res.status(201).json(message);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to send parent message" });
    }
};

export const getClassPerformanceReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const report = await TeacherService.getClassPerformanceReport(userId, organizationId, req.params.teachingAssignmentId as string);
        return res.json(report);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to get class performance report" });
    }
};

export const askAiAssistant = async (req: Request, res: Response) => {
    try {
        const { prompt, category } = req.body;
        return res.json({
            prompt,
            category,
            answer: `AI recommendation for ${category || 'teaching'}: Based on recent class analytics, focusing on concept review and interactive quizzes is recommended for optimal student outcome.`
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to generate AI assistant response" });
    }
};

export const reportIssue = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const issue = await TeacherService.reportIssue(userId, organizationId, req.body);
        return res.status(201).json(issue);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to report issue" });
    }
};

export const getMyIssues = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const issues = await TeacherService.getMyIssues(userId, organizationId);
        return res.json(issues);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to get reported issues" });
    }
};



