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
}
