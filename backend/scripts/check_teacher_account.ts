import { prisma } from "../src/infrastructure/prisma/client.js";
import { auth } from "../src/modules/authentication/auth.js";

async function main() {
    const email = "tch.2026.0013@edubridge.local";
    const user = await prisma.user.findUnique({
        where: { email },
        include: { accounts: true, roleAssignments: { include: { role: true, scope: true } } }
    });

    if (!user) {
        console.log("Teacher user not found!");
        return;
    }

    console.log("Teacher user found:", {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roleAssignments.map(ra => ra.role.name),
        school: user.roleAssignments[0]?.scope?.name
    });

    // Make sure user has an active password account
    const account = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" }
    });

    console.log("Credential account exists:", !!account);
}

main().catch(console.error).finally(() => prisma.$disconnect());
