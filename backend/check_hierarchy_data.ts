import { prisma } from "./src/infrastructure/prisma/client.js";

async function checkData() {
    const orgs = await prisma.organizationUnit.findMany({ select: { id: true, name: true, type: true } });
    console.log("Organizations:", orgs);

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            roleAssignments: {
                select: {
                    role: { select: { name: true } },
                    scope: { select: { id: true, name: true, type: true } }
                }
            }
        }
    });
    console.log("Users:", JSON.stringify(users, null, 2));

    const academicYears = await prisma.academicYear.findMany({});
    console.log("Academic Years:", academicYears);

    const grades = await prisma.grade.findMany({});
    console.log("Grades:", grades);

    const schoolGrades = await prisma.schoolGrade.findMany({
        include: { grade: true, sections: true }
    });
    console.log("School Grades:", JSON.stringify(schoolGrades, null, 2));

    const teachers = await prisma.teacher.findMany({
        include: { user: true, assignments: true }
    });
    console.log("Teachers:", JSON.stringify(teachers, null, 2));

    const students = await prisma.student.findMany({
        include: { user: true, enrollments: true }
    });
    console.log("Students:", JSON.stringify(students, null, 2));
}

checkData().catch(console.error).finally(() => process.exit(0));
