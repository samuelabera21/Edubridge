import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    console.log("Seeding Step 3: Teacher Academic Management...");

    // 1. Get the organization and active year
    const school = await prisma.organizationUnit.findFirst({
        where: { type: "SCHOOL" }
    });
    if (!school) throw new Error("School not found. Run base seed first.");

    const activeYear = await prisma.academicYear.findFirst({
        where: { organizationId: school.id, status: "ACTIVE" }
    });
    if (!activeYear) throw new Error("Active academic year not found.");

    // 2. Create demo teachers
    const teacher1 = await prisma.teacher.upsert({
        where: { employeeId: "EMP-001" },
        update: {},
        create: {
            organizationId: school.id,
            firstName: "Abebe",
            lastName: "Kebede",
            employeeId: "EMP-001"
        }
    });

    const teacher2 = await prisma.teacher.upsert({
        where: { employeeId: "EMP-002" },
        update: {},
        create: {
            organizationId: school.id,
            firstName: "Almaz",
            lastName: "Tadesse",
            employeeId: "EMP-002"
        }
    });

    // 3. Find some subjects and grades
    const math = await prisma.subject.findFirst({ where: { name: "Mathematics" } });
    const physics = await prisma.subject.findFirst({ where: { name: "Physics" } });
    
    if (!math || !physics) throw new Error("Subjects not found. Ensure Academic Dashboard was seeded.");

    const grade10s = await prisma.schoolGrade.findMany({
        where: { academicYearId: activeYear.id, grade: { name: "Grade 10" } },
        include: { sections: true }
    });
    
    const grade10 = grade10s.find(g => g.sections.length >= 2);
    
    if (!grade10) throw new Error("Grade 10 with sections not found.");
    
    const sectionA = grade10.sections.find(s => s.name === "10A" || s.name === "10-A");
    const sectionB = grade10.sections.find(s => s.name === "10B" || s.name === "10-B");

    if (!sectionA || !sectionB) throw new Error("Sections A and B not found.");

    // 4. Create teaching assignments
    console.log(`Assigning ${teacher1.firstName} to Math for 10A and 10B...`);
    await prisma.teachingAssignment.upsert({
        where: { teacherId_academicYearId_subjectId_sectionId: { teacherId: teacher1.id, academicYearId: activeYear.id, subjectId: math.id, sectionId: sectionA.id } },
        update: {},
        create: { teacherId: teacher1.id, academicYearId: activeYear.id, subjectId: math.id, schoolGradeId: grade10.id, sectionId: sectionA.id }
    });
    
    await prisma.teachingAssignment.upsert({
        where: { teacherId_academicYearId_subjectId_sectionId: { teacherId: teacher1.id, academicYearId: activeYear.id, subjectId: math.id, sectionId: sectionB.id } },
        update: {},
        create: { teacherId: teacher1.id, academicYearId: activeYear.id, subjectId: math.id, schoolGradeId: grade10.id, sectionId: sectionB.id }
    });

    console.log(`Assigning ${teacher2.firstName} to Physics for 10A...`);
    await prisma.teachingAssignment.upsert({
        where: { teacherId_academicYearId_subjectId_sectionId: { teacherId: teacher2.id, academicYearId: activeYear.id, subjectId: physics.id, sectionId: sectionA.id } },
        update: {},
        create: { teacherId: teacher2.id, academicYearId: activeYear.id, subjectId: physics.id, schoolGradeId: grade10.id, sectionId: sectionA.id }
    });

    console.log("Seeding complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
