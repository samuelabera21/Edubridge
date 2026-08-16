import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createTeacher, 
    getTeachers, 
    assignTeacher, 
    getAssignments,
    getMyClasses,
    getMyTimetable,
    getMyStudents,
    getDashboardSummary,
    reportIssue,
    getMyIssues
} from "./teacher.controller.js";
import { TeacherService } from "./teacher.service.js";

vi.mock("./teacher.service.js", () => ({
    TeacherService: {
        createTeacher: vi.fn(),
        getTeachers: vi.fn(),
        assignTeacher: vi.fn(),
        getAssignments: vi.fn(),
        getMyClasses: vi.fn(),
        getMyTimetable: vi.fn(),
        getMyStudents: vi.fn(),
        getDashboardSummary: vi.fn(),
        reportIssue: vi.fn(),
        getMyIssues: vi.fn()
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

    describe("getMyClasses", () => {
        it("should return 403 if unauthenticated or missing scope", async () => {
            await getMyClasses(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it("should return my classes for authenticated teacher", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "u1" };

            const mockClasses = [{ assignment: { id: "a1" }, students: [] }];
            vi.mocked(TeacherService.getMyClasses).mockResolvedValue(mockClasses as any);

            await getMyClasses(mockReq as Request, mockRes as Response);

            expect(TeacherService.getMyClasses).toHaveBeenCalledWith("u1", "school1");
            expect(mockRes.json).toHaveBeenCalledWith(mockClasses);
        });
    });

    describe("getDashboardSummary", () => {
        it("should return 403 if unauthenticated or missing scope", async () => {
            await getDashboardSummary(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it("should return summary for authenticated teacher", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "u1" };

            const mockSummary = {
                todayClasses: [],
                totalStudents: 30,
                pendingAssessmentsCount: 2,
                pendingSubmissionsCount: 5,
                studentsRequiringAttention: [],
                aiTeachingInsights: { summary: "Good day!", priorities: [] }
            };

            vi.mocked(TeacherService.getDashboardSummary).mockResolvedValue(mockSummary as any);

            await getDashboardSummary(mockReq as Request, mockRes as Response);

            expect(TeacherService.getDashboardSummary).toHaveBeenCalledWith("u1", "school1");
            expect(mockRes.json).toHaveBeenCalledWith(mockSummary);
        });
    });

    describe("reportIssue", () => {
        it("should return 400 if title is missing", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "u1" };
            mockReq.body = {};

            await reportIssue(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should report issue successfully", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            (mockReq as any).user = { id: "u1" };
            mockReq.body = { title: "Shortage of textbooks" };

            const mockIssue = { id: "i1", title: "Shortage of textbooks" };
            vi.mocked(TeacherService.reportIssue).mockResolvedValue(mockIssue as any);

            await reportIssue(mockReq as Request, mockRes as Response);

            expect(TeacherService.reportIssue).toHaveBeenCalledWith("u1", "school1", expect.objectContaining({ title: "Shortage of textbooks" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockIssue);
        });
    });
});
