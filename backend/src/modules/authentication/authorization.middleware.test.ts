import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requireAuth, requireScope, requirePermission, requireOrganizationAccess } from "./authorization.middleware.js";
import { auth } from "../authentication/auth.js";
import { prisma } from "../../infrastructure/prisma/client.js";

// Mock dependencies
vi.mock("../authentication/auth.js", () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        },
    },
}));

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        roleAssignment: {
            findFirst: vi.fn(),
        },
        rolePermission: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock("better-auth/node", () => ({
    fromNodeHeaders: vi.fn(),
}));

describe("Authorization Middleware", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockReq = {
            headers: {},
            params: {},
            body: {},
            query: {},
        };
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        nextFunction = vi.fn();
        vi.clearAllMocks();
    });

    describe("requireAuth", () => {
        it("should return 401 if unauthenticated", async () => {
            (auth.api.getSession as any).mockResolvedValue(null);
            
            const middleware = requireAuth();
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Unauthorized" });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it("should call next and set user if authenticated", async () => {
            const mockUser = { id: "user1" };
            (auth.api.getSession as any).mockResolvedValue({ user: mockUser });
            
            const middleware = requireAuth();
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect((mockReq as any).user).toEqual(mockUser);
        });
    });

    describe("requireOrganizationAccess", () => {
        it("should return 401 if unauthenticated", async () => {
            (auth.api.getSession as any).mockResolvedValue(null);
            
            const middleware = requireOrganizationAccess();
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it("should return 403 for wrong-school access", async () => {
            const mockUser = { id: "user1" };
            (auth.api.getSession as any).mockResolvedValue({ user: mockUser });
            (prisma.roleAssignment.findFirst as any).mockResolvedValue(null);
            
            mockReq.params = { organizationId: "school2" };

            const middleware = requireOrganizationAccess();
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(prisma.roleAssignment.findFirst).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: "user1", scopeId: "school2" }
                })
            );
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Forbidden: Wrong organization/school scope",
            }));
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it("should call next for valid school-scoped access", async () => {
            const mockUser = { id: "user1" };
            const mockScope = { id: "school1", name: "School One" };
            
            (auth.api.getSession as any).mockResolvedValue({ user: mockUser });
            (prisma.roleAssignment.findFirst as any).mockResolvedValue({ scope: mockScope });
            
            mockReq.params = { organizationId: "school1" };

            const middleware = requireOrganizationAccess();
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect((mockReq as any).accessScope).toEqual(mockScope);
        });
    });
    
    describe("requireScope", () => {
        it("should return 403 if user lacks required scope type", async () => {
            (auth.api.getSession as any).mockResolvedValue({ user: { id: "user1" } });
            (prisma.roleAssignment.findFirst as any).mockResolvedValue(null);
            
            const middleware = requireScope("SCHOOL");
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "No authorized scope" });
        });
    });
});
