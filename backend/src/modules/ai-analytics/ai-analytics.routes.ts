import { Router } from "express";
import { AiAnalyticsController } from "./ai-analytics.controller.js";
import { requireAuth } from "../authentication/authorization.middleware.js";

const router = Router();

// All analytics chat routes require authenticated session
router.use(requireAuth());

router.post("/query", AiAnalyticsController.handleQuery);
router.get("/prompts", AiAnalyticsController.getSuggestedPrompts);

export default router;
