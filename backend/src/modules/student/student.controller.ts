import { Request, Response } from "express";
import { StudentService } from "./student.service.js";
import { EnrollmentStatus } from "../../generated/prisma/enums.js";

// Create a global student identity
export const createStudent = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName } = req.body;
        let { studentId } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({ error: "firstName and lastName are required" });
        }

        if (!studentId) {
            // Auto-generate a Student ID (e.g., STU-YYYYMM-XXXX)
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            const dateStr = new Date().toISOString().slice(2, 7).replace("-", ""); // YYMM
            studentId = `STU-${dateStr}-${randomCode}`;
        }

        const student = await StudentService.createStudent({
            ...req.body,
            studentId,
            userId: req.user?.id
        });
        
        return res.status(201).json(student);
    } catch (error) {
        return res.status(400).json({ error: "Failed to create student. Student ID might already exist." });
    }
};

export const getStudents = async (req: Request, res: Response) => {
    try {
        const students = await StudentService.getStudents();
        return res.json(students);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getStudentById = async (req: Request, res: Response) => {
    try {
        const student = await StudentService.getStudentById(req.params.id as string);
        if (!student) {
            return res.status(404).json({ error: "Student not found" });
        }
        return res.json(student);
    } catch (error) {
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

        const enrollment = await StudentService.enrollStudent(organizationId, studentId, academicYearId, schoolGradeId, sectionId);
        return res.status(201).json(enrollment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to enroll student" });
    }
};

// Get active enrollments for the school context
export const getEnrollments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;
        const enrollments = await StudentService.getEnrollments(organizationId, academicYearId as string);
        return res.json(enrollments);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Transfer student mid-year
export const transferStudent = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId } = req.params;
        const { targetSchoolGradeId, targetSectionId, reason } = req.body;

        if (!targetSchoolGradeId) {
            return res.status(400).json({ error: "targetSchoolGradeId is required" });
        }

        const newEnrollment = await StudentService.transferStudent(organizationId, enrollmentId as string, targetSchoolGradeId, targetSectionId, reason);
        return res.status(201).json(newEnrollment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to transfer student" });
    }
};

// Update enrollment status
export const updateStudentStatus = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { enrollmentId } = req.params;
        const { status, reason } = req.body;

        if (!status) {
            return res.status(400).json({ error: "status is required" });
        }

        const updated = await StudentService.updateStudentStatus(organizationId, enrollmentId as string, status as EnrollmentStatus, reason);
        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update student status" });
    }
};

export const getStudentProfile = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        // TODO: Implement getStudentByUserId when userId is added to Student model
        return res.status(404).json({ error: "Student profile not found" });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};
