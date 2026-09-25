import { Router } from "express";
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
    getCallerSchoolScope,
    assignRoleToUser,
    assignRoleToUserByScopeId,
    assignPermissionToRole,
    validatePasswordStrength,
} from "./authorization.service.js";

const router = Router();

// ============================================================================
// 1. RESOLVE USERNAME (Public / Auth)
// ============================================================================
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

// ============================================================================
// 2. ME / CURRENT USER SESSION
// ============================================================================
router.get("/me", async (req, res) => {
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
});

// ============================================================================
// 3. CHANGE PASSWORD (Self-Service)
// ============================================================================
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

// ============================================================================
// 4. GET USERS (Tenant-Scoped Account Directory with Server-Side Filters)
// ============================================================================
router.get("/users", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const callerScope = await getCallerSchoolScope(session.user.id);
        if (!callerScope.isSchoolAdmin && !callerScope.isPlatformAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can view institutional accounts." });
        }

        const organizationId = callerScope.organizationId;
        const { search, role, status, page = "1", pageSize = "20" } = req.query;

        const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(pageSize as string, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const andConditions: any[] = [];

        // Tenant scope condition
        if (!callerScope.isPlatformAdmin && organizationId) {
            andConditions.push({
                OR: [
                    { roleAssignments: { some: { scopeId: organizationId } } },
                    { teacher: { organizationId } },
                    { student: { enrollments: { some: { organizationId } } } },
                    { parent: { children: { some: { student: { enrollments: { some: { organizationId } } } } } } }
                ]
            });
        }

        // Account status filter
        if (status === "ACTIVE") {
            andConditions.push({ isActive: true });
        } else if (status === "DEACTIVATED") {
            andConditions.push({ isActive: false });
        }

        // Search filter
        if (search && typeof search === "string" && search.trim() !== "") {
            const q = search.trim();
            andConditions.push({
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { teacher: { employeeId: { contains: q, mode: "insensitive" } } },
                    { student: { studentId: { contains: q, mode: "insensitive" } } }
                ]
            });
        }

        // Role filter
        if (role && typeof role === "string" && role.trim() !== "" && role.trim().toUpperCase() !== "ALL") {
            const r = role.trim().toUpperCase();
            if (r === "ADMINISTRATORS" || r === "ADMIN_LEADERSHIP" || r === "LEADERSHIP") {
                andConditions.push({
                    roleAssignments: {
                        some: {
                            role: { name: { in: ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "VICE_PRINCIPAL"] } }
                        }
                    }
                });
            } else if (r === "TEACHER") {
                andConditions.push({
                    OR: [
                        { roleAssignments: { some: { role: { name: { equals: "TEACHER", mode: "insensitive" } } } } },
                        { teacher: { isNot: null } }
                    ]
                });
            } else if (r === "STUDENT") {
                andConditions.push({
                    OR: [
                        { roleAssignments: { some: { role: { name: { equals: "STUDENT", mode: "insensitive" } } } } },
                        { student: { isNot: null } }
                    ]
                });
            } else if (r === "PARENT") {
                andConditions.push({
                    OR: [
                        { roleAssignments: { some: { role: { name: { equals: "PARENT", mode: "insensitive" } } } } },
                        { parent: { isNot: null } }
                    ]
                });
            } else if (r === "SUPPORT_STAFF" || r === "STAFF" || r === "SCHOOL_SUPPORT_STAFF") {
                andConditions.push({
                    roleAssignments: {
                        some: {
                            role: { name: { in: ["SCHOOL_SUPPORT_STAFF", "SUPPORT_STAFF", "STAFF"] } }
                        }
                    }
                });
            } else {
                andConditions.push({
                    roleAssignments: {
                        some: {
                            role: { name: { equals: r, mode: "insensitive" } }
                        }
                    }
                });
            }
        }

        const baseWhere = andConditions.length > 0 ? { AND: andConditions } : {};

        // Execute total count & paginated query
        const [total, users] = await Promise.all([
            prisma.user.count({ where: baseWhere }),
            prisma.user.findMany({
                where: baseWhere,
                include: {
                    roleAssignments: {
                        include: {
                            role: true,
                            scope: true
                        }
                    },
                    teacher: {
                        select: {
                            id: true,
                            employeeId: true,
                            jobTitle: true,
                            qualification: true,
                            employmentStatus: true
                        }
                    },
                    student: {
                        select: {
                            id: true,
                            studentId: true,
                            enrollments: {
                                where: organizationId ? { organizationId } : undefined,
                                select: {
                                    status: true,
                                    schoolGrade: { include: { grade: { select: { name: true } } } },
                                    section: { select: { name: true } }
                                },
                                take: 1,
                                orderBy: { createdAt: "desc" }
                            }
                        }
                    },
                    parent: {
                        select: {
                            id: true,
                            phoneNumber: true,
                            children: {
                                select: {
                                    id: true,
                                    student: {
                                        select: {
                                            firstName: true,
                                            lastName: true,
                                            studentId: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limitNum
            })
        ]);

        const totalPages = Math.max(1, Math.ceil(total / limitNum));

        // Format user records for clean administrative display
        const formatted = users.map(u => {
            let entityInfo: any = null;
            if (u.teacher) {
                entityInfo = {
                    type: "TEACHER",
                    id: u.teacher.id,
                    identifier: u.teacher.employeeId || "Faculty",
                    jobTitle: u.teacher.jobTitle || "Teacher",
                    qualification: u.teacher.qualification || undefined
                };
            } else if (u.student) {
                const latestEnrollment = u.student.enrollments?.[0];
                entityInfo = {
                    type: "STUDENT",
                    id: u.student.id,
                    identifier: u.student.studentId || "Student",
                    gradeName: latestEnrollment?.schoolGrade?.grade?.name || undefined,
                    sectionName: latestEnrollment?.section?.name || undefined
                };
            } else if (u.parent) {
                entityInfo = {
                    type: "PARENT",
                    id: u.parent.id,
                    identifier: u.parent.phoneNumber || "Guardian",
                    linkedStudentsCount: u.parent.children?.length || 0
                };
            }

            const roles = u.roleAssignments.map(ra => ra.role.name);
            if (u.teacher && !roles.includes("TEACHER")) roles.push("TEACHER");
            if (u.student && !roles.includes("STUDENT")) roles.push("STUDENT");
            if (u.parent && !roles.includes("PARENT")) roles.push("PARENT");
            if (roles.length === 0) roles.push("USER");

            return {
                id: u.id,
                name: u.name,
                email: u.email,
                isActive: u.isActive ?? true,
                requiresPasswordChange: u.requiresPasswordChange ?? false,
                createdAt: u.createdAt,
                roles,
                primaryRole: roles[0] || "USER",
                accountType: u.teacher ? "TEACHER" : u.student ? "STUDENT" : u.parent ? "PARENT" : "USER",
                scopeName: u.roleAssignments[0]?.scope?.name || callerScope.scopeName || "School",
                entityInfo
            };
        });

        // Compute real summary metrics from DB within tenant scope
        const [activeCount, deactivatedCount] = await Promise.all([
            prisma.user.count({
                where: {
                    ...baseWhere,
                    isActive: true
                }
            }),
            prisma.user.count({
                where: {
                    ...baseWhere,
                    isActive: false
                }
            })
        ]);

        return res.json({
            users: formatted,
            items: formatted,
            page: pageNum,
            pageSize: limitNum,
            total,
            totalPages,
            pagination: {
                page: pageNum,
                pageSize: limitNum,
                total,
                totalPages
            },
            summary: {
                total,
                active: activeCount,
                deactivated: deactivatedCount
            }
        });
    } catch (error: any) {
        console.error("Error fetching users:", error);
        return res.status(500).json({ message: error.message || "Failed to fetch users." });
    }
});

// ============================================================================
// 5. UNLINKED ENTITIES (Tenant-Scoped)
// ============================================================================
router.get("/unlinked-entities", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const callerScope = await getCallerSchoolScope(session.user.id);
        if (!callerScope.isSchoolAdmin && !callerScope.isPlatformAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can view unlinked entities." });
        }

        const organizationId = callerScope.organizationId;

        const [teachers, students, parents] = await Promise.all([
            prisma.teacher.findMany({
                where: {
                    ...(organizationId ? { organizationId } : {}),
                    userId: null
                },
                select: { id: true, firstName: true, lastName: true, employeeId: true, email: true },
                orderBy: { lastName: "asc" }
            }),
            prisma.student.findMany({
                where: {
                    userId: null,
                    ...(organizationId ? { enrollments: { some: { organizationId } } } : {})
                },
                select: { id: true, firstName: true, lastName: true, studentId: true },
                orderBy: { lastName: "asc" }
            }),
            prisma.parent.findMany({
                where: {
                    userId: null,
                    ...(organizationId ? { children: { some: { student: { enrollments: { some: { organizationId } } } } } } : {})
                },
                select: { id: true, firstName: true, lastName: true, phoneNumber: true, email: true },
                orderBy: { lastName: "asc" }
            })
        ]);

        return res.json({
            teachers: teachers.map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName}`, identifier: t.employeeId || t.email })),
            students: students.map(s => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, identifier: s.studentId })),
            parents: parents.map(p => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, identifier: p.phoneNumber || p.email }))
        });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Failed to fetch unlinked entities." });
    }
});

// ============================================================================
// 6. CREATE / PROVISION USER (Tenant-Scoped & Role-Hierarchy-Protected)
// ============================================================================
router.post("/create-user", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const callerScope = await getCallerSchoolScope(session.user.id);
        if (!callerScope.isSchoolAdmin && !callerScope.isPlatformAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can create institutional users." });
        }

        const { name, email, password, roleName, teacherEntityId, studentEntityId, parentEntityId } = req.body;

        if (!name || !roleName) {
            return res.status(400).json({ message: "Name and roleName are required." });
        }

        // SECURITY: Role Hierarchy Validation
        // A School Admin can only assign school-level roles; cannot assign platform-level ADMIN
        if (!callerScope.isPlatformAdmin && roleName.toUpperCase() === "ADMIN") {
            return res.status(403).json({ message: "Forbidden: School administrators cannot grant the platform ADMIN role." });
        }

        const targetScopeId = callerScope.organizationId;
        if (!targetScopeId) {
            return res.status(400).json({ message: "No authorized school scope found for provisioning." });
        }

        // Verify linked domain entities belong to caller's school
        if (teacherEntityId) {
            const teacher = await prisma.teacher.findFirst({
                where: { id: teacherEntityId, organizationId: targetScopeId }
            });
            if (!teacher) return res.status(400).json({ message: "Teacher record not found in this school." });
        } else if (studentEntityId) {
            const student = await prisma.student.findFirst({
                where: { id: studentEntityId, enrollments: { some: { organizationId: targetScopeId } } }
            });
            if (!student) return res.status(400).json({ message: "Student record not found in this school." });
        } else if (parentEntityId) {
            const parent = await prisma.parent.findFirst({
                where: { id: parentEntityId, children: { some: { student: { enrollments: { some: { organizationId: targetScopeId } } } } } }
            });
            if (!parent) return res.status(400).json({ message: "Parent record not found in this school." });
        }

        const count = await prisma.user.count();
        const seq = String(count + 1).padStart(4, "0");
        const prefixMap: Record<string, string> = {
            STUDENT: "stu",
            TEACHER: "tch",
            PARENT: "prn",
            VICE_PRINCIPAL: "vp",
            ADMIN: "adm",
            SCHOOL_ADMIN: "adm",
            SCHOOL_SUPPORT_STAFF: "stf"
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

        // Link to existing domain entity
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

        // Assign role scoped to target school
        await assignRoleToUserByScopeId(
            newUserId,
            roleName,
            targetScopeId
        );

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: targetScopeId,
                action: "USER_CREATED",
                resource: "User",
                resourceId: newUserId,
                newValue: { email: targetEmail, name, roleName, requiresPasswordChange: true }
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

// ============================================================================
// 7. TOGGLE USER STATUS (Tenant-Scoped & Self-Protection Guard)
// ============================================================================
router.patch("/users/:id/status", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const callerScope = await getCallerSchoolScope(session.user.id);
        if (!callerScope.isSchoolAdmin && !callerScope.isPlatformAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can update user status." });
        }

        const targetUserId = req.params.id as string;
        if (targetUserId === session.user.id) {
            return res.status(400).json({ message: "You cannot deactivate your own admin account." });
        }

        // SECURITY: Tenant Scoping Check
        if (!callerScope.isPlatformAdmin && callerScope.organizationId) {
            const membership = await prisma.roleAssignment.findFirst({
                where: { userId: targetUserId, scopeId: callerScope.organizationId }
            });
            if (!membership) {
                return res.status(403).json({ message: "Forbidden: Target user does not belong to your school." });
            }
        }

        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
            return res.status(400).json({ message: "isActive parameter must be a boolean." });
        }

        const updated = await prisma.user.update({
            where: { id: targetUserId },
            data: { isActive }
        });

        // If deactivating, revoke active sessions
        if (!isActive) {
            await prisma.session.deleteMany({ where: { userId: targetUserId } });
        }

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: callerScope.organizationId || undefined,
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

// ============================================================================
// 8. RESET PASSWORD (Tenant-Scoped, Session Revocation & Forced Password Change)
// ============================================================================
router.post("/users/:id/reset-password", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const callerScope = await getCallerSchoolScope(session.user.id);
        if (!callerScope.isSchoolAdmin && !callerScope.isPlatformAdmin) {
            return res.status(403).json({ message: "Forbidden: Only administrators can reset user passwords." });
        }

        const targetUserId = req.params.id as string;

        // SECURITY: Tenant Scoping Check
        if (!callerScope.isPlatformAdmin && callerScope.organizationId) {
            const membership = await prisma.roleAssignment.findFirst({
                where: { userId: targetUserId, scopeId: callerScope.organizationId }
            });
            if (!membership) {
                return res.status(403).json({ message: "Forbidden: Target user does not belong to your school." });
            }
        }

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

        // CRITICAL: Revoke all active sessions so user is forced to sign in with temp pass
        await prisma.session.deleteMany({
            where: { userId: targetUserId }
        });

        await prisma.auditLog.create({
            data: {
                userId: session.user.id,
                organizationId: callerScope.organizationId || undefined,
                action: "USER_PASSWORD_RESET",
                resource: "User",
                resourceId: targetUserId,
                newValue: { requiresPasswordChange: true }
            }
        });

        return res.json({
            success: true,
            message: "Temporary password reset successfully and active sessions revoked.",
            temporaryPassword: tempPassword
        });
    } catch (error: any) {
        return res.status(400).json({ message: error.message || "Failed to reset password." });
    }
});

// ============================================================================
// 9. ROLES & PERMISSIONS (Live Database Query with Real Account Distribution)
// ============================================================================
router.get("/roles-and-permissions", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const callerScope = await getCallerSchoolScope(session.user.id);
        const organizationId = callerScope.organizationId;

        const roles = await prisma.role.findMany({
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                },
                assignments: {
                    where: organizationId ? { scopeId: organizationId } : undefined,
                    select: { id: true, userId: true }
                }
            },
            orderBy: { name: "asc" }
        });

        const formatted = roles.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            activeUsersCount: r.assignments.length,
            permissions: r.permissions.map(rp => ({
                id: rp.permission.id,
                name: rp.permission.name,
                description: rp.permission.description
            }))
        }));

        return res.json({ roles: formatted });
    } catch (error: any) {
        return res.status(500).json({ message: error.message || "Failed to fetch roles and permissions." });
    }
});

// ============================================================================
// 10. PROVISIONING UTILITIES (Development / Initialization)
// ============================================================================
router.post("/assign-role", async (req, res) => {
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
        return res.status(500).json({ message: "Failed to assign role" });
    }
});

router.post("/assign-permission", async (req, res) => {
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
        return res.status(500).json({ message: "Failed to assign permission" });
    }
});

export default router;
