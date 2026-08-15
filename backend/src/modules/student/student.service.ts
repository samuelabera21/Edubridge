import { prisma } from "../../infrastructure/prisma/client.js";
import { EnrollmentStatus } from "../../generated/prisma/enums.js";

export class StudentService {
    static async createStudent(data: { firstName: string; lastName: string; studentId: string; dateOfBirth?: string; gender?: string; userId?: string }) {
        const student = await prisma.student.create({
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                studentId: data.studentId,
                dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                gender: data.gender,
            }
        });
        
        await prisma.auditLog.create({
            data: {
                action: "STUDENT_CREATED",
                resource: "Student",
                resourceId: student.id,
                newValue: JSON.parse(JSON.stringify(student)),
                userId: data.userId || null
            }
        });
        
        return student;
    }

    static async getStudents() {
        return prisma.student.findMany();
    }

    static async enrollStudent(organizationId: string, studentId: string, academicYearId: string, schoolGradeId: string, sectionId?: string) {
        // Check if there is an active/enrolled enrollment in this academic year
        const activeEnrollment = await prisma.studentEnrollment.findFirst({
            where: {
                studentId,
                academicYearId,
                status: {
                    in: ["ACTIVE", "ENROLLED"]
                }
            }
        });

        if (activeEnrollment) {
            throw new Error("Student is already actively enrolled in this academic year");
        }

        const enrollment = await prisma.studentEnrollment.create({
            data: {
                studentId,
                organizationId,
                academicYearId,
                schoolGradeId,
                sectionId: sectionId || null,
                status: EnrollmentStatus.ENROLLED
            }
        });

        await prisma.studentStatusHistory.create({
            data: {
                enrollmentId: enrollment.id,
                status: EnrollmentStatus.ENROLLED,
                reason: "Initial Enrollment"
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "STUDENT_ENROLLED",
                resource: "StudentEnrollment",
                resourceId: enrollment.id,
                newValue: JSON.parse(JSON.stringify(enrollment)),
            }
        });

        return enrollment;
    }

    static async getEnrollments(organizationId: string, academicYearId?: string) {
        return prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                ...(academicYearId ? { academicYearId } : {})
            },
            include: {
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async transferStudent(organizationId: string, enrollmentId: string, targetSchoolGradeId: string, targetSectionId?: string, reason?: string) {
        const currentEnrollment = await prisma.studentEnrollment.findUnique({
            where: { id: enrollmentId, organizationId }
        });

        if (!currentEnrollment) {
            throw new Error("Enrollment not found");
        }
        
        if (currentEnrollment.status !== EnrollmentStatus.ACTIVE && currentEnrollment.status !== EnrollmentStatus.ENROLLED) {
            throw new Error("Cannot transfer a student who is not currently active or enrolled");
        }

        // Close current enrollment
        await prisma.studentEnrollment.update({
            where: { id: enrollmentId },
            data: { status: EnrollmentStatus.TRANSFERRED }
        });

        await prisma.studentStatusHistory.create({
            data: {
                enrollmentId: enrollmentId,
                status: EnrollmentStatus.TRANSFERRED,
                reason: reason || "Transferred to new section/grade"
            }
        });

        // Open new enrollment
        const newEnrollment = await prisma.studentEnrollment.create({
            data: {
                studentId: currentEnrollment.studentId,
                organizationId: currentEnrollment.organizationId,
                academicYearId: currentEnrollment.academicYearId,
                schoolGradeId: targetSchoolGradeId,
                sectionId: targetSectionId || null,
                status: EnrollmentStatus.ACTIVE
            }
        });

        await prisma.studentStatusHistory.create({
            data: {
                enrollmentId: newEnrollment.id,
                status: EnrollmentStatus.ACTIVE,
                reason: reason || "Transfer received"
            }
        });

        return newEnrollment;
    }

    static async updateStudentStatus(organizationId: string, enrollmentId: string, status: EnrollmentStatus, reason?: string) {
        const enrollment = await prisma.studentEnrollment.findUnique({
            where: { id: enrollmentId, organizationId }
        });

        if (!enrollment) throw new Error("Enrollment not found");

        const updated = await prisma.studentEnrollment.update({
            where: { id: enrollmentId },
            data: { status }
        });

        await prisma.studentStatusHistory.create({
            data: {
                enrollmentId,
                status,
                reason: reason || null
            }
        });

        return updated;
    }

    static async getStudentByUserId(userId: string) {
        return prisma.student.findFirst({
            where: { 
                parents: {
                    some: {
                        parent: {
                            userId
                        }
                    }
                }
            },
            include: {
                enrollments: {
                    include: {
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        organization: true,
                        academicYear: true
                    }
                }
            }
        });
    }
}
