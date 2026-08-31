import { Router } from "express";
import { 
    createTeacher, 
    getTeachers,
    getTeacherById,
    assignTeacher, 
    getAssignments, 
    getTeacherProfile,
    getDashboardSummary,
    updateAssignment,
    deleteAssignment,
    getMyClasses,
    getMyTimetable,
    getMyStudents,
    getStudentDetail,
    recordBatchAttendance,
    createAssessmentWithResults,
    gradeActivitySubmission,
    createStudentSupportFlag,
    resolveSupportFlag,
    sendParentMessage,
    getClassPerformanceReport,
    askAiAssistant,
    reportIssue,
    getMyIssues,
    getMyProfile,
    updateMyProfile,
    getRepeatedAbsences,
    getCurriculumData
} from "./teacher.controller.js";
import { createActivity, getActivities, submitActivity, raiseSupportFlag, getSupportFlags } from "../learning/learning.controller.js";
import { recordStudentAttendance, getStudentAttendance } from "../attendance/attendance.controller.js";
import { createAssessment, getAssessments, recordResult, getStudentResults } from "../assessment/assessment.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Ensure all teacher routes are scoped to SCHOOL
router.use(requireScope("SCHOOL"));

/**
 * @openapi
 * /api/teacher/dashboard-summary:
 *   get:
 *     tags: [Teachers]
 *     summary: Get command center summary metrics, today's schedule, pending tasks, and AI insights
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Teacher dashboard summary data
 */
router.get("/dashboard-summary", getDashboardSummary);

router.get("/profile", getMyProfile);
router.put("/profile", updateMyProfile);

/**
 * @openapi
 * /api/teacher/my-classes:
 *   get:
 *     tags: [Teachers]
 *     summary: Get all classes and student rosters assigned to the logged in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of assigned classes and students
 */
router.get("/my-classes", getMyClasses);

/**
 * @openapi
 * /api/teacher/my-timetable:
 *   get:
 *     tags: [Teachers]
 *     summary: Get weekly class timetable for the logged in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Teacher timetable slots
 */
router.get("/my-timetable", getMyTimetable);

/**
 * @openapi
 * /api/teacher/my-students:
 *   get:
 *     tags: [Teachers]
 *     summary: Get active students enrolled across teacher's assigned sections
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of active enrolled students
 */
router.get("/my-students", getMyStudents);

/**
 * @openapi
 * /api/teacher/students/{studentId}:
 *   get:
 *     tags: [Teachers]
 *     summary: Get comprehensive profile of a specific student in assigned classes
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Detailed student profile including attendance and assessment history
 */
router.get("/students/:studentId", getStudentDetail);

router.get("/attendance/repeated-absences", getRepeatedAbsences);
router.get("/curriculum", getCurriculumData);

/**
 * @openapi
 * /api/teacher/attendance/batch:
 *   post:
 *     tags: [Teachers]
 *     summary: Record section attendance for a specific class period and date
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Attendance records saved successfully
 */
router.post("/attendance/batch", recordBatchAttendance);

/**
 * @openapi
 * /api/teacher/attendance/student:
 *   post:
 *     tags: [Teachers]
 *     summary: Record student attendance (daily or by period)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Student attendance recorded
 */
router.post("/attendance/student", requirePermission("ACADEMIC:CREATE"), recordStudentAttendance);

/**
 * @openapi
 * /api/teacher/attendance/student/{enrollmentId}:
 *   get:
 *     tags: [Teachers]
 *     summary: Get student attendance history for teacher's section
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Student attendance history
 */
router.get("/attendance/student/:enrollmentId", requirePermission("ACADEMIC:VIEW"), getStudentAttendance);

/**
 * @openapi
 * /api/teacher/learning/activity:
 *   post:
 *     tags: [Teachers]
 *     summary: Create a learning activity (homework, lab, reading)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Learning activity created
 *   get:
 *     tags: [Teachers]
 *     summary: Get learning activities assigned by teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of learning activities
 */
router.post("/learning/activity", requirePermission("ACADEMIC:CREATE"), createActivity);
router.get("/learning/activity", requirePermission("ACADEMIC:VIEW"), getActivities);

/**
 * @openapi
 * /api/teacher/learning/submission:
 *   post:
 *     tags: [Teachers]
 *     summary: Submit or grade a response for a learning activity
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Activity submission recorded
 */
router.post("/learning/submission", requirePermission("ACADEMIC:CREATE"), submitActivity);

/**
 * @openapi
 * /api/teacher/learning/support:
 *   post:
 *     tags: [Teachers]
 *     summary: Raise a support flag for an at-risk student
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Support flag raised
 *   get:
 *     tags: [Teachers]
 *     summary: Get active support flags for teacher's section
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of support flags
 */
router.post("/learning/support", requirePermission("ACADEMIC:CREATE"), raiseSupportFlag);
router.get("/learning/support", requirePermission("ACADEMIC:VIEW"), getSupportFlags);

