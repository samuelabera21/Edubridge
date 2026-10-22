import { Request, Response } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { ParentService } from "./parent.service.js";
import { AttendanceAdminService } from "../attendance/attendance.admin.service.js";
import { AssessmentAdminService } from "../assessment/assessment.admin.service.js";

/**
 * Get school-scoped, paginated and searchable guardians list
 */
export const getGuardians = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { search, schoolGradeId, sectionId, page, limit } = req.query;
        const result = await ParentService.getGuardians(organizationId, {
            search: search as string,
            schoolGradeId: schoolGradeId as string,
            sectionId: sectionId as string,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined
        });

        return res.json(result);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch guardians" });
    }
};

/**
 * Get detailed profile for a single guardian including all linked children in the school
 */
export const getGuardianDetail = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "Guardian ID is required" });
        }

        const guardian = await ParentService.getGuardianDetail(organizationId, id as string);
        return res.json(guardian);
    } catch (error: any) {
        const statusCode = error.message?.includes("not found") ? 404 : 400;
        return res.status(statusCode).json({ error: error.message || "Failed to fetch guardian detail" });
    }
};

/**
 * Create a new parent/guardian record
 */
export const createParent = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, phoneNumber, email, userId } = req.body;
        
        if (!firstName || !lastName) {
            return res.status(400).json({ error: "First name and last name are required" });
        }

        const parent = await ParentService.createParent({
            firstName,
            lastName,
            phoneNumber,
            email,
            userId
        });

        return res.status(201).json(parent);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create guardian record" });
    }
};

/**
 * Update an existing guardian's contact information
 */
export const updateGuardian = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "Guardian ID is required" });
        }

        const updated = await ParentService.updateGuardian(organizationId, id as string, req.body);
        return res.json(updated);
    } catch (error: any) {
        const statusCode = error.message?.includes("not found") ? 404 : 400;
        return res.status(statusCode).json({ error: error.message || "Failed to update guardian" });
    }
};

/**
 * Link a guardian to a student
 */
export const linkParentToStudent = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { parentId, studentId, relationship, isPrimary, canPickup } = req.body;
        
        if (!parentId || !studentId || !relationship) {
            return res.status(400).json({ error: "Parent ID, Student ID, and relationship are required" });
        }

        const link = await ParentService.linkParentToStudent(organizationId, {
            parentId,
            studentId,
            relationship,
            isPrimary,
            canPickup
        });

        return res.status(201).json(link);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to link parent to student" });
    }
};

/**
 * Update an existing relationship between a guardian and a student
 */
export const updateRelationship = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { parentId, studentId } = req.params;
        if (!parentId || !studentId) {
            return res.status(400).json({ error: "Parent ID and Student ID are required" });
        }

        const updated = await ParentService.updateRelationship(
            organizationId,
            parentId as string,
            studentId as string,
            req.body
        );

        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update relationship" });
    }
};

/**
 * Unlink a guardian from a student
 */
export const unlinkParentFromStudent = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { parentId, studentId } = req.params;
        if (!parentId || !studentId) {
            return res.status(400).json({ error: "Parent ID and Student ID are required" });
        }

        const result = await ParentService.unlinkParentFromStudent(
            organizationId,
            parentId as string,
            studentId as string
        );
        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to unlink parent and student" });
    }
};

/**
 * Get all guardians for a specific student
 */
export const getStudentParents = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({ error: "Student ID is required" });
        }

        const parents = await ParentService.getStudentParents(organizationId, studentId as string);
        return res.json(parents);
    } catch (error: any) {
        const statusCode = error.message?.includes("not found") ? 404 : 400;
        return res.status(statusCode).json({ error: error.message || "Failed to fetch student guardians" });
    }
};

/**
 * Get school-scoped students list for linking dropdowns
 */
export const getSchoolStudentsForLinking = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const { search, schoolGradeId, sectionId, limit } = req.query;
        const students = await ParentService.getSchoolStudentsForLinking(organizationId, {
            search: search as string,
            schoolGradeId: schoolGradeId as string,
            sectionId: sectionId as string,
            limit: limit ? Number(limit) : undefined
        });

        return res.json(students);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch students for linking" });
    }
};

/**
 * Get grade and section filter options for the school
 */
export const getFilterOptions = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const options = await ParentService.getFilterOptions(organizationId);
        return res.json(options);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch filter options" });
    }
};

/**
 * Get self-service profile for logged-in parent user
 */
