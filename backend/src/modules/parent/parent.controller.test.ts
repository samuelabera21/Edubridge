import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createParent, linkParentToStudent, getStudentParents 
} from "./parent.controller.js";
import { ParentService } from "./parent.service.js";

vi.mock("./parent.service.js", () => ({
    ParentService: {
        createParent: vi.fn(),
        linkParentToStudent: vi.fn(),
        getStudentParents: vi.fn()
    }
}));

describe("Parent Controller", () => {
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

    describe("createParent", () => {
        it("should return 400 if validation fails", async () => {
            mockReq.body = { firstName: "John" }; // missing lastName
            
            await createParent(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should create parent", async () => {
            mockReq.body = { 
                firstName: "John", 
                lastName: "Doe", 
                email: "john@example.com"
            };
            
            const mockParent = { id: "p1" };
            vi.mocked(ParentService.createParent).mockResolvedValue(mockParent as any);

            await createParent(mockReq as Request, mockRes as Response);

            expect(ParentService.createParent).toHaveBeenCalledWith(expect.objectContaining({ email: "john@example.com" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockParent);
        });
    });

    describe("linkParentToStudent", () => {
        it("should link parent to student", async () => {
            mockReq.body = { 
                parentId: "p1", 
                studentId: "s1", 
                relationship: "Father" 
            };
            
            const mockLink = { id: "l1" };
            vi.mocked(ParentService.linkParentToStudent).mockResolvedValue(mockLink as any);

            await linkParentToStudent(mockReq as Request, mockRes as Response);

            expect(ParentService.linkParentToStudent).toHaveBeenCalledWith(expect.objectContaining({ relationship: "Father" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockLink);
        });
    });
});
