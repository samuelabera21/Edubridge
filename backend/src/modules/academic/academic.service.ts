import { prisma } from "../../infrastructure/prisma/client.js";

export class AcademicService {
    // --- Academic Years ---
    static async getAcademicYears(organizationId: string) {
        return prisma.academicYear.findMany({
            where: { organizationId },
            orderBy: { startDate: 'desc' }
        });
    }

    static async createAcademicYear(organizationId: string, data: { name: string; startDate: Date; endDate: Date; status: any }) {
        return prisma.academicYear.create({
            data: {
                organizationId,
                name: data.name,
                startDate: data.startDate,
                endDate: data.endDate,
                status: data.status
            }
        });
    }

    static async activateAcademicYear(organizationId: string, yearId: string) {
        // Ensure no other year is ACTIVE for this organization
        await prisma.academicYear.updateMany({
            where: { organizationId, status: "ACTIVE" },
            data: { status: "COMPLETED" }
        });
        
        const year = await prisma.academicYear.findUnique({ where: { id: yearId } });
        if (!year || year.organizationId !== organizationId) throw new Error("Academic Year not found");

        return prisma.academicYear.update({
            where: { id: yearId },
            data: { status: "ACTIVE" }
        });
    }

    // --- Academic Calendar & Periods ---
    static async createAcademicCalendar(academicYearId: string, description?: string) {
        return prisma.academicCalendar.create({
            data: { academicYearId, description }
        });
    }

    static async createAcademicPeriod(academicCalendarId: string, data: { name: string; startDate: Date; endDate: Date; type: string }) {
        return prisma.academicPeriod.create({
            data: {
                academicCalendarId,
                name: data.name,
                startDate: data.startDate,
                endDate: data.endDate,
                type: data.type
            }
        });
    }

    // --- Grades ---
    static async getGrades(organizationId: string) {
        return prisma.grade.findMany({
            where: { organizationId },
            orderBy: { level: 'asc' }
        });
    }

    static async createGrade(organizationId: string, data: { name: string; level: number }) {
        return prisma.grade.create({
            data: {
                organizationId,
                name: data.name,
                level: data.level
            }
        });
    }

    // --- School Grades (Mapping Grades to Academic Year) ---
    static async getSchoolGrades(organizationId: string, academicYearId: string) {
        const year = await prisma.academicYear.findUnique({ where: { id: academicYearId, organizationId } });
        if (!year) throw new Error("Academic Year not found");

        return prisma.schoolGrade.findMany({
            where: { academicYearId },
            include: { grade: true }
        });
    }

    static async createSchoolGrade(academicYearId: string, gradeId: string) {
        return prisma.schoolGrade.create({
            data: { academicYearId, gradeId }
        });
    }

    // --- Sections ---
    static async getSections(organizationId: string, schoolGradeId: string) {
        const schoolGrade = await prisma.schoolGrade.findUnique({
            where: { id: schoolGradeId },
            include: { academicYear: true }
        });
        
        if (!schoolGrade || schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("Grade not found in this school");
        }

        return prisma.section.findMany({
            where: { schoolGradeId },
            orderBy: { name: 'asc' }
        });
    }

    static async createSection(schoolGradeId: string, name: string, capacity?: number) {
        return prisma.section.create({
            data: { schoolGradeId, name, capacity }
        });
    }

    // --- Subjects ---
    static async getSubjects(organizationId: string) {
        return prisma.subject.findMany({
            where: { organizationId },
            orderBy: { name: 'asc' }
        });
    }

    static async createSubject(organizationId: string, data: { name: string; code?: string }) {
        return prisma.subject.create({
            data: {
                organizationId,
                name: data.name,
                code: data.code
            }
        });
    }

    static async createSchoolSubject(academicYearId: string, subjectId: string) {
        return prisma.schoolSubject.create({
            data: { academicYearId, subjectId }
        });
    }
}