export const getParentProfile = async (req: Request, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const organizationId = (req as any).accessScope?.id;

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: {
                parent: {
                    include: {
                        children: {
                            include: {
                                student: {
                                    include: {
                                        enrollments: {
                                            ...(organizationId ? { where: { organizationId } } : {}),
                                            include: {
                                                organization: {
                                                    include: {
                                                        schoolProfile: true
                                                    }
                                                },
                                                schoolGrade: { include: { grade: true } },
                                                section: true,
                                                academicYear: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!user?.parent) {
            return res.status(404).json({ error: "No parent profile found for your account" });
        }

        return res.json(user.parent);
    } catch (error) {
        console.error("Error fetching parent profile:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * Legacy wrapper
 */
export const getParents = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const parents = await ParentService.getParents(organizationId);
        return res.json(parents);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch parents" });
    }
};

// Domain 10: Meetings (Retained for compatibility)
export const getMeetings = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await ParentService.getMeetings(organizationId);
        return res.json(items);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch meetings" });
    }
};

export const createMeeting = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await ParentService.createMeeting(organizationId, req.body);
        return res.status(201).json(item);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create meeting" });
    }
};

// Domain 10: Notifications (Retained for compatibility)
export const getNotifications = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await ParentService.getNotifications(organizationId);
        return res.json(items);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch notifications" });
    }
};

export const createNotification = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await ParentService.createNotification(organizationId, req.body);
        return res.status(201).json(item);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to send notification" });
    }
};

// Domain 10: Participation (Retained for compatibility)
export const getParticipations = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const items = await ParentService.getParticipations(organizationId);
        return res.json(items);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch participations" });
    }
};

export const createParticipation = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const item = await ParentService.createParticipation(organizationId, req.body);
        return res.status(201).json(item);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record participation" });
    }
};

/**
 * Get attendance records and statistics for a parent's verified linked child
 */
export const getParentChildAttendance = async (req: Request, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: { parent: true }
        });
        if (!user?.parent) {
            return res.status(404).json({ error: "Parent profile not found" });
        }

        const studentId = req.params.studentId as string;
        if (!studentId) {
            return res.status(400).json({ error: "Student ID is required" });
        }

        const link = await prisma.parentStudent.findUnique({
            where: {
                parentId_studentId: {
                    parentId: user.parent.id,
                    studentId
                }
            }
        });

        if (!link) {
            return res.status(403).json({ error: "You are not authorized to view this student's records" });
        }

        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { studentId },
            orderBy: { createdAt: "desc" }
        });

        if (!enrollment) {
            return res.status(404).json({ error: "Active student enrollment not found" });
        }

        const attendanceData = await AttendanceAdminService.getStudentAttendanceDetail(
            enrollment.organizationId,
            enrollment.id
        );

        return res.json(attendanceData);
    } catch (error: any) {
        console.error("Error fetching parent child attendance:", error);
        return res.status(500).json({ error: error.message || "Failed to load attendance" });
    }
};

/**
 * Self-service endpoint for Parents to view their linked child's academic results & assessments
 */
export const getParentChildAcademics = async (req: Request, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: { parent: true }
        });
        if (!user?.parent) {
            return res.status(404).json({ error: "Parent profile not found" });
        }

        const studentId = req.params.studentId as string;
        if (!studentId) {
            return res.status(400).json({ error: "Student ID is required" });
        }

        const link = await prisma.parentStudent.findUnique({
            where: {
                parentId_studentId: {
                    parentId: user.parent.id,
                    studentId
                }
            }
        });

        if (!link) {
            return res.status(403).json({ error: "You are not authorized to view this student's records" });
        }

        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { studentId },
            orderBy: { createdAt: "desc" }
        });

        if (!enrollment) {
            return res.status(404).json({ error: "Active student enrollment not found" });
        }

        const academicData = await AssessmentAdminService.getStudentResultDetail(
            enrollment.organizationId,
            enrollment.id
        );

        return res.json(academicData);
    } catch (error: any) {
        console.error("Error fetching parent child academics:", error);
        return res.status(500).json({ error: error.message || "Failed to load academic results" });
    }
};

/**
 * Get teachers currently assigned to the student's grade & section
 */
