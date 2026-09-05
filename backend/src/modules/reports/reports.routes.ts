import { Router } from "express";
import { 
    getReports,
    createReport,
    getEnrollmentReport,
    getAttendanceReport,
    getTeacherReport,
    getAssessmentReport,
    getPerformanceReport,
    getCurriculumReport,
    getSupportReport,
    getSchoolPerformanceScorecard
} from "./reports.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();
router.use(requireScope("SCHOOL"));

// Generic Reports CRUD
router.get("/history", requirePermission("ACADEMIC:VIEW"), getReports);
router.post("/generate", requirePermission("ACADEMIC:CREATE"), createReport);

// 1. Enrollment Reports
router.get("/enrollment", requirePermission("ACADEMIC:VIEW"), getEnrollmentReport);

// 2. Attendance Reports
router.get("/attendance", requirePermission("ACADEMIC:VIEW"), getAttendanceReport);

// 3. Teacher Reports
router.get("/teacher", requirePermission("ACADEMIC:VIEW"), getTeacherReport);

// 4. Assessment Reports
router.get("/assessment", requirePermission("ACADEMIC:VIEW"), getAssessmentReport);

// 5. Student Performance Reports
router.get("/performance", requirePermission("ACADEMIC:VIEW"), getPerformanceReport);

// 6. Curriculum Progress Reports
router.get("/curriculum", requirePermission("ACADEMIC:VIEW"), getCurriculumReport);

// 7. Student Support Reports
router.get("/support", requirePermission("ACADEMIC:VIEW"), getSupportReport);

// 8. School Performance Reports
router.get("/school-performance", requirePermission("ACADEMIC:VIEW"), getSchoolPerformanceScorecard);

export default router;
