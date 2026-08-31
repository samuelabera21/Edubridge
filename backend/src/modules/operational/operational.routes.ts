import { Router } from "express";
import { 
    createResource, getResources, updateResource, deleteResource,
    reportIssue, getIssues, updateIssueStatus,
    createImprovementPlan, getImprovementPlans, updateImprovementPlanStatus
} from "./operational.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/operational/resource:
 *   post:
 *     tags: [Operational]
 *     summary: Register a new school resource
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/resource", requireScope("SCHOOL"), requirePermission("OPERATIONAL:CREATE"), createResource);

/**
 * @openapi
 * /api/operational/resource:
 *   get:
 *     tags: [Operational]
 *     summary: Get all school resources
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/resource", requireScope("SCHOOL"), requirePermission("OPERATIONAL:VIEW"), getResources);

/**
 * @openapi
 * /api/operational/resource/{id}:
 *   put:
 *     tags: [Operational]
 *     summary: Update a school resource
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *   delete:
 *     tags: [Operational]
 *     summary: Delete a school resource
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.put("/resource/:id", requireScope("SCHOOL"), requirePermission("OPERATIONAL:UPDATE"), updateResource);
router.delete("/resource/:id", requireScope("SCHOOL"), requirePermission("OPERATIONAL:DELETE"), deleteResource);

/**
 * @openapi
 * /api/operational/issue:
 *   post:
 *     tags: [Operational]
 *     summary: Report a new issue
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/issue", requireScope("SCHOOL"), requirePermission("ISSUE:CREATE"), reportIssue);

/**
 * @openapi
 * /api/operational/issue:
 *   get:
 *     tags: [Operational]
 *     summary: Get all issues for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/issue", requireScope("SCHOOL"), requirePermission("ISSUE:VIEW"), getIssues);

/**
 * @openapi
 * /api/operational/issue/{id}/status:
 *   patch:
 *     tags: [Operational]
 *     summary: Update the status of an issue
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.patch("/issue/:id/status", requireScope("SCHOOL"), requirePermission("ISSUE:UPDATE"), updateIssueStatus);

/**
 * @openapi
 * /api/operational/improvement-plan:
 *   post:
 *     tags: [Operational]
 *     summary: Create a new improvement plan
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/improvement-plan", requireScope("SCHOOL"), requirePermission("OPERATIONAL:CREATE"), createImprovementPlan);

/**
 * @openapi
 * /api/operational/improvement-plan:
 *   get:
 *     tags: [Operational]
 *     summary: Get all improvement plans
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/improvement-plan", requireScope("SCHOOL"), requirePermission("OPERATIONAL:VIEW"), getImprovementPlans);
router.patch("/improvement-plan/:id/status", requireScope("SCHOOL"), requirePermission("OPERATIONAL:UPDATE"), updateImprovementPlanStatus);

export default router;
