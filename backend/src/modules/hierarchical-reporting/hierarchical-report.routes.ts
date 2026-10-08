import { Router } from "express";
import { requireAuth } from "../authentication/authorization.middleware.js";
import {
    getReportingScopeHandler,
    getEducationSummaryReportHandler,
    exportEducationSummaryHandler
} from "./hierarchical-report.controller.js";

const router = Router();

// All hierarchical reporting endpoints enforce authenticated user session
router.use(requireAuth());

// Reporting Endpoints
router.get("/scope", getReportingScopeHandler);
router.get("/education-summary", getEducationSummaryReportHandler);
router.get("/education-summary/export", exportEducationSummaryHandler);

export default router;
