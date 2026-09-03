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
router.get("/settings", requirePermission("ACADEMIC:VIEW"), getSettings);
router.post("/settings", requirePermission("ACADEMIC:CREATE"), setSetting);

// Audit Activity Logs Endpoint
router.get("/audit-logs", requirePermission("ACADEMIC:VIEW"), getAuditLogs);

// Institutional Data Export & Backup Endpoint
router.get("/export-data", requirePermission("ACADEMIC:VIEW"), exportSchoolData);

export default router;
