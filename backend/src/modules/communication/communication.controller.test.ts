import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { 
    createAnnouncement, 
    sendMessage,
    getMyNotifications,
    markNotificationRead,
    getUnreadNotificationCount
} from "./communication.controller.js";
import { CommunicationService } from "./communication.service.js";

vi.mock("./communication.service.js", () => ({
    CommunicationService: {
        createAnnouncement: vi.fn(),
        getAnnouncements: vi.fn(),
        deleteAnnouncement: vi.fn(),
        createImportantNotice: vi.fn(),
        getImportantNotices: vi.fn(),
        getUserNotifications: vi.fn(),
        markNotificationRead: vi.fn(),
        getUnreadNotificationCount: vi.fn(),
        sendMessage: vi.fn(),
        getMessages: vi.fn(),
        getUsersForMessaging: vi.fn(),
        sendTeacherParentMessage: vi.fn(),
        getTeacherParentContacts: vi.fn()
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
            mockReq.user = { id: "user1" } as any;
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

            expect(CommunicationService.createAnnouncement).toHaveBeenCalledWith("school1", expect.objectContaining({ title: "Welcome", authorId: "user1" }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockAnnouncement);
        });
    });

    describe("sendMessage", () => {
        it("should return 400 if validation fails", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.user = { id: "user1" } as any;
            mockReq.body = { receiverId: "user2" }; // missing content
            
            await sendMessage(mockReq as Request, mockRes as Response);
            
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it("should send message", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.user = { id: "user1" } as any;
            mockReq.body = { 
                receiverId: "user2",
                content: "Hello"
            };
            
            const mockMessage = { id: "m1" };
            vi.mocked(CommunicationService.sendMessage).mockResolvedValue(mockMessage as any);

            await sendMessage(mockReq as Request, mockRes as Response);

            expect(CommunicationService.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ 
                organizationId: "school1",
                senderId: "user1",
                receiverId: "user2",
                content: "Hello" 
            }));
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith(mockMessage);
        });
    });

    describe("getMyNotifications", () => {
        it("should return notifications", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.user = { id: "user1" } as any;

            const mockNotifications = [{ id: "n1", title: "Test", read: false }];
            vi.mocked(CommunicationService.getUserNotifications).mockResolvedValue(mockNotifications as any);

            await getMyNotifications(mockReq as Request, mockRes as Response);

            expect(CommunicationService.getUserNotifications).toHaveBeenCalledWith("user1", "school1");
            expect(mockRes.json).toHaveBeenCalledWith(mockNotifications);
        });
    });

    describe("markNotificationRead", () => {
        it("should mark notification as read", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.user = { id: "user1" } as any;
            mockReq.params = { id: "n1" };

            const updatedNotification = { id: "n1", read: true };
            vi.mocked(CommunicationService.markNotificationRead).mockResolvedValue(updatedNotification as any);

            await markNotificationRead(mockReq as Request, mockRes as Response);

            expect(CommunicationService.markNotificationRead).toHaveBeenCalledWith("n1", "user1", "school1");
            expect(mockRes.json).toHaveBeenCalledWith(updatedNotification);
        });
    });

    describe("getUnreadNotificationCount", () => {
        it("should return unread count", async () => {
            (mockReq as any).accessScope = { id: "school1" };
            mockReq.user = { id: "user1" } as any;

            vi.mocked(CommunicationService.getUnreadNotificationCount).mockResolvedValue(5);

            await getUnreadNotificationCount(mockReq as Request, mockRes as Response);

            expect(CommunicationService.getUnreadNotificationCount).toHaveBeenCalledWith("user1", "school1");
            expect(mockRes.json).toHaveBeenCalledWith({ count: 5 });
        });
    });
});
