import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignRoleToUser } from "../src/modules/authentication/authorization.service.js";

async function main() {
    const announcements = await prisma.announcement.findMany({ select: { organizationId: true } });
    const activeOrgIds = Array.from(new Set(announcements.map(a => a.organizationId)));
    console.log("Active announcement org IDs:", activeOrgIds);

    const user = await prisma.user.findUnique({
        where: { email: "tch.2026.0013@edubridge.local" },
        include: { roleAssignments: { include: { role: true, scope: true } } }
    });

    if (user && activeOrgIds.length > 0) {
        for (const orgId of activeOrgIds) {
            const org = await prisma.organizationUnit.findUnique({ where: { id: orgId } });
            if (org) {
                await assignRoleToUser(user.id, "TEACHER", org.name, "SCHOOL");
                console.log(`Assigned TEACHER role to scope: ${org.name} (${org.id})`);
            }
        }
    }

    // List teacher's scopes
    const updatedUser = await prisma.user.findUnique({
        where: { email: "tch.2026.0013@edubridge.local" },
        include: { roleAssignments: { include: { role: true, scope: true } } }
    });

    console.log("Teacher Role Assignments:", updatedUser?.roleAssignments.map(ra => ({
        role: ra.role.name,
        scope: ra.scope?.name
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
