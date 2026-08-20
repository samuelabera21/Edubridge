import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { getProfileHandler, updateProfileHandler, createOrganizationHandler, getHierarchyHandler } from "./school.controller.js";
import { getSchoolProfile, updateSchoolProfile, createOrganizationUnit, getOrganizationHierarchy } from "./school.service.js";
import { OrganizationUnitType, SchoolStatus } from "../../generated/prisma/enums.js";

vi.mock("./school.service.js", () => ({
    getSchoolProfile: vi.fn(),
    updateSchoolProfile: vi.fn(),
    createOrganizationUnit: vi.fn(),
    getOrganizationHierarchy: vi.fn(),
}));

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        academicYear: {
            findFirst: vi.fn().mockResolvedValue({ id: "ay1", name: "2025-2026" }),
            findMany: vi.fn().mockResolvedValue([]),
        },
        teacher: {
            count: vi.fn().mockResolvedValue(10),
        },
        student: {
            count: vi.fn().mockResolvedValue(200),
        },
        section: {
            count: vi.fn().mockResolvedValue(5),
        },
    }
}));

describe("School Controller", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
        };
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        vi.clearAllMocks();
    });

    describe("getHierarchyHandler", () => {
        it("should return 403 if scope is missing", async () => {
            await getHierarchyHandler(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Invalid or missing scope" });
        });

        it("should return hierarchy if authorized", async () => {
            (mockReq as any).accessScope = { id: "school1", type: "SCHOOL" };
            const mockHierarchy = { id: "school1", children: [] };
            vi.mocked(getOrganizationHierarchy).mockResolvedValue(mockHierarchy as any);

            await getHierarchyHandler(mockReq as Request, mockRes as Response);
            
            expect(getOrganizationHierarchy).toHaveBeenCalledWith("school1");
            expect(mockRes.json).toHaveBeenCalledWith(mockHierarchy);
        });
    });

    describe("createOrganizationHandler", () => {
        it("should return 400 if validation fails", async () => {
            mockReq.body = { name: "Test School" }; // Missing type
            
            await createOrganizationHandler(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Name and type are required" });
        });

        it("should return 403 if wrong-school or missing scope", async () => {
            mockReq.body = { name: "Test School", type: "SCHOOL" };
            
            await createOrganizationHandler(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Invalid or missing scope" });
        });

        it("should create organization if authorized", async () => {
            (mockReq as any).accessScope = { id: "region1", type: "REGION" };
            mockReq.body = { name: "Test School", type: "SCHOOL", parentId: "zone1" };
            
            const mockOrg = { id: "school1", name: "Test School", type: "SCHOOL" };
            vi.mocked(createOrganizationUnit).mockResolvedValue(mockOrg as any);

            await createOrganizationHandler(mockReq as Request, mockRes as Response);
            
            expect(createOrganizationUnit).toHaveBeenCalledWith("Test School", "SCHOOL", "zone1");
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockOrg);
        });
    });

    describe("getProfileHandler", () => {
        it("should return 403 if scope is not SCHOOL", async () => {
            (mockReq as any).accessScope = { id: "woreda1", type: "WOREDA" };
            
            await getProfileHandler(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Invalid or missing school scope" });
        });

        it("should return profile successfully for authorized school", async () => {
            (mockReq as any).accessScope = { id: "school1", type: "SCHOOL" };
            const mockProfile = { id: "prof1", establishedYear: 2000 };
            vi.mocked(getSchoolProfile).mockResolvedValue(mockProfile as any);

            await getProfileHandler(mockReq as Request, mockRes as Response);

            expect(getSchoolProfile).toHaveBeenCalledWith("school1");
            expect(mockRes.json).toHaveBeenCalledWith({
                school: { id: "school1", type: "SCHOOL" },
                profile: mockProfile,
                stats: {
                    totalTeachers: 10,
                    totalStudents: 200,
                    activeSections: 5,
                },
                academicYears: [],
            });
        });
    });

    describe("updateProfileHandler", () => {
        it("should update profile for authorized school", async () => {
            (mockReq as any).accessScope = { id: "school1", type: "SCHOOL" };
            mockReq.body = { establishedYear: 2010, status: "ACTIVE", configuration: { theme: "dark" } };
            
            const mockProfile = { id: "prof1", establishedYear: 2010, status: "ACTIVE", configuration: { theme: "dark" } };
            vi.mocked(updateSchoolProfile).mockResolvedValue(mockProfile as any);

            await updateProfileHandler(mockReq as Request, mockRes as Response);

            expect(updateSchoolProfile).toHaveBeenCalledWith("school1", expect.objectContaining({
                establishedYear: 2010,
                status: "ACTIVE",
                configuration: { theme: "dark" },
            }));
            expect(mockRes.json).toHaveBeenCalledWith({
                message: "Profile updated successfully",
                profile: mockProfile,
            });
        });
    });
});
