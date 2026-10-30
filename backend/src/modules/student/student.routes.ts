import { Router } from "express";
import { 
    createStudent, 
    getStudents,
    getStudentFilters,
    getStudentById,
    enrollStudent, 
    getEnrollments, 
    transferStudent,
    updateStudentStatus,
    getStudentProfile,
    getStudentDashboard,
    getMyStudentAssessments,
    startMyStudentAssessment,
    submitMyStudentAssessment,
    getMyLearningActivities,
    getMyLearningSubmissions,
    submitMyLearningActivity,
    getMySupportActivities,
    getMyStudentAttendance,
    getMyAttendanceTeachers,
    getMyDigitalResources,
    getMyCommunicationTeachers,
    getMyAnnouncements,
    getMyCommunicationMessages,
    sendMyCommunicationMessage,
    getMyNotifications,
    submitMyAttendanceExplanation,
    getMyAttendanceExplanations,
    getTransfersHandler,
    executeProgressionHandler,
    getApprovalsHandler,
    createApprovalHandler,
    registerStudent,
    verifyStudentDocument
} from "./student.controller.js";
import {
    getPlacementWorkspaceHandler,
    assignStudentHandler,
    bulkAssignStudentsHandler,
    reassignStudentSectionHandler,
    getSectionRosterHandler,
    getEnrollmentPlacementHistoryHandler
} from "./student.placement.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";
import { StudentAiService } from "./student-ai.service.js";
import { StudentAiSessionService } from "./student-ai-session.service.js";

const router = Router();

