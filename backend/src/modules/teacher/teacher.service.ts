import { prisma } from "../../infrastructure/prisma/client.js";

export class TeacherService {
    static async createTeacher(organizationId: string, data: any) {
        // Run as a transaction so that if assignment fails, the teacher creation rolls back
        return await prisma.$transaction(async (tx) => {
            const teacher = await tx.teacher.create({
                data: {
                    organizationId,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    fatherName: data.fatherName || null,
                    grandfatherName: data.grandfatherName || null,
                    gender: data.gender || null,
                    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
                    qualification: data.qualification || null,
                    fieldOfStudy: data.fieldOfStudy || null,
                    yearsOfExperience: data.yearsOfExperience ? parseInt(data.yearsOfExperience, 10) : null,
                    phoneNumber: data.phoneNumber || null,
                    email: data.email || null,
                    region: data.region || null,
                    zone: data.zone || null,
                    woreda: data.woreda || null,
                    city: data.city || null,
                    kebele: data.kebele || null,
                    houseNumber: data.houseNumber || null,
                    photoUrl: data.photoUrl || null,
                    documents: data.documents || null,
                    employeeId: data.employeeId || null,
                    userId: data.userId || null,
                }
            });

            await tx.auditLog.create({
                data: {
                    organizationId,
                    action: "TEACHER_CREATED",
                    resource: "Teacher",
                    resourceId: teacher.id,
                    newValue: JSON.parse(JSON.stringify(teacher)),
                    userId: data.userId || null
                }
            });

            // Initial Assignment handling
            if (data.initialAssignment && data.initialAssignment.academicYearId && data.initialAssignment.subjectId && data.initialAssignment.schoolGradeId) {
                // Validate subject belongs to school
                const subject = await tx.subject.findFirst({
                    where: { id: data.initialAssignment.subjectId, organizationId }
                });
                if (!subject) throw new Error("Subject not found in this school");

                // Validate grade belongs to school and academic year
                const schoolGrade = await tx.schoolGrade.findFirst({
                    where: { id: data.initialAssignment.schoolGradeId, academicYearId: data.initialAssignment.academicYearId, academicYear: { organizationId } }
                });
                if (!schoolGrade) throw new Error("Invalid school grade or academic year");

                const assignment = await tx.teachingAssignment.create({
                    data: {
                        teacherId: teacher.id,
                        academicYearId: data.initialAssignment.academicYearId,
                        subjectId: data.initialAssignment.subjectId,
                        schoolGradeId: data.initialAssignment.schoolGradeId,
                        sectionId: data.initialAssignment.sectionId || null
                    }
                });

                await tx.auditLog.create({
                    data: {
                        organizationId,
                        action: "TEACHING_ASSIGNMENT_CREATED",
                        resource: "TeachingAssignment",
                        resourceId: assignment.id,
                        newValue: JSON.parse(JSON.stringify(assignment)),
                        userId: data.userId || null
                    }
                });
            }

            return teacher;
        });
    }

    static async getTeacherById(organizationId: string, teacherId: string) {
        return prisma.teacher.findFirst({
            where: { id: teacherId, organizationId },
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
    }

    static async getTeachers(organizationId: string) {
        return prisma.teacher.findMany({
            where: { organizationId },
            include: {
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }

    static async assignTeacher(organizationId: string, data: { teacherId: string; academicYearId: string; subjectId: string; schoolGradeId: string; sectionId?: string }) {
        // Validate teacher belongs to the school
        const teacher = await prisma.teacher.findFirst({
            where: { id: data.teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found in this school");

        // Validate subject belongs to school
        const subject = await prisma.subject.findFirst({
            where: { id: data.subjectId, organizationId }
        });
        if (!subject) throw new Error("Subject not found in this school");

        // Validate grade belongs to school and academic year
        const schoolGrade = await prisma.schoolGrade.findFirst({
            where: { id: data.schoolGradeId, academicYearId: data.academicYearId, academicYear: { organizationId } }
        });
        if (!schoolGrade) throw new Error("Invalid school grade or academic year");

        // Validate section if provided
        if (data.sectionId) {
            const section = await prisma.section.findFirst({
                where: { id: data.sectionId, schoolGradeId: data.schoolGradeId }
            });
            if (!section) throw new Error("Section does not belong to this grade");
        }

        const existing = await prisma.teachingAssignment.findFirst({
            where: { 
                teacherId: data.teacherId, 
                academicYearId: data.academicYearId, 
                subjectId: data.subjectId, 
                sectionId: data.sectionId || null 
            }
        });

        if (existing) {
            throw new Error("This exact teaching assignment already exists");
        }

        const assignment = await prisma.teachingAssignment.create({
            data: {
                teacherId: data.teacherId,
                academicYearId: data.academicYearId,
                subjectId: data.subjectId,
                schoolGradeId: data.schoolGradeId,
                sectionId: data.sectionId || null
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_CREATED",
                resource: "TeachingAssignment",
                resourceId: assignment.id,
                newValue: JSON.parse(JSON.stringify(assignment)),
            }
        });

        return assignment;
    }

    static async getAssignments(organizationId: string, academicYearId?: string) {
        return prisma.teachingAssignment.findMany({
            where: {
                teacher: { organizationId },
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
    }

    static async updateAssignment(id: string, organizationId: string, data: { subjectId?: string; schoolGradeId?: string; sectionId?: string; isPrimary?: boolean }) {
        const existing = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } }
        });
        if (!existing) throw new Error("Teaching assignment not found");

        if (data.schoolGradeId) {
            const schoolGrade = await prisma.schoolGrade.findFirst({
                where: { id: data.schoolGradeId, academicYearId: existing.academicYearId, academicYear: { organizationId } }
            });
            if (!schoolGrade) throw new Error("Invalid school grade for this academic year");
        }

        if (data.sectionId) {
            const gradeId = data.schoolGradeId || existing.schoolGradeId;
            const section = await prisma.section.findFirst({
                where: { id: data.sectionId, schoolGradeId: gradeId }
            });
            if (!section) throw new Error("Section does not belong to the selected grade");
        }

        const assignment = await prisma.teachingAssignment.update({
            where: { id },
            data: {
                ...(data.subjectId && { subjectId: data.subjectId }),
                ...(data.schoolGradeId && { schoolGradeId: data.schoolGradeId }),
                ...(data.sectionId !== undefined && { sectionId: data.sectionId || null }),
                // Ignore isPrimary for now since it's not in the Prisma model yet,
                // If it is in the model, we can uncomment below:
                // ...(data.isPrimary !== undefined && { isPrimary: data.isPrimary })
            },
            include: {
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: true
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_UPDATED",
                resource: "TeachingAssignment",
                resourceId: assignment.id,
                newValue: JSON.parse(JSON.stringify(assignment)),
            }
        });

        return assignment;
    }

    static async deleteAssignment(id: string, organizationId: string) {
        const existing = await prisma.teachingAssignment.findFirst({
            where: { id, teacher: { organizationId } }
        });
        if (!existing) throw new Error("Teaching assignment not found");

        await prisma.teachingAssignment.delete({ where: { id } });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHING_ASSIGNMENT_DELETED",
                resource: "TeachingAssignment",
                resourceId: id,
                oldValue: JSON.parse(JSON.stringify(existing)),
            }
        });
    }

    static async getTeacherByUserId(userId: string, organizationId: string) {
        return prisma.teacher.findFirst({
            where: { userId, organizationId },
            include: {
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                }
            }
        });
    }
}
