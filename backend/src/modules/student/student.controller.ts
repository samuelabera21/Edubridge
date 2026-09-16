import { Request, Response } from "express";
import { StudentService } from "./student.service.js";
import { EnrollmentStatus, DocumentVerificationStatus } from "../../generated/prisma/enums.js";

// Step 4: Atomic Student Registration & Intake Handler
export const registerStudentIntake = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) {
            return res.status(403).json({ error: "Missing school scope" });
        }

        const result = await StudentService.registerStudentIntake(organizationId, req.body, req.user?.id);
        return res.status(201).json(result);
    } catch (error: any) {
        console.error("Student intake error:", error);
        return res.status(400).json({ error: error.message || "Failed to register student" });
    }
};

// Step 4: Existing Student Search (Duplicate Detection & Returning Lookup)
export const searchStudents = async (req: Request, res: Response) => {
    try {
        const { search, studentId, firstName, fatherName, dateOfBirth } = req.query;
        const results = await StudentService.searchExistingStudents({
            search: search as string,
            studentId: studentId as string,
            firstName: firstName as string,
            fatherName: fatherName as string,
            dateOfBirth: dateOfBirth as string
        });
        return res.json(results);
    } catch (error) {
        console.error("Student search error:", error);
        return res.status(500).json({ error: "Internal server error during student search" });
    }
};

// Create a global student identity (legacy endpoint preserved)
export const createStudent = async (req: Request, res: Response) => {
    try {
        const { firstName, lastName } = req.body;
        let { studentId } = req.body;

        if (!firstName || !lastName) {
            return res.status(400).json({ error: "firstName and lastName are required" });
        }

        if (!studentId) {
            studentId = await StudentService.generateStudentId();
        }

        const student = await StudentService.createStudent({
            ...req.body,
            studentId,
            userId: req.user?.id
        });
        
        return res.status(201).json(student);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create student. Student ID might already exist." });
    }
};

// Get students directory (Tenant-isolated when school scope is attached)
export const getStudents = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (organizationId) {
            const { search, gender, schoolGradeId, status, page, limit, sortBy, sortOrder } = req.query;
            const result = await StudentService.getSchoolStudents(organizationId, {
                search: search as string,
                gender: gender as string,
                schoolGradeId: schoolGradeId as string,
                status: status as EnrollmentStatus,
                page: page ? Number(page) : undefined,
                limit: limit ? Number(limit) : undefined,
                sortBy: sortBy as string,
                sortOrder: sortOrder as "asc" | "desc"
            });
            return res.json(result);
        }

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

        const { studentId, academicYearId, schoolGradeId, sectionId, enrollmentType } = req.body;
        if (!studentId || !academicYearId || !schoolGradeId) {
            return res.status(400).json({ error: "studentId, academicYearId, and schoolGradeId are required" });
        }

        const enrollment = await StudentService.enrollStudent(
            organizationId, 
            studentId, 
            academicYearId, 
            schoolGradeId, 
            sectionId, 
            enrollmentType
        );
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

// Verify Document
export const verifyDocumentHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id: documentId } = req.params;
        const { verificationStatus, notes } = req.body;

        if (!verificationStatus) {
            return res.status(400).json({ error: "verificationStatus is required" });
        }

        const updated = await StudentService.verifyDocument(
            organizationId, 
            documentId as string, 
            verificationStatus as DocumentVerificationStatus, 
            notes, 
            req.user?.id
        );
        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to verify document" });
    }
};

export const getStudentProfile = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const student = await StudentService.getStudentByUserId(userId, organizationId);
        if (!student) return res.status(404).json({ error: "Student profile not found" });

        return res.json(student);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getStudentDashboard = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const dashboard = await StudentService.getStudentDashboard(userId, organizationId);
        if (!dashboard) return res.status(404).json({ error: "Student dashboard data not found" });

        return res.json(dashboard);
    } catch (error) {
        console.error("Error fetching student dashboard:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getTransfersHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const transfers = await StudentService.getTransfers(organizationId);
        return res.json(transfers);
    } catch (error) {
        console.error("Error fetching transfers:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const executeProgressionHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const result = await StudentService.executeProgression(organizationId, req.body);
        return res.json(result);
    } catch (error: any) {
        console.error("Error executing progression:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getApprovalsHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const approvals = await StudentService.getApprovals(organizationId);
        return res.json(approvals);
    } catch (error) {
        console.error("Error fetching approvals:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const createApprovalHandler = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const approval = await StudentService.createApprovalRequest(organizationId, { ...req.body, userId: req.user?.id });
        return res.status(201).json(approval);
    } catch (error) {
        console.error("Error creating approval request:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
