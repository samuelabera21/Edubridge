import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    recordStudentAttendance, getStudentAttendance, 
    recordTeacherAttendance, getTeacherAttendance 
} from "./attendance.controller.js";
import { AttendanceService } from "./attendance.service.js";

vi.mock("./attendance.service.js", () => ({
    AttendanceService: {
        recordStudentAttendance: vi.fn(),
        getStudentAttendance: vi.fn(),
        recordTeacherAttendance: vi.fn(),
        getTeacherAttendance: vi.fn()
    }
}));

describe("Attendance Controller", () => {
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

    describe("recordStudentAttendance", () => {
        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { academicYearId: "ay1" }; // missing other fields
            
            await recordStudentAttendance(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should record student attendance", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                academicYearId: "ay1", 
                enrollmentId: "enr1", 
                date: "2023-10-01", 
                status: "PRESENT" 
            };
            
            const mockAttendance = { id: "att1" };
            vi.mocked(AttendanceService.recordStudentAttendance).mockResolvedValue(mockAttendance as any);

            await recordStudentAttendance(mockReq as Request, mockRes as Response);

            expect(AttendanceService.recordStudentAttendance).toHaveBeenCalledWith("school1", expect.objectContaining({ status: "PRESENT" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockAttendance);
        });
    });

    describe("recordTeacherAttendance", () => {
        it("should record teacher attendance", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                academicYearId: "ay1", 
                teacherId: "t1", 
                date: "2023-10-01", 
                status: "LATE" 
            };
            
            const mockAttendance = { id: "att2" };
            vi.mocked(AttendanceService.recordTeacherAttendance).mockResolvedValue(mockAttendance as any);

            await recordTeacherAttendance(mockReq as Request, mockRes as Response);

            expect(AttendanceService.recordTeacherAttendance).toHaveBeenCalledWith("school1", expect.objectContaining({ status: "LATE" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockAttendance);
        });
    });
});
