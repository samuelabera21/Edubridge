import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../authentication/auth.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { HierarchyScopeService } from "../hierarchy/hierarchy-scope.service.js";

export function requireAuth() {
    return async (req: Request, res: Response, next: NextFunction) => {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        (req as any).user = session.user;
        next();
    };
}

export function requirePermission(permissionName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers),
            });

            if (!session) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const permission = await prisma.rolePermission.findFirst({
            where: {
                role: {
                    assignments: {
                        some: {
                            userId: session.user.id,
                        },
                    },
                },
                permission: {
                    name: permissionName,
                },
            },
        });

            if (!permission) {
                return res.status(403).json({
                    message: "Forbidden",
                });
            }

            (req as any).user = session.user;
            next();
        } catch (error) {
            console.error("Permission check error:", error);
            return res.status(500).json({ error: "Internal Server Error during permission check" });
        }
    };
}

export function requireScope(scopeType: "SCHOOL" | "WOREDA" | "ZONE" | "REGION" | "FEDERAL") {
    return async (req: Request, res: Response, next: NextFunction) => {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const requestedOrgId = (req.headers["x-organization-id"] as string) || (req.headers["x-scope-id"] as string) || (req.query?.organizationId as string);

        let assignment = null;
        if (requestedOrgId) {
            assignment = await prisma.roleAssignment.findFirst({
                where: {
                    userId: session.user.id,
                    scopeId: requestedOrgId,
                    scope: { type: scopeType }
                },
                include: { scope: true }
            });
        }

        if (!assignment) {
            assignment = await prisma.roleAssignment.findFirst({
                where: {
                    userId: session.user.id,
                    scope: {
                        type: scopeType,
                    },
                },
                include: {
                    scope: true,
                },
                orderBy: {
                    createdAt: "desc"
                }
            });
        }

        if (!assignment) {
            return res.status(403).json({
                message: "No authorized scope",
            });
        }

        // Attach scope to request for controller to use
        (req as any).accessScope = assignment.scope;
        (req as any).user = session.user;
        
        console.log("=> [MIDDLEWARE] requireScope PASSED for user:", session.user.email, "Scope:", assignment.scope.name, assignment.scope.id);

        next();
    };
}

/**
 * Ensures the user has a role assignment for the specific organization (e.g. school).
 * It reads the organization ID from req.params, req.body, or req.query.
 */
export function requireOrganizationAccess(paramName: string = "organizationId") {
    return async (req: Request, res: Response, next: NextFunction) => {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const requestedOrgId = req.params?.[paramName] || req.body?.[paramName] || req.query?.[paramName];

        if (!requestedOrgId) {
            return res.status(400).json({ message: `Missing ${paramName} in request` });
        }

        const assignment = await prisma.roleAssignment.findFirst({
            where: {
                userId: session.user.id,
                scopeId: requestedOrgId as string,
            },
            include: {
                scope: true,
            },
        });

        if (!assignment) {
            return res.status(403).json({
                message: "Forbidden: Wrong organization/school scope",
            });
        }

        (req as any).accessScope = assignment.scope;
        (req as any).user = session.user;
        
        next();
    };
}

/**
 * Ensures the user has hierarchical authorization to access a target organization.
 * Allows access if targetOrgId === userOrgId OR targetOrgId is a descendant in user's hierarchy.
 * Reads target organization ID from req.params[paramName], req.query[paramName], or req.body[paramName].
 * If param is omitted, resolves and attaches user's full hierarchical scope.
 */
export function requireHierarchicalScope(paramName?: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers),
            });

            if (!session) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const scope = await HierarchyScopeService.getAccessibleOrganizationScope(session.user.id);

            if (paramName) {
                const requestedOrgId = (req.params?.[paramName] || req.body?.[paramName] || req.query?.[paramName]) as string;

                if (requestedOrgId && !scope.accessibleOrganizationIds.includes(requestedOrgId)) {
                    return res.status(403).json({
                        message: "Forbidden: Target organization is outside your authorized hierarchy scope",
                    });
                }
            }

            (req as any).user = session.user;
            (req as any).accessScope = scope.currentOrganization;
            (req as any).hierarchicalScope = scope;

            next();
        } catch (error: any) {
            console.error("Error in requireHierarchicalScope:", error);
            const status = error.message?.includes("No authorized") ? 403 : 500;
            return res.status(status).json({
                message: error.message || "Internal server error during hierarchical authorization check",
            });
        }
    };
}