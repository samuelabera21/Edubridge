import { prisma } from "../../infrastructure/prisma/client.js";
import { AttendanceStatus } from "../../generated/prisma/enums.js";

export class AttendanceService {
    static async recordStudentAttendance(organizationId: string, data: { academicYearId: string; enrollmentId: string; classPeriodId?: string; date: string; status: AttendanceStatus; remarks?: string; recordedById?: string }) {
        const existing = await prisma.studentAttendance.findFirst({
            where: {
                enrollmentId: data.enrollmentId,
                date: new Date(data.date),
                classPeriodId: data.classPeriodId || null
            }
        });

        if (existing) {
            return prisma.studentAttendance.update({
                where: { id: existing.id },
                data: {
                    status: data.status,
                    remarks: data.remarks,
                    recordedById: data.recordedById
                }
            });
        }

        return prisma.studentAttendance.create({
            data: {
                organizationId,
                academicYearId: data.academicYearId,
                enrollmentId: data.enrollmentId,
                classPeriodId: data.classPeriodId || null,
                date: new Date(data.date),
                status: data.status,
                remarks: data.remarks,
                recordedById: data.recordedById
            }
        });
    }

    static async recordBulkStudentAttendance(
        organizationId: string, 
        data: { 
            academicYearId: string; 
            sectionId: string; 
            date: string; 
            classPeriodId?: string; 
            records: Array<{ enrollmentId: string; status: AttendanceStatus; remarks?: string }>; 
            recordedById?: string 
        }
    ) {
        const targetDate = new Date(data.date);
        const periodId = data.classPeriodId || null;

        const results = await prisma.$transaction(
            data.records.map(rec => {
                return prisma.studentAttendance.upsert({
                    where: {
                        enrollmentId_date_classPeriodId: {
                            enrollmentId: rec.enrollmentId,
                            date: targetDate,
                            classPeriodId: periodId as any
                        }
                    },
                    update: {
                        status: rec.status,
                        remarks: rec.remarks || null,
                        recordedById: data.recordedById || null
                    },
                    create: {
                        organizationId,
                        academicYearId: data.academicYearId,
                        enrollmentId: rec.enrollmentId,
                        classPeriodId: periodId,
                        date: targetDate,
                        status: rec.status,
                        remarks: rec.remarks || null,
                        recordedById: data.recordedById || null
                    }
                });
            })
        );

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: "STUDENT_ATTENDANCE_RECORDED_BULK",
                resource: "StudentAttendance",
                resourceId: data.sectionId,
                newValue: { count: results.length, date: data.date, periodId }
            }
        });

        return results;
    }

    static async getSectionAttendance(
        organizationId: string, 
        sectionId: string, 
        date: string, 
        classPeriodId?: string
    ) {
        const targetDate = new Date(date);
        const periodId = classPeriodId || null;

        // Fetch all enrollments in section
        const enrollments = await prisma.studentEnrollment.findMany({
            where: { sectionId },
            include: { student: true }
        });

        const enrollmentIds = enrollments.map(e => e.id);

        // Fetch existing attendance records
        const records = await prisma.studentAttendance.findMany({
            where: {
                organizationId,
                enrollmentId: { in: enrollmentIds },
                date: targetDate,
                classPeriodId: periodId
            }
        });

        const recordMap = new Map(records.map(r => [r.enrollmentId, r]));

        return enrollments.map(e => ({
            enrollment: e,
            attendance: recordMap.get(e.id) || null
        }));
    }

    static async getStudentAttendance(organizationId: string, enrollmentId: string, startDate?: string, endDate?: string) {
        return prisma.studentAttendance.findMany({
            where: {
                organizationId,
                enrollmentId,
                ...(startDate && endDate ? {
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                } : {})
            },
            include: { classPeriod: true, recordedBy: true },
            orderBy: { date: "desc" }
        });
    }

    static async recordTeacherAttendance(organizationId: string, data: { academicYearId: string; teacherId: string; date: string; status: AttendanceStatus; remarks?: string; recordedById?: string }) {
        const attendance = await prisma.teacherAttendance.upsert({
            where: {
                teacherId_date: {
                    teacherId: data.teacherId,
                    date: new Date(data.date)
                }
            },
            update: {
                status: data.status,
                remarks: data.remarks,
                recordedById: data.recordedById
            },
            create: {
                organizationId,
                academicYearId: data.academicYearId,
                teacherId: data.teacherId,
                date: new Date(data.date),
                status: data.status,
                remarks: data.remarks,
                recordedById: data.recordedById
            }
        });

        return attendance;
    }

    static async recordBulkTeacherAttendance(
        organizationId: string,
        data: {
            academicYearId: string;
            date: string;
            records: Array<{ teacherId: string; status: AttendanceStatus; remarks?: string }>;
            recordedById?: string;
        }
    ) {
        const targetDate = new Date(data.date);

        const results = await prisma.$transaction(
            data.records.map(rec => {
                return prisma.teacherAttendance.upsert({
                    where: {
                        teacherId_date: {
                            teacherId: rec.teacherId,
                            date: targetDate
                        }
                    },
                    update: {
                        status: rec.status,
                        remarks: rec.remarks || null,
                        recordedById: data.recordedById || null
                    },
                    create: {
                        organizationId,
                        academicYearId: data.academicYearId,
                        teacherId: rec.teacherId,
                        date: targetDate,
                        status: rec.status,
                        remarks: rec.remarks || null,
                        recordedById: data.recordedById || null
                    }
                });
            })
        );

        return results;
    }

    static async getTeacherAttendance(organizationId: string, teacherId: string, startDate?: string, endDate?: string) {
        return prisma.teacherAttendance.findMany({
            where: {
                organizationId,
                teacherId,
                ...(startDate && endDate ? {
                    date: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                } : {})
            },
            include: { recordedBy: true },
            orderBy: { date: "desc" }
        });
    }

    static async getDailyTeacherAttendance(organizationId: string, date: string) {
        const targetDate = new Date(date);
        const teachers = await prisma.teacher.findMany({
            where: { organizationId, status: "ACTIVE" }
        });

        const teacherIds = teachers.map(t => t.id);

        const records = await prisma.teacherAttendance.findMany({
            where: {
                organizationId,
                teacherId: { in: teacherIds },
                date: targetDate
            }
        });

        const recordMap = new Map(records.map(r => [r.teacherId, r]));

        return teachers.map(t => ({
            teacher: t,
            attendance: recordMap.get(t.id) || null
        }));
    }
}
