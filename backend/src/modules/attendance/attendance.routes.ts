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

router.post("/student", requirePermission("ACADEMIC:CREATE"), recordStudentAttendance);
router.post("/student/bulk", requirePermission("ACADEMIC:CREATE"), recordBulkStudentAttendance);
router.get("/student/section/:sectionId", requirePermission("ACADEMIC:VIEW"), getSectionAttendance);
router.get("/student/:enrollmentId", requirePermission("ACADEMIC:VIEW"), getStudentAttendance);

router.post("/teacher", requirePermission("ACADEMIC:CREATE"), recordTeacherAttendance);
router.post("/teacher/bulk", requirePermission("ACADEMIC:CREATE"), recordBulkTeacherAttendance);
router.get("/teacher/daily", requirePermission("ACADEMIC:VIEW"), getDailyTeacherAttendance);
router.get("/teacher/:teacherId", requirePermission("ACADEMIC:VIEW"), getTeacherAttendance);

export default router;
