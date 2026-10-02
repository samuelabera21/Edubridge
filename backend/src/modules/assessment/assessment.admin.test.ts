import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "../../infrastructure/prisma/client.js";
import { AssessmentAdminService } from "./assessment.admin.service.js";
import { AssessmentService } from "./assessment.service.js";
import {
    getAdminOverview,
    getAdminResults,
    getAdminStudentResultDetail,
    getAdminFilterOptions,
    getSubjectAnalytics
} from "./assessment.controller.js";

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
        assessment: {
            count: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn()
        },
        studentResult: {
            count: vi.fn(),
            findMany: vi.fn()
        },
        schoolGrade: {
            findMany: vi.fn()
        },
        subject: {
            findMany: vi.fn()
        }
    }
}));

describe("AssessmentAdminService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getOverview", () => {
        it("calculates summary KPIs, grade performance, and subject performance with strict tenant and year isolation", async () => {
            const orgId = "org_school_1";
            const yearId = "ay_2026";

            vi.mocked(prisma.academicYear.findFirst).mockResolvedValue({
                id: yearId,
                name: "2026/2027",
                status: "ACTIVE",
                organizationId: orgId
            } as any);

            vi.mocked(prisma.assessment.count).mockResolvedValue(4);

            const mockResults = [
                {
                    id: "res_1",
                    score: 80,
                    enrollmentId: "enr_1",
                    enrollment: {
                        studentId: "stu_1",
                        student: { firstName: "Abebe", lastName: "Kebede" },
                        schoolGrade: { id: "sg_9", grade: { name: "Grade 9" } },
                        section: { id: "sec_a", name: "A" }
                    },
                    assessment: {
                        id: "asm_1",
                        title: "Midterm Exam",
                        maxScore: 100,
                        passingScore: 50,
                        teachingAssignment: {
                            schoolGrade: { id: "sg_9", grade: { name: "Grade 9" } },
                            section: { id: "sec_a", name: "A" },
                            subject: { id: "sub_math", name: "Mathematics", code: "MTH-01" }
                        }
                    }
                },
                {
                    id: "res_2",
                    score: 40,
                    enrollmentId: "enr_2",
                    enrollment: {
                        studentId: "stu_2",
                        student: { firstName: "Tigist", lastName: "Alemu" },
                        schoolGrade: { id: "sg_9", grade: { name: "Grade 9" } },
                        section: { id: "sec_a", name: "A" }
                    },
                    assessment: {
                        id: "asm_1",
                        title: "Midterm Exam",
                        maxScore: 100,
                        passingScore: 50,
                        teachingAssignment: {
                            schoolGrade: { id: "sg_9", grade: { name: "Grade 9" } },
                            section: { id: "sec_a", name: "A" },
                            subject: { id: "sub_math", name: "Mathematics", code: "MTH-01" }
                        }
                    }
                },
                {
                    id: "res_3",
                    score: 90,
                    enrollmentId: "enr_3",
                    enrollment: {
                        studentId: "stu_3",
                        student: { firstName: "Chala", lastName: "Bekele" },
                        schoolGrade: { id: "sg_10", grade: { name: "Grade 10" } },
                        section: { id: "sec_b", name: "B" }
                    },
                    assessment: {
                        id: "asm_2",
                        title: "English Quiz",
                        maxScore: 100,
                        passingScore: 50,
                        teachingAssignment: {
                            schoolGrade: { id: "sg_10", grade: { name: "Grade 10" } },
                            section: { id: "sec_b", name: "B" },
                            subject: { id: "sub_eng", name: "English", code: "ENG-01" }
                        }
                    }
                }
            ];

            vi.mocked(prisma.studentResult.findMany).mockResolvedValue(mockResults as any);

            const overview = await AssessmentAdminService.getOverview(orgId, { academicYearId: yearId });

            expect(prisma.studentResult.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        assessment: expect.objectContaining({
                            organizationId: orgId,
                            academicYearId: yearId
                        })
                    })
                })
            );

            expect(overview.summary.totalAssessments).toBe(4);
            expect(overview.summary.studentsWithResults).toBe(3);
            expect(overview.summary.totalResults).toBe(3);
            // Average = (80 + 40 + 90) / 3 = 70.0%
            expect(overview.summary.averageScore).toBe(70);
            // Pass rate = 2/3 = 66.7%
            expect(overview.summary.passRate).toBe(66.7);

            // Grade performance breakdown
            expect(overview.gradePerformance).toHaveLength(2);
            const grade9 = overview.gradePerformance.find(g => g.gradeName === "Grade 9");
            expect(grade9).toBeDefined();
            expect(grade9?.students).toBe(2);
            expect(grade9?.results).toBe(2);
            expect(grade9?.average).toBe(60);
            expect(grade9?.passRate).toBe(50);

            // Subject performance breakdown
            expect(overview.subjectPerformance).toHaveLength(2);
            const math = overview.subjectPerformance.find(s => s.subjectName === "Mathematics");
            expect(math?.results).toBe(2);
            expect(math?.average).toBe(60);
            expect(math?.passRate).toBe(50);
        });

        it("returns clean empty state metrics when no results exist in scope", async () => {
            const orgId = "org_school_1";
            vi.mocked(prisma.academicYear.findFirst).mockResolvedValue({
                id: "ay_2026",
                name: "2026/2027",
                status: "ACTIVE"
            } as any);

            vi.mocked(prisma.assessment.count).mockResolvedValue(0);
            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([]);

            const overview = await AssessmentAdminService.getOverview(orgId, {});

            expect(overview.summary.totalAssessments).toBe(0);
            expect(overview.summary.studentsWithResults).toBe(0);
            expect(overview.summary.totalResults).toBe(0);
            expect(overview.summary.averageScore).toBe(0);
            expect(overview.summary.passRate).toBe(0);
            expect(overview.gradePerformance).toEqual([]);
            expect(overview.subjectPerformance).toEqual([]);
        });
    });

    describe("getSchoolResults", () => {
        it("returns paginated results formatted with all reporting dimensions", async () => {
            const orgId = "org_school_1";

            vi.mocked(prisma.academicYear.findFirst).mockResolvedValue({ id: "ay_2026", name: "2026/2027" } as any);
            vi.mocked(prisma.studentResult.count).mockResolvedValue(1);
            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([
                {
                    id: "res_1",
                    score: 75,
                    feedback: "Good work",
                    createdAt: new Date("2026-09-01T10:00:00Z"),
                    enrollmentId: "enr_1",
                    enrollment: {
                        student: {
                            id: "stu_1",
                            studentId: "STU-001",
                            firstName: "Abebe",
                            lastName: "Kebede"
                        },
                        schoolGrade: { id: "sg_8", grade: { name: "Grade 8" } },
                        section: { id: "sec_a", name: "A" }
                    },
                    assessment: {
                        id: "asm_1",
                        title: "Midterm Exam",
                        type: "EXAM",
                        maxScore: 100,
                        passingScore: 50,
                        dueDate: new Date("2026-09-01"),
                        academicYear: { name: "2026/2027" },
                        teachingAssignment: {
                            schoolGrade: { id: "sg_8", grade: { name: "Grade 8" } },
                            section: { id: "sec_a", name: "A" },
                            subject: { id: "sub_math", name: "Mathematics", code: "MTH" },
                            teacher: { firstName: "Solomon", lastName: "Tekle" }
                        }
                    }
                }
            ] as any);

            const result = await AssessmentAdminService.getSchoolResults(orgId, {
                academicYearId: "ay_2026",
                search: "Abebe",
                page: 1,
                limit: 20
            });

            expect(result.pagination.total).toBe(1);
            expect(result.pagination.page).toBe(1);
            expect(result.results).toHaveLength(1);

            const item = result.results[0]!;
            expect(item.student?.fullName).toBe("Abebe Kebede");
            expect(item.student?.studentId).toBe("STU-001");
            expect(item.grade).toBe("Grade 8");
            expect(item.section).toBe("A");
            expect(item.subject?.name).toBe("Mathematics");
            expect(item.teacher).toBe("Solomon Tekle");
            expect(item.score).toBe(75);
            expect(item.maxScore).toBe(100);
            expect(item.percentage).toBe(75);
            expect(item.isPassing).toBe(true);
            expect(item.resultStatus).toBe("PASS");
        });
    });

    describe("getStudentResultDetail", () => {
        it("returns full student assessment profile and subject summary", async () => {
            const orgId = "org_school_1";
            const enrollmentId = "enr_1";

            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue({
                id: enrollmentId,
                organizationId: orgId,
                student: {
                    id: "stu_1",
                    studentId: "STU-001",
                    firstName: "Abebe",
                    lastName: "Kebede",
                    gender: "MALE",
                    emergencyContactPhone: "+251911223344"
                },
                schoolGrade: { grade: { name: "Grade 8" } },
                section: { name: "B" },
                academicYear: { name: "2026/2027" }
            } as any);

            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([
                {
                    id: "res_1",
                    score: 80,
                    assessment: {
                        id: "asm_1",
                        title: "Quiz 1",
                        type: "QUIZ",
                        maxScore: 100,
                        passingScore: 50,
                        dueDate: new Date("2026-09-01"),
                        teachingAssignment: {
                            subject: { id: "sub_1", name: "Mathematics", code: "MATH-01" },
                            teacher: { firstName: "Solomon", lastName: "Tekle" }
                        }
                    }
                },
                {
                    id: "res_2",
                    score: 70,
                    assessment: {
                        id: "asm_2",
                        title: "Quiz 2",
                        type: "QUIZ",
                        maxScore: 100,
                        passingScore: 50,
                        dueDate: new Date("2026-09-05"),
                        teachingAssignment: {
                            subject: { id: "sub_1", name: "Mathematics", code: "MATH-01" },
                            teacher: { firstName: "Solomon", lastName: "Tekle" }
                        }
                    }
                }
            ] as any);

            const detail = await AssessmentAdminService.getStudentResultDetail(orgId, enrollmentId);

            expect(detail.student.fullName).toBe("Abebe Kebede");
            expect(detail.enrollment.grade).toBe("Grade 8");
            expect(detail.summary.totalAssessments).toBe(2);
            expect(detail.summary.overallPercentage).toBe(75);
            expect(detail.summary.passCount).toBe(2);
            expect(detail.summary.failCount).toBe(0);
            expect(detail.subjects).toHaveLength(1);
            expect(detail.subjects[0]!.subjectName).toBe("Mathematics");
            expect(detail.subjects[0]!.averagePercentage).toBe(75);
        });

        it("throws error if enrollment does not belong to organization", async () => {
            vi.mocked(prisma.studentEnrollment.findFirst).mockResolvedValue(null);

            await expect(
                AssessmentAdminService.getStudentResultDetail("org_1", "enr_foreign")
            ).rejects.toThrow("Student enrollment not found in this organization");
        });
    });

    describe("AssessmentService.getSubjectAnalytics Security Fix", () => {
        it("verifies organizationId and academicYearId are passed in where clause", async () => {
            const orgId = "org_test_scope";
            const yearId = "ay_test_year";

            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([]);

            await AssessmentService.getSubjectAnalytics(orgId, yearId);

            expect(prisma.studentResult.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        assessment: {
                            organizationId: orgId,
                            academicYearId: yearId
                        }
                    }
                })
            );
        });
    });

    describe("Controller Authorization & Scope Handling", () => {
        it("rejects getAdminOverview when school scope is missing", async () => {
            const req: any = { query: {} };
            const res: any = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            };

            await getAdminOverview(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ error: "Missing school scope" });
        });

        it("calls AssessmentAdminService.getOverview with scope and query parameters", async () => {
            const req: any = {
                accessScope: { id: "org_school_1" },
                query: { academicYearId: "ay_2026", schoolGradeId: "sg_8" }
            };
            const res: any = {
                json: vi.fn()
            };

            vi.mocked(prisma.academicYear.findFirst).mockResolvedValue({ id: "ay_2026", name: "2026/2027" } as any);
            vi.mocked(prisma.assessment.count).mockResolvedValue(0);
            vi.mocked(prisma.studentResult.findMany).mockResolvedValue([]);

            await getAdminOverview(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                summary: expect.any(Object),
                gradePerformance: expect.any(Array),
                subjectPerformance: expect.any(Array)
            }));
        });
    });

    describe("getStudentsRoster", () => {
        it("returns filtered student enrollments matching grade and search query", async () => {
            const orgId = "org_school_1";
            vi.mocked(prisma.academicYear.findFirst).mockResolvedValue({ id: "ay_2026", name: "2026/2027" } as any);
            vi.mocked(prisma.studentEnrollment.findMany).mockResolvedValue([
                {
                    id: "enr_1",
                    student: { firstName: "Sami", lastName: "Abera", studentId: "STU-001" },
                    schoolGrade: { id: "sg_12", grade: { name: "Grade 12" } },
                    section: { id: "sec_a", name: "A" }
                }
            ] as any);

            const roster = await AssessmentAdminService.getStudentsRoster(orgId, {
                academicYearId: "ay_2026",
                schoolGradeId: "sg_12",
                search: "Sami"
            });

            expect(roster).toHaveLength(1);
            expect(roster[0]!.student.firstName).toBe("Sami");
            expect(prisma.studentEnrollment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        organizationId: orgId,
                        schoolGradeId: "sg_12"
                    })
                })
            );
        });
    });
});
