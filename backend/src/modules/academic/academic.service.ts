import { prisma } from "../../infrastructure/prisma/client.js";

export const VALID_ACADEMIC_YEAR_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export type AcademicYearStatusType = typeof VALID_ACADEMIC_YEAR_STATUSES[number];

export const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
    PLANNED: ["ACTIVE", "ARCHIVED"],
    ACTIVE: ["COMPLETED"],
    COMPLETED: ["ARCHIVED"],
    ARCHIVED: [] // terminal
};

export class AcademicService {
    // --- Academic Years ---
    static async getAcademicYears(organizationId: string) {
        return prisma.academicYear.findMany({
            where: { organizationId },
            orderBy: { startDate: 'desc' }
        });
    }

    static async getAcademicYearById(organizationId: string, yearId: string) {
        const year = await prisma.academicYear.findUnique({
            where: { id: yearId, organizationId }
        });

        if (!year) throw new Error("Academic Year not found");

        const [studentsCount, teachersCount, gradesCount, sectionsCount] = await Promise.all([
            prisma.studentEnrollment.count({ where: { academicYearId: yearId } }),
            
            // To get distinct teachers we can fetch unique assignments
            prisma.teachingAssignment.findMany({
                where: { academicYearId: yearId },
                select: { teacherId: true },
                distinct: ['teacherId']
            }).then(res => res.length),

            prisma.schoolGrade.count({ where: { academicYearId: yearId } }),

            prisma.section.count({
                where: { schoolGrade: { academicYearId: yearId } }
            })
        ]);

        return {
            ...year,
            stats: {
                students: studentsCount,
                teachers: teachersCount,
                grades: gradesCount,
                sections: sectionsCount
            }
        };
    }

    static async updateAcademicYear(organizationId: string, yearId: string, data: { name?: string; startDate?: Date; endDate?: Date; status?: any }) {
        const year = await prisma.academicYear.findUnique({ where: { id: yearId, organizationId } });
        if (!year) throw new Error("Academic Year not found");

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;

        let effectiveStartDate = year.startDate;
        let effectiveEndDate = year.endDate;

        if (data.startDate !== undefined) {
            const parsedStart = new Date(data.startDate);
            if (isNaN(parsedStart.getTime())) throw new Error("Invalid startDate");
            effectiveStartDate = parsedStart;
            updateData.startDate = parsedStart;
        }

        if (data.endDate !== undefined) {
            const parsedEnd = new Date(data.endDate);
            if (isNaN(parsedEnd.getTime())) throw new Error("Invalid endDate");
            effectiveEndDate = parsedEnd;
            updateData.endDate = parsedEnd;
        }

        if (effectiveStartDate >= effectiveEndDate) {
            throw new Error("startDate must be before endDate");
        }
        
        if (data.status !== undefined) {
            if (data.status === "DRAFT") {
                throw new Error("DRAFT status is invalid. Use PLANNED, ACTIVE, COMPLETED, or ARCHIVED.");
            }
            if (!VALID_ACADEMIC_YEAR_STATUSES.includes(data.status)) {
                throw new Error(`Invalid status: ${data.status}`);
            }

            if (data.status !== year.status) {
                const allowed = ALLOWED_STATUS_TRANSITIONS[year.status] || [];
                if (!allowed.includes(data.status)) {
                    throw new Error(`Cannot transition academic year from ${year.status} to ${data.status}`);
                }

                updateData.status = data.status;

                // If changing to active, ensure other active years in this school are completed
                if (data.status === "ACTIVE") {
                    await prisma.academicYear.updateMany({
                        where: { organizationId, status: "ACTIVE", id: { not: yearId } },
                        data: { status: "COMPLETED" }
                    });
                }
            }
        }

        return prisma.academicYear.update({
            where: { id: yearId },
            data: updateData
        });
    }

