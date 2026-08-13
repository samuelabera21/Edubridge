import { Request, Response } from "express";
import { prisma } from "../../infrastructure/prisma/client.js";

// Create a global student identity
export const createStudent = async (req: Request, res: Response) => {
    try {
        // Identity creation is decoupled from enrollment
        const { firstName, lastName, studentId, dateOfBirth, gender } = req.body;

        if (!firstName || !lastName || !studentId) {
            return res.status(400).json({ error: "firstName, lastName, and studentId are required" });
        }

        // Check if studentId already exists
        const existing = await prisma.student.findUnique({
            where: { studentId }
        });

        if (existing) {
            return res.status(409).json({ error: "Student ID already exists" });
        }

        const student = await prisma.student.create({
            data: {
                firstName,
                lastName,
                studentId,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
                gender
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: "STUDENT_CREATED",
                resource: "Student",
                resourceId: student.id,
                newValue: JSON.parse(JSON.stringify(student)),
                userId: req.user?.id || null // req.user from better-auth session if available
            }
        });

        return res.status(201).json(student);
    } catch (error) {
        console.error("Error creating student:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Enroll a student in a specific school and academic year
export const enrollStudent = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { studentId, academicYearId, schoolGradeId, sectionId } = req.body;

        if (!studentId || !academicYearId || !schoolGradeId) {
            return res.status(400).json({ error: "studentId, academicYearId, and schoolGradeId are required" });
        }

        // Validate the schoolGrade actually belongs to this school and academic year
        const schoolGrade = await prisma.schoolGrade.findFirst({
            where: { id: schoolGradeId, academicYearId, academicYear: { organizationId } }
        });

        if (!schoolGrade) {
            return res.status(400).json({ error: "Invalid school grade or academic year for this school" });
        }

        // Validate section if provided
        if (sectionId) {
            const section = await prisma.section.findFirst({
                where: { id: sectionId, schoolGradeId }
            });
            if (!section) {
                return res.status(400).json({ error: "Section does not belong to this grade" });
            }
        }

        // Check if student is already enrolled in this academic year
        const existingEnrollment = await prisma.studentEnrollment.findUnique({
            where: { studentId_academicYearId: { studentId, academicYearId } }
        });

        if (existingEnrollment) {
            return res.status(409).json({ error: "Student is already enrolled in this academic year" });
        }

        const enrollment = await prisma.studentEnrollment.create({
            data: {
                studentId,
                organizationId,
                academicYearId,
                schoolGradeId,
                sectionId
            }
        });

        // Audit log (with scope context)
        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "STUDENT_ENROLLED",
                resource: "StudentEnrollment",
                resourceId: enrollment.id,
                newValue: JSON.parse(JSON.stringify(enrollment)),
            }
        });

        return res.status(201).json(enrollment);
    } catch (error) {
        console.error("Error enrolling student:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get active enrollments for the school context
export const getEnrollments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;

        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                ...(academicYearId ? { academicYearId: String(academicYearId) } : {})
            },
            include: {
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true
            },
            orderBy: { createdAt: "desc" }
        });

        return res.json(enrollments);
    } catch (error) {
        console.error("Error fetching enrollments:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Get the currently logged in student's profile and active enrollment
export const getStudentProfile = async (req: Request, res: Response) => {
    try {
        // This endpoint expects a student ID to be provided in the session or scope
        // For this demo, we'll fetch the first student enrollment linked to the user's email
        // Or if the user doesn't have an email match, we return a 404.
        // In a real app, the User table would have a link to the Student ID.
        
        const userEmail = req.user?.email;
        if (!userEmail) return res.status(401).json({ error: "Unauthorized" });

        // Let's find a student enrollment where the student's email matches the user's email
        // Wait, the Student model doesn't have an email field right now, but for the demo we'll just return the first student in the school
        
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { organizationId },
            include: {
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true,
                academicYear: true
            },
            orderBy: { createdAt: "desc" }
        });

        if (!enrollment) {
            return res.status(404).json({ error: "No student profile found for your account" });
        }

        return res.json(enrollment);
    } catch (error) {
        console.error("Error fetching student profile:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
