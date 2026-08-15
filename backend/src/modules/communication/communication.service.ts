import { prisma } from "../../infrastructure/prisma/client.js";
import { AnnouncementTarget } from "../../generated/prisma/enums.js";

export class CommunicationService {
    static async createAnnouncement(organizationId: string, data: { title: string; content: string; target: AnnouncementTarget; targetId?: string; authorId: string; expiresAt?: string }) {
        return prisma.announcement.create({
            data: {
                organizationId,
                title: data.title,
                content: data.content,
                target: data.target,
                targetId: data.targetId,
                authorId: data.authorId,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
            }
        });
    }

    static async getAnnouncements(organizationId: string, target?: AnnouncementTarget) {
        return prisma.announcement.findMany({
            where: {
                organizationId,
                ...(target ? { target } : {})
            },
            include: { author: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createNotification(data: { userId: string; title: string; content: string; link?: string }) {
        return prisma.notification.create({
            data: {
                userId: data.userId,
                title: data.title,
                content: data.content,
                link: data.link
            }
        });
    }

    static async getUserNotifications(userId: string) {
        return prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async markNotificationRead(id: string, userId: string) {
        const notif = await prisma.notification.findFirst({ where: { id, userId } });
        if (!notif) throw new Error("Notification not found");

        return prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    }

    static async sendMessage(data: { senderId: string; receiverId: string; content: string }) {
        return prisma.message.create({
            data: {
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content
            }
        });
    }

    static async getMessages(userId: string, otherUserId?: string) {
        return prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId, ...(otherUserId ? { receiverId: otherUserId } : {}) },
                    { receiverId: userId, ...(otherUserId ? { senderId: otherUserId } : {}) }
                ]
            },
            include: { 
                sender: { select: { id: true, name: true } }, 
                receiver: { select: { id: true, name: true } } 
            },
            orderBy: { createdAt: "desc" }
        });
    }
}
