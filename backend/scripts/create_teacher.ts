import { auth } from "../src/modules/authentication/auth.js";
import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignRoleToUser } from "../src/modules/authentication/authorization.service.js";

async function main() {
    console.log("Setting up Teacher account...");

    // 1. Find or verify the school
    const school = await prisma.organizationUnit.findFirst({
        where: { type: "SCHOOL" }
    });
    if (!school) throw new Error("School not found!");

    // 2. Find or create active academic year
    let academicYear = await prisma.academicYear.findFirst({
        where: { organizationId: school.id, status: "ACTIVE" }
    });
    if (!academicYear) {
        academicYear = await prisma.academicYear.create({
            data: {
                organizationId: school.id,
                name: "2018 E.C. (2025/2026)",
                startDate: new Date("2025-09-01"),
                endDate: new Date("2026-06-30"),
                status: "ACTIVE"
            }
        });
    }

    // 3. Ensure Grades & Subjects exist
    const math = await prisma.subject.upsert({
        where: { organizationId_name: { organizationId: school.id, name: "Mathematics" } },
        update: {},
        create: { organizationId: school.id, name: "Mathematics", code: "MATH" }
    });

    const physics = await prisma.subject.upsert({
        where: { organizationId_name: { organizationId: school.id, name: "Physics" } },
        update: {},
        create: { organizationId: school.id, name: "Physics", code: "PHYS" }
    });

    const grade9 = await prisma.grade.upsert({
        where: { organizationId_name: { organizationId: school.id, name: "Grade 9" } },
        update: {},
        create: { organizationId: school.id, name: "Grade 9", level: 9 }
    });

    const grade10 = await prisma.grade.upsert({
        where: { organizationId_name: { organizationId: school.id, name: "Grade 10" } },
        update: {},
        create: { organizationId: school.id, name: "Grade 10", level: 10 }
    });

    // School grades
    let sg9 = await prisma.schoolGrade.findFirst({
        where: { gradeId: grade9.id, academicYearId: academicYear.id }
    });
    if (!sg9) {
        sg9 = await prisma.schoolGrade.create({
            data: { gradeId: grade9.id, academicYearId: academicYear.id }
        });
    }

    let sg10 = await prisma.schoolGrade.findFirst({
        where: { gradeId: grade10.id, academicYearId: academicYear.id }
    });
    if (!sg10) {
        sg10 = await prisma.schoolGrade.create({
            data: { gradeId: grade10.id, academicYearId: academicYear.id }
        });
    }

    // Sections
    let sec9A = await prisma.section.findFirst({ where: { schoolGradeId: sg9.id, name: "9A" } });
    if (!sec9A) {
        sec9A = await prisma.section.create({ data: { schoolGradeId: sg9.id, name: "9A" } });
    }

    let sec9B = await prisma.section.findFirst({ where: { schoolGradeId: sg9.id, name: "9B" } });
    if (!sec9B) {
        sec9B = await prisma.section.create({ data: { schoolGradeId: sg9.id, name: "9B" } });
    }

    let sec10A = await prisma.section.findFirst({ where: { schoolGradeId: sg10.id, name: "10A" } });
    if (!sec10A) {
        sec10A = await prisma.section.create({ data: { schoolGradeId: sg10.id, name: "10A" } });
    }

    // 4. Create or update User for Teacher
    const email = "teacher@edubridge.local";
    const password = "Teacher@2026!";

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const res = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: "Abebe Kebede (Teacher)"
            }
        });
        user = await prisma.user.update({
            where: { id: res.user.id },
            data: { requiresPasswordChange: false, isActive: true }
        });
    }

    // 5. Assign TEACHER Role at School scope
    await assignRoleToUser(user.id, "TEACHER", school.name, "SCHOOL");

    // 6. Create or link Teacher profile
    let teacher = await prisma.teacher.findFirst({
        where: { userId: user.id }
    });
    if (!teacher) {
        teacher = await prisma.teacher.create({
            data: {
                userId: user.id,
                organizationId: school.id,
                firstName: "Abebe",
                lastName: "Kebede",
                employeeId: "TCH-001"
            }
        });
    }

    // 7. Create Teaching Assignments for this Teacher
    const assignmentsConfig = [
        { subjectId: math.id, schoolGradeId: sg9.id, sectionId: sec9A.id },
        { subjectId: math.id, schoolGradeId: sg9.id, sectionId: sec9B.id },
        { subjectId: physics.id, schoolGradeId: sg10.id, sectionId: sec10A.id },
    ];

    for (const conf of assignmentsConfig) {
        const exists = await prisma.teachingAssignment.findFirst({
            where: {
                teacherId: teacher.id,
                academicYearId: academicYear.id,
                subjectId: conf.subjectId,
                sectionId: conf.sectionId
            }
        });
        if (!exists) {
            await prisma.teachingAssignment.create({
                data: {
                    teacherId: teacher.id,
                    academicYearId: academicYear.id,
                    subjectId: conf.subjectId,
                    schoolGradeId: conf.schoolGradeId,
                    sectionId: conf.sectionId
                }
            });
        }
    }

    // 8. Create demo students enrolled in these sections if not present
    const demoStudents = [
        { id: "STU-9A-001", first: "Kidus", last: "Yohannes", section: sec9A },
        { id: "STU-9A-002", first: "Sara", last: "Tadesse", section: sec9A },
        { id: "STU-9A-003", first: "Bereket", last: "Haile", section: sec9A },
        { id: "STU-9B-001", first: "Almaz", last: "Alemu", section: sec9B },
        { id: "STU-9B-002", first: "Daniel", last: "Solomon", section: sec9B },
        { id: "STU-10A-001", first: "Feven", last: "Getachew", section: sec10A },
        { id: "STU-10A-002", first: "Elias", last: "Bekele", section: sec10A },
    ];

    for (const s of demoStudents) {
        let st = await prisma.student.findUnique({ where: { studentId: s.id } });
        if (!st) {
            st = await prisma.student.create({
                data: {
                    studentId: s.id,
                    firstName: s.first,
                    lastName: s.last,
                    dateOfBirth: new Date("2009-01-15")
                }
            });
        }
        const enr = await prisma.studentEnrollment.findFirst({
            where: { studentId: st.id, academicYearId: academicYear.id, organizationId: school.id }
        });
        if (!enr) {
            await prisma.studentEnrollment.create({
                data: {
                    studentId: st.id,
                    organizationId: school.id,
                    schoolGradeId: s.section.schoolGradeId,
                    sectionId: s.section.id,
                    academicYearId: academicYear.id,
                    enrollmentType: "NEW",
                    status: "ACTIVE"
                }
            });
        }
    }

    console.log("==================================================");
    console.log("👨‍🏫 DEDICATED TEACHER ACCOUNT CREATED & VERIFIED:");
    console.log("📧 Username / Email : " + email);
    console.log("🔑 Password         : " + password);
    console.log("🎯 Role             : TEACHER @ " + school.name);
    console.log("📚 Assigned Classes :");
    console.log("   - Mathematics (Grade 9A)");
    console.log("   - Mathematics (Grade 9B)");
    console.log("   - Physics (Grade 10A)");
    console.log("👥 Enrolled Students: 7 Active Demo Students ready for grading");
    console.log("==================================================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
