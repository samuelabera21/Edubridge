import { Router } from "express";
import { 
    registerStudentIntake,
    searchStudents,
    createStudent, 
    getStudents,
    getStudentById,
    enrollStudent, 
    getEnrollments, 
    transferStudent,
    updateStudentStatus,
    verifyDocumentHandler,
    getStudentProfile,
    getStudentDashboard,
    getTransfersHandler,
    executeProgressionHandler,
    getApprovalsHandler,
    createApprovalHandler
} from "./student.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/student/register:
 *   post:
 *     tags: [Students]
 *     summary: Step 4 Atomic Student Intake & Academic-Year Enrollment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/register", requireScope("SCHOOL"), requirePermission("ACADEMIC:CREATE"), registerStudentIntake);

/**
 * @openapi
 * /api/student/search:
 *   get:
 *     tags: [Students]
 *     summary: Search existing students for duplicate check & returning enrollment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/search", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), searchStudents);

/**
 * @openapi
 * /api/student/documents/{id}/verify:
 *   put:
 *     tags: [Students]
 *     summary: Verify or reject supporting evidence document
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.put("/documents/:id/verify", requireScope("SCHOOL"), requirePermission("ACADEMIC:UPDATE"), verifyDocumentHandler);

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
 *     summary: Get all students (scoped to school when school context is present)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getStudents);

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

/**
 * @openapi
 * /api/student/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Get a single student's profile (including enrollments, guardians, and documents)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/transfers/history", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getTransfersHandler);
router.post("/progression/execute", requireScope("SCHOOL"), requirePermission("ACADEMIC:UPDATE"), executeProgressionHandler);
router.get("/approvals/queue", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getApprovalsHandler);
router.post("/approvals/request", requireScope("SCHOOL"), requirePermission("ACADEMIC:CREATE"), createApprovalHandler);

router.get("/:id", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getStudentById);

export default router;
