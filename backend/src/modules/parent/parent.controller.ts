import { Request, Response } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";
import { ParentService } from "./parent.service.js";

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
