import { Request, Response } from "express";
import { TeacherService } from "./teacher.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";

// Create a Teacher profile attached to an organization
export const createTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const actorUserId = (req as any).user?.id;

        const teacher = await TeacherService.createTeacher(organizationId, {
            ...req.body,
            actorUserId
        });

        return res.status(201).json(teacher);
    } catch (error: any) {
        if (error?.code === 'P2002') {
            return res.status(400).json({ error: "A teacher with this Employee ID or unique field already exists." });
        }
        return res.status(400).json({ error: error.message || "Failed to create teacher" });
    }
};

export const addTeacherQualification = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const actorUserId = (req as any).user?.id;

        const qualification = await TeacherService.addTeacherQualification(
            organizationId,
            req.params.id as string,
            req.body,
            actorUserId
        );
        return res.status(201).json(qualification);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to add qualification" });
    }
};

export const verifyTeacherQualification = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const actorUserId = (req as any).user?.id;
        if (!actorUserId) return res.status(401).json({ error: "Unauthorized" });

        const roleAssignments = await prisma.roleAssignment.findMany({
            where: { userId: actorUserId },
            include: { role: true }
        });
        const actorRoles = roleAssignments.map(ra => ra.role.name);

        const { verificationStatus, verificationNotes } = req.body;
        if (!verificationStatus || !["VERIFIED", "REJECTED"].includes(verificationStatus)) {
            return res.status(400).json({ error: "verificationStatus must be 'VERIFIED' or 'REJECTED'" });
        }

        const result = await TeacherService.verifyTeacherQualification(
            organizationId,
            req.params.id as string,
            req.params.qualificationId as string,
            { verificationStatus, verificationNotes },
            actorUserId,
            actorRoles
        );
        return res.json(result);
    } catch (error: any) {
        if (error.message?.includes("Unauthorized") || error.message?.includes("not permitted")) {
            return res.status(403).json({ error: error.message });
        }
        return res.status(400).json({ error: error.message || "Failed to verify qualification" });
    }
};

export const addTeacherDocument = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const actorUserId = (req as any).user?.id;

        const document = await TeacherService.addTeacherDocument(
            organizationId,
            req.params.id as string,
            req.body,
            actorUserId
        );
        return res.status(201).json(document);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to add document" });
    }
};

export const verifyTeacherDocument = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const actorUserId = (req as any).user?.id;
        if (!actorUserId) return res.status(401).json({ error: "Unauthorized" });

        const roleAssignments = await prisma.roleAssignment.findMany({
            where: { userId: actorUserId },
            include: { role: true }
        });
        const actorRoles = roleAssignments.map(ra => ra.role.name);

        const { verificationStatus, verificationNotes } = req.body;
        if (!verificationStatus || !["VERIFIED", "REJECTED"].includes(verificationStatus)) {
            return res.status(400).json({ error: "verificationStatus must be 'VERIFIED' or 'REJECTED'" });
        }

        const result = await TeacherService.verifyTeacherDocument(
            organizationId,
            req.params.id as string,
            req.params.documentId as string,
            { verificationStatus, verificationNotes },
            actorUserId,
            actorRoles
        );
        return res.json(result);
    } catch (error: any) {
        if (error.message?.includes("Unauthorized")) {
            return res.status(403).json({ error: error.message });
        }
        return res.status(400).json({ error: error.message || "Failed to verify document" });
    }
};

export const updateTeacherEmploymentStatus = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });
        const actorUserId = (req as any).user?.id;

        const { employmentStatus, reason } = req.body;
        if (!employmentStatus) return res.status(400).json({ error: "employmentStatus is required" });

        const result = await TeacherService.updateTeacherEmploymentStatus(
            organizationId,
            req.params.id as string,
            { employmentStatus, reason },
            actorUserId
        );
        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update employment status" });
    }
};

export const getTeachers = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const teachers = await TeacherService.getTeachers(organizationId);
        return res.json(teachers);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};



export const getTeacherById = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const teacher = await TeacherService.getTeacherById(organizationId, req.params.id as string);
        if (!teacher) return res.status(404).json({ error: "Teacher not found" });

        return res.json(teacher);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Create a teaching assignment
export const assignTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { teacherId, academicYearId, subjectId, schoolGradeId, sectionId, sectionIds, periodsPerWeek, status } = req.body;

        if (!teacherId || !academicYearId || !subjectId || !schoolGradeId) {
            return res.status(400).json({ error: "teacherId, academicYearId, subjectId, and schoolGradeId are required" });
        }

        const assignment = await TeacherService.assignTeacher(organizationId, {
            teacherId,
            academicYearId,
            subjectId,
            schoolGradeId,
            sectionId,
            sectionIds,
            periodsPerWeek: periodsPerWeek !== undefined ? Number(periodsPerWeek) : undefined,
            status: status as any,
            userId: req.user?.id
        });

        return res.status(201).json(assignment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to assign teacher" });
    }
};

