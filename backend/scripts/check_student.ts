import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const studentId = "STU-2610-8276";
    console.log(`Checking student with ID: ${studentId}...`);

    const student = await prisma.student.findFirst({
        where: { studentId: { equals: studentId, mode: "insensitive" } },
        include: {
            user: { include: { accounts: true, roleAssignments: { include: { role: true } } } },
            enrollments: { include: { schoolGrade: { include: { grade: true } }, section: true } }
        }
    });

    if (!student) {
        console.log(`❌ Student with ID "${studentId}" NOT FOUND in Student table!`);
        const allStudents = await prisma.student.findMany({ take: 10 });
        console.log("Recent students in database:", allStudents.map(s => ({ id: s.id, studentId: s.studentId, name: `${s.firstName} ${s.lastName}` })));
        return;
    }

    console.log("✅ Student Record Found:");
    console.log({
        id: student.id,
        studentId: student.studentId,
        name: `${student.firstName} ${student.lastName}`,
        userId: student.userId,
        enrollments: student.enrollments.map(e => `${e.schoolGrade?.grade?.name} ${e.section?.name}`)
    });

    if (student.userId) {
        const user = await prisma.user.findUnique({
            where: { id: student.userId },
            include: { accounts: true, roleAssignments: { include: { role: true } } }
        });
        console.log("Linked User:", {
            id: user?.id,
            email: user?.email,
            roles: user?.roleAssignments.map(r => r.role.name),
            hasAccount: (user?.accounts?.length || 0) > 0
        });
    } else {
        console.log("⚠️ Student does not have a linked userId (student.userId is null)!");
        // Check if a user with similar email or studentId exists
        const userSearch = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { contains: studentId, mode: "insensitive" } },
                    { name: { contains: student.firstName, mode: "insensitive" } }
                ]
            }
        });
        console.log("Potential matching Users in database:", userSearch);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
