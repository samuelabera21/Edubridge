import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../infrastructure/prisma/client.js";
import { SchoolDashboardService } from "./school.dashboard.service.js";

describe("Step 7: School Administrator Dashboard Integration Test Suite", () => {
    let schoolAId: string;
    let schoolBId: string;
    let emptySchoolId: string;

    let adminAUserId: string;

    let activeYearAId: string;
    let completedYearAId: string;
    let activeYearBId: string;

    let grade9AId: string;
    let section9AId: string;
    let section9BId: string;

    let grade10AId: string;
    let section10AId: string;

    let schoolBGradeId: string;
    let schoolBSectionId: string;

    let teacher1AId: string;
    let teacher2AId: string;
    let teacherUnassignedAId: string;
    let teacherBId: string;

    let subjectMathId: string;
    let subjectEnglishId: string;

    let period1Id: string;
    let period2Id: string;

    let ta9AMathId: string;
    let ta9AEnglishId: string;

    let studentPlacedId: string;
    let studentUnplacedId: string;
    let studentSchoolBId: string;

    beforeAll(async () => {
        // 1. Schools
        const schoolA = await prisma.organizationUnit.create({
            data: { name: "Step 7 Leadership Academy A", type: "SCHOOL" }
        });
        schoolAId = schoolA.id;

        const schoolB = await prisma.organizationUnit.create({
            data: { name: "Step 7 High School B", type: "SCHOOL" }
        });
        schoolBId = schoolB.id;

        const emptySchool = await prisma.organizationUnit.create({
            data: { name: "Step 7 Brand New School", type: "SCHOOL" }
        });
        emptySchoolId = emptySchool.id;

        // 2. Admin User
        adminAUserId = `admin-s7-${Date.now()}`;
        await prisma.user.create({
            data: {
                id: adminAUserId,
                email: `principal.s7.${Date.now()}@edubridge.local`,
                name: "Principal Aster"
            }
        });

        // 3. Academic Years
        const activeYearA = await prisma.academicYear.create({
            data: {
                organizationId: schoolAId,
                name: "2026/2027 Active Year (S7-A)",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "ACTIVE"
            }
        });
        activeYearAId = activeYearA.id;

        const completedYearA = await prisma.academicYear.create({
            data: {
                organizationId: schoolAId,
                name: "2025/2026 Completed Year (S7-A)",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
                status: "COMPLETED"
            }
        });
        completedYearAId = completedYearA.id;

        const activeYearB = await prisma.academicYear.create({
            data: {
                organizationId: schoolBId,
                name: "2026/2027 Active Year (S7-B)",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "ACTIVE"
            }
        });
        activeYearBId = activeYearB.id;

        // 4. Grades & Sections for School A (Active Year)
        const g9 = await prisma.grade.create({
            data: { organizationId: schoolAId, name: "Grade 9", level: 9 }
        });
        const sg9A = await prisma.schoolGrade.create({
            data: { academicYearId: activeYearAId, gradeId: g9.id, status: "ACTIVE" }
        });
        grade9AId = sg9A.id;

        const sec9A = await prisma.section.create({
            data: { schoolGradeId: sg9A.id, name: "Section A", capacity: 40, status: "ACTIVE" }
        });
        section9AId = sec9A.id;

        const sec9B = await prisma.section.create({
            data: { schoolGradeId: sg9A.id, name: "Section B", capacity: 40, status: "ACTIVE" }
        });
        section9BId = sec9B.id;

        const g10 = await prisma.grade.create({
            data: { organizationId: schoolAId, name: "Grade 10", level: 10 }
        });
        const sg10A = await prisma.schoolGrade.create({
            data: { academicYearId: activeYearAId, gradeId: g10.id, status: "ACTIVE" }
        });
        grade10AId = sg10A.id;

        const sec10A = await prisma.section.create({
            data: { schoolGradeId: sg10A.id, name: "Section A", capacity: 35, status: "ACTIVE" }
        });
        section10AId = sec10A.id;

        // School B Grade & Section
        const gSchoolB = await prisma.grade.create({
            data: { organizationId: schoolBId, name: "Grade 9", level: 9 }
        });
        const sgB = await prisma.schoolGrade.create({
            data: { academicYearId: activeYearBId, gradeId: gSchoolB.id, status: "ACTIVE" }
        });
        schoolBGradeId = sgB.id;
        const secB = await prisma.section.create({
            data: { schoolGradeId: sgB.id, name: "Section A", capacity: 40, status: "ACTIVE" }
        });
        schoolBSectionId = secB.id;

        // 5. Teachers
        const t1 = await prisma.teacher.create({
            data: {
                organizationId: schoolAId,
                firstName: "Mulugeta",
                lastName: "Tesfaye",
                employmentStatus: "ACTIVE"
            }
        });
        teacher1AId = t1.id;

        const t2 = await prisma.teacher.create({
            data: {
                organizationId: schoolAId,
                firstName: "Almaz",
                lastName: "Bekele",
                employmentStatus: "ACTIVE"
            }
        });
        teacher2AId = t2.id;

        const tUnassigned = await prisma.teacher.create({
            data: {
                organizationId: schoolAId,
                firstName: "Tadesse",
                lastName: "Alemu",
                employmentStatus: "ACTIVE"
            }
        });
        teacherUnassignedAId = tUnassigned.id;

        const tSchoolB = await prisma.teacher.create({
            data: {
                organizationId: schoolBId,
                firstName: "Solomon",
                lastName: "Desta",
                employmentStatus: "ACTIVE"
            }
        });
        teacherBId = tSchoolB.id;

        // 6. Subjects
        const sMath = await prisma.subject.create({
            data: { organizationId: schoolAId, name: "Mathematics", code: "MTH-S7" }
        });
        subjectMathId = sMath.id;

        const sEng = await prisma.subject.create({
            data: { organizationId: schoolAId, name: "English", code: "ENG-S7" }
        });
        subjectEnglishId = sEng.id;

        // 7. Periods
        const p1 = await prisma.classPeriod.create({
            data: { organizationId: schoolAId, name: "P1", startTime: "08:00", endTime: "08:45", isBreak: false }
        });
        period1Id = p1.id;

        const p2 = await prisma.classPeriod.create({
            data: { organizationId: schoolAId, name: "P2", startTime: "08:50", endTime: "09:35", isBreak: false }
        });
        period2Id = p2.id;

        // 8. Teaching Assignments (Active Year School A)
        // 9A Math: 2 periods per week
        const ta1 = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                teacherId: teacher1AId,
                subjectId: subjectMathId,
                periodsPerWeek: 2,
                status: "ACTIVE"
            }
        });
        ta9AMathId = ta1.id;

        // 9A English: 1 period per week
        const ta2 = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                teacherId: teacher2AId,
                subjectId: subjectEnglishId,
                periodsPerWeek: 1,
                status: "ACTIVE"
            }
        });
        ta9AEnglishId = ta2.id;

        // 9. Timetable Slots (Active Year School A)
        // Schedule Math (1 out of 2 scheduled)
        await prisma.timetable.create({
            data: {
                organizationId: schoolAId,
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9AMathId,
                classPeriodId: period1Id,
                dayOfWeek: 1
            }
        });

        // 10. Students & Enrollments
        // Placed Student in 9A
        const stu1 = await prisma.student.create({
            data: {
                studentId: `STU-S7-1-${Date.now()}`,
                firstName: "Abebe",
                lastName: "Kebede",
                fatherName: "Kebede",
                gender: "MALE"
            }
        });
        studentPlacedId = stu1.id;

        await prisma.studentEnrollment.create({
            data: {
                studentId: studentPlacedId,
                organizationId: schoolAId,
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                status: "ENROLLED"
            }
        });

        // Unplaced Student in School A
        const stu2 = await prisma.student.create({
            data: {
                studentId: `STU-S7-2-${Date.now()}`,
                firstName: "Selam",
                lastName: "Haile",
                fatherName: "Haile",
                gender: "FEMALE"
            }
        });
        studentUnplacedId = stu2.id;

        await prisma.studentEnrollment.create({
            data: {
                studentId: studentUnplacedId,
                organizationId: schoolAId,
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: null, // Unplaced!
                status: "ENROLLED"
            }
        });

        // School B Student (Tenant Isolation verification)
        const stuB = await prisma.student.create({
            data: {
                studentId: `STU-S7-B-${Date.now()}`,
                firstName: "Kidus",
                lastName: "Yohannes",
                fatherName: "Yohannes",
                gender: "MALE"
            }
        });
        studentSchoolBId = stuB.id;

        await prisma.studentEnrollment.create({
            data: {
                studentId: studentSchoolBId,
                organizationId: schoolBId,
                academicYearId: activeYearBId,
                schoolGradeId: schoolBGradeId,
                sectionId: schoolBSectionId,
                status: "ENROLLED"
            }
        });

        // 11. Audit Log Activity
        await prisma.auditLog.create({
            data: {
                organizationId: schoolAId,
                userId: adminAUserId,
                action: "TIMETABLE_SLOT_ASSIGNED",
                resource: "Timetable",
                resourceId: ta9AMathId
            }
        });

        await prisma.auditLog.create({
            data: {
                organizationId: schoolAId,
                userId: adminAUserId,
                action: "STUDENT_SECTION_PLACED",
                resource: "StudentEnrollment",
                resourceId: studentPlacedId
            }
        });
    });

    afterAll(async () => {
        // Cleanup all records created in this test suite
        await prisma.auditLog.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId, emptySchoolId] } } });
        await prisma.timetable.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId, emptySchoolId] } } });
        await prisma.teachingAssignment.deleteMany({ where: { academicYearId: { in: [activeYearAId, completedYearAId, activeYearBId] } } });
        await prisma.studentEnrollment.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId, emptySchoolId] } } });
        await prisma.student.deleteMany({ where: { id: { in: [studentPlacedId, studentUnplacedId, studentSchoolBId] } } });
        await prisma.section.deleteMany({ where: { schoolGradeId: { in: [grade9AId, grade10AId, schoolBGradeId] } } });
        await prisma.schoolGrade.deleteMany({ where: { academicYearId: { in: [activeYearAId, completedYearAId, activeYearBId] } } });
        await prisma.grade.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId, emptySchoolId] } } });
        await prisma.classPeriod.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId, emptySchoolId] } } });
        await prisma.subject.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId, emptySchoolId] } } });
        await prisma.teacher.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId, emptySchoolId] } } });
        await prisma.academicYear.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId, emptySchoolId] } } });
        await prisma.user.deleteMany({ where: { id: adminAUserId } });
        await prisma.organizationUnit.deleteMany({ where: { id: { in: [schoolAId, schoolBId, emptySchoolId] } } });
    });

    // ========================================================
    // 1. BASIC AGGREGATION & OVERVIEW METRICS
    // ========================================================
    it("1. Loads live dashboard metrics for authorized school administrator", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId);

        expect(data).toBeDefined();
        expect(data.school.id).toBe(schoolAId);
        expect(data.school.name).toBe("Step 7 Leadership Academy A");
        expect(data.academicYear?.id).toBe(activeYearAId);
        expect(data.academicYear?.status).toBe("ACTIVE");
        expect(data.academicYear?.isLocked).toBe(false);
    });

    it("2. Accurately calculates school overview KPIs", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId);

        expect(data.overview.totalStudents).toBe(2); // 1 placed + 1 unplaced in School A
        expect(data.overview.totalTeachers).toBe(3); // t1, t2, tUnassigned
        expect(data.overview.totalGrades).toBe(2);   // Grade 9 & Grade 10
        expect(data.overview.totalSections).toBe(3); // 9A, 9B, 10A
        expect(data.overview.totalSubjects).toBe(2); // Math, English
        expect(data.overview.unplacedStudents).toBe(1);
    });

    // ========================================================
    // 2. STUDENT METRICS & PLACEMENT MONITORING
    // ========================================================
    it("3. Correctly aggregates student placement, unplaced count, and placement rate", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId);

        expect(data.students.totalEnrolled).toBe(2);
        expect(data.students.placed).toBe(1);
        expect(data.students.unplaced).toBe(1);
        expect(data.students.placementRate).toBe(50.0); // 1 placed / 2 total = 50%
        expect(data.students.genderRatio.male).toBe(1);
        expect(data.students.genderRatio.female).toBe(1);
        expect(data.students.genderRatio.malePercentage).toBe(50);
        expect(data.students.genderRatio.femalePercentage).toBe(50);
    });

    it("4. Correctly groups students by school grade", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId);

        const g9Group = data.students.byGrade.find(g => g.gradeId === grade9AId);
        expect(g9Group).toBeDefined();
        expect(g9Group?.studentCount).toBe(2);

        const g10Group = data.students.byGrade.find(g => g.gradeId === grade10AId);
        expect(g10Group).toBeDefined();
        expect(g10Group?.studentCount).toBe(0);
    });

    // ========================================================
    // 3. TEACHER METRICS & TEACHING ASSIGNMENTS
    // ========================================================
    it("5. Correctly aggregates teacher staffing and unassigned teacher counts", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId);

        expect(data.teachers.totalActive).toBe(3);
        expect(data.teachers.assigned).toBe(2); // t1, t2 have assignments
        expect(data.teachers.unassigned).toBe(1); // tUnassigned has 0 assignments
        expect(data.teachers.totalAssignments).toBe(2); // Math (2 req), English (1 req)
        expect(data.teachers.totalRequiredPeriods).toBe(3); // 2 + 1 = 3
    });

    // ========================================================
    // 4. TIMETABLE COVERAGE CALCULATION
    // ========================================================
    it("6. Accurately calculates instructional timetable coverage and remaining periods", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId);

        // Required: 3 periods (Math: 2, English: 1)
        // Scheduled: 1 period (Math slot 1)
        // Remaining: 2 periods
        // Coverage: 1/3 = 33%
        expect(data.timetable.requiredPeriods).toBe(3);
        expect(data.timetable.scheduledPeriods).toBe(1);
        expect(data.timetable.remainingPeriods).toBe(2);
        expect(data.timetable.coverageRate).toBe(33);
        expect(data.timetable.incompleteAssignmentsCount).toBe(2); // Both Math (1/2) and English (0/1) are incomplete
    });

    // ========================================================
    // 5. DETERMINISTIC ACADEMIC READINESS
    // ========================================================
    it("7. Evaluates academic readiness checks deterministically", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId);

        expect(data.readiness).toBeDefined();
        expect(data.readiness.checks.length).toBeGreaterThanOrEqual(10);
        expect(data.readiness.score).toBeGreaterThan(0);
        expect(data.readiness.score).toBeLessThan(100); // Has unplaced students and unassigned teachers
        expect(["READY", "NEEDS_ATTENTION", "INCOMPLETE"]).toContain(data.readiness.status);

        // Check specific checks
        const placementCheck = data.readiness.checks.find(c => c.id === "student_placement");
        expect(placementCheck?.status).toBe("WARNING"); // 1 unplaced student

        const staffCheck = data.readiness.checks.find(c => c.id === "teaching_assignments");
        expect(staffCheck?.status).toBe("WARNING"); // 1 unassigned teacher
    });

    // ========================================================
    // 6. OPERATIONAL ALERTS (DEDUPLICATED & ACTIONABLE)
    // ========================================================
    it("8. Generates actionable rule-based alerts for operational gaps", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId);

        expect(data.alerts.length).toBeGreaterThanOrEqual(3);

        const unplacedAlert = data.alerts.find(a => a.category === "PLACEMENT");
        expect(unplacedAlert).toBeDefined();
        expect(unplacedAlert?.severity).toBe("WARNING");
        expect(unplacedAlert?.actionUrl).toBe("/dashboard/students");

        const unassignedAlert = data.alerts.find(a => a.category === "TEACHING_ASSIGNMENT");
        expect(unassignedAlert).toBeDefined();
        expect(unassignedAlert?.message).toContain("1 active teacher has no instructional assignments");

        const timetableAlert = data.alerts.find(a => a.category === "TIMETABLE");
        expect(timetableAlert).toBeDefined();
        expect(timetableAlert?.actionUrl).toBe("/dashboard/academics/timetable");
    });

    // ========================================================
    // 7. RECENT ADMINISTRATIVE ACTIVITY (AUDIT LOG)
    // ========================================================
    it("9. Surfaces recent administrative audit activity for school leadership", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId);

        expect(data.recentActivity.length).toBeGreaterThanOrEqual(2);
        const timetableAction = data.recentActivity.find(a => a.action === "TIMETABLE_SLOT_ASSIGNED");
        expect(timetableAction).toBeDefined();
        expect(timetableAction?.actionLabel).toBe("Scheduled instructional period");
    });

    // ========================================================
    // 8. ACADEMIC YEAR FILTERING & HISTORICAL YEARS
    // ========================================================
    it("10. Supports viewing historical academic years (COMPLETED / ARCHIVED) in read-only mode", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(schoolAId, completedYearAId);

        expect(data.academicYear?.id).toBe(completedYearAId);
        expect(data.academicYear?.status).toBe("COMPLETED");
        expect(data.academicYear?.isLocked).toBe(true);

        // Historical year in School A has 0 students enrolled in it
        expect(data.students.totalEnrolled).toBe(0);

        // Should include historical lock alert
        const lockAlert = data.alerts.find(a => a.id === "alert-year-locked");
        expect(lockAlert).toBeDefined();
        expect(lockAlert?.severity).toBe("INFO");
    });

    it("11. Rejects invalid or nonexistent academicYearId with ACADEMIC_YEAR_NOT_FOUND", async () => {
        await expect(
            SchoolDashboardService.getDashboardMetrics(schoolAId, "nonexistent-year-id")
        ).rejects.toThrow("ACADEMIC_YEAR_NOT_FOUND");
    });

    // ========================================================
    // 9. MULTI-TENANT ISOLATION (SCHOOL A VS SCHOOL B)
    // ========================================================
    it("12. Enforces strict multi-tenant isolation (School A never sees School B students or data)", async () => {
        const dataA = await SchoolDashboardService.getDashboardMetrics(schoolAId);
        const dataB = await SchoolDashboardService.getDashboardMetrics(schoolBId);

        // School A has 2 students, School B has 1 student
        expect(dataA.students.totalEnrolled).toBe(2);
        expect(dataB.students.totalEnrolled).toBe(1);

        // School A has 3 teachers, School B has 1 teacher
        expect(dataA.teachers.totalActive).toBe(3);
        expect(dataB.teachers.totalActive).toBe(1);

        // Attempting to query School B year using School A scope must fail
        await expect(
            SchoolDashboardService.getDashboardMetrics(schoolAId, activeYearBId)
        ).rejects.toThrow("ACADEMIC_YEAR_NOT_FOUND");
    });

    // ========================================================
    // 10. EMPTY / NEWLY CREATED SCHOOL STATE
    // ========================================================
    it("13. Safely handles a newly created school with zero academic setup (no errors)", async () => {
        const data = await SchoolDashboardService.getDashboardMetrics(emptySchoolId);

        expect(data.academicYear).toBeNull();
        expect(data.overview.totalStudents).toBe(0);
        expect(data.overview.totalTeachers).toBe(0);
        expect(data.overview.totalGrades).toBe(0);
        expect(data.overview.totalSections).toBe(0);
        expect(data.overview.readinessScore).toBe(0);
        expect(data.overview.readinessStatus).toBe("INCOMPLETE");
        expect(data.alerts.some(a => a.id === "no-year")).toBe(true);
    });
});
