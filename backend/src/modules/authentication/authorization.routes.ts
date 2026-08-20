import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../authentication/auth.js";
import { prisma } from "../../infrastructure/prisma/client.js";

import {
    requirePermission,
    requireScope,
} from "./authorization.middleware.js";

import {
    getUserAccess,
    assignRoleToUser,
    assignPermissionToRole,
    validatePasswordStrength,
} from "./authorization.service.js";

const router = Router();

router.post("/resolve-username", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username || typeof username !== "string") {
            return res.status(400).json({ error: "Username is required" });
        }

        const input = username.trim();

        // 1. If input is already an email
        if (input.includes("@")) {
            const user = await prisma.user.findUnique({ where: { email: input } });
            if (user) return res.json({ email: user.email });
            return res.json({ email: input });
        }

        // 2. Check Teacher by employeeId
        const teacher = await prisma.teacher.findFirst({
            where: {
                OR: [
                    { employeeId: { equals: input, mode: "insensitive" } },
                    { email: { equals: input, mode: "insensitive" } }
                ]
            },
            include: { user: true }
        });
        if (teacher?.email) return res.json({ email: teacher.email });
        if (teacher?.user?.email) return res.json({ email: teacher.user.email });

        // 3. Check Student by studentId
        const student = await prisma.student.findFirst({
            where: {
                studentId: { equals: input, mode: "insensitive" }
            }
        });
        if (student) {
            const studentUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: { startsWith: `${input.toLowerCase()}@`, mode: "insensitive" } },
                        { email: "student@edubridge.com" }
                    ]
                }
            });
            if (studentUser) return res.json({ email: studentUser.email });
        }

        // 4. Standard Aliases
        const lower = input.toLowerCase();
        if (lower === "admin" || lower === "school_admin") return res.json({ email: "admin@edubridge.com" });
        if (lower === "teacher") return res.json({ email: "teacher@edubridge.com" });
        if (lower === "student") return res.json({ email: "student@edubridge.com" });
        if (lower === "parent") return res.json({ email: "parent@edubridge.com" });

        // 5. Direct user search
        const directUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: { equals: input, mode: "insensitive" } },
                    { email: { startsWith: `${lower}@`, mode: "insensitive" } },
                    { name: { equals: input, mode: "insensitive" } }
                ]
            }
        });
        if (directUser) return res.json({ email: directUser.email });

        return res.json({ email: `${lower}@edubridge.local` });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Failed to resolve username" });
    }
});

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

        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!dbUser || dbUser.isActive === false) {
            return res.status(403).json({
                message: "Your account is currently inactive. Please contact your administrator.",
                isActive: false
            });
        }

        const access = await getUserAccess(session.user.id);

        return res.json({
            user: {
                ...session.user,
                requiresPasswordChange: dbUser.requiresPasswordChange ?? false,
                isActive: dbUser.isActive ?? true
            },
            access,
            requiresPasswordChange: dbUser.requiresPasswordChange ?? false,
            isActive: dbUser.isActive ?? true
        });
    }
);

router.post("/change-password", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required." });
        }

        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New password and confirmation password do not match." });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "New password cannot be the same as current/temporary password." });
        }

        const strength = validatePasswordStrength(newPassword);
        if (!strength.valid) {
            return res.status(400).json({ message: strength.message });
        }

        // Call Better Auth changePassword API
        await auth.api.changePassword({
            body: {
                currentPassword,
                newPassword,
                revokeOtherSessions: false,
            },
            headers: fromNodeHeaders(req.headers),
        }).catch((err: any) => {
            throw new Error(err?.message || "Invalid current/temporary password.");
        });

        // Set requiresPasswordChange = false
        await prisma.user.update({
            where: { id: session.user.id },
            data: { requiresPasswordChange: false }
        });

        // Log Audit Event
        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "PASSWORD_CHANGED",
                resource: "User",
                resourceId: session.user.id,
                newValue: { requiresPasswordChange: false }
            }
        });

        return res.json({
            success: true,
            message: "Password updated successfully."
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || "Failed to change password." });
    }
});

router.post("/create-user", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userAccess = await getUserAccess(session.user.id);
        const isAdmin = userAccess.some(a => ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR"].includes(a.role.name));
        if (!isAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can create institutional users." });
        }

        const { name, email, password, roleName, scopeName, scopeType } = req.body;

        if (!name || !roleName) {
            return res.status(400).json({ message: "Name and roleName are required." });
        }

        const count = await prisma.user.count();
        const seq = String(count + 1).padStart(4, "0");
        const prefixMap: Record<string, string> = {
            STUDENT: "stu",
            TEACHER: "tch",
            PARENT: "prn",
            VICE_PRINCIPAL: "vp",
            ADMIN: "adm",
            SCHOOL_ADMIN: "adm"
        };
        const prefix = prefixMap[roleName?.toUpperCase()] || "usr";
        const autoUsername = `${prefix}.2026.${seq}@edubridge.local`;
        const targetEmail = email || autoUsername;

        const existingUser = await prisma.user.findUnique({ where: { email: targetEmail } });
        if (existingUser) {
            return res.status(400).json({ message: "A user with this email/username address already exists." });
        }

        const tempPassword = password || "EduBridge2026!";

        const newUserRes = await auth.api.signUpEmail({
            body: {
                email: targetEmail,
                password: tempPassword,
                name
            }
        });

        if (!newUserRes || !newUserRes.user) {
            return res.status(400).json({ message: "Failed to create user account." });
        }

        const newUserId = newUserRes.user.id;

        await prisma.user.update({
            where: { id: newUserId },
            data: {
                requiresPasswordChange: true,
                isActive: true
            }
        });

        const targetScopeName = scopeName || "EduBridge Demo School";
        const targetScopeType = scopeType || "SCHOOL";

        await assignRoleToUser(
            newUserId,
            roleName,
            targetScopeName,
            targetScopeType
        );

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "USER_CREATED",
                resource: "User",
                resourceId: newUserId,
                newValue: { email, name, roleName, requiresPasswordChange: true }
            }
        });

        return res.status(201).json({
            success: true,
            user: {
                id: newUserId,
                name,
                email,
                roleName,
                requiresPasswordChange: true,
                isActive: true
            },
            temporaryPassword: tempPassword
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || "Failed to create user." });
    }
});

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