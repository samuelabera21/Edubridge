import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../infrastructure/prisma/client.js";
import { TimetableService } from "./timetable.service.js";

describe("Step 6: Timetable & Instructional Scheduling Integration Test Suite", () => {
    let schoolAId: string;
    let schoolBId: string;
    let adminUserId: string;

    let activeYearAId: string;
    let completedYearAId: string;
    let activeYearBId: string;

    let grade9AId: string;
    let section9AId: string;
    let section9BId: string;

    let grade10AId: string;
    let section10AId: string;

    let schoolBGrade9Id: string;
    let schoolBSection9AId: string;

    let teacher1Id: string;
    let teacher2Id: string;
    let teacher3BlockedId: string;
    let schoolBTeacherId: string;

    let student1UserId: string;
    let student1Id: string;

    let subjectMathId: string;
    let subjectEngId: string;
    let subjectBioId: string;

    let period1Id: string;
    let period2Id: string;
    let breakPeriodId: string;

    let ta9AMathId: string; // Math for 9A (periodsPerWeek = 2)
    let ta9AEngId: string;  // Eng for 9A (periodsPerWeek = 1)
    let ta9BMathId: string; // Math for 9B with same teacher1 (periodsPerWeek = 2)
    let ta9ABioBlockedId: string; // Bio with teacher3 who has blocked slots

    beforeAll(async () => {
        // 1. Schools
        const schoolA = await prisma.organizationUnit.create({
            data: { name: "Step 6 School A", type: "SCHOOL" }
        });
        schoolAId = schoolA.id;

        const schoolB = await prisma.organizationUnit.create({
            data: { name: "Step 6 School B", type: "SCHOOL" }
        });
        schoolBId = schoolB.id;

        // 2. Admin User
        adminUserId = `admin-s6-${Date.now()}`;
        await prisma.user.create({
            data: {
                id: adminUserId,
                email: `admin.step6.${Date.now()}@edubridge.local`,
                name: "Admin Aster"
            }
        });

        // 3. Academic Years
        const activeYearA = await prisma.academicYear.create({
            data: {
                organizationId: schoolAId,
                name: "2026/2027 Academic Year (S6-A)",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "ACTIVE"
            }
        });
        activeYearAId = activeYearA.id;

        const completedYearA = await prisma.academicYear.create({
            data: {
                organizationId: schoolAId,
                name: "2025/2026 Completed Year (S6-A)",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
                status: "COMPLETED"
            }
        });
        completedYearAId = completedYearA.id;

        const activeYearB = await prisma.academicYear.create({
            data: {
                organizationId: schoolBId,
                name: "2026/2027 Academic Year (S6-B)",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "ACTIVE"
            }
        });
        activeYearBId = activeYearB.id;

        // 4. Timetable Config for School A (Mon-Fri)
        await prisma.timetableConfig.create({
            data: {
                organizationId: schoolAId,
                academicYearId: activeYearAId,
                operatingDays: [1, 2, 3, 4, 5],
                startTime: "08:00",
                periodDuration: 40,
                periodsPerDay: 4,
                shift: "FULL"
            }
        });

        // 5. Class Periods for School A
        const p1 = await prisma.classPeriod.create({
            data: {
                organizationId: schoolAId,
                name: "Period 1",
                startTime: "08:00",
                endTime: "08:40",
                isBreak: false
            }
        });
        period1Id = p1.id;

        const p2 = await prisma.classPeriod.create({
            data: {
                organizationId: schoolAId,
                name: "Period 2",
                startTime: "08:40",
                endTime: "09:20",
                isBreak: false
            }
        });
        period2Id = p2.id;

        const pBreak = await prisma.classPeriod.create({
            data: {
                organizationId: schoolAId,
                name: "Morning Recess",
                startTime: "09:20",
                endTime: "09:40",
                isBreak: true
            }
        });
        breakPeriodId = pBreak.id;

        // 6. Base Grades & SchoolGrades
        const grade9Base = await prisma.grade.upsert({
            where: {
                organizationId_level: {
                    organizationId: schoolAId,
                    level: 9
                }
            },
            update: {},
            create: { organizationId: schoolAId, name: "Grade 9", level: 9 }
        });
        const grade10Base = await prisma.grade.upsert({
            where: {
                organizationId_level: {
                    organizationId: schoolAId,
                    level: 10
                }
            },
            update: {},
            create: { organizationId: schoolAId, name: "Grade 10", level: 10 }
        });

        const sg9A = await prisma.schoolGrade.create({
            data: { academicYearId: activeYearAId, gradeId: grade9Base.id }
        });
        grade9AId = sg9A.id;

        const sg10A = await prisma.schoolGrade.create({
            data: { academicYearId: activeYearAId, gradeId: grade10Base.id }
        });
        grade10AId = sg10A.id;

        const grade9BaseSchoolB = await prisma.grade.upsert({
            where: {
                organizationId_level: {
                    organizationId: schoolBId,
                    level: 9
                }
            },
            update: {},
            create: { organizationId: schoolBId, name: "Grade 9", level: 9 }
        });

        const sg9B = await prisma.schoolGrade.create({
            data: { academicYearId: activeYearBId, gradeId: grade9BaseSchoolB.id }
        });
        schoolBGrade9Id = sg9B.id;

        // 7. Sections
        const s9A = await prisma.section.create({
            data: { schoolGradeId: grade9AId, name: "9A", capacity: 40, status: "ACTIVE" }
        });
        section9AId = s9A.id;

        const s9B = await prisma.section.create({
            data: { schoolGradeId: grade9AId, name: "9B", capacity: 40, status: "ACTIVE" }
        });
        section9BId = s9B.id;

        const s10A = await prisma.section.create({
            data: { schoolGradeId: grade10AId, name: "10A", capacity: 40, status: "ACTIVE" }
        });
        section10AId = s10A.id;

        const s9BSchoolB = await prisma.section.create({
            data: { schoolGradeId: schoolBGrade9Id, name: "9A", capacity: 40, status: "ACTIVE" }
        });
        schoolBSection9AId = s9BSchoolB.id;

        // 8. Subjects
        const subMath = await prisma.subject.create({
            data: { organizationId: schoolAId, name: "Mathematics", code: "MATH" }
        });
        subjectMathId = subMath.id;

        const subEng = await prisma.subject.create({
            data: { organizationId: schoolAId, name: "English", code: "ENG" }
        });
        subjectEngId = subEng.id;

        const subBio = await prisma.subject.create({
            data: { organizationId: schoolAId, name: "Biology", code: "BIO" }
        });
        subjectBioId = subBio.id;

        // 9. Teachers
        const t1 = await prisma.teacher.create({
            data: {
                organizationId: schoolAId,
                firstName: "Mulugeta",
                lastName: "Tesfaye",
                gender: "MALE"
            }
        });
        teacher1Id = t1.id;

        const t2 = await prisma.teacher.create({
            data: {
                organizationId: schoolAId,
                firstName: "Almaz",
                lastName: "Demisse",
                gender: "FEMALE"
            }
        });
        teacher2Id = t2.id;

        // Teacher 3 with blocked slot on Monday Period 1 (dayOfWeek: 1, classPeriodId: period1Id)
        const t3 = await prisma.teacher.create({
            data: {
                organizationId: schoolAId,
                firstName: "Dawit",
                lastName: "Haile",
                gender: "MALE",
                availability: {
                    blockedSlots: [
                        { dayOfWeek: 1, classPeriodId: period1Id }
                    ]
                }
            }
        });
        teacher3BlockedId = t3.id;

        const tSchoolB = await prisma.teacher.create({
            data: {
                organizationId: schoolBId,
                firstName: "SchoolB",
                lastName: "Instructor",
                gender: "MALE"
            }
        });
        schoolBTeacherId = tSchoolB.id;

        // 10. Student for "My Timetable" verification
        student1UserId = `user-student-s6-${Date.now()}`;
        await prisma.user.create({
            data: {
                id: student1UserId,
                email: `student.step6.${Date.now()}@edubridge.local`,
                name: "Biruk Girma"
            }
        });

        const student1 = await prisma.student.create({
            data: {
                studentId: `STU-S6-${Date.now()}`,
                userId: student1UserId,
                firstName: "Biruk",
                lastName: "Girma",
                fatherName: "Girma",
                gender: "MALE"
            }
        });
        student1Id = student1.id;

        await prisma.studentEnrollment.create({
            data: {
                studentId: student1Id,
                organizationId: schoolAId,
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                status: "ENROLLED"
            }
        });

        // 11. Teaching Assignments (Step 3 Source of Truth)
        // 9A Math: Teacher 1 (periodsPerWeek = 2)
        const ta1 = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                teacherId: teacher1Id,
                subjectId: subjectMathId,
                periodsPerWeek: 2,
                status: "ACTIVE"
            }
        });
        ta9AMathId = ta1.id;

        // 9A English: Teacher 2 (periodsPerWeek = 1)
        const ta2 = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                teacherId: teacher2Id,
                subjectId: subjectEngId,
                periodsPerWeek: 1,
                status: "ACTIVE"
            }
        });
        ta9AEngId = ta2.id;

        // 9B Math: Teacher 1 (periodsPerWeek = 2)
        const ta3 = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9BId,
                teacherId: teacher1Id,
                subjectId: subjectMathId,
                periodsPerWeek: 2,
                status: "ACTIVE"
            }
        });
        ta9BMathId = ta3.id;

        // 9A Bio: Teacher 3 (with blocked slot)
        const ta4 = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                teacherId: teacher3BlockedId,
                subjectId: subjectBioId,
                periodsPerWeek: 1,
                status: "ACTIVE"
            }
        });
        ta9ABioBlockedId = ta4.id;
    });

    afterAll(async () => {
        // Cleanup created data
        await prisma.timetable.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId] } } });
        await prisma.calendarEvent.deleteMany({ where: { academicCalendar: { academicYearId: { in: [activeYearAId, completedYearAId, activeYearBId] } } } });
        await prisma.academicCalendar.deleteMany({ where: { academicYearId: { in: [activeYearAId, completedYearAId, activeYearBId] } } });
        await prisma.teachingAssignment.deleteMany({ where: { academicYearId: { in: [activeYearAId, completedYearAId, activeYearBId] } } });
        await prisma.student.deleteMany({ where: { id: student1Id } });
        await prisma.user.deleteMany({ where: { id: { in: [adminUserId, student1UserId] } } });
        await prisma.section.deleteMany({ where: { schoolGradeId: { in: [grade9AId, grade10AId, schoolBGrade9Id] } } });
        await prisma.schoolGrade.deleteMany({ where: { academicYearId: { in: [activeYearAId, completedYearAId, activeYearBId] } } });
        await prisma.grade.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId] } } });
        await prisma.classPeriod.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId] } } });
        await prisma.timetableConfig.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId] } } });
        await prisma.academicYear.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId] } } });
        await prisma.teacher.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId] } } });
        await prisma.subject.deleteMany({ where: { organizationId: { in: [schoolAId, schoolBId] } } });
        await prisma.organizationUnit.deleteMany({ where: { id: { in: [schoolAId, schoolBId] } } });
    });

    // ==========================================
    // 1. SECTION-ORIENTED WORKSPACE RETRIEVAL
    // ==========================================
    it("1. Retrieves Section Workspace with correct instructional demand, scheduled counts, and remaining deficit", async () => {
        const workspace = await TimetableService.getSectionWorkspace(schoolAId, {
            academicYearId: activeYearAId,
            schoolGradeId: grade9AId,
            sectionId: section9AId
        });

        expect(workspace).toBeDefined();
        expect(workspace.academicYear?.id).toBe(activeYearAId);
        expect(workspace.selectedSection?.id).toBe(section9AId);
        expect(workspace.selectedSection?.enrolledStudentsCount).toBe(1); // 1 student placed in 9A
        expect(workspace.periods.length).toBeGreaterThanOrEqual(3); // P1, P2, Break

        // Verify teaching assignments list
        const mathAssignment = workspace.teachingAssignments.find(a => a.id === ta9AMathId);
        expect(mathAssignment).toBeDefined();
        expect(mathAssignment?.requiredPeriods).toBe(2);
        expect(mathAssignment?.scheduledPeriods).toBe(0);
        expect(mathAssignment?.remainingPeriods).toBe(2);
        expect(mathAssignment?.isComplete).toBe(false);

        // Overall coverage
        expect(workspace.coverage.totalRequired).toBeGreaterThanOrEqual(4); // 2 math + 1 eng + 1 bio
        expect(workspace.coverage.totalScheduled).toBe(0);
        expect(workspace.coverage.coveragePercentage).toBe(0);
        expect(workspace.status).toBe("DRAFT");
    });

    // ==========================================
    // 2. SUCCESSFUL LESSON SCHEDULING
    // ==========================================
    it("2. Successfully schedules an instructional lesson linking TeachingAssignment to Day + Period", async () => {
        // Schedule Math for 9A on Monday Period 1 (dayOfWeek: 1, classPeriodId: period1Id)
        const entry = await TimetableService.assignTimetable(schoolAId, adminUserId, {
            academicYearId: activeYearAId,
            teachingAssignmentId: ta9AMathId,
            classPeriodId: period1Id,
            dayOfWeek: 1
        });

        expect(entry).toBeDefined();
        expect(entry.id).toBeDefined();
        expect(entry.dayOfWeek).toBe(1);
        expect(entry.classPeriodId).toBe(period1Id);
        expect(entry.teachingAssignmentId).toBe(ta9AMathId);

        // Verify workspace reflects the scheduled slot
        const workspace = await TimetableService.getSectionWorkspace(schoolAId, {
            academicYearId: activeYearAId,
            sectionId: section9AId
        });
        const mathAssignment = workspace.teachingAssignments.find(a => a.id === ta9AMathId);
        expect(mathAssignment?.scheduledPeriods).toBe(1);
        expect(mathAssignment?.remainingPeriods).toBe(1);
        expect(workspace.coverage.totalScheduled).toBe(1);
    });

    // ==========================================
    // 3. SECTION COLLISION REJECTION
    // ==========================================
    it("3. Rejects section double-booking (attempting to schedule English into Monday Period 1 for 9A)", async () => {
        // Monday Period 1 is already taken by Math in 9A. Attempting English in 9A must be rejected!
        await expect(
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9AEngId,
                classPeriodId: period1Id,
                dayOfWeek: 1
            })
        ).rejects.toThrow(/Section conflict.*already has.*scheduled in this period/i);
    });

    // ==========================================
    // 4. TEACHER COLLISION REJECTION
    // ==========================================
    it("4. Rejects teacher double-booking across sections (Teacher 1 is in 9A on Mon P1; cannot teach 9B on Mon P1)", async () => {
        // Teacher 1 is already teaching 9A on Monday Period 1.
        // Attempting to schedule Teacher 1 in 9B on Monday Period 1 must be rejected!
        await expect(
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9BMathId,
                classPeriodId: period1Id,
                dayOfWeek: 1
            })
        ).rejects.toThrow(/Teacher conflict.*already scheduled.*during this period/i);
    });

    // ==========================================
    // 5. TEACHER AVAILABILITY BLOCK REJECTION
    // ==========================================
    it("5. Rejects scheduling when the slot is blocked in Teacher's availability preferences", async () => {
        // Teacher 3 has blocked slots on Monday Period 1
        await expect(
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9ABioBlockedId,
                classPeriodId: period1Id,
                dayOfWeek: 1
            })
        ).rejects.toThrow(/conflict/i);
    });

    // ==========================================
    // 6. BREAK PERIOD INVARIANT REJECTION
    // ==========================================
    it("6. Rejects scheduling lessons during recess/break periods", async () => {
        await expect(
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9AMathId,
                classPeriodId: breakPeriodId,
                dayOfWeek: 1
            })
        ).rejects.toThrow(/Cannot assign lessons during break period/i);
    });

    // ==========================================
    // 7. OPERATING DAY INVARIANT REJECTION
    // ==========================================
    it("7. Rejects scheduling on non-operating days (e.g. Sunday = 0)", async () => {
        await expect(
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9AMathId,
                classPeriodId: period2Id,
                dayOfWeek: 0 // Sunday
            })
        ).rejects.toThrow(/not an active operating day/i);
    });

    // ==========================================
    // 7b. ACADEMIC CALENDAR CLOSED DAY REJECTION
    // ==========================================
    it("7b. Rejects scheduling on days designated as closed in Academic Calendar", async () => {
        const cal = await prisma.academicCalendar.create({
            data: {
                academicYearId: activeYearAId,
                status: "PUBLISHED"
            }
        });

        await prisma.calendarEvent.create({
            data: {
                academicCalendarId: cal.id,
                title: "Orthodox Fasting Friday Closure",
                category: "HOLIDAY_BREAK",
                type: "SCHOOL_HOLIDAY",
                startDate: new Date("2026-10-01"),
                endDate: new Date("2026-10-01"),
                isSchoolClosed: true,
                metadata: { closedDaysOfWeek: [5] } // Friday closed
            }
        });

        // Attempting to schedule on Friday (dayOfWeek: 5) must be rejected
        await expect(
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9AEngId,
                classPeriodId: period1Id,
                dayOfWeek: 5
            })
        ).rejects.toThrow(/marked as closed in Academic Calendar/i);
    });

    // ==========================================
    // 8. WEEKLY PERIOD CAP ENFORCEMENT
    // ==========================================
    it("8. Rejects scheduling beyond the assignment's periodsPerWeek cap", async () => {
        // ta9AMathId has periodsPerWeek = 2. It currently has 1 period scheduled (Mon P1).
        // Schedule second period on Tuesday Period 1:
        await TimetableService.assignTimetable(schoolAId, adminUserId, {
            academicYearId: activeYearAId,
            teachingAssignmentId: ta9AMathId,
            classPeriodId: period1Id,
            dayOfWeek: 2
        });

        // Attempting to schedule a 3rd period for ta9AMathId must be rejected!
        await expect(
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9AMathId,
                classPeriodId: period1Id,
                dayOfWeek: 3
            })
        ).rejects.toThrow(/Weekly requirement exceeded.*requires 2 periods per week/i);
    });

    // ==========================================
    // 9. ACADEMIC YEAR LIFECYCLE IMMUTABILITY
    // ==========================================
    it("9. Rejects scheduling mutations on COMPLETED or ARCHIVED academic years", async () => {
        // Create an assignment in completedYearA
        const taCompleted = await prisma.teachingAssignment.create({
            data: {
                academicYearId: completedYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                teacherId: teacher1Id,
                subjectId: subjectMathId,
                periodsPerWeek: 2
            }
        });

        await expect(
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: completedYearAId,
                teachingAssignmentId: taCompleted.id,
                classPeriodId: period1Id,
                dayOfWeek: 1
            })
        ).rejects.toThrow(/completed and cannot be modified/i);
    });

    // ==========================================
    // 10. MULTI-TENANT ISOLATION
    // ==========================================
    it("10. Enforces strict tenant isolation (School A cannot schedule School B assignment)", async () => {
        // Create an assignment in School B
        const taSchoolB = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearBId,
                schoolGradeId: schoolBGrade9Id,
                sectionId: schoolBSection9AId,
                teacherId: schoolBTeacherId,
                subjectId: subjectMathId,
                periodsPerWeek: 2
            }
        });

        await expect(
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: taSchoolB.id,
                classPeriodId: period1Id,
                dayOfWeek: 1
            })
        ).rejects.toThrow(/Teaching assignment not found or does not belong to this school/i);
    });

    // ==========================================
    // 11. IN-PLACE SLOT REASSIGNMENT
    // ==========================================
    it("11. Successfully reassigns a timetable slot to another teacher/subject in the same section with audit logging", async () => {
        // Schedule English for 9A on Monday Period 2
        const engEntry = await TimetableService.assignTimetable(schoolAId, adminUserId, {
            academicYearId: activeYearAId,
            teachingAssignmentId: ta9AEngId,
            classPeriodId: period2Id,
            dayOfWeek: 1
        });

        // Create new assignment: Biology for 9A with Teacher 2
        const taBioT2 = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                teacherId: teacher2Id,
                subjectId: subjectBioId,
                periodsPerWeek: 1,
                status: "ACTIVE"
            }
        });

        // Reassign the slot to Biology with Teacher 2
        const reassigned = await TimetableService.reassignSlot(schoolAId, adminUserId, {
            timetableId: engEntry.id,
            newTeachingAssignmentId: taBioT2.id,
            reason: "English teacher transferred; Biology schedule adjusted."
        });

        expect(reassigned.teachingAssignmentId).toBe(taBioT2.id);

        // Verify audit trail
        const audit = await prisma.auditLog.findFirst({
            where: {
                organizationId: schoolAId,
                action: "TIMETABLE_SLOT_REASSIGNED",
                resourceId: engEntry.id
            }
        });
        expect(audit).toBeDefined();
        expect((audit?.newValue as any).reason).toBe("English teacher transferred; Biology schedule adjusted.");
    });

    // ==========================================
    // 12. SLOT REMOVAL & AUDIT LOGGING
    // ==========================================
    it("12. Removes a timetable slot and records an immutable TIMETABLE_SLOT_REMOVED audit log", async () => {
        // Find an existing entry
        const entry = await prisma.timetable.findFirst({
            where: { organizationId: schoolAId, teachingAssignmentId: ta9AMathId, dayOfWeek: 2 }
        });
        expect(entry).toBeDefined();

        const result = await TimetableService.deleteTimetable(schoolAId, adminUserId, entry!.id);
        expect(result.success).toBe(true);

        // Verify it was deleted from DB
        const deleted = await prisma.timetable.findUnique({ where: { id: entry!.id } });
        expect(deleted).toBeNull();

        // Verify audit log
        const audit = await prisma.auditLog.findFirst({
            where: {
                organizationId: schoolAId,
                action: "TIMETABLE_SLOT_REMOVED",
                resourceId: entry!.id
            }
        });
        expect(audit).toBeDefined();
        expect((audit?.oldValue as any).subject).toBe("Mathematics");
    });

    // ==========================================
    // 13. PUBLISHING LIFECYCLE
    // ==========================================
    it("13. Publishes and unpublishes the timetable for the academic year with audit trail", async () => {
        // Publish timetable
        const publishResult = await TimetableService.publishTimetable(schoolAId, adminUserId, activeYearAId);
        expect(publishResult.status).toBe("PUBLISHED");

        // Verify workspace returns PUBLISHED
        let workspace = await TimetableService.getSectionWorkspace(schoolAId, {
            academicYearId: activeYearAId,
            sectionId: section9AId
        });
        expect(workspace.status).toBe("PUBLISHED");

        // Unpublish timetable
        const unpublishResult = await TimetableService.unpublishTimetable(schoolAId, adminUserId, activeYearAId);
        expect(unpublishResult.status).toBe("DRAFT");

        workspace = await TimetableService.getSectionWorkspace(schoolAId, {
            academicYearId: activeYearAId,
            sectionId: section9AId
        });
        expect(workspace.status).toBe("DRAFT");
    });

    // ==========================================
    // 14. STUDENT "MY TIMETABLE" ACCESS
    // ==========================================
    it("14. Correctly retrieves authorized personal timetable for authenticated student", async () => {
        const studentSchedule = await TimetableService.getMyTimetable(schoolAId, student1UserId);

        expect(studentSchedule.actorType).toBe("STUDENT");
        expect(studentSchedule.section?.name).toBe("9A");
        expect(studentSchedule.timetable.length).toBeGreaterThan(0);
        // Verify entries belong exclusively to Section 9A
        studentSchedule.timetable.forEach((item: any) => {
            expect(item.teachingAssignment.sectionId).toBe(section9AId);
        });
    });

    // ==========================================
    // 15. TEACHER CONSOLIDATED TIMETABLE ACCESS
    // ==========================================
    it("15. Correctly retrieves authorized consolidated timetable for authenticated teacher", async () => {
        // Link teacher1 to a user account
        const teacherUserId = `user-teacher1-${Date.now()}`;
        await prisma.user.create({
            data: {
                id: teacherUserId,
                email: `teacher1.${Date.now()}@edubridge.local`,
                name: "Mulugeta Tesfaye"
            }
        });
        await prisma.teacher.update({
            where: { id: teacher1Id },
            data: { userId: teacherUserId }
        });

        const teacherSchedule = await TimetableService.getMyTimetable(schoolAId, teacherUserId);

        expect(teacherSchedule.actorType).toBe("TEACHER");
        expect(teacherSchedule.timetable.length).toBeGreaterThan(0);
        teacherSchedule.timetable.forEach((item: any) => {
            expect(item.teachingAssignment.teacherId).toBe(teacher1Id);
        });
    });

    // ==========================================
    // 16. CONCURRENCY PROTECTION
    // ==========================================
    it("16. Concurrency Protection: Concurrent conflicting requests cannot book the same teacher into two sections simultaneously", async () => {
        // Teacher 2 currently has 0 slots on Wednesday Period 1 (dayOfWeek: 3, classPeriodId: period1Id)
        // Setup two assignments for Teacher 2: one in 9A, one in 9B
        const ta9AT2 = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9AId,
                teacherId: teacher2Id,
                subjectId: subjectEngId,
                periodsPerWeek: 5
            }
        });
        const ta9BT2 = await prisma.teachingAssignment.create({
            data: {
                academicYearId: activeYearAId,
                schoolGradeId: grade9AId,
                sectionId: section9BId,
                teacherId: teacher2Id,
                subjectId: subjectEngId,
                periodsPerWeek: 5
            }
        });

        // Launch two concurrent requests attempting to place Teacher 2 on Wednesday Period 1 in 9A and 9B
        const promises = [
            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9AT2.id,
                classPeriodId: period1Id,
                dayOfWeek: 3
            }).then(() => "SUCCESS").catch((err) => `FAILED: ${err.message}`),

            TimetableService.assignTimetable(schoolAId, adminUserId, {
                academicYearId: activeYearAId,
                teachingAssignmentId: ta9BT2.id,
                classPeriodId: period1Id,
                dayOfWeek: 3
            }).then(() => "SUCCESS").catch((err) => `FAILED: ${err.message}`)
        ];

        const results = await Promise.all(promises);

        // Exactly one must succeed, and the other must be rejected with teacher conflict!
        const successCount = results.filter(r => r === "SUCCESS").length;
        const failedCount = results.filter(r => r.startsWith("FAILED")).length;

        expect(successCount).toBe(1);
        expect(failedCount).toBe(1);

        // Verify database holds exactly 1 record for Wednesday Period 1 with Teacher 2
        const bookedEntries = await prisma.timetable.count({
            where: {
                organizationId: schoolAId,
                academicYearId: activeYearAId,
                dayOfWeek: 3,
                classPeriodId: period1Id,
                teachingAssignment: { teacherId: teacher2Id }
            }
        });
        expect(bookedEntries).toBe(1);
    });
});
