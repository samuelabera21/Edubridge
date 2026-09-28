import { Router } from "express";
import { requireAuth, requireHierarchicalScope } from "../authentication/authorization.middleware.js";
import { getGovernanceDashboardHandler } from "./governance.controller.js";

const router = Router();

// Governance routes require authentication and hierarchical scope validation
router.use(requireAuth());
router.use(requireHierarchicalScope("targetOrgId"));

// Unified Governance Dashboard endpoint (supports optional ?targetOrgId=... for drill-down)
router.get("/dashboard", getGovernanceDashboardHandler);

export default router;
