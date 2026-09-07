import { Router } from "express";
import { 
    recordStudentAttendance, 
    recordBulkStudentAttendance,
    getSectionAttendance,
    getStudentAttendance,
    recordTeacherAttendance,
    recordBulkTeacherAttendance,
    getTeacherAttendance,
    getDailyTeacherAttendance,
    // School Administrator Oversight Controllers
    getExecutiveOverview,
    getSchoolStudentAttendance,
    getStudentAttendanceDetail,
    getSchoolTeacherAttendance,
    getTeacherAttendanceDetail,
    getAbsenceRiskAlerts,
    getCorrections,
    createCorrectionRequest,
    approveCorrection,
    rejectCorrection
} from "./attendance.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

router.use(requireScope("SCHOOL"));

// ============================================================
// OPERATIONAL ATTENDANCE ROUTES (Teachers & General Staff)
// ============================================================

router.post("/student", requirePermission("ATTENDANCE:RECORD"), recordStudentAttendance);
router.post("/student/bulk", requirePermission("ATTENDANCE:RECORD"), recordBulkStudentAttendance);
router.get("/student/section/:sectionId", requirePermission("ATTENDANCE:VIEW"), getSectionAttendance);
router.get("/student/:enrollmentId", requirePermission("ATTENDANCE:VIEW"), getStudentAttendance);

router.post("/teacher", requirePermission("ATTENDANCE:RECORD"), recordTeacherAttendance);
router.post("/teacher/bulk", requirePermission("ATTENDANCE:RECORD"), recordBulkTeacherAttendance);
router.get("/teacher/daily", requirePermission("ATTENDANCE:VIEW"), getDailyTeacherAttendance);
router.get("/teacher/:teacherId", requirePermission("ATTENDANCE:VIEW"), getTeacherAttendance);

// ============================================================
// SCHOOL ADMINISTRATOR / PRINCIPAL OVERSIGHT ROUTES
// ============================================================

// 1. Executive Overview & Daily Trends
router.get("/admin/overview", requirePermission("ATTENDANCE:VIEW"), getExecutiveOverview);

// 2. School-wide Student Attendance Investigation & Individual Detail
router.get("/admin/students", requirePermission("ATTENDANCE:VIEW"), getSchoolStudentAttendance);
router.get("/admin/students/:enrollmentId", requirePermission("ATTENDANCE:VIEW"), getStudentAttendanceDetail);

// 3. School-wide Teacher Attendance Oversight & Individual Detail
router.get("/admin/teachers", requirePermission("ATTENDANCE:VIEW"), getSchoolTeacherAttendance);
router.get("/admin/teachers/:teacherId", requirePermission("ATTENDANCE:VIEW"), getTeacherAttendanceDetail);

// 4. Automated Absence Risk Alerts
router.get("/admin/alerts", requirePermission("ATTENDANCE:VIEW"), getAbsenceRiskAlerts);

// 5. Official Attendance Corrections Workflow
router.get("/admin/corrections", requirePermission("ATTENDANCE:VIEW"), getCorrections);
router.post("/admin/corrections", requirePermission("ATTENDANCE:RECORD"), createCorrectionRequest);
router.post("/admin/corrections/:id/approve", requirePermission("ATTENDANCE:RECORD"), approveCorrection);
router.post("/admin/corrections/:id/reject", requirePermission("ATTENDANCE:RECORD"), rejectCorrection);

export default router;
