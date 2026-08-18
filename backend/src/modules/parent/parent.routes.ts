import { Router } from "express";
import { 
    getParentProfile, 
    getParents,
    createParent, 
    linkParentToStudent, 
    unlinkParentFromStudent,
    getStudentParents 
} from "./parent.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Scope all parent operations to SCHOOL
router.use(requireScope("SCHOOL"));

// Parent self-service profile
router.get("/me", getParentProfile);

// Admin Parent Management & Linking APIs (use ACADEMIC permissions consistent with student/teacher modules)
router.get("/", requirePermission("ACADEMIC:VIEW"), getParents);
router.post("/", requirePermission("ACADEMIC:CREATE"), createParent);
router.post("/link", requirePermission("ACADEMIC:CREATE"), linkParentToStudent);
router.delete("/:parentId/link-student/:studentId", requirePermission("ACADEMIC:DELETE"), unlinkParentFromStudent);
router.get("/student/:studentId", requirePermission("ACADEMIC:VIEW"), getStudentParents);

export default router;
