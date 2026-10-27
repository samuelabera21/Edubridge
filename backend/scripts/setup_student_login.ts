import { auth } from "../src/modules/authentication/auth.js";
import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const student = await prisma.student.findFirst({
        where: {
            enrollments: { some: {} }
        },
        include: {
            enrollments: {
                include: {
                    schoolGrade: { include: { grade: true } },
                    section: true,
                    organization: true
                }
            }
        }
    });

    if (!student) {
        console.error("No student found with active enrollment!");
        process.exit(1);
    }

    const email = "student@edubridge.local";
    const studentSpecificEmail = `${student.studentId.toLowerCase()}@edubridge.local`;
    const password = "EduBridge2026!";
    const fullName = `${student.firstName} ${student.lastName}`.trim();

    console.log(`Setting up login for student: ${fullName} (${student.studentId})...`);

    // We will set up both student@edubridge.local (easy to remember) AND the studentId email
    for (const targetEmail of [email, studentSpecificEmail]) {
        console.log(`\n--- Configuring account for ${targetEmail} ---`);
        let existingUser = await prisma.user.findUnique({ where: { email: targetEmail } });

        let canSignIn = false;
        if (existingUser) {
            try {
                await auth.api.signInEmail({
                    body: { email: targetEmail, password }
                });
                console.log(`✓ Existing user can already sign in with password: "${password}"`);
                canSignIn = true;
            } catch {
                console.log(`! Password didn't match, resetting credentials for ${targetEmail}...`);
                await prisma.account.deleteMany({ where: { userId: existingUser.id } });
                await prisma.session.deleteMany({ where: { userId: existingUser.id } });
                await prisma.roleAssignment.deleteMany({ where: { userId: existingUser.id } });
                await prisma.student.updateMany({ where: { userId: existingUser.id }, data: { userId: null } });
                await prisma.user.delete({ where: { id: existingUser.id } });
                existingUser = null;
            }
        }

        if (!canSignIn) {
            const signUpRes = await auth.api.signUpEmail({
                body: {
                    email: targetEmail,
                    password,
                    name: fullName
                }
            });
            existingUser = signUpRes.user as any;
            console.log(`✓ Created user account: ${targetEmail}`);
        }

        if (existingUser) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { requiresPasswordChange: false, isActive: true }
            });

            // Link student record
            await prisma.student.update({
                where: { id: student.id },
                data: { userId: existingUser.id }
            });

            // Ensure STUDENT role
            const studentRole = await prisma.role.findUnique({ where: { name: "STUDENT" } });
            const school = student.enrollments[0]?.organization || await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL" } });

            if (studentRole && school) {
                const existingRoleAssignment = await prisma.roleAssignment.findFirst({
                    where: { userId: existingUser.id, roleId: studentRole.id }
                });
                if (!existingRoleAssignment) {
                    await prisma.roleAssignment.create({
                        data: {
                            userId: existingUser.id,
                            roleId: studentRole.id,
                            scopeId: school.id
                        }
                    });
                    console.log(`✓ Assigned STUDENT role scoped to ${school.name}`);
                }
            }

            // Final test sign in
            const testRes = await auth.api.signInEmail({
                body: { email: targetEmail, password }
            });
            console.log(`🎉 TEST SIGN-IN VERIFIED for ${targetEmail}! User ID: ${testRes?.user?.id}`);
        }
    }

    console.log("\n==========================================");
    console.log("🎓 STUDENT CREDENTIALS READY TO USE:");
    console.log(`  Email    : ${email}  (or ${studentSpecificEmail})`);
    console.log(`  Password : ${password}`);
    console.log(`  Student  : ${fullName} (${student.studentId})`);
    console.log("==========================================\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
