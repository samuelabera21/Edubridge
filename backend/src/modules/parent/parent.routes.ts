import { Router } from "express";
import { getParentProfile, createParent, linkParentToStudent, getStudentParents } from "./parent.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Parent self-service profile
router.get("/me", requireScope("SCHOOL"), getParentProfile);

/**
 * @openapi
 * /api/parent:
 *   post:
 *     tags: [Parent]
 *     summary: Create a new parent record
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/", requireScope("SCHOOL"), requirePermission("USER:CREATE"), createParent);

/**
 * @openapi
 * /api/parent/link:
 *   post:
 *     tags: [Parent]
 *     summary: Link a parent to a student
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/link", requireScope("SCHOOL"), requirePermission("USER:UPDATE"), linkParentToStudent);

/**
 * @openapi
 * /api/parent/student/{studentId}:
 *   get:
 *     tags: [Parent]
 *     summary: Get all parents for a specific student
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/student/:studentId", requireScope("SCHOOL"), requirePermission("USER:VIEW"), getStudentParents);

export default router;
