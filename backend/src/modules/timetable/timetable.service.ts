import { prisma } from "../../infrastructure/prisma/client.js";

export class TimetableService {
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

    static async getClassPeriods(organizationId: string) {
        return prisma.classPeriod.findMany({
            where: { organizationId },
            orderBy: { startTime: "asc" }
        });
    }

    static async assignTimetable(organizationId: string, data: { academicYearId: string; teachingAssignmentId: string; classPeriodId: string; dayOfWeek: number; roomId?: string }) {
        // Validate assignment exists in this school
        const assignment = await prisma.teachingAssignment.findFirst({
            where: { id: data.teachingAssignmentId, teacher: { organizationId } },
            include: { section: true, schoolGrade: true }
        });
        if (!assignment) throw new Error("Teaching assignment not found");

        // Validate class period exists in this school
        const period = await prisma.classPeriod.findFirst({
            where: { id: data.classPeriodId, organizationId }
        });
        if (!period) throw new Error("Class period not found");

        // Constraint: Cannot assign classes to Break periods
        if (period.isBreak) {
            throw new Error("Cannot assign lessons during break periods");
        }

        // Conflict Detection 1: Teacher Conflict (Double-Booking)
        const teacherConflict = await prisma.timetable.findFirst({
            where: {
                organizationId,
                academicYearId: data.academicYearId,
                dayOfWeek: data.dayOfWeek,
                classPeriodId: data.classPeriodId,
                teachingAssignment: { teacherId: assignment.teacherId }
            },
            include: { teachingAssignment: { include: { subject: true, section: true } } }
        });

        if (teacherConflict) {
            throw new Error(`Teacher conflict: The teacher is already scheduled for ${teacherConflict.teachingAssignment.subject.name} during this period on this day.`);
        }

        // Conflict Detection 2: Teacher Availability
        const teacher = await prisma.teacher.findFirst({
            where: { id: assignment.teacherId, organizationId }
        });
        if (teacher && teacher.availability) {
            const availability = teacher.availability as any;
            if (availability.blockedSlots && Array.isArray(availability.blockedSlots)) {
                const isBlocked = availability.blockedSlots.some((slot: any) =>
                    slot.dayOfWeek === data.dayOfWeek && slot.classPeriodId === data.classPeriodId
                );
                if (isBlocked) {
                    throw new Error("Teacher availability conflict: The teacher is not available during this period on this day.");
                }
            }
        }

        // Conflict Detection 3: Section Conflict (Double-Booking)
        if (assignment.sectionId) {
            const sectionConflict = await prisma.timetable.findFirst({
                where: {
                    organizationId,
                    academicYearId: data.academicYearId,
                    dayOfWeek: data.dayOfWeek,
                    classPeriodId: data.classPeriodId,
                    teachingAssignment: { sectionId: assignment.sectionId }
                }
            });

            if (sectionConflict) {
                throw new Error("Section conflict: This section already has a class scheduled during this period on this day.");
            }
        }

        // Conflict Detection 4: Room Conflict (Double-Booking)
        if (data.roomId) {
            const roomConflict = await prisma.timetable.findFirst({
                where: {
                    organizationId,
                    academicYearId: data.academicYearId,
                    dayOfWeek: data.dayOfWeek,
                    classPeriodId: data.classPeriodId,
                    roomId: data.roomId
                }
            });

            if (roomConflict) {
                throw new Error("Room conflict: Room is already booked for this period on this day.");
            }

            // Fetch room details
            const room = await prisma.schoolResource.findFirst({
                where: { id: data.roomId, organizationId }
            });

            // Room Availability check
            if (room && room.availability) {
                const availability = room.availability as any;
                if (availability.blockedSlots && Array.isArray(availability.blockedSlots)) {
                    const isBlocked = availability.blockedSlots.some((slot: any) => 
                        slot.dayOfWeek === data.dayOfWeek && slot.classPeriodId === data.classPeriodId
                    );
                    if (isBlocked) {
                        throw new Error(`Room availability conflict: Room ${room.name} is not available during this period on this day.`);
                    }
                }
            }

            // Room Capacity check
            if (room && room.capacity !== null && assignment.sectionId) {
                const sectionStudentsCount = await prisma.studentEnrollment.count({
                    where: {
                        sectionId: assignment.sectionId,
                        status: "ENROLLED"
                    }
                });
                if (sectionStudentsCount > room.capacity) {
                    throw new Error(`Room capacity conflict: The section has ${sectionStudentsCount} students, but Room ${room.name} has a capacity of only ${room.capacity}.`);
                }
            }
        }

        // Conflict Detection 5: Subject Weekly Requirements
        if (assignment.periodsPerWeek > 0) {
            const scheduledCount = await prisma.timetable.count({
                where: {
                    teachingAssignmentId: data.teachingAssignmentId,
                    academicYearId: data.academicYearId
                }
            });
            if (scheduledCount >= assignment.periodsPerWeek) {
                throw new Error(`Weekly requirement conflict: This assignment requires ${assignment.periodsPerWeek} periods per week, and ${scheduledCount} periods are already scheduled.`);
            }
        }

        const timetable = await prisma.timetable.create({
            data: {
                organizationId,
                academicYearId: data.academicYearId,
                teachingAssignmentId: data.teachingAssignmentId,
                classPeriodId: data.classPeriodId,
                dayOfWeek: data.dayOfWeek,
                roomId: data.roomId || null
            }
        });

        // Audit log
        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TIMETABLE_ASSIGNED",
                resource: "Timetable",
                resourceId: timetable.id,
                newValue: JSON.parse(JSON.stringify(timetable))
            }
        });

        return timetable;
    }

    static async getTimetableForSection(organizationId: string, sectionId: string) {
        return prisma.timetable.findMany({
            where: {
                organizationId,
                teachingAssignment: { sectionId }
            },
            include: {
                classPeriod: true,
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

    static async getTimetableForTeacher(organizationId: string, teacherId: string) {
        return prisma.timetable.findMany({
            where: {
                organizationId,
                teachingAssignment: { teacherId }
            },
            include: {
                classPeriod: true,
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

    static async deleteTimetable(organizationId: string, id: string) {
        const entry = await prisma.timetable.findFirst({
            where: { id, organizationId }
        });
        if (!entry) throw new Error("Timetable entry not found");

        await prisma.timetable.delete({
            where: { id }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "TIMETABLE_DELETED",
                resource: "Timetable",
                resourceId: id,
                oldValue: JSON.parse(JSON.stringify(entry))
            }
        });

        return { success: true };
    }
}
