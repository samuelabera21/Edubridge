import { Router } from "express";
import {
    downloadTemplate,
    previewImport,
    saveDraft,
    submitBatch,
    getSubmission,
    listAdminSubmissions,
    reviewSubmission
} from "./grade-submission.controller.js";
import { requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Ensure all grade submission routes are scoped to SCHOOL
router.use(requireScope("SCHOOL"));

// Teacher Grade Submission Flow
router.get("/template", downloadTemplate);
router.post("/import-preview", previewImport);
router.post("/save-draft", saveDraft);
router.post("/submit/:batchId", submitBatch);
router.get("/submission/:assignmentId", getSubmission);

// School Admin Review Flow
router.get("/admin/submissions", listAdminSubmissions);
router.post("/admin/submissions/:batchId/review", reviewSubmission);

export default router;
