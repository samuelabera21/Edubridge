import { prisma } from "../../infrastructure/prisma/client.js";

export class TimetableService {
    /**
     * Create a class period definition
     */
    static async createClassPeriod(organizationId: string, data: { name: string; startTime: string; endTime: string; isBreak?: boolean }) {
        const period = await prisma.classPeriod.create({
            data: {
                organizationId,
                name: data.name,
                startTime: data.startTime,
                endTime: data.endTime,
                isBreak: data.isBreak ?? false,
            }
        });
        return period;
    }

    /**
     * Get all class periods for the school
     */
    static async getClassPeriods(organizationId: string) {
        return prisma.classPeriod.findMany({
            where: { organizationId },
            orderBy: { startTime: "asc" }
        });
    }

    /**
     * Auto-generates standard instructional periods (P1 to P7)
     * when no periods are yet configured for the school.
     */
    static async generateDefaultPeriods(organizationId: string) {
        const existing = await prisma.classPeriod.findMany({ where: { organizationId } });
        if (existing.length > 0) {
            return existing.sort((a, b) => {
                const numA = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
                const numB = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
                return numA - numB;
            });
        }

        const defaultPeriods = [
            { name: "P1", startTime: "1", endTime: "1", isBreak: false },
            { name: "P2", startTime: "2", endTime: "2", isBreak: false },
            { name: "P3", startTime: "3", endTime: "3", isBreak: false },
            { name: "P4", startTime: "4", endTime: "4", isBreak: false },
            { name: "P5", startTime: "5", endTime: "5", isBreak: false },
            { name: "P6", startTime: "6", endTime: "6", isBreak: false },
            { name: "P7", startTime: "7", endTime: "7", isBreak: false }
        ];

        for (const p of defaultPeriods) {
            await prisma.classPeriod.create({
                data: {
                    organizationId,
                    name: p.name,
                    startTime: p.startTime,
                    endTime: p.endTime,
                    isBreak: p.isBreak
                }
            });
        }

        const created = await prisma.classPeriod.findMany({ where: { organizationId } });
        return created.sort((a, b) => {
            const numA = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
            const numB = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
            return numA - numB;
        });
    }

