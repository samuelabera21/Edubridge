import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import {
    getPlacementWorkspaceHandler,
    assignStudentHandler,
    bulkAssignStudentsHandler,
    reassignStudentSectionHandler,
    getSectionRosterHandler,
    getEnrollmentPlacementHistoryHandler
} from "./student.placement.controller.js";
import { StudentPlacementService } from "./student.placement.service.js";

vi.mock("./student.placement.service.js", () => ({
    StudentPlacementService: {
        getPlacementWorkspace: vi.fn(),
        assignStudent: vi.fn(),
        bulkAssignStudents: vi.fn(),
        reassignStudentSection: vi.fn(),
        getSectionRoster: vi.fn(),
        getEnrollmentPlacementHistory: vi.fn(),
    }
}));

describe("Student Placement Controller", () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;

    beforeEach(() => {
        mockReq = {
            body: {},
            params: {},
            query: {},
        };
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        vi.clearAllMocks();
    });

    describe("getPlacementWorkspaceHandler", () => {
        it("returns 403 when school scope is missing", async () => {
            await getPlacementWorkspaceHandler(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing school scope" });
        });

        it("loads placement workspace successfully", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            mockReq.query = { academicYearId: "ay-1", schoolGradeId: "grade-1" };

            const mockData = { academicYear: { id: "ay-1" }, sections: [] };
            vi.mocked(StudentPlacementService.getPlacementWorkspace).mockResolvedValue(mockData as any);

            await getPlacementWorkspaceHandler(mockReq as Request, mockRes as Response);

            expect(StudentPlacementService.getPlacementWorkspace).toHaveBeenCalledWith("school-1", {
                academicYearId: "ay-1",
                schoolGradeId: "grade-1"
            });
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockData);
        });

        it("returns 400 when workspace loading fails", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            vi.mocked(StudentPlacementService.getPlacementWorkspace).mockRejectedValue(new Error("Database error"));

            await getPlacementWorkspaceHandler(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
        });
    });

    describe("assignStudentHandler", () => {
        it("returns 403 when school scope is missing", async () => {
            await assignStudentHandler(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it("returns 400 when parameters are missing", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            mockReq.body = { enrollmentId: "enr-1" }; // missing sectionId

            await assignStudentHandler(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "enrollmentId and sectionId are required" });
        });

        it("assigns student successfully", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            (mockReq as any).user = { id: "user-1" };
            mockReq.body = { enrollmentId: "enr-1", sectionId: "sec-1" };

            const mockResult = { id: "enr-1", sectionId: "sec-1" };
            vi.mocked(StudentPlacementService.assignStudent).mockResolvedValue(mockResult as any);

            await assignStudentHandler(mockReq as Request, mockRes as Response);

            expect(StudentPlacementService.assignStudent).toHaveBeenCalledWith("school-1", "enr-1", "sec-1", "user-1");
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockResult);
        });

        it("returns 409 when capacity is exceeded", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            mockReq.body = { enrollmentId: "enr-1", sectionId: "sec-1" };

            vi.mocked(StudentPlacementService.assignStudent).mockRejectedValue(new Error("SECTION_CAPACITY_EXCEEDED: Full"));

            await assignStudentHandler(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(409);
        });
    });

    describe("bulkAssignStudentsHandler", () => {
        it("returns 403 when school scope is missing", async () => {
            await bulkAssignStudentsHandler(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it("returns 400 when enrollmentIds is empty or not an array", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            mockReq.body = { enrollmentIds: [], sectionId: "sec-1" };

            await bulkAssignStudentsHandler(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("bulk assigns successfully", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            (mockReq as any).user = { id: "user-1" };
            mockReq.body = { enrollmentIds: ["enr-1", "enr-2"], sectionId: "sec-1" };

            const mockResult = { count: 2 };
            vi.mocked(StudentPlacementService.bulkAssignStudents).mockResolvedValue(mockResult as any);

            await bulkAssignStudentsHandler(mockReq as Request, mockRes as Response);

            expect(StudentPlacementService.bulkAssignStudents).toHaveBeenCalledWith(
                "school-1",
                ["enr-1", "enr-2"],
                "sec-1",
                "user-1"
            );
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockResult);
        });
    });

    describe("reassignStudentSectionHandler", () => {
        it("returns 403 when school scope is missing", async () => {
            await reassignStudentSectionHandler(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it("returns 400 when fields are missing", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            mockReq.body = { enrollmentId: "enr-1" };

            await reassignStudentSectionHandler(mockReq as Request, mockRes as Response);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("reassigns section successfully", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            (mockReq as any).user = { id: "user-1" };
            mockReq.body = { enrollmentId: "enr-1", targetSectionId: "sec-2", reason: "Balancing" };

            const mockResult = { id: "enr-1", sectionId: "sec-2" };
            vi.mocked(StudentPlacementService.reassignStudentSection).mockResolvedValue(mockResult as any);

            await reassignStudentSectionHandler(mockReq as Request, mockRes as Response);

            expect(StudentPlacementService.reassignStudentSection).toHaveBeenCalledWith(
                "school-1",
                { enrollmentId: "enr-1", targetSectionId: "sec-2", reason: "Balancing" },
                "user-1"
            );
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockResult);
        });
    });

    describe("getSectionRosterHandler", () => {
        it("returns 403 when school scope is missing", async () => {
            await getSectionRosterHandler(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it("fetches section roster successfully", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            mockReq.params = { sectionId: "sec-1" };
            mockReq.query = { sortBy: "name", sortOrder: "asc" };

            const mockRoster = { section: { id: "sec-1" }, students: [] };
            vi.mocked(StudentPlacementService.getSectionRoster).mockResolvedValue(mockRoster as any);

            await getSectionRosterHandler(mockReq as Request, mockRes as Response);

            expect(StudentPlacementService.getSectionRoster).toHaveBeenCalledWith("school-1", "sec-1", {
                sortBy: "name",
                sortOrder: "asc"
            });
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(mockRoster);
        });
    });

    describe("getEnrollmentPlacementHistoryHandler", () => {
        it("returns 403 when school scope is missing", async () => {
            await getEnrollmentPlacementHistoryHandler(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it("fetches placement history successfully", async () => {
            (mockReq as any).accessScope = { id: "school-1" };
            mockReq.params = { enrollmentId: "enr-1" };

            const mockHistory = [{ id: "log-1", action: "SECTION_ASSIGNED" }];
            vi.mocked(StudentPlacementService.getEnrollmentPlacementHistory).mockResolvedValue(mockHistory as any);

            await getEnrollmentPlacementHistoryHandler(mockReq as Request, mockRes as Response);

            expect(StudentPlacementService.getEnrollmentPlacementHistory).toHaveBeenCalledWith("school-1", "enr-1");
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ enrollmentId: "enr-1", history: mockHistory });
        });
    });
});
