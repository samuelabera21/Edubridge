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
 *     tags: [Attendance]
 *     summary: Record student attendance (daily or by period)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/student", requirePermission("ACADEMIC:CREATE"), recordStudentAttendance);

/**
 * @openapi
 * /api/attendance/student/{enrollmentId}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get student attendance history
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
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
 */
router.get("/teacher/:teacherId", requirePermission("ACADEMIC:VIEW"), getTeacherAttendance);

export default router;