    /**
     * Section-Oriented Timetable Workspace
     * Aggregates:
     * - Academic year status & lock state
     * - Section info and student enrollment count (from Step 5)
     * - Section's TeachingAssignments (Step 3) with Required vs Scheduled vs Remaining
     * - Section's current weekly timetable grid
     * - Configured ClassPeriods and operating days
     * - Academic calendar closed days / events
     * - Timetable publication state
     */
    static async getSectionWorkspace(organizationId: string, query: {
        academicYearId?: string;
        schoolGradeId?: string;
        sectionId?: string;
    }) {
        // 1. Resolve Academic Year
        let academicYear;
        if (query.academicYearId) {
            academicYear = await prisma.academicYear.findFirst({
                where: { id: query.academicYearId, organizationId }
            });
        }
        if (!academicYear) {
            academicYear = await prisma.academicYear.findFirst({
                where: { organizationId, status: "ACTIVE" }
            }) || await prisma.academicYear.findFirst({
                where: { organizationId },
                orderBy: { startDate: "desc" }
            });
        }

        if (!academicYear) {
            return {
                academicYear: null,
                isYearLocked: false,
                schoolGrades: [],
                selectedGrade: null,
                selectedSection: null,
                teachingAssignments: [],
                sectionTimetable: [],
                periods: [],
                operatingDays: [1, 2, 3, 4, 5],
                coverage: { totalRequired: 0, totalScheduled: 0, totalRemaining: 0, coveragePercentage: 0 },
                status: "DRAFT",
                closedEvents: []
            };
        }

        const isYearLocked = academicYear.status === "COMPLETED" || academicYear.status === "ARCHIVED";

        // 2. Fetch School Grades for this Academic Year
        const schoolGrades = await prisma.schoolGrade.findMany({
            where: { academicYearId: academicYear.id },
            include: {
                grade: true,
                sections: {
                    where: { status: "ACTIVE" },
                    orderBy: { name: "asc" },
                    include: {
                        homeroomTeacher: true,
                        _count: {
                            select: {
                                studentEnrollments: { where: { status: "ENROLLED" } }
                            }
                        }
                    }
                }
            },
            orderBy: { grade: { level: "asc" } }
        });

        // 3. Resolve Selected Grade and Section
        let selectedGrade = schoolGrades.find(g => g.id === query.schoolGradeId);
        if (!selectedGrade && schoolGrades.length > 0) {
            selectedGrade = schoolGrades[0];
        }

        let selectedSection = null;
        if (selectedGrade && selectedGrade.sections.length > 0) {
            if (query.sectionId) {
                selectedSection = selectedGrade.sections.find(s => s.id === query.sectionId) || selectedGrade.sections[0];
            } else {
                selectedSection = selectedGrade.sections[0];
            }
        }

        // 4. Fetch Configured Periods & Operating Days
        const config = await prisma.timetableConfig.findUnique({
            where: {
                organizationId_academicYearId: {
                    organizationId,
                    academicYearId: academicYear.id
                }
            }
        });
        const dayNameToNumber: Record<string, number> = {
            MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
            MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7
        };
        const rawDays: any[] = Array.isArray(config?.operatingDays) ? config.operatingDays : [1, 2, 3, 4, 5];
        const operatingDays = rawDays.map((d: any) => {
            if (typeof d === "number") return d;
            const upper = String(d).toUpperCase().trim();
            if (dayNameToNumber[upper]) return dayNameToNumber[upper];
            const num = parseInt(upper, 10);
            return isNaN(num) ? null : num;
        }).filter((d: any): d is number => d !== null);

        const activeOperatingDays = operatingDays.length > 0 ? operatingDays : [1, 2, 3, 4, 5];

        let periods = await prisma.classPeriod.findMany({
            where: { organizationId }
        });

        // If no class periods exist yet for this school, automatically ensure standard P1 to P7 exist
        if (periods.length === 0) {
            periods = await TimetableService.generateDefaultPeriods(organizationId);
        } else {
            periods.sort((a, b) => {
                const numA = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
                const numB = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
                return numA - numB;
            });
        }

        // 5. Academic Calendar Events (Closed Days / Holidays)
        const calendar = await prisma.academicCalendar.findUnique({
            where: { academicYearId: academicYear.id },
            include: {
                events: {
                    where: { isSchoolClosed: true },
                    orderBy: { startDate: "asc" }
                }
            }
        });
        const closedEvents = calendar?.events || [];

        // 6. Publication State
        const publishAudit = await prisma.auditLog.findFirst({
            where: {
                organizationId,
                resource: "Timetable",
                action: { in: ["TIMETABLE_PUBLISHED", "TIMETABLE_UNPUBLISHED"] }
            },
            orderBy: { createdAt: "desc" }
        });
        const status = (publishAudit && publishAudit.action === "TIMETABLE_PUBLISHED") ? "PUBLISHED" : "DRAFT";

        // If no section is selected or available
        if (!selectedSection) {
            return {
                academicYear,
                isYearLocked,
                schoolGrades,
                selectedGrade,
                selectedSection: null,
                teachingAssignments: [],
                sectionTimetable: [],
                periods,
                operatingDays: activeOperatingDays,
                coverage: { totalRequired: 0, totalScheduled: 0, totalRemaining: 0, coveragePercentage: 0 },
                status,
                closedEvents
            };
        }

        // 7. Fetch Section's Teaching Assignments (Step 3 Source of Truth)
        const assignments = await prisma.teachingAssignment.findMany({
            where: {
                academicYearId: academicYear.id,
                sectionId: selectedSection.id,
                teacher: { organizationId }
            },
            include: {
                teacher: true,
                subject: true,
                schoolGrade: { include: { grade: true } }
            },
            orderBy: { subject: { name: "asc" } }
        });

        // 8. Fetch Current Scheduled Entries for this Section
        const sectionTimetable = await prisma.timetable.findMany({
            where: {
                organizationId,
                academicYearId: academicYear.id,
                teachingAssignment: { sectionId: selectedSection.id }
            },
            include: {
                classPeriod: true,
                room: true,
                teachingAssignment: {
                    include: {
                        teacher: true,
                        subject: true,
                        schoolGrade: { include: { grade: true } }
                    }
                }
            },
            orderBy: [
                { dayOfWeek: "asc" },
                { classPeriod: { startTime: "asc" } }
            ]
        });

        // Map assignment scheduled counts
        const scheduledCountsMap: { [assignmentId: string]: number } = {};
        sectionTimetable.forEach(item => {
            scheduledCountsMap[item.teachingAssignmentId] = (scheduledCountsMap[item.teachingAssignmentId] || 0) + 1;
        });

        let totalRequired = 0;
        let totalScheduled = 0;

        const teachingAssignmentsWithCoverage = assignments.map(a => {
            const required = a.periodsPerWeek || 0;
            const scheduled = scheduledCountsMap[a.id] || 0;
            const remaining = Math.max(0, required - scheduled);
            totalRequired += required;
            totalScheduled += scheduled;

            return {
                id: a.id,
                teacherId: a.teacherId,
                teacherName: `${a.teacher.firstName} ${a.teacher.fatherName || a.teacher.lastName || ""}`.trim(),
                teacher: a.teacher,
                subjectId: a.subjectId,
                subjectName: a.subject.name,
                subjectCode: a.subject.code,
                subject: a.subject,
                sectionId: a.sectionId,
                status: a.status,
                requiredPeriods: required,
                scheduledPeriods: scheduled,
                remainingPeriods: remaining,
                isComplete: scheduled >= required && required > 0,
                isOverScheduled: scheduled > required
            };
        });

        const totalRemaining = Math.max(0, totalRequired - totalScheduled);
        const coveragePercentage = totalRequired > 0 
            ? Math.min(100, Math.round((totalScheduled / totalRequired) * 100)) 
            : 100;

        return {
            academicYear,
            isYearLocked,
            schoolGrades,
            selectedGrade,
            selectedSection: {
                id: selectedSection.id,
                name: selectedSection.name,
                capacity: selectedSection.capacity,
                status: selectedSection.status,
                enrolledStudentsCount: (selectedSection as any)._count?.studentEnrollments || 0,
                homeroomTeacher: selectedSection.homeroomTeacher
            },
            teachingAssignments: teachingAssignmentsWithCoverage,
            sectionTimetable,
            periods,
            operatingDays: activeOperatingDays,
            coverage: {
                totalRequired,
                totalScheduled,
                totalRemaining,
                coveragePercentage
            },
            status,
            closedEvents
        };
    }

