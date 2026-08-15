import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { createTeacher, getTeachers, assignTeacher, getAssignments } from "./teacher.controller.js";
import { TeacherService } from "./teacher.service.js";

vi.mock("./teacher.service.js", () => ({
    TeacherService: {
        createTeacher: vi.fn(),
        getTeachers: vi.fn(),
        assignTeacher: vi.fn(),
        getAssignments: vi.fn()
    }
}));

describe("Teacher Controller", () => {
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

    describe("createTeacher", () => {
        it("should return 403 if missing scope", async () => {
            await createTeacher(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it("should create teacher successfully", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { firstName: "John", lastName: "Doe" };
            
            const mockTeacher = { id: "t1" };
            vi.mocked(TeacherService.createTeacher).mockResolvedValue(mockTeacher as any);

            await createTeacher(mockReq as Request, mockRes as Response);

            expect(TeacherService.createTeacher).toHaveBeenCalledWith("school1", expect.objectContaining({ firstName: "John" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockTeacher);
        });
    });

    describe("assignTeacher", () => {
        it("should assign teacher", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                teacherId: "t1", 
                academicYearId: "ay1", 
                subjectId: "sub1", 
                schoolGradeId: "sg1" 
            };

            const mockAssignment = { id: "a1" };
            vi.mocked(TeacherService.assignTeacher).mockResolvedValue(mockAssignment as any);

            await assignTeacher(mockReq as Request, mockRes as Response);

            expect(TeacherService.assignTeacher).toHaveBeenCalledWith("school1", expect.objectContaining({ teacherId: "t1" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockAssignment);
        });
    });
});
