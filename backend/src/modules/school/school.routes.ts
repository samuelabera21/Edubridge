import { Router } from "express";
import { requirePermission, requireScope } from "../authentication/authorization.middleware.js";
import { getProfileHandler, updateProfileHandler } from "./school.controller.js";

const router = Router();

// Apply middleware to all routes in this router
router.use(requireScope("SCHOOL"));

router.get(
    "/profile",
    requirePermission("SCHOOL:VIEW"),
    getProfileHandler
);

router.put(
    "/profile",
    requirePermission("SCHOOL:UPDATE"),
    updateProfileHandler
);

export default router;
