import { prisma } from "../../infrastructure/prisma/client.js";
import { AssessmentType } from "../../generated/prisma/enums.js";

export class AssessmentService {
    static async createAssessment(organizationId: string, data: { academicYearId: string; teachingAssignmentId: string; title: string; description?: string; type: AssessmentType; maxScore: number; passingScore?: number; dueDate?: string }) {
        // Validate teaching assignment exists and belongs to school
        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: data.teachingAssignmentId, teacher: { organizationId } }
        });
        
        if (!assignment) {
            throw new Error("Teaching assignment not found or does not belong to this organization");
        }

        const assessment = await prisma.assessment.create({
            data: {
                organizationId,
                academicYearId: data.academicYearId,
                teachingAssignmentId: data.teachingAssignmentId,
                title: data.title,
                description: data.description,
                type: data.type,
                maxScore: data.maxScore,
                passingScore: data.passingScore,
                dueDate: data.dueDate ? new Date(data.dueDate) : null
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "ASSESSMENT_CREATED",
                resource: "Assessment",
                resourceId: assessment.id,
                newValue: JSON.parse(JSON.stringify(assessment))
            }
        });

        return assessment;
    }

    static async getAssessments(organizationId: string, teachingAssignmentId?: string) {
        return prisma.assessment.findMany({
            where: {
                organizationId,
                ...(teachingAssignmentId ? { teachingAssignmentId } : {})
            },
            include: { teachingAssignment: { include: { subject: true, schoolGrade: true, section: true } } },
            orderBy: { createdAt: "desc" }
        });
    }

    static async recordResult(organizationId: string, data: { assessmentId: string; enrollmentId: string; score: number; feedback?: string; gradedById?: string }) {
        // Validate assessment exists in organization
        const assessment = await prisma.assessment.findFirst({
            where: { id: data.assessmentId, organizationId }
        });

        if (!assessment) {
            throw new Error("Assessment not found");
        }

        if (data.score > assessment.maxScore) {
            throw new Error(`Score cannot exceed maximum score of ${assessment.maxScore}`);
        }

        // Validate student is enrolled in the organization
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { id: data.enrollmentId, organizationId }
        });

        if (!enrollment) {
            throw new Error("Student enrollment not found");
        }

        const result = await prisma.studentResult.upsert({
            where: {
                assessmentId_enrollmentId: {
                    assessmentId: data.assessmentId,
                    enrollmentId: data.enrollmentId
                }
            },
            update: {
                score: data.score,
                feedback: data.feedback,
                gradedById: data.gradedById
            },
            create: {
                assessmentId: data.assessmentId,
                enrollmentId: data.enrollmentId,
                score: data.score,
                feedback: data.feedback,
                gradedById: data.gradedById
            }
        });

        return result;
    }

    static async getStudentResults(organizationId: string, enrollmentId: string, academicYearId?: string) {
        return prisma.studentResult.findMany({
            where: {
                enrollment: { id: enrollmentId, organizationId },
                ...(academicYearId ? { assessment: { academicYearId } } : {})
            },
            include: {
                assessment: { include: { teachingAssignment: { include: { subject: true } } } },
                gradedBy: true
            },
            orderBy: { createdAt: "desc" }
        });
    }
}
