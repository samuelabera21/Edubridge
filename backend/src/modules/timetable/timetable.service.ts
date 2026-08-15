import { prisma } from "../../infrastructure/prisma/client.js";

export class TimetableService {
    static async createClassPeriod(organizationId: string, data: { name: string; startTime: string; endTime: string }) {
        const period = await prisma.classPeriod.create({
            data: {
                organizationId,
                name: data.name,
                startTime: data.startTime,
                endTime: data.endTime,
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

        // Conflict Detection 1: Teacher Conflict
        // Same teacher, same day, same period
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

        // Conflict Detection 2: Section Conflict
        // Same section, same day, same period
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

        // Conflict Detection 3: Room Conflict (Optional)
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
}
