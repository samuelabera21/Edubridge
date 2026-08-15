import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createStudent, getStudents, enrollStudent, 
    getEnrollments, transferStudent, updateStudentStatus
} from "./student.controller.js";
import { StudentService } from "./student.service.js";

vi.mock("./student.service.js", () => ({
    StudentService: {
        createStudent: vi.fn(),
        getStudents: vi.fn(),
        enrollStudent: vi.fn(),
        getEnrollments: vi.fn(),
        transferStudent: vi.fn(),
        updateStudentStatus: vi.fn(),
    }
}));

describe("Student Controller", () => {
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

    describe("enrollStudent", () => {
        it("should return 403 if missing school scope", async () => {
            await enrollStudent(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing school scope" });
        });

        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { studentId: "s1" }; // missing year and grade
            
            await enrollStudent(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "studentId, academicYearId, and schoolGradeId are required" });
        });

        it("should enroll student successfully", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { studentId: "s1", academicYearId: "ay1", schoolGradeId: "sg1" };
            
            const mockEnrollment = { id: "enr1" };
            vi.mocked(StudentService.enrollStudent).mockResolvedValue(mockEnrollment as any);

            await enrollStudent(mockReq as Request, mockRes as Response);

            expect(StudentService.enrollStudent).toHaveBeenCalledWith("school1", "s1", "ay1", "sg1", undefined);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockEnrollment);
        });
    });

    describe("transferStudent", () => {
        it("should transfer student mid-year", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.params = { enrollmentId: "enr1" };
            mockReq.body = { targetSchoolGradeId: "sg2", targetSectionId: "sec2", reason: "Moved" };

            const mockNewEnrollment = { id: "enr2" };
            vi.mocked(StudentService.transferStudent).mockResolvedValue(mockNewEnrollment as any);

            await transferStudent(mockReq as Request, mockRes as Response);

            expect(StudentService.transferStudent).toHaveBeenCalledWith("school1", "enr1", "sg2", "sec2", "Moved");
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockNewEnrollment);
        });
    });

    describe("updateStudentStatus", () => {
        it("should update student status to dropped out", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.params = { enrollmentId: "enr1" };
            mockReq.body = { status: "DROPPED_OUT", reason: "Left school" };

            const mockUpdate = { id: "enr1", status: "DROPPED_OUT" };
            vi.mocked(StudentService.updateStudentStatus).mockResolvedValue(mockUpdate as any);

            await updateStudentStatus(mockReq as Request, mockRes as Response);

            expect(StudentService.updateStudentStatus).toHaveBeenCalledWith("school1", "enr1", "DROPPED_OUT", "Left school");
            expect(mockRes.json).toHaveBeenCalledWith(mockUpdate);
        });
    });
});