export const getParentChildTeachers = async (req: Request, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: { parent: true }
        });
        if (!user?.parent) {
            return res.status(404).json({ error: "Parent profile not found" });
        }

        const studentId = req.params.studentId as string;
        if (!studentId) {
            return res.status(400).json({ error: "Student ID is required" });
        }

        const link = await prisma.parentStudent.findUnique({
            where: {
                parentId_studentId: {
                    parentId: user.parent.id,
                    studentId
                }
            }
        });
        if (!link) {
            return res.status(403).json({ error: "Unauthorized to view teachers for this student" });
        }

        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { studentId },
            orderBy: { createdAt: "desc" },
            include: {
                section: true,
                schoolGrade: { include: { grade: true } }
            }
        });

        if (!enrollment) {
            return res.status(404).json({ error: "Active enrollment not found" });
        }

        const assignments = await prisma.teachingAssignment.findMany({
            where: {
                schoolGradeId: enrollment.schoolGradeId,
                OR: [
                    { sectionId: enrollment.sectionId },
                    { sectionId: null }
                ]
            },
            include: {
                teacher: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true
                            }
                        }
                    }
                },
                subject: true
            }
        });

        const teachersMap = new Map<string, any>();
        assignments.forEach(asg => {
            if (asg.teacher) {
                const userId = asg.teacher.user?.id || asg.teacher.id;
                if (!teachersMap.has(userId)) {
                    teachersMap.set(userId, {
                        userId: asg.teacher.user?.id || asg.teacher.userId,
                        teacherId: asg.teacher.id,
                        fullName: `${asg.teacher.firstName || ""} ${asg.teacher.lastName || ""}`.trim() || asg.teacher.user?.name || "Teacher",
                        email: asg.teacher.user?.email || asg.teacher.email || "",
                        subjects: [asg.subject.name],
                        isHomeroom: asg.sectionId === enrollment.sectionId
                    });
                } else {
                    const existing = teachersMap.get(userId);
                    if (!existing.subjects.includes(asg.subject.name)) {
                        existing.subjects.push(asg.subject.name);
                    }
                }
            }
        });

        return res.json(Array.from(teachersMap.values()));
    } catch (error: any) {
        console.error("Error fetching child teachers:", error);
        return res.status(500).json({ error: error.message || "Failed to load teachers" });
    }
};

/**
 * Get messages sent and received by the logged in parent
 */
export const getParentMessages = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const messages = await prisma.message.findMany({
            where: {
                OR: [
                    { senderId: userId },
                    { receiverId: userId }
                ]
            },
            include: {
                sender: { select: { id: true, name: true, email: true, image: true } },
                receiver: { select: { id: true, name: true, email: true, image: true } }
            },
            orderBy: { createdAt: "asc" }
        });

        const formatted = messages.map(m => ({
            ...m,
            sender: m.sender ? {
                ...m.sender,
                firstName: m.sender.name?.split(" ")[0] || m.sender.name,
                lastName: m.sender.name?.split(" ").slice(1).join(" ") || ""
            } : null,
            receiver: m.receiver ? {
                ...m.receiver,
                firstName: m.receiver.name?.split(" ")[0] || m.receiver.name,
                lastName: m.receiver.name?.split(" ").slice(1).join(" ") || ""
            } : null
        }));

        return res.json(formatted);
    } catch (error: any) {
        console.error("Error fetching parent messages:", error);
        return res.status(500).json({ error: error.message || "Failed to load messages" });
    }
};

/**
 * Send a message from parent to an assigned teacher
 */
export const sendParentMessage = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const organizationId = (req as any).accessScope?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const { receiverId, content } = req.body;
        if (!receiverId || !content || !content.trim()) {
            return res.status(400).json({ error: "receiverId and content are required" });
        }

        // Resolve organization
        let orgId = organizationId;
        if (!orgId) {
            const roleAssignment = await prisma.roleAssignment.findFirst({
                where: { userId },
                select: { scopeId: true }
            });
            orgId = roleAssignment?.scopeId;
        }

        if (!orgId) {
            const enrollment = await prisma.studentEnrollment.findFirst({
                where: {
                    student: {
                        parents: {
                            some: {
                                parent: { userId }
                            }
                        }
                    }
                },
                select: { organizationId: true }
            });
            orgId = enrollment?.organizationId;
        }

        if (!orgId) {
            const firstOrg = await prisma.organizationUnit.findFirst({ select: { id: true } });
            orgId = firstOrg?.id;
        }

        const message = await prisma.message.create({
            data: {
                organizationId: orgId!,
                senderId: userId,
                receiverId,
                content: content.trim(),
                isRead: false
            },
            include: {
                sender: { select: { id: true, name: true, email: true, image: true } },
                receiver: { select: { id: true, name: true, email: true, image: true } }
            }
        });

        const formatted = {
            ...message,
            sender: message.sender ? {
                ...message.sender,
                firstName: message.sender.name?.split(" ")[0] || message.sender.name,
                lastName: message.sender.name?.split(" ").slice(1).join(" ") || ""
            } : null,
            receiver: message.receiver ? {
                ...message.receiver,
                firstName: message.receiver.name?.split(" ")[0] || message.receiver.name,
                lastName: message.receiver.name?.split(" ").slice(1).join(" ") || ""
            } : null
        };

        return res.status(201).json(formatted);
    } catch (error: any) {
        console.error("Error sending parent message:", error);
        return res.status(500).json({ error: error.message || "Failed to send message" });
    }
};

