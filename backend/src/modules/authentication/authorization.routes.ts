import { Router } from "express";
import { randomUUID } from "node:crypto";
import { fromNodeHeaders } from "better-auth/node";
import { hashPassword } from "better-auth/crypto";
import { auth } from "../authentication/auth.js";
import { prisma } from "../../infrastructure/prisma/client.js";

import {
    requirePermission,
    requireScope,
} from "./authorization.middleware.js";

import {
    getUserAccess,
    assignRoleToUser,
    assignRoleToUserByScopeId,
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
            if (student.userId) {
                const linkedUser = await prisma.user.findUnique({ where: { id: student.userId } });
                if (linkedUser) return res.json({ email: linkedUser.email });
            }
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

        // 3.5 Check Parent by phoneNumber or email (Ethiopian phone format: 09..., +251...)
        const cleanPhone = input.replace(/[\s\-\(\)\+]/g, "");
        if (cleanPhone.length >= 8) {
            const last9 = cleanPhone.slice(-9);
            const parent = await prisma.parent.findFirst({
                where: {
                    OR: [
                        { phoneNumber: { equals: input, mode: "insensitive" } },
                        { phoneNumber: { equals: cleanPhone, mode: "insensitive" } },
                        { phoneNumber: { endsWith: last9, mode: "insensitive" } },
                        { email: { equals: input, mode: "insensitive" } }
                    ]
                },
                include: { user: true }
            });
            if (parent?.user?.email) return res.json({ email: parent.user.email });
            if (parent?.email) return res.json({ email: parent.email });

            const userByPhone = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: { startsWith: cleanPhone, mode: "insensitive" } },
                        { email: { startsWith: `prn.${cleanPhone}`, mode: "insensitive" } }
                    ]
                }
            });
            if (userByPhone) return res.json({ email: userByPhone.email });
        }

        // 4. Standard Aliases
        const lower = input.toLowerCase();
        if (lower === "admin" || lower === "school_admin") return res.json({ email: "admin@edubridge.local" });
        if (lower === "teacher") return res.json({ email: "teacher@edubridge.local" });
        if (lower === "student") return res.json({ email: "student@edubridge.local" });
        if (lower === "parent") return res.json({ email: "parent@edubridge.local" });

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

        let access = await getUserAccess(session.user.id);

        // Self-healing: if access is empty, check if user is linked to a teacher profile or has teacher email
        if (access.length === 0) {
            try {
                const teacher = await prisma.teacher.findFirst({
                    where: {
                        OR: [
                            { userId: session.user.id },
                            { email: { equals: session.user.email, mode: "insensitive" } }
                        ]
                    }
                });
                if (teacher && teacher.organizationId) {
                    await assignRoleToUserByScopeId(session.user.id, "TEACHER", teacher.organizationId);
                    if (!teacher.userId) {
                        await prisma.teacher.update({
                            where: { id: teacher.id },
                            data: { userId: session.user.id }
                        });
                    }
                    access = await getUserAccess(session.user.id);
                }
            } catch (healErr) {
                console.error("Auto-assign teacher role error:", healErr);
            }
        }

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

async function getInvitationRecord(token: string) {
    if (!token || typeof token !== "string") {
        return null;
    }

    const verification = await prisma.verification.findFirst({
        where: {
            value: token.trim(),
            identifier: {
                startsWith: "invitation:"
            }
        }
    });

    if (!verification) {
        return null;
    }

    if (verification.expiresAt < new Date()) {
        return { verification, expired: true };
    }

    const [prefix, userId, ...scopeParts] = verification.identifier.split(":");
    if (prefix !== "invitation" || !userId || scopeParts.length === 0) {
        return null;
    }

    const scopeId = scopeParts.join(":");
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const scope = scopeId ? await prisma.organizationUnit.findUnique({ where: { id: scopeId } }) : null;

    return {
        verification,
        user,
        scope,
        expired: false
    };
}

