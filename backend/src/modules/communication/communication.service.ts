import { prisma } from "../../infrastructure/prisma/client.js";
import { AnnouncementTarget } from "../../generated/prisma/enums.js";
import { emitNewMessageToUsers, emitNewAnnouncement, getIO } from "../../infrastructure/socket/socket.service.js";

export class CommunicationService {

    // =========================================================
    // ANNOUNCEMENTS
    // =========================================================

    static async createAnnouncement(organizationId: string, data: {
        title: string;
        content: string;
        code?: string | null;
        category?: string | null;
        priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
        target?: AnnouncementTarget;
        targetId?: string | null;
        targetDetails?: {
            targetRoles?: string[];
            gradeIds?: string[];
            sectionIds?: string[];
            teacherIds?: string[];
            studentIds?: string[];
            targetLabels?: string[];
        } | null;
        attachmentUrl?: string | null;
        attachmentName?: string | null;
        isAcknowledgmentRequired?: boolean;
        authorId: string;
        expiresAt?: string | Date | null;
    }) {
        if (!data.title || !data.title.trim()) {
            throw new Error("Announcement title is required");
        }
        if (!data.content || !data.content.trim()) {
            throw new Error("Announcement content is required");
        }

        // Validate targetId belongs to this school if provided
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

        const priority = (data.priority as any) || "NORMAL";
        const target = data.target || AnnouncementTarget.ALL;
        const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

        // 1. Create the Announcement record
        const announcement = await prisma.announcement.create({
            data: {
                organizationId,
                title: data.title.trim(),
                content: data.content.trim(),
                code: data.code?.trim() || null,
                category: data.category?.trim() || null,
                priority,
                target,
                targetId: data.targetId || null,
                targetDetails: data.targetDetails ? (data.targetDetails as any) : undefined,
                attachmentUrl: data.attachmentUrl?.trim() || null,
                attachmentName: data.attachmentName?.trim() || null,
                isAcknowledgmentRequired: !!data.isAcknowledgmentRequired,
                authorId: data.authorId,
                expiresAt
            },
            include: {
                author: { select: { id: true, name: true, email: true } }
            }
        });

        // 2. Resolve recipient user IDs and metadata for in-app notification & delivery acknowledgment tracking
        const recipientsMap = new Map<string, { userId: string; recipientType: string; recipientName: string; recipientIdentifier: string }>();
        const targetDetails = data.targetDetails || {};
        const targetRoles = targetDetails.targetRoles || [];
        const gradeIds = targetDetails.gradeIds || [];
        const sectionIds = targetDetails.sectionIds || [];
        const teacherIds = targetDetails.teacherIds || [];
        const studentIds = targetDetails.studentIds || [];

        try {
            // A. Role-based targeting
            if (target === AnnouncementTarget.ALL || targetRoles.includes("ALL")) {
                // All members in this school: teachers, students, parents, staff
                const teachers = await prisma.teacher.findMany({
                    where: { organizationId, status: "ACTIVE" },
                    include: { user: { select: { id: true, name: true, email: true } } }
                });
                (teachers || []).forEach((t: any) => {
                    if (t.userId) {
                        recipientsMap.set(t.userId, {
                            userId: t.userId,
                            recipientType: "TEACHER",
                            recipientName: t.user?.name || "Teacher",
                            recipientIdentifier: t.employeeId || t.user?.email || ""
                        });
                    }
                });

                const enrollments = await prisma.studentEnrollment.findMany({
                    where: { organizationId, status: { in: ["ENROLLED", "ACTIVE"] } },
                    include: {
                        student: {
                            include: {
                                user: { select: { id: true, name: true, email: true } },
                                parents: {
                                    include: {
                                        parent: {
                                            include: { user: { select: { id: true, name: true, email: true } } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                (enrollments || []).forEach((e: any) => {
                    if (e.student?.userId) {
                        recipientsMap.set(e.student.userId, {
                            userId: e.student.userId,
                            recipientType: "STUDENT",
                            recipientName: e.student.user?.name || `${e.student.firstName} ${e.student.lastName}`,
                            recipientIdentifier: e.student.studentId || ""
                        });
                    }
                    (e.student?.parents || []).forEach((p: any) => {
                        if (p.parent?.userId) {
                            recipientsMap.set(p.parent.userId, {
                                userId: p.parent.userId,
                                recipientType: "PARENT",
                                recipientName: p.parent.user?.name || "Parent/Guardian",
                                recipientIdentifier: p.parent.phone || p.parent.user?.email || ""
                            });
                        }
                    });
                });
            } else {
                // Specific roles
                if (target === AnnouncementTarget.TEACHERS || targetRoles.includes("TEACHERS")) {
                    const teachers = await prisma.teacher.findMany({
                        where: { organizationId, status: "ACTIVE" },
                        include: { user: { select: { id: true, name: true, email: true } } }
                    });
                    (teachers || []).forEach((t: any) => {
                        if (t.userId) {
                            recipientsMap.set(t.userId, {
                                userId: t.userId,
                                recipientType: "TEACHER",
                                recipientName: t.user?.name || "Teacher",
                                recipientIdentifier: t.employeeId || t.user?.email || ""
                            });
                        }
                    });
                }

                if (target === AnnouncementTarget.STUDENTS || targetRoles.includes("STUDENTS")) {
                    const enrollments = await prisma.studentEnrollment.findMany({
                        where: { organizationId, status: { in: ["ENROLLED", "ACTIVE"] } },
                        include: {
                            student: {
                                include: {
                                    user: { select: { id: true, name: true, email: true } }
                                }
                            }
                        }
                    });
                    (enrollments || []).forEach((e: any) => {
                        if (e.student?.userId) {
                            recipientsMap.set(e.student.userId, {
                                userId: e.student.userId,
                                recipientType: "STUDENT",
                                recipientName: e.student.user?.name || `${e.student.firstName} ${e.student.lastName}`,
                                recipientIdentifier: e.student.studentId || ""
                            });
                        }
                    });
                }

                if (target === AnnouncementTarget.PARENTS || targetRoles.includes("PARENTS")) {
                    const enrollments = await prisma.studentEnrollment.findMany({
                        where: { organizationId, status: { in: ["ENROLLED", "ACTIVE"] } },
                        include: {
                            student: {
                                include: {
                                    parents: {
                                        include: {
                                            parent: {
                                                include: { user: { select: { id: true, name: true, email: true } } }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                    (enrollments || []).forEach((e: any) => {
                        (e.student?.parents || []).forEach((p: any) => {
                            if (p.parent?.userId) {
                                recipientsMap.set(p.parent.userId, {
                                    userId: p.parent.userId,
                                    recipientType: "PARENT",
                                    recipientName: p.parent.user?.name || "Parent/Guardian",
                                    recipientIdentifier: p.parent.phone || p.parent.user?.email || ""
                                });
                            }
                        });
                    });
                }
            }

            // B. Grade-level targeting
            const allTargetGradeIds = [...gradeIds];
            if (target === AnnouncementTarget.SPECIFIC_GRADE && data.targetId) {
                allTargetGradeIds.push(data.targetId);
            }
            if (allTargetGradeIds.length > 0) {
                const gradeEnrollments = await prisma.studentEnrollment.findMany({
                    where: {
                        organizationId,
                        status: { in: ["ENROLLED", "ACTIVE"] },
                        schoolGradeId: { in: allTargetGradeIds }
                    },
                    include: {
                        student: {
                            include: {
                                user: { select: { id: true, name: true, email: true } },
                                parents: {
                                    include: {
                                        parent: {
                                            include: { user: { select: { id: true, name: true, email: true } } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                (gradeEnrollments || []).forEach((e: any) => {
                    if (e.student?.userId) {
                        recipientsMap.set(e.student.userId, {
                            userId: e.student.userId,
                            recipientType: "STUDENT",
                            recipientName: e.student.user?.name || `${e.student.firstName} ${e.student.lastName}`,
                            recipientIdentifier: e.student.studentId || ""
                        });
                    }
                    (e.student?.parents || []).forEach((p: any) => {
                        if (p.parent?.userId) {
                            recipientsMap.set(p.parent.userId, {
                                userId: p.parent.userId,
                                recipientType: "PARENT",
                                recipientName: p.parent.user?.name || "Parent/Guardian",
                                recipientIdentifier: p.parent.phone || p.parent.user?.email || ""
                            });
                        }
                    });
                });
            }

            // C. Section / Class-level targeting
            const allTargetSectionIds = [...sectionIds];
            if (target === AnnouncementTarget.SPECIFIC_SECTION && data.targetId) {
                allTargetSectionIds.push(data.targetId);
            }
            if (allTargetSectionIds.length > 0) {
                const sectionEnrollments = await prisma.studentEnrollment.findMany({
                    where: {
                        organizationId,
                        status: { in: ["ENROLLED", "ACTIVE"] },
                        sectionId: { in: allTargetSectionIds }
                    },
                    include: {
                        student: {
                            include: {
                                user: { select: { id: true, name: true, email: true } },
                                parents: {
                                    include: {
                                        parent: {
                                            include: { user: { select: { id: true, name: true, email: true } } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                (sectionEnrollments || []).forEach((e: any) => {
                    if (e.student?.userId) {
                        recipientsMap.set(e.student.userId, {
                            userId: e.student.userId,
                            recipientType: "STUDENT",
                            recipientName: e.student.user?.name || `${e.student.firstName} ${e.student.lastName}`,
                            recipientIdentifier: e.student.studentId || ""
                        });
                    }
                    (e.student?.parents || []).forEach((p: any) => {
                        if (p.parent?.userId) {
                            recipientsMap.set(p.parent.userId, {
                                userId: p.parent.userId,
                                recipientType: "PARENT",
                                recipientName: p.parent.user?.name || "Parent/Guardian",
                                recipientIdentifier: p.parent.phone || p.parent.user?.email || ""
                            });
                        }
                    });
                });

                // Also include section teachers
                const sectionAssignments = await prisma.teachingAssignment.findMany({
                    where: { sectionId: { in: allTargetSectionIds } },
                    include: { teacher: { include: { user: { select: { id: true, name: true, email: true } } } } }
                });
                (sectionAssignments || []).forEach((sa: any) => {
                    if (sa.teacher?.userId) {
                        recipientsMap.set(sa.teacher.userId, {
                            userId: sa.teacher.userId,
                            recipientType: "TEACHER",
                            recipientName: sa.teacher.user?.name || "Teacher",
                            recipientIdentifier: sa.teacher.employeeId || sa.teacher.user?.email || ""
                        });
                    }
                });
            }

            // D. Specific individual Teachers
            if (teacherIds.length > 0) {
                const specificTeachers = await prisma.teacher.findMany({
                    where: {
                        organizationId,
                        OR: [
                            { id: { in: teacherIds } },
                            { userId: { in: teacherIds } }
                        ]
                    },
                    include: { user: { select: { id: true, name: true, email: true } } }
                });
                (specificTeachers || []).forEach((t: any) => {
                    if (t.userId) {
                        recipientsMap.set(t.userId, {
                            userId: t.userId,
                            recipientType: "TEACHER",
                            recipientName: t.user?.name || "Teacher",
                            recipientIdentifier: t.employeeId || t.user?.email || ""
                        });
                    }
                });
            }

            // E. Specific individual Students
            if (studentIds.length > 0) {
                const specificStudents = await prisma.student.findMany({
                    where: {
                        OR: [
                            { id: { in: studentIds } },
                            { studentId: { in: studentIds } },
                            { userId: { in: studentIds } }
                        ]
                    },
                    include: {
                        user: { select: { id: true, name: true, email: true } },
                        parents: {
                            include: {
                                parent: {
                                    include: { user: { select: { id: true, name: true, email: true } } }
                                }
                            }
                        }
                    }
                });
                (specificStudents || []).forEach((s: any) => {
                    if (s.userId) {
                        recipientsMap.set(s.userId, {
                            userId: s.userId,
                            recipientType: "STUDENT",
                            recipientName: s.user?.name || `${s.firstName} ${s.lastName}`,
                            recipientIdentifier: s.studentId || ""
                        });
                    }
                    if (target === AnnouncementTarget.PARENTS || targetRoles.includes("PARENTS")) {
                        (s.parents || []).forEach((p: any) => {
                            if (p.parent?.userId) {
                                recipientsMap.set(p.parent.userId, {
                                    userId: p.parent.userId,
                                    recipientType: "PARENT",
                                    recipientName: p.parent.user?.name || "Parent/Guardian",
                                    recipientIdentifier: p.parent.phone || p.parent.user?.email || ""
                                });
                            }
                        });
                    }
                });
            }

            // Remove author from recipients if included
            if (data.authorId) {
                recipientsMap.delete(data.authorId);
            }
        } catch (err) {
            console.error("Failed to resolve recipient user IDs for announcement:", err);
        }

        // 3. Create AnnouncementAcknowledgment records for all recipients
        if (recipientsMap.size > 0) {
            try {
                await prisma.announcementAcknowledgment.createMany({
                    data: Array.from(recipientsMap.values()).map(r => ({
                        announcementId: announcement.id,
                        userId: r.userId,
                        organizationId,
                        recipientType: r.recipientType,
                        recipientName: r.recipientName,
                        recipientIdentifier: r.recipientIdentifier,
                        isRead: false,
                        isAcknowledged: false
                    })),
                    skipDuplicates: true
                });
            } catch (ackErr) {
                console.error("Failed to create announcement acknowledgment records:", ackErr);
            }
        }

        // 4. Dispatch in-app notifications
        let notificationsCount = 0;
        const recipientUserIds = Array.from(recipientsMap.keys());
        if (recipientUserIds.length > 0) {
            try {
                const notifResult = await prisma.notification.createMany({
                    data: recipientUserIds.map(uId => ({
                        userId: uId,
                        organizationId,
                        title: `School Announcement: ${announcement.title}`,
                        content: `Priority: ${priority}.${data.isAcknowledgmentRequired ? " Acknowledgment requested." : ""} ${announcement.content.slice(0, 100)}...`,
                        link: `/dashboard/communication/announcements?id=${announcement.id}`,
                        isRead: false
                    })),
                    skipDuplicates: true
                });
                notificationsCount = notifResult.count;
            } catch (err) {
                console.error("Failed to create notifications for announcement:", err);
            }
        }

        // 5. Audit Log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId,
                    userId: data.authorId,
                    action: "ANNOUNCEMENT_CREATED",
                    resource: "Announcement",
                    resourceId: announcement.id,
                    newValue: {
                        title: announcement.title,
                        target: announcement.target,
                        priority: announcement.priority,
                        recipientsCount: recipientsMap.size,
                        notificationsCount
                    }
                }
            });
        } catch {
            // Ignore audit fail
        }

        emitNewAnnouncement(announcement, organizationId);

        return {
            ...announcement,
            recipientsCount: recipientsMap.size,
            notificationsCount
        };
    }

    static async getAnnouncements(organizationId: string, queryOptionsOrTarget?: AnnouncementTarget | {
        target?: AnnouncementTarget;
        search?: string;
        category?: string;
        priority?: string;
        currentUserId?: string;
    }) {
        let target: AnnouncementTarget | undefined = undefined;
        let search: string | undefined = undefined;
        let category: string | undefined = undefined;
        let priority: string | undefined = undefined;
        let currentUserId: string | undefined = undefined;

        if (typeof queryOptionsOrTarget === "string") {
            target = queryOptionsOrTarget as AnnouncementTarget;
        } else if (queryOptionsOrTarget && typeof queryOptionsOrTarget === "object") {
            target = queryOptionsOrTarget.target;
            search = queryOptionsOrTarget.search;
            category = queryOptionsOrTarget.category;
            priority = queryOptionsOrTarget.priority;
            currentUserId = queryOptionsOrTarget.currentUserId;
        }

        const items = await prisma.announcement.findMany({
            where: {
                organizationId,
                ...(target ? { target } : {}),
                ...(category ? { category } : {}),
                ...(priority ? { priority: priority as any } : {}),
                ...(search ? {
                    OR: [
                        { title: { contains: search, mode: "insensitive" } },
                        { content: { contains: search, mode: "insensitive" } },
                        { code: { contains: search, mode: "insensitive" } }
                    ]
                } : {})
            },
            include: {
                author: { select: { id: true, name: true, email: true } },
                acknowledgments: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    },
                    orderBy: { createdAt: "asc" }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        // Strict Role-Based Visibility Filtering (Teacher, Parent, Student)
        let filteredItems = items;
        if (currentUserId) {
            const [teacherProfile, parentProfile, studentProfile] = await Promise.all([
                prisma.teacher.findFirst({
                    where: { organizationId, userId: currentUserId },
                    include: { assignments: { select: { sectionId: true } } }
                }),
                prisma.parent.findFirst({
                    where: { userId: currentUserId },
                    include: { children: { select: { studentId: true } } }
                }),
                prisma.student.findFirst({
                    where: { userId: currentUserId },
                    include: { enrollments: { where: { organizationId }, select: { sectionId: true, schoolGradeId: true } } }
                })
            ]);

            if (teacherProfile) {
                const assignedSectionIds = teacherProfile.assignments.map(a => a.sectionId).filter(Boolean);
                filteredItems = items.filter(a => {
                    const targetDetails = (a.targetDetails as any) || {};
                    const teacherIds = targetDetails.teacherIds || [];
                    if (teacherIds.length > 0) {
                        return teacherIds.includes(teacherProfile.id) || a.acknowledgments?.some(ack => ack.userId === currentUserId);
                    }

                    const targetRoles = targetDetails.targetRoles || [];
                    if (a.target === "ALL" || a.target === "TEACHERS" || targetRoles.includes("ALL") || targetRoles.includes("TEACHERS")) {
                        return true;
                    }

                    if (a.acknowledgments?.some(ack => ack.userId === currentUserId)) {
                        return true;
                    }

                    const sectionIds = targetDetails.sectionIds || [];
                    if (a.target === "SPECIFIC_SECTION" && a.targetId && assignedSectionIds.includes(a.targetId)) {
                        return true;
                    }
                    if (sectionIds.some((sId: string) => assignedSectionIds.includes(sId))) {
                        return true;
                    }

                    if (a.target === "STUDENTS" || a.target === "PARENTS" || a.target === "SPECIFIC_GRADE" || a.target === "SPECIFIC_SECTION") {
                        return false;
                    }

                    return true;
                });
            } else if (parentProfile) {
                const myChildrenStudentIds = parentProfile.children.map(c => c.studentId);
                filteredItems = items.filter(a => {
                    const targetDetails = (a.targetDetails as any) || {};
                    const targetStudentIds: string[] = targetDetails.studentIds || [];

                    // If announcement is targeted to specific students, parent can ONLY see if it includes their child
                    if (targetStudentIds.length > 0) {
                        return targetStudentIds.some(id => myChildrenStudentIds.includes(id));
                    }

                    if (a.acknowledgments?.some(ack => ack.userId === currentUserId)) {
                        return true;
                    }

                    const targetRoles = targetDetails.targetRoles || [];
                    if (a.target === "ALL" || a.target === "PARENTS" || targetRoles.includes("ALL") || targetRoles.includes("PARENTS")) {
                        return true;
                    }

                    return false;
                });
            } else if (studentProfile) {
                const myStudentId = studentProfile.id;
                const myEnrollment = studentProfile.enrollments[0];
                filteredItems = items.filter(a => {
                    const targetDetails = (a.targetDetails as any) || {};
                    const targetStudentIds: string[] = targetDetails.studentIds || [];

                    // If announcement is targeted to specific students, student can ONLY see if it is themselves
                    if (targetStudentIds.length > 0) {
                        return targetStudentIds.includes(myStudentId);
                    }

                    if (a.acknowledgments?.some(ack => ack.userId === currentUserId)) {
                        return true;
                    }

                    if (myEnrollment?.sectionId && (a.target === "SPECIFIC_SECTION" && a.targetId === myEnrollment.sectionId)) {
                        return true;
                    }
                    if (myEnrollment?.schoolGradeId && (a.target === "SPECIFIC_GRADE" && a.targetId === myEnrollment.schoolGradeId)) {
                        return true;
                    }

                    const targetRoles = targetDetails.targetRoles || [];
                    if (a.target === "ALL" || a.target === "STUDENTS" || targetRoles.includes("ALL") || targetRoles.includes("STUDENTS")) {
                        return true;
                    }

                    return false;
                });
            }
        }

        return filteredItems.map(a => {
            const acks = a.acknowledgments || [];
            const totalRecipients = acks.length;
            const readCount = acks.filter(x => x.isRead).length;
            const acknowledgedCount = acks.filter(x => x.isAcknowledged).length;
            const pendingCount = totalRecipients - acknowledgedCount;
            const acknowledgmentRate = totalRecipients > 0 ? Math.round((acknowledgedCount / totalRecipients) * 100) : 100;

            const viewerAck = currentUserId ? acks.find(x => x.userId === currentUserId) : null;

            return {
                ...a,
                attachments: a.attachmentUrl ? [{ url: a.attachmentUrl, name: a.attachmentName || "Attached Document" }] : [],
                stats: {
                    totalRecipients,
                    readCount,
                    acknowledgedCount,
                    pendingCount,
                    acknowledgmentRate
                },
                viewerAcknowledgment: viewerAck ? {
                    id: viewerAck.id,
                    isRead: viewerAck.isRead,
                    readAt: viewerAck.readAt,
                    isAcknowledged: viewerAck.isAcknowledged,
                    acknowledgedAt: viewerAck.acknowledgedAt,
                    notes: viewerAck.acknowledgmentNotes
                } : null
            };
        });
    }

    /**
     * Acknowledge/Confirm receipt of an announcement by the current recipient.
     */
    static async acknowledgeAnnouncement(announcementId: string, userId: string, notes?: string) {
        const announcement = await prisma.announcement.findUnique({
            where: { id: announcementId }
        });
        if (!announcement) {
            throw new Error("Announcement not found");
        }

        const now = new Date();
        const ack = await prisma.announcementAcknowledgment.upsert({
            where: {
                announcementId_userId: { announcementId, userId }
            },
            create: {
                announcementId,
                userId,
                organizationId: announcement.organizationId,
                isRead: true,
                readAt: now,
                isAcknowledged: true,
                acknowledgedAt: now,
                acknowledgmentNotes: notes?.trim() || null
            },
            update: {
                isRead: true,
                readAt: now,
                isAcknowledged: true,
                acknowledgedAt: now,
                acknowledgmentNotes: notes?.trim() || undefined
            }
        });

        return ack;
    }

    /**
     * Mark an announcement as read by a recipient.
     */
    static async markAnnouncementRead(announcementId: string, userId: string) {
        const announcement = await prisma.announcement.findUnique({
            where: { id: announcementId }
        });
        if (!announcement) return;

        const now = new Date();
        return prisma.announcementAcknowledgment.upsert({
            where: {
                announcementId_userId: { announcementId, userId }
            },
            create: {
                announcementId,
                userId,
                organizationId: announcement.organizationId,
                isRead: true,
                readAt: now
            },
            update: {
                isRead: true,
                readAt: now
            }
        });
    }

    /**
     * Detailed status and recipient ledger for an announcement.
     */
    static async getAnnouncementStatus(organizationId: string, announcementId: string) {
        const announcement = await prisma.announcement.findFirst({
            where: { id: announcementId, organizationId },
            include: {
                author: { select: { id: true, name: true, email: true } },
                acknowledgments: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    },
                    orderBy: { createdAt: "asc" }
                }
            }
        });
        if (!announcement) {
            throw new Error("Announcement not found");
        }

        const acks = announcement.acknowledgments || [];
        const totalRecipients = acks.length;
        const readCount = acks.filter(a => a.isRead).length;
        const acknowledgedCount = acks.filter(a => a.isAcknowledged).length;
        const pendingCount = totalRecipients - acknowledgedCount;

        return {
            announcement: {
                id: announcement.id,
                title: announcement.title,
                content: announcement.content,
                priority: announcement.priority,
                target: announcement.target,
                targetDetails: announcement.targetDetails,
                attachmentUrl: announcement.attachmentUrl,
                attachmentName: announcement.attachmentName,
                isAcknowledgmentRequired: announcement.isAcknowledgmentRequired,
                createdAt: announcement.createdAt,
                author: announcement.author
            },
            stats: {
                totalRecipients,
                readCount,
                acknowledgedCount,
                pendingCount,
                acknowledgmentRate: totalRecipients > 0 ? Math.round((acknowledgedCount / totalRecipients) * 100) : 100
            },
            recipients: acks.map(a => ({
                id: a.id,
                userId: a.userId,
                name: a.recipientName || a.user?.name || "Recipient",
                email: a.user?.email || "",
                identifier: a.recipientIdentifier || "",
                type: a.recipientType || "RECIPIENT",
                isRead: a.isRead,
                readAt: a.readAt,
                isAcknowledged: a.isAcknowledged,
                acknowledgedAt: a.acknowledgedAt,
                notes: a.acknowledgmentNotes
            }))
        };
    }

    /**
     * Retrieves the school's complete academic structure for target selection:
     * - Grades -> Sections (with enrollment counts)
     * - Teachers list
     * - Active Students list
     */
    static async getSchoolAnnouncementRecipientsHierarchy(organizationId: string) {
        // 1. Get active or latest academic year with school grades and sections
        const activeYear = await prisma.academicYear.findFirst({
            where: { organizationId, status: "ACTIVE" },
            include: {
                schoolGrades: {
                    include: {
                        grade: true,
                        sections: {
                            include: {
                                _count: {
                                    select: { studentEnrollments: true }
                                }
                            },
                            orderBy: { name: "asc" }
                        }
                    },
                    orderBy: { grade: { level: "asc" } }
                }
            }
        }) || await prisma.academicYear.findFirst({
            where: { organizationId },
            orderBy: { startDate: "desc" },
            include: {
                schoolGrades: {
                    include: {
                        grade: true,
                        sections: {
                            include: {
                                _count: {
                                    select: { studentEnrollments: true }
                                }
                            },
                            orderBy: { name: "asc" }
                        }
                    },
                    orderBy: { grade: { level: "asc" } }
                }
            }
        });

        // 2. Fetch all school grades (with fallback if activeYear.schoolGrades is empty)
        let schoolGrades = activeYear?.schoolGrades || [];
        if (schoolGrades.length === 0) {
            schoolGrades = await prisma.schoolGrade.findMany({
                where: {
                    OR: [
                        { academicYear: { organizationId } },
                        { grade: { organizationId } }
                    ]
                },
                include: {
                    grade: true,
                    sections: {
                        include: {
                            _count: {
                                select: { studentEnrollments: true }
                            }
                        },
                        orderBy: { name: "asc" }
                    }
                },
                orderBy: { grade: { level: "asc" } }
            });
        }

        // 3. Get all teachers in school with their subject specializations and assignments
        const teachers = await prisma.teacher.findMany({
            where: { organizationId },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
                specializations: { select: { subject: { select: { id: true, name: true } } } },
                assignments: {
                    select: {
                        schoolGradeId: true,
                        sectionId: true,
                        schoolGrade: { select: { id: true, gradeId: true, grade: { select: { name: true } } } },
                        section: { select: { id: true, name: true } },
                        subject: { select: { id: true, name: true } }
                    }
                },
                homeroomSections: {
                    select: {
                        id: true,
                        name: true,
                        schoolGradeId: true
                    }
                }
            },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }]
        });

        // 4. Get enrolled students in school
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { organizationId },
            select: {
                id: true,
                studentId: true,
                sectionId: true,
                schoolGradeId: true,
                student: {
                    select: {
                        id: true,
                        studentId: true,
                        firstName: true,
                        lastName: true,
                        userId: true,
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                section: {
                    select: {
                        id: true,
                        name: true,
                        schoolGradeId: true,
                        schoolGrade: { select: { id: true, grade: { select: { name: true, level: true } } } }
                    }
                },
                schoolGrade: {
                    select: {
                        id: true,
                        grade: { select: { name: true, level: true } }
                    }
                }
            },
            orderBy: [
                { schoolGrade: { grade: { level: "asc" } } },
                { section: { name: "asc" } }
            ]
        });

        // Format into clean structured hierarchy
        const gradesFormatted = (schoolGrades || []).map((sg: any) => {
            const totalStudentsInGrade = (sg.sections || []).reduce((acc: number, s: any) => acc + (s._count?.studentEnrollments || 0), 0);
            return {
                id: sg.id,
                gradeId: sg.gradeId,
                name: sg.grade?.name || `Grade ${sg.grade?.level || ""}`,
                level: sg.grade?.level || 0,
                totalStudents: totalStudentsInGrade,
                sections: (sg.sections || []).map((sec: any) => ({
                    id: sec.id,
                    name: sec.name,
                    fullName: `${sg.grade?.name || "Grade"} - ${sec.name}`,
                    studentsCount: sec._count?.studentEnrollments || 0
                }))
            };
        });

        const teachersFormatted = (teachers || []).map((t: any) => {
            const assignedGradeIds = new Set<string>();
            const assignedSectionIds = new Set<string>();
            (t.assignments || []).forEach((a: any) => {
                if (a.schoolGradeId) assignedGradeIds.add(a.schoolGradeId);
                if (a.sectionId) assignedSectionIds.add(a.sectionId);
            });
            (t.homeroomSections || []).forEach((hs: any) => {
                if (hs.schoolGradeId) assignedGradeIds.add(hs.schoolGradeId);
                if (hs.id) assignedSectionIds.add(hs.id);
            });

            return {
                id: t.id,
                userId: t.userId || "",
                name: t.user?.name || `${t.firstName || ""} ${t.lastName || ""}`.trim() || "Teacher",
                email: t.user?.email || t.email || "",
                subjects: (t.specializations || []).map((s: any) => s.subject?.name).filter(Boolean),
                gradeIds: Array.from(assignedGradeIds),
                sectionIds: Array.from(assignedSectionIds)
            };
        });

        const studentsFormatted = (enrollments || []).map((e: any) => ({
            id: e.student?.id || e.studentId,
            userId: e.student?.user?.id || e.student?.userId || "",
            name: e.student?.user?.name || `${e.student?.firstName || ""} ${e.student?.lastName || ""}`.trim() || "Student",
            email: e.student?.user?.email || "",
            studentIdNumber: e.student?.studentId || "",
            sectionId: e.sectionId || "",
            sectionName: e.section ? `${e.section.schoolGrade?.grade?.name || "Grade"} - ${e.section.name}` : "",
            gradeId: e.schoolGradeId || e.section?.schoolGradeId || "",
            gradeName: e.schoolGrade?.grade?.name || e.section?.schoolGrade?.grade?.name || ""
        }));

        return {
            academicYear: activeYear ? { id: activeYear.id, name: activeYear.name } : null,
            totalGrades: gradesFormatted.length,
            totalTeachers: teachersFormatted.length,
            totalStudents: studentsFormatted.length,
            grades: gradesFormatted,
            teachers: teachersFormatted,
            students: studentsFormatted
        };
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
        code?: string | null;
        category?: string | null;
        priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
        target?: AnnouncementTarget;
        targetId?: string | null;
        targetDetails?: any;
        attachmentUrl?: string | null;
        attachmentName?: string | null;
        isAcknowledgmentRequired?: boolean;
        expiresAt?: string | Date | null;
    }) {
        const item = await prisma.announcement.findFirst({ where: { id, organizationId } });
        if (!item) throw new Error("Announcement not found");

        return prisma.announcement.update({
            where: { id },
            data: {
                ...(data.title ? { title: data.title.trim() } : {}),
                ...(data.content ? { content: data.content.trim() } : {}),
                ...(data.code !== undefined ? { code: data.code?.trim() || null } : {}),
                ...(data.category !== undefined ? { category: data.category?.trim() || null } : {}),
                ...(data.priority ? { priority: data.priority as any } : {}),
                ...(data.target ? { target: data.target } : {}),
                ...(data.targetId !== undefined ? { targetId: data.targetId } : {}),
                ...(data.targetDetails !== undefined ? { targetDetails: data.targetDetails } : {}),
                ...(data.attachmentUrl !== undefined ? { attachmentUrl: data.attachmentUrl } : {}),
                ...(data.attachmentName !== undefined ? { attachmentName: data.attachmentName } : {}),
                ...(data.isAcknowledgmentRequired !== undefined ? { isAcknowledgmentRequired: data.isAcknowledgmentRequired } : {}),
                ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt ? new Date(data.expiresAt) : null } : {})
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

    static async getUserNotifications(userId: string, organizationId?: string) {
        return prisma.notification.findMany({
            where: {
                userId,
                ...(organizationId ? { organizationId } : {})
            },
            include: {
                organization: {
                    select: { id: true, name: true, type: true }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 50
        });
    }

    static async markNotificationRead(id: string, userId: string, organizationId?: string) {
        const notif = await prisma.notification.findFirst({
            where: {
                id,
                userId,
                ...(organizationId ? { organizationId } : {})
            }
        });
        if (!notif) throw new Error("Notification not found");

        return prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });
    }

    static async markAllNotificationsRead(userId: string, organizationId?: string) {
        return prisma.notification.updateMany({
            where: {
                userId,
                ...(organizationId ? { organizationId } : {}),
                isRead: false
            },
            data: { isRead: true }
        });
    }

    static async getUnreadNotificationCount(userId: string, organizationId?: string): Promise<number> {
        return prisma.notification.count({
            where: {
                userId,
                ...(organizationId ? { organizationId } : {}),
                isRead: false
            }
        });
    }

    // =========================================================
    // DIRECT MESSAGES — org-scoped, secure
    // =========================================================
    // MESSAGING SETTINGS (School Toggles)
    // =========================================================

    static async getMessagingSettings(organizationId: string) {
        const profile = prisma.schoolProfile?.findUnique
            ? await prisma.schoolProfile.findUnique({
                  where: { organizationId },
                  select: { configuration: true }
              })
            : null;
        const rawConfig = (profile?.configuration as Record<string, any>) || {};
        const messaging = rawConfig.messaging || {};
        return {
            allowTeacherDM: messaging.allowTeacherDM !== undefined ? Boolean(messaging.allowTeacherDM) : true,
            allowStudentDM: messaging.allowStudentDM !== undefined ? Boolean(messaging.allowStudentDM) : false,
            allowParentDM: messaging.allowParentDM !== undefined ? Boolean(messaging.allowParentDM) : false,
        };
    }

    static async updateMessagingSettings(organizationId: string, settings: {
        allowTeacherDM?: boolean;
        allowStudentDM?: boolean;
        allowParentDM?: boolean;
    }) {
        const profile = prisma.schoolProfile?.findUnique
            ? await prisma.schoolProfile.findUnique({
                  where: { organizationId }
              })
            : null;
        const rawConfig = (profile?.configuration as Record<string, any>) || {};
        const currentMessaging = rawConfig.messaging || {};
        const updatedMessaging = {
            allowTeacherDM: settings.allowTeacherDM !== undefined ? Boolean(settings.allowTeacherDM) : (currentMessaging.allowTeacherDM ?? true),
            allowStudentDM: settings.allowStudentDM !== undefined ? Boolean(settings.allowStudentDM) : (currentMessaging.allowStudentDM ?? false),
            allowParentDM: settings.allowParentDM !== undefined ? Boolean(settings.allowParentDM) : (currentMessaging.allowParentDM ?? false),
        };
        rawConfig.messaging = updatedMessaging;

        if (prisma.schoolProfile?.upsert) {
            await prisma.schoolProfile.upsert({
                where: { organizationId },
                create: {
                    organizationId,
                    configuration: rawConfig
                },
                update: {
                    configuration: rawConfig
                }
            });
        }

        return updatedMessaging;
    }

    // =========================================================
    // DIRECT MESSAGES
    // =========================================================

    static async sendMessage(data: {
        organizationId: string;
        senderId: string;
        receiverId: string;
        content: string;
        attachmentUrl?: string | null;
        attachmentName?: string | null;
        attachmentType?: string | null;
    }) {
        if (data.senderId === data.receiverId) {
            throw new Error("Cannot send a message to yourself");
        }

        // Verify receiver belongs to this organization
        const receiverRoleAssignment = await prisma.roleAssignment.findFirst({
            where: { userId: data.receiverId, scope: { id: data.organizationId } },
            include: { role: true }
        });

        let isReceiverMember = Boolean(receiverRoleAssignment);

        if (!isReceiverMember && prisma.teacher?.findFirst) {
            const teacher = await prisma.teacher.findFirst({
                where: { userId: data.receiverId, organizationId: data.organizationId }
            });
            if (teacher) isReceiverMember = true;
        }

        if (!isReceiverMember && prisma.studentEnrollment?.findFirst) {
            const studentEnrollment = await prisma.studentEnrollment.findFirst({
                where: { student: { userId: data.receiverId }, organizationId: data.organizationId }
            });
            if (studentEnrollment) isReceiverMember = true;
        }

        if (!isReceiverMember && prisma.parent?.findFirst) {
            const parent = await prisma.parent.findFirst({
                where: {
                    userId: data.receiverId,
                    children: {
                        some: {
                            student: {
                                enrollments: {
                                    some: { organizationId: data.organizationId }
                                }
                            }
                        }
                    }
                }
            });
            if (parent) isReceiverMember = true;
        }

        if (!isReceiverMember) throw new Error("Recipient is not a member of this school");

        // Check sender's roles in this school
        const senderAssignments = (await prisma.roleAssignment.findMany?.({
            where: { userId: data.senderId, scope: { id: data.organizationId } },
            include: { role: true }
        })) || [];
        const senderRoleNames = senderAssignments.map(a => a?.role?.name).filter(Boolean);

        // Also check if sender is registered as Teacher, Student, or Parent in this school
        if (senderRoleNames.length === 0) {
            if (prisma.teacher?.findFirst) {
                const t = await prisma.teacher.findFirst({
                    where: { userId: data.senderId, organizationId: data.organizationId }
                });
                if (t) senderRoleNames.push("TEACHER");
            }
            if (prisma.studentEnrollment?.findFirst) {
                const s = await prisma.studentEnrollment.findFirst({
                    where: { student: { userId: data.senderId }, organizationId: data.organizationId }
                });
                if (s) senderRoleNames.push("STUDENT");
            }
            if (prisma.parent?.findFirst) {
                const p = await prisma.parent.findFirst({
                    where: {
                        userId: data.senderId,
                        children: {
                            some: {
                                student: {
                                    enrollments: {
                                        some: { organizationId: data.organizationId }
                                    }
                                }
                            }
                        }
                    }
                });
                if (p) senderRoleNames.push("PARENT");
            }
        }

        const isSchoolAdmin = senderRoleNames.some(r => ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"].includes(r));

        if (!isSchoolAdmin && senderRoleNames.length > 0) {
            // Check messaging settings toggle
            const settings = await this.getMessagingSettings(data.organizationId);

            const isTeacher = senderRoleNames.includes("TEACHER");
            const isStudent = senderRoleNames.includes("STUDENT");
            const isParent = senderRoleNames.includes("PARENT");

            if (isTeacher && !settings.allowTeacherDM) {
                throw new Error("Direct messaging from teachers is currently disabled by school administration.");
            }
            if (isStudent && !settings.allowStudentDM) {
                throw new Error("Direct messaging from students is currently disabled by school administration.");
            }
            if (isParent && !settings.allowParentDM) {
                throw new Error("Direct messaging from parents is currently disabled by school administration.");
            }
            // Verified school membership and active toggles above. Messaging is enabled between eligible school members.
        }

        const message = await prisma.message.create({
            data: {
                organizationId: data.organizationId,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                attachmentUrl: data.attachmentUrl || null,
                attachmentName: data.attachmentName || null,
                attachmentType: data.attachmentType || null
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
                link: `/dashboard/communication/messages?contactId=${data.senderId}`
            });
        } catch (_) {
            // Notification failure must not block message delivery
        }

        emitNewMessageToUsers(message);
        return message;
    }

    static async getMessages(userId: string, organizationId: string, otherUserId?: string) {
        if (otherUserId) {
            await prisma.message.updateMany({
                where: {
                    organizationId,
                    senderId: otherUserId,
                    receiverId: userId,
                    isRead: false
                },
                data: { isRead: true }
            });
            getIO()?.to(`user:${otherUserId}`).emit("messages_read", { byUserId: userId });
        }

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
                senderId: userId
            }
        });
        if (!message) throw new Error("Message not found or unauthorized to delete");

        // Soft delete message content so thread history stays intact
        return prisma.message.update({
            where: { id: messageId },
            data: {
                content: "[This message was deleted]",
                attachmentUrl: null,
                attachmentName: null,
                attachmentType: null
            }
        });
    }

    static async updateMessage(organizationId: string, userId: string, messageId: string, content: string) {
        if (!content || !content.trim()) {
            throw new Error("Message content cannot be empty");
        }
        const message = await prisma.message.findFirst({
            where: {
                id: messageId,
                organizationId,
                senderId: userId
            }
        });
        if (!message) throw new Error("Message not found or you are not authorized to edit it");
        if (message.content === "[This message was deleted]") {
            throw new Error("Cannot edit a deleted message");
        }

        const currentType = message.attachmentType || "";
        const updatedType = currentType.includes("edited")
            ? currentType
            : (currentType ? `${currentType};edited` : "edited");

        return prisma.message.update({
            where: { id: messageId },
            data: {
                content: content.trim(),
                attachmentType: updatedType
            }
        });
    }

    /**
     * Returns users eligible for direct messaging within this school only.
     * Categorized by role: TEACHER, STUDENT, PARENT, ADMIN.
     * If caller is a non-admin (Teacher, Student, Parent), only School Admins are returned.
     */
    static async getUsersForMessaging(userId: string, organizationId: string) {
        // Check caller's role
        const callerAssignments = (await prisma.roleAssignment.findMany?.({
            where: { userId, scope: { id: organizationId } },
            include: { role: true }
        })) || [];
        const callerRoleNames = callerAssignments.map(a => a?.role?.name).filter(Boolean);
        const isSchoolAdmin = callerRoleNames.some(r => ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"].includes(r));

        const users: Array<any> = [];
        const seen = new Set<string>();

        // 1. School Administration (Always available to everyone in the school)
        const adminAssignments = (await prisma.roleAssignment.findMany?.({
            where: {
                scopeId: organizationId,
                userId: { not: userId },
                role: { name: { in: ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"] } }
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                role: { select: { id: true, name: true, description: true } }
            }
        })) || [];
        for (const a of adminAssignments) {
            if (!a.user || seen.has(a.user.id)) continue;
            seen.add(a.user.id);
            users.push({
                id: a.user.id,
                name: a.user.name,
                email: a.user.email,
                role: a.role,
                category: "ADMIN",
                detail: a.role.description || "School Administrator / Principal"
            });
        }

        // Check if caller is Parent
        let isParent = callerRoleNames.includes("PARENT");
        let parentRecord: any = null;
        if (!isParent && prisma.parent?.findFirst) {
            parentRecord = await prisma.parent.findFirst({
                where: {
                    userId,
                    children: {
                        some: {
                            student: {
                                enrollments: {
                                    some: { organizationId }
                                }
                            }
                        }
                    }
                },
                include: {
                    children: {
                        include: {
                            student: {
                                include: {
                                    user: { select: { id: true, name: true, email: true } },
                                    enrollments: {
                                        where: { organizationId },
                                        include: {
                                            schoolGrade: { select: { grade: { select: { name: true } } } },
                                            section: { select: { name: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            if (parentRecord) isParent = true;
        } else if (isParent && prisma.parent?.findFirst) {
            parentRecord = await prisma.parent.findFirst({
                where: { userId },
                include: {
                    children: {
                        include: {
                            student: {
                                include: {
                                    user: { select: { id: true, name: true, email: true } },
                                    enrollments: {
                                        where: { organizationId },
                                        include: {
                                            schoolGrade: { select: { grade: { select: { name: true } } } },
                                            section: { select: { name: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }

        // If caller is Parent:
        if (isParent) {
            // 2. Teachers for the school
            const teachers = (await prisma.teacher.findMany?.({
                where: { organizationId, status: "ACTIVE" },
                include: {
                    user: { select: { id: true, name: true, email: true } }
                }
            })) || [];
            for (const t of teachers) {
                if (!t.user || seen.has(t.user.id)) continue;
                seen.add(t.user.id);
                users.push({
                    id: t.user.id,
                    name: t.user.name || `${t.firstName} ${t.lastName}`,
                    email: t.user.email || t.email,
                    role: { name: "TEACHER" },
                    category: "TEACHER",
                    detail: t.fieldOfStudy ? `${t.fieldOfStudy} Teacher` : "Faculty Teacher"
                });
            }

            // 3. Their Children (Students)
            if (parentRecord?.children) {
                for (const c of parentRecord.children) {
                    const st = c.student;
                    if (!st || !st.user || seen.has(st.user.id)) continue;
                    seen.add(st.user.id);
                    const enroll = st.enrollments?.[0];
                    const gradeName = enroll?.schoolGrade?.grade?.name || "";
                    const secName = enroll?.section?.name ? `-${enroll.section.name}` : "";
                    users.push({
                        id: st.user.id,
                        name: st.user.name || `${st.firstName} ${st.lastName}`,
                        email: st.user.email,
                        role: { name: "STUDENT" },
                        category: "STUDENT",
                        detail: gradeName ? `Your Child (Grade ${gradeName}${secName})` : "Your Child (Student)"
                    });
                }
            }
            return users;
        }

        // Check if caller is Student
        let isStudent = callerRoleNames.includes("STUDENT");
        let studentRecord: any = null;
        if (!isStudent && prisma.studentEnrollment?.findFirst) {
            const enroll = await prisma.studentEnrollment.findFirst({
                where: { student: { userId }, organizationId },
                include: {
                    student: {
                        include: {
                            parents: {
                                include: {
                                    parent: {
                                        include: {
                                            user: { select: { id: true, name: true, email: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
            if (enroll) {
                isStudent = true;
                studentRecord = enroll.student;
            }
        } else if (isStudent && prisma.student?.findFirst) {
            studentRecord = await prisma.student.findFirst({
                where: { userId },
                include: {
                    parents: {
                        include: {
                            parent: {
                                include: {
                                    user: { select: { id: true, name: true, email: true } }
                                }
                            }
                        }
                    }
                }
            });
        }

        // If caller is Student:
        if (isStudent) {
            // 2. Teachers for the school
            const teachers = (await prisma.teacher.findMany?.({
                where: { organizationId, status: "ACTIVE" },
                include: {
                    user: { select: { id: true, name: true, email: true } }
                }
            })) || [];
            for (const t of teachers) {
                if (!t.user || seen.has(t.user.id)) continue;
                seen.add(t.user.id);
                users.push({
                    id: t.user.id,
                    name: t.user.name || `${t.firstName} ${t.lastName}`,
                    email: t.user.email || t.email,
                    role: { name: "TEACHER" },
                    category: "TEACHER",
                    detail: t.fieldOfStudy ? `${t.fieldOfStudy} Teacher` : "Subject Teacher"
                });
            }

            // 3. Linked Parents
            if (studentRecord?.parents) {
                for (const p of studentRecord.parents) {
                    const pr = p.parent;
                    if (!pr || !pr.user || seen.has(pr.user.id)) continue;
                    seen.add(pr.user.id);
                    users.push({
                        id: pr.user.id,
                        name: pr.user.name || `${pr.firstName} ${pr.lastName}`,
                        email: pr.user.email || pr.email,
                        role: { name: "PARENT" },
                        category: "PARENT",
                        detail: p.relationship ? `Your Parent (${p.relationship})` : "Your Parent / Guardian"
                    });
                }
            }
            return users;
        }

        // Caller is Teacher or School Admin: Return Teachers, Students, Parents, and Admins
        // 2. Active Teachers
        const teachers = (await prisma.teacher.findMany?.({
            where: { organizationId, status: "ACTIVE" },
            include: {
                user: { select: { id: true, name: true, email: true } }
            }
        })) || [];
        for (const t of teachers) {
            if (!t.user || seen.has(t.user.id)) continue;
            seen.add(t.user.id);
            users.push({
                id: t.user.id,
                name: t.user.name || `${t.firstName} ${t.lastName}`,
                email: t.user.email || t.email,
                role: { name: "TEACHER" },
                category: "TEACHER",
                detail: t.fieldOfStudy ? `${t.fieldOfStudy} Teacher` : "Faculty Teacher"
            });
        }

        // 3. Enrolled Students
        const enrollments = (await prisma.studentEnrollment.findMany?.({
            where: { organizationId, status: { in: ["ENROLLED", "ACTIVE"] } },
            include: {
                student: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                schoolGrade: {
                    select: {
                        grade: {
                            select: { name: true }
                        }
                    }
                },
                section: { select: { name: true } }
            },
            take: 300
        })) || [];
        for (const e of enrollments) {
            const u = e.student?.user;
            if (!u || seen.has(u.id)) continue;
            seen.add(u.id);
            const gradeName = e.schoolGrade?.grade?.name || "";
            const sectionName = e.section?.name ? `-${e.section.name}` : "";
            users.push({
                id: u.id,
                name: u.name || `${e.student.firstName} ${e.student.lastName}`,
                email: u.email,
                role: { name: "STUDENT" },
                category: "STUDENT",
                detail: gradeName ? `Student (${gradeName}${sectionName})` : "Student"
            });
        }

        // 4. Parents linked to students in this school
        const parents = (await prisma.parent.findMany?.({
            where: {
                children: {
                    some: {
                        student: {
                            enrollments: {
                                some: { organizationId }
                            }
                        }
                    }
                }
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                children: {
                    include: {
                        student: { select: { firstName: true, lastName: true } }
                    }
                }
            },
            take: 300
        })) || [];
        for (const p of parents) {
            if (!p.user || seen.has(p.user.id)) continue;
            seen.add(p.user.id);
            const childNames = p.children?.map((c: any) => `${c.student?.firstName || ""} ${c.student?.lastName || ""}`).join(", ");
            users.push({
                id: p.user.id,
                name: p.user.name || `${p.firstName} ${p.lastName}`,
                email: p.user.email || p.email,
                role: { name: "PARENT" },
                category: "PARENT",
                detail: childNames ? `Parent of ${childNames}` : "Parent / Guardian"
            });
        }

        return users;
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
                        studentId: true,
                        parents: {
                            include: {
                                parent: { select: { id: true, userId: true, firstName: true, lastName: true, phoneNumber: true } }
                            }
                        }
                    }
                },
                section: { select: { id: true, name: true } },
                schoolGrade: { include: { grade: { select: { id: true, name: true } } } }
            }
        });

        const contacts: Array<{
            parentUserId: string;
            parentName: string;
            parentPhone?: string | null;
            relationship?: string;
            studentDbId: string;
            studentCode: string;
            studentName: string;
            enrollmentId: string;
            sectionId: string | null;
            sectionName: string | null;
            schoolGradeId: string;
            gradeName: string;
        }> = [];

        for (const enroll of enrollments) {
            for (const ps of enroll.student.parents) {
                if (!ps.parent.userId) continue;
                contacts.push({
                    parentUserId: ps.parent.userId,
                    parentName: `${ps.parent.firstName} ${ps.parent.lastName}`,
                    parentPhone: ps.parent.phoneNumber ?? null,
                    relationship: ps.relationship || "Guardian",
                    studentDbId: enroll.student.id,
                    studentCode: enroll.student.studentId,
                    studentName: `${enroll.student.firstName} ${enroll.student.lastName}`,
                    enrollmentId: enroll.id,
                    sectionId: enroll.section?.id ?? null,
                    sectionName: enroll.section?.name ?? null,
                    schoolGradeId: enroll.schoolGradeId,
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

    /**
     * Teacher Broadcast / Direct message dispatch to students:
     * - SPECIFIC_STUDENT: sends to 1 student
     * - SPECIFIC_SECTION: sends to all students enrolled in a specific section
     * - ALL_STUDENTS: sends to all students in teacher's assigned classes
     */
    static async sendTeacherStudentBroadcast(data: {
        teacherUserId: string;
        organizationId: string;
        targetType: "SPECIFIC_STUDENT" | "SPECIFIC_SECTION" | "ALL_STUDENTS";
        sectionId?: string;
        studentId?: string;
        receiverId?: string;
        subject?: string;
        content: string;
        priority?: "NORMAL" | "HIGH" | "URGENT";
    }) {
        if (!data.content?.trim()) {
            throw new Error("Message content is required");
        }

        // 1. Resolve teacher
        let teacher = await prisma.teacher.findFirst({
            where: { userId: data.teacherUserId, organizationId: data.organizationId },
            include: { assignments: true }
        });
        if (!teacher) {
            teacher = await prisma.teacher.findFirst({
                where: { organizationId: data.organizationId },
                include: { assignments: true }
            });
        }
        if (!teacher) {
            throw new Error("Teacher profile not found");
        }

        const teacherAssignments = teacher.assignments || [];
        const teacherSectionIds = teacherAssignments.map(a => a.sectionId).filter(Boolean) as string[];
        const teacherGradeIds = teacherAssignments.map(a => a.schoolGradeId).filter(Boolean) as string[];

        // 2. Identify target enrollments / students
        const targetUserIds: string[] = [];
        const targetStudentNames: string[] = [];

        if (data.targetType === "SPECIFIC_STUDENT") {
            let studentUserId = data.receiverId;
            if (!studentUserId && data.studentId) {
                const enrollment = await prisma.studentEnrollment.findFirst({
                    where: {
                        organizationId: data.organizationId,
                        student: {
                            OR: [{ id: data.studentId }, { studentId: data.studentId }, { userId: data.studentId }]
                        }
                    },
                    include: {
                        student: {
                            select: { id: true, userId: true, firstName: true, lastName: true }
                        }
                    }
                });
                if (enrollment?.student?.userId) {
                    studentUserId = enrollment.student.userId;
                    targetStudentNames.push(`${enrollment.student.firstName} ${enrollment.student.lastName}`);
                }
            }
            if (!studentUserId) {
                throw new Error("Student portal user account not found or not specified");
            }
            targetUserIds.push(studentUserId);
        } else if (data.targetType === "SPECIFIC_SECTION") {
            if (!data.sectionId) {
                throw new Error("sectionId is required for section broadcast");
            }
            const enrollments = await prisma.studentEnrollment.findMany({
                where: {
                    organizationId: data.organizationId,
                    sectionId: data.sectionId,
                    status: { in: ["ENROLLED", "ACTIVE"] }
                },
                include: {
                    student: { select: { id: true, userId: true, firstName: true, lastName: true } }
                }
            });

            enrollments.forEach(e => {
                if (e.student?.userId && !targetUserIds.includes(e.student.userId)) {
                    targetUserIds.push(e.student.userId);
                    targetStudentNames.push(`${e.student.firstName} ${e.student.lastName}`);
                }
            });
        } else if (data.targetType === "ALL_STUDENTS") {
            const whereClause: any = {
                organizationId: data.organizationId,
                status: { in: ["ENROLLED", "ACTIVE"] }
            };
            if (teacherSectionIds.length > 0 || teacherGradeIds.length > 0) {
                whereClause.OR = [
                    ...(teacherSectionIds.length > 0 ? [{ sectionId: { in: teacherSectionIds } }] : []),
                    ...(teacherGradeIds.length > 0 ? [{ schoolGradeId: { in: teacherGradeIds } }] : [])
                ];
            }
            const enrollments = await prisma.studentEnrollment.findMany({
                where: whereClause,
                include: {
                    student: { select: { id: true, userId: true, firstName: true, lastName: true } }
                }
            });

            enrollments.forEach(e => {
                if (e.student?.userId && !targetUserIds.includes(e.student.userId)) {
                    targetUserIds.push(e.student.userId);
                    targetStudentNames.push(`${e.student.firstName} ${e.student.lastName}`);
                }
            });
        }

        if (targetUserIds.length === 0) {
            throw new Error("No active student portal accounts found for this target selection");
        }

        const fullContent = data.subject ? `[${data.subject}]\n\n${data.content}` : data.content;

        // 3. Dispatch messages & notifications
        let sentCount = 0;
        for (const recipientUserId of targetUserIds) {
            if (recipientUserId === data.teacherUserId) continue;

            // Direct message record
            await prisma.message.create({
                data: {
                    organizationId: data.organizationId,
                    senderId: data.teacherUserId,
                    receiverId: recipientUserId,
                    content: fullContent
                }
            });

            // Notification
            await prisma.notification.create({
                data: {
                    userId: recipientUserId,
                    organizationId: data.organizationId,
                    title: data.subject || (data.targetType === "SPECIFIC_STUDENT" ? "Teacher Message" : "Class Announcement"),
                    content: data.content.slice(0, 300),
                    link: "/dashboard/student/communication"
                }
            });

            sentCount++;
        }

        // 4. Also register Section Announcement if broadcast to section
        if (data.targetType === "SPECIFIC_SECTION" && data.sectionId) {
            try {
                await this.createAnnouncement(data.organizationId, {
                    title: data.subject || "Section Announcement",
                    content: data.content,
                    category: "ACADEMIC",
                    priority: data.priority === "URGENT" ? "URGENT" : data.priority === "HIGH" ? "HIGH" : "NORMAL",
                    target: AnnouncementTarget.SPECIFIC_SECTION,
                    targetId: data.sectionId,
                    authorId: data.teacherUserId
                });
            } catch (annErr) {
                console.warn("Section announcement creation skipped:", annErr);
            }
        }

        return {
            success: true,
            targetType: data.targetType,
            sentCount,
            totalRecipients: targetUserIds.length,
            recipientNames: targetStudentNames.slice(0, 10)
        };
    }

    /**
     * Teacher Broadcast / Direct message dispatch to parents:
     * - SPECIFIC_PARENT: sends to 1 student's parent (resolves via receiverId, enrollmentId, or studentId)
     * - SPECIFIC_SECTION: sends to all parents of students in a specific section
     * - ALL_PARENTS: sends to all parents of students across all teacher's assigned classes
     */
    static async sendTeacherParentBroadcast(data: {
        teacherUserId: string;
        organizationId: string;
        targetType: "SPECIFIC_PARENT" | "SPECIFIC_SECTION" | "ALL_PARENTS";
        sectionId?: string;
        studentId?: string;
        enrollmentId?: string;
        receiverId?: string;
        subject?: string;
        content: string;
        priority?: "NORMAL" | "HIGH" | "URGENT";
    }) {
        if (!data.content?.trim()) {
            throw new Error("Message content is required");
        }

        // 1. Resolve teacher
        let teacher = await prisma.teacher.findFirst({
            where: { userId: data.teacherUserId, organizationId: data.organizationId },
            include: { assignments: true }
        });
        if (!teacher) {
            teacher = await prisma.teacher.findFirst({
                where: { organizationId: data.organizationId },
                include: { assignments: true }
            });
        }
        if (!teacher) {
            throw new Error("Teacher profile not found");
        }

        const teacherAssignments = teacher.assignments || [];
        const teacherSectionIds = teacherAssignments.map(a => a.sectionId).filter(Boolean) as string[];
        const teacherGradeIds = teacherAssignments.map(a => a.schoolGradeId).filter(Boolean) as string[];

        // 2. Identify target parent user IDs
        const targetParentUserIds: string[] = [];

        if (data.targetType === "SPECIFIC_PARENT") {
            let parentUserId = data.receiverId;
            if (!parentUserId && (data.enrollmentId || data.studentId)) {
                const enrollment = await prisma.studentEnrollment.findFirst({
                    where: {
                        organizationId: data.organizationId,
                        ...(data.enrollmentId ? { id: data.enrollmentId } : { studentId: data.studentId })
                    },
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

                const parentLink = enrollment?.student.parents.find(ps => !!ps.parent.userId);
                if (parentLink?.parent.userId) {
                    parentUserId = parentLink.parent.userId;
                }
            }

            if (!parentUserId && data.studentId) {
                const enrollment = await prisma.studentEnrollment.findFirst({
                    where: {
                        organizationId: data.organizationId,
                        student: {
                            OR: [{ id: data.studentId }, { studentId: data.studentId }]
                        }
                    },
                    include: {
                        student: {
                            include: {
                                parents: {
                                    include: {
                                        parent: { select: { id: true, userId: true } }
                                    }
                                }
                            }
                        }
                    }
                });
                const pLink = enrollment?.student.parents.find(ps => !!ps.parent.userId);
                if (pLink?.parent.userId) {
                    parentUserId = pLink.parent.userId;
                }
            }

            if (!parentUserId) {
                throw new Error("Parent portal user account not found for the selected student");
            }
            targetParentUserIds.push(parentUserId);
        } else if (data.targetType === "SPECIFIC_SECTION") {
            if (!data.sectionId) {
                throw new Error("sectionId is required for section broadcast");
            }
            const enrollments = await prisma.studentEnrollment.findMany({
                where: {
                    organizationId: data.organizationId,
                    sectionId: data.sectionId,
                    status: { in: ["ENROLLED", "ACTIVE"] }
                },
                include: {
                    student: {
                        include: {
                            parents: {
                                include: {
                                    parent: { select: { id: true, userId: true } }
                                }
                            }
                        }
                    }
                }
            });

            for (const enroll of enrollments) {
                for (const ps of enroll.student.parents) {
                    if (ps.parent.userId) {
                        targetParentUserIds.push(ps.parent.userId);
                    }
                }
            }
        } else if (data.targetType === "ALL_PARENTS") {
            const enrollments = await prisma.studentEnrollment.findMany({
                where: {
                    organizationId: data.organizationId,
                    status: { in: ["ENROLLED", "ACTIVE"] },
                    OR: [
                        ...(teacherSectionIds.length > 0 ? [{ sectionId: { in: teacherSectionIds } }] : []),
                        ...(teacherGradeIds.length > 0 ? [{ schoolGradeId: { in: teacherGradeIds } }] : [])
                    ]
                },
                include: {
                    student: {
                        include: {
                            parents: {
                                include: {
                                    parent: { select: { id: true, userId: true } }
                                }
                            }
                        }
                    }
                }
            });

            for (const enroll of enrollments) {
                for (const ps of enroll.student.parents) {
                    if (ps.parent.userId) {
                        targetParentUserIds.push(ps.parent.userId);
                    }
                }
            }
        }

        const uniqueUserIds = Array.from(new Set(targetParentUserIds.filter(Boolean)));
        if (uniqueUserIds.length === 0) {
            throw new Error("No active parent accounts found for this target selection");
        }

        // 3. Dispatch messages & in-app notifications
        const sentMessages = [];
        for (const pUserId of uniqueUserIds) {
            const msg = await this.sendMessage({
                organizationId: data.organizationId,
                senderId: data.teacherUserId,
                receiverId: pUserId,
                content: data.content
            });
            sentMessages.push(msg);

            await prisma.notification.create({
                data: {
                    userId: pUserId,
                    organizationId: data.organizationId,
                    title: data.subject || (data.targetType === "SPECIFIC_PARENT" ? "Message from Teacher" : "Teacher Announcement for Parents"),
                    content: data.content.slice(0, 200),
                    link: "/dashboard/parent/communication"
                }
            }).catch(() => null);
        }

        return {
            success: true,
            targetType: data.targetType,
            recipientsCount: uniqueUserIds.length,
            messagesCount: sentMessages.length
        };
    }
}
