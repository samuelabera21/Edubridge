import { Router } from "express";
import { 
    recordStudentAttendance, 
    getStudentAttendance,
    recordTeacherAttendance,
    getTeacherAttendance
} from "./attendance.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

router.use(requireScope("SCHOOL"));

/**
 * @openapi
 * /api/attendance/student:
 *   post:
 *     tags: [Attendance, Teachers]
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

/**
 * @openapi
 * /api/attendance/student/{enrollmentId}:
 *   get:
 *     tags: [Attendance, Teachers]
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

/**
 * @openapi
 * /api/attendance/teacher:
 *   post:
 *     tags: [Attendance]
 *     summary: Record teacher attendance (daily)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Teacher attendance recorded successfully
 */
router.post("/teacher", requirePermission("ACADEMIC:CREATE"), recordTeacherAttendance);

/**
 * @openapi
 * /api/attendance/teacher/{teacherId}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get teacher attendance history
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Teacher attendance history records
 */
router.get("/teacher/:teacherId", requirePermission("ACADEMIC:VIEW"), getTeacherAttendance);

export default router;
