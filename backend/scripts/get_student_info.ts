import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const students = await prisma.student.findMany({
        include: {
            user: {
                include: {
                    accounts: true,
                    roleAssignments: { include: { role: true, scope: true } }
                }
            },
            enrollments: {
                include: {
                    schoolGrade: true,
                    section: true
                }
            }
        }
    });

    console.log("=== STUDENTS IN DB ===");
    for (const s of students) {
        console.log({
            id: s.id,
            studentIdNumber: s.studentId,
            name: `${s.firstName} ${s.middleName || ""} ${s.lastName}`,
            email: s.user?.email || s.email,
            userId: s.userId,
            requiresPasswordChange: s.user?.requiresPasswordChange,
            accountProvider: s.user?.accounts?.map(a => a.providerId),
            roles: s.user?.roleAssignments?.map(r => r.role.name),
            enrollments: s.enrollments.map(e => ({
                grade: e.schoolGrade?.name,
                section: e.section?.name,
                status: e.status
            }))
        });
    }
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