/**
 * @openapi
 * /api/teacher/assessment:
 *   post:
 *     tags: [Teachers]
 *     summary: Create a new class assessment (Exam, Quiz, Assignment)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Assessment created successfully
 *   get:
 *     tags: [Teachers]
 *     summary: Get all assessments for teacher's class
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of assessments
 */
router.post("/assessment", requirePermission("ACADEMIC:CREATE"), createAssessment);
router.get("/assessment", requirePermission("ACADEMIC:VIEW"), getAssessments);

/**
 * @openapi
 * /api/teacher/assessment/result:
 *   post:
 *     tags: [Teachers]
 *     summary: Record a student's result for an assessment
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Assessment result recorded
 */
router.post("/assessment/result", requirePermission("ACADEMIC:CREATE"), recordResult);

/**
 * @openapi
 * /api/teacher/assessment/result/student/{enrollmentId}:
 *   get:
 *     tags: [Teachers]
 *     summary: Get assessment results for a specific student
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Student assessment results
 */
router.get("/assessment/result/student/:enrollmentId", requirePermission("ACADEMIC:VIEW"), getStudentResults);

/**
 * @openapi
 * /api/teacher/assessment/batch:
 *   post:
 *     tags: [Teachers]
 *     summary: Create an assessment and input student scores in a single batch
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Assessment created with recorded student scores
 */
router.post("/assessment/batch", createAssessmentWithResults);

/**
 * @openapi
 * /api/teacher/submissions/{submissionId}/grade:
 *   post:
 *     tags: [Teachers]
 *     summary: Grade a student submission with score, feedback, and status
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Submission graded successfully
 */
router.post("/submissions/:submissionId/grade", gradeActivitySubmission);

/**
 * @openapi
 * /api/teacher/support-flag:
 *   post:
 *     tags: [Teachers]
 *     summary: Raise a student support/intervention flag (Academic, Attendance, Behavior)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Support flag raised
 */
router.post("/support-flag", createStudentSupportFlag);

/**
 * @openapi
 * /api/teacher/support-flag/{flagId}/resolve:
 *   post:
 *     tags: [Teachers]
 *     summary: Mark a student support flag as resolved
 *     parameters:
 *       - in: path
 *         name: flagId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Support flag resolved
 */
router.post("/support-flag/:flagId/resolve", resolveSupportFlag);

/**
 * @openapi
 * /api/teacher/parent-message:
 *   post:
 *     tags: [Teachers]
 *     summary: Send direct message to a parent/guardian
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Message sent to parent
 */
router.post("/parent-message", sendParentMessage);

/**
 * @openapi
 * /api/teacher/classes/{teachingAssignmentId}/performance:
 *   get:
 *     tags: [Teachers]
 *     summary: Get performance analytics report for a specific assigned class
 *     parameters:
 *       - in: path
 *         name: teachingAssignmentId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Class performance analysis report
 */
router.get("/classes/:teachingAssignmentId/performance", getClassPerformanceReport);

/**
 * @openapi
 * /api/teacher/ai-assistant:
 *   post:
 *     tags: [Teachers]
 *     summary: Generate AI-powered teaching recommendations, lesson plans, and intervention advice
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: AI assistant recommendation response
 */
/**
 * @openapi
 * /api/teacher/issues:
 *   post:
 *     tags: [Teachers]
 *     summary: Report a classroom, facility, or material obstacle/issue to administration
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Issue reported successfully
 *   get:
 *     tags: [Teachers]
 *     summary: Get issues reported by the logged in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of reported issues
 */
router.post("/issues", reportIssue);
router.get("/issues", getMyIssues);

/**
 * @openapi
 * /api/teacher/me:
 *   get:
 *     tags: [Teachers]
 *     summary: Get self-service profile and teaching assignments for the logged in teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged in teacher profile
 */
router.get("/me", getTeacherProfile);

/**
 * @openapi
 * /api/teacher:
 *   post:
 *     tags: [Teachers]
 *     summary: Create a teacher profile for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Teacher profile created
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
 *         description: List of teachers in the school
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
 *     responses:
 *       201:
 *         description: Teaching assignment created
 *   get:
 *     tags: [Teachers]
 *     summary: Get teaching assignments within the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of teaching assignments
 */
router.post("/assignments", requirePermission("ACADEMIC:CREATE"), assignTeacher);
router.get("/assignments", requirePermission("ACADEMIC:VIEW"), getAssignments);

/**
 * @openapi
 * /api/teacher/assignments/{id}:
 *   put:
 *     tags: [Teachers]
 *     summary: Update a teaching assignment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Teaching assignment updated
 *   delete:
 *     tags: [Teachers]
 *     summary: Delete a teaching assignment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       204:
 *         description: Teaching assignment deleted
 */
router.put("/assignments/:id", requirePermission("ACADEMIC:UPDATE"), updateAssignment);
router.delete("/assignments/:id", requirePermission("ACADEMIC:DELETE"), deleteAssignment);

/**
 * @openapi
 * /api/teacher/{id}:
 *   get:
 *     tags: [Teachers]
 *     summary: Get a specific teacher by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Teacher profile
 */
router.get("/:id", requirePermission("ACADEMIC:VIEW"), getTeacherById);

export default router;
