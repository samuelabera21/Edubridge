import { Router } from "express";
import { requireAuth } from "../authentication/authorization.middleware.js";
import {
    createDataRequestHandler,
    getDataRequestsHandler,
    getDataRequestByIdHandler,
    publishDataRequestHandler,
    createGoogleFormHandler,
    syncGoogleFormResponsesHandler,
    recordDirectSubmissionHandler,
    reviewSubmissionHandler,
    getGoogleOAuthUrlHandler,
    handleGoogleOAuthCallbackHandler,
    handleGoogleFormsWebhookHandler
} from "./data-request.controller.js";

const router = Router();

// OAuth Endpoints
router.get("/google-oauth/url", getGoogleOAuthUrlHandler);
router.get("/google-oauth/callback", handleGoogleOAuthCallbackHandler);

// Public Webhook Endpoints (triggered by Google Apps Script onFormSubmit without user JWT)
router.post("/webhook/:requestId", handleGoogleFormsWebhookHandler);
router.post("/:id/webhook", handleGoogleFormsWebhookHandler);

// All subsequent operations require authentication
router.use(requireAuth());

// Data Request CRUD & Orchestration
router.post("/", createDataRequestHandler);
router.get("/", getDataRequestsHandler);
router.get("/:id", getDataRequestByIdHandler);
router.post("/:id/publish", publishDataRequestHandler);
router.post("/:id/google-form", createGoogleFormHandler);
router.post("/:id/sync", syncGoogleFormResponsesHandler);
router.post("/:id/submit", recordDirectSubmissionHandler);

// Review
router.post("/submissions/:submissionId/review", reviewSubmissionHandler);

export default router;
