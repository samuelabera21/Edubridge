import { describe, it, expect, vi, beforeEach } from "vitest";
import { EarlyWarningService } from "./early-warning.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { CommunicationService } from "../communication/communication.service.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        studentEnrollment: {
            findUnique: vi.fn(),
            findMany: vi.fn()
        },
        assessment: {
            findUnique: vi.fn()
        },
        studentResult: {
            findMany: vi.fn()
        },
        studentAttendance: {
            findMany: vi.fn()
        },
        supportFlag: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        },
        parent: {
            findFirst: vi.fn()
        },
        student: {
            findFirst: vi.fn()
        },
        teacher: {
            findFirst: vi.fn()
        },
        user: {
            findFirst: vi.fn()
        }
    }
}));

vi.mock("../communication/communication.service.js", () => ({
    CommunicationService: {
        createAnnouncement: vi.fn()
    }
}));

describe("EarlyWarningService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("evaluateAcademicPerformance", () => {
        const mockEnrollment = {
            id: "enr-1",
            student: {
                id: "student-1",
                firstName: "Abebe",
                lastName: "Kebede",
                userId: "user-student-1",
                parents: [
                    { parent: { id: "parent-1", userId: "user-parent-1" } }
                ]
            },
            section: { id: "sec-1", name: "Section A" },
            schoolGrade: { grade: { name: "Grade 9" } }
        };

        const mockAssessment = {
            id: "ass-1",
            title: "Math Midterm",
            maxScore: 100,
            teachingAssignment: {
                subject: { name: "Mathematics" },
                teacher: { id: "teacher-1" }
            }
        };

        it("1. Flags RED when score is critically low (< 50%)", async () => {
            vi.mocked(prisma.studentEnrollment.findUnique).mockResolvedValue(mockEnrollment as any);
            vi.mocked(prisma.assessment.findUnique).mockResolvedValue(mockAssessment as any);
            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([]);
            vi.mocked(prisma.supportFlag.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "admin-1" } as any);

            await EarlyWarningService.evaluateAcademicPerformance({
                organizationId: "school-1",
                enrollmentId: "enr-1",
                assessmentId: "ass-1",
                score: 42 // 42% (< 50%)
            });

            expect(prisma.supportFlag.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    enrollmentId: "enr-1",
                    type: "ACADEMIC",
                    description: expect.stringContaining("[RED]")
                })
            }));

            expect(CommunicationService.createAnnouncement).toHaveBeenCalledWith("school-1", expect.objectContaining({
                priority: "CRITICAL",
                targetDetails: expect.objectContaining({
                    studentIds: ["student-1"]
                })
            }));
        });

        it("2. Flags YELLOW when score needs attention (50% - 70%)", async () => {
            vi.mocked(prisma.studentEnrollment.findUnique).mockResolvedValue(mockEnrollment as any);
            vi.mocked(prisma.assessment.findUnique).mockResolvedValue(mockAssessment as any);
            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([]);
            vi.mocked(prisma.supportFlag.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "admin-1" } as any);

            await EarlyWarningService.evaluateAcademicPerformance({
                organizationId: "school-1",
                enrollmentId: "enr-1",
                assessmentId: "ass-1",
                score: 62 // 62% (50 - 70%)
            });

            expect(prisma.supportFlag.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    enrollmentId: "enr-1",
                    type: "ACADEMIC",
                    description: expect.stringContaining("[YELLOW]")
                })
            }));

            expect(CommunicationService.createAnnouncement).toHaveBeenCalledWith("school-1", expect.objectContaining({
                priority: "HIGH"
            }));
        });

        it("3. Flags RED for Sudden Drop (>= 20% drop from past average) even if score > 50%", async () => {
            vi.mocked(prisma.studentEnrollment.findUnique).mockResolvedValue(mockEnrollment as any);
            vi.mocked(prisma.assessment.findUnique).mockResolvedValue(mockAssessment as any);
            
            // Student past average is 90% (88, 92)
            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([
                { score: 88, assessment: { maxScore: 100 } },
                { score: 92, assessment: { maxScore: 100 } }
            ] as any);
            vi.mocked(prisma.supportFlag.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "admin-1" } as any);

            // Current score drops to 65% (Drop = 90 - 65 = 25% drop >= 20%)
            await EarlyWarningService.evaluateAcademicPerformance({
                organizationId: "school-1",
                enrollmentId: "enr-1",
                assessmentId: "ass-1",
                score: 65
            });

            expect(prisma.supportFlag.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    enrollmentId: "enr-1",
                    type: "ACADEMIC",
                    description: expect.stringMatching(/\[RED\].*ድንገተኛ ውድቀት/)
                })
            }));
        });

        it("4. Does NOT flag when score is above 70% with stable performance", async () => {
            vi.mocked(prisma.studentEnrollment.findUnique).mockResolvedValue(mockEnrollment as any);
            vi.mocked(prisma.assessment.findUnique).mockResolvedValue(mockAssessment as any);
            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([
                { score: 80, assessment: { maxScore: 100 } }
            ] as any);

            await EarlyWarningService.evaluateAcademicPerformance({
                organizationId: "school-1",
                enrollmentId: "enr-1",
                assessmentId: "ass-1",
                score: 85 // 85% > 70%, no drop
            });

            expect(prisma.supportFlag.create).not.toHaveBeenCalled();
            expect(CommunicationService.createAnnouncement).not.toHaveBeenCalled();
        });
    });

    describe("evaluateAttendance", () => {
        const mockEnrollment = {
            id: "enr-1",
            student: {
                id: "student-1",
                firstName: "Almaz",
                lastName: "Tesfaye",
                userId: "user-student-2",
                parents: [{ parent: { id: "p-2", userId: "user-parent-2" } }]
            },
            section: { id: "sec-1" },
            schoolGrade: { grade: { name: "Grade 10" } }
        };

        it("1. Flags YELLOW on 2 consecutive unexcused absences", async () => {
            vi.mocked(prisma.studentEnrollment.findUnique).mockResolvedValue(mockEnrollment as any);
            vi.mocked(prisma.studentAttendance.findMany)
                .mockResolvedValueOnce([
                    { status: "ABSENT" },
                    { status: "ABSENT" },
                    { status: "PRESENT" }
                ] as any) // recent records: 2 consecutive absences
                .mockResolvedValueOnce([
                    { status: "ABSENT" },
                    { status: "ABSENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" }
                ] as any); // cumulative: 8/10 = 80%

            vi.mocked(prisma.supportFlag.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "admin-1" } as any);

            await EarlyWarningService.evaluateAttendance({
                organizationId: "school-1",
                enrollmentId: "enr-1",
                academicYearId: "ay-1"
            });

            expect(prisma.supportFlag.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    type: "ATTENDANCE",
                    description: expect.stringContaining("[YELLOW]")
                })
            }));
        });

        it("2. Flags RED on 3 or more consecutive absences", async () => {
            vi.mocked(prisma.studentEnrollment.findUnique).mockResolvedValue(mockEnrollment as any);
            vi.mocked(prisma.studentAttendance.findMany)
                .mockResolvedValueOnce([
                    { status: "ABSENT" },
                    { status: "ABSENT" },
                    { status: "ABSENT" },
                    { status: "PRESENT" }
                ] as any)
                .mockResolvedValueOnce([
                    { status: "ABSENT" },
                    { status: "ABSENT" },
                    { status: "ABSENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" }
                ] as any);

            vi.mocked(prisma.supportFlag.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "admin-1" } as any);

            await EarlyWarningService.evaluateAttendance({
                organizationId: "school-1",
                enrollmentId: "enr-1",
                academicYearId: "ay-1"
            });

            expect(prisma.supportFlag.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    type: "ATTENDANCE",
                    description: expect.stringMatching(/\[RED\].*3 ተከታታይ ቀናት/)
                })
            }));
        });

        it("3. Flags RED under Ethiopian MoE policy when attendance is < 80%", async () => {
            vi.mocked(prisma.studentEnrollment.findUnique).mockResolvedValue(mockEnrollment as any);
            // 10 total days, 3 absences = 70% attendance (< 80%)
            vi.mocked(prisma.studentAttendance.findMany)
                .mockResolvedValueOnce([{ status: "ABSENT" }, { status: "PRESENT" }] as any)
                .mockResolvedValueOnce([
                    { status: "ABSENT" },
                    { status: "ABSENT" },
                    { status: "ABSENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" },
                    { status: "PRESENT" }
                ] as any);

            vi.mocked(prisma.supportFlag.findFirst).mockResolvedValue(null);
            vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "admin-1" } as any);

            await EarlyWarningService.evaluateAttendance({
                organizationId: "school-1",
                enrollmentId: "enr-1",
                academicYearId: "ay-1"
            });

            expect(prisma.supportFlag.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    type: "ATTENDANCE",
                    description: expect.stringMatching(/\[RED\].*የትምህርት ሚኒስቴር/)
                })
            }));
        });
    });

    describe("getFlagsForCurrentUser", () => {
        it("returns flags ONLY for parent's linked child", async () => {
            vi.mocked(prisma.parent.findFirst).mockResolvedValue({
                id: "parent-1",
                children: [
                    {
                        student: {
                            id: "child-1",
                            enrollments: [{ id: "enr-child-1" }]
                        }
                    }
                ]
            } as any);

            vi.mocked(prisma.studentEnrollment.findUnique).mockResolvedValue({
                id: "enr-child-1",
                student: { id: "child-1", firstName: "Lidj", lastName: "Kebede" },
                supportFlags: []
            } as any);
            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([]);
            vi.mocked(prisma.studentAttendance.findMany).mockResolvedValue([]);

            const results = await EarlyWarningService.getFlagsForCurrentUser("user-parent-1", "school-1");
            expect(results.length).toBe(1);
            expect(results[0]?.studentId).toBe("child-1");
        });
    });
});
