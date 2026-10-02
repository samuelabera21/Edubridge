import { Router } from "express";
import { requireAuth, requireHierarchicalScope } from "../authentication/authorization.middleware.js";
import { 
    getFederalDashboardHandler,
    getRegionDashboardHandler,
    getZoneDashboardHandler,
    getWoredaDashboardHandler,
    getGovernanceDashboardHandler
} from "./governance.controller.js";

const router = Router();

// Governance routes require authentication and hierarchical scope validation
router.use(requireAuth());
router.use(requireHierarchicalScope("targetOrgId"));

// Tier-specific Administrative Hierarchy Dashboard endpoints
router.get("/federal/dashboard", getFederalDashboardHandler);
router.get("/region/dashboard", getRegionDashboardHandler);
router.get("/zone/dashboard", getZoneDashboardHandler);
router.get("/woreda/dashboard", getWoredaDashboardHandler);

// Generic fallback endpoint (supports optional ?targetOrgId=... for drill-down)
router.get("/dashboard", getGovernanceDashboardHandler);

export default router;

