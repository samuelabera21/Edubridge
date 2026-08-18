import { Router } from "express";
import { 
    createAssessment, 
    getAssessments,
    recordResult,
    getStudentResults
} from "./assessment.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Scope all assessment operations to SCHOOL
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

/**
 * @openapi
 * /api/assessment/result/student/{enrollmentId}:
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
router.get("/result/student/:enrollmentId", requirePermission("ACADEMIC:VIEW"), getStudentResults);

export default router;
