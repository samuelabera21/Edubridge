import { prisma } from "../../infrastructure/prisma/client.js";
import { AttendanceStatus, AttendanceCorrectionStatus } from "../../generated/prisma/enums.js";

const toIsoDate = (d: Date | string | null | undefined): string => {
    if (!d) return "";
    const obj = typeof d === "string" ? new Date(d) : d;
    return obj.toISOString().slice(0, 10);
};

export interface ExecutiveOverviewParams {
    academicYearId?: string;
    rangeDays?: number;
}

export interface StudentAttendanceFilterParams {
    academicYearId?: string;
    gradeId?: string;
    sectionId?: string;
    search?: string;
    status?: AttendanceStatus;
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface TeacherAttendanceFilterParams {
    academicYearId?: string;
    search?: string;
    status?: AttendanceStatus;
    date?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface CorrectionsFilterParams {
    academicYearId?: string;
    status?: AttendanceCorrectionStatus;
    page?: number;
    limit?: number;
}

export interface CreateCorrectionParams {
    enrollmentId: string;
    academicYearId: string;
    attendanceId?: string;
    date: string;
    classPeriodId?: string;
    originalStatus: AttendanceStatus;
    requestedStatus: AttendanceStatus;
    reasonCategory: string;
    justification: string;
    evidenceDocumentUrl?: string;
}

export class AttendanceAdminService {
    /**
     * Resolve active academic year ID if not explicitly specified.
     */
    static async getEffectiveAcademicYearId(organizationId: string, academicYearId?: string): Promise<string | null> {
        if (academicYearId) return academicYearId;

        const activeYear = await prisma.academicYear.findFirst({
            where: { organizationId, status: "ACTIVE" },
            orderBy: { startDate: "desc" }
        });

        if (activeYear) return activeYear.id;

        const latestYear = await prisma.academicYear.findFirst({
            where: { organizationId },
            orderBy: { startDate: "desc" }
        });

        return latestYear ? latestYear.id : null;
    }

    /**
     * Executive Overview: High-level KPI summary, daily trends, grade/section breakdowns, and real risk counters.
     */
    static async getExecutiveOverview(organizationId: string, params: ExecutiveOverviewParams = {}) {
        const academicYearId = await this.getEffectiveAcademicYearId(organizationId, params.academicYearId);
        const rangeDays = params.rangeDays && params.rangeDays > 0 ? params.rangeDays : 30;

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const rangeStartDate = new Date(today);
        rangeStartDate.setUTCDate(today.getUTCDate() - (rangeDays - 1));

        // 1. Total Enrolled Students and Active Teachers in this school / year
        const totalEnrolledStudents = await prisma.studentEnrollment.count({
            where: {
                organizationId,
                status: "ENROLLED",
                ...(academicYearId ? { academicYearId } : {})
            }
        });

        const totalActiveTeachers = await prisma.teacher.count({
            where: {
                organizationId,
                status: "ACTIVE"
            }
        });

        // 2. Student attendance records in academic year / date range
        const studentWhere = {
            organizationId,
            ...(academicYearId ? { academicYearId } : {})
        };

        const [
            studentTotalRecords,
            studentPresentCount,
            studentLateCount,
            studentAbsentCount,
            studentExcusedCount
        ] = await Promise.all([
            prisma.studentAttendance.count({ where: studentWhere }),
            prisma.studentAttendance.count({ where: { ...studentWhere, status: "PRESENT" } }),
            prisma.studentAttendance.count({ where: { ...studentWhere, status: "LATE" } }),
            prisma.studentAttendance.count({ where: { ...studentWhere, status: "ABSENT" } }),
            prisma.studentAttendance.count({ where: { ...studentWhere, status: "EXCUSED" } })
        ]);

        const studentEffectivePresent = studentPresentCount + studentLateCount;
        const studentAttendanceRate = studentTotalRecords > 0
            ? Number(((studentEffectivePresent / studentTotalRecords) * 100).toFixed(1))
            : 100;

        // 3. Teacher attendance records
        const teacherWhere = {
            organizationId,
            ...(academicYearId ? { academicYearId } : {})
        };

        const [
            teacherTotalRecords,
            teacherPresentCount,
            teacherLateCount,
            teacherAbsentCount,
            teacherExcusedCount
        ] = await Promise.all([
            prisma.teacherAttendance.count({ where: teacherWhere }),
            prisma.teacherAttendance.count({ where: { ...teacherWhere, status: "PRESENT" } }),
            prisma.teacherAttendance.count({ where: { ...teacherWhere, status: "LATE" } }),
            prisma.teacherAttendance.count({ where: { ...teacherWhere, status: "ABSENT" } }),
            prisma.teacherAttendance.count({ where: { ...teacherWhere, status: "EXCUSED" } })
        ]);

        const teacherEffectivePresent = teacherPresentCount + teacherLateCount;
        const teacherAttendanceRate = teacherTotalRecords > 0
            ? Number(((teacherEffectivePresent / teacherTotalRecords) * 100).toFixed(1))
            : 100;

        // 4. Today's Snapshot
        const todayStudentRecords = await prisma.studentAttendance.findMany({
            where: {
                organizationId,
                date: today,
                ...(academicYearId ? { academicYearId } : {})
            },
            select: { status: true }
        });

        const todayStudentStats = {
            present: todayStudentRecords.filter(r => r.status === "PRESENT").length,
            late: todayStudentRecords.filter(r => r.status === "LATE").length,
            absent: todayStudentRecords.filter(r => r.status === "ABSENT").length,
            excused: todayStudentRecords.filter(r => r.status === "EXCUSED").length,
            totalMarked: todayStudentRecords.length,
            totalEnrolled: totalEnrolledStudents,
            rate: todayStudentRecords.length > 0
                ? Number((((todayStudentRecords.filter(r => r.status === "PRESENT" || r.status === "LATE").length) / todayStudentRecords.length) * 100).toFixed(1))
                : 0
        };

        const todayTeacherRecords = await prisma.teacherAttendance.findMany({
            where: {
                organizationId,
                date: today,
                ...(academicYearId ? { academicYearId } : {})
            },
            select: { status: true }
        });

        const todayTeacherStats = {
            present: todayTeacherRecords.filter(r => r.status === "PRESENT").length,
            late: todayTeacherRecords.filter(r => r.status === "LATE").length,
            absent: todayTeacherRecords.filter(r => r.status === "ABSENT").length,
            excused: todayTeacherRecords.filter(r => r.status === "EXCUSED").length,
            totalMarked: todayTeacherRecords.length,
            totalActive: totalActiveTeachers,
            rate: todayTeacherRecords.length > 0
                ? Number((((todayTeacherRecords.filter(r => r.status === "PRESENT" || r.status === "LATE").length) / todayTeacherRecords.length) * 100).toFixed(1))
                : 0
        };

        // 5. Daily Trend Aggregation (last `rangeDays` days)
        const rangeStudentRecords = await prisma.studentAttendance.findMany({
            where: {
                organizationId,
                date: { gte: rangeStartDate, lte: today },
                ...(academicYearId ? { academicYearId } : {})
            },
            select: { date: true, status: true }
        });

        const rangeTeacherRecords = await prisma.teacherAttendance.findMany({
            where: {
                organizationId,
                date: { gte: rangeStartDate, lte: today },
                ...(academicYearId ? { academicYearId } : {})
            },
            select: { date: true, status: true }
        });

        // Group records by YYYY-MM-DD
        const trendMap = new Map<string, {
            date: string;
            studentPresent: number;
            studentLate: number;
            studentAbsent: number;
            studentExcused: number;
            studentTotal: number;
            teacherPresent: number;
            teacherLate: number;
            teacherAbsent: number;
            teacherExcused: number;
            teacherTotal: number;
        }>();

        for (let d = 0; d < rangeDays; d++) {
            const cur = new Date(rangeStartDate);
            cur.setUTCDate(rangeStartDate.getUTCDate() + d);
            const dateStr = toIsoDate(cur);
            trendMap.set(dateStr, {
                date: dateStr,
                studentPresent: 0,
                studentLate: 0,
                studentAbsent: 0,
                studentExcused: 0,
                studentTotal: 0,
                teacherPresent: 0,
                teacherLate: 0,
                teacherAbsent: 0,
                teacherExcused: 0,
                teacherTotal: 0
            });
        }

        for (const r of rangeStudentRecords) {
            const dStr = toIsoDate(r.date);
            if (!dStr) continue;
            const entry = trendMap.get(dStr);
            if (entry) {
                entry.studentTotal++;
                if (r.status === "PRESENT") entry.studentPresent++;
                else if (r.status === "LATE") entry.studentLate++;
                else if (r.status === "ABSENT") entry.studentAbsent++;
                else if (r.status === "EXCUSED") entry.studentExcused++;
            }
        }

        for (const r of rangeTeacherRecords) {
            const dStr = toIsoDate(r.date);
            if (!dStr) continue;
            const entry = trendMap.get(dStr);
            if (entry) {
                entry.teacherTotal++;
                if (r.status === "PRESENT") entry.teacherPresent++;
                else if (r.status === "LATE") entry.teacherLate++;
                else if (r.status === "ABSENT") entry.teacherAbsent++;
                else if (r.status === "EXCUSED") entry.teacherExcused++;
            }
        }

        const trends = Array.from(trendMap.values()).map(t => {
            const sPresent = t.studentPresent + t.studentLate;
            const sRate = t.studentTotal > 0 ? Number(((sPresent / t.studentTotal) * 100).toFixed(1)) : null;
            const tPresent = t.teacherPresent + t.teacherLate;
            const tRate = t.teacherTotal > 0 ? Number(((tPresent / t.teacherTotal) * 100).toFixed(1)) : null;

            return {
                ...t,
                studentRate: sRate,
                teacherRate: tRate
            };
        });

        // 6. Grade and Section Performance Breakdown
        const grades = await prisma.schoolGrade.findMany({
            where: {
                academicYear: { organizationId },
                ...(academicYearId ? { academicYearId } : {})
            },
            include: {
                grade: true,
                sections: {
                    include: {
                        studentEnrollments: {
                            where: {
                                status: "ENROLLED",
                                ...(academicYearId ? { academicYearId } : {})
                            },
                            select: {
                                id: true,
                                attendances: {
                                    where: {
                                        ...(academicYearId ? { academicYearId } : {})
                                    },
                                    select: { status: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { grade: { level: "asc" } }
        });

        const gradeBreakdown = grades.map(sg => {
            let totalGradeStudents = 0;
            let totalGradeRecords = 0;
            let totalGradePresent = 0;
            let totalGradeAbsent = 0;
            let totalGradeLate = 0;
            let totalGradeExcused = 0;

            const sections = sg.sections.map(sec => {
                const enrollmentCount = sec.studentEnrollments.length;
                totalGradeStudents += enrollmentCount;

                let secRecords = 0;
                let secPresent = 0;
                let secAbsent = 0;
                let secLate = 0;
                let secExcused = 0;

                for (const enr of sec.studentEnrollments) {
                    for (const att of enr.attendances) {
                        secRecords++;
                        if (att.status === "PRESENT") secPresent++;
                        else if (att.status === "LATE") secLate++;
                        else if (att.status === "ABSENT") secAbsent++;
                        else if (att.status === "EXCUSED") secExcused++;
                    }
                }

                totalGradeRecords += secRecords;
                totalGradePresent += secPresent;
                totalGradeAbsent += secAbsent;
                totalGradeLate += secLate;
                totalGradeExcused += secExcused;

                const secEffectivePresent = secPresent + secLate;
                const secRate = secRecords > 0
                    ? Number(((secEffectivePresent / secRecords) * 100).toFixed(1))
                    : 100;

                let healthStatus: "Healthy" | "Attention" | "Critical" = "Healthy";
                if (secRate < 80) healthStatus = "Critical";
                else if (secRate < 90) healthStatus = "Attention";

                return {
                    id: sec.id,
                    name: sec.name,
                    enrollmentCount,
                    totalRecords: secRecords,
                    presentCount: secPresent,
                    lateCount: secLate,
                    absentCount: secAbsent,
                    excusedCount: secExcused,
                    attendanceRate: secRate,
                    healthStatus
                };
            });

            const gradeEffectivePresent = totalGradePresent + totalGradeLate;
            const gradeRate = totalGradeRecords > 0
                ? Number(((gradeEffectivePresent / totalGradeRecords) * 100).toFixed(1))
                : 100;

            let healthStatus: "Healthy" | "Attention" | "Critical" = "Healthy";
            if (gradeRate < 80) healthStatus = "Critical";
            else if (gradeRate < 90) healthStatus = "Attention";

            return {
                gradeId: sg.gradeId,
                schoolGradeId: sg.id,
                gradeName: sg.grade?.name || `Grade ${sg.gradeId}`,
                gradeLevel: sg.grade?.level || 0,
                totalStudents: totalGradeStudents,
                totalRecords: totalGradeRecords,
                presentCount: totalGradePresent,
                lateCount: totalGradeLate,
                absentCount: totalGradeAbsent,
                excusedCount: totalGradeExcused,
                attendanceRate: gradeRate,
                healthStatus,
                sections
            };
        });

        // Identify section anomalies (rate < 85%)
        const sectionAnomalies = gradeBreakdown
            .flatMap(g => g.sections.map(s => ({ ...s, gradeName: g.gradeName })))
            .filter(s => s.totalRecords >= 5 && s.attendanceRate < 85)
            .sort((a, b) => a.attendanceRate - b.attendanceRate);

        // 7. Action and Risk Counters
        const pendingCorrectionsCount = await prisma.attendanceCorrection.count({
            where: {
                organizationId,
                status: "PENDING",
                ...(academicYearId ? { academicYearId } : {})
            }
        });

        // Fast Risk Scan for Summary Badges
        const riskAlerts = await this.getAbsenceRiskAlerts(organizationId, academicYearId || undefined);
        const criticalRiskCount = riskAlerts.filter(a => a.severity === "CRITICAL").length;
        const warningRiskCount = riskAlerts.filter(a => a.severity === "WARNING").length;

        return {
            academicYearId,
            academicYearList: await prisma.academicYear.findMany({
                where: { organizationId },
                select: { id: true, name: true, status: true, startDate: true, endDate: true },
                orderBy: { startDate: "desc" }
            }),
            summary: {
                studentAttendanceRate,
                teacherAttendanceRate,
                totalEnrolledStudents,
                totalActiveTeachers,
                totalStudentRecords: studentTotalRecords,
                totalTeacherRecords: teacherTotalRecords,
                studentStats: {
                    present: studentPresentCount,
                    late: studentLateCount,
                    absent: studentAbsentCount,
                    excused: studentExcusedCount
                },
                teacherStats: {
                    present: teacherPresentCount,
                    late: teacherLateCount,
                    absent: teacherAbsentCount,
                    excused: teacherExcusedCount
                }
            },
            todaySnapshot: {
                date: toIsoDate(today),
                student: todayStudentStats,
                teacher: todayTeacherStats
            },
            trends,
            gradeBreakdown,
            sectionAnomalies,
            riskCounters: {
                totalAlerts: riskAlerts.length,
                critical: criticalRiskCount,
                warning: warningRiskCount,
                pendingCorrections: pendingCorrectionsCount
            }
        };
    }

    /**
     * School-wide Student Attendance Table with Multi-filtering and Paginated Results.
     */
    static async getSchoolStudentAttendance(organizationId: string, filters: StudentAttendanceFilterParams = {}) {
        const academicYearId = await this.getEffectiveAcademicYearId(organizationId, filters.academicYearId);
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
        const skip = (page - 1) * limit;

        const where: any = {
            organizationId,
            ...(academicYearId ? { academicYearId } : {})
        };

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.date) {
            const targetDate = new Date(filters.date);
            where.date = targetDate;
        } else if (filters.startDate || filters.endDate) {
            where.date = {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {})
            };
        }

        const enrollmentWhere: any = {};
        if (filters.gradeId) {
            enrollmentWhere.schoolGrade = { gradeId: filters.gradeId };
        }
        if (filters.sectionId) {
            enrollmentWhere.sectionId = filters.sectionId;
        }
        if (filters.search) {
            enrollmentWhere.student = {
                OR: [
                    { firstName: { contains: filters.search, mode: "insensitive" } },
                    { lastName: { contains: filters.search, mode: "insensitive" } },
                    { studentId: { contains: filters.search, mode: "insensitive" } }
                ]
            };
        }

        if (Object.keys(enrollmentWhere).length > 0) {
            where.enrollment = enrollmentWhere;
        }

        const [records, total, statusCounts] = await Promise.all([
            prisma.studentAttendance.findMany({
                where,
                include: {
                    enrollment: {
                        include: {
                            student: true,
                            schoolGrade: { include: { grade: true } },
                            section: true
                        }
                    },
                    classPeriod: true,
                    recordedBy: { select: { id: true, name: true, email: true } }
                },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                skip,
                take: limit
            }),
            prisma.studentAttendance.count({ where }),
            prisma.studentAttendance.groupBy({
                by: ["status"],
                where,
                _count: { status: true }
            })
        ]);

        const countsMap: Record<string, number> = {
            PRESENT: 0,
            LATE: 0,
            ABSENT: 0,
            EXCUSED: 0
        };
        for (const sc of statusCounts) {
            countsMap[sc.status] = sc._count.status;
        }

        const effectivePresent = (countsMap["PRESENT"] || 0) + (countsMap["LATE"] || 0);
        const aggregateRate = total > 0 ? Number(((effectivePresent / total) * 100).toFixed(1)) : 100;

        return {
            data: records.map(r => ({
                id: r.id,
                date: toIsoDate(r.date),
                status: r.status,
                remarks: r.remarks,
                studentId: r.enrollment.studentId,
                enrollmentId: r.enrollmentId,
                studentName: `${r.enrollment.student.firstName} ${r.enrollment.student.lastName}`,
                admissionNumber: r.enrollment.student.studentId,
                gender: r.enrollment.student.gender,
                gradeName: r.enrollment.schoolGrade.grade.name,
                sectionName: r.enrollment.section?.name || "Unassigned",
                classPeriodName: r.classPeriod?.name || "Daily Attendance",
                recordedBy: r.recordedBy ? { id: r.recordedBy.id, name: r.recordedBy.name } : null,
                createdAt: r.createdAt
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            summary: {
                total,
                presentCount: countsMap["PRESENT"] || 0,
                lateCount: countsMap["LATE"] || 0,
                absentCount: countsMap["ABSENT"] || 0,
                excusedCount: countsMap["EXCUSED"] || 0,
                attendanceRate: aggregateRate
            }
        };
    }

    /**
     * Individual Student Attendance Detail: Student info, stats, streaks, chronological log, and corrections.
     */
    static async getStudentAttendanceDetail(organizationId: string, enrollmentId: string, academicYearId?: string) {
        const effectiveYearId = await this.getEffectiveAcademicYearId(organizationId, academicYearId);

        const enrollment = await prisma.studentEnrollment.findFirst({
            where: {
                id: enrollmentId,
                organizationId
            },
            include: {
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true,
                academicYear: true
            }
        });

        if (!enrollment) {
            throw new Error("Student enrollment not found in this organization");
        }

        const where = {
            organizationId,
            enrollmentId,
            ...(effectiveYearId ? { academicYearId: effectiveYearId } : {})
        };

        const records = await prisma.studentAttendance.findMany({
            where,
            include: {
                classPeriod: true,
                recordedBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }]
        });

        const corrections = await prisma.attendanceCorrection.findMany({
            where: {
                organizationId,
                enrollmentId
            },
            include: {
                requestedBy: { select: { id: true, name: true } },
                reviewedBy: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        const totalSessions = records.length;
        const presentCount = records.filter(r => r.status === "PRESENT").length;
        const lateCount = records.filter(r => r.status === "LATE").length;
        const absentCount = records.filter(r => r.status === "ABSENT").length;
        const excusedCount = records.filter(r => r.status === "EXCUSED").length;

        const effectivePresent = presentCount + lateCount;
        const attendanceRate = totalSessions > 0
            ? Number(((effectivePresent / totalSessions) * 100).toFixed(1))
            : 100;

        // Calculate consecutive absence streak from most recent records
        let consecutiveAbsences = 0;
        for (const r of records) {
            if (r.status === "ABSENT") {
                consecutiveAbsences++;
            } else if (r.status === "PRESENT" || r.status === "LATE") {
                break;
            }
        }

        return {
            student: {
                id: enrollment.student.id,
                enrollmentId: enrollment.id,
                name: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
                admissionNumber: enrollment.student.studentId,
                gender: enrollment.student.gender,
                photoUrl: enrollment.student.photoUrl,
                gradeName: enrollment.schoolGrade.grade.name,
                sectionName: enrollment.section?.name || "Unassigned",
                academicYearName: enrollment.academicYear.name,
                status: enrollment.status
            },
            stats: {
                totalSessions,
                presentCount,
                lateCount,
                absentCount,
                excusedCount,
                attendanceRate,
                consecutiveAbsences,
                isAtRisk: consecutiveAbsences >= 3 || (totalSessions >= 5 && attendanceRate < 80)
            },
            records: records.map(r => ({
                id: r.id,
                date: toIsoDate(r.date),
                status: r.status,
                remarks: r.remarks,
                classPeriodName: r.classPeriod?.name || "Daily Session",
                recordedBy: r.recordedBy ? { id: r.recordedBy.id, name: r.recordedBy.name } : null,
                createdAt: r.createdAt
            })),
            corrections: corrections.map(c => ({
                id: c.id,
                date: toIsoDate(c.date),
                originalStatus: c.originalStatus,
                requestedStatus: c.requestedStatus,
                reasonCategory: c.reasonCategory,
                justification: c.justification,
                status: c.status,
                rejectionReason: c.rejectionReason,
                requestedBy: c.requestedBy ? { id: c.requestedBy.id, name: c.requestedBy.name } : null,
                reviewedBy: c.reviewedBy ? { id: c.reviewedBy.id, name: c.reviewedBy.name } : null,
                reviewedAt: c.reviewedAt,
                createdAt: c.createdAt
            }))
        };
    }

    /**
     * School-wide Teacher Attendance Oversight Table.
     */
    static async getSchoolTeacherAttendance(organizationId: string, filters: TeacherAttendanceFilterParams = {}) {
        const academicYearId = await this.getEffectiveAcademicYearId(organizationId, filters.academicYearId);
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
        const skip = (page - 1) * limit;

        const where: any = {
            organizationId,
            ...(academicYearId ? { academicYearId } : {})
        };

        if (filters.status) {
            where.status = filters.status;
        }

        if (filters.date) {
            const targetDate = new Date(filters.date);
            where.date = targetDate;
        } else if (filters.startDate || filters.endDate) {
            where.date = {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {})
            };
        }

        if (filters.search) {
            where.teacher = {
                OR: [
                    { employeeId: { contains: filters.search, mode: "insensitive" } },
                    { user: { name: { contains: filters.search, mode: "insensitive" } } },
                    { user: { email: { contains: filters.search, mode: "insensitive" } } }
                ]
            };
        }

        const [records, total, statusCounts, totalActiveTeachers] = await Promise.all([
            prisma.teacherAttendance.findMany({
                where,
                include: {
                    teacher: {
                        include: {
                            user: { select: { id: true, name: true, email: true, image: true } }
                        }
                    },
                    recordedBy: { select: { id: true, name: true, email: true } }
                },
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                skip,
                take: limit
            }),
            prisma.teacherAttendance.count({ where }),
            prisma.teacherAttendance.groupBy({
                by: ["status"],
                where,
                _count: { status: true }
            }),
            prisma.teacher.count({ where: { organizationId, status: "ACTIVE" } })
        ]);

        const countsMap: Record<string, number> = {
            PRESENT: 0,
            LATE: 0,
            ABSENT: 0,
            EXCUSED: 0
        };
        for (const sc of statusCounts) {
            countsMap[sc.status] = sc._count.status;
        }

        const effectivePresent = (countsMap["PRESENT"] || 0) + (countsMap["LATE"] || 0);
        const aggregateRate = total > 0 ? Number(((effectivePresent / total) * 100).toFixed(1)) : 100;

        return {
            data: records.map(r => ({
                id: r.id,
                date: toIsoDate(r.date),
                status: r.status,
                remarks: r.remarks,
                teacherId: r.teacherId,
                teacherName: r.teacher.user?.name || "Teacher",
                employeeId: r.teacher.employeeId,
                email: r.teacher.user?.email || "",
                photoUrl: r.teacher.user?.image || null,
                recordedBy: r.recordedBy ? { id: r.recordedBy.id, name: r.recordedBy.name } : null,
                createdAt: r.createdAt
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            summary: {
                totalMarked: total,
                totalActiveTeachers,
                presentCount: countsMap["PRESENT"] || 0,
                lateCount: countsMap["LATE"] || 0,
                absentCount: countsMap["ABSENT"] || 0,
                excusedCount: countsMap["EXCUSED"] || 0,
                attendanceRate: aggregateRate
            }
        };
    }

    /**
     * Teacher Attendance Detail: Profile, stats, assignments, and attendance logs.
     */
    static async getTeacherAttendanceDetail(organizationId: string, teacherId: string, academicYearId?: string) {
        const effectiveYearId = await this.getEffectiveAcademicYearId(organizationId, academicYearId);

        const teacher = await prisma.teacher.findFirst({
            where: { id: teacherId, organizationId },
            include: {
                user: { select: { id: true, name: true, email: true, image: true } },
                specializations: {
                    include: { subject: true }
                },
                assignments: {
                    where: {
                        ...(effectiveYearId ? { academicYearId: effectiveYearId } : {})
                    },
                    include: {
                        subject: true,
                        section: { include: { schoolGrade: { include: { grade: true } } } }
                    }
                }
            }
        });

        if (!teacher) {
            throw new Error("Teacher record not found in this organization");
        }

        const where = {
            organizationId,
            teacherId,
            ...(effectiveYearId ? { academicYearId: effectiveYearId } : {})
        };

        const records = await prisma.teacherAttendance.findMany({
            where,
            include: {
                recordedBy: { select: { id: true, name: true, email: true } }
            },
            orderBy: [{ date: "desc" }, { createdAt: "desc" }]
        });

        const totalDays = records.length;
        const presentCount = records.filter(r => r.status === "PRESENT").length;
        const lateCount = records.filter(r => r.status === "LATE").length;
        const absentCount = records.filter(r => r.status === "ABSENT").length;
        const excusedCount = records.filter(r => r.status === "EXCUSED").length;

        const effectivePresent = presentCount + lateCount;
        const attendanceRate = totalDays > 0
            ? Number(((effectivePresent / totalDays) * 100).toFixed(1))
            : 100;

        return {
            teacher: {
                id: teacher.id,
                name: teacher.user?.name || "Teacher",
                employeeId: teacher.employeeId,
                email: teacher.user?.email || "",
                status: teacher.status,
                phone: teacher.phoneNumber,
                specializations: teacher.specializations.map(s => s.subject.name),
                assignments: teacher.assignments.map(a => ({
                    id: a.id,
                    subjectName: a.subject.name,
                    gradeName: a.section?.schoolGrade?.grade?.name || "Grade",
                    sectionName: a.section?.name || "Unassigned"
                }))
            },
            stats: {
                totalDays,
                presentCount,
                lateCount,
                absentCount,
                excusedCount,
                attendanceRate,
                isAtRisk: absentCount >= 3 || (totalDays >= 5 && attendanceRate < 85)
            },
            records: records.map(r => ({
                id: r.id,
                date: toIsoDate(r.date),
                status: r.status,
                remarks: r.remarks,
                recordedBy: r.recordedBy ? { id: r.recordedBy.id, name: r.recordedBy.name } : null,
                createdAt: r.createdAt
            }))
        };
    }

    /**
     * Absence Risk Alerts: Real automated detection of student, section, and faculty attendance risks.
     */
    static async getAbsenceRiskAlerts(organizationId: string, academicYearId?: string) {
        const effectiveYearId = await this.getEffectiveAcademicYearId(organizationId, academicYearId);

        const alerts: Array<{
            id: string;
            type: "STUDENT_CONSECUTIVE_ABSENCE" | "STUDENT_CHRONIC_ABSENCE" | "SECTION_ANOMALY" | "TEACHER_ABSENCE";
            severity: "CRITICAL" | "WARNING" | "INFO";
            targetId: string;
            enrollmentId?: string;
            teacherId?: string;
            sectionId?: string;
            title: string;
            description: string;
            metric: string;
            date?: string;
            suggestedAction: string;
        }> = [];

        // 1. Student Consecutive Absences & Chronic Absenteeism
        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                status: "ENROLLED",
                ...(effectiveYearId ? { academicYearId: effectiveYearId } : {})
            },
            include: {
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true,
                attendances: {
                    where: {
                        ...(effectiveYearId ? { academicYearId: effectiveYearId } : {})
                    },
                    orderBy: [{ date: "desc" }, { createdAt: "desc" }]
                }
            }
        });

        for (const enr of enrollments) {
            const records = enr.attendances;
            if (records.length === 0) continue;

            const total = records.length;
            const present = records.filter(r => r.status === "PRESENT").length;
            const late = records.filter(r => r.status === "LATE").length;
            const absent = records.filter(r => r.status === "ABSENT").length;
            const effectivePresent = present + late;
            const rate = Number(((effectivePresent / total) * 100).toFixed(1));

            // Consecutive absences check
            let streak = 0;
            let latestAbsenceDate: string | undefined = undefined;
            for (const r of records) {
                if (r.status === "ABSENT") {
                    streak++;
                    if (!latestAbsenceDate) {
                        latestAbsenceDate = toIsoDate(r.date);
                    }
                } else if (r.status === "PRESENT" || r.status === "LATE") {
                    break;
                }
            }

            const studentName = `${enr.student.firstName} ${enr.student.lastName}`;
            const gradeSec = `${enr.schoolGrade.grade.name} - ${enr.section?.name || "Unassigned"}`;

            if (streak >= 3) {
                alerts.push({
                    id: `consecutive_${enr.id}`,
                    type: "STUDENT_CONSECUTIVE_ABSENCE",
                    severity: "CRITICAL",
                    targetId: enr.student.id,
                    enrollmentId: enr.id,
                    sectionId: enr.sectionId || undefined,
                    title: `Consecutive Absence: ${studentName}`,
                    description: `${studentName} (${gradeSec}) has missed ${streak} consecutive school days without resolution.`,
                    metric: `${streak} Days Consecutive Absence`,
                    date: latestAbsenceDate,
                    suggestedAction: "Contact guardian immediately and verify student safety / health status."
                });
            } else if (total >= 5 && rate < 80) {
                alerts.push({
                    id: `chronic_${enr.id}`,
                    type: "STUDENT_CHRONIC_ABSENCE",
                    severity: rate < 70 ? "CRITICAL" : "WARNING",
                    targetId: enr.student.id,
                    enrollmentId: enr.id,
                    sectionId: enr.sectionId || undefined,
                    title: `Chronic Absenteeism Risk: ${studentName}`,
                    description: `${studentName} (${gradeSec}) has an overall attendance rate of ${rate}% across ${total} sessions (${absent} absences).`,
                    metric: `${rate}% Presence Rate`,
                    date: records[0]?.date ? toIsoDate(records[0].date) : undefined,
                    suggestedAction: "Issue academic warning letter and arrange parental counseling meeting."
                });
            }
        }

        // 2. Section Attendance Anomalies (< 85% with at least 5 records)
        const sections = await prisma.section.findMany({
            where: {
                schoolGrade: {
                    academicYear: { organizationId },
                    ...(effectiveYearId ? { academicYearId: effectiveYearId } : {})
                }
            },
            include: {
                schoolGrade: { include: { grade: true } },
                studentEnrollments: {
                    where: {
                        status: "ENROLLED",
                        ...(effectiveYearId ? { academicYearId: effectiveYearId } : {})
                    },
                    include: {
                        attendances: {
                            where: {
                                ...(effectiveYearId ? { academicYearId: effectiveYearId } : {})
                            },
                            select: { status: true }
                        }
                    }
                }
            }
        });

        for (const sec of sections) {
            let totalRecords = 0;
            let presentCount = 0;
            let lateCount = 0;

            for (const enr of sec.studentEnrollments) {
                for (const att of enr.attendances) {
                    totalRecords++;
                    if (att.status === "PRESENT") presentCount++;
                    else if (att.status === "LATE") lateCount++;
                }
            }

            if (totalRecords >= 10) {
                const secRate = Number((((presentCount + lateCount) / totalRecords) * 100).toFixed(1));
                if (secRate < 85) {
                    const gradeName = sec.schoolGrade.grade.name;
                    alerts.push({
                        id: `section_${sec.id}`,
                        type: "SECTION_ANOMALY",
                        severity: secRate < 75 ? "CRITICAL" : "WARNING",
                        targetId: sec.id,
                        sectionId: sec.id,
                        title: `Section Attendance Deficit: ${gradeName} - ${sec.name}`,
                        description: `Section ${gradeName} - ${sec.name} has dropped to ${secRate}% cumulative attendance across ${totalRecords} records.`,
                        metric: `${secRate}% Section Average`,
                        suggestedAction: "Review homeroom teacher attendance logging and check for environmental/health patterns."
                    });
                }
            }
        }

        // 3. Teacher Absence Alerts (>= 3 absences)
        const teachers = await prisma.teacher.findMany({
            where: { organizationId, status: "ACTIVE" },
            include: {
                user: { select: { id: true, name: true, email: true } },
                attendances: {
                    where: {
                        ...(effectiveYearId ? { academicYearId: effectiveYearId } : {})
                    },
                    orderBy: [{ date: "desc" }]
                }
            }
        });

        for (const t of teachers) {
            const records = t.attendances;
            const absentCount = records.filter(r => r.status === "ABSENT").length;

            if (absentCount >= 3) {
                const teacherName = t.user?.name || "Teacher";
                alerts.push({
                    id: `teacher_${t.id}`,
                    type: "TEACHER_ABSENCE",
                    severity: absentCount >= 5 ? "CRITICAL" : "WARNING",
                    targetId: t.id,
                    teacherId: t.id,
                    title: `Faculty Absence Threshold: ${teacherName}`,
                    description: `${teacherName} (${t.employeeId}) has recorded ${absentCount} absences in the current term.`,
                    metric: `${absentCount} Total Absences`,
                    date: records[0]?.date ? toIsoDate(records[0].date) : undefined,
                    suggestedAction: "Verify substitute teacher coverage and consult department head."
                });
            }
        }

        // Sort: CRITICAL first, then WARNING, then by date/title
        const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
        return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    }

    /**
     * Corrections: Query list of pending and processed attendance corrections.
     */
    static async getCorrections(organizationId: string, filters: CorrectionsFilterParams = {}) {
        const academicYearId = await this.getEffectiveAcademicYearId(organizationId, filters.academicYearId);
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
        const skip = (page - 1) * limit;

        const where: any = {
            organizationId,
            ...(academicYearId ? { academicYearId } : {})
        };

        if (filters.status) {
            where.status = filters.status;
        }

        const [items, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
            prisma.attendanceCorrection.findMany({
                where,
                include: {
                    enrollment: {
                        include: {
                            student: true,
                            schoolGrade: { include: { grade: true } },
                            section: true
                        }
                    },
                    classPeriod: true,
                    requestedBy: { select: { id: true, name: true, email: true } },
                    reviewedBy: { select: { id: true, name: true, email: true } }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            }),
            prisma.attendanceCorrection.count({ where }),
            prisma.attendanceCorrection.count({ where: { organizationId, status: "PENDING", ...(academicYearId ? { academicYearId } : {}) } }),
            prisma.attendanceCorrection.count({ where: { organizationId, status: "APPROVED", ...(academicYearId ? { academicYearId } : {}) } }),
            prisma.attendanceCorrection.count({ where: { organizationId, status: "REJECTED", ...(academicYearId ? { academicYearId } : {}) } })
        ]);

        return {
            data: items.map(c => ({
                id: c.id,
                attendanceId: c.attendanceId,
                enrollmentId: c.enrollmentId,
                date: toIsoDate(c.date),
                originalStatus: c.originalStatus,
                requestedStatus: c.requestedStatus,
                reasonCategory: c.reasonCategory,
                justification: c.justification,
                evidenceDocumentUrl: c.evidenceDocumentUrl,
                status: c.status,
                rejectionReason: c.rejectionReason,
                studentName: `${c.enrollment.student.firstName} ${c.enrollment.student.lastName}`,
                admissionNumber: c.enrollment.student.studentId,
                gradeName: c.enrollment.schoolGrade.grade.name,
                sectionName: c.enrollment.section?.name || "Unassigned",
                classPeriodName: c.classPeriod?.name || "Daily Session",
                requestedBy: c.requestedBy ? { id: c.requestedBy.id, name: c.requestedBy.name } : null,
                reviewedBy: c.reviewedBy ? { id: c.reviewedBy.id, name: c.reviewedBy.name } : null,
                reviewedAt: c.reviewedAt,
                createdAt: c.createdAt
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            summary: {
                total,
                pendingCount,
                approvedCount,
                rejectedCount
            }
        };
    }

    /**
     * Create a new official Attendance Correction Request.
     */
    static async createCorrectionRequest(organizationId: string, requestedById: string, data: CreateCorrectionParams) {
        const targetDate = new Date(data.date);
        targetDate.setUTCHours(0, 0, 0, 0);

        // Verify enrollment belongs to organization
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { id: data.enrollmentId, organizationId }
        });

        if (!enrollment) {
            throw new Error("Student enrollment not found in this school organization");
        }

        const correction = await prisma.attendanceCorrection.create({
            data: {
                organizationId,
                academicYearId: data.academicYearId,
                attendanceId: data.attendanceId || null,
                enrollmentId: data.enrollmentId,
                date: targetDate,
                classPeriodId: data.classPeriodId || null,
                originalStatus: data.originalStatus,
                requestedStatus: data.requestedStatus,
                reasonCategory: data.reasonCategory,
                justification: data.justification,
                evidenceDocumentUrl: data.evidenceDocumentUrl || null,
                status: "PENDING",
                requestedById
            },
            include: {
                enrollment: {
                    include: {
                        student: true,
                        schoolGrade: { include: { grade: true } }
                    }
                }
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                userId: requestedById,
                action: "ATTENDANCE_CORRECTION_REQUESTED",
                resource: "AttendanceCorrection",
                resourceId: correction.id,
                newValue: {
                    enrollmentId: data.enrollmentId,
                    studentName: `${correction.enrollment.student.firstName} ${correction.enrollment.student.lastName}`,
                    date: data.date,
                    originalStatus: data.originalStatus,
                    requestedStatus: data.requestedStatus,
                    reasonCategory: data.reasonCategory
                }
            }
        });

        return correction;
    }

    /**
     * Approve Correction: Updates the actual student attendance record and logs administrative review.
     */
    static async approveCorrection(organizationId: string, reviewedById: string, correctionId: string) {
        const correction = await prisma.attendanceCorrection.findFirst({
            where: { id: correctionId, organizationId },
            include: {
                enrollment: { include: { student: true } }
            }
        });

        if (!correction) {
            throw new Error("Attendance correction request not found");
        }

        if (correction.status !== "PENDING") {
            throw new Error(`Correction request is already ${correction.status.toLowerCase()}`);
        }

        const targetDate = new Date(correction.date);
        targetDate.setUTCHours(0, 0, 0, 0);

        const result = await prisma.$transaction(async (tx) => {
            // Update or upsert student attendance record
            let updatedAttendance;
            if (correction.attendanceId) {
                updatedAttendance = await tx.studentAttendance.update({
                    where: { id: correction.attendanceId },
                    data: {
                        status: correction.requestedStatus,
                        remarks: `Corrected from ${correction.originalStatus} to ${correction.requestedStatus} (Ref: ${correction.reasonCategory})`
                    }
                });
            } else {
                updatedAttendance = await tx.studentAttendance.upsert({
                    where: {
                        enrollmentId_date_classPeriodId: {
                            enrollmentId: correction.enrollmentId,
                            date: targetDate,
                            classPeriodId: correction.classPeriodId || ""
                        }
                    },
                    update: {
                        status: correction.requestedStatus,
                        remarks: `Corrected from ${correction.originalStatus} to ${correction.requestedStatus} (Ref: ${correction.reasonCategory})`
                    },
                    create: {
                        organizationId,
                        academicYearId: correction.academicYearId,
                        enrollmentId: correction.enrollmentId,
                        date: targetDate,
                        classPeriodId: correction.classPeriodId || null,
                        status: correction.requestedStatus,
                        remarks: `Official Correction Approved: ${correction.justification}`,
                        recordedById: reviewedById
                    }
                });
            }

            const updatedCorrection = await tx.attendanceCorrection.update({
                where: { id: correction.id },
                data: {
                    status: "APPROVED",
                    reviewedById,
                    reviewedAt: new Date()
                }
            });

            await tx.auditLog.create({
                data: {
                    organizationId,
                    userId: reviewedById,
                    action: "ATTENDANCE_CORRECTION_APPROVED",
                    resource: "AttendanceCorrection",
                    resourceId: correction.id,
                    oldValue: { status: correction.originalStatus },
                    newValue: {
                        status: correction.requestedStatus,
                        attendanceId: updatedAttendance.id,
                        reasonCategory: correction.reasonCategory
                    }
                }
            });

            return { updatedCorrection, updatedAttendance };
        });

        return result;
    }

    /**
     * Reject Correction: Records administrative rejection reason and audit log.
     */
    static async rejectCorrection(organizationId: string, reviewedById: string, correctionId: string, rejectionReason: string) {
        if (!rejectionReason || rejectionReason.trim().length === 0) {
            throw new Error("Rejection reason is required");
        }

        const correction = await prisma.attendanceCorrection.findFirst({
            where: { id: correctionId, organizationId }
        });

        if (!correction) {
            throw new Error("Attendance correction request not found");
        }

        if (correction.status !== "PENDING") {
            throw new Error(`Correction request is already ${correction.status.toLowerCase()}`);
        }

        const updatedCorrection = await prisma.attendanceCorrection.update({
            where: { id: correction.id },
            data: {
                status: "REJECTED",
                reviewedById,
                reviewedAt: new Date(),
                rejectionReason: rejectionReason.trim()
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                userId: reviewedById,
                action: "ATTENDANCE_CORRECTION_REJECTED",
                resource: "AttendanceCorrection",
                resourceId: correction.id,
                newValue: {
                    rejectionReason: rejectionReason.trim(),
                    status: "REJECTED"
                }
            }
        });

        return updatedCorrection;
    }
}
