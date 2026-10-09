import { Request, Response } from "express";
import { ProgramService } from "./program.service.js";
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

export async function createProgramHandler(req: Request, res: Response) {
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

        const program = await ProgramService.createAndPublishProgram(
            req.body,
            actorScope,
            userId,
            ipAddress
        );

        return res.status(201).json({
            success: true,
            message: "Program / Initiative created and published successfully.",
            data: program
        });
    } catch (error: any) {
        console.error("Error in createProgramHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isValidation = error.message?.includes("required") || error.message?.includes("Invalid");
        const status = isForbidden ? 403 : isValidation ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to create program"
        });
    }
}

export async function getProgramsHandler(req: Request, res: Response) {
    try {
        const actorScope = await resolveActorScope(req);
        const { status, priority, search, tab } = req.query;

        const programs = await ProgramService.getProgramsForScope(actorScope, {
            status: status ? (String(status) as any) : undefined,
            priority: priority ? (String(priority) as any) : undefined,
            search: search ? String(search) : undefined,
            tab: tab ? (String(tab) as any) : undefined
        });

        return res.status(200).json({
            success: true,
            data: programs
        });
    } catch (error: any) {
        console.error("Error in getProgramsHandler:", error);
        const isUnauthorized = error.message?.startsWith("Unauthorized");
        const isForbidden = error.message?.startsWith("Forbidden");
        const status = isUnauthorized ? 401 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch programs"
        });
    }
}

export async function getProgramByIdHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;

        const program = await ProgramService.getProgramById(id, actorScope, userId);

        return res.status(200).json({
            success: true,
            data: program
        });
    } catch (error: any) {
        console.error("Error in getProgramByIdHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const isForbidden = error.message?.includes("Forbidden");
        const status = isNotFound ? 404 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to fetch program details"
        });
    }
}

export async function acknowledgeProgramHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;
        const { notes } = req.body;

        const result = await ProgramService.acknowledgeProgram(id, actorScope, userId, notes, ipAddress);

        return res.status(200).json({
            success: true,
            message: "Program acknowledged successfully.",
            data: result
        });
    } catch (error: any) {
        console.error("Error in acknowledgeProgramHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const isForbidden = error.message?.includes("Forbidden");
        const status = isNotFound ? 404 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to acknowledge program"
        });
    }
}

export async function updateImplementationStatusHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const result = await ProgramService.updateImplementationStatus(
            id,
            actorScope,
            userId,
            req.body,
            ipAddress
        );

        return res.status(200).json({
            success: true,
            message: "Implementation status updated successfully.",
            data: result
        });
    } catch (error: any) {
        console.error("Error in updateImplementationStatusHandler:", error);
        const isNotFound = error.message?.includes("not found");
        const isForbidden = error.message?.includes("Forbidden");
        const status = isNotFound ? 404 : isForbidden ? 403 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to update implementation status"
        });
    }
}

export async function cascadeImplementationHandler(req: Request, res: Response) {
    try {
        const parentProgramId = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;

        const program = await ProgramService.createAndPublishProgram(
            {
                ...req.body,
                parentProgramId
            },
            actorScope,
            userId,
            ipAddress
        );

        return res.status(201).json({
            success: true,
            message: "Subordinate implementation initiative created and cascaded successfully.",
            data: program
        });
    } catch (error: any) {
        console.error("Error in cascadeImplementationHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isValidation = error.message?.includes("required") || error.message?.includes("Invalid");
        const status = isForbidden ? 403 : isValidation ? 400 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to cascade implementation"
        });
    }
}

export async function updateProgramStatusHandler(req: Request, res: Response) {
    try {
        const id = String(req.params.id);
        const actorScope = await resolveActorScope(req);
        const userId = (req as any).user?.id;
        const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || undefined;
        const { status } = req.body;

        const updated = await ProgramService.updateProgramStatus(
            id,
            actorScope,
            userId,
            status,
            ipAddress
        );

        return res.status(200).json({
            success: true,
            message: "Program status updated successfully.",
            data: updated
        });
    } catch (error: any) {
        console.error("Error in updateProgramStatusHandler:", error);
        const isForbidden = error.message?.startsWith("Forbidden");
        const isNotFound = error.message?.includes("not found");
        const status = isForbidden ? 403 : isNotFound ? 404 : 500;

        return res.status(status).json({
            success: false,
            message: error.message || "Failed to update program status"
        });
    }
}

export async function getRecipientsTreeHandler(req: Request, res: Response) {
    try {
        const actorScope = await resolveActorScope(req);
        const tree = await ProgramService.getRecipientsTree(actorScope);

        return res.status(200).json({
            success: true,
            data: tree
        });
    } catch (error: any) {
        console.error("Error in getRecipientsTreeHandler:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to fetch program recipients tree"
        });
    }
}
