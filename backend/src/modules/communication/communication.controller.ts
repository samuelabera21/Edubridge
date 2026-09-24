import { Request, Response } from "express";
import { CommunicationService } from "./communication.service.js";
import { AnnouncementTarget } from "../../generated/prisma/enums.js";

// =========================================================
// ANNOUNCEMENTS
// =========================================================

export const createAnnouncement = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const { title, content, target, targetId, expiresAt } = req.body;
        if (!title || !content) return res.status(400).json({ error: "title and content are required" });

        const announcement = await CommunicationService.createAnnouncement(organizationId, {
            title,
            content,
            target: target as AnnouncementTarget || AnnouncementTarget.ALL,
            targetId,
            authorId: userId,
            expiresAt
        });

        return res.status(201).json(announcement);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create announcement" });
    }
};

export const getAnnouncements = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { target } = req.query;
        const announcements = await CommunicationService.getAnnouncements(
            organizationId,
            target ? (target as string) as AnnouncementTarget : undefined
        );
        return res.json(announcements);
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch announcements" });
    }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Announcement id is required" });

        await CommunicationService.deleteAnnouncement(organizationId, id as string);
        return res.json({ success: true });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to delete announcement" });
    }
};

export const updateAnnouncement = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Announcement id is required" });

        const { title, content, target, targetId } = req.body;
        const updated = await CommunicationService.updateAnnouncement(organizationId, id as string, {
            title,
            content,
            target,
            targetId
        });
        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update announcement" });
    }
};

// =========================================================
// IMPORTANT NOTICES
// =========================================================

export const getImportantNotices = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const notices = await CommunicationService.getImportantNotices(organizationId);
        return res.json(notices);
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch notices" });
    }
};

export const createImportantNotice = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const { title, content, noticeType } = req.body;
        if (!title || !content) return res.status(400).json({ error: "title and content are required" });

        const notice = await CommunicationService.createImportantNotice(organizationId, {
            title,
            content,
            noticeType,
            authorId: userId
        });
        return res.status(201).json(notice);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to publish notice" });
    }
};

export const deleteImportantNotice = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Notice id is required" });

        await CommunicationService.deleteImportantNotice(organizationId, id as string);
        return res.json({ success: true });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to delete notice" });
    }
};

// =========================================================
// NOTIFICATIONS
// =========================================================

export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!userId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const notifications = await CommunicationService.getUserNotifications(userId, organizationId);
        return res.json(notifications);
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

export const markNotificationRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!userId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Notification id is required" });

        const notification = await CommunicationService.markNotificationRead(id as string, userId, organizationId);
        return res.json(notification);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to mark notification read" });
    }
};

export const getUnreadNotificationCount = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!userId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const count = await CommunicationService.getUnreadNotificationCount(userId, organizationId);
        return res.json({ count });
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch notification count" });
    }
};

// =========================================================
// DIRECT MESSAGES
// =========================================================

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const senderId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!senderId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { receiverId, content } = req.body;
        if (!receiverId || !content) return res.status(400).json({ error: "receiverId and content are required" });

        const message = await CommunicationService.sendMessage({ organizationId, senderId, receiverId, content });
        return res.status(201).json(message);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to send message" });
    }
};

export const getMyMessages = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!userId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { otherUserId } = req.query;
        const messages = await CommunicationService.getMessages(userId, organizationId, otherUserId as string | undefined);
        return res.json(messages);
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch messages" });
    }
};

export const getMessagingUsers = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!userId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const users = await CommunicationService.getUsersForMessaging(userId, organizationId);
        return res.json(users);
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch users" });
    }
};

export const deleteMessage = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!userId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Message id is required" });

        await CommunicationService.deleteMessage(organizationId, userId, id as string);
        return res.json({ success: true });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to delete message" });
    }
};

// =========================================================
// TEACHER → PARENT MESSAGING
// =========================================================

export const sendTeacherParentMessage = async (req: Request, res: Response) => {
    try {
        const teacherUserId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!teacherUserId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { enrollmentId, content } = req.body;
        if (!enrollmentId || !content) return res.status(400).json({ error: "enrollmentId and content are required" });

        const message = await CommunicationService.sendTeacherParentMessage({
            teacherUserId,
            organizationId,
            enrollmentId,
            content
        });
        return res.status(201).json(message);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to send message" });
    }
};

export const getTeacherParentContacts = async (req: Request, res: Response) => {
    try {
        const teacherUserId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!teacherUserId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const contacts = await CommunicationService.getTeacherParentContacts(teacherUserId, organizationId);
        return res.json(contacts);
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch contacts" });
    }
};
