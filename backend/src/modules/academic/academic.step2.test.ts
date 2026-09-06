import { describe, it, expect, vi, beforeEach } from "vitest";
import { AcademicService } from "./academic.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { updateProfileHandler } from "../school/school.controller.js";
import { Request, Response } from "express";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        academicYear: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
        },
        grade: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
        },
        schoolGrade: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
        },
        section: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        subject: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
        },
        schoolSubject: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            delete: vi.fn(),
        },
        schoolGradeSubject: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            upsert: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
        },
        academicCalendar: {
            findUnique: vi.fn(),
            create: vi.fn(),
        },
        academicPeriod: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
        },
        studentEnrollment: {
            count: vi.fn(),
        },
        teachingAssignment: {
            count: vi.fn(),
        },
        schoolProfile: {
            upsert: vi.fn(),
        },
        organizationUnit: {
            update: vi.fn(),
        },
    },
}));

describe("Step 2 — School & Academic-Year Configuration", () => {
    const schoolA = "school-org-A";
    const schoolB = "school-org-B";
    const yearId = "year-2027";

    const mockAcademicYear = {
        id: yearId,
        organizationId: schoolA,
        name: "2027/28 E.C.",
        startDate: new Date("2027-09-01"),
        endDate: new Date("2028-06-30"),
        status: "PLANNED",
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // =========================================================================
    // 1. MASTER GRADE REUSE & SCHOOL GRADE CREATION
    // =========================================================================
    describe("Grade Master and School Grade Workflow", () => {
        it("should reuse an existing master grade if name or level matches instead of failing", async () => {
            const existingGrade = { id: "grade-9", organizationId: schoolA, name: "Grade 9", level: 9 };
            vi.mocked(prisma.grade.findFirst).mockResolvedValue(existingGrade as any);

            const result = await AcademicService.createGrade(schoolA, { name: "Grade 9", level: 9 });

            expect(result).toEqual(existingGrade);
            expect(prisma.grade.create).not.toHaveBeenCalled();
        });

        it("should create a new master grade if it does not already exist", async () => {
            vi.mocked(prisma.grade.findFirst).mockResolvedValue(null);
            const newGrade = { id: "grade-10", organizationId: schoolA, name: "Grade 10", level: 10 };
            vi.mocked(prisma.grade.create).mockResolvedValue(newGrade as any);

            const result = await AcademicService.createGrade(schoolA, { name: "Grade 10", level: 10 });

            expect(result).toEqual(newGrade);
            expect(prisma.grade.create).toHaveBeenCalledWith({
                data: { organizationId: schoolA, name: "Grade 10", level: 10 }
            });
        });

        it("should reject creating a grade with a negative level", async () => {
            await expect(AcademicService.createGrade(schoolA, { name: "Invalid", level: -1 }))
                .rejects.toThrow("Grade level must be a non-negative number");
        });

        it("should activate a master grade for a PLANNED academic year", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue(mockAcademicYear as any);
            vi.mocked(prisma.grade.findUnique).mockResolvedValue({ id: "grade-9", organizationId: schoolA } as any);
            vi.mocked(prisma.schoolGrade.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.schoolGrade.create).mockResolvedValue({ id: "sg-1", academicYearId: yearId, gradeId: "grade-9" } as any);

            const result = await AcademicService.createSchoolGrade(schoolA, yearId, "grade-9");

            expect(result.id).toBe("sg-1");
            expect(prisma.schoolGrade.create).toHaveBeenCalledWith(expect.objectContaining({
                data: { academicYearId: yearId, gradeId: "grade-9" }
            }));
        });

        it("should return existing SchoolGrade when activating an already offered grade without throwing duplicate error", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue(mockAcademicYear as any);
            vi.mocked(prisma.grade.findUnique).mockResolvedValue({ id: "grade-9", organizationId: schoolA } as any);
            const existingSchoolGrade = { id: "sg-existing", academicYearId: yearId, gradeId: "grade-9" };
            vi.mocked(prisma.schoolGrade.findUnique).mockResolvedValue(existingSchoolGrade as any);

            const result = await AcademicService.createSchoolGrade(schoolA, yearId, "grade-9");

            expect(result).toEqual(existingSchoolGrade);
            expect(prisma.schoolGrade.create).not.toHaveBeenCalled();
        });

        it("should prevent School A from activating grades for School B's academic year", async () => {
            vi.mocked(prisma.academicYear.findUnique).mockResolvedValue(null); // Not found in schoolA

            await expect(AcademicService.createSchoolGrade(schoolA, "other-year", "grade-9"))
                .rejects.toThrow("Academic Year not found in this school");
        });

        it("should prevent deleting a SchoolGrade if enrolled students exist", async () => {
            vi.mocked(prisma.schoolGrade.findUnique).mockResolvedValue({
                id: "sg-1",
                academicYear: { organizationId: schoolA },
                sections: [],
                studentEnrollments: [{ id: "enr-1" }],
                teachingAssignments: [],
            } as any);

            await expect(AcademicService.deleteSchoolGrade(schoolA, "sg-1"))
                .rejects.toThrow("Cannot delete grade: 1 students are currently enrolled in this grade");
        });
    });

    // =========================================================================
    // 2. SECTION CONFIGURATION & CAPACITY
    // =========================================================================
    describe("Section Operations and Capacity Validation", () => {
        const mockSchoolGrade = {
            id: "sg-1",
            academicYear: { organizationId: schoolA }
        };

        it("should create a section with valid capacity", async () => {
            vi.mocked(prisma.schoolGrade.findUnique).mockResolvedValue(mockSchoolGrade as any);
            vi.mocked(prisma.section.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.section.create).mockResolvedValue({
                id: "sec-1",
                schoolGradeId: "sg-1",
                name: "A",
                capacity: 50
            } as any);

            const result = await AcademicService.createSection(schoolA, "sg-1", "A", 50);

            expect(result.name).toBe("A");
            expect(result.capacity).toBe(50);
        });

        it("should reject creating a section with capacity less than 1", async () => {
            vi.mocked(prisma.schoolGrade.findUnique).mockResolvedValue(mockSchoolGrade as any);

            await expect(AcademicService.createSection(schoolA, "sg-1", "A", 0))
                .rejects.toThrow("Section capacity must be a positive integer greater than or equal to 1");

            await expect(AcademicService.createSection(schoolA, "sg-1", "A", -10))
                .rejects.toThrow("Section capacity must be a positive integer greater than or equal to 1");
        });

        it("should prevent creating a duplicate section name within the same grade", async () => {
            vi.mocked(prisma.schoolGrade.findUnique).mockResolvedValue(mockSchoolGrade as any);
            vi.mocked(prisma.section.findUnique).mockResolvedValue({ id: "sec-a", name: "A" } as any);

            await expect(AcademicService.createSection(schoolA, "sg-1", "A", 45))
                .rejects.toThrow('Section "A" already exists in this grade');
        });

        it("should prevent School B from creating a section inside School A's grade", async () => {
            vi.mocked(prisma.schoolGrade.findUnique).mockResolvedValue({
                id: "sg-1",
                academicYear: { organizationId: schoolA }
            } as any);

            await expect(AcademicService.createSection(schoolB, "sg-1", "A", 50))
                .rejects.toThrow("Grade not found in this school");
        });

        it("should prevent reducing section capacity below the count of currently enrolled students", async () => {
            vi.mocked(prisma.section.findUnique).mockResolvedValue({
                id: "sec-1",
                schoolGradeId: "sg-1",
                name: "A",
                capacity: 50,
                schoolGrade: { academicYear: { organizationId: schoolA } },
                studentEnrollments: [{ id: "enr-1" }, { id: "enr-2" }, { id: "enr-3" }] // 3 enrolled
            } as any);

            await expect(AcademicService.updateSection(schoolA, "sec-1", { capacity: 2 }))
                .rejects.toThrow("Cannot reduce section capacity to 2: 3 students are currently enrolled in this section");
        });

        it("should prevent deleting a section if enrolled students exist", async () => {
            vi.mocked(prisma.section.findUnique).mockResolvedValue({
                id: "sec-1",
                schoolGrade: { academicYear: { organizationId: schoolA } },
                studentEnrollments: [{ id: "enr-1" }],
                teachingAssignments: []
            } as any);

            await expect(AcademicService.deleteSection(schoolA, "sec-1"))
                .rejects.toThrow("Cannot delete section: 1 enrolled students depend on it");
        });
    });

    // =========================================================================
    // 3. SUBJECT MASTER, YEAR ALLOCATION & GRADE CURRICULUM (SchoolGradeSubject)
    // =========================================================================
    describe("Subject Master, Year Allocation and Grade Curriculum", () => {
        it("should reuse an existing master subject if name already exists", async () => {
            const existing = { id: "sub-1", organizationId: schoolA, name: "Physics", code: "PHYS-101" };
            vi.mocked(prisma.subject.findFirst).mockResolvedValue(existing as any);

            const result = await AcademicService.createSubject(schoolA, { name: "Physics", code: "PHYS-101" });

            expect(result).toEqual(existing);
            expect(prisma.subject.create).not.toHaveBeenCalled();
        });

        it("should assign a subject to a grade with configurable weekly periods", async () => {
            vi.mocked(prisma.schoolGrade.findUnique).mockResolvedValue({
                id: "sg-1",
                academicYearId: yearId,
                academicYear: { organizationId: schoolA }
            } as any);
            vi.mocked(prisma.subject.findUnique).mockResolvedValue({ id: "sub-1", organizationId: schoolA } as any);
            vi.mocked(prisma.schoolSubject.findUnique).mockResolvedValue(null);
            vi.mocked(prisma.schoolSubject.create).mockResolvedValue({ id: "ss-1" } as any);
            vi.mocked(prisma.schoolGradeSubject.upsert).mockResolvedValue({
                id: "sgs-1",
                schoolGradeId: "sg-1",
                subjectId: "sub-1",
                weeklyPeriods: 5,
                subject: { name: "Mathematics" }
            } as any);

            const result = await AcademicService.assignSubjectToGrade(schoolA, "sg-1", "sub-1", 5);

            expect(result.weeklyPeriods).toBe(5);
            expect(prisma.schoolGradeSubject.upsert).toHaveBeenCalledWith(expect.objectContaining({
                create: expect.objectContaining({ weeklyPeriods: 5 }),
                update: expect.objectContaining({ weeklyPeriods: 5 })
            }));
        });

        it("should reject weekly periods less than 1", async () => {
            vi.mocked(prisma.schoolGrade.findUnique).mockResolvedValue({
                id: "sg-1",
                academicYearId: yearId,
                academicYear: { organizationId: schoolA }
            } as any);
            vi.mocked(prisma.subject.findUnique).mockResolvedValue({ id: "sub-1", organizationId: schoolA } as any);

            await expect(AcademicService.assignSubjectToGrade(schoolA, "sg-1", "sub-1", 0))
                .rejects.toThrow("Weekly periods must be a positive integer greater than or equal to 1");
        });

        it("should prevent removing a subject from an academic year if it is assigned to any grade curriculum", async () => {
            vi.mocked(prisma.schoolSubject.findUnique).mockResolvedValue({
                id: "ss-1",
                academicYearId: yearId,
                subjectId: "sub-1",
                academicYear: { organizationId: schoolA }
            } as any);
            vi.mocked(prisma.schoolGradeSubject.count).mockResolvedValue(2); // Assigned to 2 grades

            await expect(AcademicService.deleteSchoolSubject(schoolA, yearId, "sub-1"))
                .rejects.toThrow("Cannot remove subject from academic year: it is currently assigned to 2 grade level(s)");
        });

        it("should prevent removing a subject from a grade if teaching assignments exist", async () => {
            vi.mocked(prisma.schoolGradeSubject.findUnique).mockResolvedValue({
                id: "sgs-1",
                schoolGradeId: "sg-1",
                subjectId: "sub-1",
                schoolGrade: { academicYear: { organizationId: schoolA } }
            } as any);
            vi.mocked(prisma.teachingAssignment.count).mockResolvedValue(1); // 1 active teaching assignment

            await expect(AcademicService.removeSubjectFromGrade(schoolA, "sg-1", "sub-1"))
                .rejects.toThrow("Cannot remove subject: active teaching assignments (1) exist for this grade");
        });
    });

    // =========================================================================
    // 4. ACADEMIC CALENDAR & PERIODS VALIDATION
    // =========================================================================
    describe("Academic Calendar and Periods Validation", () => {
        const mockCalendar = {
            id: "cal-1",
            academicYearId: yearId,
            academicYear: mockAcademicYear, // Sep 1, 2027 - Jun 30, 2028
            periods: [
                {
                    id: "period-1",
                    name: "Semester 1",
                    startDate: new Date("2027-09-15"),
                    endDate: new Date("2028-01-31"),
                    type: "SEMESTER"
                }
            ]
        };

        it("should reject creating a period when startDate >= endDate", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);

            await expect(AcademicService.createAcademicPeriod(schoolA, "cal-1", {
                name: "Invalid Semester",
                startDate: "2028-02-01",
                endDate: "2028-01-01",
                type: "SEMESTER"
            })).rejects.toThrow("Period startDate must be strictly before endDate");
        });

        it("should reject creating a period outside the academic year date range", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);

            // Starts before year start (Aug 15 < Sep 01)
            await expect(AcademicService.createAcademicPeriod(schoolA, "cal-1", {
                name: "Early Term",
                startDate: "2027-08-15",
                endDate: "2027-10-15",
                type: "TERM"
            })).rejects.toThrow("must fall within academic year range");

            // Ends after year end (Jul 15 > Jun 30)
            await expect(AcademicService.createAcademicPeriod(schoolA, "cal-1", {
                name: "Late Term",
                startDate: "2028-05-01",
                endDate: "2028-07-15",
                type: "TERM"
            })).rejects.toThrow("must fall within academic year range");
        });

        it("should reject creating overlapping academic periods in the same calendar", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);

            // Overlaps with Semester 1 (Sep 15 - Jan 31): starts Jan 15
            await expect(AcademicService.createAcademicPeriod(schoolA, "cal-1", {
                name: "Semester 2 (Overlapping)",
                startDate: "2028-01-15",
                endDate: "2028-06-15",
                type: "SEMESTER"
            })).rejects.toThrow('Academic period dates overlap with existing period "Semester 1"');
        });

        it("should successfully create a valid non-overlapping academic period", async () => {
            vi.mocked(prisma.academicCalendar.findUnique).mockResolvedValue(mockCalendar as any);
            const newPeriod = {
                id: "period-2",
                name: "Semester 2",
                startDate: new Date("2028-02-15"),
                endDate: new Date("2028-06-25"),
                type: "SEMESTER"
            };
            vi.mocked(prisma.academicPeriod.create).mockResolvedValue(newPeriod as any);

            const result = await AcademicService.createAcademicPeriod(schoolA, "cal-1", {
                name: "Semester 2",
                startDate: "2028-02-15",
                endDate: "2028-06-25",
                type: "SEMESTER"
            });

            expect(result.name).toBe("Semester 2");
            expect(prisma.academicPeriod.create).toHaveBeenCalled();
        });
    });

    // =========================================================================
    // 5. SCHOOL PROFILE LIFECYCLE BYPASS PROTECTION
    // =========================================================================
    describe("School Profile Lifecycle Integrity", () => {
        it("should delegate activation to AcademicService instead of directly updating database status", async () => {
            const activateSpy = vi.spyOn(AcademicService, "activateAcademicYear").mockResolvedValue({
                id: "year-2",
                status: "ACTIVE"
            } as any);

            vi.mocked(prisma.academicYear.findFirst).mockResolvedValue({
                id: "year-1",
                status: "ACTIVE"
            } as any);

            vi.mocked(prisma.schoolProfile.upsert).mockResolvedValue({ id: "sp-1" } as any);

            const req = {
                accessScope: { id: schoolA, type: "SCHOOL" },
                body: {
                    schoolName: "Test School",
                    activeAcademicYearId: "year-2"
                }
            } as unknown as Request;

            const res = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn()
            } as unknown as Response;

            await updateProfileHandler(req, res);

            expect(activateSpy).toHaveBeenCalledWith(schoolA, "year-2");
            // Verify NO raw bulk updateMany occurred setting status to COMPLETED
            expect(prisma.academicYear.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({
                data: { status: "COMPLETED" }
            }));
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Profile updated successfully"
            }));
        });
    });
});
