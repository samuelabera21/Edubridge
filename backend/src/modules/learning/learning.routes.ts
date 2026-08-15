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
 *     tags: [Learning]
 *     summary: Create a learning activity
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/activity", requirePermission("ACADEMIC:CREATE"), createActivity);

/**
 * @openapi
 * /api/learning/activity:
 *   get:
 *     tags: [Learning]
 *     summary: Get all learning activities for the school or specific teaching assignment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/activity", requirePermission("ACADEMIC:VIEW"), getActivities);

/**
 * @openapi
 * /api/learning/submission:
 *   post:
 *     tags: [Learning]
 *     summary: Submit a response for a learning activity
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/submission", requirePermission("ACADEMIC:CREATE"), submitActivity);

/**
 * @openapi
 * /api/learning/support:
 *   post:
 *     tags: [Learning]
 *     summary: Raise a support flag for a student
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/support", requirePermission("ACADEMIC:CREATE"), raiseSupportFlag);

/**
 * @openapi
 * /api/learning/support:
 *   get:
 *     tags: [Learning]
 *     summary: Get support flags for the school or specific student
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/support", requirePermission("ACADEMIC:VIEW"), getSupportFlags);

export default router;
