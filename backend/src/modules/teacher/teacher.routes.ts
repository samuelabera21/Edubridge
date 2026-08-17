import { Router } from "express";
import { 
    createTeacher, 
    getTeachers,
    getTeacherById,
    assignTeacher, 
    getAssignments, 
    getTeacherProfile,
    updateAssignment,
    deleteAssignment
} from "./teacher.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Ensure all teacher routes are scoped to SCHOOL
router.use(requireScope("SCHOOL"));

/**
 * @openapi
 * /api/teacher:
 *   post:
 *     tags: [Teachers]
 *     summary: Create a teacher profile for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/", requirePermission("ACADEMIC:CREATE"), createTeacher);

/**
 * @openapi
 * /api/teacher:
 *   get:
 *     tags: [Teachers]
 *     summary: Get all teachers for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/", requirePermission("ACADEMIC:VIEW"), getTeachers);

/**
 * @openapi
 * /api/teacher/assignments:
 *   post:
 *     tags: [Teachers]
 *     summary: Assign a teacher to a subject, grade, and section
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/assignments", requirePermission("ACADEMIC:CREATE"), assignTeacher);

/**
 * @openapi
 * /api/teacher/assignments/{id}:
 *   put:
 *     tags: [Teachers]
 *     summary: Update a teaching assignment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *   delete:
 *     tags: [Teachers]
 *     summary: Delete a teaching assignment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.put("/assignments/:id", requirePermission("ACADEMIC:UPDATE"), updateAssignment);
router.delete("/assignments/:id", requirePermission("ACADEMIC:DELETE"), deleteAssignment);

/**
 * @openapi
 * /api/teacher/assignments:
 *   get:
 *     tags: [Teachers]
 *     summary: Get teaching assignments within the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/assignments", requirePermission("ACADEMIC:VIEW"), getAssignments);

/**
 * @openapi
 * /api/teacher/me:
 *   get:
 *     tags: [Teachers]
 *     summary: Get self-service profile
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/me", getTeacherProfile);

/**
 * @openapi
 * /api/teacher/{id}:
 *   get:
 *     tags: [Teachers]
 *     summary: Get a specific teacher by ID
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/:id", requirePermission("ACADEMIC:VIEW"), getTeacherById);

export default router;