// Bulk propose teaching assignments
export const bulkProposeAssignments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { assignments } = req.body;
        if (!Array.isArray(assignments) || assignments.length === 0) {
            return res.status(400).json({ error: "Assignments list cannot be empty" });
        }

        const results = [];
        for (const item of assignments) {
            const created = await TeacherService.assignTeacher(organizationId, {
                ...item,
                status: "PROPOSED",
                userId: req.user?.id
            });
            results.push(created);
        }

        return res.status(201).json({ count: results.length, assignments: results });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Bulk assignment proposal failed" });
    }
};

// Lifecycle: Propose assignment
export const proposeAssignment = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = req.params.id as string;
        const result = await TeacherService.proposeAssignment(id, organizationId, req.user?.id);
        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to propose assignment" });
    }
};

// Lifecycle: Approve assignment
export const approveAssignment = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = req.params.id as string;
        const result = await TeacherService.approveAssignment(id, organizationId, req.user?.id);
        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to approve assignment" });
    }
};

// Lifecycle: Bulk approve assignments
export const bulkApproveAssignments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { assignmentIds } = req.body;
        if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
            return res.status(400).json({ error: "assignmentIds must be a non-empty array" });
        }

        const approved = [];
        for (const id of assignmentIds) {
            const res = await TeacherService.approveAssignment(id, organizationId, req.user?.id);
            approved.push(res);
        }

        return res.json({ count: approved.length, approved });
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Bulk approval failed" });
    }
};

// Lifecycle: Reject assignment
export const rejectAssignment = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = req.params.id as string;
        const { rejectionReason } = req.body;
        const result = await TeacherService.rejectAssignment(id, organizationId, rejectionReason || "Proposal rejected by Principal", req.user?.id);
        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to reject assignment" });
    }
};

// Lifecycle: End assignment safely
export const endAssignment = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = req.params.id as string;
        const result = await TeacherService.endAssignment(id, organizationId, req.user?.id);
        return res.json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to end assignment" });
    }
};

// Get active assignments for the school context
export const getAssignments = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, status } = req.query;

        const assignments = await TeacherService.getAssignments(organizationId, academicYearId as string, status as string);
        return res.json(assignments);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Update an assignment
export const updateAssignment = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = req.params.id as string;
        const assignment = await TeacherService.updateAssignment(id, organizationId, { ...req.body, userId: req.user?.id });
        return res.json(assignment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update assignment" });
    }
};

// Delete an assignment
export const deleteAssignment = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const id = req.params.id as string;
        await TeacherService.deleteAssignment(id, organizationId, req.user?.id);
        return res.status(204).send();
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to delete assignment" });
    }
};

// ==========================================
// TEACHER SPECIALIZATION & HOMEROOM
// ==========================================
export const getTeacherSpecializations = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const teacherId = req.params.id as string;
        const specs = await TeacherService.getTeacherSpecializations(teacherId, organizationId);
        return res.json(specs);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to fetch teacher specializations" });
    }
};

export const addTeacherSpecialization = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const teacherId = req.params.id as string;
        const spec = await TeacherService.addTeacherSpecialization(teacherId, organizationId, req.body);
        return res.status(201).json(spec);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to add specialization" });
    }
};

export const removeTeacherSpecialization = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { id, subjectId } = req.params;
        await TeacherService.removeTeacherSpecialization(id as string, subjectId as string, organizationId);
        return res.status(204).send();
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to remove specialization" });
    }
};

// Assign homeroom teacher to section
export const setHomeroomTeacher = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const sectionId = req.params.sectionId as string;
        const { teacherId } = req.body;

        const { StaffingService } = await import("../academic/staffing.service.js");
        const updated = await StaffingService.setSectionHomeroomTeacher(organizationId, sectionId, teacherId || null, req.user?.id);
        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to assign homeroom teacher" });
    }
};

// Staffing Intelligence Endpoints
export const getStaffingDemand = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;
        if (!academicYearId) return res.status(400).json({ error: "academicYearId is required" });

        const { StaffingService } = await import("../academic/staffing.service.js");
        const demand = await StaffingService.getStaffingDemand(organizationId, academicYearId as string);
        return res.json(demand);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to calculate staffing demand" });
    }
};

export const getSectionCoverage = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId, schoolGradeId } = req.query;
        if (!academicYearId) return res.status(400).json({ error: "academicYearId is required" });

        const { StaffingService } = await import("../academic/staffing.service.js");
        const coverage = await StaffingService.getSectionCoverageMatrix(organizationId, academicYearId as string, schoolGradeId as string);
        return res.json(coverage);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to fetch coverage matrix" });
    }
};

export const getFacultyWorkload = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        if (!organizationId) return res.status(403).json({ error: "Missing school scope" });

        const { academicYearId } = req.query;
        if (!academicYearId) return res.status(400).json({ error: "academicYearId is required" });

        const { StaffingService } = await import("../academic/staffing.service.js");
        const workload = await StaffingService.getFacultyWorkload(organizationId, academicYearId as string);
        return res.json(workload);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to calculate faculty workload" });
    }
};