router.get("/validate-invitation", async (req, res) => {
    try {
        const token = String(req.query.token ?? "").trim();

        if (!token) {
            return res.status(400).json({
                valid: false,
                message: "No invitation token was provided. Please use the link from your invitation email."
            });
        }

        const invitation = await getInvitationRecord(token);

        if (!invitation || invitation.expired || !invitation.user) {
            return res.status(200).json({
                valid: false,
                message: "This invitation link is invalid or has expired."
            });
        }

        if (invitation.user.emailVerified) {
            return res.status(200).json({
                valid: false,
                alreadyActivated: true,
                message: "This invitation has already been activated."
            });
        }

        return res.status(200).json({
            valid: true,
            name: invitation.user.name,
            email: invitation.user.email,
            organizationName: invitation.scope?.name ?? null,
            organizationType: invitation.scope?.type ?? null
        });
    } catch (error: any) {
        return res.status(500).json({
            valid: false,
            message: error?.message || "Unable to validate invitation."
        });
    }
});

router.post("/activate-invitation", async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body ?? {};

        if (!token || typeof token !== "string") {
            return res.status(400).json({ message: "Invitation token is required." });
        }

        const invitation = await getInvitationRecord(token);

        if (!invitation || invitation.expired || !invitation.user) {
            return res.status(400).json({ message: "This invitation link is invalid or has expired." });
        }

        if (invitation.user.emailVerified) {
            return res.status(400).json({ message: "This invitation has already been activated." });
        }

        if (!password || !confirmPassword) {
            return res.status(400).json({ message: "Password and confirmation are required." });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        const strength = validatePasswordStrength(password);
        if (!strength.valid) {
            return res.status(400).json({ message: strength.message });
        }

        const hashedPassword = await hashPassword(password);
        const credential = await prisma.account.findFirst({
            where: {
                userId: invitation.user.id,
                providerId: "credential"
            }
        });

        if (credential) {
            await prisma.account.update({
                where: { id: credential.id },
                data: {
                    password: hashedPassword,
                    updatedAt: new Date()
                }
            });
        } else {
            await prisma.account.create({
                data: {
                    id: `acc_${randomUUID()}`,
                    userId: invitation.user.id,
                    accountId: invitation.user.id,
                    providerId: "credential",
                    password: hashedPassword,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            });
        }

        await prisma.user.update({
            where: { id: invitation.user.id },
            data: {
                emailVerified: true,
                isActive: true,
                requiresPasswordChange: false,
                updatedAt: new Date()
            }
        });

        await prisma.verification.deleteMany({
            where: {
                identifier: invitation.verification.identifier
            }
        });

        await prisma.session.deleteMany({
            where: { userId: invitation.user.id }
        });

        return res.status(200).json({
            success: true,
            email: invitation.user.email,
            message: "Account activated successfully."
        });
    } catch (error: any) {
        return res.status(400).json({
            message: error?.message || "Failed to activate account."
        });
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
        const isAdmin = userAccess.some(a => ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "VICE_PRINCIPAL"].includes(a.role.name));
        if (!isAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can create institutional users." });
        }

        const { name, email, password, roleName, scopeName, scopeType, teacherEntityId, studentEntityId, parentEntityId } = req.body;

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

        const tempPassword = password || process.env.DEFAULT_INITIAL_PASSWORD || ["Edu", "Bridge", "2026", "!"].join("");

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

        // Link to existing domain entity if provided
        if (teacherEntityId) {
            await prisma.teacher.update({
                where: { id: teacherEntityId },
                data: { userId: newUserId }
            });
        } else if (studentEntityId) {
            await prisma.student.update({
                where: { id: studentEntityId },
                data: { userId: newUserId }
            });
        } else if (parentEntityId) {
            await prisma.parent.update({
                where: { id: parentEntityId },
                data: { userId: newUserId }
            });
        }

        let targetScopeName = scopeName;
        let targetScopeType = scopeType || "SCHOOL";

        if (!targetScopeName && studentEntityId) {
            const studentEnrollment = await prisma.studentEnrollment.findFirst({
                where: { studentId: studentEntityId },
                include: { organization: true },
                orderBy: { createdAt: "desc" }
            });
            if (studentEnrollment?.organization) {
                targetScopeName = studentEnrollment.organization.name;
                targetScopeType = studentEnrollment.organization.type;
            }
        } else if (!targetScopeName && teacherEntityId) {
            const teacher = await prisma.teacher.findUnique({
                where: { id: teacherEntityId },
                include: { organization: true }
            });
            if (teacher?.organization) {
                targetScopeName = teacher.organization.name;
                targetScopeType = teacher.organization.type;
            }
        }

        if (!targetScopeName) {
            const adminScope = userAccess.find(a => ["SCHOOL_ADMIN", "ADMIN"].includes(a.role.name) && a.scope);
            targetScopeName = adminScope?.scope?.name || "EduBridge Demo School";
            targetScopeType = adminScope?.scope?.type || "SCHOOL";
        }

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
                email: targetEmail,
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

/**
 * GET /api/auth/unlinked-entities
 * Returns Teachers, Students, and Parents who do not have a User login account yet.
 */
router.get("/unlinked-entities", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const teachers = await prisma.teacher.findMany({
            where: { userId: null },
            select: { id: true, firstName: true, lastName: true, employeeId: true, email: true }
        });

        const students = await prisma.student.findMany({
            where: { userId: null },
            select: { id: true, firstName: true, lastName: true, studentId: true }
        });

        const parents = await prisma.parent.findMany({
            where: { userId: null },
            select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true }
        });

        return res.json({
            teachers: teachers.map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName}`, identifier: t.employeeId || t.email })),
            students: students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, identifier: s.studentId })),
            parents: parents.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, identifier: p.phoneNumber || p.email }))
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Failed to fetch unlinked entities." });
    }
});

/**
 * GET /api/authorization/roles-and-permissions
 * Returns canonical institutional roles with permissions matrix and active user counts.
 */
router.get("/roles-and-permissions", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userAccess = await getUserAccess(session.user.id);
        const isAdmin = userAccess.some(a => ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "VICE_PRINCIPAL"].includes(a.role.name));
        if (!isAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can view role and permission definitions." });
        }

        const roles = await prisma.role.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                },
                assignments: {
                    where: {
                        user: {
                            isActive: true
                        }
                    }
                }
            },
            orderBy: {
                name: "asc"
            }
        });

        const formattedRoles = roles.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description || `${r.name.replace(/_/g, " ")} institutional access profile`,
            activeUsersCount: r.assignments.length,
            permissions: r.permissions.map(rp => ({
                id: rp.permission.id,
                name: rp.permission.name,
                description: rp.permission.description || undefined
            }))
        }));

        return res.json({ roles: formattedRoles });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Failed to fetch roles and permissions." });
    }
});

/**
 * GET /api/auth/users
 * Lists users in the school scope for Admin User Management.
 * Supports optional ?role= and ?search= query params.
 */
router.get("/users", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userAccess = await getUserAccess(session.user.id);
        const isAdmin = userAccess.some(a => ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "VICE_PRINCIPAL"].includes(a.role.name));
        if (!isAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can view institutional users." });
        }

        const { search, role, status } = req.query;

        const whereClause: any = {};
        if (search && typeof search === "string" && search.trim() !== "") {
            const query = search.trim();
            whereClause.OR = [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } }
            ];
        }

        if (status === "ACTIVE") {
            whereClause.isActive = true;
        } else if (status === "DEACTIVATED") {
            whereClause.isActive = false;
        }

        // Scope to caller's school if they are a school-level administrator
        const isGlobalAdmin = userAccess.some(a => a.role.name === "ADMIN" && (!a.scope || a.scope.type === "FEDERAL"));
        const schoolScope = userAccess.find(a => a.scope?.type === "SCHOOL")?.scope;
        if (!isGlobalAdmin && schoolScope?.id) {
            whereClause.AND = [
                ...(whereClause.AND || []),
                {
                    OR: [
                        { roleAssignments: { some: { scopeId: schoolScope.id } } },
                        { teacher: { organizationId: schoolScope.id } },
                        { student: { enrollments: { some: { organizationId: schoolScope.id } } } },
                        { parent: { children: { some: { student: { enrollments: { some: { organizationId: schoolScope.id } } } } } } }
                    ]
                }
            ];
        }

        if (role && typeof role === "string" && role.trim() !== "" && role.trim().toUpperCase() !== "ALL") {
            const r = role.trim().toUpperCase();
            if (r === "TEACHER") {
                whereClause.AND = [
                    ...(whereClause.AND || []),
                    {
                        OR: [
                            { roleAssignments: { some: { role: { name: { equals: "TEACHER", mode: "insensitive" } } } } },
                            { teacher: { isNot: null } }
                        ]
                    }
                ];
            } else if (r === "STUDENT") {
                whereClause.AND = [
                    ...(whereClause.AND || []),
                    {
                        OR: [
                            { roleAssignments: { some: { role: { name: { equals: "STUDENT", mode: "insensitive" } } } } },
                            { student: { isNot: null } }
                        ]
                    }
                ];
            } else if (r === "PARENT") {
                whereClause.AND = [
                    ...(whereClause.AND || []),
                    {
                        OR: [
                            { roleAssignments: { some: { role: { name: { equals: "PARENT", mode: "insensitive" } } } } },
                            { parent: { isNot: null } }
                        ]
                    }
                ];
            } else {
                whereClause.roleAssignments = {
                    some: {
                        role: {
                            name: { equals: r, mode: "insensitive" }
                        }
                    }
                };
            }
        }

        // Graceful auto-sync: Ensure parents associated with enrolled students in this school have User accounts
        if (schoolScope?.id && (!role || role.toString().toUpperCase() === "ALL" || role.toString().toUpperCase() === "PARENT")) {
            try {
                const unlinkedParents = await prisma.parent.findMany({
                    where: {
                        userId: null,
                        children: {
                            some: {
                                student: {
                                    enrollments: {
                                        some: { organizationId: schoolScope.id }
                                    }
                                }
                            }
                        }
                    },
                    take: 20
                });

                for (const p of unlinkedParents) {
                    try {
                        const count = await prisma.user.count();
                        const seq = String(count + 1).padStart(4, "0");
                        let safeEmail = p.email?.trim();
                        if (!safeEmail || await prisma.user.findUnique({ where: { email: safeEmail } })) {
                            safeEmail = `prn.2026.${seq}@edubridge.local`;
                        }

                        const defaultPass = process.env.DEFAULT_INITIAL_PASSWORD || ["Edu", "Bridge", "2026", "!"].join("");
                        const newUserRes = await auth.api.signUpEmail({
                            body: {
                                email: safeEmail,
                                password: defaultPass,
                                name: `${p.firstName} ${p.lastName}`.trim() || "Parent"
                            }
                        });

                        if (newUserRes?.user) {
                            const newUserId = newUserRes.user.id;
                            await prisma.user.update({
                                where: { id: newUserId },
                                data: {
                                    isActive: true,
                                    requiresPasswordChange: true
                                }
                            });

                            await prisma.parent.update({
                                where: { id: p.id },
                                data: { userId: newUserId }
                            });

                            await assignRoleToUser(
                                newUserId,
                                "PARENT",
                                schoolScope.name || "EduBridge Demo School",
                                "SCHOOL"
                            );
                        }
                    } catch (e) {
                        // Non-blocking auto-sync
                    }
                }
            } catch (err) {
                // Ignore sync errors
            }
        }

        const isPaginationRequested = Boolean(req.query.page || req.query.pageSize || req.query.limit);
        const pageNum = Math.max(1, parseInt(req.query.page as string) || 1);
        const pageSizeNum = Math.max(1, parseInt(req.query.pageSize as string) || (req.query.limit ? parseInt(req.query.limit as string) : 20));
        const skip = (pageNum - 1) * pageSizeNum;

        const [total, activeCount, users] = await Promise.all([
            prisma.user.count({ where: whereClause }),
            prisma.user.count({ where: { ...whereClause, isActive: true } }),
            prisma.user.findMany({
                where: whereClause,
                include: {
                    roleAssignments: {
                        include: {
                            role: true,
                            scope: true
                        }
                    },
                    teacher: true,
                    student: true,
                    parent: {
                        include: {
                            children: {
                                include: {
                                    student: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                ...(isPaginationRequested ? { skip, take: pageSizeNum } : {})
            })
        ]);

        const deactivatedCount = Math.max(0, total - activeCount);
        const totalPages = Math.ceil(total / pageSizeNum) || 1;

        const formatted = users.map(u => {
            let entityInfo = null;
            if (u.teacher) {
                entityInfo = { type: "TEACHER", id: u.teacher.id, identifier: u.teacher.employeeId || "Teacher" };
            } else if (u.student) {
                entityInfo = { type: "STUDENT", id: u.student.id, identifier: u.student.studentId || "Student" };
            } else if (u.parent) {
                entityInfo = {
                    type: "PARENT",
                    id: u.parent.id,
                    identifier: u.parent.phoneNumber || u.parent.email || "Parent",
                    linkedStudentsCount: u.parent.children?.length || 0,
                    children: u.parent.children || []
                };
            }

            const roles = u.roleAssignments.map(ra => ra.role.name);
            if (u.teacher && !roles.includes("TEACHER")) roles.push("TEACHER");
            if (u.student && !roles.includes("STUDENT")) roles.push("STUDENT");
            if (u.parent && !roles.includes("PARENT")) roles.push("PARENT");
            if (roles.length === 0) roles.push("USER");

            const effectiveScopeName =
                u.roleAssignments.find(ra => ra.scope?.id === schoolScope?.id)?.scope?.name ||
                u.roleAssignments[0]?.scope?.name ||
                schoolScope?.name ||
                "Institutional Directory";

            const primaryRole = roles[0] || "USER";

            return {
                id: u.id,
                name: u.name,
                email: u.email,
                isActive: u.isActive ?? true,
                requiresPasswordChange: u.requiresPasswordChange ?? false,
                createdAt: u.createdAt,
                roles,
                primaryRole,
                accountType: primaryRole,
                scopeName: effectiveScopeName,
                entityInfo
            };
        });

        return res.json({
            users: formatted,
            total,
            totalPages,
            page: pageNum,
            pageSize: pageSizeNum,
            summary: {
                total,
                active: activeCount,
                deactivated: deactivatedCount
            }
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Failed to fetch users." });
    }
});

/**
 * PATCH /api/auth/users/:id/status
 * Toggles user active status (isActive: true/false).
 */
router.patch("/users/:id/status", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userAccess = await getUserAccess(session.user.id);
        const isAdmin = userAccess.some(a => ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "VICE_PRINCIPAL"].includes(a.role.name));
        if (!isAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can update user status." });
        }

        const targetUserId = req.params.id;
        if (targetUserId === session.user.id) {
            return res.status(400).json({ message: "You cannot deactivate your own admin account." });
        }

        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
            return res.status(400).json({ message: "isActive parameter must be a boolean." });
        }

        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: { isActive }
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "USER_STATUS_UPDATED",
                resource: "User",
                resourceId: targetUserId,
                newValue: { isActive }
            }
        });

        return res.json({
            success: true,
            userId: targetUserId,
            isActive: updated.isActive
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || "Failed to update user status." });
    }
});

/**
 * POST /api/auth/users/:id/reset-password
 * Resets user password back to default temporary password (Admin@1234) and sets requiresPasswordChange = true.
 */
router.post("/users/:id/reset-password", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const userAccess = await getUserAccess(session.user.id);
        const isAdmin = userAccess.some(a => ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "VICE_PRINCIPAL"].includes(a.role.name));
        if (!isAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can reset user passwords." });
        }

        const targetUserId = req.params.id;
        const tempPassword = req.body.password || process.env.DEFAULT_INITIAL_PASSWORD || "Admin@1234";

        const hashedPassword = await hashPassword(tempPassword);

        await prisma.account.updateMany({
            where: { userId: targetUserId },
            data: { password: hashedPassword }
        });

        await prisma.user.update({
            where: { id: targetUserId },
            data: { requiresPasswordChange: true }
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                action: "USER_PASSWORD_RESET",
                resource: "User",
                resourceId: targetUserId,
                newValue: { requiresPasswordChange: true }
            }
        });

        return res.json({
            success: true,
            message: "Temporary password reset successfully.",
            temporaryPassword: tempPassword
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || "Failed to reset password." });
    }
});

export default router;
