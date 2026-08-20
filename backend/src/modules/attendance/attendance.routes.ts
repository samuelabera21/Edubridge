import { Router } from "express";
import { 
    recordStudentAttendance, 
    recordBulkStudentAttendance,
    getSectionAttendance,
    getStudentAttendance,
    recordTeacherAttendance,
    recordBulkTeacherAttendance,
    getTeacherAttendance,
    getDailyTeacherAttendance
} from "./attendance.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

router.use(requireScope("SCHOOL"));

/**
 * @openapi
 * /api/attendance/student:
 *   post:
 *     tags: [Attendance]
 *     summary: Record student attendance (daily or by period)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [enrollmentId, date]
 *             properties:
 *               enrollmentId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [PRESENT, ABSENT, LATE, EXCUSED]
 *               remarks:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student attendance recorded successfully
 *       400:
 *         description: Bad request
 */
router.post("/student", requirePermission("ACADEMIC:CREATE"), recordStudentAttendance);
router.post("/student/bulk", requirePermission("ACADEMIC:CREATE"), recordBulkStudentAttendance);
router.get("/student/section/:sectionId", requirePermission("ACADEMIC:VIEW"), getSectionAttendance);

/**
 * @openapi
 * /api/attendance/student/{enrollmentId}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get student attendance history
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: enrollmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student attendance history records
 */
router.get("/student/:enrollmentId", requirePermission("ACADEMIC:VIEW"), getStudentAttendance);

router.post("/teacher", requirePermission("ACADEMIC:CREATE"), recordTeacherAttendance);
router.post("/teacher/bulk", requirePermission("ACADEMIC:CREATE"), recordBulkTeacherAttendance);
router.get("/teacher/daily", requirePermission("ACADEMIC:VIEW"), getDailyTeacherAttendance);
router.get("/teacher/:teacherId", requirePermission("ACADEMIC:VIEW"), getTeacherAttendance);

export default router;

