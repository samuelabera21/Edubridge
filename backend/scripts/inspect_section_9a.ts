import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    console.log("=== CHECKING SECTIONS & TEACHERS ===");
    const orgs = await prisma.organizationUnit.findMany({ where: { type: "SCHOOL" } });
    for (const org of orgs) {
        console.log(`\nSchool: ${org.name} (ID: ${org.id})`);
        const academicYears = await prisma.academicYear.findMany({ where: { organizationId: org.id } });
        console.log(`  Academic Years: ${academicYears.map(y => `${y.name} (${y.id}, status: ${y.status})`).join(", ")}`);
        
        const grades = await prisma.grade.findMany({ where: { organizationId: org.id } });
        console.log(`  Grades: ${grades.map(g => `Level ${g.level}: ${g.name} (${g.id})`).join(", ")}`);

        const schoolGrades = await prisma.schoolGrade.findMany({
            where: { academicYear: { organizationId: org.id } },
            include: { grade: true, sections: { include: { studentEnrollments: true } } }
        });
        for (const sg of schoolGrades) {
            console.log(`  SchoolGrade Level ${sg.grade.level}: Sections -> ${sg.sections.map(s => `${s.name} (ID: ${s.id}, enrolled: ${s.studentEnrollments.length})`).join(", ")}`);
        }

        const teachers = await prisma.teacher.findMany({
            where: { organizationId: org.id },
            include: {
                user: true,
                assignments: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                }
            }
        });
        for (const t of teachers) {
            console.log(`  Teacher: ${t.firstName} ${t.lastName} (email: ${t.user?.email})`);
            console.log(`    Assignments: ${t.assignments.map(a => `${a.subject?.name} - Grade ${a.schoolGrade?.grade?.level} ${a.section?.name}`).join(", ") || 'NONE'}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
