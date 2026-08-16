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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName]
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               employeeId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teacher profile created successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Missing school scope
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
 *     responses:
 *       200:
 *         description: List of teachers
 *       403:
 *         description: Missing school scope
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teacherId, academicYearId, subjectId, schoolGradeId]
 *             properties:
 *               teacherId:
 *                 type: string
 *               academicYearId:
 *                 type: string
 *               subjectId:
 *                 type: string
 *               schoolGradeId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Teaching assignment created successfully
 *       400:
 *         description: Invalid parameters or assignment already exists
 *       403:
 *         description: Missing school scope
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
 *     parameters:
 *       - in: query
 *         name: academicYearId
 *         schema:
 *           type: string
 *         description: Filter by academic year ID
 *     responses:
 *       200:
 *         description: List of teaching assignments
 *       403:
 *         description: Missing school scope
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
 *     responses:
 *       200:
 *         description: Logged-in teacher profile and assignment details
 *       404:
 *         description: Teacher profile not found
 */
router.get("/me", getTeacherProfile);

/**
 * @openapi
 * /api/teacher/dashboard-summary:
 *   get:
 *     tags: [Teachers]
 *     summary: Get full dashboard summary (today's classes, timetable, students, pending tasks, AI insights)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Complete teacher dashboard metrics and insights
 *       403:
 *         description: Authentication or school scope missing
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
 *     responses:
 *       200:
 *         description: Array of assigned classes with student rosters
 *       403:
 *         description: Authentication or school scope missing
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
 *     responses:
 *       200:
 *         description: List of weekly timetable class periods
 *       403:
 *         description: Authentication or school scope missing
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
 *     responses:
 *       200:
 *         description: List of active students with attendance & result history
 *       403:
 *         description: Authentication or school scope missing
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *     responses:
 *       201:
 *         description: Obstacle issue reported successfully
 *       400:
 *         description: Invalid parameters
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
 *     responses:
 *       200:
 *         description: List of reported issues and status history
 *       403:
 *         description: Authentication or school scope missing
 */
router.get("/issues", getMyIssues);

export default router;
