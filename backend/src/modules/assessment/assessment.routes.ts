import { Router } from "express";
import { 
    createAssessment, 
    getAssessments,
    getAssessmentWithResults,
    recordResult,
    recordBulkResults,
    getStudentResults,
    getStudentReportCard
} from "./assessment.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

router.use(requireScope("SCHOOL"));

router.post("/", requirePermission("ACADEMIC:CREATE"), createAssessment);
router.get("/", requirePermission("ACADEMIC:VIEW"), getAssessments);
router.get("/:id/results", requirePermission("ACADEMIC:VIEW"), getAssessmentWithResults);

router.post("/result", requirePermission("ACADEMIC:CREATE"), recordResult);
router.post("/results/bulk", requirePermission("ACADEMIC:CREATE"), recordBulkResults);

router.get("/student/:enrollmentId", requirePermission("ACADEMIC:VIEW"), getStudentResults);
router.get("/student/:enrollmentId/report-card", requirePermission("ACADEMIC:VIEW"), getStudentReportCard);

export default router;