/**
 * @openapi
 * /api/student/register:
 *   post:
 *     tags: [Students]
 *     summary: Full student intake registration & enrollment (identity, guardians, enrollment, documents)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/register", requireScope("SCHOOL"), requirePermission("ACADEMIC:CREATE"), registerStudent);

/**
 * @openapi
 * /api/student:
 *   post:
 *     tags: [Students]
 *     summary: Create a global student identity
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/", requirePermission("ACADEMIC:CREATE"), createStudent);

/**
 * @openapi
 * /api/student:
 *   get:
 *     tags: [Students]
 *     summary: Get all student identities (Platform level)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/", requirePermission("ACADEMIC:VIEW"), getStudents);
router.get("/filters", requirePermission("ACADEMIC:VIEW"), getStudentFilters);



// Enrollment Management - explicitly scoped to SCHOOL context
/**
 * @openapi
 * /api/student/enrollments:
 *   post:
 *     tags: [Students]
 *     summary: Enroll a student into a school and academic year
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/enrollments", requireScope("SCHOOL"), requirePermission("ACADEMIC:CREATE"), enrollStudent);

/**
 * @openapi
 * /api/student/enrollments:
 *   get:
 *     tags: [Students]
 *     summary: Get student enrollments within the school context
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/enrollments", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getEnrollments);

/**
 * @openapi
 * /api/student/enrollments/{enrollmentId}/transfer:
 *   post:
 *     tags: [Students]
 *     summary: Transfer a student mid-year to a new grade or section
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/enrollments/:enrollmentId/transfer", requireScope("SCHOOL"), requirePermission("ACADEMIC:UPDATE"), transferStudent);

/**
 * @openapi
 * /api/student/enrollments/{enrollmentId}/status:
 *   put:
 *     tags: [Students]
 *     summary: Update student enrollment status (e.g., from ACTIVE to DROPPED_OUT)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.put("/enrollments/:enrollmentId/status", requireScope("SCHOOL"), requirePermission("ACADEMIC:UPDATE"), updateStudentStatus);

/**
 * @openapi
 * /api/student/me:
 *   get:
 *     tags: [Students]
 *     summary: Get self-service profile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/me", requireScope("SCHOOL"), getStudentProfile);

router.get("/dashboard", requireScope("SCHOOL"), getStudentDashboard);
router.get("/assessments", requireScope("SCHOOL"), getMyStudentAssessments);
router.post("/assessments/:id/start", requireScope("SCHOOL"), startMyStudentAssessment);
router.post("/assessments/:id/submit", requireScope("SCHOOL"), submitMyStudentAssessment);
router.get("/learning/activities", requireScope("SCHOOL"), getMyLearningActivities);
router.post("/learning/activities/:id/submit", requireScope("SCHOOL"), submitMyLearningActivity);
router.get("/learning/submissions", requireScope("SCHOOL"), getMyLearningSubmissions);
router.get("/support", requireScope("SCHOOL"), getMySupportActivities);
router.get("/attendance", requireScope("SCHOOL"), getMyStudentAttendance);
router.get("/attendance/teachers", requireScope("SCHOOL"), getMyAttendanceTeachers);
router.get("/resources", requireScope("SCHOOL"), getMyDigitalResources);
router.get("/communication/teachers", requireScope("SCHOOL"), getMyCommunicationTeachers);
router.get("/communication/announcements", requireScope("SCHOOL"), getMyAnnouncements);
router.get("/communication/messages", requireScope("SCHOOL"), getMyCommunicationMessages);
router.post("/communication/messages", requireScope("SCHOOL"), sendMyCommunicationMessage);
router.get("/notifications", requireScope("SCHOOL"), getMyNotifications);
router.post("/attendance/explanation", requireScope("SCHOOL"), submitMyAttendanceExplanation);
router.get("/attendance/explanations", requireScope("SCHOOL"), getMyAttendanceExplanations);

/**
 * @openapi
 * /api/student/documents/{documentId}/verify:
 *   put:
 *     tags: [Students]
 *     summary: Verify or reject student supporting document
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.put("/documents/:documentId/verify", requireScope("SCHOOL"), requirePermission("ACADEMIC:UPDATE"), verifyStudentDocument);

// Classroom Placement & Section Rosters
router.get("/placement/workspace", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getPlacementWorkspaceHandler);
router.post("/placement/assign", requireScope("SCHOOL"), requirePermission("ACADEMIC:UPDATE"), assignStudentHandler);
router.post("/placement/bulk-assign", requireScope("SCHOOL"), requirePermission("ACADEMIC:UPDATE"), bulkAssignStudentsHandler);
router.post("/placement/reassign", requireScope("SCHOOL"), requirePermission("ACADEMIC:UPDATE"), reassignStudentSectionHandler);
router.get("/placement/sections/:sectionId/roster", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getSectionRosterHandler);
router.get("/placement/enrollments/:enrollmentId/history", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getEnrollmentPlacementHistoryHandler);

/**
 * @openapi
 * /api/student/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get a single student's profile (including enrollments and documents)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/transfers/history", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getTransfersHandler);
router.post("/progression/execute", requireScope("SCHOOL"), requirePermission("ACADEMIC:UPDATE"), executeProgressionHandler);
router.get("/approvals/queue", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getApprovalsHandler);
router.post("/approvals/request", requireScope("SCHOOL"), requirePermission("ACADEMIC:CREATE"), createApprovalHandler);

router.get("/:id", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getStudentById);


// POST /api/student/ai/explain - Concept Explainer
router.post("/ai/explain", requireScope("SCHOOL"), async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { subject, topic, depth } = req.body;
        if (!subject || !topic) {
            return res.status(400).json({ error: "Subject and topic are required." });
        }

        const output = await StudentAiService.explainConcept(userId, subject, topic, depth);
        return res.json(output);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to generate explanation" });
    }
});

// POST /api/student/ai/quiz - Interactive Practice Quiz with Multi-Question Batches
router.post("/ai/quiz", requireScope("SCHOOL"), async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { subject, topic, customPrompt, count, difficulty, isOther, enrolledSubjects, file, attachedResource } = req.body;
        const parsedCount = count ? Math.min(Math.max(Number(count), 1), 10) : 3;
        const parsedDiff = difficulty === "Easy" || difficulty === "Warmup" 
            ? "Easy" 
            : difficulty === "Hard" || difficulty === "Challenge" 
            ? "Hard" 
            : "Medium";

        const questions = await StudentAiService.generateQuizBatch({
            userId,
            subject: subject || "General Science",
            topic: topic || "Key Concepts",
            customPrompt: customPrompt || (topic && topic !== subject ? topic : undefined),
            count: parsedCount,
            difficulty: parsedDiff,
            isOther: Boolean(isOther),
            enrolledSubjects: Array.isArray(enrolledSubjects) ? enrolledSubjects : undefined,
            file: file && file.data ? file : undefined,
            attachedResource: attachedResource && attachedResource.title ? attachedResource : undefined
        });

        return res.json({
            questions,
            count: questions.length,
            subject: subject || "General Science",
            difficulty: parsedDiff,
            ...(questions[0] || {})
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to generate quiz questions" });
    }
});

// POST /api/student/ai/chat - Interactive Multi-Turn AI Tutor Chatbot
router.post("/ai/chat", requireScope("SCHOOL"), async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { subject, sessionId, history, message, isOther, enrolledSubjects, file, attachedResource } = req.body;
        if (!message && (!file || !file.data) && (!attachedResource || !attachedResource.title)) {
            return res.status(400).json({ error: "Message, file attachment, or resource selection is required." });
        }

        const response = await StudentAiService.chatWithTutor({
            userId,
            subject: subject || "General Revision",
            sessionId: sessionId || undefined,
            history: Array.isArray(history) ? history : [],
            message: message || "Please review and explain the attached material.",
            isOther: Boolean(isOther),
            enrolledSubjects: Array.isArray(enrolledSubjects) ? enrolledSubjects : undefined,
            file: file && file.data ? file : undefined,
            attachedResource: attachedResource && attachedResource.title ? attachedResource : undefined
        });

        return res.json(response);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to chat with AI Tutor" });
    }
});

// GET /api/student/ai/sessions - Retrieve past conversation sessions for the student
router.get("/ai/sessions", requireScope("SCHOOL"), async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        const sessions = await StudentAiSessionService.getSessions(userId);
        return res.json({ sessions });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to load chat sessions" });
    }
});

// POST /api/student/ai/sessions - Save or update conversation session
router.post("/ai/sessions", requireScope("SCHOOL"), async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        const { session } = req.body;
        if (!session || !session.id) return res.status(400).json({ error: "Valid session object required" });
        const sessions = await StudentAiSessionService.saveSession(userId, session);
        return res.json({ sessions, success: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to save chat session" });
    }
});

// DELETE /api/student/ai/sessions/:id - Delete a specific past conversation
router.delete("/ai/sessions/:id", requireScope("SCHOOL"), async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });
        const sessionId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!sessionId) return res.status(400).json({ error: "Session ID required" });
        const sessions = await StudentAiSessionService.deleteSession(userId, sessionId);
        return res.json({ sessions, success: true });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to delete chat session" });
    }
});

// POST /api/student/ai/plan - AI-Generated Personalized Weekly Study & Wellbeing Roadmap
router.post("/ai/plan", requireScope("SCHOOL"), async (req, res) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { hoursPerDay, customPrompt, style, message, history, enrolledSubjects, weekendHours } = req.body;
        const result = await StudentAiService.generateStudyPlan({
            userId,
            weekdayTargetHours: Number(hoursPerDay) || 2,
            weekendTargetHours: Number(weekendHours) || 3.5,
            customPrompt: customPrompt || message,
            style: style || "balanced",
            message,
            history: Array.isArray(history) ? history : [],
            enrolledSubjects: Array.isArray(enrolledSubjects) ? enrolledSubjects : undefined
        });

        return res.json({
            plan: result.plan,
            coachMessage: result.coachMessage,
            suggestedAdjustments: result.suggestedAdjustments
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to generate study plan" });
    }
});

export default router;
