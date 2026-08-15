import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createAnnouncement, createNotification, sendMessage
} from "./communication.controller.js";
import { CommunicationService } from "./communication.service.js";

vi.mock("./communication.service.js", () => ({
    CommunicationService: {
        createAnnouncement: vi.fn(),
        getAnnouncements: vi.fn(),
        createNotification: vi.fn(),
        getUserNotifications: vi.fn(),
        markNotificationRead: vi.fn(),
        sendMessage: vi.fn(),
        getMessages: vi.fn()
    }
}));

describe("Communication Controller", () => {
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

    describe("createAnnouncement", () => {
        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.body = { title: "Title" }; // missing content
            
            await createAnnouncement(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should create announcement", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.user = { id: "user1" } as any;
            mockReq.body = { 
                title: "Welcome", 
                content: "Welcome to the new year!"
            };
            
            const mockAnnouncement = { id: "a1" };
            vi.mocked(CommunicationService.createAnnouncement).mockResolvedValue(mockAnnouncement as any);

            await createAnnouncement(mockReq as Request, mockRes as Response);

            expect(CommunicationService.createAnnouncement).toHaveBeenCalledWith("school1", expect.objectContaining({ title: "Welcome" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockAnnouncement);
        });
    });

    describe("sendMessage", () => {
        it("should return 400 if validation fails", async () => {
            mockReq.user = { id: "user1" } as any;
            mockReq.body = { receiverId: "user2" }; // missing content
            
            await sendMessage(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should send message", async () => {
            mockReq.user = { id: "user1" } as any;
            mockReq.body = { 
                receiverId: "user2",
                content: "Hello"
            };
            
            const mockMessage = { id: "m1" };
            vi.mocked(CommunicationService.sendMessage).mockResolvedValue(mockMessage as any);

            await sendMessage(mockReq as Request, mockRes as Response);

            expect(CommunicationService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ content: "Hello" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockMessage);
        });
    });
});
