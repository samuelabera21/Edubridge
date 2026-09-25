import { describe, it, expect, vi, beforeEach } from "vitest";
import { CommunicationService } from "./communication.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { AnnouncementTarget } from "../../generated/prisma/enums.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        announcement: {
            create: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            delete: vi.fn()
        },
        importantNotice: {
            create: vi.fn(),
            findMany: vi.fn()
        },
        notification: {
            create: vi.fn(),
            findMany: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
            count: vi.fn()
        },
        message: {
            create: vi.fn(),
            findMany: vi.fn()
        },
        schoolGrade: {
            findFirst: vi.fn()
        },
        section: {
            findFirst: vi.fn()
        },
        teacher: {
            findFirst: vi.fn()
        },
        teachingAssignment: {
            findFirst: vi.fn(),
            findMany: vi.fn()
        },
        studentEnrollment: {
            findFirst: vi.fn(),
            findMany: vi.fn()
        },
        roleAssignment: {
            findFirst: vi.fn(),
            findMany: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        }
    }
}));

describe("CommunicationService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("Announcements", () => {
        it("creates an announcement with author and audit log", async () => {
            const mockAnnouncement = { id: "ann-1", title: "Sports Day", target: AnnouncementTarget.ALL };
            vi.mocked(prisma.announcement.create).mockResolvedValue(mockAnnouncement as any);
            vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

            const result = await CommunicationService.createAnnouncement("school-1", {
                title: "Sports Day",
                content: "All classes attend",
                target: AnnouncementTarget.ALL,
                authorId: "user-admin"
            });

            expect(prisma.announcement.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    organizationId: "school-1",
                    title: "Sports Day",
                    authorId: "user-admin"
                })
            }));
            expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: "ANNOUNCEMENT_CREATED",
                    organizationId: "school-1"
                })
            }));
            expect(result).toEqual(mockAnnouncement);
        });

        it("validates specific grade target belongs to this school", async () => {
            vi.mocked(prisma.schoolGrade.findFirst).mockResolvedValue(null);

            await expect(CommunicationService.createAnnouncement("school-1", {
                title: "Grade 10 Exam",
                content: "Notice",
                target: AnnouncementTarget.SPECIFIC_GRADE,
                targetId: "grade-unrelated",
                authorId: "user-admin"
            })).rejects.toThrow("Grade not found in this school");
        });

        it("validates specific section target belongs to this school", async () => {
            vi.mocked(prisma.section.findFirst).mockResolvedValue(null);

            await expect(CommunicationService.createAnnouncement("school-1", {
                title: "Section A Notice",
                content: "Notice",
                target: AnnouncementTarget.SPECIFIC_SECTION,
                targetId: "section-unrelated",
                authorId: "user-admin"
            })).rejects.toThrow("Section not found in this school");
        });

        it("filters announcements by organizationId and target", async () => {
            vi.mocked(prisma.announcement.findMany).mockResolvedValue([{ id: "ann-1" }] as any);

            await CommunicationService.getAnnouncements("school-1", AnnouncementTarget.TEACHERS);

            expect(prisma.announcement.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { organizationId: "school-1", target: AnnouncementTarget.TEACHERS }
            }));
        });
    });

    describe("Important Notices", () => {
        it("creates pinned important notice with author relation", async () => {
            const mockNotice = { id: "not-1", title: "Closure", authorId: "user-1" };
            vi.mocked(prisma.importantNotice.create).mockResolvedValue(mockNotice as any);
            vi.mocked(prisma.auditLog.create).mockResolvedValue({} as any);

            const result = await CommunicationService.createImportantNotice("school-1", {
                title: "Closure",
                content: "Snow day",
                authorId: "user-1"
            });

            expect(prisma.importantNotice.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    organizationId: "school-1",
                    authorId: "user-1",
                    isPinned: true
                })
            }));
            expect(result).toEqual(mockNotice);
        });
    });

    describe("Notifications", () => {
        it("rejects notification creation if target user is not in the org", async () => {
            vi.mocked(prisma.roleAssignment.findFirst).mockResolvedValue(null);

            await expect(CommunicationService.createNotification({
                userId: "user-other-school",
                organizationId: "school-1",
                title: "Alert",
                content: "Test"
            })).rejects.toThrow("Target user is not a member of this organization");
        });

        it("creates notification if membership is verified", async () => {
            vi.mocked(prisma.roleAssignment.findFirst).mockResolvedValue({ id: "ra-1" } as any);
            vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif-1" } as any);

            const result = await CommunicationService.createNotification({
                userId: "user-member",
                organizationId: "school-1",
                title: "Alert",
                content: "Test"
            });

            expect(result).toEqual({ id: "notif-1" });
        });

        it("counts unread notifications org-scoped", async () => {
            vi.mocked(prisma.notification.count).mockResolvedValue(3);

            const count = await CommunicationService.getUnreadNotificationCount("user-1", "school-1");
            expect(count).toBe(3);
            expect(prisma.notification.count).toHaveBeenCalledWith({
                where: { userId: "user-1", organizationId: "school-1", isRead: false }
            });
        });
    });

    describe("Direct Messaging", () => {
        it("rejects sending message to oneself", async () => {
            await expect(CommunicationService.sendMessage({
                organizationId: "school-1",
                senderId: "user-1",
                receiverId: "user-1",
                content: "Hello me"
            })).rejects.toThrow("Cannot send a message to yourself");
        });

        it("rejects recipient from a different school", async () => {
            vi.mocked(prisma.roleAssignment.findFirst).mockResolvedValue(null);

            await expect(CommunicationService.sendMessage({
                organizationId: "school-1",
                senderId: "user-1",
                receiverId: "user-other-school",
                content: "Hello"
            })).rejects.toThrow("Recipient is not a member of this school");
        });

        it("sends message to same-school user", async () => {
            vi.mocked(prisma.roleAssignment.findFirst).mockResolvedValue({ id: "ra-1" } as any);
            vi.mocked(prisma.message.create).mockResolvedValue({
                id: "msg-1",
                sender: { name: "Sender" },
                receiver: { name: "Receiver" }
            } as any);

            const result = await CommunicationService.sendMessage({
                organizationId: "school-1",
                senderId: "user-1",
                receiverId: "user-2",
                content: "Hello"
            });

            expect(result.id).toBe("msg-1");
            expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    organizationId: "school-1",
                    senderId: "user-1",
                    receiverId: "user-2",
                    content: "Hello"
                })
            }));
        });
    });

    describe("Teacher -> Parent Messaging", () => {
        it("rejects if teacher has no teaching assignment for student class", async () => {
            vi.mocked(prisma.teacher.findFirst).mockResolvedValue({ id: "teacher-1" } as any);
            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue({
                id: "enroll-1",
                schoolGradeId: "grade-1",
                sectionId: "sec-1",
                student: { parents: [{ parent: { userId: "parent-user-1" } }] }
            } as any);
            vi.mocked(prisma.teachingAssignment.findFirst).mockResolvedValue(null); // No assignment

            await expect(CommunicationService.sendTeacherParentMessage({
                teacherUserId: "teacher-user-1",
                organizationId: "school-1",
                enrollmentId: "enroll-1",
                content: "Attendance concern"
            })).rejects.toThrow("You do not have a teaching assignment for this student's class");
        });

        it("delivers message when teacher assignment and parent user exist", async () => {
            vi.mocked(prisma.teacher.findFirst).mockResolvedValue({ id: "teacher-1" } as any);
            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue({
                id: "enroll-1",
                schoolGradeId: "grade-1",
                sectionId: "sec-1",
                student: { parents: [{ parent: { userId: "parent-user-1" } }] }
            } as any);
            vi.mocked(prisma.teachingAssignment.findFirst).mockResolvedValue({ id: "assign-1" } as any);
            vi.mocked(prisma.roleAssignment.findFirst).mockResolvedValue({ id: "ra-1" } as any);
            vi.mocked(prisma.message.create).mockResolvedValue({
                id: "msg-tp-1",
                sender: { name: "Teacher" },
                receiver: { name: "Parent" }
            } as any);

            const result = await CommunicationService.sendTeacherParentMessage({
                teacherUserId: "teacher-user-1",
                organizationId: "school-1",
                enrollmentId: "enroll-1",
                content: "Attendance concern"
            });

            expect(result.id).toBe("msg-tp-1");
        });
    });
});
