import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const studentUser = await prisma.user.findFirst({
        where: { email: "student.butu@edubridge.local" },
        include: {
            student: true,
            roleAssignments: { include: { role: true, scope: true } },
            notifications: true,
            announcementAcknowledgments: true
        }
    });

    console.log("=== STUDENT USER DETAILS ===");
    console.log({
        id: studentUser?.id,
        name: studentUser?.name,
        email: studentUser?.email,
        roles: studentUser?.roleAssignments?.map(r => ({ role: r.role.name, scope: r.scope.name, scopeId: r.scopeId })),
        notifications: studentUser?.notifications,
        announcementAcknowledgments: studentUser?.announcementAcknowledgments
    });

    const announcements = await prisma.announcement.findMany({
        include: {
            author: true,
            acknowledgments: true
        }
    });
    console.log("=== ANNOUNCEMENTS IN DB ===");
    console.log(JSON.stringify(announcements, null, 2));

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
