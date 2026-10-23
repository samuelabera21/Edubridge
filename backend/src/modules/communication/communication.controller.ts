import { Request, Response } from "express";
import { CommunicationService } from "./communication.service.js";
import { AnnouncementTarget } from "../../generated/prisma/enums.js";
import { prisma } from "../../infrastructure/prisma/client.js";

// =========================================================
// ANNOUNCEMENTS
// =========================================================

export const createAnnouncement = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id || req.body.organizationId;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const {
            title,
            content,
            code,
            category,
            priority,
            target,
            targetId,
            targetDetails,
            attachmentUrl,
            attachmentName,
            isAcknowledgmentRequired,
            expiresAt
        } = req.body;

        if (!title || !content) return res.status(400).json({ error: "title and content are required" });

        const announcement = await CommunicationService.createAnnouncement(organizationId, {
            title,
            content,
            code,
            category,
            priority,
            target: target as AnnouncementTarget || AnnouncementTarget.ALL,
            targetId,
            targetDetails,
            attachmentUrl,
            attachmentName,
            isAcknowledgmentRequired: !!isAcknowledgmentRequired,
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
        const organizationId = (req as any).accessScope?.id || (req.query?.organizationId as string);
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { target, search, category, priority } = req.query;
        const announcements = await CommunicationService.getAnnouncements(
            organizationId,
            {
                target: target ? (target as string) as AnnouncementTarget : undefined,
                search: search ? String(search) : undefined,
                category: category ? String(category) : undefined,
                priority: priority ? String(priority) : undefined,
                currentUserId: req.user?.id
            }
        );
        return res.json(announcements);
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch announcements" });
    }
};

export const getAnnouncementRecipientsHierarchy = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id || (req.query?.organizationId as string);
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const hierarchy = await CommunicationService.getSchoolAnnouncementRecipientsHierarchy(organizationId);
        return res.json({
            success: true,
            data: hierarchy
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch recipients hierarchy" });
    }
};

export const deleteAnnouncement = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id || (req.query?.organizationId as string);
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
        const organizationId = (req as any).accessScope?.id || (req.query?.organizationId as string);
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Announcement id is required" });

        const announcement = await CommunicationService.updateAnnouncement(organizationId, id as string, req.body);
        return res.json(announcement);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update announcement" });
    }
};

export const getAnnouncementStatus = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id || (req.query?.organizationId as string);
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Announcement id is required" });
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const statusReport = await CommunicationService.getAnnouncementStatus(organizationId, id as string);
        return res.json({
            success: true,
            data: statusReport
        });
    } catch (error: any) {
        return res.status(error.message?.includes("not found") ? 404 : 500).json({
            error: error.message || "Failed to get announcement delivery status"
        });
    }
};

export const acknowledgeAnnouncement = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { notes } = req.body || {};

        if (!userId) return res.status(401).json({ error: "Authentication required" });
        if (!id) return res.status(400).json({ error: "Announcement id is required" });

        const ack = await CommunicationService.acknowledgeAnnouncement(id as string, userId, notes);
        return res.json({
            success: true,
            message: "Announcement acknowledged successfully",
            data: ack
        });
    } catch (error: any) {
        return res.status(400).json({
            error: error.message || "Failed to acknowledge announcement"
        });
    }
};

export const markAnnouncementRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) return res.status(401).json({ error: "Authentication required" });
        if (!id) return res.status(400).json({ error: "Announcement id is required" });

        const ack = await CommunicationService.markAnnouncementRead(id as string, userId);
        return res.json({
            success: true,
            data: ack
        });
    } catch (error: any) {
        return res.status(400).json({
            error: error.message || "Failed to mark announcement as read"
        });
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

export const updateImportantNotice = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Notice id is required" });

        const { title, content, noticeType } = req.body;
        const notice = await CommunicationService.updateImportantNotice(organizationId, id as string, {
            title,
            content,
            noticeType
        });
        return res.json(notice);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update notice" });
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
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const organizationId =
            (req as any).accessScope?.id ||
            (req.headers["x-organization-id"] as string) ||
            (req.headers["x-scope-id"] as string) ||
            (req.query?.organizationId as string) ||
            undefined;
        const notifications = await CommunicationService.getUserNotifications(userId, organizationId);
        return res.json(notifications);
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch notifications" });
    }
};

export const markNotificationRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const organizationId =
            (req as any).accessScope?.id ||
            (req.headers["x-organization-id"] as string) ||
            (req.headers["x-scope-id"] as string) ||
            (req.query?.organizationId as string) ||
            undefined;
        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Notification id is required" });

        const notification = await CommunicationService.markNotificationRead(id as string, userId, organizationId);
        return res.json(notification);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to mark notification read" });
    }
};

export const markAllNotificationsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const organizationId =
            (req as any).accessScope?.id ||
            (req.headers["x-organization-id"] as string) ||
            (req.headers["x-scope-id"] as string) ||
            (req.query?.organizationId as string) ||
            undefined;
        await CommunicationService.markAllNotificationsRead(userId, organizationId);
        return res.json({ success: true, message: "All notifications marked as read" });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to mark notifications read" });
    }
};

export const getUnreadNotificationCount = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const organizationId =
            (req as any).accessScope?.id ||
            (req.headers["x-organization-id"] as string) ||
            (req.headers["x-scope-id"] as string) ||
            (req.query?.organizationId as string) ||
            undefined;
        const count = await CommunicationService.getUnreadNotificationCount(userId, organizationId);
        return res.json({ count });
    } catch (error: any) {
        return res.status(500).json({ error: "Failed to fetch notification count" });
    }
};

