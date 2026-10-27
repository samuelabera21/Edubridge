import { auth } from "../src/modules/authentication/auth.js";
import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const email = "tch.2026.0013@edubridge.local";
    const password = "EduBridge2026!";

    const user = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true }
    });

    console.log("User in DB:", user);

    try {
        console.log("Testing auth.api.signInEmail...");
        const res = await auth.api.signInEmail({
            body: { email, password }
        });
        console.log("Sign-in SUCCESS:", res);
    } catch (err: any) {
        console.error("Sign-in FAILED:", err?.message || err);

        // Let's delete existing account record or reset password properly
        console.log("Resetting password for user...");
        // In BetterAuth, we can delete the account and re-sign up or use ctx
        await prisma.account.deleteMany({
            where: { userId: user?.id }
        });
        await prisma.session.deleteMany({
            where: { userId: user?.id }
        });
        await prisma.user.delete({
            where: { id: user?.id }
        });

        console.log("Deleted old user, re-creating user via signUpEmail...");
        const signUpRes = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: "Samuel Abera Mekonn"
            }
        });
        console.log("Re-created user:", signUpRes?.user);

        // Update user properties
        if (signUpRes?.user?.id) {
            await prisma.user.update({
                where: { id: signUpRes.user.id },
                data: { requiresPasswordChange: false, isActive: true }
            });

            // Re-link teacher
            const teacher = await prisma.teacher.findFirst();
            if (teacher) {
                await prisma.teacher.update({
                    where: { id: teacher.id },
                    data: { userId: signUpRes.user.id }
                });
            }

            // Assign TEACHER role to all schools
            const school = await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL" } });
            const teacherRole = await prisma.role.findUnique({ where: { name: "TEACHER" } });
            if (school && teacherRole) {
                await prisma.roleAssignment.create({
                    data: {
                        userId: signUpRes.user.id,
                        roleId: teacherRole.id,
                        scopeId: school.id
                    }
                });
            }

            // Test sign-in again
            const verifyRes = await auth.api.signInEmail({
                body: { email, password }
            });
            console.log("Second Sign-in attempt SUCCESS:", verifyRes?.user?.email);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
