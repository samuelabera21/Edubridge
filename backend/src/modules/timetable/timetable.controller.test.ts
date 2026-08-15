import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createClassPeriod, getClassPeriods, 
    assignTimetable, getTimetableForSection, getTimetableForTeacher 
} from "./timetable.controller.js";
import { TimetableService } from "./timetable.service.js";

vi.mock("./timetable.service.js", () => ({
    TimetableService: {
        createClassPeriod: vi.fn(),
        getClassPeriods: vi.fn(),
        assignTimetable: vi.fn(),
        getTimetableForSection: vi.fn(),
        getTimetableForTeacher: vi.fn()
    }
}));

describe("Timetable Controller", () => {
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

    describe("createClassPeriod", () => {
        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { name: "Period 1" }; // missing start/endTime
            
            await createClassPeriod(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should create class period", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { name: "Period 1", startTime: "08:00", endTime: "08:45" };
            
            const mockPeriod = { id: "cp1" };
            vi.mocked(TimetableService.createClassPeriod).mockResolvedValue(mockPeriod as any);

            await createClassPeriod(mockReq as Request, mockRes as Response);

            expect(TimetableService.createClassPeriod).toHaveBeenCalledWith("school1", expect.objectContaining({ name: "Period 1" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockPeriod);
        });
    });

    describe("assignTimetable", () => {
        it("should assign timetable successfully", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                academicYearId: "ay1", 
                teachingAssignmentId: "ta1", 
                classPeriodId: "cp1", 
                dayOfWeek: 1 
            };

            const mockTimetable = { id: "tt1" };
            vi.mocked(TimetableService.assignTimetable).mockResolvedValue(mockTimetable as any);

            await assignTimetable(mockReq as Request, mockRes as Response);

            expect(TimetableService.assignTimetable).toHaveBeenCalledWith("school1", expect.objectContaining({ dayOfWeek: 1 }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockTimetable);
        });
    });
});
