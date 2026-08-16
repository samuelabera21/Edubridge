import { Request, Response } from "express";
import { TeacherService } from "./teacher.service.js";

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

export const getMyClasses = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const classes = await TeacherService.getMyClasses(userId, organizationId);
        return res.json(classes);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const timetable = await TeacherService.getMyTimetable(userId, organizationId);
        return res.json(timetable);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyStudents = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const students = await TeacherService.getMyStudents(userId, organizationId);
        return res.json(students);
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
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getStudentDetail = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const studentId = req.params.studentId as string;
        const student = await TeacherService.getStudentDetail(userId, organizationId, studentId);
        return res.json(student);
    } catch (error: any) {
        return res.status(404).json({ error: error.message || "Student details not found" });
    }
};

export const recordBatchAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const { academicYearId, sectionId, classPeriodId, date, attendances } = req.body;
        if (!academicYearId || !sectionId || !date || !attendances) {
            return res.status(400).json({ error: "academicYearId, sectionId, date, and attendances array are required" });
        }

        const result = await TeacherService.recordBatchAttendance(userId, organizationId, {
            academicYearId,
            sectionId,
            classPeriodId,
            date,
            attendances
        });

        return res.status(201).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record section attendance" });
    }
};

export const createAssessmentWithResults = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const { title, type, maxScore, passingScore, dueDate, teachingAssignmentId, results } = req.body;
        if (!title || !maxScore || !teachingAssignmentId) {
            return res.status(400).json({ error: "title, maxScore, and teachingAssignmentId are required" });
        }

        const assessment = await TeacherService.createAssessmentWithResults(userId, organizationId, {
            title,
            type,
            maxScore,
            passingScore,
            dueDate,
            teachingAssignmentId,
            results
        });

        return res.status(201).json(assessment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create assessment" });
    }
};

export const gradeActivitySubmission = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const submissionId = req.params.submissionId as string;
        const { status, grade, feedback } = req.body;

        const updated = await TeacherService.gradeActivitySubmission(userId, organizationId, submissionId, {
            status,
            grade,
            feedback
        });

        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to grade submission" });
    }
};

export const createStudentSupportFlag = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const { enrollmentId, type, description } = req.body;
        if (!enrollmentId || !type || !description) {
            return res.status(400).json({ error: "enrollmentId, type, and description are required" });
        }

        const flag = await TeacherService.createStudentSupportFlag(userId, organizationId, {
            enrollmentId,
            type,
            description
        });

        return res.status(201).json(flag);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create support flag" });
    }
};

export const resolveSupportFlag = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const flagId = req.params.flagId as string;
        const { resolution } = req.body;
        if (!resolution) return res.status(400).json({ error: "resolution text is required" });

        const flag = await TeacherService.resolveSupportFlag(userId, organizationId, flagId, { resolution });
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

        const { parentUserId, content } = req.body;
        if (!parentUserId || !content) return res.status(400).json({ error: "parentUserId and content are required" });

        const msg = await TeacherService.sendParentMessage(userId, organizationId, { parentUserId, content });
        return res.status(201).json(msg);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to send message" });
    }
};

export const getClassPerformanceReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const teachingAssignmentId = req.params.teachingAssignmentId as string;
        const report = await TeacherService.getClassPerformanceReport(userId, organizationId, teachingAssignmentId);
        return res.json(report);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to generate class performance report" });
    }
};

export const generateAiTeachingAssistantInsight = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const { prompt, category } = req.body;
        if (!prompt) return res.status(400).json({ error: "prompt is required" });

        const insight = await TeacherService.generateAiTeachingAssistantInsight(userId, organizationId, prompt, category);
        return res.json(insight);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to generate AI insight" });
    }
};

export const reportIssue = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const { title, category, description, priority } = req.body;
        if (!title) return res.status(400).json({ error: "title is required" });

        const issue = await TeacherService.reportIssue(userId, organizationId, {
            title,
            category,
            description,
            priority
        });

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
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};
