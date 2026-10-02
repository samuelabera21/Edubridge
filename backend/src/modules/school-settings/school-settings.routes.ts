import { Router } from "express";
import { 
    getSettings,
    updateSettings,
    getAuditLogs
} from "./school-settings.controller.js";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";

const router = Router();
router.use(requireScope("SCHOOL"));

// School Operational Settings Endpoints
router.get("/settings", requirePermission("SCHOOL:VIEW"), getSettings);
router.patch("/settings", requirePermission("SCHOOL:UPDATE"), updateSettings);
router.post("/settings", requirePermission("SCHOOL:UPDATE"), updateSettings);

// Audit Activity Logs Endpoint
router.get("/audit-logs", requirePermission("SCHOOL:VIEW"), getAuditLogs);

export default router;
