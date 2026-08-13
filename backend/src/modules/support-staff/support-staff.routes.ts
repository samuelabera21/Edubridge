import { Router } from "express";
import { requireScope } from "../authentication/authorization.middleware.js";
import { getSupportStaffProfile } from "./support-staff.controller.js";

const router = Router();

// Apply middleware to all routes in this router
router.use(requireScope("SCHOOL"));

router.get("/me", getSupportStaffProfile);

export default router;
