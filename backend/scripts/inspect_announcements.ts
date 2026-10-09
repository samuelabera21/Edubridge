import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const announcements = await prisma.announcement.findMany({
        include: {
            author: true,
            acknowledgments: true,
            organization: true
        }
    });

    console.log("=== ANNOUNCEMENTS IN DB ===");
    for (const a of announcements) {
        console.log({
            id: a.id,
            title: a.title,
            target: a.target,
            targetId: a.targetId,
            targetDetails: a.targetDetails,
            organizationId: a.organizationId,
            organizationName: a.organization?.name,
            acknowledgmentsCount: a.acknowledgments.length,
            acknowledgments: a.acknowledgments.map(ack => ({ userId: ack.userId, role: ack.role, isAcknowledged: ack.isAcknowledged }))
        });
    }

    const teacher = await prisma.teacher.findFirst({
        include: { user: { include: { roleAssignments: { include: { scope: true, role: true } } } } }
    });

    console.log("Teacher User:", {
        id: teacher?.user?.id,
        name: teacher?.user?.name,
        email: teacher?.user?.email,
        roleAssignments: teacher?.user?.roleAssignments.map(ra => ({
            role: ra.role.name,
            scopeId: ra.scopeId,
            scopeName: ra.scope?.name,
            scopeType: ra.scope?.type
        }))
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
