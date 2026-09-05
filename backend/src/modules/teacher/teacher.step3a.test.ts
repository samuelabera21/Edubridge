import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../infrastructure/prisma/client.js";
import { TeacherService } from "./teacher.service.js";

describe("Step 3A: Production Teacher Registration & Credential Workflow", () => {
    let testOrgId: string;
    let otherOrgId: string;
    let principalUserId: string;
    let teacherUserId: string;
    let adminRoleId: string;
    let teacherRoleId: string;
    let physicsSubjectId: string;
    let otherOrgSubjectId: string;
    let createdTeacherId: string;

    beforeAll(async () => {
        // 1. Setup Test Organizations
        const testOrg = await prisma.organizationUnit.create({
            data: { name: "Step 3A Test High School", type: "SCHOOL" }
        });
        testOrgId = testOrg.id;

        const otherOrg = await prisma.organizationUnit.create({
            data: { name: "Step 3A External School", type: "SCHOOL" }
        });
        otherOrgId = otherOrg.id;

        // 2. Setup System Roles
        let adminRole = await prisma.role.findUnique({ where: { name: "SCHOOL_ADMIN" } });
        if (!adminRole) {
            adminRole = await prisma.role.create({ data: { name: "SCHOOL_ADMIN" } });
        }
        adminRoleId = adminRole.id;

        let teacherRole = await prisma.role.findUnique({ where: { name: "TEACHER" } });
        if (!teacherRole) {
            teacherRole = await prisma.role.create({ data: { name: "TEACHER" } });
        }
        teacherRoleId = teacherRole.id;

        // 3. Setup Users
        principalUserId = `user-princ-${Date.now()}`;
        await prisma.user.create({
            data: {
                id: principalUserId,
                email: `principal.s3a.${Date.now()}@edubridge.local`,
                name: "Principal Haile"
            }
        });
        await prisma.roleAssignment.create({
            data: {
                userId: principalUserId,
                roleId: adminRoleId,
                scopeId: testOrgId
            }
        });

        teacherUserId = `user-teacher-${Date.now()}`;
        await prisma.user.create({
            data: {
                id: teacherUserId,
                email: `teacher.user.${Date.now()}@edubridge.local`,
                name: "Teacher User"
            }
        });
        await prisma.roleAssignment.create({
            data: {
                userId: teacherUserId,
                roleId: teacherRoleId,
                scopeId: testOrgId
            }
        });

        // 4. Setup Subjects
        const physics = await prisma.subject.create({
            data: {
                organizationId: testOrgId,
                name: "Physics (Grade 9-12)",
                code: "PHY"
            }
        });
        physicsSubjectId = physics.id;

        const otherSubject = await prisma.subject.create({
            data: {
                organizationId: otherOrgId,
                name: "External Biology",
                code: "BIO-EXT"
            }
        });
        otherOrgSubjectId = otherSubject.id;
    });

    afterAll(async () => {
        // Cleanup test data
        await prisma.auditLog.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.teacherSpecialization.deleteMany({ where: { teacher: { organizationId: testOrgId } } });
        await prisma.teacherQualification.deleteMany({ where: { teacher: { organizationId: testOrgId } } });
        await prisma.teacherDocument.deleteMany({ where: { teacher: { organizationId: testOrgId } } });
        await prisma.teachingAssignment.deleteMany({ where: { teacher: { organizationId: testOrgId } } });
        await prisma.teacher.deleteMany({ where: { organizationId: testOrgId } });
        await prisma.subject.deleteMany({ where: { organizationId: { in: [testOrgId, otherOrgId] } } });
        await prisma.roleAssignment.deleteMany({ where: { userId: { in: [principalUserId, teacherUserId] } } });
        await prisma.user.deleteMany({ where: { id: { in: [principalUserId, teacherUserId] } } });
        await prisma.organizationUnit.deleteMany({ where: { id: { in: [testOrgId, otherOrgId] } } });
    });

    it("1. Successfully registers an Ethiopian teacher with identity, employment, and structured qualifications", async () => {
        const teacher = await TeacherService.createTeacher(testOrgId, {
            firstName: "Abebe",
            lastName: "Kebede",
            fatherName: "Tadesse",
            grandfatherName: "Worku",
            gender: "MALE",
            dateOfBirth: "1990-05-15",
            nationality: "Ethiopian",
            nationalIdNumber: "ETH-ID-992831",
            employeeId: "ETH-STAFF-001",
            staffIdCode: "TCH-001",
            phoneNumber: "+251911223344",
            email: "abebe.tadesse.test@edubridge.local",
            employmentType: "PERMANENT",
            employmentStatus: "ACTIVE",
            jobTitle: "Senior Secondary Physics Teacher",
            qualifications: [
                {
                    qualificationLevel: "BACHELORS",
                    qualificationTitle: "Bachelor of Science in Physics",
                    fieldOfStudy: "Physics",
                    institution: "Addis Ababa University",
                    graduationYear: 2014,
                    credentialNumber: "AAU-BSC-2014-9912",
                    country: "Ethiopia",
                    isHighest: true
                }
            ],
            specializations: [
                {
                    subjectId: physicsSubjectId,
                    cycle: "SECONDARY_FIRST_CYCLE",
                    isPrimary: true
                }
            ],
            actorUserId: principalUserId
        });

        expect(teacher).toBeDefined();
        expect(teacher.id).toBeDefined();
        createdTeacherId = teacher.id;

        expect(teacher.firstName).toBe("Abebe");
        expect(teacher.fatherName).toBe("Tadesse");
        expect(teacher.lastName).toBe("Kebede");
        expect(teacher.gender).toBe("MALE");
        expect(teacher.employeeId).toBe("ETH-STAFF-001");
        expect(teacher.staffIdCode).toBe("TCH-001");
        expect(teacher.employmentType).toBe("PERMANENT");
        expect(teacher.employmentStatus).toBe("ACTIVE");

        // Verify qualifications were persisted with PENDING verification status
        expect(teacher.qualifications).toHaveLength(1);
        const q = teacher.qualifications[0];
        expect(q.qualificationLevel).toBe("BACHELORS");
        expect(q.institution).toBe("Addis Ababa University");
        expect(q.verificationStatus).toBe("PENDING");

        // Verify specialization was created with verified: false
        expect(teacher.specializations).toHaveLength(1);
        expect(teacher.specializations[0].subjectId).toBe(physicsSubjectId);
        expect(teacher.specializations[0].verified).toBe(false);
    });

    it("2. Rejects registration when required identity data is missing", async () => {
        // Missing fatherName (Required under Ethiopian naming framework)
        await expect(TeacherService.createTeacher(testOrgId, {
            firstName: "Dawit",
            lastName: "Alemu",
            fatherName: "", // missing
            gender: "MALE"
        })).rejects.toThrow("Father's Name is required");

        // Missing gender
        await expect(TeacherService.createTeacher(testOrgId, {
            firstName: "Dawit",
            lastName: "Alemu",
            fatherName: "Bekele",
            gender: "" // invalid
        })).rejects.toThrow("Valid Gender is required");
    });

    it("3. Rejects duplicate staff/employee ID within the same school", async () => {
        await expect(TeacherService.createTeacher(testOrgId, {
            firstName: "Duplicate",
            lastName: "Test",
            fatherName: "User",
            gender: "FEMALE",
            employeeId: "ETH-STAFF-001" // already used by Abebe
        })).rejects.toThrow(/already exists/i);

        await expect(TeacherService.createTeacher(testOrgId, {
            firstName: "Duplicate2",
            lastName: "Test2",
            fatherName: "User2",
            gender: "FEMALE",
            staffIdCode: "TCH-001" // already used by Abebe
        })).rejects.toThrow(/already exists in this school/i);
    });

    it("4. Registration does NOT silently create any TeachingAssignment", async () => {
        const assignments = await prisma.teachingAssignment.findMany({
            where: { teacherId: createdTeacherId }
        });
        expect(assignments).toHaveLength(0);
    });

    it("5. Allows adding multiple structured qualifications to one teacher", async () => {
        const qual2 = await TeacherService.addTeacherQualification(
            testOrgId,
            createdTeacherId,
            {
                qualificationLevel: "MASTERS",
                qualificationTitle: "Master of Education in Curriculum & Instruction",
                fieldOfStudy: "Educational Pedagogy",
                institution: "Kotebe University of Education",
                graduationYear: 2020,
                credentialNumber: "KUE-MED-2020-041",
                country: "Ethiopia",
                isHighest: true
            },
            principalUserId
        );

        expect(qual2).toBeDefined();
        expect(qual2.qualificationLevel).toBe("MASTERS");
        expect(qual2.verificationStatus).toBe("PENDING");

        const teacher = await TeacherService.getTeacherById(testOrgId, createdTeacherId);
        expect(teacher?.qualifications).toHaveLength(2);
    });

    it("6. Principal/Admin can verify a teacher qualification", async () => {
        const teacher = await TeacherService.getTeacherById(testOrgId, createdTeacherId);
        const bachelorQual = teacher!.qualifications.find(q => q.qualificationLevel === "BACHELORS");
        expect(bachelorQual).toBeDefined();

        const verified = await TeacherService.verifyTeacherQualification(
            testOrgId,
            createdTeacherId,
            bachelorQual!.id,
            {
                verificationStatus: "VERIFIED",
                verificationNotes: "Verified against MoE authenticated degree certificate."
            },
            principalUserId,
            ["SCHOOL_ADMIN", "PRINCIPAL"]
        );

        expect(verified.verificationStatus).toBe("VERIFIED");
        expect(verified.verifiedById).toBe(principalUserId);
        expect(verified.verifiedAt).toBeDefined();
        expect(verified.verificationNotes).toContain("MoE authenticated");
    });

    it("7. Rejects unauthorized credential verification (teacher self-verification)", async () => {
        // Associate teacher with a user account
        await prisma.teacher.update({
            where: { id: createdTeacherId },
            data: { userId: teacherUserId }
        });

        const teacher = await TeacherService.getTeacherById(testOrgId, createdTeacherId);
        const masterQual = teacher!.qualifications.find(q => q.qualificationLevel === "MASTERS");

        // Teacher attempts to verify own credential
        await expect(TeacherService.verifyTeacherQualification(
            testOrgId,
            createdTeacherId,
            masterQual!.id,
            { verificationStatus: "VERIFIED" },
            teacherUserId, // actor is the teacher themselves
            ["TEACHER"] // only teacher role
        )).rejects.toThrow(/Unauthorized/i);
    });

    it("8. Rejects cross-school specialization references during registration", async () => {
        await expect(TeacherService.createTeacher(testOrgId, {
            firstName: "Cross",
            lastName: "School",
            fatherName: "Test",
            gender: "MALE",
            specializations: [
                {
                    subjectId: otherOrgSubjectId // belongs to otherOrgId!
                }
            ]
        })).rejects.toThrow(/does not belong to this school/i);
    });

    it("9. Supports supporting document upload and verification workflow", async () => {
        const doc = await TeacherService.addTeacherDocument(
            testOrgId,
            createdTeacherId,
            {
                documentType: "QUALIFICATION_CERTIFICATE",
                title: "AAU Bachelor Degree Copy",
                fileUrl: "https://storage.edubridge.local/credentials/aau-deg.pdf"
            },
            principalUserId
        );

        expect(doc).toBeDefined();
        expect(doc.verificationStatus).toBe("PENDING");

        const verifiedDoc = await TeacherService.verifyTeacherDocument(
            testOrgId,
            createdTeacherId,
            doc.id,
            { verificationStatus: "VERIFIED", verificationNotes: "Original stamped diploma inspected." },
            principalUserId,
            ["SCHOOL_ADMIN"]
        );

        expect(verifiedDoc.verificationStatus).toBe("VERIFIED");
        expect(verifiedDoc.verifiedById).toBe(principalUserId);
    });

    it("10. Updates employment status (TRANSFERRED / RESIGNED) while preserving historical records", async () => {
        const updated = await TeacherService.updateTeacherEmploymentStatus(
            testOrgId,
            createdTeacherId,
            {
                employmentStatus: "TRANSFERRED",
                reason: "Transferred to Hawassa Secondary School per Regional Education Bureau letter"
            },
            principalUserId
        );

        expect(updated.employmentStatus).toBe("TRANSFERRED");

        // Verify qualifications and profile remain completely preserved
        const profile = await TeacherService.getTeacherById(testOrgId, createdTeacherId);
        expect(profile).toBeDefined();
        expect(profile?.employmentStatus).toBe("TRANSFERRED");
        expect(profile?.qualifications).toHaveLength(2);
        expect(profile?.teacherDocuments).toHaveLength(1);
    });
});
