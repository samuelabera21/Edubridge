import { prisma } from "../../infrastructure/prisma/client.js";
import { getSuggestedEthiopianHolidays, SuggestedHoliday } from "./ethiopian-calendar.util.js";

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
                academicYear: true,
                periods: {
                    orderBy: { startDate: 'asc' }
                },
                events: {
                    include: {
                        academicPeriod: true,
                        createdBy: { select: { id: true, name: true, email: true } },
                        updatedBy: { select: { id: true, name: true, email: true } }
                    },
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
            where: { academicYearId },
            include: {
                academicYear: true,
                periods: true,
                events: true
            }
        });
        if (existing) {
            return existing;
        }

        return prisma.academicCalendar.create({
            data: {
                academicYearId,
                description,
                status: "DRAFT"
            },
            include: {
                academicYear: true,
                periods: true,
                events: true
            }
        });
    }

    static async publishCalendar(organizationId: string, calendarId: string, userId?: string) {
        const calendar = await prisma.academicCalendar.findUnique({
            where: { id: calendarId },
            include: { academicYear: true, periods: true }
        });
        if (!calendar || calendar.academicYear.organizationId !== organizationId) {
            throw new Error("Academic calendar not found or access denied");
        }

        if (calendar.periods.length === 0) {
            throw new Error("Cannot publish academic calendar without at least one academic period (semester/term)");
        }

        const oldValue = { status: calendar.status, publishedAt: calendar.publishedAt };
        const updated = await prisma.academicCalendar.update({
            where: { id: calendarId },
            data: {
                status: "PUBLISHED",
                publishedAt: new Date(),
                publishedById: userId || null
            },
            include: {
                academicYear: true,
                periods: { orderBy: { startDate: 'asc' } },
                events: { orderBy: { startDate: 'asc' } }
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                organizationId,
                userId: userId || null,
                action: "CALENDAR_PUBLISHED",
                resource: "ACADEMIC_CALENDAR",
                resourceId: calendarId,
                oldValue: oldValue as any,
                newValue: { status: "PUBLISHED", publishedAt: updated.publishedAt } as any
            }
        });

        return updated;
    }

    static async unpublishCalendar(organizationId: string, calendarId: string, userId?: string) {
        const calendar = await prisma.academicCalendar.findUnique({
            where: { id: calendarId },
            include: { academicYear: true }
        });
        if (!calendar || calendar.academicYear.organizationId !== organizationId) {
            throw new Error("Academic calendar not found or access denied");
        }

        const oldValue = { status: calendar.status };
        const updated = await prisma.academicCalendar.update({
            where: { id: calendarId },
            data: {
                status: "REVIEW"
            },
            include: {
                academicYear: true,
                periods: { orderBy: { startDate: 'asc' } },
                events: { orderBy: { startDate: 'asc' } }
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                organizationId,
                userId: userId || null,
                action: "CALENDAR_UNPUBLISHED",
                resource: "ACADEMIC_CALENDAR",
                resourceId: calendarId,
                oldValue: oldValue as any,
                newValue: { status: "REVIEW" } as any
            }
        });

        return updated;
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
        data: { name: string; startDate: Date | string; endDate: Date | string; type?: string }
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
        data: { name?: string; startDate?: Date | string; endDate?: Date | string; type?: string },
        userId?: string
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

        const oldValue = {
            name: period.name,
            startDate: period.startDate,
            endDate: period.endDate,
            type: period.type
        };

        const updated = await prisma.academicPeriod.update({
            where: { id: periodId },
            data: {
                ...(data.name ? { name: data.name.trim() } : {}),
                startDate: effectiveStart,
                endDate: effectiveEnd,
                ...(data.type ? { type: data.type } : {})
            }
        });

        if (period.academicCalendar.status === "PUBLISHED") {
            await prisma.auditLog.create({
                data: {
                    organizationId,
                    userId: userId || null,
                    action: "ACADEMIC_PERIOD_UPDATED",
                    resource: "ACADEMIC_PERIOD",
                    resourceId: periodId,
                    oldValue: oldValue as any,
                    newValue: {
                        name: updated.name,
                        startDate: updated.startDate,
                        endDate: updated.endDate,
                        type: updated.type
                    } as any
                }
            });
        }

        return updated;
    }

    static async deleteAcademicPeriod(organizationId: string, periodId: string, userId?: string) {
        const period = await prisma.academicPeriod.findUnique({
            where: { id: periodId },
            include: {
                academicCalendar: {
                    include: { academicYear: true }
                },
                events: true
            }
        });

        if (!period || period.academicCalendar.academicYear.organizationId !== organizationId) {
            throw new Error("Academic period not found or access denied");
        }

        // Block deletion if examinations or other events are explicitly bound to this period
        if (period.events.length > 0) {
            throw new Error(`Cannot delete period "${period.name}" because it has ${period.events.length} associated calendar event(s)/examination(s). Remove or reassign them first.`);
        }

        if (period.academicCalendar.status === "PUBLISHED") {
            await prisma.auditLog.create({
                data: {
                    organizationId,
                    userId: userId || null,
                    action: "ACADEMIC_PERIOD_DELETED",
                    resource: "ACADEMIC_PERIOD",
                    resourceId: periodId,
                    oldValue: {
                        name: period.name,
                        startDate: period.startDate,
                        endDate: period.endDate
                    } as any
                }
            });
        }

        return prisma.academicPeriod.delete({
            where: { id: periodId }
        });
    }

    // --- Calendar Events (Exams, Holidays, Breaks, Events) ---
    static async getCalendarEvents(
        organizationId: string,
        calendarId: string,
        filters?: { category?: string; type?: string; academicPeriodId?: string }
    ) {
        const calendar = await prisma.academicCalendar.findUnique({
            where: { id: calendarId },
            include: { academicYear: true }
        });
        if (!calendar || calendar.academicYear.organizationId !== organizationId) {
            throw new Error("Academic calendar not found or access denied");
        }

        return prisma.calendarEvent.findMany({
            where: {
                academicCalendarId: calendarId,
                ...(filters?.category ? { category: filters.category as any } : {}),
                ...(filters?.type ? { type: filters.type as any } : {}),
                ...(filters?.academicPeriodId ? { academicPeriodId: filters.academicPeriodId } : {})
            },
            include: {
                academicPeriod: true,
                createdBy: { select: { id: true, name: true, email: true } },
                updatedBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: { startDate: 'asc' }
        });
    }

    static async getCalendarEventById(organizationId: string, eventId: string) {
        const event = await prisma.calendarEvent.findUnique({
            where: { id: eventId },
            include: {
                academicCalendar: {
                    include: { academicYear: true }
                },
                academicPeriod: true,
                createdBy: { select: { id: true, name: true, email: true } },
                updatedBy: { select: { id: true, name: true, email: true } }
            }
        });

        if (!event || event.academicCalendar.academicYear.organizationId !== organizationId) {
            throw new Error("Calendar event not found or access denied");
        }

        return event;
    }

    static async createCalendarEvent(
        organizationId: string,
        calendarId: string,
        data: {
            title: string;
            category: "ACADEMIC_PERIOD" | "EXAMINATION" | "HOLIDAY_BREAK" | "SCHOOL_EVENT";
            type: string;
            startDate: Date | string;
            endDate: Date | string;
            isAllDay?: boolean;
            isSchoolClosed?: boolean;
            isExternal?: boolean;
            academicPeriodId?: string;
            description?: string;
            source?: "SYSTEM" | "SCHOOL" | "IMPORTED";
            isConfigurable?: boolean;
            status?: string;
            metadata?: any;
        },
        userId?: string
    ) {
        const calendar = await prisma.academicCalendar.findUnique({
            where: { id: calendarId },
            include: {
                academicYear: true,
                periods: true,
                events: true
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

        if (startDate > endDate) {
            throw new Error("Event startDate must be at or before endDate");
        }

        // Validate academic year bounds unless isExternal is set
        if (!data.isExternal) {
            const yearStart = new Date(calendar.academicYear.startDate);
            const yearEnd = new Date(calendar.academicYear.endDate);
            if (startDate < yearStart || endDate > yearEnd) {
                throw new Error(
                    `Calendar event dates (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}) must fall within academic year boundary (${yearStart.toISOString().split('T')[0]} to ${yearEnd.toISOString().split('T')[0]})`
                );
            }
        }

        // Validate examination containment in academic period
        const isExam = data.category === "EXAMINATION" || ["MIDTERM_EXAM", "FINAL_EXAM", "MAKEUP_EXAM"].includes(data.type);
        if (isExam && data.academicPeriodId) {
            const period = calendar.periods.find(p => p.id === data.academicPeriodId);
            if (!period) {
                throw new Error("Selected academic period not found in this calendar");
            }
            const pStart = new Date(period.startDate);
            const pEnd = new Date(period.endDate);
            if (startDate < pStart || endDate > pEnd) {
                throw new Error(
                    `Examination dates (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}) must fall within ${period.name} dates (${pStart.toISOString().split('T')[0]} to ${pEnd.toISOString().split('T')[0]})`
                );
            }
        }

        // Soft conflict warnings detection
        const warnings: string[] = [];
        const evStart = startDate.getTime();
        const evEnd = endDate.getTime();

        for (const ex of calendar.events) {
            const exStart = new Date(ex.startDate).getTime();
            const exEnd = new Date(ex.endDate).getTime();
            const overlaps = evStart <= exEnd && evEnd >= exStart;

            if (overlaps) {
                if (ex.isSchoolClosed && !data.isSchoolClosed) {
                    warnings.push(`This event coincides with scheduled school closure: "${ex.title}" (${new Date(ex.startDate).toISOString().slice(0, 10)})`);
                }
                if (ex.category === "EXAMINATION" && !isExam) {
                    warnings.push(`This event coincides with scheduled examination window: "${ex.title}" (${new Date(ex.startDate).toISOString().slice(0, 10)})`);
                }
                if (isExam && ex.category !== "EXAMINATION" && !ex.isSchoolClosed) {
                    warnings.push(`Notice: Scheduled event "${ex.title}" occurs during this examination window`);
                }
            }
        }

        const event = await prisma.calendarEvent.create({
            data: {
                academicCalendarId: calendarId,
                academicPeriodId: data.academicPeriodId || null,
                title: data.title.trim(),
                category: data.category,
                type: data.type as any,
                startDate,
                endDate,
                isAllDay: data.isAllDay ?? true,
                isSchoolClosed: data.isSchoolClosed ?? false,
                isExternal: data.isExternal ?? false,
                description: data.description || null,
                source: data.source || "SCHOOL",
                isConfigurable: data.isConfigurable ?? true,
                status: data.status || "CONFIRMED",
                metadata: data.metadata || undefined,
                createdById: userId || null,
                updatedById: userId || null
            },
            include: {
                academicPeriod: true,
                createdBy: { select: { id: true, name: true, email: true } },
                updatedBy: { select: { id: true, name: true, email: true } }
            }
        });

        if (calendar.status === "PUBLISHED") {
            await prisma.auditLog.create({
                data: {
                    organizationId,
                    userId: userId || null,
                    action: "CALENDAR_EVENT_CREATED",
                    resource: "CALENDAR_EVENT",
                    resourceId: event.id,
                    newValue: {
                        title: event.title,
                        category: event.category,
                        type: event.type,
                        startDate: event.startDate,
                        endDate: event.endDate
                    } as any
                }
            });
        }

        return { event, warnings };
    }

    static async updateCalendarEvent(
        organizationId: string,
        eventId: string,
        data: {
            title?: string;
            category?: "ACADEMIC_PERIOD" | "EXAMINATION" | "HOLIDAY_BREAK" | "SCHOOL_EVENT";
            type?: string;
            startDate?: Date | string;
            endDate?: Date | string;
            isAllDay?: boolean;
            isSchoolClosed?: boolean;
            isExternal?: boolean;
            academicPeriodId?: string | null;
            description?: string | null;
            status?: string;
            metadata?: any;
        },
        userId?: string
    ) {
        const event = await prisma.calendarEvent.findUnique({
            where: { id: eventId },
            include: {
                academicCalendar: {
                    include: {
                        academicYear: true,
                        periods: true,
                        events: true
                    }
                }
            }
        });

        if (!event || event.academicCalendar.academicYear.organizationId !== organizationId) {
            throw new Error("Calendar event not found or access denied");
        }

        const effectiveStart = data.startDate ? new Date(data.startDate) : new Date(event.startDate);
        const effectiveEnd = data.endDate ? new Date(data.endDate) : new Date(event.endDate);

        if (isNaN(effectiveStart.getTime()) || isNaN(effectiveEnd.getTime())) {
            throw new Error("Invalid startDate or endDate format");
        }

        if (effectiveStart > effectiveEnd) {
            throw new Error("Event startDate must be at or before endDate");
        }

        const isExternal = data.isExternal !== undefined ? data.isExternal : event.isExternal;
        if (!isExternal) {
            const yearStart = new Date(event.academicCalendar.academicYear.startDate);
            const yearEnd = new Date(event.academicCalendar.academicYear.endDate);
            if (effectiveStart < yearStart || effectiveEnd > yearEnd) {
                throw new Error("Calendar event dates must fall within academic year boundary");
            }
        }

        const targetCategory = data.category || event.category;
        const targetType = data.type || event.type;
        const targetPeriodId = data.academicPeriodId !== undefined ? data.academicPeriodId : event.academicPeriodId;
        const isExam = targetCategory === "EXAMINATION" || ["MIDTERM_EXAM", "FINAL_EXAM", "MAKEUP_EXAM"].includes(targetType);

        if (isExam && targetPeriodId) {
            const period = event.academicCalendar.periods.find(p => p.id === targetPeriodId);
            if (!period) {
                throw new Error("Selected academic period not found in this calendar");
            }
            const pStart = new Date(period.startDate);
            const pEnd = new Date(period.endDate);
            if (effectiveStart < pStart || effectiveEnd > pEnd) {
                throw new Error(`Examination dates must fall within ${period.name} dates`);
            }
        }

        // Soft warnings
        const warnings: string[] = [];
        const evStart = effectiveStart.getTime();
        const evEnd = effectiveEnd.getTime();

        for (const ex of event.academicCalendar.events) {
            if (ex.id === eventId) continue;
            const exStart = new Date(ex.startDate).getTime();
            const exEnd = new Date(ex.endDate).getTime();
            const overlaps = evStart <= exEnd && evEnd >= exStart;

            if (overlaps) {
                const closureState = data.isSchoolClosed !== undefined ? data.isSchoolClosed : event.isSchoolClosed;
                if (ex.isSchoolClosed && !closureState) {
                    warnings.push(`This event coincides with scheduled school closure: "${ex.title}"`);
                }
                if (ex.category === "EXAMINATION" && !isExam) {
                    warnings.push(`This event coincides with scheduled examination window: "${ex.title}"`);
                }
            }
        }

        const oldValue = {
            title: event.title,
            startDate: event.startDate,
            endDate: event.endDate,
            category: event.category,
            type: event.type,
            isSchoolClosed: event.isSchoolClosed
        };

        const updated = await prisma.calendarEvent.update({
            where: { id: eventId },
            data: {
                ...(data.title ? { title: data.title.trim() } : {}),
                ...(data.category ? { category: data.category } : {}),
                ...(data.type ? { type: data.type as any } : {}),
                startDate: effectiveStart,
                endDate: effectiveEnd,
                ...(data.isAllDay !== undefined ? { isAllDay: data.isAllDay } : {}),
                ...(data.isSchoolClosed !== undefined ? { isSchoolClosed: data.isSchoolClosed } : {}),
                ...(data.isExternal !== undefined ? { isExternal: data.isExternal } : {}),
                ...(data.academicPeriodId !== undefined ? { academicPeriodId: data.academicPeriodId } : {}),
                ...(data.description !== undefined ? { description: data.description } : {}),
                ...(data.status ? { status: data.status } : {}),
                ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
                updatedById: userId || null
            },
            include: {
                academicPeriod: true,
                createdBy: { select: { id: true, name: true, email: true } },
                updatedBy: { select: { id: true, name: true, email: true } }
            }
        });

        if (event.academicCalendar.status === "PUBLISHED") {
            await prisma.auditLog.create({
                data: {
                    organizationId,
                    userId: userId || null,
                    action: "CALENDAR_EVENT_UPDATED",
                    resource: "CALENDAR_EVENT",
                    resourceId: eventId,
                    oldValue: oldValue as any,
                    newValue: {
                        title: updated.title,
                        startDate: updated.startDate,
                        endDate: updated.endDate,
                        category: updated.category,
                        type: updated.type,
                        isSchoolClosed: updated.isSchoolClosed
                    } as any
                }
            });
        }

        return { event: updated, warnings };
    }

    static async deleteCalendarEvent(organizationId: string, eventId: string, userId?: string) {
        const event = await prisma.calendarEvent.findUnique({
            where: { id: eventId },
            include: {
                academicCalendar: {
                    include: { academicYear: true }
                }
            }
        });

        if (!event || event.academicCalendar.academicYear.organizationId !== organizationId) {
            throw new Error("Calendar event not found or access denied");
        }

        if (event.academicCalendar.status === "PUBLISHED") {
            await prisma.auditLog.create({
                data: {
                    organizationId,
                    userId: userId || null,
                    action: "CALENDAR_EVENT_DELETED",
                    resource: "CALENDAR_EVENT",
                    resourceId: eventId,
                    oldValue: {
                        title: event.title,
                        category: event.category,
                        type: event.type,
                        startDate: event.startDate,
                        endDate: event.endDate
                    } as any
                }
            });
        }

        return prisma.calendarEvent.delete({
            where: { id: eventId }
        });
    }

    // --- Ethiopian Holiday Suggestions & Confirmation ---
    static async getSuggestedHolidays(organizationId: string, academicYearId: string) {
        const year = await prisma.academicYear.findUnique({
            where: { id: academicYearId, organizationId },
            include: {
                academicCalendar: {
                    include: {
                        events: {
                            where: { category: "HOLIDAY_BREAK" }
                        }
                    }
                }
            }
        });
        if (!year) throw new Error("Academic Year not found");

        const suggestions = getSuggestedEthiopianHolidays(new Date(year.startDate), new Date(year.endDate));
        const existingHolidayEvents = year.academicCalendar?.events || [];

        return suggestions.map(sug => {
            const matched = existingHolidayEvents.find(
                ex => ex.title.toLowerCase().includes(sug.title.toLowerCase().slice(0, 8)) ||
                      (new Date(ex.startDate).toISOString().slice(0, 10) === sug.suggestedStartDate)
            );

            return {
                ...sug,
                isAdded: !!matched,
                existingEventId: matched ? matched.id : null
            };
        });
    }

    static async confirmSuggestedHoliday(
        organizationId: string,
        calendarId: string,
        data: {
            title: string;
            startDate?: string | Date;
            endDate?: string | Date;
            suggestedStartDate?: string;
            suggestedEndDate?: string;
            type?: string;
            isSchoolClosed?: boolean;
            description?: string;
        },
        userId?: string
    ) {
        const start = data.startDate || data.suggestedStartDate;
        const end = data.endDate || data.suggestedEndDate;
        if (!start || !end) {
            throw new Error("Start date and end date are required for holiday confirmation");
        }

        const result = await this.createCalendarEvent(
            organizationId,
            calendarId,
            {
                title: data.title,
                category: "HOLIDAY_BREAK",
                type: data.type || "PUBLIC_HOLIDAY",
                startDate: new Date(start),
                endDate: new Date(end),
                isAllDay: true,
                isSchoolClosed: data.isSchoolClosed ?? true,
                isExternal: false,
                source: "IMPORTED",
                description: data.description || "Suggested Ethiopian holiday confirmed by administrator."
            },
            userId
        );
        return result.event;
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
