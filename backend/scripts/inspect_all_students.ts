import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const students = await prisma.student.findMany({
        include: {
            enrollments: {
                include: {
                    organization: true,
                    schoolGrade: true,
                    section: true
                }
            },
            user: true
        },
        orderBy: { createdAt: "asc" }
    });

    console.log("=== ALL STUDENTS IN DATABASE ===");
    for (const s of students) {
        console.log({
            id: s.id,
            studentId: s.studentId,
            fullName: `${s.firstName} ${s.fatherName || ''} ${s.lastName}`,
            userId: s.userId,
            userEmail: s.user?.email,
            createdAt: s.createdAt,
            enrollments: s.enrollments.map(e => ({
                id: e.id,
                school: e.organization?.name,
                grade: e.schoolGrade?.name,
                section: e.section?.name,
                status: e.status
            }))
        });
    }
}

main().finally(() => prisma.$disconnect());
