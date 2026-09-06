import { Request, Response } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { ParentService } from "./parent.service.js";

export const getParents = async (req: Request, res: Response) => {
    try {
        const parents = await ParentService.getParents();
        return res.json(parents);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to fetch parents" });
    }
};

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

export const createParent = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName, phoneNumber, email, userId } = req.body;
        
        if (!firstName || !lastName) {
            return res.status(400).json({ error: "firstName and lastName are required" });
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
        return res.status(400).json({ error: error.message || "Failed to create parent" });
    }
};

export const linkParentToStudent = async (req: Request, res: Response) => {
    try {
        const { parentId, studentId, relationship, isPrimary, canPickup } = req.body;
        
        if (!parentId || !studentId || !relationship) {
            return res.status(400).json({ error: "parentId, studentId, and relationship are required" });
        }

        const link = await ParentService.linkParentToStudent({
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

export const unlinkParentFromStudent = async (req: Request, res: Response) => {
    try {
        const { parentId, studentId } = req.params;
        if (!parentId || !studentId) {
            return res.status(400).json({ error: "parentId and studentId are required" });
        }

        await ParentService.unlinkParentFromStudent(parentId as string, studentId as string);
        return res.json({ success: true, message: "Unlinked successfully" });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to unlink parent and student" });
    }
};

export const getStudentParents = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const parents = await ParentService.getStudentParents(studentId as string);
        return res.json(parents);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Domain 10: Meetings
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

// Domain 10: Notifications
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

// Domain 10: Participation
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
