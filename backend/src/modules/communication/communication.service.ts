import { prisma } from "../../infrastructure/prisma/client.js";
import { AnnouncementTarget } from "../../generated/prisma/enums.js";

export class CommunicationService {

    // =========================================================
    // ANNOUNCEMENTS
    // =========================================================

    static async createAnnouncement(organizationId: string, data: {
        title: string;
        content: string;
        target: AnnouncementTarget;
        targetId?: string;
        authorId: string;
        expiresAt?: string;
    }) {
        // Validate targetId belongs to this school for grade/section targeting
        if (data.target === AnnouncementTarget.SPECIFIC_GRADE && data.targetId) {
            const schoolGrade = await prisma.schoolGrade.findFirst({
                where: {
                    id: data.targetId,
                    academicYear: { organizationId }
                }
            });
            if (!schoolGrade) throw new Error("Grade not found in this school");
        }

        if (data.target === AnnouncementTarget.SPECIFIC_SECTION && data.targetId) {
            const section = await prisma.section.findFirst({
                where: {
                    id: data.targetId,
                    schoolGrade: { academicYear: { organizationId } }
                }
            });
            if (!section) throw new Error("Section not found in this school");
        }

        const announcement = await prisma.announcement.create({
            data: {
                organizationId,
                title: data.title,
                content: data.content,
                target: data.target || AnnouncementTarget.ALL,
                targetId: data.targetId || null,
                authorId: data.authorId,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null
            },
            include: {
                author: { select: { id: true, name: true, email: true } }
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "ANNOUNCEMENT_CREATED",
                resource: "Announcement",
                resourceId: announcement.id,
                newValue: { title: announcement.title, target: announcement.target }
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
            include: {
                author: { select: { id: true, name: true, email: true } }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async deleteAnnouncement(organizationId: string, id: string) {
        const item = await prisma.announcement.findFirst({ where: { id, organizationId } });
        if (!item) throw new Error("Announcement not found");

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "ANNOUNCEMENT_DELETED",
                resource: "Announcement",
                resourceId: id,
                oldValue: { title: item.title, target: item.target }
            }
        });

        return prisma.announcement.delete({ where: { id } });
    }

    static async updateAnnouncement(organizationId: string, id: string, data: {
        title?: string;
        content?: string;
        target?: AnnouncementTarget;
        targetId?: string;
    }) {
        const item = await prisma.announcement.findFirst({ where: { id, organizationId } });
        if (!item) throw new Error("Announcement not found");

        return prisma.announcement.update({
            where: { id },
            data: {
                ...(data.title ? { title: data.title } : {}),
                ...(data.content ? { content: data.content } : {}),
                ...(data.target ? { target: data.target } : {}),
                ...(data.targetId !== undefined ? { targetId: data.targetId } : {})
            },
            include: {
                author: { select: { id: true, name: true, email: true } }
            }
        });
    }

    // =========================================================
    // IMPORTANT NOTICES
    // =========================================================

    static async getImportantNotices(organizationId: string) {
        return prisma.importantNotice.findMany({
            where: { organizationId },
            include: {
                author: { select: { id: true, name: true, email: true } }
            },
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }]
        });
    }

    static async updateImportantNotice(organizationId: string, id: string, data: {
        title?: string;
        content?: string;
        noticeType?: string;
    }) {
        const item = await prisma.importantNotice.findFirst({ where: { id, organizationId } });
        if (!item) throw new Error("Important notice not found");

        return prisma.importantNotice.update({
            where: { id },
            data: {
                ...(data.title ? { title: data.title } : {}),
                ...(data.content ? { content: data.content } : {}),
                ...(data.noticeType ? { noticeType: data.noticeType } : {})
            },
            include: {
                author: { select: { id: true, name: true, email: true } }
            }
        });
    }

