import { Request, Response } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { ParentService } from "./parent.service.js";

// Get the currently logged in parent's profile and their children
export const getParentProfile = async (req: Request, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        // Find the parent associated with this email
        // In reality, you'd match the user.id, but for our simple demo, we fetch by user relation or directly
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
                                            where: { organizationId },
                                            include: {
                                                schoolGrade: { include: { grade: true } },
                                                section: true
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
        const { firstName, lastName, phoneNumber, email } = req.body;
        
        if (!firstName || !lastName) {
            return res.status(400).json({ error: "firstName and lastName are required" });
        }

        const parent = await ParentService.createParent({
            firstName,
            lastName,
            phoneNumber,
            email
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

export const getStudentParents = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const parents = await ParentService.getStudentParents(studentId as string);
        return res.json(parents);
    } catch (error: any) {
        return res.status(500).json({ error: "Internal server error" });
    }
};
