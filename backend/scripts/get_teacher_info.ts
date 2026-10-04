import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const teachers = await prisma.teacher.findMany({
        include: {
            user: {
                include: {
                    accounts: true,
                    roleAssignments: {
                        include: {
                            role: true,
                            scope: true
                        }
                    }
                }
            },
            assignments: {
                include: {
                    subject: true,
                    section: {
                        include: {
                            schoolGrade: {
                                include: { grade: true }
                            }
                        }
                    }
                }
            }
        }
    });

    console.log("=== REGISTERED TEACHERS ===");
    for (const t of teachers) {
        console.log({
            name: `${t.firstName} ${t.fatherName || ""} ${t.lastName}`.trim(),
            teacherId: t.teacherId,
            email: t.user?.email || "No user attached",
            hasUser: !!t.user,
            assignments: t.assignments.map(a => `${a.subject.name} (${a.section?.schoolGrade?.grade?.name || ""} ${a.section?.name || ""})`),
            roles: t.user?.roleAssignments?.map(ra => ra.role.name)
        });
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
