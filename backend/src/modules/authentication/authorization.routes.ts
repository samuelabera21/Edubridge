import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../authentication/auth.js";

import {
    requirePermission,
    requireScope,
} from "./authorization.middleware.js";

import {
    getUserAccess,
    assignRoleToUser,
    assignPermissionToRole,
} from "./authorization.service.js";

const router = Router();

router.get(
    "/me",
    async (req, res) => {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const access = await getUserAccess(session.user.id);

        return res.json({
            user: session.user,
            access,
        });
    }
);

router.post("/assign-role", async (req, res) => {
    // SECURITY: Development/Provisioning only endpoint
    if (process.env.NODE_ENV === "production" && req.headers["x-provisioning-secret"] !== process.env.PROVISIONING_SECRET) {
        return res.status(403).json({ message: "Forbidden: Provisioning disabled" });
    }

    try {
        const { userId, roleName, scopeName, scopeType } = req.body;

        const assignment = await assignRoleToUser(
            userId,
            roleName,
            scopeName,
            scopeType
        );

        return res.status(201).json(assignment);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to assign role",
        });
    }
});

router.post("/assign-permission", async (req, res) => {
    // SECURITY: Development/Provisioning only endpoint
    if (process.env.NODE_ENV === "production" && req.headers["x-provisioning-secret"] !== process.env.PROVISIONING_SECRET) {
        return res.status(403).json({ message: "Forbidden: Provisioning disabled" });
    }

    try {
        const { roleName, permissionName, description } = req.body;

        const result = await assignPermissionToRole(
            roleName,
            permissionName,
            description
        );

        return res.status(201).json(result);
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Failed to assign permission",
        });
    }
});

export default router;