// =========================================================
// DIRECT MESSAGES & MESSAGING SETTINGS
// =========================================================

async function resolveOrganizationId(req: Request): Promise<string | null> {
    if ((req as any).accessScope?.id) return (req as any).accessScope.id;
    const headerOrgId =
        (req.headers["x-organization-id"] as string) ||
        (req.headers["x-scope-id"] as string) ||
        (req.query?.organizationId as string) ||
        (req.body?.organizationId as string);
    if (headerOrgId) return headerOrgId;

    const userId = req.user?.id;
    if (!userId) return null;

    // Check Parent first: A parent's school context is the school where their child is enrolled
    const parent = await prisma.parent.findFirst({
        where: { userId },
        include: {
            children: {
                include: {
                    student: {
                        include: {
                            enrollments: { select: { organizationId: true }, take: 1 }
                        }
                    }
                },
                take: 1
            }
        }
    });
    const parentOrgId = parent?.children?.[0]?.student?.enrollments?.[0]?.organizationId;
    if (parentOrgId) return parentOrgId;

    // Check RoleAssignment
    const assignment = await prisma.roleAssignment.findFirst({
        where: { userId, scope: { type: "SCHOOL" } },
        select: { scopeId: true },
        orderBy: { createdAt: "desc" }
    });
    if (assignment) return assignment.scopeId;

    // Check Teacher
    const teacher = await prisma.teacher.findFirst({
        where: { userId },
        select: { organizationId: true }
    });
    if (teacher) return teacher.organizationId;

    // Check Student
    const student = await prisma.student.findFirst({
        where: { userId },
        include: { enrollments: { select: { organizationId: true }, take: 1 } }
    });
    if (student?.enrollments?.[0]?.organizationId) return student.enrollments[0].organizationId;

    return null;
}

export const getMessagingSettings = async (req: Request, res: Response) => {
    try {
        const organizationId = await resolveOrganizationId(req);
        if (!organizationId) return res.status(401).json({ error: "Missing school scope" });

        const settings = await CommunicationService.getMessagingSettings(organizationId);
        return res.json(settings);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch messaging settings" });
    }
};

export const updateMessagingSettings = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = await resolveOrganizationId(req);
        if (!userId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        // Ensure user is School Admin
        const assignments = await prisma.roleAssignment.findMany({
            where: { userId, scopeId: organizationId },
            include: { role: true }
        });
        const isAdmin = assignments.some(a => ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"].includes(a.role.name));
        if (!isAdmin) {
            return res.status(403).json({ error: "Only school administration can update messaging settings" });
        }

        const { allowTeacherDM, allowStudentDM, allowParentDM } = req.body;
        const updated = await CommunicationService.updateMessagingSettings(organizationId, {
            allowTeacherDM,
            allowStudentDM,
            allowParentDM
        });
        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update messaging settings" });
    }
};

export const sendMessage = async (req: Request, res: Response) => {
    try {
        const senderId = req.user?.id;
        const organizationId = await resolveOrganizationId(req);
        if (!senderId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { receiverId, content, attachmentUrl, attachmentName, attachmentType } = req.body;
        if (!receiverId || !content) return res.status(400).json({ error: "receiverId and content are required" });

        const message = await CommunicationService.sendMessage({
            organizationId,
            senderId,
            receiverId,
            content,
            attachmentUrl,
            attachmentName,
            attachmentType
        });
        return res.status(201).json(message);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to send message" });
    }
};

export const getMyMessages = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = await resolveOrganizationId(req);
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
        const organizationId = await resolveOrganizationId(req);
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
        const organizationId = await resolveOrganizationId(req);
        if (!userId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        if (!id) return res.status(400).json({ error: "Message id is required" });

        await CommunicationService.deleteMessage(organizationId, userId, id as string);
        return res.json({ success: true });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to delete message" });
    }
};

export const updateMessage = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = await resolveOrganizationId(req);
        if (!userId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { id } = req.params;
        const { content } = req.body;
        if (!id) return res.status(400).json({ error: "Message id is required" });
        if (!content || !content.trim()) return res.status(400).json({ error: "Message content is required" });

        const updated = await CommunicationService.updateMessage(organizationId, userId, id as string, content);
        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update message" });
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

export const sendTeacherStudentBroadcast = async (req: Request, res: Response) => {
    try {
        const teacherUserId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!teacherUserId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { targetType, sectionId, studentId, receiverId, subject, content, priority } = req.body;
        if (!targetType || !content) {
            return res.status(400).json({ error: "targetType and content are required" });
        }

        const result = await CommunicationService.sendTeacherStudentBroadcast({
            teacherUserId,
            organizationId,
            targetType,
            sectionId,
            studentId,
            receiverId,
            subject,
            content,
            priority
        });

        return res.status(201).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to dispatch broadcast" });
    }
};

export const sendTeacherParentBroadcast = async (req: Request, res: Response) => {
    try {
        const teacherUserId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!teacherUserId || !organizationId) return res.status(401).json({ error: "Unauthorized" });

        const { targetType, sectionId, studentId, enrollmentId, receiverId, subject, content, priority } = req.body;
        if (!targetType || !content) {
            return res.status(400).json({ error: "targetType and content are required" });
        }

        const result = await CommunicationService.sendTeacherParentBroadcast({
            teacherUserId,
            organizationId,
            targetType,
            sectionId,
            studentId,
            enrollmentId,
            receiverId,
            subject,
            content,
            priority
        });

        return res.status(201).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to dispatch broadcast to parents" });
    }
};

