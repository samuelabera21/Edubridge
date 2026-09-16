import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../infrastructure/prisma/client.js";
import { AttendanceAdminService } from "./attendance.admin.service.js";
import {
    getExecutiveOverview,
    getSchoolStudentAttendance,
    getStudentAttendanceDetail,
    getSchoolTeacherAttendance,
    getTeacherAttendanceDetail,
    getAbsenceRiskAlerts,
    getCorrections,
    createCorrectionRequest,
    approveCorrection,
    rejectCorrection
} from "./attendance.controller.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        academicYear: {
            findFirst: vi.fn(),
            findMany: vi.fn()
        },
        studentEnrollment: {
            count: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn()
        },
        teacher: {
            count: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn()
        },
        studentAttendance: {
            count: vi.fn(),
            findMany: vi.fn(),
            groupBy: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn()
        },
        teacherAttendance: {
            count: vi.fn(),
            findMany: vi.fn(),
            groupBy: vi.fn()
        },
        schoolGrade: {
            findMany: vi.fn()
        },
        section: {
            findMany: vi.fn()
        },
        attendanceCorrection: {
            count: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        },
        $transaction: vi.fn((callback) => callback(prisma))
    }
}));

describe("AttendanceAdminService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getExecutiveOverview", () => {
        it("calculates presence rates and trends with academic year scoping", async () => {
            vi.mocked(prisma.academicYear.findFirst).mockResolvedValue({ id: "ay_2026", name: "2026-2027" } as any);
            vi.mocked(prisma.academicYear.findMany).mockResolvedValue([{ id: "ay_2026", name: "2026-2027" }] as any);
            vi.mocked(prisma.studentEnrollment.count).mockResolvedValue(150);
            vi.mocked(prisma.teacher.count).mockResolvedValue(20);

            // Student attendance counts: 80 PRESENT, 10 LATE, 10 ABSENT, 0 EXCUSED => Total 100, Effective 90%
            vi.mocked(prisma.studentAttendance.count)
                .mockResolvedValueOnce(100) // Total
                .mockResolvedValueOnce(80)  // PRESENT
                .mockResolvedValueOnce(10)  // LATE
                .mockResolvedValueOnce(10)  // ABSENT
                .mockResolvedValueOnce(0);  // EXCUSED

            // Teacher attendance counts: 18 PRESENT, 2 LATE, 0 ABSENT => Total 20, Effective 100%
            vi.mocked(prisma.teacherAttendance.count)
                .mockResolvedValueOnce(20)
                .mockResolvedValueOnce(18)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(0);

            vi.mocked(prisma.studentAttendance.findMany).mockResolvedValue([]);
            vi.mocked(prisma.teacherAttendance.findMany).mockResolvedValue([]);
            vi.mocked(prisma.schoolGrade.findMany).mockResolvedValue([]);
            vi.mocked(prisma.section.findMany).mockResolvedValue([]);
            vi.mocked(prisma.teacher.findMany).mockResolvedValue([]);
            vi.mocked(prisma.studentEnrollment.findMany).mockResolvedValue([]);
            vi.mocked(prisma.attendanceCorrection.count).mockResolvedValue(3);

            const overview = await AttendanceAdminService.getExecutiveOverview("school_1", { academicYearId: "ay_2026" });

            expect(overview.academicYearId).toBe("ay_2026");
            expect(overview.summary.studentAttendanceRate).toBe(90.0);
            expect(overview.summary.teacherAttendanceRate).toBe(100.0);
            expect(overview.summary.totalEnrolledStudents).toBe(150);
            expect(overview.summary.totalActiveTeachers).toBe(20);
            expect(overview.riskCounters.pendingCorrections).toBe(3);
        });
    });

    describe("getAbsenceRiskAlerts", () => {
        it("detects consecutive student absences >= 3 and flags as CRITICAL", async () => {
            vi.mocked(prisma.academicYear.findFirst).mockResolvedValue({ id: "ay_2026" } as any);
            vi.mocked(prisma.studentEnrollment.findMany).mockResolvedValue([
                {
                    id: "enr_1",
                    studentId: "st_1",
                    student: { id: "st_1", firstName: "Abebe", lastName: "Bikila" },
                    schoolGrade: { grade: { name: "Grade 9" } },
                    section: { name: "Section A" },
                    attendances: [
                        { date: new Date("2026-09-07"), status: "ABSENT" },
                        { date: new Date("2026-09-06"), status: "ABSENT" },
                        { date: new Date("2026-09-05"), status: "ABSENT" },
                        { date: new Date("2026-09-04"), status: "PRESENT" }
                    ]
                }
            ] as any);

            vi.mocked(prisma.section.findMany).mockResolvedValue([]);
            vi.mocked(prisma.teacher.findMany).mockResolvedValue([]);

            const alerts = await AttendanceAdminService.getAbsenceRiskAlerts("school_1", "ay_2026");

            expect(alerts.length).toBe(1);
            expect(alerts[0]!.type).toBe("STUDENT_CONSECUTIVE_ABSENCE");
            expect(alerts[0]!.severity).toBe("CRITICAL");
            expect(alerts[0]!.metric).toBe("3 Days Consecutive Absence");
        });
    });

    describe("Correction Approval & Rejection Workflow", () => {
        it("approves correction and updates student attendance with audit trail", async () => {
            vi.mocked(prisma.attendanceCorrection.findFirst).mockResolvedValue({
                id: "corr_1",
                organizationId: "school_1",
                academicYearId: "ay_2026",
                attendanceId: "att_1",
                enrollmentId: "enr_1",
                date: new Date("2026-09-05"),
                originalStatus: "ABSENT",
                requestedStatus: "EXCUSED",
                reasonCategory: "Medical Exemption",
                status: "PENDING"
            } as any);

            vi.mocked(prisma.studentAttendance.update).mockResolvedValue({ id: "att_1", status: "EXCUSED" } as any);
            vi.mocked(prisma.attendanceCorrection.update).mockResolvedValue({ id: "corr_1", status: "APPROVED" } as any);

            const result = await AttendanceAdminService.approveCorrection("school_1", "admin_user_1", "corr_1");

            expect(prisma.studentAttendance.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: "att_1" },
                    data: expect.objectContaining({ status: "EXCUSED" })
                })
            );
            expect(prisma.attendanceCorrection.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: "corr_1" },
                    data: expect.objectContaining({ status: "APPROVED", reviewedById: "admin_user_1" })
                })
            );
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "ATTENDANCE_CORRECTION_APPROVED",
                        organizationId: "school_1"
                    })
                })
            );
        });

        it("rejects correction with mandatory rejection reason", async () => {
            vi.mocked(prisma.attendanceCorrection.findFirst).mockResolvedValue({
                id: "corr_2",
                organizationId: "school_1",
                status: "PENDING"
            } as any);

            vi.mocked(prisma.attendanceCorrection.update).mockResolvedValue({ id: "corr_2", status: "REJECTED" } as any);

            const result = await AttendanceAdminService.rejectCorrection("school_1", "admin_user_1", "corr_2", "Medical certificate not provided");

            expect(prisma.attendanceCorrection.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: "corr_2" },
                    data: expect.objectContaining({
                        status: "REJECTED",
                        reviewedById: "admin_user_1",
                        rejectionReason: "Medical certificate not provided"
                    })
                })
            );
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "ATTENDANCE_CORRECTION_REJECTED",
                        organizationId: "school_1"
                    })
                })
            );
        });
    });
});
