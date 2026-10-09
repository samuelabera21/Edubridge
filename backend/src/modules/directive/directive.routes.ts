import { Router } from "express";
import { requireAuth } from "../authentication/authorization.middleware.js";
import {
    createDirectiveHandler,
    getDirectivesHandler,
    getDirectiveByIdHandler,
    acknowledgeDirectiveHandler,
    getDirectivesRecipientsTreeHandler
} from "./directive.controller.js";

const router = Router();

// Directive & Announcement routes require authentication
router.use(requireAuth());

// Endpoints
router.post("/", createDirectiveHandler);
router.get("/recipients-tree", getDirectivesRecipientsTreeHandler);
router.get("/", getDirectivesHandler);
router.get("/:id", getDirectiveByIdHandler);
router.post("/:id/acknowledge", acknowledgeDirectiveHandler);

export default router;

