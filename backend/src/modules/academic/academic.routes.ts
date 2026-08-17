import { Router } from "express";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";
import { 
    getAcademicYears,
    getAcademicYearById,
    createAcademicYear, 
    updateAcademicYear,
    activateAcademicYear,
    copyStructureFromPreviousYear,
    createAcademicCalendar,
    createAcademicPeriod,
    getGrades, 
    createGrade,
    getSchoolGrades, 
    createSchoolGrade,
    getSchoolGradeDetails,
    getSections, 
    createSection,
    getSubjects,
    createSubject,
    createSchoolSubject
} from "./academic.controller.js";

const router = Router();

router.use(requireScope("SCHOOL"));

// --- Academic Years ---
/**
 * @openapi
 * /api/academic/years:
 *   get:
 *     tags: [Academic]
 *     summary: Get all academic years
 */
router.get("/years", requirePermission("ACADEMIC:VIEW"), getAcademicYears);

/**
 * @openapi
 * /api/academic/years:
 *   post:
 *     tags: [Academic]
 *     summary: Create an academic year
 */
router.post("/years", requirePermission("ACADEMIC:CREATE"), createAcademicYear);

/**
 * @openapi
 * /api/academic/years/{yearId}:
 *   get:
 *     tags: [Academic]
 *     summary: Get a specific academic year with stats
 *   put:
 *     tags: [Academic]
 *     summary: Update an academic year
 */
router.get("/years/:yearId", requirePermission("ACADEMIC:VIEW"), getAcademicYearById);
router.put("/years/:yearId", requirePermission("ACADEMIC:UPDATE"), updateAcademicYear);

/**
 * @openapi
 * /api/academic/years/{yearId}/activate:
 *   put:
 *     tags: [Academic]
 *     summary: Activate an academic year
 */
router.put("/years/:yearId/activate", requirePermission("ACADEMIC:UPDATE"), activateAcademicYear);

/**
 * @openapi
 * /api/academic/years/{yearId}/copy-structure:
 *   post:
 *     tags: [Academic]
 *     summary: Copy grades and sections from a previous year
 */
router.post("/years/:yearId/copy-structure", requirePermission("ACADEMIC:CREATE"), copyStructureFromPreviousYear);

// --- Academic Calendars & Periods ---
/**
 * @openapi
 * /api/academic/years/{yearId}/calendar:
 *   post:
 *     tags: [Academic]
 *     summary: Create an academic calendar
 */
router.post("/years/:yearId/calendar", requirePermission("ACADEMIC:CREATE"), createAcademicCalendar);

/**
 * @openapi
 * /api/academic/calendars/{calendarId}/periods:
 *   post:
 *     tags: [Academic]
 *     summary: Create an academic period
 */
router.post("/calendars/:calendarId/periods", requirePermission("ACADEMIC:CREATE"), createAcademicPeriod);

// --- Grades & Sections ---
/**
 * @openapi
 * /api/academic/grades:
 *   get:
 *     tags: [Academic]
 *     summary: Get all grades
 */
router.get("/grades", requirePermission("ACADEMIC:VIEW"), getGrades);

/**
 * @openapi
 * /api/academic/grades:
 *   post:
 *     tags: [Academic]
 *     summary: Create a grade
 */
router.post("/grades", requirePermission("ACADEMIC:CREATE"), createGrade);

/**
 * @openapi
 * /api/academic/years/{yearId}/grades:
 *   get:
 *     tags: [Academic]
 *     summary: Get school grades for an academic year
 */
router.get("/years/:yearId/grades", requirePermission("ACADEMIC:VIEW"), getSchoolGrades);

/**
 * @openapi
 * /api/academic/years/{yearId}/grades:
 *   post:
 *     tags: [Academic]
 *     summary: Assign a grade to an academic year
 */
router.post("/years/:yearId/grades", requirePermission("ACADEMIC:CREATE"), createSchoolGrade);

/**
 * @openapi
 * /api/academic/grades/{schoolGradeId}/details:
 *   get:
 *     tags: [Academic]
 *     summary: Get details of a school grade including sections and enrollments
 */
router.get("/grades/:schoolGradeId/details", requirePermission("ACADEMIC:VIEW"), getSchoolGradeDetails);

/**
 * @openapi
 * /api/academic/grades/{schoolGradeId}/sections:
 *   get:
 *     tags: [Academic]
 *     summary: Get sections for a school grade
 */
router.get("/grades/:schoolGradeId/sections", requirePermission("ACADEMIC:VIEW"), getSections);

/**
 * @openapi
 * /api/academic/grades/{schoolGradeId}/sections:
 *   post:
 *     tags: [Academic]
 *     summary: Create a section
 */
router.post("/grades/:schoolGradeId/sections", requirePermission("ACADEMIC:CREATE"), createSection);

// --- Subjects ---
/**
 * @openapi
 * /api/academic/subjects:
 *   get:
 *     tags: [Academic]
 *     summary: Get all subjects
 */
router.get("/subjects", requirePermission("ACADEMIC:VIEW"), getSubjects);

/**
 * @openapi
 * /api/academic/subjects:
 *   post:
 *     tags: [Academic]
 *     summary: Create a subject
 */
router.post("/subjects", requirePermission("ACADEMIC:CREATE"), createSubject);

/**
 * @openapi
 * /api/academic/years/{yearId}/subjects:
 *   post:
 *     tags: [Academic]
 *     summary: Assign a subject to an academic year
 */
router.post("/years/:yearId/subjects", requirePermission("ACADEMIC:CREATE"), createSchoolSubject);

export default router;
