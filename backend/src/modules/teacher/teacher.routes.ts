import { Router } from "express";
import { createTeacher, assignTeacher, getAssignments, getTeacherProfile } from "./teacher.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Teacher Identity Management - explicitly scoped to SCHOOL context (as they belong to the organization)
router.post("/", requireScope("SCHOOL"), requirePermission("ACADEMIC:CREATE"), createTeacher);

// Teaching Assignment Management - explicitly scoped to SCHOOL context
router.post("/assignments", requireScope("SCHOOL"), requirePermission("ACADEMIC:CREATE"), assignTeacher);
router.get("/assignments", requireScope("SCHOOL"), requirePermission("ACADEMIC:VIEW"), getAssignments);

// Teacher self-service profile
router.get("/me", requireScope("SCHOOL"), getTeacherProfile);

export default router;
