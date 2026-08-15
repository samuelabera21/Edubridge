import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createAssessment, getAssessments, 
    recordResult, getStudentResults 
} from "./assessment.controller.js";
import { AssessmentService } from "./assessment.service.js";

vi.mock("./assessment.service.js", () => ({
    AssessmentService: {
        createAssessment: vi.fn(),
        getAssessments: vi.fn(),
        recordResult: vi.fn(),
        getStudentResults: vi.fn()
    }
}));

describe("Assessment Controller", () => {
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

    describe("createAssessment", () => {
        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { title: "Midterm" }; // missing other fields
            
            await createAssessment(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should create assessment", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                academicYearId: "ay1", 
                teachingAssignmentId: "ta1", 
                title: "Midterm", 
                maxScore: 100 
            };
            
            const mockAssessment = { id: "a1" };
            vi.mocked(AssessmentService.createAssessment).mockResolvedValue(mockAssessment as any);

            await createAssessment(mockReq as Request, mockRes as Response);

            expect(AssessmentService.createAssessment).toHaveBeenCalledWith("school1", expect.objectContaining({ maxScore: 100 }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockAssessment);
        });
    });

    describe("recordResult", () => {
        it("should record student result", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                assessmentId: "a1", 
                enrollmentId: "enr1", 
                score: 85.5 
            };
            
            const mockResult = { id: "r1" };
            vi.mocked(AssessmentService.recordResult).mockResolvedValue(mockResult as any);

            await recordResult(mockReq as Request, mockRes as Response);

            expect(AssessmentService.recordResult).toHaveBeenCalledWith("school1", expect.objectContaining({ score: 85.5 }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockResult);
        });
    });
});
