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
    static async getAcademicCalendar(organizationId: string, academicYearId: string) {
        const year = await prisma.academicYear.findUnique({
            where: { id: academicYearId, organizationId }
        });
        if (!year) throw new Error("Academic Year not found");

        return prisma.academicCalendar.findUnique({
            where: { academicYearId },
            include: {
                periods: {
                    orderBy: { startDate: 'asc' }
                }
            }
        });
    }

    static async createAcademicCalendar(organizationId: string, academicYearId: string, description?: string) {
        const year = await prisma.academicYear.findUnique({
            where: { id: academicYearId, organizationId }
        });
        if (!year) throw new Error("Academic Year not found");

        const existing = await prisma.academicCalendar.findUnique({
            where: { academicYearId }
        });
        if (existing) {
            return existing;
        }

        return prisma.academicCalendar.create({
            data: { academicYearId, description },
            include: { periods: true }
        });
    }

    static async getAcademicPeriods(organizationId: string, academicCalendarId: string) {
        const calendar = await prisma.academicCalendar.findUnique({
            where: { id: academicCalendarId },
            include: { academicYear: true }
        });
        if (!calendar || calendar.academicYear.organizationId !== organizationId) {
            throw new Error("Academic calendar not found or access denied");
        }

        return prisma.academicPeriod.findMany({
            where: { academicCalendarId },
            orderBy: { startDate: 'asc' }
        });
    }

    static async createAcademicPeriod(
        organizationId: string,
        academicCalendarId: string,
        data: { name: string; startDate: Date | string; endDate: Date | string; type: string }
    ) {
        const calendar = await prisma.academicCalendar.findUnique({
            where: { id: academicCalendarId },
            include: {
                academicYear: true,
                periods: true
            }
        });
        if (!calendar || calendar.academicYear.organizationId !== organizationId) {
            throw new Error("Academic calendar not found or access denied");
        }

        const startDate = new Date(data.startDate);
        const endDate = new Date(data.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Invalid startDate or endDate format");
        }

        if (startDate >= endDate) {
            throw new Error("Period startDate must be strictly before endDate");
        }

        const yearStart = new Date(calendar.academicYear.startDate);
        const yearEnd = new Date(calendar.academicYear.endDate);

        if (startDate < yearStart || endDate > yearEnd) {
            throw new Error(
                `Academic period dates (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}) must fall within academic year range (${yearStart.toISOString().split('T')[0]} to ${yearEnd.toISOString().split('T')[0]})`
            );
        }

        // Validate non-overlapping periods in the same calendar
        for (const existing of calendar.periods) {
            const exStart = new Date(existing.startDate);
            const exEnd = new Date(existing.endDate);
            if (startDate < exEnd && endDate > exStart) {
                throw new Error(`Academic period dates overlap with existing period "${existing.name}" (${exStart.toISOString().split('T')[0]} to ${exEnd.toISOString().split('T')[0]})`);
            }
        }

        return prisma.academicPeriod.create({
            data: {
                academicCalendarId,
                name: data.name.trim(),
                startDate,
                endDate,
                type: data.type || "SEMESTER"
            }
        });
    }

    static async updateAcademicPeriod(
        organizationId: string,
        periodId: string,
        data: { name?: string; startDate?: Date | string; endDate?: Date | string; type?: string }
    ) {
        const period = await prisma.academicPeriod.findUnique({
            where: { id: periodId },
            include: {
                academicCalendar: {
                    include: {
                        academicYear: true,
                        periods: true
                    }
                }
            }
        });

        if (!period || period.academicCalendar.academicYear.organizationId !== organizationId) {
            throw new Error("Academic period not found or access denied");
        }

        const effectiveStart = data.startDate ? new Date(data.startDate) : new Date(period.startDate);
        const effectiveEnd = data.endDate ? new Date(data.endDate) : new Date(period.endDate);

        if (isNaN(effectiveStart.getTime()) || isNaN(effectiveEnd.getTime())) {
            throw new Error("Invalid startDate or endDate");
        }

        if (effectiveStart >= effectiveEnd) {
            throw new Error("Period startDate must be strictly before endDate");
        }

        const yearStart = new Date(period.academicCalendar.academicYear.startDate);
        const yearEnd = new Date(period.academicCalendar.academicYear.endDate);

        if (effectiveStart < yearStart || effectiveEnd > yearEnd) {
            throw new Error("Academic period dates must fall within academic year range");
        }

        // Check overlap against other periods in this calendar
        for (const other of period.academicCalendar.periods) {
            if (other.id === periodId) continue;
            const otherStart = new Date(other.startDate);
            const otherEnd = new Date(other.endDate);
            if (effectiveStart < otherEnd && effectiveEnd > otherStart) {
                throw new Error(`Academic period dates overlap with existing period "${other.name}"`);
            }
        }

        return prisma.academicPeriod.update({
            where: { id: periodId },
            data: {
                ...(data.name ? { name: data.name.trim() } : {}),
                startDate: effectiveStart,
                endDate: effectiveEnd,
                ...(data.type ? { type: data.type } : {})
            }
        });
    }

    static async deleteAcademicPeriod(organizationId: string, periodId: string) {
        const period = await prisma.academicPeriod.findUnique({
            where: { id: periodId },
            include: {
                academicCalendar: {
                    include: { academicYear: true }
                }
            }
        });

        if (!period || period.academicCalendar.academicYear.organizationId !== organizationId) {
            throw new Error("Academic period not found or access denied");
        }

        return prisma.academicPeriod.delete({
            where: { id: periodId }
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
        if (!data.name || data.name.trim().length === 0) {
            throw new Error("Grade name is required");
        }
        const level = Number(data.level);
        if (isNaN(level) || level < 0) {
            throw new Error("Grade level must be a non-negative number");
        }

        const trimmedName = data.name.trim();

        // Check if master grade already exists for this organization (by level or name)
        const existing = await prisma.grade.findFirst({
            where: {
                organizationId,
                OR: [{ level }, { name: trimmedName }]
            }
        });

        if (existing) {
            return existing;
        }

        return prisma.grade.create({
            data: {
                organizationId,
                name: trimmedName,
                level
            }
        });
    }

    // --- School Grades (Mapping Grades to Academic Year) ---
    static async getSchoolGrades(organizationId: string, academicYearId: string) {
        const year = await prisma.academicYear.findUnique({ where: { id: academicYearId, organizationId } });
        if (!year) throw new Error("Academic Year not found");

        return prisma.schoolGrade.findMany({
            where: { academicYearId },
            include: {
                grade: true,
                sections: {
                    orderBy: { name: 'asc' }
                },
                gradeSubjects: {
                    include: { subject: true },
                    orderBy: { subject: { name: 'asc' } }
                }
            },
            orderBy: { grade: { level: 'asc' } }
        });
    }

    static async createSchoolGrade(organizationId: string, academicYearId: string, gradeId: string) {
        const year = await prisma.academicYear.findUnique({ where: { id: academicYearId, organizationId } });
        if (!year) throw new Error("Academic Year not found in this school");

        const grade = await prisma.grade.findUnique({ where: { id: gradeId, organizationId } });
        if (!grade) throw new Error("Master grade not found in this school");

        const existing = await prisma.schoolGrade.findUnique({
            where: { academicYearId_gradeId: { academicYearId, gradeId } },
            include: { grade: true, sections: true, gradeSubjects: { include: { subject: true } } }
        });

        if (existing) {
            return existing;
        }

        return prisma.schoolGrade.create({
            data: { academicYearId, gradeId },
            include: { grade: true, sections: true, gradeSubjects: { include: { subject: true } } }
        });
    }

    static async deleteSchoolGrade(organizationId: string, schoolGradeId: string) {
        const schoolGrade = await prisma.schoolGrade.findUnique({
            where: { id: schoolGradeId },
            include: {
                academicYear: true,
                sections: true,
                studentEnrollments: true,
                teachingAssignments: true
            }
        });

        if (!schoolGrade || schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("School Grade not found or unauthorized");
        }

        if (schoolGrade.studentEnrollments.length > 0) {
            throw new Error(`Cannot delete grade: ${schoolGrade.studentEnrollments.length} students are currently enrolled in this grade`);
        }

        if (schoolGrade.teachingAssignments.length > 0) {
            throw new Error(`Cannot delete grade: active teaching assignments depend on it`);
        }

        if (schoolGrade.sections.length > 0) {
            throw new Error(`Cannot delete grade: remove all sections (${schoolGrade.sections.length}) before deleting this grade offering`);
        }

        return prisma.schoolGrade.delete({
            where: { id: schoolGradeId }
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
                    },
                    orderBy: { name: 'asc' }
                },
                gradeSubjects: {
                    include: { subject: true },
                    orderBy: { subject: { name: 'asc' } }
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

    static async createSection(organizationId: string, schoolGradeId: string, name: string, capacity?: number) {
        const schoolGrade = await prisma.schoolGrade.findUnique({
            where: { id: schoolGradeId },
            include: { academicYear: true }
        });

        if (!schoolGrade || schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("Grade not found in this school");
        }

        const trimmedName = (name || "").trim().toUpperCase();
        if (!trimmedName) {
            throw new Error("Section name is required");
        }

        let parsedCapacity: number | undefined = undefined;
        if (capacity !== undefined && capacity !== null && capacity !== ("" as any)) {
            parsedCapacity = Number(capacity);
            if (isNaN(parsedCapacity) || parsedCapacity < 1) {
                throw new Error("Section capacity must be a positive integer greater than or equal to 1");
            }
        }

        const existing = await prisma.section.findUnique({
            where: { schoolGradeId_name: { schoolGradeId, name: trimmedName } }
        });
        if (existing) {
            throw new Error(`Section "${trimmedName}" already exists in this grade`);
        }

        return prisma.section.create({
            data: {
                schoolGradeId,
                name: trimmedName,
                capacity: parsedCapacity
            }
        });
    }

    static async updateSection(
        organizationId: string,
        sectionId: string,
        data: { name?: string; capacity?: number }
    ) {
        const section = await prisma.section.findUnique({
            where: { id: sectionId },
            include: {
                schoolGrade: { include: { academicYear: true } },
                studentEnrollments: true
            }
        });

        if (!section || section.schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("Section not found or access denied");
        }

        const updateData: any = {};

        if (data.name !== undefined) {
            const trimmedName = data.name.trim().toUpperCase();
            if (!trimmedName) throw new Error("Section name cannot be empty");
            if (trimmedName !== section.name) {
                const existing = await prisma.section.findUnique({
                    where: { schoolGradeId_name: { schoolGradeId: section.schoolGradeId, name: trimmedName } }
                });
                if (existing) {
                    throw new Error(`Section "${trimmedName}" already exists in this grade`);
                }
                updateData.name = trimmedName;
            }
        }

        if (data.capacity !== undefined && data.capacity !== null && data.capacity !== ("" as any)) {
            const newCap = Number(data.capacity);
            if (isNaN(newCap) || newCap < 1) {
                throw new Error("Section capacity must be a positive integer greater than or equal to 1");
            }
            const enrolledCount = section.studentEnrollments.length;
            if (newCap < enrolledCount) {
                throw new Error(`Cannot reduce section capacity to ${newCap}: ${enrolledCount} students are currently enrolled in this section`);
            }
            updateData.capacity = newCap;
        }

        return prisma.section.update({
            where: { id: sectionId },
            data: updateData
        });
    }

    static async deleteSection(organizationId: string, sectionId: string) {
        const section = await prisma.section.findUnique({
            where: { id: sectionId },
            include: {
                schoolGrade: { include: { academicYear: true } },
                studentEnrollments: true,
                teachingAssignments: true
            }
        });

        if (!section || section.schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("Section not found or access denied");
        }

        if (section.studentEnrollments.length > 0) {
            throw new Error(`Cannot delete section: ${section.studentEnrollments.length} enrolled students depend on it`);
        }

        if (section.teachingAssignments.length > 0) {
            throw new Error(`Cannot delete section: active teaching assignments depend on it`);
        }

        return prisma.section.delete({
            where: { id: sectionId }
        });
    }

    // --- Subjects Master & Academic Year Offerings ---
    static async getSubjects(organizationId: string) {
        return prisma.subject.findMany({
            where: { organizationId },
            orderBy: { name: 'asc' }
        });
    }

    static async createSubject(organizationId: string, data: { name: string; code?: string }) {
        const trimmedName = (data.name || "").trim();
        if (!trimmedName) throw new Error("Subject name is required");

        const existing = await prisma.subject.findFirst({
            where: { organizationId, name: trimmedName }
        });

        if (existing) {
            return existing;
        }

        return prisma.subject.create({
            data: {
                organizationId,
                name: trimmedName,
                code: data.code ? data.code.trim().toUpperCase() : undefined
            }
        });
    }

    static async getSchoolSubjects(organizationId: string, academicYearId: string) {
        const year = await prisma.academicYear.findUnique({ where: { id: academicYearId, organizationId } });
        if (!year) throw new Error("Academic Year not found");

        return prisma.schoolSubject.findMany({
            where: { academicYearId },
            include: { subject: true },
            orderBy: { subject: { name: 'asc' } }
        });
    }

    static async createSchoolSubject(organizationId: string, academicYearId: string, subjectId: string) {
        const year = await prisma.academicYear.findUnique({ where: { id: academicYearId, organizationId } });
        if (!year) throw new Error("Academic Year not found in this school");

        const subject = await prisma.subject.findUnique({ where: { id: subjectId, organizationId } });
        if (!subject) throw new Error("Master subject not found in this school");

        const existing = await prisma.schoolSubject.findUnique({
            where: { academicYearId_subjectId: { academicYearId, subjectId } },
            include: { subject: true }
        });

        if (existing) {
            return existing;
        }

        return prisma.schoolSubject.create({
            data: { academicYearId, subjectId },
            include: { subject: true }
        });
    }

    static async deleteSchoolSubject(organizationId: string, academicYearId: string, subjectId: string) {
        const schoolSubject = await prisma.schoolSubject.findUnique({
            where: { academicYearId_subjectId: { academicYearId, subjectId } },
            include: { academicYear: true }
        });

        if (!schoolSubject || schoolSubject.academicYear.organizationId !== organizationId) {
            throw new Error("Offered subject not found or unauthorized");
        }

        // Check if subject is linked to any grade curriculum in this year
        const gradeSubjectCount = await prisma.schoolGradeSubject.count({
            where: {
                subjectId,
                schoolGrade: { academicYearId }
            }
        });

        if (gradeSubjectCount > 0) {
            throw new Error(`Cannot remove subject from academic year: it is currently assigned to ${gradeSubjectCount} grade level(s)`);
        }

        return prisma.schoolSubject.delete({
            where: { academicYearId_subjectId: { academicYearId, subjectId } }
        });
    }

    // --- Grade-Specific Curriculum & Weekly Periods ---
    static async getSchoolGradeSubjects(organizationId: string, schoolGradeId: string) {
        const schoolGrade = await prisma.schoolGrade.findUnique({
            where: { id: schoolGradeId },
            include: { academicYear: true }
        });

        if (!schoolGrade || schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("Grade not found in this school");
        }

        return prisma.schoolGradeSubject.findMany({
            where: { schoolGradeId },
            include: { subject: true },
            orderBy: { subject: { name: 'asc' } }
        });
    }

    static async assignSubjectToGrade(
        organizationId: string,
        schoolGradeId: string,
        subjectId: string,
        weeklyPeriods?: number
    ) {
        const schoolGrade = await prisma.schoolGrade.findUnique({
            where: { id: schoolGradeId },
            include: { academicYear: true }
        });

        if (!schoolGrade || schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("Grade not found in this school");
        }

        const subject = await prisma.subject.findUnique({ where: { id: subjectId, organizationId } });
        if (!subject) throw new Error("Subject not found in this school");

        let parsedPeriods: number | undefined = undefined;
        if (weeklyPeriods !== undefined && weeklyPeriods !== null && weeklyPeriods !== ("" as any)) {
            parsedPeriods = Number(weeklyPeriods);
            if (isNaN(parsedPeriods) || parsedPeriods < 1) {
                throw new Error("Weekly periods must be a positive integer greater than or equal to 1");
            }
        }

        // Ensure subject is in SchoolSubject for this academic year
        const existingSchoolSubject = await prisma.schoolSubject.findUnique({
            where: { academicYearId_subjectId: { academicYearId: schoolGrade.academicYearId, subjectId } }
        });
        if (!existingSchoolSubject) {
            await prisma.schoolSubject.create({
                data: { academicYearId: schoolGrade.academicYearId, subjectId }
            });
        }

        return prisma.schoolGradeSubject.upsert({
            where: {
                schoolGradeId_subjectId: { schoolGradeId, subjectId }
            },
            update: {
                weeklyPeriods: parsedPeriods
            },
            create: {
                schoolGradeId,
                subjectId,
                weeklyPeriods: parsedPeriods
            },
            include: { subject: true }
        });
    }

    static async removeSubjectFromGrade(organizationId: string, schoolGradeId: string, subjectId: string) {
        const gradeSubject = await prisma.schoolGradeSubject.findUnique({
            where: { schoolGradeId_subjectId: { schoolGradeId, subjectId } },
            include: { schoolGrade: { include: { academicYear: true } } }
        });

        if (!gradeSubject || gradeSubject.schoolGrade.academicYear.organizationId !== organizationId) {
            throw new Error("Subject is not assigned to this grade");
        }

        // Check for active teaching assignments for this grade and subject
        const assignmentsCount = await prisma.teachingAssignment.count({
            where: { schoolGradeId, subjectId }
        });

        if (assignmentsCount > 0) {
            throw new Error(`Cannot remove subject: active teaching assignments (${assignmentsCount}) exist for this grade`);
        }

        return prisma.schoolGradeSubject.delete({
            where: { schoolGradeId_subjectId: { schoolGradeId, subjectId } }
        });
    }
}
