import { Router } from "express";
import { 
    createAssessment, 
    getAssessments,
    getAssessmentWithResults,
    recordResult,
    recordBulkResults,
    getStudentResults,
    getStudentReportCard,
    getSubjectAnalytics,
    getAtRiskStudents,
    getGradebookApprovals
} from "./assessment.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

router.use(requireScope("SCHOOL"));

/**
 * @openapi
 * /api/assessment:
 *   post:
 *     tags: [Assessment]
 *     summary: Create a new assessment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, teachingAssignmentId, maxScore]
 *             properties:
 *               title:
 *                 type: string
 *               teachingAssignmentId:
 *                 type: string
 *               maxScore:
 *                 type: number
 *               passingScore:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [EXAM, QUIZ, ASSIGNMENT, PROJECT, OTHER]
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Assessment created successfully
 */
router.post("/", requirePermission("ACADEMIC:CREATE"), createAssessment);

/**
 * @openapi
 * /api/assessment:
 *   get:
 *     tags: [Assessment]
 *     summary: Get all assessments for the school or specific teaching assignment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: teachingAssignmentId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of assessments
 */
router.get("/", requirePermission("ACADEMIC:VIEW"), getAssessments);
router.get("/:id/results", requirePermission("ACADEMIC:VIEW"), getAssessmentWithResults);

/**
 * @openapi
 * /api/assessment/result:
 *   post:
 *     tags: [Assessment]
 *     summary: Record a student's result for an assessment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assessmentId, enrollmentId, score]
 *             properties:
 *               assessmentId:
 *                 type: string
 *               enrollmentId:
 *                 type: string
 *               score:
 *                 type: number
 *               feedback:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student result recorded successfully
 */
router.post("/result", requirePermission("ACADEMIC:CREATE"), recordResult);
router.post("/results/bulk", requirePermission("ACADEMIC:CREATE"), recordBulkResults);

/**
 * @openapi
 * /api/assessment/student/{enrollmentId}:
 *   get:
 *     tags: [Assessment]
 *     summary: Get a student's assessment results
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of student assessment results
 */
router.get("/student/:enrollmentId", requirePermission("ACADEMIC:VIEW"), getStudentResults);
router.get("/result/student/:enrollmentId", requirePermission("ACADEMIC:VIEW"), getStudentResults);
router.get("/student/:enrollmentId/report-card", requirePermission("ACADEMIC:VIEW"), getStudentReportCard);
router.get("/analytics/subjects", requirePermission("ACADEMIC:VIEW"), getSubjectAnalytics);
router.get("/at-risk/students", requirePermission("ACADEMIC:VIEW"), getAtRiskStudents);
router.get("/gradebooks/approval", requirePermission("ACADEMIC:VIEW"), getGradebookApprovals);

export default router;

