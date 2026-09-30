import { Request, Response } from "express";
import { StudentService } from "./student.service.js";
import { EnrollmentStatus } from "../../generated/prisma/enums.js";

// Create a global student identity
export const createStudent = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName } = req.body;
        let { studentId } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({ error: "firstName and lastName are required" });
        }

        if (!studentId) {
            // Auto-generate a Student ID (e.g., STU-YYYYMM-XXXX)
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            const dateStr = new Date().toISOString().slice(2, 7).replace("-", ""); // YYMM
            studentId = `STU-${dateStr}-${randomCode}`;
        }

        const student = await StudentService.createStudent({
            ...req.body,
            studentId,
            userId: req.user?.id
        });
        
        return res.status(201).json(student);
    } catch (error) {
        return res.status(400).json({ error: "Failed to create student. Student ID might already exist." });
    }
};

export const getStudents = async (req: Request, res: Response) => {
    try {
        const students = await StudentService.getStudents();
        return res.json(students);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getStudentById = async (req: Request, res: Response) => {
    try {
        const student = await StudentService.getStudentById(req.params.id as string);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        return res.json(student);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Enroll a student in a specific school and academic year
export const enrollStudent = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { studentId, academicYearId, schoolGradeId, sectionId } = req.body;
        if (!studentId || !academicYearId || !schoolGradeId) {
            return res.status(400).json({ error: "studentId, academicYearId, and schoolGradeId are required" });
        }

        const enrollment = await StudentService.enrollStudent(organizationId, studentId, academicYearId, schoolGradeId, sectionId);
        return res.status(201).json(enrollment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to enroll student" });
    }
};

// Get active enrollments for the school context
export const getEnrollments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;
        const enrollments = await StudentService.getEnrollments(organizationId, academicYearId as string);
        return res.json(enrollments);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Transfer student mid-year
export const transferStudent = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId } = req.params;
        const { targetSchoolGradeId, targetSectionId, reason } = req.body;

        if (!targetSchoolGradeId) {
            return res.status(400).json({ error: "targetSchoolGradeId is required" });
        }

        const newEnrollment = await StudentService.transferStudent(organizationId, enrollmentId as string, targetSchoolGradeId, targetSectionId, reason);
        return res.status(201).json(newEnrollment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to transfer student" });
    }
};

// Update enrollment status
export const updateStudentStatus = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId } = req.params;
        const { status, reason } = req.body;

        if (!status) {
            return res.status(400).json({ error: "status is required" });
        }

        const updated = await StudentService.updateStudentStatus(organizationId, enrollmentId as string, status as EnrollmentStatus, reason);
        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update student status" });
    }
};

export const getStudentProfile = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const student = await StudentService.getStudentByUserId(userId, organizationId);
        if (!student) return res.status(404).json({ error: "Student profile not found" });

        return res.json(student);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getStudentDashboard = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const dashboard = await StudentService.getStudentDashboard(userId, organizationId);
        if (!dashboard) return res.status(404).json({ error: "Student dashboard data not found" });

        return res.json(dashboard);
    } catch (error) {
        console.error("Error fetching student dashboard:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyStudentAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const { startDate, endDate } = req.query;
        const attendance = await StudentService.getStudentAttendance(userId, organizationId, startDate as string, endDate as string);
        if (!attendance) return res.status(404).json({ error: "Student attendance data not found" });
        return res.json(attendance);
    } catch (error) {
        console.error("Error fetching student attendance:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyStudentAssessments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const assessments = await StudentService.getStudentAssessments(userId, organizationId);
        if (!assessments) return res.status(404).json({ error: "Student assessment data not found" });
        return res.json(assessments);
    } catch (error) {
        console.error("Error fetching student assessments:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyLearningActivities = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const activities = await StudentService.getStudentLearningActivities(userId, organizationId);
        if (!activities) return res.status(404).json({ error: "Student learning activity data not found" });
        return res.json(activities);
    } catch (error) {
        console.error("Error fetching student learning activities:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyLearningSubmissions = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const submissions = await StudentService.getStudentLearningSubmissions(userId, organizationId);
        if (!submissions) return res.status(404).json({ error: "Student learning submissions not found" });
        return res.json(submissions);
    } catch (error) {
        console.error("Error fetching student learning submissions:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMySupportActivities = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const activities = await StudentService.getStudentSupportActivities(userId, organizationId);
        if (!activities) return res.status(404).json({ error: "Student support data not found" });
        return res.json(activities);
    } catch (error) {
        console.error("Error fetching student support activities:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyAttendanceTeachers = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });
        const teachers = await StudentService.getStudentAttendanceTeachers(userId, organizationId);
        if (!teachers) return res.status(404).json({ error: "Student enrollment not found" });
        return res.json(teachers);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyDigitalResources = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });
        const resources = await StudentService.getStudentDigitalResources(userId, organizationId);
        if (!resources) return res.status(404).json({ error: "Student enrollment not found" });
        return res.json(resources);
    } catch {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyCommunicationTeachers = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });
        const teachers = await StudentService.getStudentCommunicationTeachers(userId, organizationId);
        if (!teachers) return res.status(404).json({ error: "Student enrollment not found" });
        return res.json(teachers);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyAnnouncements = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });
        const announcements = await StudentService.getStudentAnnouncements(userId, organizationId);
        if (!announcements) return res.status(404).json({ error: "Student enrollment not found" });
        return res.json(announcements);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getMyCommunicationMessages = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });
        const messages = await StudentService.getStudentMessages(userId, organizationId, req.query.otherUserId as string | undefined);
        if (!messages) return res.status(404).json({ error: "Student enrollment not found" });
        return res.json(messages);
    } catch (error: any) {
        return res.status(403).json({ error: error.message || "Unable to load messages" });
    }
};