    /**
     * Atomically assigns a teaching assignment to a specific section timetable cell
     * Protected by:
     * - School scope & academic year lifecycle
     * - Section conflict check
     * - Teacher conflict check across all sections
     * - Break period invariant
     * - Operating day invariant
     * - Weekly period requirement limit
     * - Concurrency row-level locks on teacher and section
     * - Audit logging
     */
    static async assignTimetable(organizationId: string, userId: string | null, data: {
        academicYearId: string;
        teachingAssignmentId: string;
        classPeriodId: string;
        dayOfWeek: number;
        roomId?: string;
    }) {
        return prisma.$transaction(async (tx) => {
            // 1. Validate Academic Year
            const year = await tx.academicYear.findFirst({
                where: { id: data.academicYearId, organizationId }
            });
            if (!year) throw new Error("Academic year not found in this school");
            if (year.status === "COMPLETED" || year.status === "ARCHIVED") {
                const err: any = new Error(`Academic year ${year.name} is ${year.status.toLowerCase()} and cannot be modified`);
                err.statusCode = 403;
                throw err;
            }

            // 2. Validate Teaching Assignment
            const assignment = await tx.teachingAssignment.findFirst({
                where: {
                    id: data.teachingAssignmentId,
                    academicYearId: data.academicYearId,
                    teacher: { organizationId }
                },
                include: {
                    teacher: true,
                    subject: true,
                    section: true,
                    schoolGrade: { include: { grade: true } }
                }
            });
            if (!assignment) {
                throw new Error("Teaching assignment not found or does not belong to this school and academic year");
            }
            if (!assignment.sectionId) {
                throw new Error("Teaching assignment must be allocated to a specific section before scheduling");
            }

            // 3. Validate Class Period
            const period = await tx.classPeriod.findFirst({
                where: { id: data.classPeriodId, organizationId }
            });
            if (!period) throw new Error("Class period not found in this school");
            if (period.isBreak) {
                throw new Error(`Cannot assign lessons during break period (${period.name})`);
            }

            // 4. Validate Operating Day
            const config = await tx.timetableConfig.findUnique({
                where: { organizationId_academicYearId: { organizationId, academicYearId: data.academicYearId } }
            });
            const rawOperatingDays = (config?.operatingDays as any[]) || [1, 2, 3, 4, 5];
            const operatingDays: number[] = rawOperatingDays.map(d => {
                if (typeof d === "number") return d;
                const upper = String(d).toUpperCase().trim();
                const dayMap: { [key: string]: number } = {
                    "MONDAY": 1, "TUESDAY": 2, "WEDNESDAY": 3, "THURSDAY": 4, "FRIDAY": 5, "SATURDAY": 6, "SUNDAY": 7,
                    "MON": 1, "TUE": 2, "WED": 3, "THU": 4, "FRI": 5, "SAT": 6, "SUN": 7
                };
                if (dayMap[upper] !== undefined) return dayMap[upper];
                const num = parseInt(d, 10);
                return isNaN(num) ? null : num;
            }).filter((d: any): d is number => d !== null);
            const activeOperatingDays = operatingDays.length > 0 ? operatingDays : [1, 2, 3, 4, 5];

            if (!activeOperatingDays.includes(data.dayOfWeek)) {
                throw new Error(`Day ${data.dayOfWeek} is not an active operating day for this school's timetable`);
            }

            // 4b. Academic Calendar Check: Closed days cannot have schedules
            const calendar = await tx.academicCalendar.findUnique({
                where: { academicYearId: data.academicYearId },
                include: {
                    events: {
                        where: { isSchoolClosed: true }
                    }
                }
            });
            if (calendar?.events?.length) {
                for (const ev of calendar.events) {
                    const meta = ev.metadata as any;
                    const closedDaysOfWeek: number[] = meta?.closedDaysOfWeek || [];
                    if (closedDaysOfWeek.includes(data.dayOfWeek) || meta?.dayOfWeek === data.dayOfWeek) {
                        throw new Error(`Cannot schedule on day ${data.dayOfWeek}: day is marked as closed in Academic Calendar ("${ev.title}").`);
                    }
                }
            }

            // 5. Concurrency row-level locks on teacher and section in PostgreSQL
            await tx.$queryRaw`SELECT id FROM "teacher" WHERE id = ${assignment.teacherId} FOR UPDATE`;
            await tx.$queryRaw`SELECT id FROM "section" WHERE id = ${assignment.sectionId} FOR UPDATE`;

            // 6. Section Conflict (Section cannot have two classes simultaneously)
            const sectionConflict = await tx.timetable.findFirst({
                where: {
                    organizationId,
                    academicYearId: data.academicYearId,
                    dayOfWeek: data.dayOfWeek,
                    classPeriodId: data.classPeriodId,
                    teachingAssignment: { sectionId: assignment.sectionId }
                },
                include: {
                    teachingAssignment: { include: { subject: true, teacher: true } }
                }
            });
            if (sectionConflict) {
                throw new Error(
                    `Section conflict: Section ${assignment.section?.name || ""} already has ${sectionConflict.teachingAssignment.subject.name} scheduled in this period.`
                );
            }

            // 7. Teacher Conflict (Teacher cannot be in two sections simultaneously)
            const teacherConflict = await tx.timetable.findFirst({
                where: {
                    organizationId,
                    academicYearId: data.academicYearId,
                    dayOfWeek: data.dayOfWeek,
                    classPeriodId: data.classPeriodId,
                    teachingAssignment: { teacherId: assignment.teacherId }
                },
                include: {
                    teachingAssignment: { include: { subject: true, section: true, schoolGrade: { include: { grade: true } } } }
                }
            });
            if (teacherConflict) {
                const gradeName = teacherConflict.teachingAssignment.schoolGrade?.grade?.name || "Grade";
                const secName = teacherConflict.teachingAssignment.section?.name ? `Section ${teacherConflict.teachingAssignment.section.name}` : "another section";
                throw new Error(
                    `Teacher conflict: Teacher ${assignment.teacher.firstName} ${assignment.teacher.lastName} is already scheduled for ${teacherConflict.teachingAssignment.subject.name} in ${gradeName} ${secName} during this period.`
                );
            }

            // 8. Teacher Availability Block Check
            if (assignment.teacher.availability) {
                const availability = assignment.teacher.availability as any;
                if (availability.blockedSlots && Array.isArray(availability.blockedSlots)) {
                    const isBlocked = availability.blockedSlots.some((slot: any) =>
                        slot.dayOfWeek === data.dayOfWeek && slot.classPeriodId === data.classPeriodId
                    );
                    if (isBlocked) {
                        throw new Error(`Teacher availability conflict: Teacher ${assignment.teacher.firstName} ${assignment.teacher.lastName} is not available during this period.`);
                    }
                }
            }

            // 9. Weekly Period Limit (scheduledCount >= periodsPerWeek)
            if (assignment.periodsPerWeek > 0) {
                const scheduledCount = await tx.timetable.count({
                    where: {
                        teachingAssignmentId: data.teachingAssignmentId,
                        academicYearId: data.academicYearId
                    }
                });
                if (scheduledCount >= assignment.periodsPerWeek) {
                    throw new Error(
                        `Weekly requirement exceeded: ${assignment.subject.name} requires ${assignment.periodsPerWeek} periods per week, and all ${scheduledCount} periods are already scheduled.`
                    );
                }
            }

            // 10. Optional Room collision check (if room is provided for specialized facility)
            if (data.roomId) {
                const roomConflict = await tx.timetable.findFirst({
                    where: {
                        organizationId,
                        academicYearId: data.academicYearId,
                        dayOfWeek: data.dayOfWeek,
                        classPeriodId: data.classPeriodId,
                        roomId: data.roomId
                    },
                    include: { room: true }
                });
                if (roomConflict) {
                    throw new Error(`Room conflict: Room ${roomConflict.room?.name || ""} is already booked for this period.`);
                }
            }

            // 11. Create Timetable Entry
            const timetable = await tx.timetable.create({
                data: {
                    organizationId,
                    academicYearId: data.academicYearId,
                    teachingAssignmentId: data.teachingAssignmentId,
                    classPeriodId: data.classPeriodId,
                    dayOfWeek: data.dayOfWeek,
                    roomId: data.roomId || null
                },
                include: {
                    classPeriod: true,
                    room: true,
                    teachingAssignment: {
                        include: {
                            teacher: true,
                            subject: true,
                            section: true,
                            schoolGrade: { include: { grade: true } }
                        }
                    }
                }
            });

            // 12. Audit Logging
            await tx.auditLog.create({
                data: {
                    organizationId,
                    userId: userId || null,
                    action: "TIMETABLE_SLOT_ASSIGNED",
                    resource: "Timetable",
                    resourceId: timetable.id,
                    newValue: {
                        id: timetable.id,
                        dayOfWeek: data.dayOfWeek,
                        classPeriodId: data.classPeriodId,
                        periodName: period.name,
                        teachingAssignmentId: data.teachingAssignmentId,
                        subject: assignment.subject.name,
                        teacher: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`,
                        section: assignment.section?.name,
                        grade: assignment.schoolGrade?.grade?.name
                    }
                }
            });

            return timetable;
        });
    }

    /**
     * Delete a timetable entry
     */
    static async deleteTimetable(organizationId: string, userId: string | null, id: string) {
        return prisma.$transaction(async (tx) => {
            const entry = await tx.timetable.findFirst({
                where: { id, organizationId },
                include: {
                    academicYear: true,
                    classPeriod: true,
                    teachingAssignment: {
                        include: { teacher: true, subject: true, section: true }
                    }
                }
            });
            if (!entry) throw new Error("Timetable entry not found");

            if (entry.academicYear.status === "COMPLETED" || entry.academicYear.status === "ARCHIVED") {
                const err: any = new Error(`Cannot delete lessons from a ${entry.academicYear.status.toLowerCase()} academic year`);
                err.statusCode = 403;
                throw err;
            }

            await tx.timetable.delete({
                where: { id }
            });

            await tx.auditLog.create({
                data: {
                    organizationId,
                    userId: userId || null,
                    action: "TIMETABLE_SLOT_REMOVED",
                    resource: "Timetable",
                    resourceId: id,
                    oldValue: {
                        id,
                        dayOfWeek: entry.dayOfWeek,
                        periodName: entry.classPeriod.name,
                        subject: entry.teachingAssignment.subject.name,
                        teacher: `${entry.teachingAssignment.teacher.firstName} ${entry.teachingAssignment.teacher.lastName}`,
                        section: entry.teachingAssignment.section?.name
                    }
                }
            });

            return { success: true };
        });
    }

    /**
     * In-place slot reassignment (for mid-year changes or switching teacher/subject in an existing slot)
     */
    static async reassignSlot(organizationId: string, userId: string | null, data: {
        timetableId: string;
        newTeachingAssignmentId: string;
        reason?: string;
    }) {
        return prisma.$transaction(async (tx) => {
            const currentEntry = await tx.timetable.findFirst({
                where: { id: data.timetableId, organizationId },
                include: {
                    academicYear: true,
                    classPeriod: true,
                    teachingAssignment: {
                        include: { teacher: true, subject: true, section: true }
                    }
                }
            });
            if (!currentEntry) throw new Error("Timetable entry not found");

            if (currentEntry.academicYear.status === "COMPLETED" || currentEntry.academicYear.status === "ARCHIVED") {
                const err: any = new Error("Cannot reassign lessons in completed or archived academic year");
                err.statusCode = 403;
                throw err;
            }

            const newAssignment = await tx.teachingAssignment.findFirst({
                where: {
                    id: data.newTeachingAssignmentId,
                    academicYearId: currentEntry.academicYearId,
                    teacher: { organizationId }
                },
                include: { teacher: true, subject: true, section: true }
            });
            if (!newAssignment) throw new Error("New teaching assignment not found");

            // Must belong to the same section
            if (newAssignment.sectionId !== currentEntry.teachingAssignment.sectionId) {
                throw new Error("Reassignment must be for the same section");
            }

            // Lock teacher
            await tx.$queryRaw`SELECT id FROM "teacher" WHERE id = ${newAssignment.teacherId} FOR UPDATE`;

            // Check if the new teacher has a conflict at this slot
            const teacherConflict = await tx.timetable.findFirst({
                where: {
                    id: { not: data.timetableId },
                    organizationId,
                    academicYearId: currentEntry.academicYearId,
                    dayOfWeek: currentEntry.dayOfWeek,
                    classPeriodId: currentEntry.classPeriodId,
                    teachingAssignment: { teacherId: newAssignment.teacherId }
                },
                include: {
                    teachingAssignment: { include: { subject: true, section: true } }
                }
            });
            if (teacherConflict) {
                throw new Error(
                    `Teacher conflict: Target teacher ${newAssignment.teacher.firstName} is already teaching ${teacherConflict.teachingAssignment.subject.name} in this period.`
                );
            }

            // Check weekly period limits for new assignment
            const newScheduledCount = await tx.timetable.count({
                where: {
                    teachingAssignmentId: data.newTeachingAssignmentId,
                    academicYearId: currentEntry.academicYearId
                }
            });
            if (newScheduledCount >= newAssignment.periodsPerWeek) {
                throw new Error(
                    `Weekly requirement exceeded: ${newAssignment.subject.name} already has ${newScheduledCount} periods scheduled.`
                );
            }

            const updated = await tx.timetable.update({
                where: { id: data.timetableId },
                data: {
                    teachingAssignmentId: data.newTeachingAssignmentId
                },
                include: {
                    classPeriod: true,
                    teachingAssignment: {
                        include: { teacher: true, subject: true, section: true }
                    }
                }
            });

            await tx.auditLog.create({
                data: {
                    organizationId,
                    userId: userId || null,
                    action: "TIMETABLE_SLOT_REASSIGNED",
                    resource: "Timetable",
                    resourceId: data.timetableId,
                    oldValue: {
                        teachingAssignmentId: currentEntry.teachingAssignmentId,
                        teacher: `${currentEntry.teachingAssignment.teacher.firstName} ${currentEntry.teachingAssignment.teacher.lastName}`,
                        subject: currentEntry.teachingAssignment.subject.name
                    },
                    newValue: {
                        teachingAssignmentId: newAssignment.id,
                        teacher: `${newAssignment.teacher.firstName} ${newAssignment.teacher.lastName}`,
                        subject: newAssignment.subject.name,
                        reason: data.reason || "Administrative reassignment"
                    }
                }
            });

            return updated;
        });
    }

    /**
     * Publish the timetable for the academic year
     */
    static async publishTimetable(organizationId: string, userId: string | null, academicYearId: string) {
        const year = await prisma.academicYear.findFirst({
            where: { id: academicYearId, organizationId }
        });
        if (!year) throw new Error("Academic year not found");
        if (year.status === "COMPLETED" || year.status === "ARCHIVED") {
            const err: any = new Error("Cannot publish timetable for completed or archived academic year");
            err.statusCode = 403;
            throw err;
        }

        const scheduledCount = await prisma.timetable.count({
            where: { organizationId, academicYearId }
        });
        if (scheduledCount === 0) {
            throw new Error("Cannot publish an empty timetable with no scheduled lessons");
        }

        await prisma.auditLog.create({
            data: {
                organizationId,
                userId: userId || null,
                action: "TIMETABLE_PUBLISHED",
                resource: "Timetable",
                resourceId: academicYearId,
                newValue: {
                    academicYearId,
                    scheduledCount,
                    publishedAt: new Date().toISOString()
                }
            }
        });

        return {
            success: true,
            status: "PUBLISHED",
            publishedAt: new Date().toISOString(),
            publishedById: userId
        };
    }

    /**
     * Unpublish timetable back to DRAFT
     */
    static async unpublishTimetable(organizationId: string, userId: string | null, academicYearId: string) {
        await prisma.auditLog.create({
            data: {
                organizationId,
                userId: userId || null,
                action: "TIMETABLE_UNPUBLISHED",
                resource: "Timetable",
                resourceId: academicYearId,
                newValue: {
                    academicYearId,
                    unpublishedAt: new Date().toISOString()
                }
            }
        });

        return {
            success: true,
            status: "DRAFT"
        };
    }

    /**
     * Get authorized personal timetable for authenticated student or teacher
     */
    static async getMyTimetable(organizationId: string, userId: string, roleName?: string) {
        // 1. Try finding Student
        const student = await prisma.student.findFirst({
            where: { userId }
        });

        if (student) {
            // Find active enrollment in active academic year
            const enrollment = await prisma.studentEnrollment.findFirst({
                where: {
                    studentId: student.id,
                    organizationId,
                    status: "ENROLLED",
                    academicYear: { status: "ACTIVE" }
                },
                include: {
                    section: true,
                    academicYear: true,
                    schoolGrade: { include: { grade: true } }
                }
            }) || await prisma.studentEnrollment.findFirst({
                where: {
                    studentId: student.id,
                    organizationId,
                    status: "ENROLLED"
                },
                orderBy: { createdAt: "desc" },
                include: {
                    section: true,
                    academicYear: true,
                    schoolGrade: { include: { grade: true } }
                }
            });

            if (!enrollment || !enrollment.sectionId) {
                return {
                    actorType: "STUDENT",
                    section: null,
                    timetable: [],
                    message: "No active classroom section assignment found."
                };
            }

            const timetable = await prisma.timetable.findMany({
                where: {
                    organizationId,
                    academicYearId: enrollment.academicYearId,
                    teachingAssignment: { sectionId: enrollment.sectionId }
                },
                include: {
                    classPeriod: true,
                    room: true,
                    teachingAssignment: {
                        include: {
                            teacher: true,
                            subject: true,
                            schoolGrade: { include: { grade: true } }
                        }
                    }
                },
                orderBy: [
                    { dayOfWeek: "asc" },
                    { classPeriod: { startTime: "asc" } }
                ]
            });

            return {
                actorType: "STUDENT",
                studentName: `${student.firstName} ${student.fatherName || ""}`.trim(),
                gradeName: enrollment.schoolGrade?.grade?.name || "Grade",
                section: enrollment.section,
                academicYear: enrollment.academicYear,
                timetable
            };
        }

        // 2. Try finding Teacher
        const teacher = await prisma.teacher.findFirst({
            where: { userId, organizationId }
        });

        if (teacher) {
            const activeYear = await prisma.academicYear.findFirst({
                where: { organizationId, status: "ACTIVE" }
            });

            const timetable = await prisma.timetable.findMany({
                where: {
                    organizationId,
                    ...(activeYear ? { academicYearId: activeYear.id } : {}),
                    teachingAssignment: { teacherId: teacher.id }
                },
                include: {
                    classPeriod: true,
                    room: true,
                    academicYear: true,
                    teachingAssignment: {
                        include: {
                            subject: true,
                            section: true,
                            schoolGrade: { include: { grade: true } }
                        }
                    }
                },
                orderBy: [
                    { dayOfWeek: "asc" },
                    { classPeriod: { startTime: "asc" } }
                ]
            });

            return {
                actorType: "TEACHER",
                teacherName: `${teacher.firstName} ${teacher.lastName}`,
                academicYear: activeYear,
                timetable
            };
        }

        return {
            actorType: "UNKNOWN",
            timetable: [],
            message: "User profile not linked to an active student or teacher record."
        };
    }

    /**
     * Backward-compatible section timetable endpoint
     */
    static async getTimetableForSection(organizationId: string, sectionId: string, academicYearId?: string) {
        return prisma.timetable.findMany({
            where: {
                organizationId,
                ...(academicYearId ? { academicYearId } : {}),
                teachingAssignment: { sectionId }
            },
            include: {
                classPeriod: true,
                academicYear: true,
                room: true,
                teachingAssignment: {
                    include: { teacher: true, subject: true }
                }
            },
            orderBy: [
                { dayOfWeek: "asc" },
                { classPeriod: { startTime: "asc" } }
            ]
        });
    }

    /**
     * Backward-compatible teacher timetable endpoint
     */
    static async getTimetableForTeacher(organizationId: string, teacherId: string) {
        return prisma.timetable.findMany({
            where: {
                organizationId,
                teachingAssignment: { teacherId }
            },
            include: {
                classPeriod: true,
                academicYear: true,
                teachingAssignment: {
                    include: { subject: true, section: true, schoolGrade: { include: { grade: true } } }
                }
            },
            orderBy: [
                { dayOfWeek: "asc" },
                { classPeriod: { startTime: "asc" } }
            ]
        });
    }

    /**
     * Backward-compatible room timetable endpoint
     */
    static async getTimetableForRoom(organizationId: string, roomId: string) {
        return prisma.timetable.findMany({
            where: {
                organizationId,
                roomId
            },
            include: {
                classPeriod: true,
                teachingAssignment: {
                    include: { subject: true, teacher: true, section: true, schoolGrade: { include: { grade: true } } }
                }
            },
            orderBy: [
                { dayOfWeek: "asc" },
                { classPeriod: { startTime: "asc" } }
            ]
        });
    }

    /**
     * Update teacher availability slots
     */
    static async updateTeacherAvailability(organizationId: string, teacherId: string, availability: any) {
        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId }
        });
        if (!teacher) throw new Error("Teacher not found");

        const updated = await prisma.teacher.update({
            where: { id: teacherId },
            data: { availability }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TEACHER_AVAILABILITY_UPDATED",
                resource: "Teacher",
                resourceId: teacherId,
                newValue: JSON.parse(JSON.stringify(availability))
            }
        });

        return updated;
    }
}
