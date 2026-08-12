import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../authentication/auth.js";
import { prisma } from "../../infrastructure/prisma/client.js";

export function requirePermission(permissionName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
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

        next();
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

        const assignment = await prisma.roleAssignment.findFirst({
            where: {
                userId: session.user.id,
                scope: {
                    type: scopeType,
                },
            },
            include: {
                scope: true,
            },
        });

        if (!assignment) {
            return res.status(403).json({
                message: "No authorized scope",
            });
        }

        // Attach scope to request for controller to use
        (req as any).accessScope = assignment.scope;

        next();
    };
}