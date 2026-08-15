import { Router } from "express";
import { 
    createClassPeriod, 
    getClassPeriods,
    assignTimetable,
    getTimetableForSection,
    getTimetableForTeacher
} from "./timetable.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Scope all timetable operations to SCHOOL
router.use(requireScope("SCHOOL"));

/**
 * @openapi
 * /api/timetable/periods:
 *   post:
 *     tags: [Timetable]
 *     summary: Create a class period for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/periods", requirePermission("ACADEMIC:CREATE"), createClassPeriod);

/**
 * @openapi
 * /api/timetable/periods:
 *   get:
 *     tags: [Timetable]
 *     summary: Get all class periods for the school
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/periods", requirePermission("ACADEMIC:VIEW"), getClassPeriods);

/**
 * @openapi
 * /api/timetable:
 *   post:
 *     tags: [Timetable]
 *     summary: Assign a teaching assignment to a specific period and day
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.post("/", requirePermission("ACADEMIC:CREATE"), assignTimetable);

/**
 * @openapi
 * /api/timetable/section/{sectionId}:
 *   get:
 *     tags: [Timetable]
 *     summary: Get the weekly timetable for a specific section
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/section/:sectionId", requirePermission("ACADEMIC:VIEW"), getTimetableForSection);

/**
 * @openapi
 * /api/timetable/teacher/{teacherId}:
 *   get:
 *     tags: [Timetable]
 *     summary: Get the weekly timetable for a specific teacher
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
router.get("/teacher/:teacherId", requirePermission("ACADEMIC:VIEW"), getTimetableForTeacher);

export default router;
