import { Router } from "express";
import { requireAuth } from "../authentication/authorization.middleware.js";
import {
    getHierarchyTreeHandler,
    getOrganizationUnitHandler,
    getChildrenHandler,
    getAncestorsHandler,
    getLineageHandler,
    getAccessibleScopeHandler,
    getDescendantSchoolsHandler,
    getFederalOverviewHandler,
    getHierarchyDrilldownHandler,
    getRegionOverviewHandler,
    getZoneOverviewHandler,
    getWoredaOverviewHandler,
    assignRegionalAdminHandler,
    resendRegionalAdminInvitationHandler,
    cancelRegionalAdminInvitationHandler,
    assignZoneAdminHandler,
    resendZoneAdminInvitationHandler,
    cancelZoneAdminInvitationHandler,
    assignWoredaAdminHandler,
    resendWoredaAdminInvitationHandler,
    cancelWoredaAdminInvitationHandler,
    assignSchoolAdminHandler,
    resendSchoolAdminInvitationHandler,
    cancelSchoolAdminInvitationHandler,
    createOrganizationUnitHandler,
    registerSchoolHandler,
    updateOrganizationUnitHandler,
    deleteOrganizationUnitHandler,
    placeSchoolHandler
} from "./hierarchy.controller.js";

const router = Router();

// All hierarchy routes require authenticated session
router.use(requireAuth());

// Read operations (place fixed paths before /:id)
router.get("/federal/overview", getFederalOverviewHandler);
router.get("/region/overview", getRegionOverviewHandler);
router.get("/regions/:regionId/overview", getRegionOverviewHandler);
router.get("/zone/overview", getZoneOverviewHandler);
router.get("/zones/:zoneId/overview", getZoneOverviewHandler);
router.get("/woreda/overview", getWoredaOverviewHandler);
router.get("/woredas/:woredaId/overview", getWoredaOverviewHandler);
router.get("/drilldown", getHierarchyDrilldownHandler);
router.get("/drilldown/:unitId", getHierarchyDrilldownHandler);
router.get("/tree", getHierarchyTreeHandler);
router.get("/scope", getAccessibleScopeHandler);
router.get("/:id", getOrganizationUnitHandler);
router.get("/:id/children", getChildrenHandler);
router.get("/:id/ancestors", getAncestorsHandler);
router.get("/:id/lineage", getLineageHandler);
router.get("/:id/descendant-schools", getDescendantSchoolsHandler);

// Mutation operations - Region Admin Management
router.post("/regions/:regionId/assign-admin", assignRegionalAdminHandler);
router.post("/regions/:regionId/resend-invitation", resendRegionalAdminInvitationHandler);
router.delete("/regions/:regionId/cancel-invitation", cancelRegionalAdminInvitationHandler);

// Mutation operations - Zone Admin Management
router.post("/zones/:zoneId/assign-admin", assignZoneAdminHandler);
router.post("/zones/:zoneId/resend-invitation", resendZoneAdminInvitationHandler);
router.delete("/zones/:zoneId/cancel-invitation", cancelZoneAdminInvitationHandler);

// Mutation operations - Woreda Admin Management
router.post("/woredas/:woredaId/assign-admin", assignWoredaAdminHandler);
router.post("/woredas/:woredaId/resend-invitation", resendWoredaAdminInvitationHandler);
router.delete("/woredas/:woredaId/cancel-invitation", cancelWoredaAdminInvitationHandler);

// Mutation operations - School Admin Management
router.post("/schools/:schoolId/assign-admin", assignSchoolAdminHandler);
router.post("/schools/:schoolId/resend-invitation", resendSchoolAdminInvitationHandler);
router.delete("/schools/:schoolId/cancel-invitation", cancelSchoolAdminInvitationHandler);

// Organization Unit CRUD & Placement
router.post("/schools/register", registerSchoolHandler);
router.post("/register-school", registerSchoolHandler);
router.post("/", createOrganizationUnitHandler);
router.patch("/schools/:schoolId/placement", placeSchoolHandler);
router.patch("/:id", updateOrganizationUnitHandler);
router.delete("/:id", deleteOrganizationUnitHandler);

export default router;