    static async deleteImportantNotice(organizationId: string, id: string) {
        const item = await prisma.importantNotice.findFirst({ where: { id, organizationId } });
        if (!item) throw new Error("Important notice not found");

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "IMPORTANT_NOTICE_DELETED",
                resource: "ImportantNotice",
                resourceId: id,
                oldValue: { title: item.title }
            }
        });

        return prisma.importantNotice.delete({ where: { id } });
    }

    static async createImportantNotice(organizationId: string, data: {
        title: string;
        content: string;
        noticeType?: string;
        authorId: string;
    }) {
        const notice = await prisma.importantNotice.create({
            data: {
                organizationId,
                authorId: data.authorId,
                title: data.title,
                content: data.content,
                noticeType: data.noticeType || "EMERGENCY",
                isPinned: true
            },
            include: {
                author: { select: { id: true, name: true, email: true } }
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "IMPORTANT_NOTICE_CREATED",
                resource: "ImportantNotice",
                resourceId: notice.id,
                newValue: { title: notice.title, noticeType: notice.noticeType }
            }
        });

        return notice;
    }

    // =========================================================
    // NOTIFICATIONS — org-scoped, secure
    // =========================================================

    /**
     * Internal-only: creates a notification for a user in a specific org.
     * Verifies the target user belongs to this org via roleAssignment.
     */
    static async createNotification(data: {
        userId: string;
        organizationId: string;
        title: string;
        content: string;
        link?: string;
    }) {
        const membership = await prisma.roleAssignment.findFirst({
            where: { userId: data.userId, scope: { id: data.organizationId } }
        });
        if (!membership) throw new Error("Target user is not a member of this organization");

        return prisma.notification.create({
            data: {
                userId: data.userId,
                organizationId: data.organizationId,
                title: data.title,
                content: data.content,
                link: data.link || null
            }
        });
    }

    static async getUserNotifications(userId: string, organizationId: string) {
        return prisma.notification.findMany({
            where: { userId, organizationId },
            orderBy: { createdAt: "desc" },
            take: 50
        });
    }

    static async markNotificationRead(id: string, userId: string, organizationId: string) {
        const notif = await prisma.notification.findFirst({ where: { id, userId, organizationId } });
        if (!notif) throw new Error("Notification not found");

        return prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    }

    static async getUnreadNotificationCount(userId: string, organizationId: string): Promise<number> {
        return prisma.notification.count({
            where: { userId, organizationId, isRead: false }
        });
    }

    // =========================================================
    // DIRECT MESSAGES — org-scoped, secure
    // =========================================================

    static async sendMessage(data: {
        organizationId: string;
        senderId: string;
        receiverId: string;
        content: string;
    }) {
        if (data.senderId === data.receiverId) {
            throw new Error("Cannot send a message to yourself");
        }

        // Verify receiver belongs to this organization
        const receiverMembership = await prisma.roleAssignment.findFirst({
            where: { userId: data.receiverId, scope: { id: data.organizationId } }
        });
        if (!receiverMembership) throw new Error("Recipient is not a member of this school");

        const message = await prisma.message.create({
            data: {
                organizationId: data.organizationId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content
            },
            include: {
                sender: { select: { id: true, name: true, email: true } },
                receiver: { select: { id: true, name: true, email: true } }
            }
        });

        // Notify the receiver (best-effort — do not fail the send if notify fails)
        try {
            await this.createNotification({
                userId: data.receiverId,
                organizationId: data.organizationId,
                title: "New message",
                content: `You have a new message from ${message.sender.name}`,
                link: "/dashboard/communication/messages"
            });
        } catch (_) {
            // Notification failure must not block message delivery
        }

        return message;
    }

    static async getMessages(userId: string, organizationId: string, otherUserId?: string) {
        return prisma.message.findMany({
            where: {
                organizationId,
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

    static async deleteMessage(organizationId: string, userId: string, messageId: string) {
        const message = await prisma.message.findFirst({
            where: {
                id: messageId,
                organizationId,
                OR: [{ senderId: userId }, { receiverId: userId }]
            }
        });
        if (!message) throw new Error("Message not found or unauthorized");

        return prisma.message.delete({ where: { id: messageId } });
    }

    /**
     * Returns users eligible for direct messaging within this school only.
     */
    static async getUsersForMessaging(userId: string, organizationId: string) {
        const assignments = await prisma.roleAssignment.findMany({
            where: { scopeId: organizationId, userId: { not: userId } },
            select: { user: { select: { id: true, name: true, email: true } } },
            take: 100
        });

        const seen = new Set<string>();
        return assignments
            .map(a => a.user)
            .filter(u => {
                if (seen.has(u.id)) return false;
                seen.add(u.id);
                return true;
            });
    }

    // =========================================================
    // TEACHER → PARENT MESSAGING
    // =========================================================

    /**
     * Resolves the guardian for a student enrollment and verifies the teacher's
     * legitimate teaching relationship before sending a message.
     */
    static async sendTeacherParentMessage(data: {
        teacherUserId: string;
        organizationId: string;
        enrollmentId: string;
        content: string;
    }) {
        // 1. Verify teacher belongs to this school
        const teacher = await prisma.teacher.findFirst({
            where: { userId: data.teacherUserId, organizationId: data.organizationId }
        });
        if (!teacher) throw new Error("Teacher profile not found in this school");

        // 2. Verify enrollment belongs to this school
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { id: data.enrollmentId, organizationId: data.organizationId, status: { in: ["ENROLLED", "ACTIVE"] } },
            include: {
                student: {
                    include: {
                        parents: {
                            include: {
                                parent: { select: { id: true, userId: true, firstName: true, lastName: true } }
                            }
                        }
                    }
                }
            }
        });
        if (!enrollment) throw new Error("Student enrollment not found in this school");

        // 3. Verify teacher has a teaching assignment for this section/grade
        const hasAssignment = await prisma.teachingAssignment.findFirst({
            where: {
                teacherId: teacher.id,
                OR: [
                    ...(enrollment.sectionId ? [{ sectionId: enrollment.sectionId }] : []),
                    { schoolGradeId: enrollment.schoolGradeId }
                ]
            }
        });
        if (!hasAssignment) {
            throw new Error("You do not have a teaching assignment for this student's class");
        }

        // 4. Find the primary parent with a user account
        const parentLink = enrollment.student.parents.find(ps => !!ps.parent.userId);
        if (!parentLink) {
            throw new Error("No linked guardian account found for this student");
        }

        const parentUserId = parentLink.parent.userId!;

        // 5. Send message (org-scoped)
        return this.sendMessage({
            organizationId: data.organizationId,
            senderId: data.teacherUserId,
            receiverId: parentUserId,
            content: data.content
        });
    }

    /**
     * Returns parents (with user accounts) for students in the teacher's classes.
     */
    static async getTeacherParentContacts(teacherUserId: string, organizationId: string) {
        const teacher = await prisma.teacher.findFirst({
            where: { userId: teacherUserId, organizationId }
        });
        if (!teacher) throw new Error("Teacher profile not found");

        const assignments = await prisma.teachingAssignment.findMany({
            where: { teacherId: teacher.id },
            select: { schoolGradeId: true, sectionId: true }
        });

        const sectionIds = assignments.map(a => a.sectionId).filter(Boolean) as string[];
        const gradeIds = assignments.map(a => a.schoolGradeId);

        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                status: { in: ["ENROLLED", "ACTIVE"] },
                OR: [
                    ...(sectionIds.length > 0 ? [{ sectionId: { in: sectionIds } }] : []),
                    { schoolGradeId: { in: gradeIds } }
                ]
            },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        parents: {
                            include: {
                                parent: { select: { id: true, userId: true, firstName: true, lastName: true } }
                            }
                        }
                    }
                },
                section: { select: { id: true, name: true } },
                schoolGrade: { include: { grade: { select: { name: true } } } }
            }
        });

        const contacts: Array<{
            parentUserId: string;
            parentName: string;
            studentName: string;
            enrollmentId: string;
            sectionName: string | null;
            gradeName: string;
        }> = [];

        for (const enroll of enrollments) {
            for (const ps of enroll.student.parents) {
                if (!ps.parent.userId) continue;
                contacts.push({
                    parentUserId: ps.parent.userId,
                    parentName: `${ps.parent.firstName} ${ps.parent.lastName}`,
                    studentName: `${enroll.student.firstName} ${enroll.student.lastName}`,
                    enrollmentId: enroll.id,
                    sectionName: enroll.section?.name ?? null,
                    gradeName: enroll.schoolGrade.grade.name
                });
            }
        }

        const seen = new Set<string>();
        return contacts.filter(c => {
            const key = `${c.parentUserId}:${c.enrollmentId}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
