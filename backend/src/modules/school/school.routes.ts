import { Router } from "express";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";
import { 
    getProfileHandler, 
    updateProfileHandler,
    getHierarchyHandler,
    createOrganizationHandler 
} from "./school.controller.js";

const router = Router();

// Apply middleware to all routes in this router
router.use(requireScope("SCHOOL"));

/**
 * @openapi
 * /api/school/hierarchy:
 *   get:
 *     tags: [School]
 *     summary: Get organization hierarchy
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Hierarchy retrieved successfully
 */
router.get(
    "/hierarchy",
    requirePermission("SCHOOL:VIEW"),
    getHierarchyHandler
);

/**
 * @openapi
 * /api/school/organization:
 *   post:
 *     tags: [School]
 *     summary: Create an organization unit
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [FEDERAL, REGION, ZONE, WOREDA, SCHOOL]
 *               parentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization unit created
 */
router.post(
    "/organization",
    requirePermission("SCHOOL:MANAGE"),
    createOrganizationHandler
);

/**
 * @openapi
 * /api/school/profile:
 *   get:
 *     tags: [School]
 *     summary: Get school profile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: School profile retrieved
 */
router.get(
    "/profile",
    requirePermission("SCHOOL:VIEW"),
    getProfileHandler
);

/**
 * @openapi
 * /api/school/profile:
 *   put:
 *     tags: [School]
 *     summary: Update school profile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               establishedYear:
 *                 type: integer
 *               contactEmail:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, PENDING]
 *               configuration:
 *                 type: object
 *     responses:
 *       200:
 *         description: School profile updated
 */
router.put(
    "/profile",
    requirePermission("SCHOOL:UPDATE"),
    updateProfileHandler
);

export default router;
