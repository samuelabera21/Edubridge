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
 */
router.get("/result/student/:enrollmentId", requirePermission("ACADEMIC:VIEW"), getStudentResults);

export default router;
