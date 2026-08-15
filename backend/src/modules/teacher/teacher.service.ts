import { prisma } from "../../infrastructure/prisma/client.js";

export class TeacherService {
    static async createTeacher(organizationId: string, data: { firstName: string; lastName: string; employeeId?: string; userId?: string }) {
        const teacher = await prisma.teacher.create({
            data: {
                organizationId,
                firstName: data.firstName,
                lastName: data.lastName,
                employeeId: data.employeeId || null,
                userId: data.userId || null,
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_CREATED",
                resource: "Teacher",
                resourceId: teacher.id,
                newValue: JSON.parse(JSON.stringify(teacher)),
                userId: data.userId || null
            }
        });

        return teacher;
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
