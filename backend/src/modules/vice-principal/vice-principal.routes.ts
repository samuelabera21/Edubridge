import { Router } from "express";
import { requireScope } from "../authentication/authorization.middleware.js";
import { 
    getVicePrincipalProfile,
    getAttendanceDashboard,
    getAssessmentDashboard,
    getStudentSupportDashboard,
    getTeacherSupportDashboard,
    getCommunicationDashboard,
    getAiInsightsDashboard,
    getAcademicOrganizationGrades,
    getAcademicOrganizationSections
} from "./vice-principal.controller.js";

const router = Router();

// Apply middleware to all routes in this router
router.use(requireScope("SCHOOL"));

router.get("/me", getVicePrincipalProfile);
router.get("/attendance", getAttendanceDashboard);
router.get("/assessments", getAssessmentDashboard);
router.get("/support/students", getStudentSupportDashboard);
router.get("/support/teachers", getTeacherSupportDashboard);
router.get("/communication", getCommunicationDashboard);
router.get("/ai-insights", getAiInsightsDashboard);

// Step 2: Academic Organization endpoints
router.get("/academic/years/:yearId/grades", getAcademicOrganizationGrades);
router.get("/academic/grades/:schoolGradeId/sections", getAcademicOrganizationSections);

export default router;
