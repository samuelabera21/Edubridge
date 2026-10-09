import { auth } from "../src/modules/authentication/auth.js";
import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignRoleToUser } from "../src/modules/authentication/authorization.service.js";

async function main() {
    const teacher = await prisma.teacher.findFirst({
        include: {
            user: {
                include: {
                    accounts: true,
                    roleAssignments: { include: { role: true, scope: true } }
                }
            },
            assignments: {
                include: {
                    subject: true,
                    section: { include: { schoolGrade: { include: { grade: true } } } }
                }
            }
        }
    });

    if (!teacher) {
        console.error("No teacher record found!");
        process.exit(1);
    }

    const school = await prisma.organizationUnit.findFirst({
        where: { type: "SCHOOL" }
    });

    const email = "tch.2026.0013@edubridge.local";
    const password = "EduBridge2026!";
    const fullName = `${teacher.firstName} ${teacher.fatherName || ""} ${teacher.lastName}`.replace(/\s+/g, " ").trim();

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const res = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: fullName
            }
        });
        user = res.user as any;
    }

    if (user) {
        await prisma.user.update({
            where: { id: user.id },
            data: { requiresPasswordChange: false, isActive: true }
        });

        // Ensure teacher is linked
        await prisma.teacher.update({
            where: { id: teacher.id },
            data: {
                userId: user.id
            }
        });

        // Ensure TEACHER role is assigned to the school scope
        if (school) {
            await assignRoleToUser(user.id, "TEACHER", school.name, "SCHOOL");
        }

        console.log("Teacher account verified successfully:", {
            email,
            password,
            name: fullName,
            teacherId: teacher.teacherId,
            school: school?.name
        });
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