/**
 * Get school announcements for parents
 */
export const getParentAnnouncements = async (req: Request, res: Response) => {
    try {
        const announcements = await prisma.announcement.findMany({
            where: {
                OR: [
                    { target: "ALL" },
                    { target: "PARENTS" }
                ]
            },
            include: {
                author: { select: { id: true, name: true, email: true } },
                acknowledgments: true
            },
            orderBy: { createdAt: "desc" },
            take: 20
        });

        const formatted = announcements.map(a => ({
            ...a,
            author: a.author ? {
                ...a.author,
                firstName: a.author.name?.split(" ")[0] || a.author.name,
                lastName: a.author.name?.split(" ").slice(1).join(" ") || ""
            } : null
        }));

        return res.json(formatted);
    } catch (error: any) {
        console.error("Error fetching announcements:", error);
        return res.status(500).json({ error: error.message || "Failed to load announcements" });
    }
};

/**
 * Get parent-teacher meetings & conferences
 */
export const getParentMeetingsList = async (req: Request, res: Response) => {
    try {
        const meetings = await prisma.parentMeeting.findMany({
            orderBy: { scheduledDate: "asc" }
        });

        return res.json(meetings);
    } catch (error: any) {
        console.error("Error fetching parent meetings:", error);
        return res.status(500).json({ error: error.message || "Failed to load meetings" });
    }
};

/**
 * Request or propose a Parent-Teacher Meeting
 */
export const requestParentMeeting = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const { title, agenda, preferredDate, location } = req.body;

        if (!title) {
            return res.status(400).json({ error: "Meeting title or reason is required" });
        }

        let orgId = organizationId;
        if (!orgId) {
            const firstOrg = await prisma.organizationUnit.findFirst({ select: { id: true } });
            orgId = firstOrg?.id;
        }

        const meeting = await prisma.parentMeeting.create({
            data: {
                organizationId: orgId!,
                title,
                meetingType: "PARENT_TEACHER_CONFERENCE",
                scheduledDate: preferredDate ? new Date(preferredDate) : new Date(Date.now() + 86400000 * 2),
                location: location || "School Conference Room / Online",
                agenda: agenda || "Academic progress review and consultation",
                status: "SCHEDULED"
            }
        });

        return res.status(201).json(meeting);
    } catch (error: any) {
        console.error("Error requesting parent meeting:", error);
        return res.status(500).json({ error: error.message || "Failed to request meeting" });
    }
};

/**
 * Get upcoming and recent learning activities for a child
 */
export const getParentChildActivities = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const studentId = req.params.studentId as string;
        if (!studentId) {
            return res.status(400).json({ error: "Student ID is required" });
        }

        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: { parent: { include: { children: true } } }
        });

        const isLinked = user?.parent?.children.some(c => c.studentId === studentId);
        if (!isLinked) {
            return res.status(403).json({ error: "Unauthorized access to student" });
        }

        const enrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                ...(organizationId ? { organizationId } : {})
            },
            orderBy: { createdAt: "desc" }
        });

        if (!enrollment) {
            return res.json([]);
        }

        const activities = await prisma.learningActivity.findMany({
            where: {
                organizationId: enrollment.organizationId,
                academicYearId: enrollment.academicYearId,
                teachingAssignment: {
                    schoolGradeId: enrollment.schoolGradeId,
                    sectionId: enrollment.sectionId
                }
            },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        teacher: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                },
                submissions: {
                    where: { enrollmentId: enrollment.id }
                }
            },
            orderBy: [
                { dueDate: "asc" },
                { createdAt: "desc" }
            ],
            take: 20
        });

        const formatted = activities.map(act => {
            const submission = act.submissions[0] || null;
            let status = "PENDING";
            if (submission?.status) {
                status = submission.status;
            } else if (act.dueDate && new Date(act.dueDate) < new Date()) {
                status = "OVERDUE";
            }

            return {
                id: act.id,
                title: act.title,
                description: act.description,
                type: act.type,
                subject: act.teachingAssignment?.subject?.name || "General",
                teacher: act.teachingAssignment?.teacher ? `${act.teachingAssignment.teacher.firstName} ${act.teachingAssignment.teacher.lastName}` : "Assigned Teacher",
                dueDate: act.dueDate,
                supportCategory: act.supportCategory,
                status,
                submission: submission ? {
                    id: submission.id,
                    submittedAt: submission.submittedAt,
                    grade: submission.grade,
                    feedback: submission.feedback,
                    status: submission.status
                } : null
            };
        });

        return res.json(formatted);
    } catch (error: any) {
        console.error("Error fetching child activities:", error);
        return res.status(500).json({ error: error.message || "Failed to load activities" });
    }
};



