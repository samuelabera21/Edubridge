import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../infrastructure/prisma/client.js";
import { StaffingService } from "./staffing.service.js";
import { TeacherService } from "../teacher/teacher.service.js";

describe("Step 3: Staffing & Instructional Allocation Subsystem", () => {
    let testOrgId: string;
    let otherOrgId: string;
    let academicYearId: string;
    let plannedYearId: string;
    let archivedYearId: string;
    let gradeId: string;
    let schoolGradeId: string;
    let sectionAId: string;
    let sectionBId: string;
    let mathSubjectId: string;
    let physicsSubjectId: string;
    let teacherAId: string;
    let teacherBId: string;
    let principalUserId: string;

    beforeAll(async () => {
        // 1. Setup Test Organizations
        const testOrg = await prisma.organizationUnit.create({
            data: { name: "Step 3 Test Academy", type: "SCHOOL" }
        });
        testOrgId = testOrg.id;

        const otherOrg = await prisma.organizationUnit.create({
            data: { name: "Step 3 Rival School", type: "SCHOOL" }
        });
        otherOrgId = otherOrg.id;

        // Create principal user for audit log
        principalUserId = `user-principal-${Date.now()}`;
        await prisma.user.create({
            data: {
                id: principalUserId,
                email: `principal.s3.${Date.now()}@edubridge.local`,
                name: "Principal Bekele"
            }
        });

        // 2. Setup Academic Years (ACTIVE, PLANNED, ARCHIVED)
        const activeYear = await prisma.academicYear.create({
            data: {
                organizationId: testOrgId,
                name: "2026/27 Active Year",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "ACTIVE"
            }
        });
        academicYearId = activeYear.id;

        const plannedYear = await prisma.academicYear.create({
            data: {
                organizationId: testOrgId,
                name: "2027/28 Planned Year",
                startDate: new Date("2027-09-01"),
                endDate: new Date("2028-06-30"),
                status: "PLANNED"
            }
        });
        plannedYearId = plannedYear.id;

        const archivedYear = await prisma.academicYear.create({
            data: {
                organizationId: testOrgId,
                name: "2024/25 Archived Year",
                startDate: new Date("2024-09-01"),
                endDate: new Date("2025-06-30"),
                status: "ARCHIVED"
            }
        });
        archivedYearId = archivedYear.id;

        // 3. Setup Subjects
        const mathSubj = await prisma.subject.create({
            data: { organizationId: testOrgId, name: "Step3 Mathematics", code: "S3-MTH" }
        });
        mathSubjectId = mathSubj.id;

        const physicsSubj = await prisma.subject.create({
            data: { organizationId: testOrgId, name: "Step3 Physics", code: "S3-PHY" }
        });
        physicsSubjectId = physicsSubj.id;

        // 4. Setup Grade & Sections
        const grade = await prisma.grade.create({
            data: { organizationId: testOrgId, name: "Step3 Grade 7", level: 7 }
        });
        gradeId = grade.id;

        const schoolGrade = await prisma.schoolGrade.create({
            data: { academicYearId, gradeId }
        });
        schoolGradeId = schoolGrade.id;

        const secA = await prisma.section.create({
            data: { schoolGradeId, name: "7A", capacity: 40 }
        });
        sectionAId = secA.id;

        const secB = await prisma.section.create({
            data: { schoolGradeId, name: "7B", capacity: 40 }
        });
        sectionBId = secB.id;

        // 5. Connect Step 2 Curriculum: 5 periods/wk for Math, 4 periods/wk for Physics
        await prisma.schoolGradeSubject.create({
            data: { schoolGradeId, subjectId: mathSubjectId, weeklyPeriods: 5 }
        });
        await prisma.schoolGradeSubject.create({
            data: { schoolGradeId, subjectId: physicsSubjectId, weeklyPeriods: 4 }
        });

        // 6. Setup Teachers
        const teacherA = await prisma.teacher.create({
            data: {
                organizationId: testOrgId,
                firstName: "Abebe",
                lastName: "Bikila",
                employeeId: `TCH-S3-${Date.now()}-A`,
                qualification: "BSc Mathematics",
                targetWorkload: 20,
                minWorkload: 15,
                maxWorkload: 25
            }
        });
        teacherAId = teacherA.id;

        const teacherB = await prisma.teacher.create({
            data: {
                organizationId: testOrgId,
                firstName: "Derartu",
                lastName: "Tulu",
                employeeId: `TCH-S3-${Date.now()}-B`,
                qualification: "BSc Physics",
                targetWorkload: 22,
                minWorkload: 18,
                maxWorkload: 28
            }
        });
        teacherBId = teacherB.id;

        // Setup Teacher Specializations
        await TeacherService.addTeacherSpecialization(teacherAId, testOrgId, {
            subjectId: mathSubjectId,
            isPrimary: true,
            verified: true
        });
        await TeacherService.addTeacherSpecialization(teacherBId, testOrgId, {
            subjectId: physicsSubjectId,
            isPrimary: true,
            verified: true
        });
    });

    afterAll(async () => {
        // Clean up test organizations
        await prisma.organizationUnit.deleteMany({
            where: { id: { in: [testOrgId, otherOrgId] } }
        });
    });

    it("1. Staffing Demand Engine derives demand from Step 2 curriculum weeklyPeriods", async () => {
        const demand = await StaffingService.getStaffingDemand(testOrgId, academicYearId);

        expect(demand.academicYearId).toBe(academicYearId);
        expect(demand.totalSections).toBe(2); // 7A and 7B
        // Math demand: 2 sections * 5 periods = 10
        // Physics demand: 2 sections * 4 periods = 8
        // Total = 18 periods
        expect(demand.totalDemandPeriods).toBe(18);
        expect(demand.totalAssignedPeriods).toBe(0);
        expect(demand.totalUnassignedPeriods).toBe(18);
        expect(demand.coveragePercentage).toBe(0);

        const grade7 = demand.grades.find((g) => g.schoolGradeId === schoolGradeId);
        expect(grade7).toBeDefined();
        expect(grade7?.demandPeriods).toBe(18);

        const math = grade7?.subjects.find((s) => s.subjectId === mathSubjectId);
        expect(math?.weeklyPeriodsPerSection).toBe(5);
        expect(math?.demandPeriods).toBe(10);
        expect(math?.status).toBe("UNSTAFFED");
    });

    it("2. Teacher assignment proposal auto-populates periodsPerWeek from Step 2 curriculum", async () => {
        // Vice Principal proposes Abebe for 7A Math
        const assignment = await TeacherService.assignTeacher(testOrgId, {
            teacherId: teacherAId,
            academicYearId,
            subjectId: mathSubjectId,
            schoolGradeId,
            sectionId: sectionAId,
            status: "PROPOSED"
        });

        const created = Array.isArray(assignment) ? assignment[0] : assignment;
        expect(created.status).toBe("PROPOSED");
        // Must match Step 2's weeklyPeriods (5) rather than arbitrary 4
        expect(created.periodsPerWeek).toBe(5);
    });

    it("3. Specialization matching identifies qualified teachers and alerts on mismatches", async () => {
        const matchResult = await StaffingService.evaluateSpecializationMatch(teacherAId, mathSubjectId);
        expect(matchResult.isMatch).toBe(true);
        expect(matchResult.level).toBe("MATCH");

        const mismatchResult = await StaffingService.evaluateSpecializationMatch(teacherAId, physicsSubjectId);
        expect(mismatchResult.isMatch).toBe(false);
        expect(mismatchResult.level).toBe("WARNING");
    });

    it("4. Assignment Lifecycle: Propose -> Approve (Principal) -> Active", async () => {
        // 1. Propose assignment
        const proposedRes = await TeacherService.assignTeacher(testOrgId, {
            teacherId: teacherBId,
            academicYearId,
            subjectId: physicsSubjectId,
            schoolGradeId,
            sectionId: sectionAId,
            status: "PROPOSED"
        });
        const proposed = Array.isArray(proposedRes) ? proposedRes[0] : proposedRes;
        expect(proposed.status).toBe("PROPOSED");

        // 2. Principal approves assignment -> becomes ACTIVE
        const approved = await TeacherService.approveAssignment(proposed.id, testOrgId, principalUserId);
        expect(approved.status).toBe("ACTIVE");
        expect(approved.approvedById).toBe(principalUserId);
        expect(approved.approvedAt).toBeDefined();
    });

    it("5. Duplicate Active Teacher Prevention: Blocks two active teachers on same section and subject", async () => {
        // Teacher B is already ACTIVE for 7A Physics from test 4.
        // Attempting to assign Teacher A as ACTIVE for 7A Physics must throw an error.
        await expect(
            TeacherService.assignTeacher(testOrgId, {
                teacherId: teacherAId,
                academicYearId,
                subjectId: physicsSubjectId,
                schoolGradeId,
                sectionId: sectionAId,
                status: "ACTIVE"
            })
        ).rejects.toThrow(/already has an active teacher/);
    });

    it("6. Workload Engine accurately calculates true weekly periods and policy status", async () => {
        // Assign Teacher A to 7B Math as well (5 periods)
        await TeacherService.assignTeacher(testOrgId, {
            teacherId: teacherAId,
            academicYearId,
            subjectId: mathSubjectId,
            schoolGradeId,
            sectionId: sectionBId,
            status: "ACTIVE"
        });

        // Activate Abebe's 7A Math assignment
        const allAbebe = await prisma.teachingAssignment.findMany({
            where: { teacherId: teacherAId, academicYearId }
        });
        for (const a of allAbebe) {
            await TeacherService.approveAssignment(a.id, testOrgId);
        }

        const workloads = await StaffingService.getFacultyWorkload(testOrgId, academicYearId);
        const abebeLoad = workloads.find((w) => w.teacherId === teacherAId);

        expect(abebeLoad).toBeDefined();
        // 7A Math (5) + 7B Math (5) = 10 periods
        expect(abebeLoad?.totalPeriods).toBe(10);
        // Abebe's minWorkload is 15 -> should be UNDERLOADED
        expect(abebeLoad?.status).toBe("UNDERLOADED");
    });

    it("7. Homeroom Teacher Allocation independent of subject assignments", async () => {
        const updatedSecA = await StaffingService.setSectionHomeroomTeacher(testOrgId, sectionAId, teacherAId);
        expect(updatedSecA.homeroomTeacherId).toBe(teacherAId);

        const matrix = await StaffingService.getSectionCoverageMatrix(testOrgId, academicYearId);
        const secAInMatrix = matrix.sections.find((s) => s.sectionId === sectionAId);

        expect(secAInMatrix?.homeroomTeacher?.id).toBe(teacherAId);
        expect(secAInMatrix?.homeroomTeacher?.name).toContain("Abebe");
    });

    it("8. Cross-Tenant Security: Blocks assignments referencing entities from other schools", async () => {
        // Create teacher in another school
        const rivalTeacher = await prisma.teacher.create({
            data: {
                organizationId: otherOrgId,
                firstName: "Rival",
                lastName: "Teacher",
                employeeId: `TCH-RIVAL-${Date.now()}`
            }
        });

        // Attempting to assign rival teacher to our school's grade must fail
        await expect(
            TeacherService.assignTeacher(testOrgId, {
                teacherId: rivalTeacher.id,
                academicYearId,
                subjectId: mathSubjectId,
                schoolGradeId,
                sectionId: sectionAId
            })
        ).rejects.toThrow(/Teacher not found in this school/);
    });

    it("9. Planned Academic Year allows staffing preparation, Locked/Archived year is protected", async () => {
        // Setup grade in PLANNED year
        const plannedSchoolGrade = await prisma.schoolGrade.create({
            data: { academicYearId: plannedYearId, gradeId }
        });
        await prisma.schoolGradeSubject.create({
            data: { schoolGradeId: plannedSchoolGrade.id, subjectId: mathSubjectId, weeklyPeriods: 5 }
        });

        // Should SUCCEED for PLANNED year
        const plannedAssignment = await TeacherService.assignTeacher(testOrgId, {
            teacherId: teacherAId,
            academicYearId: plannedYearId,
            subjectId: mathSubjectId,
            schoolGradeId: plannedSchoolGrade.id,
            status: "PROPOSED"
        });
        expect(plannedAssignment).toBeDefined();

        // Setup grade in ARCHIVED year
        const archivedSchoolGrade = await prisma.schoolGrade.create({
            data: { academicYearId: archivedYearId, gradeId }
        });

        // Should FAIL for ARCHIVED year
        await expect(
            TeacherService.assignTeacher(testOrgId, {
                teacherId: teacherAId,
                academicYearId: archivedYearId,
                subjectId: mathSubjectId,
                schoolGradeId: archivedSchoolGrade.id,
                status: "PROPOSED"
            })
        ).rejects.toThrow(/is ARCHIVED and locked/);
    });

    it("10. Historical Data Preservation: Safe ending does not delete downstream assessment marks", async () => {
        // Create an assessment and student result tied to Teacher B's assignment
        const assignment = await prisma.teachingAssignment.findFirst({
            where: { teacherId: teacherBId, academicYearId, status: "ACTIVE" }
        });
        expect(assignment).toBeDefined();

        const testAssessment = await prisma.assessment.create({
            data: {
                organizationId: testOrgId,
                academicYearId,
                teachingAssignmentId: assignment!.id,
                title: "Midterm Exam",
                maxScore: 100
            }
        });

        // Teacher leaves or is reassigned -> end assignment safely
        const ended = await TeacherService.endAssignment(assignment!.id, testOrgId);
        expect(ended.status).toBe("ENDED");

        // The assessment must STILL EXIST in the database
        const assessmentAfter = await prisma.assessment.findUnique({
            where: { id: testAssessment.id }
        });
        expect(assessmentAfter).toBeDefined();
        expect(assessmentAfter?.title).toBe("Midterm Exam");

        // Calling deleteAssignment on an assignment with assessments safely transitions to ENDED instead of wiping data
        await TeacherService.deleteAssignment(assignment!.id, testOrgId);
        const checkAfterDeleteAttempt = await prisma.teachingAssignment.findUnique({
            where: { id: assignment!.id }
        });
        expect(checkAfterDeleteAttempt?.status).toBe("ENDED");
    });
});
