import { Router } from "express";
import { requireAuth } from "../authentication/authorization.middleware.js";
import {
    createProgramHandler,
    getProgramsHandler,
    getProgramByIdHandler,
    acknowledgeProgramHandler,
    updateImplementationStatusHandler,
    cascadeImplementationHandler,
    updateProgramStatusHandler,
    getRecipientsTreeHandler
} from "./program.controller.js";

const router = Router();

// All program operations require authenticated session
router.use(requireAuth());

// Program Endpoints
router.post("/", createProgramHandler);
router.get("/recipients-tree", getRecipientsTreeHandler);
router.get("/", getProgramsHandler);
router.get("/:id", getProgramByIdHandler);
router.post("/:id/acknowledge", acknowledgeProgramHandler);
router.patch("/:id/implementation-status", updateImplementationStatusHandler);
router.post("/:id/cascade-implementation", cascadeImplementationHandler);
router.patch("/:id/status", updateProgramStatusHandler);

export default router;
