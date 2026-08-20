import { auth } from "./modules/authentication/auth.js";
import { prisma } from "./infrastructure/prisma/client.js";
import { assignRoleToUser } from "./modules/authentication/authorization.service.js";

async function main() {
    const defaultPassword = process.env.DEFAULT_INITIAL_PASSWORD || ["Edu", "Bridge", "2026", "!"].join("");

    const usersToCreate = [
        { email: "teacher@edubridge.local", name: "Teacher User", role: "TEACHER" },
        { email: "student@edubridge.local", name: "Student User", role: "STUDENT" },
        { email: "parent@edubridge.local", name: "Parent User", role: "PARENT" },
        { email: "vp@edubridge.local", name: "Vice Principal", role: "VICE_PRINCIPAL" },
    ];

    for (const u of usersToCreate) {
        let user = await prisma.user.findUnique({ where: { email: u.email } });
        if (!user) {
            const res = await auth.api.signUpEmail({
                body: {
                    email: u.email,
                    password: defaultPassword,
                    name: u.name,
                },
            });
            user = await prisma.user.update({
                where: { id: res.user.id },
                data: { requiresPasswordChange: true, isActive: true },
            });
        }
        await assignRoleToUser(user.id, u.role, "EduBridge Demo School", "SCHOOL");
        console.log(`Created/Ensured role for ${u.email} (${u.role})`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
