import { Request, Response } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";

// Create a Teacher profile attached to an organization
export const createTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { firstName, lastName, employeeId } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({ error: "firstName and lastName are required" });
        }

        if (employeeId) {
            const existing = await prisma.teacher.findUnique({
                where: { employeeId }
            });

            if (existing) {
                return res.status(409).json({ error: "Employee ID already exists" });
            }
        }

        const teacher = await prisma.teacher.create({
            data: {
                firstName,
                lastName,
                employeeId,
                organizationId
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_CREATED",
                resource: "Teacher",
                resourceId: teacher.id,
                newValue: JSON.parse(JSON.stringify(teacher)),
            }
        });

        return res.status(201).json(teacher);
    } catch (error) {
        console.error("Error creating teacher:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Create a teaching assignment
export const assignTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teacherId, academicYearId, subjectId, schoolGradeId, sectionId } = req.body;

        if (!teacherId || !academicYearId || !subjectId || !schoolGradeId) {
            return res.status(400).json({ error: "teacherId, academicYearId, subjectId, and schoolGradeId are required" });
        }

        // Validate teacher belongs to the school
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) return res.status(400).json({ error: "Teacher not found in this school" });

        // Validate subject belongs to school
        const subject = await prisma.subject.findFirst({
            where: { id: subjectId, organizationId }
        });
        if (!subject) return res.status(400).json({ error: "Subject not found in this school" });

        // Validate grade belongs to school and academic year
        const schoolGrade = await prisma.schoolGrade.findFirst({
            where: { id: schoolGradeId, academicYearId, academicYear: { organizationId } }
        });
        if (!schoolGrade) return res.status(400).json({ error: "Invalid school grade or academic year" });

        // Validate section if provided
        if (sectionId) {
            const section = await prisma.section.findFirst({
                where: { id: sectionId, schoolGradeId }
            });
            if (!section) return res.status(400).json({ error: "Section does not belong to this grade" });
        }

        // Check if exact assignment already exists
        const existing = await prisma.teachingAssignment.findUnique({
            where: { teacherId_academicYearId_subjectId_sectionId: { teacherId, academicYearId, subjectId, sectionId: sectionId || null } }
        });

        if (existing) {
            return res.status(409).json({ error: "This exact teaching assignment already exists" });
        }

        const assignment = await prisma.teachingAssignment.create({
            data: {
                teacherId,
                academicYearId,
                subjectId,
                schoolGradeId,
                sectionId
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_CREATED",
                resource: "TeachingAssignment",
                resourceId: assignment.id,
                newValue: JSON.parse(JSON.stringify(assignment)),
            }
        });

        return res.status(201).json(assignment);
    } catch (error) {
        console.error("Error assigning teacher:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get active assignments for the school context
export const getAssignments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;

        const assignments = await prisma.teachingAssignment.findMany({
            where: {
                teacher: { organizationId }, // Filter by teacher's school
                ...(academicYearId ? { academicYearId: String(academicYearId) } : {})
            },
            include: {
                teacher: true,
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: true
            },
            orderBy: { createdAt: "desc" }
        });

        return res.json(assignments);
    } catch (error) {
        console.error("Error fetching teaching assignments:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get the currently logged in teacher's profile and active assignments
export const getTeacherProfile = async (req: Request, res: Response) => {
    try {
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        // For the demo, we just fetch a teacher in the organization
        // In reality, this would filter by Teacher.userId or a direct link to the email.
        const teacher = await prisma.teacher.findFirst({
            where: { organizationId },
            include: {
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        academicYear: true
                    }
                }
            }
        });

        if (!teacher) {
            return res.status(404).json({ error: "No teacher profile found for your account" });
        }

        return res.json(teacher);
    } catch (error) {
        console.error("Error fetching teacher profile:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
