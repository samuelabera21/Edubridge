import { prisma } from "../infrastructure/prisma/client.js";

async function main() {
    console.log("=== INSPECTING DIRECTIVES & USERS ===");
    const directives = await prisma.nationalDirective.findMany({
        include: { targetOrganizationUnits: true, acknowledgments: true }
    });
    console.log("ALL DIRECTIVES IN DB:", JSON.stringify(directives, null, 2));

    const users = await prisma.user.findMany({
        where: { email: { contains: "samuel" } },
        include: { roleAssignments: { include: { scope: true, role: true } } }
    });
    console.log("USERS MATCHING SAMUEL:", JSON.stringify(users, null, 2));

    const allUnits = await prisma.organizationUnit.findMany();
    console.log("ALL UNITS:", JSON.stringify(allUnits.map(u => ({ id: u.id, name: u.name, type: u.type, parentId: u.parentId })), null, 2));

    const notifs = await prisma.notification.findMany();
    console.log("NOTIFICATIONS IN DB:", JSON.stringify(notifs, null, 2));
}

main()
    .catch(err => console.error(err))
    .finally(() => process.exit(0));