// Evaluate teacher qualification/specialization against subject
export const evaluateTeacherMatch = async (req: Request, res: Response) => {
    try {
        const { teacherId, subjectId } = req.query;
        if (!teacherId || !subjectId) return res.status(400).json({ error: "teacherId and subjectId are required" });

        const { StaffingService } = await import("../academic/staffing.service.js");
        const evaluation = await StaffingService.evaluateSpecializationMatch(teacherId as string, subjectId as string);
        return res.json(evaluation);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to evaluate teacher match" });
    }
};

// Get the currently logged in teacher's profile and active assignments
export const getTeacherProfile = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const profile = await TeacherService.getTeacherByUserId(userId, organizationId);
        if (!profile) return res.status(404).json({ error: "Teacher profile not found" });

        return res.json(profile);
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getDashboardSummary = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const summary = await TeacherService.getDashboardSummary(userId, organizationId);
        return res.json(summary);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getMyClasses = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const classes = await TeacherService.getMyClasses(userId, organizationId);
        return res.json(classes);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getMyTimetable = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const timetable = await TeacherService.getMyTimetable(userId, organizationId);
        return res.json(timetable);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getMyStudents = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const students = await TeacherService.getMyStudents(userId, organizationId);
        return res.json(students);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
};

export const getStudentDetail = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const student = await TeacherService.getStudentDetail(userId, organizationId, req.params.studentId as string);
        return res.json(student);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to get student detail" });
    }
};

export const getMyProfile = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const profile = await TeacherService.getMyProfile(userId, organizationId);
        return res.json(profile);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to get teacher profile" });
    }
};

export const updateMyProfile = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const updated = await TeacherService.updateMyProfile(userId, organizationId, req.body);
        return res.json(updated);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to update teacher profile" });
    }
};

export const recordBatchAttendance = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const result = await TeacherService.recordBatchAttendance(userId, organizationId, req.body);
        return res.status(201).json(result);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to record batch attendance" });
    }
};

export const getRepeatedAbsences = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const data = await TeacherService.getRepeatedAbsences(userId, organizationId);
        return res.json(data);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to fetch repeated absences" });
    }
};

export const getAttendanceHistory = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const history = await TeacherService.getAttendanceHistory(userId, organizationId);
        return res.json(history);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to fetch attendance history" });
    }
};

export const getCurriculumData = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const data = await TeacherService.getCurriculumData(userId, organizationId);
        return res.json(data);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to fetch curriculum data" });
    }
};

export const createAssessmentWithResults = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const assessment = await TeacherService.createAssessmentWithResults(userId, organizationId, req.body);
        return res.status(201).json(assessment);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to create assessment with results" });
    }
};

export const gradeActivitySubmission = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const submission = await TeacherService.gradeActivitySubmission(userId, organizationId, req.params.submissionId as string, req.body);
        return res.json(submission);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to grade submission" });
    }
};

export const createStudentSupportFlag = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const flag = await TeacherService.createStudentSupportFlag(userId, organizationId, req.body);
        return res.status(201).json(flag);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to raise support flag" });
    }
};

export const resolveSupportFlag = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const flag = await TeacherService.resolveSupportFlag(userId, organizationId, req.params.flagId as string, req.body);
        return res.json(flag);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to resolve support flag" });
    }
};

export const sendParentMessage = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const message = await TeacherService.sendParentMessage(userId, organizationId, req.body);
        return res.status(201).json(message);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to send parent message" });
    }
};

export const getClassPerformanceReport = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const report = await TeacherService.getClassPerformanceReport(userId, organizationId, req.params.teachingAssignmentId as string);
        return res.json(report);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to get class performance report" });
    }
};

export const askAiAssistant = async (req: Request, res: Response) => {
    try {
        const { prompt, category } = req.body;
        return res.json({
            prompt,
            category,
            answer: `AI recommendation for ${category || 'teaching'}: Based on recent class analytics, focusing on concept review and interactive quizzes is recommended for optimal student outcome.`
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to generate AI assistant response" });
    }
};

export const reportIssue = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const issue = await TeacherService.reportIssue(userId, organizationId, req.body);
        return res.status(201).json(issue);
    } catch (error: any) {
        return res.status(400).json({ error: error.message || "Failed to report issue" });
    }
};

export const getMyIssues = async (req: Request, res: Response) => {
    try {
        const organizationId = (req as any).accessScope?.id;
        const userId = req.user?.id;
        if (!organizationId || !userId) return res.status(403).json({ error: "Missing school scope or authentication" });

        const issues = await TeacherService.getMyIssues(userId, organizationId);
        return res.json(issues);
    } catch (error: any) {
        return res.status(500).json({ error: error.message || "Failed to get reported issues" });
    }
};



