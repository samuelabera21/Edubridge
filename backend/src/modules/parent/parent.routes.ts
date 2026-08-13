import { Router } from "express";
import { getParentProfile } from "./parent.controller.js";
import { requireScope } from "../authentication/authorization.middleware.js";

const router = Router();

// Parent self-service profile
router.get("/me", requireScope("SCHOOL"), getParentProfile);

export default router;
