import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const users = await prisma.user.findMany({
        include: {
            roleAssignments: {
                include: { role: true, scope: true }
            }
        }
    });
    console.log("=== REGISTERED USERS IN EDUBRIDGE ===");
    for (const u of users) {
        console.log(`- Name: ${u.name}`);
        console.log(`  Email: ${u.email}`);
        console.log(`  Roles: ${u.roleAssignments.map(r => `${r.role?.name} @ ${r.scope?.name || 'Global'} (${r.scope?.type})`).join(", ") || 'No role'}`);
        console.log("-----------------------------------------");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
