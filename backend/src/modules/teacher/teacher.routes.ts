import { Router } from "express";
import { 
    createTeacher, 
    getTeachers,
    assignTeacher, 
    getAssignments, 
    getTeacherProfile,
    getMyClasses,
    getMyTimetable,
    getMyStudents,
    getDashboardSummary,
    reportIssue,
    getMyIssues
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
 *     summary: Get self-service profile and active assignments for the logged-in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/me", getTeacherProfile);

/**
 * @openapi
 * /api/teacher/dashboard-summary:
 *   get:
 *     tags: [Teachers]
 *     summary: Get full dashboard summary (today's classes, timetable, students, pending tasks, AI insights) for the logged-in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/dashboard-summary", getDashboardSummary);

/**
 * @openapi
 * /api/teacher/my-classes:
 *   get:
 *     tags: [Teachers]
 *     summary: Get assigned classes, subjects, and student rosters for the logged-in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/my-classes", getMyClasses);

/**
 * @openapi
 * /api/teacher/my-timetable:
 *   get:
 *     tags: [Teachers]
 *     summary: Get weekly teaching timetable schedule for the logged-in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/my-timetable", getMyTimetable);

/**
 * @openapi
 * /api/teacher/students:
 *   get:
 *     tags: [Teachers]
 *     summary: Get student rosters across all sections taught by the logged-in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/students", getMyStudents);

/**
 * @openapi
 * /api/teacher/issues:
 *   post:
 *     tags: [Teachers]
 *     summary: Report a classroom, teaching material, or facility obstacle to school administration
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/issues", reportIssue);

/**
 * @openapi
 * /api/teacher/issues:
 *   get:
 *     tags: [Teachers]
 *     summary: Get reported obstacles and status history for the logged-in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/issues", getMyIssues);

export default router;
