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
    getAcademicOrganizationYears,
    getAcademicOrganizationGrades,
    getAcademicOrganizationSections,
    getAcademicOrganizationTeachers,
    getAcademicOrganizationTeacherAssignments,
    getAcademicOrganizationTeachingActivity,
    getAcademicOrganizationObservations,
    scheduleClassroomObservation,
    completeClassroomObservation,
    getAcademicAnomaliesStaffing,
    getAcademicAnomaliesWorkload,
    getAcademicAnomaliesTimetable,
    getSchoolSubjects,
    getSectionStaffingView,
    getAcademicCalendar,
    getTimetableView,
    getAcademicOrganizationRooms,
    createAcademicOrganizationRoom,
    updateAcademicOrganizationRoom,
    deleteAcademicOrganizationRoom
} from "./vice-principal.controller.js";

const router = Router();

// Apply middleware to all routes in this router
router.use(requireScope("SCHOOL"));

/**
 * @openapi
 * /api/vice-principal/me:
 *   get:
 *     tags: [Vice Principal]
 *     summary: Get Academic Leader Dashboard Overview
 *     description: Returns aggregated real-time data for the Academic Leader dashboard, including teaching status, attendance, and curriculum progress.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/me", getVicePrincipalProfile);
router.get("/attendance", getAttendanceDashboard);
router.get("/assessments", getAssessmentDashboard);
router.get("/support/students", getStudentSupportDashboard);
router.get("/support/teachers", getTeacherSupportDashboard);
router.get("/communication", getCommunicationDashboard);
router.get("/ai-insights", getAiInsightsDashboard);

// Step 2: Academic Organization endpoints
router.get("/academic/years", getAcademicOrganizationYears);
router.get("/academic/years/:yearId/grades", getAcademicOrganizationGrades);
router.get("/academic/grades/:schoolGradeId/sections", getAcademicOrganizationSections);
router.get("/academic/sections/:sectionId/staffing", getSectionStaffingView);
router.get("/organization/subjects", getSchoolSubjects);
router.get("/organization/calendar", getAcademicCalendar);
router.get("/organization/timetable", getTimetableView);

// Academic Rooms Management (Bypasses Operational:View constraints for Academic Leaders)
router.get("/academic/rooms", getAcademicOrganizationRooms);
router.post("/academic/rooms", createAcademicOrganizationRoom);
router.put("/academic/rooms/:roomId", updateAcademicOrganizationRoom);
router.delete("/academic/rooms/:roomId", deleteAcademicOrganizationRoom);
router.get("/organization/anomalies/staffing", getAcademicAnomaliesStaffing);
router.get("/organization/anomalies/workload", getAcademicAnomaliesWorkload);
router.get("/organization/anomalies/timetable", getAcademicAnomaliesTimetable);

// Step 3: Teacher Academic Management
/**
 * @openapi
 * /api/vice-principal/teachers:
 *   get:
 *     tags: [Vice Principal]
 *     summary: Get all teachers for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/teachers", getAcademicOrganizationTeachers);

/**
 * @openapi
 * /api/vice-principal/teachers/assignments:
 *   get:
 *     tags: [Vice Principal]
 *     summary: Get all teacher assignments for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/teachers/assignments", getAcademicOrganizationTeacherAssignments);

/**
 * @openapi
 * /api/vice-principal/teaching/today:
 *   get:
 *     tags: [Vice Principal]
 *     summary: Get today's teaching activity and lesson continuity
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/teaching/today", getAcademicOrganizationTeachingActivity);

/**
 * @openapi
 * /api/vice-principal/observations:
 *   get:
 *     tags: [Vice Principal]
 *     summary: List classroom observations
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *   post:
 *     tags: [Vice Principal]
 *     summary: Schedule a new classroom observation
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/observations", getAcademicOrganizationObservations);
router.post("/observations", scheduleClassroomObservation);

/**
 * @openapi
 * /api/vice-principal/observations/{id}:
 *   put:
 *     tags: [Vice Principal]
 *     summary: Complete a classroom observation with feedback
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.put("/observations/:id", completeClassroomObservation);

export default router;
