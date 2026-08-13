import { Router } from "express";
import { createStudent, enrollStudent, getEnrollments, getStudentProfile } from "./student.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Student Identity Management
// Creating a student might be an action scoped to the platform or authorized school users
router.post("/", requirePermission("ACADEMIC:CREATE"), createStudent);

// Enrollment Management - explicitly scoped to SCHOOL context
router.post("/enrollments", requireScope("SCHOOL"), requirePermission("ACADEMIC:CREATE"), enrollStudent);
router.get("/enrollments", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getEnrollments);

// Student self-service profile
router.get("/me", requireScope("SCHOOL"), getStudentProfile);

export default router;
