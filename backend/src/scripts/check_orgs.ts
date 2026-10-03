import { prisma } from "../infrastructure/prisma/client.js";

async function main() {
    const orgs = await prisma.organizationUnit.findMany({
        select: { id: true, name: true, type: true, parentId: true }
    });
    console.log("Orgs Count:", orgs.length);
    console.log("Orgs breakdown by type:", {
        FEDERAL: orgs.filter(o => o.type === "FEDERAL").length,
        REGION: orgs.filter(o => o.type === "REGION").length,
        ZONE: orgs.filter(o => o.type === "ZONE").length,
        WOREDA: orgs.filter(o => o.type === "WOREDA").length,
        SCHOOL: orgs.filter(o => o.type === "SCHOOL").length,
    });

    const roleAssignments = await prisma.roleAssignment.findMany({
        include: {
            user: { select: { id: true, email: true, name: true } },
            scope: { select: { id: true, name: true, type: true } },
            role: { select: { id: true, name: true } }
        }
    });
    console.log("Role Assignments Count:", roleAssignments.length);
    for (const ra of roleAssignments) {
        console.log(`- User: ${ra.user.email} (${ra.user.name}) -> Role: ${ra.role.name} -> Scope: [${ra.scope?.type}] ${ra.scope?.name} (ID: ${ra.scopeId})`);
    }

    const directives = await prisma.nationalDirective.findMany({
        include: {
            targetOrganizationUnits: true,
            acknowledgments: true
        }
    });
    console.log("Directives Count:", directives.length);
    for (const d of directives) {
        console.log(`- Directive "${d.title}" (ID: ${d.id}): targetLevelAll=${d.targetLevelAll}, targetLevels=${JSON.stringify(d.targetLevels)}, targetedUnits=${d.targetOrganizationUnits.length}, ackRecordsCount=${d.acknowledgments.length}`);
    }

    const notifs = await prisma.notification.findMany({
        include: {
            user: { select: { email: true } },
            organization: { select: { name: true, type: true } }
        }
    });
    console.log("Notifications Count:", notifs.length);
    for (const n of notifs) {
        console.log(`- Notification: User=${n.user?.email}, Org=[${n.organization?.type}] ${n.organization?.name}, Title="${n.title}"`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