export const sendMyCommunicationMessage = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        const receiverId = typeof req.body.receiverId === "string" ? req.body.receiverId : "";
        const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });
        if (!receiverId || !content) return res.status(400).json({ error: "receiverId and content are required" });
        const message = await StudentService.sendStudentMessage(userId, organizationId, receiverId, content);
        if (!message) return res.status(404).json({ error: "Student enrollment not found" });
        return res.status(201).json(message);
    } catch (error: any) {
        return res.status(403).json({ error: error.message || "Unable to send message" });
    }
};

export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(403).json({ error: "Missing authentication" });
        return res.json(await StudentService.getStudentNotifications(userId));
    } catch {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const submitMyAttendanceExplanation = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        const absenceDate = typeof req.body.absenceDate === "string" ? req.body.absenceDate : "";
        const recipientTeacherId = typeof req.body.recipientTeacherId === "string" ? req.body.recipientTeacherId : "";
        const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
        const attachmentData = typeof req.body.attachmentData === "string" ? req.body.attachmentData : undefined;
        const attachmentName = typeof req.body.attachmentName === "string" ? req.body.attachmentName.trim() : undefined;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });
        if (!absenceDate || !recipientTeacherId || !description) return res.status(400).json({ error: "absenceDate, recipientTeacherId, and description are required" });
        if (attachmentData) {
            const attachmentMatch = attachmentData.match(/^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/);
            if (!attachmentMatch) return res.status(400).json({ error: "Attachment must be a JPG, PNG, WEBP, or PDF file." });
            if (Buffer.byteLength(attachmentMatch[2], "base64") > 5 * 1024 * 1024) {
                return res.status(400).json({ error: "Attachment must be 5 MB or smaller." });
            }
        }

        const explanation = await StudentService.submitAttendanceExplanation(userId, organizationId, absenceDate, recipientTeacherId, description, attachmentData, attachmentName);
        if (!explanation) return res.status(404).json({ error: "Student enrollment not found" });
        return res.status(201).json(explanation);
    } catch (error) {
        console.error("Error submitting attendance explanation:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getTransfersHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const transfers = await StudentService.getTransfers(organizationId);
        return res.json(transfers);
    } catch (error) {
        console.error("Error fetching transfers:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const executeProgressionHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const result = await StudentService.executeProgression(organizationId, req.body);
        return res.json(result);
    } catch (error: any) {
        console.error("Error executing progression:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getApprovalsHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const approvals = await StudentService.getApprovals(organizationId);
        return res.json(approvals);
    } catch (error) {
        console.error("Error fetching approvals:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const createApprovalHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const approval = await StudentService.createApprovalRequest(organizationId, { ...req.body, userId: req.user?.id });
        return res.status(201).json(approval);
    } catch (error) {
        console.error("Error creating approval request:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

