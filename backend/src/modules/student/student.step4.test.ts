import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../infrastructure/prisma/client.js";
import { StudentService } from "./student.service.js";
import { EnrollmentStatus, EnrollmentType, DocumentVerificationStatus } from "../../generated/prisma/enums.js";

describe("Step 4: Production Student Registration & Enrollment Workflows", () => {
    let testOrgId: string;
    let otherOrgId: string;
    let principalUserId: string;
    let activeYearId: string;
    let nextYearId: string;
    let archivedYearId: string;
    let otherYearId: string;
    let grade9Id: string;
    let grade10Id: string;
    let grade10NextYearId: string;
    let otherOrgGradeId: string;

    beforeAll(async () => {
        // 1. Setup Test Organizations
        const testOrg = await prisma.organizationUnit.create({
            data: { name: "Step 4 Model School", type: "SCHOOL" }
        });
        testOrgId = testOrg.id;

        const otherOrg = await prisma.organizationUnit.create({
            data: { name: "Step 4 External School", type: "SCHOOL" }
        });
        otherOrgId = otherOrg.id;

        // 2. Setup Principal User
        principalUserId = `user-princ-${Date.now()}`;
        await prisma.user.create({
            data: {
                id: principalUserId,
                email: `principal.step4.${Date.now()}@edubridge.local`,
                name: "Principal Abebech"
            }
        });

        // 3. Setup Academic Years (Step 1 Foundation)
        const activeYear = await prisma.academicYear.create({
            data: {
                organizationId: testOrgId,
                name: "2025/2026 Academic Year",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
                status: "ACTIVE"
            }
        });
        activeYearId = activeYear.id;

        const nextYear = await prisma.academicYear.create({
            data: {
                organizationId: testOrgId,
                name: "2026/2027 Academic Year",
                startDate: new Date("2026-09-01"),
                endDate: new Date("2027-06-30"),
                status: "PLANNED"
            }
        });
        nextYearId = nextYear.id;

        const archivedYear = await prisma.academicYear.create({
            data: {
                organizationId: testOrgId,
                name: "2024/2025 Academic Year",
                startDate: new Date("2024-09-01"),
                endDate: new Date("2025-06-30"),
                status: "ARCHIVED"
            }
        });
        archivedYearId = archivedYear.id;

        const otherYear = await prisma.academicYear.create({
            data: {
                organizationId: otherOrgId,
                name: "2025/2026 Academic Year (Other)",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
                status: "ACTIVE"
            }
        });
        otherYearId = otherYear.id;

        // 4. Setup Academic Grades (Step 2 Foundation)
        const stdGrade9 = await prisma.grade.upsert({
            where: {
                organizationId_name: {
                    organizationId: testOrgId,
                    name: "Grade 9 (Step 4 Test)"
                }
            },
            update: {},
            create: {
                organizationId: testOrgId,
                name: "Grade 9 (Step 4 Test)",
                level: 9
            }
        });

        const stdGrade10 = await prisma.grade.upsert({
            where: {
                organizationId_name: {
                    organizationId: testOrgId,
                    name: "Grade 10 (Step 4 Test)"
                }
            },
            update: {},
            create: {
                organizationId: testOrgId,
                name: "Grade 10 (Step 4 Test)",
                level: 10
            }
        });

        const schoolGrade9 = await prisma.schoolGrade.create({
            data: {
                academicYearId: activeYearId,
                gradeId: stdGrade9.id,
                status: "ACTIVE"
            }
        });
        grade9Id = schoolGrade9.id;

        const schoolGrade10 = await prisma.schoolGrade.create({
            data: {
                academicYearId: activeYearId,
                gradeId: stdGrade10.id,
                status: "ACTIVE"
            }
        });
        grade10Id = schoolGrade10.id;

        const schoolGrade10NextYear = await prisma.schoolGrade.create({
            data: {
                academicYearId: nextYearId,
                gradeId: stdGrade10.id,
                status: "ACTIVE"
            }
        });
        grade10NextYearId = schoolGrade10NextYear.id;

        const otherGrade = await prisma.grade.upsert({
            where: {
                organizationId_name: {
                    organizationId: otherOrgId,
                    name: "Grade 9 (Step 4 Test)"
                }
            },
            update: {},
            create: {
                organizationId: otherOrgId,
                name: "Grade 9 (Step 4 Test)",
                level: 9
            }
        });

        const otherSchoolGrade = await prisma.schoolGrade.create({
            data: {
                academicYearId: otherYearId,
                gradeId: otherGrade.id,
                status: "ACTIVE"
            }
        });
        otherOrgGradeId = otherSchoolGrade.id;
    });

    afterAll(async () => {
        // Cleanup all records created during testing
        await prisma.studentStatusHistory.deleteMany({
            where: { enrollment: { organizationId: { in: [testOrgId, otherOrgId] } } }
        });
        await prisma.studentDocument.deleteMany({
            where: { student: { enrollments: { some: { organizationId: { in: [testOrgId, otherOrgId] } } } } }
        });
        await prisma.studentEnrollment.deleteMany({
            where: { organizationId: { in: [testOrgId, otherOrgId] } }
        });
        await prisma.parentStudent.deleteMany({
            where: { student: { enrollments: { some: { organizationId: { in: [testOrgId, otherOrgId] } } } } }
        });
        await prisma.student.deleteMany({
            where: { firstName: { in: ["Yonas", "Beti", "Dawit", "Sara", "Tewodros"] } }
        });
        await prisma.auditLog.deleteMany({
            where: { organizationId: { in: [testOrgId, otherOrgId] } }
        });
        await prisma.schoolGrade.deleteMany({
            where: { academicYearId: { in: [activeYearId, nextYearId, archivedYearId, otherYearId] } }
        });
        await prisma.grade.deleteMany({
            where: { organizationId: { in: [testOrgId, otherOrgId] } }
        });
        await prisma.academicYear.deleteMany({
            where: { organizationId: { in: [testOrgId, otherOrgId] } }
        });
        await prisma.user.deleteMany({
            where: { id: principalUserId }
        });
        await prisma.organizationUnit.deleteMany({
            where: { id: { in: [testOrgId, otherOrgId] } }
        });
    });

    it("Scenario 1: Atomic New Student Intake & Unplaced Enrollment", async () => {
        const payload = {
            student: {
                firstName: "Yonas",
                fatherName: "Alemu",
                grandfatherName: "Worku",
                dateOfBirth: "2010-04-15",
                gender: "MALE",
                nationality: "Ethiopian",
                placeOfBirth: "Addis Ababa",
                region: "Addis Ababa",
                woreda: "Bole",
                kebele: "03",
                houseNumber: "452",
                emergencyContactName: "Alemu Worku",
                emergencyContactPhone: "0911002233",
                emergencyContactRelation: "Father"
            },
            guardians: [
                {
                    firstName: "Alemu",
                    lastName: "Worku",
                    phoneNumber: "0911002233",
                    email: "alemu.worku@example.com",
                    relationship: "Father",
                    isPrimary: true,
                    canPickup: true
                },
                {
                    firstName: "Tigist",
                    lastName: "Mulugeta",
                    phoneNumber: "0922334455",
                    relationship: "Mother",
                    isPrimary: false,
                    canPickup: true
                }
            ],
            enrollment: {
                academicYearId: activeYearId,
                schoolGradeId: grade9Id,
                enrollmentType: EnrollmentType.NEW
            },
            documents: [
                {
                    documentType: "BIRTH_CERTIFICATE",
                    title: "Kebele Birth Certificate",
                    fileUrl: "https://storage.edubridge.local/docs/birth-cert-yonas.pdf",
                    verificationStatus: DocumentVerificationStatus.PENDING
                }
            ]
        };

        const result = await StudentService.registerStudentIntake(testOrgId, payload, principalUserId);

        expect(result.student).toBeDefined();
        expect(result.student.firstName).toBe("Yonas");
        expect(result.student.fatherName).toBe("Alemu");
        expect(result.student.grandfatherName).toBe("Worku");
        expect(result.student.lastName).toBe("Alemu Worku");
        expect(result.student.studentId).toMatch(/^STU-\d{4}-\d{4}$/);

        // Verify Step 4 Placement Boundary: sectionId MUST be null
        expect(result.enrollment).toBeDefined();
        expect(result.enrollment.sectionId).toBeNull();
        expect(result.enrollment.status).toBe(EnrollmentStatus.ENROLLED);
        expect(result.enrollment.enrollmentType).toBe(EnrollmentType.NEW);
        expect(result.enrollment.academicYearId).toBe(activeYearId);
        expect(result.enrollment.schoolGradeId).toBe(grade9Id);

        // Verify Guardians persisted into Parent & ParentStudent tables
        expect(result.guardians).toHaveLength(2);
        const fatherLink = result.guardians.find(g => g.link.relationship === "Father");
        expect(fatherLink).toBeDefined();
        expect(fatherLink?.link.isPrimary).toBe(true);

        // Verify Documents persisted
        expect(result.documents).toHaveLength(1);
        expect(result.documents![0]!.verificationStatus).toBe(DocumentVerificationStatus.PENDING);
        expect(result.documents![0]!.documentType).toBe("BIRTH_CERTIFICATE");
    });

    it("Scenario 2: Returning Student Re-Enrollment without Identity Duplication", async () => {
        // 1. Find the student created in Scenario 1
        const searchResults = await StudentService.searchExistingStudents({ firstName: "Yonas", fatherName: "Alemu" });
        expect(searchResults.length).toBeGreaterThanOrEqual(1);
        const existingStudent = searchResults[0]!;

        // 2. Re-enroll for Next Academic Year in Grade 10
        const returningPayload = {
            isExistingStudent: true,
            existingStudentId: existingStudent.id,
            student: {
                firstName: existingStudent.firstName,
                fatherName: existingStudent.fatherName!,
                grandfatherName: existingStudent.grandfatherName!
            },
            enrollment: {
                academicYearId: nextYearId,
                schoolGradeId: grade10NextYearId,
                enrollmentType: EnrollmentType.RETURNING
            }
        };

        const reEnrollResult = await StudentService.registerStudentIntake(testOrgId, returningPayload, principalUserId);

        // Verify same student identity ID
        expect(reEnrollResult.student.id).toBe(existingStudent.id);
        expect(reEnrollResult.student.studentId).toBe(existingStudent.studentId);

        // Verify new enrollment record in Grade 10 with sectionId = null
        expect(reEnrollResult.enrollment.academicYearId).toBe(nextYearId);
        expect(reEnrollResult.enrollment.schoolGradeId).toBe(grade10NextYearId);
        expect(reEnrollResult.enrollment.sectionId).toBeNull();
        expect(reEnrollResult.enrollment.enrollmentType).toBe(EnrollmentType.RETURNING);

        // Verify multi-year historical preservation: student has 2 enrollments
        const studentProfile = await StudentService.getStudentById(existingStudent.id);
        expect(studentProfile?.enrollments).toHaveLength(2);
        const yearIds = studentProfile?.enrollments.map(e => e.academicYearId);
        expect(yearIds).toContain(activeYearId);
        expect(yearIds).toContain(nextYearId);
    });

    it("Scenario 3: Duplicate Active Enrollment Guard in Same Academic Year", async () => {
        const searchResults = await StudentService.searchExistingStudents({ firstName: "Yonas" });
        const existingStudent = searchResults[0]!;

        const duplicatePayload = {
            isExistingStudent: true,
            existingStudentId: existingStudent.id,
            student: {
                firstName: existingStudent.firstName,
                fatherName: existingStudent.fatherName!,
                grandfatherName: existingStudent.grandfatherName!
            },
            enrollment: {
                academicYearId: activeYearId,
                schoolGradeId: grade9Id,
                enrollmentType: EnrollmentType.RETURNING
            }
        };

        await expect(
            StudentService.registerStudentIntake(testOrgId, duplicatePayload, principalUserId)
        ).rejects.toThrow(/already actively enrolled/i);
    });

    it("Scenario 4: Academic Year State Guard (Rejects Archived / Completed Years)", async () => {
        const payload = {
            student: {
                firstName: "Beti",
                fatherName: "Haile",
                grandfatherName: "Kassa",
                gender: "FEMALE"
            },
            enrollment: {
                academicYearId: archivedYearId,
                schoolGradeId: grade9Id,
                enrollmentType: EnrollmentType.NEW
            }
        };

        await expect(
            StudentService.registerStudentIntake(testOrgId, payload, principalUserId)
        ).rejects.toThrow(/Cannot register or enroll students in an archived academic year/i);
    });

    it("Scenario 5: School Grade Ownership Guard (Rejects Foreign School Grades)", async () => {
        const payload = {
            student: {
                firstName: "Dawit",
                fatherName: "Kebede",
                grandfatherName: "Tessema",
                gender: "MALE"
            },
            enrollment: {
                academicYearId: activeYearId,
                schoolGradeId: otherOrgGradeId,
                enrollmentType: EnrollmentType.NEW
            }
        };

        await expect(
            StudentService.registerStudentIntake(testOrgId, payload, principalUserId)
        ).rejects.toThrow(/Target school grade not found or does not belong to this school organization/i);
    });

    it("Scenario 6: Document Verification Lifecycle", async () => {
        const payload = {
            student: {
                firstName: "Sara",
                fatherName: "Girma",
                grandfatherName: "Feyisa",
                gender: "FEMALE"
            },
            enrollment: {
                academicYearId: activeYearId,
                schoolGradeId: grade9Id,
                enrollmentType: EnrollmentType.TRANSFER_IN
            },
            documents: [
                {
                    documentType: "PREVIOUS_TRANSCRIPT",
                    title: "Grade 8 Official Transcript",
                    fileUrl: "https://storage.edubridge.local/docs/sara-g8.pdf",
                    verificationStatus: DocumentVerificationStatus.PENDING
                }
            ]
        };

        const result = await StudentService.registerStudentIntake(testOrgId, payload, principalUserId);
        const doc = result.documents![0]!;
        expect(doc.verificationStatus).toBe(DocumentVerificationStatus.PENDING);

        // Verify document as Principal
        const verifiedDoc = await StudentService.verifyDocument(
            testOrgId,
            doc.id,
            DocumentVerificationStatus.VERIFIED,
            "Official stamp verified against ministry registry",
            principalUserId
        );

        expect(verifiedDoc.verificationStatus).toBe(DocumentVerificationStatus.VERIFIED);
        expect(verifiedDoc.verificationNotes).toBe("Official stamp verified against ministry registry");
        expect(verifiedDoc.verifiedById).toBe(principalUserId);
        expect(verifiedDoc.verifiedAt).toBeDefined();
    });

    it("Scenario 7: School Tenant Isolation Querying", async () => {
        // School A (testOrgId) students should not include other schools' students
        const schoolAStudents = await StudentService.getSchoolStudents(testOrgId) as any[];
        expect(schoolAStudents.length).toBeGreaterThanOrEqual(2);

        const schoolBStudents = await StudentService.getSchoolStudents(otherOrgId) as any[];
        expect(schoolBStudents.length).toBe(0);
    });

    it("Scenario 8: Filter Directory by Gender and Search query", async () => {
        // Filter by FEMALE (Beti)
        const femaleResult = await StudentService.getSchoolStudents(testOrgId, { gender: "FEMALE", page: 1, limit: 10 }) as any;
        expect(femaleResult.data.length).toBe(1);
        expect(femaleResult.data.every((s: any) => s.gender?.toUpperCase() === "FEMALE")).toBe(true);

        // Filter by MALE (Yonas)
        const maleResult = await StudentService.getSchoolStudents(testOrgId, { gender: "MALE", page: 1, limit: 10 }) as any;
        expect(maleResult.data.length).toBe(1);
        expect(maleResult.data[0].firstName).toBe("Yonas");
        expect(maleResult.data.every((s: any) => s.gender?.toUpperCase() === "MALE")).toBe(true);

        // Multi-word name search (Yonas Alemu)
        const searchResult = await StudentService.getSchoolStudents(testOrgId, { search: "Yonas Alemu", page: 1, limit: 10 }) as any;
        expect(searchResult.data.length).toBe(1);
        expect(searchResult.data[0].firstName).toBe("Yonas");
    });
});