    static async copyStructureFromPreviousYear(organizationId: string, currentYearId: string, previousYearId: string) {
        const currentYear = await prisma.academicYear.findUnique({ where: { id: currentYearId, organizationId } });
        const prevYear = await prisma.academicYear.findUnique({ where: { id: previousYearId, organizationId } });

        if (!currentYear || !prevYear) throw new Error("Academic Year not found");

        // 1. Fetch previous school grades with sections
        const prevSchoolGrades = await prisma.schoolGrade.findMany({
            where: { academicYearId: previousYearId },
            include: { sections: true }
        });

        if (prevSchoolGrades.length === 0) {
            throw new Error("No structure found in previous year to copy");
        }

        let totalGradesAdded = 0;
        let totalSectionsAdded = 0;

        for (const prevGrade of prevSchoolGrades) {
            // Create school grade in new year if it doesn't exist
            const existing = await prisma.schoolGrade.findUnique({
                where: { academicYearId_gradeId: { academicYearId: currentYearId, gradeId: prevGrade.gradeId } }
            });

            if (!existing) {
                const newSchoolGrade = await prisma.schoolGrade.create({
                    data: {
                        academicYearId: currentYearId,
                        gradeId: prevGrade.gradeId
                    }
                });
                totalGradesAdded++;

                // Copy sections
                if (prevGrade.sections && prevGrade.sections.length > 0) {
                    await prisma.section.createMany({
                        data: prevGrade.sections.map(sec => ({
                            schoolGradeId: newSchoolGrade.id,
                            name: sec.name,
                            capacity: sec.capacity
                        }))
                    });
                    totalSectionsAdded += prevGrade.sections.length;
                }
            }
        }

        return { message: `Copied ${totalGradesAdded} grades and ${totalSectionsAdded} sections.` };
    }

    static async createAcademicYear(organizationId: string, data: { name: string; startDate: Date; endDate: Date; status?: any }) {
        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Invalid startDate or endDate");
        }

        if (startDate >= endDate) {
            throw new Error("startDate must be before endDate");
        }

        const status = data.status || "PLANNED";
        if (status === "DRAFT") {
            throw new Error("DRAFT status is invalid. Use PLANNED, ACTIVE, COMPLETED, or ARCHIVED.");
        }
        if (!VALID_ACADEMIC_YEAR_STATUSES.includes(status)) {
            throw new Error(`Invalid status: ${status}`);
        }

        if (status === "COMPLETED" || status === "ARCHIVED") {
            throw new Error(`Cannot create a new academic year with status ${status}`);
        }

        if (status === "ACTIVE") {
            await prisma.academicYear.updateMany({
                where: { organizationId, status: "ACTIVE" },
                data: { status: "COMPLETED" }
            });
        }

        return prisma.academicYear.create({
            data: {
                organizationId,
                name: data.name,
                startDate,
                endDate,
                status
            }
        });
    }

    static async activateAcademicYear(organizationId: string, yearId: string) {
        const year = await prisma.academicYear.findUnique({ where: { id: yearId } });
        if (!year || year.organizationId !== organizationId) {
            throw new Error("Academic Year not found");
        }

        if (year.status === "ACTIVE") {
            return year;
        }

        if (year.status !== "PLANNED") {
            throw new Error(`Cannot activate academic year with status ${year.status}`);
        }

        // Demote existing active academic years in the same school scope
        await prisma.academicYear.updateMany({
            where: { organizationId, status: "ACTIVE", id: { not: yearId } },
            data: { status: "COMPLETED" }
        });

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
            include: { grade: true, sections: true }
        });
    }

    static async createSchoolGrade(academicYearId: string, gradeId: string) {
        return prisma.schoolGrade.create({
            data: { academicYearId, gradeId }
        });
    }

    static async getSchoolGradeDetails(organizationId: string, schoolGradeId: string) {
        const schoolGrade = await prisma.schoolGrade.findUnique({
            where: { id: schoolGradeId },
            include: {
                academicYear: true,
                grade: true,
                sections: {
                    include: {
                        studentEnrollments: {
                            include: {
                                student: true
                            }
                        }
                    }
                }
            }
        });

        if (!schoolGrade || schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("School Grade not found or unauthorized");
        }

        return schoolGrade;
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
