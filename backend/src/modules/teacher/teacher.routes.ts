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
    getStudentDetail,
    recordBatchAttendance,
    createAssessmentWithResults,
    gradeActivitySubmission,
    createStudentSupportFlag,
    resolveSupportFlag,
    sendParentMessage,
    getClassPerformanceReport,
    generateAiTeachingAssistantInsight,
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
 * /api/teacher/students/{studentId}:
 *   get:
 *     tags: [Teachers]
 *     summary: Get comprehensive academic, attendance, and support profile for an assigned student
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed student academic profile
 *       404:
 *         description: Student not found in teacher's classes
 */
router.get("/students/:studentId", getStudentDetail);

/**
 * @openapi
 * /api/teacher/attendance/batch:
 *   post:
 *     tags: [Teachers, Attendance]
 *     summary: Record batch student attendance for an entire class section period
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [academicYearId, sectionId, date, attendances]
 *             properties:
 *               academicYearId:
 *                 type: string
 *               sectionId:
 *                 type: string
 *               classPeriodId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               attendances:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [enrollmentId, status]
 *                   properties:
 *                     enrollmentId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [PRESENT, ABSENT, LATE, EXCUSED]
 *                     remarks:
 *                       type: string
 *     responses:
 *       201:
 *         description: Batch attendance records saved
 */
router.post("/attendance/batch", recordBatchAttendance);

/**
 * @openapi
 * /api/teacher/assessment/full:
 *   post:
 *     tags: [Teachers, Assessment]
 *     summary: Create an assessment and bulk record initial student results
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, maxScore, teachingAssignmentId]
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [EXAM, QUIZ, ASSIGNMENT, PROJECT, OTHER]
 *               maxScore:
 *                 type: number
 *               passingScore:
 *                 type: number
 *               dueDate:
 *                 type: string
 *                 format: date
 *               teachingAssignmentId:
 *                 type: string
 *               results:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [enrollmentId, score]
 *                   properties:
 *                     enrollmentId:
 *                       type: string
 *                     score:
 *                       type: number
 *                     feedback:
 *                       type: string
 *     responses:
 *       201:
 *         description: Assessment and student results created
 */
router.post("/assessment/full", createAssessmentWithResults);

/**
 * @openapi
 * /api/teacher/submission/{submissionId}/grade:
 *   post:
 *     tags: [Teachers, Learning]
 *     summary: Review and grade a student activity submission
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PENDING, SUBMITTED, LATE, GRADED]
 *               grade:
 *                 type: string
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission graded successfully
 */
router.post("/submission/:submissionId/grade", gradeActivitySubmission);

/**
 * @openapi
 * /api/teacher/support/flag:
 *   post:
 *     tags: [Teachers, Support]
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
 *         description: Support flag created
 */
router.post("/support/flag", createStudentSupportFlag);

/**
 * @openapi
 * /api/teacher/support/flag/{flagId}/resolve:
 *   post:
 *     tags: [Teachers, Support]
 *     summary: Record resolution for a student support flag
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: flagId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resolution]
 *             properties:
 *               resolution:
 *                 type: string
 *     responses:
 *       200:
 *         description: Support flag resolved
 */
router.post("/support/flag/:flagId/resolve", resolveSupportFlag);

/**
 * @openapi
 * /api/teacher/message/parent:
 *   post:
 *     tags: [Teachers, Communication]
 *     summary: Send direct message to verified parent of an assigned student
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [parentUserId, content]
 *             properties:
 *               parentUserId:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent to parent
 */
router.post("/message/parent", sendParentMessage);

/**
 * @openapi
 * /api/teacher/reports/class-performance/{teachingAssignmentId}:
 *   get:
 *     tags: [Teachers]
 *     summary: Generate class performance analytics report for a teaching assignment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: teachingAssignmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Class performance analytics report
 */
router.get("/reports/class-performance/:teachingAssignmentId", getClassPerformanceReport);

/**
 * @openapi
 * /api/teacher/ai-assistant:
 *   post:
 *     tags: [Teachers]
 *     summary: Request AI Teacher Assistant insight (lesson planning, practice questions, gap analysis)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [LESSON_PLANNING, QUESTION_GENERATION, PERFORMANCE_INSIGHT]
 *     responses:
 *       200:
 *         description: AI Teacher Assistant advisory insight
 */
router.post("/ai-assistant", generateAiTeachingAssistantInsight);

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
