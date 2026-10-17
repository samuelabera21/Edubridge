import { auth } from "../src/modules/authentication/auth.js";
import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignRoleToUser } from "../src/modules/authentication/authorization.service.js";

async function main() {
    const email = "school.admin@edubridge.local";
    const password = "AdminPass123!";

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log("Creating dedicated School Admin account...");
        const res = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: "School Administrator"
            }
        });
        user = await prisma.user.update({
            where: { id: res.user.id },
            data: { requiresPasswordChange: false, isActive: true }
        });
    }

    await assignRoleToUser(user.id, "SCHOOL_ADMIN", "EduBridge Demo School", "SCHOOL");
    console.log("=========================================");
    console.log("🏫 DEDICATED SCHOOL ADMIN CREATED:");
    console.log("📧 Email    : " + email);
    console.log("🔑 Password : " + password);
    console.log("🎯 Role     : SCHOOL_ADMIN @ EduBridge Demo School (SCHOOL)");
    console.log("=========================================");
}

main().catch(console.error).finally(() => prisma.$disconnect());
