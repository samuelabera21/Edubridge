import { Router } from "express";
import { 
    getSettings,
    setSetting,
    getAuditLogs,
    exportSchoolData
} from "./school-settings.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();
router.use(requireScope("SCHOOL"));

// School Settings Endpoints
router.get("/settings", requirePermission("SCHOOL:VIEW"), getSettings);
router.post("/settings", requirePermission("SCHOOL:UPDATE"), setSetting);

// Audit Activity Logs Endpoint
router.get("/audit-logs", requirePermission("SCHOOL:VIEW"), getAuditLogs);

// Institutional Data Export & Backup Endpoint
router.get("/export-data", requirePermission("SCHOOL:VIEW"), exportSchoolData);

export default router;
