import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const students = await prisma.student.findMany({
        include: {
            enrollments: {
                include: {
                    schoolGrade: {
                        include: {
                            grade: true
                        }
                    },
                    section: true,
                    organization: true
                }
            },
            user: true
        }
    });

    console.log(`\n=== TOTAL STUDENTS FOUND: ${students.length} ===\n`);
    for (const s of students) {
        const enrollInfo = s.enrollments.map(e => `${e.organization.name} | ${e.schoolGrade?.grade?.name || 'No Grade'} - ${e.section?.name || 'No Section'}`).join("; ");
        console.log(`ID: ${s.id} | StudentID: ${s.studentId} | Name: ${s.firstName} ${s.lastName} | UserEmail: ${s.user?.email || 'N/A'} | Enrolled: [${enrollInfo}]`);
    }
}

main().finally(() => prisma.$disconnect());
