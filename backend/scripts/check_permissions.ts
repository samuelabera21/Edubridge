import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const roles = await prisma.role.findMany({
        include: {
            permissions: {
                include: { permission: true }
            }
        }
    });

    console.log("=== ROLES AND PERMISSIONS ===");
    for (const r of roles) {
        console.log(`Role: ${r.name}`);
        console.log(`Permissions (${r.permissions.length}):`, r.permissions.map(p => p.permission.name));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
