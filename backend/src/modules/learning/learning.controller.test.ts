import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createActivity, getActivities, 
    submitActivity, raiseSupportFlag, getSupportFlags
} from "./learning.controller.js";
import { LearningService } from "./learning.service.js";

vi.mock("./learning.service.js", () => ({
    LearningService: {
        createActivity: vi.fn(),
        getActivities: vi.fn(),
        submitActivity: vi.fn(),
        raiseSupportFlag: vi.fn(),
        getSupportFlags: vi.fn()
    }
}));

describe("Learning Controller", () => {
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

    describe("createActivity", () => {
        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { title: "Homework 1" }; // missing other fields
            
            await createActivity(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should create activity", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                academicYearId: "ay1", 
                teachingAssignmentId: "ta1", 
                title: "Homework 1"
            };
            
            const mockActivity = { id: "act1" };
            vi.mocked(LearningService.createActivity).mockResolvedValue(mockActivity as any);

            await createActivity(mockReq as Request, mockRes as Response);

            expect(LearningService.createActivity).toHaveBeenCalledWith("school1", expect.objectContaining({ title: "Homework 1" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockActivity);
        });
    });

    describe("submitActivity", () => {
        it("should submit activity", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                learningActivityId: "act1", 
                enrollmentId: "enr1", 
                contentUrl: "http://example.com/doc.pdf" 
            };
            
            const mockSubmission = { id: "sub1" };
            vi.mocked(LearningService.submitActivity).mockResolvedValue(mockSubmission as any);

            await submitActivity(mockReq as Request, mockRes as Response);

            expect(LearningService.submitActivity).toHaveBeenCalledWith("school1", expect.objectContaining({ contentUrl: "http://example.com/doc.pdf" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockSubmission);
        });
    });

    describe("raiseSupportFlag", () => {
        it("should raise support flag", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                enrollmentId: "enr1", 
                type: "ACADEMIC", 
                description: "Failing grades" 
            };
            
            const mockFlag = { id: "flag1" };
            vi.mocked(LearningService.raiseSupportFlag).mockResolvedValue(mockFlag as any);

            await raiseSupportFlag(mockReq as Request, mockRes as Response);

            expect(LearningService.raiseSupportFlag).toHaveBeenCalledWith("school1", expect.objectContaining({ description: "Failing grades" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockFlag);
        });
    });
});
