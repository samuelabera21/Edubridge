import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createResource, reportIssue, createImprovementPlan
} from "./operational.controller.js";
import { OperationalService } from "./operational.service.js";
import { IssuePriority } from "../../generated/prisma/enums.js";

vi.mock("./operational.service.js", () => ({
    OperationalService: {
        createResource: vi.fn(),
        getResources: vi.fn(),
        reportIssue: vi.fn(),
        getIssues: vi.fn(),
        updateIssueStatus: vi.fn(),
        createImprovementPlan: vi.fn(),
        getImprovementPlans: vi.fn()
    }
}));

describe("Operational Controller", () => {
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

    describe("createResource", () => {
        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { type: "CLASSROOM" }; // missing name
            
            await createResource(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should create resource", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { 
                name: "Lab 1", 
                type: "LAB"
            };
            
            const mockResource = { id: "r1" };
            vi.mocked(OperationalService.createResource).mockResolvedValue(mockResource as any);

            await createResource(mockReq as Request, mockRes as Response);

            expect(OperationalService.createResource).toHaveBeenCalledWith("school1", expect.objectContaining({ name: "Lab 1" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockResource);
        });
    });

    describe("reportIssue", () => {
        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.user = { id: "user1" } as any;
            mockReq.body = { title: "Broken window" }; // missing description
            
            await reportIssue(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should report issue", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.user = { id: "user1" } as any;
            mockReq.body = { 
                title: "Broken window",
                description: "Window in Lab 1 is broken",
                priority: "HIGH"
            };
            
            const mockIssue = { id: "i1" };
            vi.mocked(OperationalService.reportIssue).mockResolvedValue(mockIssue as any);

            await reportIssue(mockReq as Request, mockRes as Response);

            expect(OperationalService.reportIssue).toHaveBeenCalledWith("school1", expect.objectContaining({ title: "Broken window", priority: IssuePriority.HIGH }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockIssue);
        });
    });
});
