import { auth } from "./modules/authentication/auth.js";
import { prisma } from "./infrastructure/prisma/client.js";
import { assignRoleToUser } from "./modules/authentication/authorization.service.js";

async function main() {
    const email = "admin@edubridge.local";
    const password = "AdminPassword123!";

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log("Creating default Admin user...");
        const res = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: "System Admin"
            }
        });
        user = await prisma.user.update({
            where: { id: res.user.id },
            data: { requiresPasswordChange: true, isActive: true }
        });
    } else {
        console.log("Admin user already exists.");
    }

    await assignRoleToUser(user.id, "ADMIN", "EduBridge Platform", "FEDERAL");
    await assignRoleToUser(user.id, "SCHOOL_ADMIN", "EduBridge Demo School", "SCHOOL");

    console.log("=== ADMIN CREDENTIALS ===");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("Roles: ADMIN, SCHOOL_ADMIN (Full System Control)");
    console.log("=========================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
