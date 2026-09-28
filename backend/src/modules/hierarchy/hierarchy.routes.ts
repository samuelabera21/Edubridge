import { Router } from "express";
import { requireAuth } from "../authentication/authorization.middleware.js";
import {
    getHierarchyTreeHandler,
    getOrganizationUnitHandler,
    getChildrenHandler,
    getAncestorsHandler,
    createOrganizationUnitHandler,
    updateOrganizationUnitHandler,
    deleteOrganizationUnitHandler
} from "./hierarchy.controller.js";

const router = Router();

// All hierarchy routes require authenticated session
router.use(requireAuth());

// Read operations
router.get("/tree", getHierarchyTreeHandler);
router.get("/:id", getOrganizationUnitHandler);
router.get("/:id/children", getChildrenHandler);
router.get("/:id/ancestors", getAncestorsHandler);

// Mutation operations
router.post("/", createOrganizationUnitHandler);
router.patch("/:id", updateOrganizationUnitHandler);
router.delete("/:id", deleteOrganizationUnitHandler);

export default router;
