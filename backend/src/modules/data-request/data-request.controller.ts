import { Request, Response } from "express";
import { DataRequestService } from "./data-request.service.js";
import { GoogleFormsService } from "./google-forms.service.js";
import { HierarchyScopeService } from "../hierarchy/hierarchy-scope.service.js";

async function resolveActorScope(req: Request) {
    if ((req as any).accessScope) {
        return (req as any).accessScope;
    }
    const userId = (req as any).user?.id;
    if (userId) {
        try {
            const scope = await HierarchyScopeService.getAccessibleOrganizationScope(userId);
            return scope.currentOrganization;
        } catch {
            return null;
        }
    }
    return null;
}

export async function createDataRequestHandler(req: Request, res: Response) {
    try {
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User session required"
            });
        }

        const request = await DataRequestService.createDataRequest(
            req.body,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(201).json({
            success: true,
            message: "Data Request created successfully.",
            data: request
        });
    } catch (error: any) {
        console.error("Error in createDataRequestHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isValidation = error.message?.includes("required") || error.message?.includes("Invalid");
        const status = isForbidden ? 403 : isValidation ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to create data request"
        });
    }
}

export async function getDataRequestsHandler(req: Request, res: Response) {
    try {
        const actorScope = await resolveActorScope(req);
        const { status, priority, search } = req.query;

        const requests = await DataRequestService.getDataRequestsForScope(actorScope, {
            status: status ? (String(status) as any) : undefined,
            priority: priority ? (String(priority) as any) : undefined,
            search: search ? String(search) : undefined
        });

        return res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error: any) {
        console.error("Error in getDataRequestsHandler:", error);
        const isUnauthorized = error.message?.startsWith("Unauthorized");
        const isForbidden = error.message?.startsWith("Forbidden");
        const status = isUnauthorized ? 401 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch data requests"
        });
    }
}

export async function getDataRequestByIdHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;

        const request = await DataRequestService.getDataRequestById(id, actorScope, userId);

        return res.status(200).json({
            success: true,
            data: request
        });
    } catch (error: any) {
        console.error("Error in getDataRequestByIdHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const isForbidden = error.message?.includes("Forbidden");
        const status = isNotFound ? 404 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch data request details"
        });
    }
}

export async function publishDataRequestHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const updated = await DataRequestService.publishDataRequest(id, actorScope, userId, ipAddress);

        return res.status(200).json({
            success: true,
            message: "Data request published successfully.",
            data: updated
        });
    } catch (error: any) {
        console.error("Error in publishDataRequestHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const isForbidden = error.message?.includes("Forbidden");
        const status = isNotFound ? 404 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to publish data request"
        });
    }
}

export async function createGoogleFormHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await DataRequestService.createGoogleFormForRequest(id, actorScope, userId, ipAddress);

        return res.status(200).json({
            success: true,
            message: "Real Google Form created and linked successfully.",
            data: result
        });
    } catch (error: any) {
        console.error("Error in createGoogleFormHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const isForbidden = error.message?.includes("Forbidden");
        const status = isNotFound ? 404 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to create Google Form"
        });
    }
}

export async function getGoogleFormSchemaHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;

        const request = await DataRequestService.getDataRequestById(id, actorScope, userId);
        const googleFormId = (request as any).googleForm?.googleFormId;

        if (!googleFormId) {
            return res.status(400).json({
                success: false,
                message: "No Google Form has been generated for this Data Request yet. Please generate the form first."
            });
        }

        const fields = await GoogleFormsService.getGoogleFormSchema(googleFormId);

        return res.status(200).json({
            success: true,
            message: `Fetched ${fields.length} question(s) from Google Form.`,
            data: { fields, googleFormId }
        });
    } catch (error: any) {
        console.error("Error in getGoogleFormSchemaHandler:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch Google Form schema"
        });
    }
}

export async function syncGoogleFormSchemaHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const request = await DataRequestService.getDataRequestById(id, actorScope, userId);
        const googleFormId = (request as any).googleForm?.googleFormId;

        if (!googleFormId) {
            return res.status(400).json({
                success: false,
                message: "No Google Form has been generated for this Data Request yet."
            });
        }

        const fetchedFields = await GoogleFormsService.getGoogleFormSchema(googleFormId);

        if (fetchedFields.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No custom questions found in Google Form yet.",
                data: { fields: [], count: 0 }
            });
        }

        await DataRequestService.replaceDataRequestFields(id, fetchedFields, userId, ipAddress);

        return res.status(200).json({
            success: true,
            message: `Synced ${fetchedFields.length} question(s) from Google Form into EduBridge.`,
            data: { fields: fetchedFields, count: fetchedFields.length }
        });
    } catch (error: any) {
        console.error("Error in syncGoogleFormSchemaHandler:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to sync Google Form schema"
        });
    }
}

export async function syncGoogleFormResponsesHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const syncResult = await DataRequestService.syncGoogleFormResponses(id, actorScope, userId, ipAddress);

        return res.status(200).json({
            success: true,
            message: `Synchronized ${syncResult.totalFetched} response(s) from Google Forms.`,
            data: syncResult
        });
    } catch (error: any) {
        console.error("Error in syncGoogleFormResponsesHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const isForbidden = error.message?.includes("Forbidden");
        const status = isNotFound ? 404 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to sync Google Form responses"
        });
    }
}

export async function recordDirectSubmissionHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const userId = (req as any).user?.id;
        const actorScope = await resolveActorScope(req);
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;
        const { organizationId, responseData } = req.body;

        const orgId = organizationId || actorScope?.id;
        if (!orgId) {
            return res.status(400).json({
                success: false,
                message: "Target Organization ID is required."
            });
        }

        const submission = await DataRequestService.recordDirectSubmission(
            id,
            orgId,
            responseData || {},
            userId,
            ipAddress
        );

        return res.status(201).json({
            success: true,
            message: "Response submitted successfully.",
            data: submission
        });
    } catch (error: any) {
        console.error("Error in recordDirectSubmissionHandler:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to record submission"
        });
    }
}

export async function reviewSubmissionHandler(req: Request, res: Response) {
    try {
        const submissionId = String(req.params.submissionId);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const updated = await DataRequestService.reviewSubmission(
            submissionId,
            req.body,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(200).json({
            success: true,
            message: `Submission ${req.body.status === "ACCEPTED" ? "accepted" : "returned for revision"} successfully.`,
            data: updated
        });
    } catch (error: any) {
        console.error("Error in reviewSubmissionHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const isForbidden = error.message?.includes("Forbidden");
        const status = isNotFound ? 404 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to review submission"
        });
    }
}

export async function getGoogleOAuthUrlHandler(req: Request, res: Response) {
    try {
        const state = req.query.state ? String(req.query.state) : undefined;
        const url = GoogleFormsService.getAuthUrl(state);
        return res.status(200).json({
            success: true,
            data: {
                authUrl: url,
                isConfigured: GoogleFormsService.isConfigured(),
                isConnected: GoogleFormsService.hasAuthorizedTokens()
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to generate Google OAuth URL"
        });
    }
}

export async function handleGoogleOAuthCallbackHandler(req: Request, res: Response) {
    try {
        const code = String(req.query.code || "");
        const state = req.query.state ? String(req.query.state) : "";
        if (!code) {
            return res.status(400).send("Authorization code missing from Google OAuth callback.");
        }
        await GoogleFormsService.handleOAuthCallback(code);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
        let targetPath = "/dashboard/federal?tab=data-requests";
        if (state && (state.startsWith("/") || state.startsWith("http"))) {
            targetPath = state;
        }
        const separator = targetPath.includes("?") ? "&" : "?";
        const finalRedirect = targetPath.startsWith("http")
            ? `${targetPath}${separator}googleOAuth=success`
            : `${frontendUrl}${targetPath}${separator}googleOAuth=success`;

        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><title>Google Authorization Successful</title></head>
            <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
                <div style="text-align: center; background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); max-width: 400px;">
                    <h2 style="color: #16a34a; margin-top: 0;">Authorization Successful</h2>
                    <p style="color: #475569; font-size: 14px;">Your Google account is now connected to EduBridge. You can close this window.</p>
                </div>
                <script>
                    if (window.opener) {
                        try {
                            window.opener.postMessage({ type: "GOOGLE_OAUTH_SUCCESS" }, "*");
                        } catch (e) {}
                        setTimeout(function() { window.close(); }, 800);
                    } else {
                        window.location.href = "${finalRedirect}";
                    }
                </script>
            </body>
            </html>
        `);
    } catch (error: any) {
        console.error("Google OAuth callback error:", error);
        return res.status(500).send(`Google OAuth authorization failed: ${error.message}`);
    }
}

export async function handleGoogleFormsWebhookHandler(req: Request, res: Response) {
    try {
        const requestId = String(req.params.requestId || req.params.id);
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await DataRequestService.handleGoogleFormsWebhook(requestId, req.body, ipAddress);

        return res.status(200).json({
            success: true,
            message: "Google Forms submission processed and synchronized successfully.",
            data: result
        });
    } catch (error: any) {
        console.error("Error in handleGoogleFormsWebhookHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const status = isNotFound ? 404 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to process Google Forms webhook"
        });
    }
}
