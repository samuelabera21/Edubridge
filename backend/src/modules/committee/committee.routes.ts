import { Router } from "express";
import { requireScope } from "../authentication/authorization.middleware.js";
import { getCommitteeProfile } from "./committee.controller.js";

const router = Router();

// Apply middleware to all routes in this router
router.use(requireScope("SCHOOL"));

router.get("/me", getCommitteeProfile);

export default router;
