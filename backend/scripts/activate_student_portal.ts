import { auth } from "../src/modules/authentication/auth.js";
import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignRoleToUser } from "../src/modules/authentication/authorization.service.js";

async function main() {
    const studentIdArg = process.argv[2];
    const password = process.env.DEFAULT_INITIAL_PASSWORD || "ChangeMe123!";

    const students = studentIdArg
        ? await prisma.student.findMany({
            where: { studentId: { equals: studentIdArg, mode: "insensitive" } },
            include: { enrollments: true }
        })
        : await prisma.student.findMany({
            where: { userId: null },
            include: { enrollments: true }
        });

    if (students.length === 0) {
        console.log("No unlinked students found to activate.");
        return;
    }

    for (const student of students) {
        const studentOrgId = student.enrollments?.[0]?.organizationId;
        const school = studentOrgId
            ? await prisma.organizationUnit.findUnique({ where: { id: studentOrgId } })
            : await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL" } });
        if (!school) throw new Error("School not found for student");

        const studentId = student.studentId;
        const email = `${studentId.toLowerCase()}@edubridge.local`;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log(`Creating Portal User account for student ${student.firstName}...`);
        const res = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: `${student.firstName} ${student.lastName}`
            }
        });
        user = await prisma.user.update({
            where: { id: res.user.id },
            data: { requiresPasswordChange: false, isActive: true }
        });
    }

    // Link user to student
    await prisma.student.update({
        where: { id: student.id },
        data: { userId: user.id }
    });

    // Assign STUDENT role at School scope
    await assignRoleToUser(user.id, "STUDENT", school.name, "SCHOOL");

    console.log("=========================================");
    console.log(`🎓 PORTAL ACCESS ACTIVATED FOR STUDENT:`);
    console.log(`👤 Name     : ${student.firstName} ${student.lastName}`);
    console.log(`🆔 Student ID: ${student.studentId}`);
    console.log(`📧 User Email: ${user.email}`);
    console.log(`🔑 Password : ${password}`);
        console.log("=========================================");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
