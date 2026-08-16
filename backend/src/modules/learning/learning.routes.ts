import { Router } from "express";
import { 
    createActivity, 
    getActivities,
    submitActivity,
    raiseSupportFlag,
    getSupportFlags
} from "./learning.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Scope all learning operations to SCHOOL
router.use(requireScope("SCHOOL"));

/**
 * @openapi
 * /api/learning/activity:
 *   post:
 *     tags: [Learning, Teachers]
 *     summary: Create a learning activity (homework, lab, reading)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, academicYearId, teachingAssignmentId]
 *             properties:
 *               title:
 *                 type: string
 *               academicYearId:
 *                 type: string
 *               teachingAssignmentId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [HOMEWORK, READING, LAB, PRACTICE]
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Learning activity created successfully
 */
router.post("/activity", requirePermission("ACADEMIC:CREATE"), createActivity);

/**
 * @openapi
 * /api/learning/activity:
 *   get:
 *     tags: [Learning, Teachers]
 *     summary: Get all learning activities for the school or specific teaching assignment
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
 *         description: List of learning activities
 */
router.get("/activity", requirePermission("ACADEMIC:VIEW"), getActivities);

/**
 * @openapi
 * /api/learning/submission:
 *   post:
 *     tags: [Learning, Teachers]
 *     summary: Submit or grade a response for a learning activity
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [learningActivityId, enrollmentId]
 *             properties:
 *               learningActivityId:
 *                 type: string
 *               enrollmentId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PENDING, SUBMITTED, LATE, GRADED]
 *               grade:
 *                 type: string
 *               feedback:
 *                 type: string
 *     responses:
 *       201:
 *         description: Activity submission recorded
 */
router.post("/submission", requirePermission("ACADEMIC:CREATE"), submitActivity);

/**
 * @openapi
 * /api/learning/support:
 *   post:
 *     tags: [Learning, Teachers]
 *     summary: Raise a support flag for an at-risk student
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [enrollmentId, type, description]
 *             properties:
 *               enrollmentId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ACADEMIC, BEHAVIORAL, ATTENDANCE, MEDICAL, OTHER]
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Support flag raised successfully
 */
router.post("/support", requirePermission("ACADEMIC:CREATE"), raiseSupportFlag);

/**
 * @openapi
 * /api/learning/support:
 *   get:
 *     tags: [Learning, Teachers]
 *     summary: Get support flags for the school or specific student
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: enrollmentId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of active support flags
 */
router.get("/support", requirePermission("ACADEMIC:VIEW"), getSupportFlags);

export default router;
