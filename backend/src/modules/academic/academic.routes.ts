import { Router } from "express";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";
import { 
    getAcademicYears,
    getAcademicYearById,
    createAcademicYear, 
    updateAcademicYear,
    activateAcademicYear,
    copyStructureFromPreviousYear,
    getAcademicCalendar,
    createAcademicCalendar,
    publishCalendar,
    unpublishCalendar,
    getAcademicPeriods,
    createAcademicPeriod,
    updateAcademicPeriod,
    deleteAcademicPeriod,
    getCalendarEvents,
    getCalendarEventById,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    getSuggestedHolidays,
    confirmSuggestedHoliday,
    getGrades, 
    createGrade,
    getSchoolGrades, 
    createSchoolGrade,
    deleteSchoolGrade,
    getSchoolGradeDetails,
    getSections, 
    createSection,
    updateSection,
    deleteSection,
    getSubjects,
    createSubject,
    getSchoolSubjects,
    createSchoolSubject,
    deleteSchoolSubject,
    getSchoolGradeSubjects,
    assignSubjectToGrade,
    removeSubjectFromGrade
} from "./academic.controller.js";

const router = Router();

router.use(requireScope("SCHOOL"));

// --- Academic Years ---
router.get("/years", requirePermission("ACADEMIC:VIEW"), getAcademicYears);
router.post("/years", requirePermission("ACADEMIC:CREATE"), createAcademicYear);
router.get("/years/:yearId", requirePermission("ACADEMIC:VIEW"), getAcademicYearById);
router.put("/years/:yearId", requirePermission("ACADEMIC:UPDATE"), updateAcademicYear);
router.put("/years/:yearId/activate", requirePermission("ACADEMIC:UPDATE"), activateAcademicYear);
router.post("/years/:yearId/copy-structure", requirePermission("ACADEMIC:CREATE"), copyStructureFromPreviousYear);

// --- Academic Calendars & Periods ---
router.get("/years/:yearId/calendar", requirePermission("ACADEMIC:VIEW"), getAcademicCalendar);
router.post("/years/:yearId/calendar", requirePermission("ACADEMIC:CREATE"), createAcademicCalendar);
router.post("/calendars/:calendarId/publish", requirePermission("ACADEMIC:MANAGE"), publishCalendar);
router.post("/calendars/:calendarId/unpublish", requirePermission("ACADEMIC:MANAGE"), unpublishCalendar);

router.get("/calendars/:calendarId/periods", requirePermission("ACADEMIC:VIEW"), getAcademicPeriods);
router.post("/calendars/:calendarId/periods", requirePermission("ACADEMIC:CREATE"), createAcademicPeriod);
router.put("/calendars/periods/:periodId", requirePermission("ACADEMIC:UPDATE"), updateAcademicPeriod);
router.delete("/calendars/periods/:periodId", requirePermission("ACADEMIC:MANAGE"), deleteAcademicPeriod);

// --- Calendar Events & Ethiopian Holidays (Step 2.1) ---
router.get("/calendars/:calendarId/events", requirePermission("ACADEMIC:VIEW"), getCalendarEvents);
router.post("/calendars/:calendarId/events", requirePermission("ACADEMIC:CREATE"), createCalendarEvent);
router.get("/calendars/events/:eventId", requirePermission("ACADEMIC:VIEW"), getCalendarEventById);
router.put("/calendars/events/:eventId", requirePermission("ACADEMIC:UPDATE"), updateCalendarEvent);
router.delete("/calendars/events/:eventId", requirePermission("ACADEMIC:MANAGE"), deleteCalendarEvent);

router.get("/years/:yearId/suggested-holidays", requirePermission("ACADEMIC:VIEW"), getSuggestedHolidays);
router.post("/calendars/:calendarId/confirm-holiday", requirePermission("ACADEMIC:CREATE"), confirmSuggestedHoliday);

// --- Grades & Sections ---
router.get("/grades", requirePermission("ACADEMIC:VIEW"), getGrades);
router.post("/grades", requirePermission("ACADEMIC:CREATE"), createGrade);
router.get("/years/:yearId/grades", requirePermission("ACADEMIC:VIEW"), getSchoolGrades);
router.post("/years/:yearId/grades", requirePermission("ACADEMIC:CREATE"), createSchoolGrade);
router.delete("/grades/school-grades/:schoolGradeId", requirePermission("ACADEMIC:MANAGE"), deleteSchoolGrade);
router.get("/grades/:schoolGradeId/details", requirePermission("ACADEMIC:VIEW"), getSchoolGradeDetails);

router.get("/grades/:schoolGradeId/sections", requirePermission("ACADEMIC:VIEW"), getSections);
router.post("/grades/:schoolGradeId/sections", requirePermission("ACADEMIC:CREATE"), createSection);
router.put("/sections/:sectionId", requirePermission("ACADEMIC:UPDATE"), updateSection);
router.delete("/sections/:sectionId", requirePermission("ACADEMIC:MANAGE"), deleteSection);

// --- Subjects & Grade-Specific Curriculum ---
router.get("/subjects", requirePermission("ACADEMIC:VIEW"), getSubjects);
router.post("/subjects", requirePermission("ACADEMIC:CREATE"), createSubject);
router.get("/years/:yearId/subjects", requirePermission("ACADEMIC:VIEW"), getSchoolSubjects);
router.post("/years/:yearId/subjects", requirePermission("ACADEMIC:CREATE"), createSchoolSubject);
router.delete("/years/:yearId/subjects/:subjectId", requirePermission("ACADEMIC:MANAGE"), deleteSchoolSubject);

router.get("/grades/school-grades/:schoolGradeId/subjects", requirePermission("ACADEMIC:VIEW"), getSchoolGradeSubjects);
router.post("/grades/school-grades/:schoolGradeId/subjects", requirePermission("ACADEMIC:CREATE"), assignSubjectToGrade);
router.delete("/grades/school-grades/:schoolGradeId/subjects/:subjectId", requirePermission("ACADEMIC:MANAGE"), removeSubjectFromGrade);

export default router;
