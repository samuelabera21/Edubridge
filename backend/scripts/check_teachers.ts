import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const teachers = await prisma.teacher.findMany({
        include: {

            
            user: { include: { accounts: true } },
            organization: true,
            assignments: {
                include: {
                    subject: true,
                    schoolGrade: { include: { grade: true } },
                    section: true
                }
            }
        }
    });

    console.log("=== TEACHERS IN EDUBRIDGE ===");
    for (const t of teachers) {
        console.log(`- Teacher: ${t.firstName} ${t.lastName} (ID: ${t.id})`);
        console.log(`  Email: ${t.user?.email || 'NO USER ATTACHED'}`);
        console.log(`  School: ${t.organization?.name}`);
        console.log(`  Assignments: ${t.assignments.map(a => `${a.subject?.name} (${a.schoolGrade?.grade?.name} ${a.section?.name})`).join(", ") || 'None'}`);
        console.log("-----------------------------------------");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
