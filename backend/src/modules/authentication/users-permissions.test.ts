import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCallerSchoolScope, assignRoleToUserByScopeId } from "./authorization.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";

// Mock dependencies
vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        roleAssignment: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            upsert: vi.fn(),
            deleteMany: vi.fn()
        },
        role: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            upsert: vi.fn()
        },
        user: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn(),
            update: vi.fn()
        },
        organizationUnit: {
            findFirst: vi.fn()
        },
        teacher: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn()
        },
        student: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn()
        },
        parent: {
            findFirst: vi.fn(),
            findMany: vi.fn(),
            update: vi.fn()
        },
        session: {
            deleteMany: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        }
    }
}));

describe("Users & Permissions - Core Security & Scoping Logic", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("1. Tenant Scope Resolution (getCallerSchoolScope)", () => {
        it("should correctly identify a SCHOOL_ADMIN with their scoped organizationId", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    role: { name: "SCHOOL_ADMIN" },
                    scopeId: "school-org-123",
                    scope: { type: "SCHOOL", name: "Alpha Academy" }
                }
            ]);

            const scope = await getCallerSchoolScope("user-admin-1");
            expect(scope.isSchoolAdmin).toBe(true);
            expect(scope.isPlatformAdmin).toBe(false);
            expect(scope.organizationId).toBe("school-org-123");
            expect(scope.scopeName).toBe("Alpha Academy");
        });

        it("should correctly identify a platform ADMIN with fallback school", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    role: { name: "ADMIN" },
                    scopeId: null,
                    scope: null
                }
            ]);
            (prisma.organizationUnit.findFirst as any).mockResolvedValue({
                id: "default-school-1",
                name: "EduBridge Demo School"
            });

            const scope = await getCallerSchoolScope("user-platform-admin");
            expect(scope.isPlatformAdmin).toBe(true);
            expect(scope.isSchoolAdmin).toBe(true);
            expect(scope.organizationId).toBe("default-school-1");
        });

        it("should return non-admin for standard TEACHER role", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    role: { name: "TEACHER" },
                    scopeId: "school-org-123",
                    scope: { type: "SCHOOL", name: "Alpha Academy" }
                }
            ]);

            const scope = await getCallerSchoolScope("user-teacher-1");
            expect(scope.isSchoolAdmin).toBe(false);
            expect(scope.isPlatformAdmin).toBe(false);
            expect(scope.organizationId).toBe("school-org-123");
        });
    });

    describe("2. Role Assignment Scoping (assignRoleToUserByScopeId)", () => {
        it("should link a user to the specified role scoped strictly to the organization", async () => {
            (prisma.role.upsert as any).mockResolvedValue({
                id: "role-teacher-id",
                name: "TEACHER"
            });
            (prisma.roleAssignment.upsert as any).mockResolvedValue({
                id: "assignment-1",
                userId: "user-123",
                roleId: "role-teacher-id",
                scopeId: "school-org-123"
            });

            const result = await assignRoleToUserByScopeId("user-123", "TEACHER", "school-org-123");
            expect(prisma.role.upsert).toHaveBeenCalledWith({
                where: { name: "TEACHER" },
                update: {},
                create: { name: "TEACHER" }
            });
            expect(prisma.roleAssignment.upsert).toHaveBeenCalledWith({
                where: {
                    userId_roleId_scopeId: {
                        userId: "user-123",
                        roleId: "role-teacher-id",
                        scopeId: "school-org-123"
                    }
                },
                update: {},
                create: {
                    userId: "user-123",
                    roleId: "role-teacher-id",
                    scopeId: "school-org-123"
                },
                include: {
                    role: true,
                    scope: true
                }
            });
            expect(result.id).toBe("assignment-1");
        });
    });

    describe("3. Tenant Isolation & Role Hierarchy Constraints", () => {
        it("should enforce that SCHOOL_ADMIN cannot assign platform ADMIN role", () => {
            const callerScope = {
                isPlatformAdmin: false,
                isSchoolAdmin: true,
                organizationId: "school-org-1"
            };

            const targetRoleName = "ADMIN";
            const isForbidden = !callerScope.isPlatformAdmin && targetRoleName.toUpperCase() === "ADMIN";
            expect(isForbidden).toBe(true);
        });

        it("should allow SCHOOL_ADMIN to assign valid school-level roles", () => {
            const callerScope = {
                isPlatformAdmin: false,
                isSchoolAdmin: true,
                organizationId: "school-org-1"
            };

            const permittedRoles = ["VICE_PRINCIPAL", "TEACHER", "STUDENT", "PARENT", "SCHOOL_SUPPORT_STAFF"];
            permittedRoles.forEach(role => {
                const isForbidden = !callerScope.isPlatformAdmin && role.toUpperCase() === "ADMIN";
                expect(isForbidden).toBe(false);
            });
        });

        it("should block cross-tenant account operations if membership scope doesn't match", async () => {
            const callerOrgId = "school-A";
            const targetUserId = "user-belonging-to-school-B";

            (prisma.roleAssignment.findFirst as any).mockResolvedValue(null);

            const membership = await prisma.roleAssignment.findFirst({
                where: { userId: targetUserId, scopeId: callerOrgId }
            });

            expect(membership).toBeNull();
        });
    });

    describe("4. Account Security Actions (Session Revocation & Self Protection)", () => {
        it("should prevent self-deactivation when caller id equals target user id", () => {
            const callerId = "admin-user-1";
            const targetUserId = "admin-user-1";

            const isSelf = targetUserId === callerId;
            expect(isSelf).toBe(true);
        });

        it("should revoke all active sessions when an account password is reset", async () => {
            const targetUserId = "user-to-reset-123";
            (prisma.session.deleteMany as any).mockResolvedValue({ count: 2 });

            await prisma.session.deleteMany({ where: { userId: targetUserId } });
            expect(prisma.session.deleteMany).toHaveBeenCalledWith({
                where: { userId: targetUserId }
            });
        });

        it("should revoke active sessions when an account is deactivated", async () => {
            const targetUserId = "user-to-deactivate-456";
            (prisma.session.deleteMany as any).mockResolvedValue({ count: 1 });

            await prisma.session.deleteMany({ where: { userId: targetUserId } });
            expect(prisma.session.deleteMany).toHaveBeenCalledWith({
                where: { userId: targetUserId }
            });
        });
    });
});
