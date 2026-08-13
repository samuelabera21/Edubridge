import { prisma } from "../src/infrastructure/prisma/client.js";

async function run() {
    console.log("Seeding Academic Foundation for EduBridge Demo School...");

    // Find the demo school
    const school = await prisma.organizationUnit.findFirst({
        where: { name: "EduBridge Demo School" }
    });

    if (!school) {
        console.error("EduBridge Demo School not found. Please run the promote script first to create it.");
        process.exit(1);
    }

    try {
        // 1. Create Academic Year
        const academicYear = await prisma.academicYear.upsert({
            where: {
                organizationId_name: {
                    organizationId: school.id,
                    name: "2018 E.C."
                }
            },
            update: {},
            create: {
                organizationId: school.id,
                name: "2018 E.C.",
                startDate: new Date("2025-09-01T00:00:00Z"),
                endDate: new Date("2026-06-30T00:00:00Z"),
                status: "ACTIVE"
            }
        });
        console.log(`- Created Academic Year: ${academicYear.name}`);

        // 2. Create Grades
        const grade9 = await prisma.grade.upsert({
            where: { organizationId_level: { organizationId: school.id, level: 9 } },
            update: {},
            create: { organizationId: school.id, name: "Grade 9", level: 9 }
        });
        const grade10 = await prisma.grade.upsert({
            where: { organizationId_level: { organizationId: school.id, level: 10 } },
            update: {},
            create: { organizationId: school.id, name: "Grade 10", level: 10 }
        });
        console.log(`- Created Grades: ${grade9.name}, ${grade10.name}`);

        // 3. Map Grades to Academic Year (SchoolGrades)
        const schoolGrade9 = await prisma.schoolGrade.upsert({
            where: { academicYearId_gradeId: { academicYearId: academicYear.id, gradeId: grade9.id } },
            update: {},
            create: { academicYearId: academicYear.id, gradeId: grade9.id }
        });
        const schoolGrade10 = await prisma.schoolGrade.upsert({
            where: { academicYearId_gradeId: { academicYearId: academicYear.id, gradeId: grade10.id } },
            update: {},
            create: { academicYearId: academicYear.id, gradeId: grade10.id }
        });

        // 4. Create Sections
        await prisma.section.upsert({
            where: { schoolGradeId_name: { schoolGradeId: schoolGrade9.id, name: "9A" } },
            update: {},
            create: { schoolGradeId: schoolGrade9.id, name: "9A", capacity: 40 }
        });
        await prisma.section.upsert({
            where: { schoolGradeId_name: { schoolGradeId: schoolGrade10.id, name: "10A" } },
            update: {},
            create: { schoolGradeId: schoolGrade10.id, name: "10A", capacity: 40 }
        });
        console.log(`- Created Sections 9A and 10A`);

        // 5. Create Subjects
        const math = await prisma.subject.upsert({
            where: { organizationId_name: { organizationId: school.id, name: "Mathematics" } },
            update: {},
            create: { organizationId: school.id, name: "Mathematics", code: "MATH" }
        });
        const english = await prisma.subject.upsert({
            where: { organizationId_name: { organizationId: school.id, name: "English" } },
            update: {},
            create: { organizationId: school.id, name: "English", code: "ENG" }
        });
        console.log(`- Created Subjects: ${math.name}, ${english.name}`);

        // 6. Map Subjects to Academic Year
        await prisma.schoolSubject.upsert({
            where: { academicYearId_subjectId: { academicYearId: academicYear.id, subjectId: math.id } },
            update: {},
            create: { academicYearId: academicYear.id, subjectId: math.id }
        });
        await prisma.schoolSubject.upsert({
            where: { academicYearId_subjectId: { academicYearId: academicYear.id, subjectId: english.id } },
            update: {},
            create: { academicYearId: academicYear.id, subjectId: english.id }
        });

        console.log("\nSuccess! Academic foundation seeded deterministically.");
    } catch (error) {
        console.error("Error seeding academic foundation:", error);
    }
}

run().finally(() => prisma.$disconnect());
