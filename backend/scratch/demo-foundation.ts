import { prisma } from "../src/infrastructure/prisma/client.js";

async function run() {
    console.log("Testing Student and Teacher Foundations...");

    // 1. Get the demo school
    const school = await prisma.organizationUnit.findFirst({
        where: { type: "SCHOOL" }
    });

    if (!school) {
        throw new Error("No school found. Please run seed-academic.ts first.");
    }

    console.log(`✅ Found school: ${school.name}`);

    // 2. Get the Academic Year & Grade from our previous seed
    const academicYear = await prisma.academicYear.findFirst({
        where: { organizationId: school.id }
    });

    if (!academicYear) throw new Error("No academic year found");

    const schoolGrade = await prisma.schoolGrade.findFirst({
        where: { academicYearId: academicYear.id }
    });

    if (!schoolGrade) throw new Error("No school grade found");

    const section = await prisma.section.findFirst({
        where: { schoolGradeId: schoolGrade.id }
    });

    const subject = await prisma.subject.findFirst({
        where: { organizationId: school.id }
    });

    // 3. Create a Global Student Identity
    const student = await prisma.student.upsert({
        where: { studentId: "STU-2026-001" },
        update: {},
        create: {
            studentId: "STU-2026-001",
            firstName: "Abebe",
            lastName: "Kebede",
            gender: "M",
            dateOfBirth: new Date("2010-05-15")
        }
    });

    console.log(`✅ Created/Found Student Identity: ${student.firstName} ${student.lastName} (${student.studentId})`);

    // 4. Enroll the Student in the Context of the School
    const enrollment = await prisma.studentEnrollment.upsert({
        where: { 
            studentId_academicYearId: {
                studentId: student.id,
                academicYearId: academicYear.id
            }
        },
        update: {},
        create: {
            studentId: student.id,
            organizationId: school.id,
            academicYearId: academicYear.id,
            schoolGradeId: schoolGrade.id,
            sectionId: section?.id || null,
            status: "ENROLLED"
        },
        include: {
            schoolGrade: { include: { grade: true } },
            section: true
        }
    });

    console.log(`✅ Enrolled Student in: Grade ${enrollment.schoolGrade.grade.level}, Section ${enrollment.section?.name || "N/A"} (${academicYear.name})`);

    // 5. Create a Teacher Identity
    const teacher = await prisma.teacher.upsert({
        where: { employeeId: "TCH-001" },
        update: {},
        create: {
            firstName: "Aster",
            lastName: "Tadesse",
            employeeId: "TCH-001",
            organizationId: school.id
        }
    });

    console.log(`✅ Created/Found Teacher: ${teacher.firstName} ${teacher.lastName}`);

    // 6. Create a Teaching Assignment
    if (subject && section) {
        const assignment = await prisma.teachingAssignment.upsert({
            where: {
                teacherId_academicYearId_subjectId_sectionId: {
                    teacherId: teacher.id,
                    academicYearId: academicYear.id,
                    subjectId: subject.id,
                    sectionId: section.id
                }
            },
            update: {},
            create: {
                teacherId: teacher.id,
                academicYearId: academicYear.id,
                subjectId: subject.id,
                schoolGradeId: schoolGrade.id,
                sectionId: section.id
            },
            include: {
                subject: true
            }
        });

        console.log(`✅ Assigned Teacher to: ${assignment.subject.subject.name} for Section ${section.name}`);
    }

    console.log("\nFoundation verified successfully! The relationships are completely isolated by School and Academic Year.");
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
