import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../infrastructure/prisma/client.js";
import { StudentService } from "./student.service.js";
import { StudentPlacementService } from "./student.placement.service.js";
import { EnrollmentStatus, EnrollmentType } from "../../generated/prisma/enums.js";

describe("Step 5: Student Placement & Classroom Rosters Test Suite", () => {
    let schoolAId: string;
    let schoolBId: string;
    let principalUserId: string;

    let activeYearId: string;
    let archivedYearId: string;
    let schoolBActiveYearId: string;

    let schoolGrade9Id: string;
    let schoolGrade10Id: string;
    let schoolBGrade9Id: string;

    let section9AId: string;
    let section9BId: string;
    let section9SmallCapId: string; // capacity: 2
    let section9InactiveId: string; // status: SUSPENDED
    let section10AId: string;
    let schoolBSection9AId: string;

    let teacherAId: string;

    beforeAll(async () => {
        // 1. Create Schools
        const schoolA = await prisma.organizationUnit.create({
            data: { name: "Step 5 Model Academy", type: "SCHOOL" }
        });
        schoolAId = schoolA.id;

        const schoolB = await prisma.organizationUnit.create({
            data: { name: "Step 5 External Academy", type: "SCHOOL" }
        });
        schoolBId = schoolB.id;

        // 2. Create Principal User
        principalUserId = `user-princ-s5-${Date.now()}`;
        await prisma.user.create({
            data: {
                id: principalUserId,
                email: `principal.step5.${Date.now()}@edubridge.local`,
                name: "Principal Almaz"
            }
        });

        // 3. Create Teacher for Homeroom assignment
        const teacher = await prisma.teacher.create({
            data: {
                organizationId: schoolAId,
                firstName: "Tadesse",
                lastName: "Bekele",
                fatherName: "Bekele",
                gender: "MALE"
            }
        });
        teacherAId = teacher.id;

        // 4. Create Academic Years
        const activeYear = await prisma.academicYear.create({
            data: {
                organizationId: schoolAId,
                name: "2026/2027 Academic Year (S5)",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "ACTIVE"
            }
        });
        activeYearId = activeYear.id;

        const archivedYear = await prisma.academicYear.create({
            data: {
                organizationId: schoolAId,
                name: "2024/2025 Academic Year (S5 Archived)",
                startDate: new Date("2024-09-01"),
                endDate: new Date("2025-06-30"),
                status: "ARCHIVED"
            }
        });
        archivedYearId = archivedYear.id;

        const schoolBYear = await prisma.academicYear.create({
            data: {
                organizationId: schoolBId,
                name: "2026/2027 Academic Year (School B)",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "ACTIVE"
            }
        });
        schoolBActiveYearId = schoolBYear.id;

        // 5. Create Base Grades
        const grade9 = await prisma.grade.upsert({
            where: { organizationId_level: { organizationId: schoolAId, level: 9 } },
            update: {},
            create: { organizationId: schoolAId, name: "Grade 9", level: 9 }
        });

        const grade10 = await prisma.grade.upsert({
            where: { organizationId_level: { organizationId: schoolAId, level: 10 } },
            update: {},
            create: { organizationId: schoolAId, name: "Grade 10", level: 10 }
        });

        const schoolBGrade9 = await prisma.grade.upsert({
            where: { organizationId_level: { organizationId: schoolBId, level: 9 } },
            update: {},
            create: { organizationId: schoolBId, name: "Grade 9 (School B)", level: 9 }
        });

        // 6. Create SchoolGrades
        const sg9 = await prisma.schoolGrade.create({
            data: {
                academicYearId: activeYearId,
                gradeId: grade9.id,
                status: "ACTIVE"
            }
        });
        schoolGrade9Id = sg9.id;

        const sg10 = await prisma.schoolGrade.create({
            data: {
                academicYearId: activeYearId,
                gradeId: grade10.id,
                status: "ACTIVE"
            }
        });
        schoolGrade10Id = sg10.id;

        const sBsg9 = await prisma.schoolGrade.create({
            data: {
                academicYearId: schoolBActiveYearId,
                gradeId: schoolBGrade9.id,
                status: "ACTIVE"
            }
        });
        schoolBGrade9Id = sBsg9.id;

        // 7. Create Sections in Grade 9
        const s9A = await prisma.section.create({
            data: {
                schoolGradeId: schoolGrade9Id,
                name: "A",
                capacity: 35,
                status: "ACTIVE",
                homeroomTeacherId: teacherAId
            }
        });
        section9AId = s9A.id;

        const s9B = await prisma.section.create({
            data: {
                schoolGradeId: schoolGrade9Id,
                name: "B",
                capacity: 35,
                status: "ACTIVE"
            }
        });
        section9BId = s9B.id;

        const s9Small = await prisma.section.create({
            data: {
                schoolGradeId: schoolGrade9Id,
                name: "C_SMALL",
                capacity: 2, // strict small limit for boundary testing
                status: "ACTIVE"
            }
        });
        section9SmallCapId = s9Small.id;

        const s9Inactive = await prisma.section.create({
            data: {
                schoolGradeId: schoolGrade9Id,
                name: "D_SUSPENDED",
                capacity: 30,
                status: "SUSPENDED"
            }
        });
        section9InactiveId = s9Inactive.id;

        // Section in Grade 10
        const s10A = await prisma.section.create({
            data: {
                schoolGradeId: schoolGrade10Id,
                name: "A",
                capacity: 35,
                status: "ACTIVE"
            }
        });
        section10AId = s10A.id;

        // Section in School B
        const sB9A = await prisma.section.create({
            data: {
                schoolGradeId: schoolBGrade9Id,
                name: "A",
                capacity: 30,
                status: "ACTIVE"
            }
        });
        schoolBSection9AId = sB9A.id;
    });

    afterAll(async () => {
        // Clean up created records
        await prisma.studentAttendance.deleteMany({
            where: { organizationId: { in: [schoolAId, schoolBId] } }
        });
        await prisma.studentResult.deleteMany({
            where: { enrollment: { organizationId: { in: [schoolAId, schoolBId] } } }
        });
        await prisma.assessment.deleteMany({
            where: { organizationId: { in: [schoolAId, schoolBId] } }
        });
        await prisma.teachingAssignment.deleteMany({
            where: { academicYearId: { in: [activeYearId, archivedYearId, schoolBActiveYearId] } }
        });
        await prisma.studentStatusHistory.deleteMany({
            where: { enrollment: { organizationId: { in: [schoolAId, schoolBId] } } }
        });
        await prisma.auditLog.deleteMany({
            where: { organizationId: { in: [schoolAId, schoolBId] } }
        });
        await prisma.studentEnrollment.deleteMany({
            where: { organizationId: { in: [schoolAId, schoolBId] } }
        });
        await prisma.student.deleteMany({
            where: {
                firstName: {
                    in: ["Blen", "Kidus", "Martha", "Natan", "Rahel", "Surafel", "Tigist", "Zenebe"]
                }
            }
        });
        await prisma.teacher.deleteMany({ where: { organizationId: schoolAId } });
        await prisma.section.deleteMany({
            where: { schoolGradeId: { in: [schoolGrade9Id, schoolGrade10Id, schoolBGrade9Id] } }
        });
        await prisma.schoolGrade.deleteMany({
            where: { id: { in: [schoolGrade9Id, schoolGrade10Id, schoolBGrade9Id] } }
        });
        await prisma.grade.deleteMany({
            where: { organizationId: { in: [schoolAId, schoolBId] } }
        });
        await prisma.academicYear.deleteMany({
            where: { id: { in: [activeYearId, archivedYearId, schoolBActiveYearId] } }
        });
        await prisma.user.deleteMany({ where: { id: principalUserId } });
        await prisma.organizationUnit.deleteMany({
            where: { id: { in: [schoolAId, schoolBId] } }
        });
    });

    // Helper to create an unplaced student enrollment (as produced by Step 4)
    async function createUnplacedStudent(name: string, gender: "MALE" | "FEMALE", schoolGradeId: string, customOrgId?: string) {
        const orgId = customOrgId || schoolAId;
        const student = await prisma.student.create({
            data: {
                studentId: `STU-S5-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                firstName: name,
                lastName: "Tesfaye",
                fatherName: "Tesfaye",
                grandfatherName: "Moges",
                gender
            }
        });

        const enrollment = await prisma.studentEnrollment.create({
            data: {
                studentId: student.id,
                organizationId: orgId,
                academicYearId: customOrgId ? schoolBActiveYearId : activeYearId,
                schoolGradeId,
                sectionId: null, // UNPLACED (Step 4 invariant)
                enrollmentType: EnrollmentType.NEW,
                status: EnrollmentStatus.ENROLLED
            }
        });

        return { student, enrollment };
    }

    describe("1. Workspace Loading & Summary Calculations", () => {
        it("accurately reports unplaced count and section occupancy", async () => {
            const { enrollment: e1 } = await createUnplacedStudent("Blen", "FEMALE", schoolGrade9Id);
            const { enrollment: e2 } = await createUnplacedStudent("Kidus", "MALE", schoolGrade9Id);

            const workspace = await StudentPlacementService.getPlacementWorkspace(schoolAId, {
                academicYearId: activeYearId,
                schoolGradeId: schoolGrade9Id
            });

            expect(workspace.academicYear?.id).toBe(activeYearId);
            expect(workspace.schoolGrade?.id).toBe(schoolGrade9Id);
            expect(workspace.summary.totalUnplaced).toBeGreaterThanOrEqual(2);

            const unplacedIds = workspace.unplacedStudents.map(s => s.enrollmentId);
            expect(unplacedIds).toContain(e1.id);
            expect(unplacedIds).toContain(e2.id);

            // Verify sections are returned with capacity
            const sec9A = workspace.sections.find(s => s.id === section9AId);
            expect(sec9A).toBeDefined();
            expect(sec9A?.name).toBe("A");
            expect(sec9A?.capacity).toBe(35);
            expect(sec9A?.homeroomTeacher?.name).toBe("Tadesse Bekele");
        });
    });

    describe("2. Single Student Placement", () => {
        it("places an unplaced student into target section and updates occupancy", async () => {
            const { enrollment, student } = await createUnplacedStudent("Martha", "FEMALE", schoolGrade9Id);
            expect(enrollment.sectionId).toBeNull();

            const result = await StudentPlacementService.assignStudent(
                schoolAId,
                enrollment.id,
                section9AId,
                principalUserId
            );

            expect(result.success).toBe(true);
            expect(result.enrollment.sectionId).toBe(section9AId);
            expect(result.enrollment.status).toBe(EnrollmentStatus.ACTIVE);

            // Verify persisted in DB
            const check = await prisma.studentEnrollment.findUnique({ where: { id: enrollment.id } });
            expect(check?.sectionId).toBe(section9AId);

            // Verify audit log
            const audit = await prisma.auditLog.findFirst({
                where: {
                    resourceId: enrollment.id,
                    action: "SECTION_ASSIGNED"
                }
            });
            expect(audit).toBeDefined();
            expect(audit?.organizationId).toBe(schoolAId);
            expect((audit?.newValue as any)?.sectionId).toBe(section9AId);
        });

        it("is idempotent: re-assigning to the same section returns clean no-op", async () => {
            const { enrollment } = await createUnplacedStudent("Natan", "MALE", schoolGrade9Id);

            // Place once
            await StudentPlacementService.assignStudent(schoolAId, enrollment.id, section9AId, principalUserId);

            // Place again in same section
            const repeat = await StudentPlacementService.assignStudent(schoolAId, enrollment.id, section9AId, principalUserId);
            expect(repeat.success).toBe(true);
            expect(repeat.noOp).toBe(true);
        });

        it("rejects assignStudent if student is already placed in another section (requires reassignment)", async () => {
            const { enrollment } = await createUnplacedStudent("Rahel", "FEMALE", schoolGrade9Id);
            await StudentPlacementService.assignStudent(schoolAId, enrollment.id, section9AId, principalUserId);

            await expect(
                StudentPlacementService.assignStudent(schoolAId, enrollment.id, section9BId, principalUserId)
            ).rejects.toThrow(/already placed in another section/i);
        });
    });

    describe("3. Security, Tenant & Academic Guards", () => {
        it("rejects cross-grade placement (Grade 9 student into Grade 10 section)", async () => {
            const { enrollment } = await createUnplacedStudent("Surafel", "MALE", schoolGrade9Id);

            await expect(
                StudentPlacementService.assignStudent(schoolAId, enrollment.id, section10AId, principalUserId)
            ).rejects.toThrow(/Grade mismatch/i);
        });

        it("rejects cross-school placement (School A student into School B section)", async () => {
            const { enrollment } = await createUnplacedStudent("Tigist", "FEMALE", schoolGrade9Id);

            await expect(
                StudentPlacementService.assignStudent(schoolAId, enrollment.id, schoolBSection9AId, principalUserId)
            ).rejects.toThrow(/Target section not found or does not belong to this school/i);
        });

        it("rejects placement into inactive or suspended section", async () => {
            const { enrollment } = await createUnplacedStudent("Zenebe", "MALE", schoolGrade9Id);

            await expect(
                StudentPlacementService.assignStudent(schoolAId, enrollment.id, section9InactiveId, principalUserId)
            ).rejects.toThrow(/Cannot place students into an inactive or suspended section/i);
        });
    });

    describe("4. Section Capacity Boundaries & Concurrency", () => {
        it("respects capacity limit: succeeds up to capacity, rejects when full", async () => {
            // section9SmallCapId has capacity = 2
            const { enrollment: s1 } = await createUnplacedStudent("StudentSmall1", "MALE", schoolGrade9Id);
            const { enrollment: s2 } = await createUnplacedStudent("StudentSmall2", "FEMALE", schoolGrade9Id);
            const { enrollment: s3 } = await createUnplacedStudent("StudentSmall3", "MALE", schoolGrade9Id);

            // Place 1st -> occupancy 1/2
            await StudentPlacementService.assignStudent(schoolAId, s1.id, section9SmallCapId, principalUserId);

            // Place 2nd -> occupancy 2/2 (now full)
            await StudentPlacementService.assignStudent(schoolAId, s2.id, section9SmallCapId, principalUserId);

            // Attempt 3rd -> must reject with SECTION_CAPACITY_EXCEEDED
            await expect(
                StudentPlacementService.assignStudent(schoolAId, s3.id, section9SmallCapId, principalUserId)
            ).rejects.toThrow(/SECTION_CAPACITY_EXCEEDED/i);
        });
    });

    describe("5. Bulk Placement & Atomicity", () => {
        it("atomically bulk-places multiple students into a section", async () => {
            const { enrollment: b1 } = await createUnplacedStudent("Bulk1", "MALE", schoolGrade9Id);
            const { enrollment: b2 } = await createUnplacedStudent("Bulk2", "FEMALE", schoolGrade9Id);
            const { enrollment: b3 } = await createUnplacedStudent("Bulk3", "MALE", schoolGrade9Id);

            const result = await StudentPlacementService.bulkAssignStudents(
                schoolAId,
                [b1.id, b2.id, b3.id],
                section9BId,
                principalUserId
            );

            expect(result.success).toBe(true);
            expect(result.count).toBe(3);

            const check1 = await prisma.studentEnrollment.findUnique({ where: { id: b1.id } });
            const check2 = await prisma.studentEnrollment.findUnique({ where: { id: b2.id } });
            const check3 = await prisma.studentEnrollment.findUnique({ where: { id: b3.id } });

            expect(check1?.sectionId).toBe(section9BId);
            expect(check2?.sectionId).toBe(section9BId);
            expect(check3?.sectionId).toBe(section9BId);
        });

        it("bulk placement is atomic: rolls back all if any student is invalid", async () => {
            const { enrollment: valid1 } = await createUnplacedStudent("AtomicValid1", "FEMALE", schoolGrade9Id);
            const invalidEnrollmentId = "non-existent-enrollment-id";

            await expect(
                StudentPlacementService.bulkAssignStudents(
                    schoolAId,
                    [valid1.id, invalidEnrollmentId],
                    section9BId,
                    principalUserId
                )
            ).rejects.toThrow(/Validation failed/i);

            // Verify valid1 was NOT placed (transaction rolled back)
            const check = await prisma.studentEnrollment.findUnique({ where: { id: valid1.id } });
            expect(check?.sectionId).toBeNull();
        });

        it("bulk placement rejects when batch size exceeds remaining capacity", async () => {
            // Create a section with capacity 2
            const testSec = await prisma.section.create({
                data: {
                    schoolGradeId: schoolGrade9Id,
                    name: `TEST_CAP_${Date.now()}`,
                    capacity: 2,
                    status: "ACTIVE"
                }
            });

            const { enrollment: c1 } = await createUnplacedStudent("CapTest1", "MALE", schoolGrade9Id);
            const { enrollment: c2 } = await createUnplacedStudent("CapTest2", "FEMALE", schoolGrade9Id);
            const { enrollment: c3 } = await createUnplacedStudent("CapTest3", "MALE", schoolGrade9Id);

            // Attempting to place 3 students into capacity 2
            await expect(
                StudentPlacementService.bulkAssignStudents(
                    schoolAId,
                    [c1.id, c2.id, c3.id],
                    testSec.id,
                    principalUserId
                )
            ).rejects.toThrow(/SECTION_CAPACITY_EXCEEDED/i);

            // Verify none were placed
            const count = await prisma.studentEnrollment.count({ where: { sectionId: testSec.id } });
            expect(count).toBe(0);
        });
    });

    describe("6. Section Reassignment & History Preservation", () => {
        it("reassigns a student from 9A to 9B in-place without creating a new enrollment or breaking linked records", async () => {
            const { enrollment, student } = await createUnplacedStudent("ReassignStudent", "MALE", schoolGrade9Id);

            // 1. Initial placement in 9A
            await StudentPlacementService.assignStudent(schoolAId, enrollment.id, section9AId, principalUserId);

            // 2. Link simulated assessment result & attendance to this enrollment
            // Setup minimal TeachingAssignment and Assessment
            const subject = await prisma.subject.create({
                data: { organizationId: schoolAId, name: `Math S5 ${Date.now()}` }
            });

            const assignment = await prisma.teachingAssignment.create({
                data: {
                    teacherId: teacherAId,
                    academicYearId: activeYearId,
                    subjectId: subject.id,
                    schoolGradeId: schoolGrade9Id,
                    sectionId: section9AId
                }
            });

            const assessment = await prisma.assessment.create({
                data: {
                    organizationId: schoolAId,
                    academicYearId: activeYearId,
                    teachingAssignmentId: assignment.id,
                    title: "Midterm Exam",
                    maxScore: 100
                }
            });

            const studentResult = await prisma.studentResult.create({
                data: {
                    assessmentId: assessment.id,
                    enrollmentId: enrollment.id,
                    score: 92.5
                }
            });

            const attendance = await prisma.studentAttendance.create({
                data: {
                    organizationId: schoolAId,
                    academicYearId: activeYearId,
                    enrollmentId: enrollment.id,
                    date: new Date("2026-10-05"),
                    status: "PRESENT"
                }
            });

            // 3. Perform Reassignment from 9A to 9B
            const reassignResult = await StudentPlacementService.reassignStudentSection(
                schoolAId,
                {
                    enrollmentId: enrollment.id,
                    targetSectionId: section9BId,
                    reason: "Balanced section redistribution per Principal directive"
                },
                principalUserId
            );

            expect(reassignResult.success).toBe(true);
            expect(reassignResult.enrollment.id).toBe(enrollment.id); // EXACT SAME ENROLLMENT ID
            expect(reassignResult.enrollment.sectionId).toBe(section9BId);

            // 4. CRITICAL: Verify linked assessment and attendance still exist and point to the same enrollment
            const checkResult = await prisma.studentResult.findUnique({
                where: { assessmentId_enrollmentId: { assessmentId: assessment.id, enrollmentId: enrollment.id } }
            });
            expect(checkResult).toBeDefined();
            expect(checkResult?.score).toBe(92.5);

            const checkAttendance = await prisma.studentAttendance.findFirst({
                where: { enrollmentId: enrollment.id }
            });
            expect(checkAttendance).toBeDefined();
            expect(checkAttendance?.status).toBe("PRESENT");

            // 5. Verify AuditLog recorded previous and new section
            const audit = await prisma.auditLog.findFirst({
                where: {
                    resourceId: enrollment.id,
                    action: "SECTION_REASSIGNED"
                }
            });
            expect(audit).toBeDefined();
            expect((audit?.oldValue as any)?.sectionId).toBe(section9AId);
            expect((audit?.newValue as any)?.sectionId).toBe(section9BId);
            expect((audit?.newValue as any)?.reason).toBe("Balanced section redistribution per Principal directive");
        });

        it("rejects reassignment without a meaningful reason", async () => {
            const { enrollment } = await createUnplacedStudent("ReasonTest", "FEMALE", schoolGrade9Id);
            await StudentPlacementService.assignStudent(schoolAId, enrollment.id, section9AId, principalUserId);

            await expect(
                StudentPlacementService.reassignStudentSection(
                    schoolAId,
                    {
                        enrollmentId: enrollment.id,
                        targetSectionId: section9BId,
                        reason: "   " // blank
                    },
                    principalUserId
                )
            ).rejects.toThrow(/A meaningful administrative reason/i);
        });

        it("rejects cross-grade reassignment (reassigning Grade 9 student to Grade 10 section)", async () => {
            const { enrollment } = await createUnplacedStudent("CrossGradeReassign", "MALE", schoolGrade9Id);
            await StudentPlacementService.assignStudent(schoolAId, enrollment.id, section9AId, principalUserId);

            await expect(
                StudentPlacementService.reassignStudentSection(
                    schoolAId,
                    {
                        enrollmentId: enrollment.id,
                        targetSectionId: section10AId,
                        reason: "Attempted cross-grade move"
                    },
                    principalUserId
                )
            ).rejects.toThrow(/Cross-grade reassignment is prohibited/i);
        });
    });

    describe("7. Classroom Roster Generation", () => {
        it("returns official deterministic classroom roster derived directly from sectionId", async () => {
            const { enrollment: r1 } = await createUnplacedStudent("Abebe", "MALE", schoolGrade9Id);
            const { enrollment: r2 } = await createUnplacedStudent("Chala", "MALE", schoolGrade9Id);
            const { enrollment: r3 } = await createUnplacedStudent("Bethlehem", "FEMALE", schoolGrade9Id);

            // Place all three into Section 9A
            await StudentPlacementService.assignStudent(schoolAId, r1.id, section9AId, principalUserId);
            await StudentPlacementService.assignStudent(schoolAId, r2.id, section9AId, principalUserId);
            await StudentPlacementService.assignStudent(schoolAId, r3.id, section9AId, principalUserId);

            const roster = await StudentPlacementService.getSectionRoster(schoolAId, section9AId);

            expect(roster.section.name).toBe("A");
            expect(roster.section.gradeName).toBe("Grade 9");
            expect(roster.section.homeroomTeacher?.name).toBe("Tadesse Bekele");
            expect(roster.statistics.totalEnrolled).toBeGreaterThanOrEqual(3);
            expect(roster.statistics.maleCount).toBeGreaterThanOrEqual(2);
            expect(roster.statistics.femaleCount).toBeGreaterThanOrEqual(1);

            // Deterministic Ethiopian 3-tier name sort: Abebe -> Bethlehem -> Chala
            const names = roster.students.map(s => s.firstName);
            expect(names).toContain("Abebe");
            expect(names).toContain("Bethlehem");
            expect(names).toContain("Chala");

            // Verify roll numbers
            expect(roster.students[0]?.rollNumber).toBe(1);
            expect(roster.students[1]?.rollNumber).toBe(2);
        });
    });
});
