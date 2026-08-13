import { Router } from "express";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";
import { 
    getAcademicYears, 
    createAcademicYear, 
    getGrades, 
    getSchoolGrades, 
    getSections, 
    getSubjects 
} from "./academic.controller.js";

const router = Router();

// All academic routes require the SCHOOL scope
router.use(requireScope("SCHOOL"));

// --- Academic Years ---
router.get("/years", requirePermission("ACADEMIC:VIEW"), getAcademicYears);
router.post("/years", requirePermission("ACADEMIC:CREATE"), createAcademicYear);

// --- Grades & Sections ---
router.get("/grades", requirePermission("ACADEMIC:VIEW"), getGrades);
router.get("/years/:yearId/grades", requirePermission("ACADEMIC:VIEW"), getSchoolGrades);
router.get("/years/:yearId/grades/:schoolGradeId/sections", requirePermission("ACADEMIC:VIEW"), getSections);

// --- Subjects ---
router.get("/subjects", requirePermission("ACADEMIC:VIEW"), getSubjects);

export default router;
