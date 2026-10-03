import { Request, Response } from "express";
import { DirectiveService } from "./directive.service.js";
import { HierarchyScopeService } from "../hierarchy/hierarchy-scope.service.js";

async function resolveActorScope(req: Request) {
    if ((req as any).accessScope) {
        return (req as any).accessScope;
    }
    const userId = (req as any).user?.id;
    if (userId) {
        try {
            const requestedOrgId = (req.query?.organizationId || req.headers["x-organization-id"]) as string | undefined;
            const scope = await HierarchyScopeService.getAccessibleOrganizationScope(userId, requestedOrgId);
            return scope.currentOrganization;
        } catch {
            return null;
        }
    }
    return null;
}

export async function createDirectiveHandler(req: Request, res: Response) {
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

        const directive = await DirectiveService.createAndPublishDirective(
            req.body,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(201).json({
            success: true,
            message: "National policy/directive published successfully.",
            data: directive
        });
    } catch (error: any) {
        console.error("Error in createDirectiveHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isValidation = error.message?.includes("required");
        const status = isForbidden ? 403 : isValidation ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to publish policy/directive"
        });
    }
}

export async function getDirectivesHandler(req: Request, res: Response) {
    try {
        const actorScope = await resolveActorScope(req);
        const { type, priority, search } = req.query;

        const directives = await DirectiveService.getDirectivesForScope(actorScope, {
            type: type ? (String(type) as any) : undefined,
            priority: priority ? (String(priority) as any) : undefined,
            search: search ? String(search) : undefined
        });

        return res.status(200).json({
            success: true,
            data: directives
        });
    } catch (error: any) {
        console.error("Error in getDirectivesHandler:", error);
        const isUnauthorized = error.message?.startsWith("Unauthorized");
        const isForbidden = error.message?.startsWith("Forbidden");
        const status = isUnauthorized ? 401 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch directives"
        });
    }
}

export async function getDirectiveByIdHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;

        const directive = await DirectiveService.getDirectiveById(id, actorScope, userId);

        return res.status(200).json({
            success: true,
            data: directive
        });
    } catch (error: any) {
        console.error("Error in getDirectiveByIdHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch directive"
        });
    }
}

export async function acknowledgeDirectiveHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User session required"
            });
        }

        const { notes } = req.body;
        const result = await DirectiveService.acknowledgeDirective(
            id,
            actorScope,
            userId,
            notes,
            ipAddress
        );

        return res.status(200).json(result);
    } catch (error: any) {
        console.error("Error in acknowledgeDirectiveHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to acknowledge directive"
        });
    }
}
