import { Request, Response } from "express";
import { CommunicationService } from "./communication.service.js";
import { AnnouncementTarget } from "../../generated/prisma/enums.js";

export const createAnnouncement = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { title, content, target, targetId, expiresAt } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: "title and content are required" });
        }

        const announcement = await CommunicationService.createAnnouncement(organizationId, {
            title,
            content,
            target: target as AnnouncementTarget || AnnouncementTarget.ALL,
            targetId,
            authorId: req.user?.id!,
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

        const announcements = await CommunicationService.getAnnouncements(organizationId, target as AnnouncementTarget);
        return res.json(announcements);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const createNotification = async (req: Request, res: Response) => {
    try {
        const { userId, title, content, link } = req.body;
        if (!userId || !title || !content) {
            return res.status(400).json({ error: "userId, title, and content are required" });
        }

        const notification = await CommunicationService.createNotification({ userId, title, content, link });
        return res.status(201).json(notification);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create notification" });
    }
};

export const getMyNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const notifications = await CommunicationService.getUserNotifications(userId);
        return res.json(notifications);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const markNotificationRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        const notification = await CommunicationService.markNotificationRead(id as string, userId);
        return res.json(notification);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to mark notification read" });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const senderId = req.user?.id;
        if (!senderId) return res.status(401).json({ error: "Unauthorized" });

        const { receiverId, content } = req.body;
        if (!receiverId || !content) {
            return res.status(400).json({ error: "receiverId and content are required" });
        }

        const message = await CommunicationService.sendMessage({ senderId, receiverId, content });
        return res.status(201).json(message);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to send message" });
    }
};

export const getMyMessages = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { otherUserId } = req.query;
        const messages = await CommunicationService.getMessages(userId, otherUserId as string);
        return res.json(messages);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};
