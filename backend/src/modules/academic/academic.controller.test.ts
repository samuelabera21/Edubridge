import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    getAcademicYears, createAcademicYear, activateAcademicYear,
    createAcademicCalendar, createAcademicPeriod,
    getGrades, createGrade, getSchoolGrades, createSchoolGrade,
    getSections, createSection, getSubjects, createSubject, createSchoolSubject
} from "./academic.controller.js";
import { AcademicService } from "./academic.service.js";

vi.mock("./academic.service.js", () => ({
    AcademicService: {
        getAcademicYears: vi.fn(),
        createAcademicYear: vi.fn(),
        activateAcademicYear: vi.fn(),
        createAcademicCalendar: vi.fn(),
        createAcademicPeriod: vi.fn(),
        getGrades: vi.fn(),
        createGrade: vi.fn(),
        getSchoolGrades: vi.fn(),
        createSchoolGrade: vi.fn(),
        getSections: vi.fn(),
        createSection: vi.fn(),
        getSubjects: vi.fn(),
        createSubject: vi.fn(),
        createSchoolSubject: vi.fn(),
    }
}));

describe("Academic Controller", () => {
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

    describe("createAcademicYear", () => {
        it("should return 403 if missing scope", async () => {
            await createAcademicYear(mockReq as Request, mockRes as Response);
            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing school scope" });
        });

        it("should create academic year when authorized", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { name: "2018 E.C.", startDate: "2025-09-01", endDate: "2026-06-30", status: "PLANNED" };
            
            const mockYear = { id: "year1", name: "2018 E.C." };
            vi.mocked(AcademicService.createAcademicYear).mockResolvedValue(mockYear as any);

            await createAcademicYear(mockReq as Request, mockRes as Response);

            expect(AcademicService.createAcademicYear).toHaveBeenCalledWith("school1", mockReq.body);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockYear);
        });
    });

    describe("activateAcademicYear", () => {
        it("should activate year", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.params = { yearId: "year1" };
            
            vi.mocked(AcademicService.activateAcademicYear).mockResolvedValue({ id: "year1", status: "ACTIVE" } as any);

            await activateAcademicYear(mockReq as Request, mockRes as Response);

            expect(AcademicService.activateAcademicYear).toHaveBeenCalledWith("school1", "year1");
            expect(mockRes.json).toHaveBeenCalledWith({ id: "year1", status: "ACTIVE" });
        });
    });

    describe("createSchoolGrade", () => {
        it("should create school grade", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.params = { yearId: "year1" };
            mockReq.body = { gradeId: "grade1" };
            
            const mockSchoolGrade = { id: "sg1" };
            vi.mocked(AcademicService.createSchoolGrade).mockResolvedValue(mockSchoolGrade as any);

            await createSchoolGrade(mockReq as Request, mockRes as Response);

            expect(AcademicService.createSchoolGrade).toHaveBeenCalledWith("school1", "year1", "grade1");
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockSchoolGrade);
        });
    });

    describe("createSection", () => {
        it("should create section", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.params = { schoolGradeId: "sg1" };
            mockReq.body = { name: "9A", capacity: 50 };
            
            const mockSection = { id: "sec1", name: "9A" };
            vi.mocked(AcademicService.createSection).mockResolvedValue(mockSection as any);

            await createSection(mockReq as Request, mockRes as Response);

            expect(AcademicService.createSection).toHaveBeenCalledWith("school1", "sg1", "9A", 50);
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockSection);
        });
    });
});
