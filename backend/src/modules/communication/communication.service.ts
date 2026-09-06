import { prisma } from "../../infrastructure/prisma/client.js";
import { AnnouncementTarget } from "../../generated/prisma/enums.js";

export class CommunicationService {
    static async createAnnouncement(organizationId: string, data: { title: string; content: string; target: AnnouncementTarget; targetId?: string; authorId: string; expiresAt?: string }) {
        const announcement = await prisma.announcement.create({
            data: {
                organizationId,
                title: data.title,
                content: data.content,
                target: data.target || AnnouncementTarget.ALL,
                targetId: data.targetId,
                authorId: data.authorId,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
            },
            include: { author: { select: { id: true, name: true, email: true } } }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "ANNOUNCEMENT_CREATED",
                resource: "Announcement",
                resourceId: announcement.id,
                newValue: JSON.parse(JSON.stringify(announcement))
            }
        });

        return announcement;
    }

    static async getAnnouncements(organizationId: string, target?: AnnouncementTarget) {
        return prisma.announcement.findMany({
            where: {
                organizationId,
                ...(target ? { target } : {})
            },
            include: { author: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: "desc" }
        });
    }

    static async deleteAnnouncement(organizationId: string, id: string) {
        const item = await prisma.announcement.findFirst({ where: { id, organizationId } });
        if (!item) throw new Error("Announcement not found");

        return prisma.announcement.delete({ where: { id } });
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
        if (data.senderId === data.receiverId) {
            throw new Error("Cannot send message to yourself");
        }

        return prisma.message.create({
            data: {
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content
            },
            include: {
                sender: { select: { id: true, name: true, email: true } },
                receiver: { select: { id: true, name: true, email: true } }
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
                sender: { select: { id: true, name: true, email: true } }, 
                receiver: { select: { id: true, name: true, email: true } } 
            },
            orderBy: { createdAt: "asc" }
        });
    }

    static async getUsersForMessaging(userId: string) {
        return prisma.user.findMany({
            where: { id: { not: userId } },
            select: { id: true, name: true, email: true },
            take: 50
        });
    }

    // Domain 11.6: Important Notices & Directives
    static async getImportantNotices(organizationId: string) {
        return prisma.importantNotice.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" }
        });
    }

    static async createImportantNotice(organizationId: string, data: any) {
        return prisma.importantNotice.create({
            data: {
                organizationId,
                title: data.title,
                content: data.content,
                noticeType: data.noticeType || "EMERGENCY",
                isPinned: true,
                authorName: data.authorName || "School Principal"
            }
        });
    }
}
