import { Request, Response } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";

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
