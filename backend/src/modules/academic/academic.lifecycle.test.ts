import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { AcademicService } from "./academic.service.js";
import { 
    createAcademicYear, 
    updateAcademicYear, 
    activateAcademicYear 
} from "./academic.controller.js";
import { requirePermission } from "../authentication/authorization.middleware.js";
import { auth } from "../authentication/auth.js";
import { prisma } from "../../infrastructure/prisma/client.js";

// Mock dependencies
vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        academicYear: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        rolePermission: {
            findFirst: vi.fn(),
        },
    },
}));

vi.mock("../authentication/auth.js", () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        },
    },
}));

vi.mock("better-auth/node", () => ({
    fromNodeHeaders: vi.fn(),
}));

describe("Academic Year Lifecycle Hardening", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let nextFunction: NextFunction;

    const schoolA = "school-org-A";
    const schoolB = "school-org-B";

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

    // 1. INVALID DATES
    describe("1. Date Validation", () => {
        it("should reject creation when startDate is on or after endDate", async () => {
            await expect(AcademicService.createAcademicYear(schoolA, {
                name: "2026/2027",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2026-09-01"), // same date
                status: "PLANNED"
            })).rejects.toThrow("startDate must be before endDate");

            await expect(AcademicService.createAcademicYear(schoolA, {
                name: "2026/2027",
                startDate: new Date("2026-10-01"),
                endDate: new Date("2026-05-01"), // start after end
                status: "PLANNED"
            })).rejects.toThrow("startDate must be before endDate");
        });

        it("should reject update when updated startDate is on or after endDate", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-1",
                organizationId: schoolA,
                name: "2025/2026",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
                status: "PLANNED",
                createdAt: new Date(),
                updatedAt: new Date(),
            } as any);

            await expect(AcademicService.updateAcademicYear(schoolA, "year-1", {
                startDate: new Date("2026-07-01"), // after existing endDate (2026-06-30)
            })).rejects.toThrow("startDate must be before endDate");
        });

        it("controller should return 400 with validation message on invalid dates", async () => {
            (mockReq as any).accessScope = { id: schoolA };
            mockReq.body = {
                name: "2026/2027",
                startDate: "2026-09-01",
                endDate: "2026-08-01",
                status: "PLANNED"
            };

            await createAcademicYear(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining("startDate must be before endDate")
            }));
        });
    });

    // 2. VALID CREATION
    describe("2. Valid Creation", () => {
        it("should create academic year with status PLANNED when dates are valid", async () => {
            const mockCreated = {
                id: "year-new",
                organizationId: schoolA,
                name: "2026/2027",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "PLANNED",
            };
            vi.mocked(prisma.academicYear.create).mockResolvedValue(mockCreated as any);

            const result = await AcademicService.createAcademicYear(schoolA, {
                name: "2026/2027",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "PLANNED"
            });

            expect(result).toEqual(mockCreated);
            expect(prisma.academicYear.create).toHaveBeenCalledWith({
                data: {
                    organizationId: schoolA,
                    name: "2026/2027",
                    startDate: new Date("2026-09-01"),
                    endDate: new Date("2027-06-30"),
                    status: "PLANNED"
                }
            });
        });

        it("should reject DRAFT as an invalid status upon creation", async () => {
            await expect(AcademicService.createAcademicYear(schoolA, {
                name: "2026/2027",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "DRAFT" as any
            })).rejects.toThrow("DRAFT status is invalid. Use PLANNED, ACTIVE, COMPLETED, or ARCHIVED.");
        });

        it("controller should return 201 on valid creation", async () => {
            (mockReq as any).accessScope = { id: schoolA };
            mockReq.body = {
                name: "2026/2027",
                startDate: "2026-09-01",
                endDate: "2027-06-30",
                status: "PLANNED"
            };

            const mockCreated = {
                id: "year-new",
                organizationId: schoolA,
                ...mockReq.body,
                startDate: new Date(mockReq.body.startDate),
                endDate: new Date(mockReq.body.endDate)
            };
            vi.mocked(prisma.academicYear.create).mockResolvedValue(mockCreated as any);

            await createAcademicYear(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockCreated);
        });
    });

    // 3. DUPLICATE YEAR
    describe("3. Duplicate Year Handling", () => {
        it("controller should return 400 when duplicate key error (P2002) is thrown", async () => {
            (mockReq as any).accessScope = { id: schoolA };
            mockReq.body = {
                name: "2025/2026",
                startDate: "2025-09-01",
                endDate: "2026-06-30",
                status: "PLANNED"
            };

            const p2002Error: any = new Error("Unique constraint failed");
            p2002Error.code = "P2002";
            p2002Error.meta = { target: ["name", "organizationId"] };
            vi.mocked(prisma.academicYear.create).mockRejectedValue(p2002Error);

            await createAcademicYear(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining("already exists")
            }));
        });
    });

    // 4. VALID STATUS TRANSITIONS
    describe("4. Valid Status Transitions", () => {
        it("allows PLANNED -> ACTIVE transition", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-1",
                organizationId: schoolA,
                status: "PLANNED",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
            } as any);

            vi.mocked(prisma.academicYear.update).mockResolvedValue({
                id: "year-1",
                status: "ACTIVE"
            } as any);

            const result = await AcademicService.updateAcademicYear(schoolA, "year-1", { status: "ACTIVE" });
            expect(result.status).toBe("ACTIVE");
        });

        it("allows ACTIVE -> COMPLETED transition", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-1",
                organizationId: schoolA,
                status: "ACTIVE",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
            } as any);

            vi.mocked(prisma.academicYear.update).mockResolvedValue({
                id: "year-1",
                status: "COMPLETED"
            } as any);

            const result = await AcademicService.updateAcademicYear(schoolA, "year-1", { status: "COMPLETED" });
            expect(result.status).toBe("COMPLETED");
        });

        it("allows COMPLETED -> ARCHIVED transition", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-1",
                organizationId: schoolA,
                status: "COMPLETED",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
            } as any);

            vi.mocked(prisma.academicYear.update).mockResolvedValue({
                id: "year-1",
                status: "ARCHIVED"
            } as any);

            const result = await AcademicService.updateAcademicYear(schoolA, "year-1", { status: "ARCHIVED" });
            expect(result.status).toBe("ARCHIVED");
        });

        it("allows PLANNED -> ARCHIVED transition (cancelled year)", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-1",
                organizationId: schoolA,
                status: "PLANNED",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
            } as any);

            vi.mocked(prisma.academicYear.update).mockResolvedValue({
                id: "year-1",
                status: "ARCHIVED"
            } as any);

            const result = await AcademicService.updateAcademicYear(schoolA, "year-1", { status: "ARCHIVED" });
            expect(result.status).toBe("ARCHIVED");
        });
    });

    // 5. INVALID STATUS TRANSITIONS
    describe("5. Invalid Status Transitions", () => {
        it("should prevent COMPLETED -> ACTIVE (unsafe reactivation)", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-1",
                organizationId: schoolA,
                status: "COMPLETED",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
            } as any);

            await expect(AcademicService.updateAcademicYear(schoolA, "year-1", { status: "ACTIVE" }))
                .rejects.toThrow("Cannot transition academic year from COMPLETED to ACTIVE");
        });

        it("should prevent ARCHIVED -> ACTIVE (unsafe reactivation)", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-1",
                organizationId: schoolA,
                status: "ARCHIVED",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
            } as any);

            await expect(AcademicService.updateAcademicYear(schoolA, "year-1", { status: "ACTIVE" }))
                .rejects.toThrow("Cannot transition academic year from ARCHIVED to ACTIVE");
        });

        it("should prevent ACTIVE -> PLANNED (status regression)", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-1",
                organizationId: schoolA,
                status: "ACTIVE",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
            } as any);

            await expect(AcademicService.updateAcademicYear(schoolA, "year-1", { status: "PLANNED" }))
                .rejects.toThrow("Cannot transition academic year from ACTIVE to PLANNED");
        });

        it("should reject activateAcademicYear on COMPLETED or ARCHIVED year", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-comp",
                organizationId: schoolA,
                status: "COMPLETED",
            } as any);

            await expect(AcademicService.activateAcademicYear(schoolA, "year-comp"))
                .rejects.toThrow("Cannot activate academic year with status COMPLETED");

            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-arch",
                organizationId: schoolA,
                status: "ARCHIVED",
            } as any);

            await expect(AcademicService.activateAcademicYear(schoolA, "year-arch"))
                .rejects.toThrow("Cannot activate academic year with status ARCHIVED");
        });

        it("controller should return 400 on invalid status transition", async () => {
            (mockReq as any).accessScope = { id: schoolA };
            mockReq.params = { yearId: "year-1" };
            mockReq.body = { status: "ACTIVE" };

            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-1",
                organizationId: schoolA,
                status: "COMPLETED",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
            } as any);

            await updateAcademicYear(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining("Cannot transition academic year from COMPLETED to ACTIVE")
            }));
        });
    });

    // 6. ACTIVATION AUTHORIZATION
    describe("6. Activation Authorization", () => {
        it("should allow activation for user with ACADEMIC:UPDATE permission", async () => {
            const mockUser = { id: "admin-user", email: "admin@school.edu" };
            (auth.api.getSession as any).mockResolvedValue({ user: mockUser });
            vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue({ id: "perm-1" } as any);

            const middleware = requirePermission("ACADEMIC:UPDATE");
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalledWith(403);
        });

        it("should deny activation for user without ACADEMIC:UPDATE permission", async () => {
            const mockUser = { id: "unauth-user", email: "user@school.edu" };
            (auth.api.getSession as any).mockResolvedValue({ user: mockUser });
            vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue(null);

            const middleware = requirePermission("ACADEMIC:UPDATE");
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Forbidden" });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    // 7. TEACHER CANNOT MANAGE ACADEMIC-YEAR LIFECYCLE
    describe("7. Teacher RBAC Restriction", () => {
        it("teacher attempting to create academic year should be blocked (403)", async () => {
            const teacherUser = { id: "teacher-user-1", email: "teacher@school.edu" };
            (auth.api.getSession as any).mockResolvedValue({ user: teacherUser });
            
            // Teacher does not have ACADEMIC:CREATE
            vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue(null);

            const middleware = requirePermission("ACADEMIC:CREATE");
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Forbidden" });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it("teacher attempting to update/activate academic year should be blocked (403)", async () => {
            const teacherUser = { id: "teacher-user-1", email: "teacher@school.edu" };
            (auth.api.getSession as any).mockResolvedValue({ user: teacherUser });
            
            // Teacher does not have ACADEMIC:UPDATE
            vi.mocked(prisma.rolePermission.findFirst).mockResolvedValue(null);

            const middleware = requirePermission("ACADEMIC:UPDATE");
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Forbidden" });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });

    // 8. ONLY ONE ACTIVE YEAR PER SCHOOL
    describe("8. Single Active Year Rule", () => {
        it("activating a year demotes existing active year in the same school to COMPLETED", async () => {
            const targetYear = {
                id: "year-2",
                organizationId: schoolA,
                status: "PLANNED",
            };

            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue(targetYear as any);
            vi.mocked(prisma.academicYear.updateMany).mockResolvedValue({ count: 1 });
            vi.mocked(prisma.academicYear.update).mockResolvedValue({
                id: "year-2",
                organizationId: schoolA,
                status: "ACTIVE"
            } as any);

            await AcademicService.activateAcademicYear(schoolA, "year-2");

            // Demote other active years for schoolA
            expect(prisma.academicYear.updateMany).toHaveBeenCalledWith({
                where: {
                    organizationId: schoolA,
                    status: "ACTIVE",
                    id: { not: "year-2" }
                },
                data: { status: "COMPLETED" }
            });

            // Promoted target year to ACTIVE
            expect(prisma.academicYear.update).toHaveBeenCalledWith({
                where: { id: "year-2" },
                data: { status: "ACTIVE" }
            });
        });
    });

    // 9. ORGANIZATION / SCHOOL ISOLATION
    describe("9. Organization and School Isolation", () => {
        it("should reject activateAcademicYear for a year belonging to another school (404)", async () => {
            // Target year belongs to schoolB, but request is scoped to schoolA
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue({
                id: "year-other-school",
                organizationId: schoolB,
                status: "PLANNED",
            } as any);

            await expect(AcademicService.activateAcademicYear(schoolA, "year-other-school"))
                .rejects.toThrow("Academic Year not found");

            // In controller
            (mockReq as any).accessScope = { id: schoolA };
            mockReq.params = { yearId: "year-other-school" };

            await activateAcademicYear(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Academic Year not found" });
        });

        it("should reject updateAcademicYear for a year belonging to another school (404)", async () => {
            // findUnique with { id, organizationId: schoolA } returns null because year belongs to schoolB
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue(null);

            (mockReq as any).accessScope = { id: schoolA };
            mockReq.params = { yearId: "year-other-school" };
            mockReq.body = { name: "Attempted Hijack" };

            await updateAcademicYear(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Academic Year not found" });
        });

        it("activation in schoolA does not affect active years in schoolB", async () => {
            const targetYear = {
                id: "year-schoolA-planned",
                organizationId: schoolA,
                status: "PLANNED",
            };

            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue(targetYear as any);
            vi.mocked(prisma.academicYear.updateMany).mockResolvedValue({ count: 1 });
            vi.mocked(prisma.academicYear.update).mockResolvedValue({
                id: "year-schoolA-planned",
                organizationId: schoolA,
                status: "ACTIVE"
            } as any);

            await AcademicService.activateAcademicYear(schoolA, "year-schoolA-planned");

            // Verify updateMany query was strictly scoped to schoolA
            expect(prisma.academicYear.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        organizationId: schoolA, // strictly schoolA!
                    })
                })
            );
        });
    });
});
