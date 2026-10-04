import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const studentUser = await prisma.user.findFirst({
        where: { email: "student.butu@edubridge.local" },
        include: { roleAssignments: true }
    });

    if (!studentUser) {
        console.error("Student user not found!");
        process.exit(1);
    }

    const correctSchoolId = "cmurbi8ht000076mnpbd0z67h";

    // Delete any role assignments not matching correct school
    await prisma.roleAssignment.deleteMany({
        where: {
            userId: studentUser.id,
            scopeId: { not: correctSchoolId }
        }
    });

    console.log("Cleaned up extraneous role assignments.");

    // Update notification links to point to /dashboard/student/communication
    await prisma.notification.updateMany({
        where: { userId: studentUser.id },
        data: {
            link: "/dashboard/student/communication"
        }
    });

    // Clean up dfg acknowledgment duplicates if any
    const dfg = await prisma.announcement.findFirst({
        where: { title: "dfg" },
        include: { acknowledgments: true }
    });

    if (dfg) {
        console.log("DFG acknowledgments count before:", dfg.acknowledgments.length);
        // Ensure acknowledgment for studentUser.id exists and is unacknowledged
        await prisma.announcementAcknowledgment.upsert({
            where: {
                announcementId_userId: {
                    announcementId: dfg.id,
                    userId: studentUser.id
                }
            },
            create: {
                announcementId: dfg.id,
                userId: studentUser.id,
                organizationId: correctSchoolId,
                recipientType: "STUDENT",
                recipientName: studentUser.name,
                recipientIdentifier: "STU-2610-4343",
                isRead: false,
                isAcknowledged: false
            },
            update: {
                isAcknowledged: false,
                acknowledgedAt: null
            }
        });

        // Remove any non-student acknowledgments for dfg
        await prisma.announcementAcknowledgment.deleteMany({
            where: {
                announcementId: dfg.id,
                userId: { not: studentUser.id }
            }
        });

        // Ensure in-app notification exists for dfg
        const existingNotif = await prisma.notification.findFirst({
            where: {
                userId: studentUser.id,
                title: { contains: "dfg" }
            }
        });
        if (!existingNotif) {
            await prisma.notification.create({
                data: {
                    userId: studentUser.id,
                    organizationId: correctSchoolId,
                    title: `School Announcement: ${dfg.title}`,
                    content: `Priority: ${dfg.priority}. ${dfg.content.slice(0, 100)}...`,
                    link: "/dashboard/student/communication",
                    isRead: false
                }
            });
        }
    }

    console.log("=== COMPLETED CLEANUP & SYNC ===");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
