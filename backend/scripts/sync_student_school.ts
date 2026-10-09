import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignRoleToUser } from "../src/modules/authentication/authorization.service.js";

async function main() {
    const studentUser = await prisma.user.findFirst({
        where: { email: "student.butu@edubridge.local" }
    });
    if (!studentUser) {
        console.error("Student user not found!");
        process.exit(1);
    }

    const student = await prisma.student.findFirst({
        where: { userId: studentUser.id }
    });

    // The actual school where the student and announcement belong
    const targetSchool = await prisma.organizationUnit.findUnique({
        where: { id: "cmurbi8ht000076mnpbd0z67h" }
    }) || await prisma.organizationUnit.findFirst({
        where: { name: { contains: "Jihur", mode: "insensitive" } }
    });

    if (!targetSchool) {
        console.error("Target school not found!");
        process.exit(1);
    }

    console.log(`Syncing student to school: ${targetSchool.name} (${targetSchool.id})`);

    // Assign role to correct school scope
    await assignRoleToUser(studentUser.id, "STUDENT", targetSchool.name, "SCHOOL");

    // Connect Student to correct school organization
    const announcements = await prisma.announcement.findMany({
        where: { organizationId: targetSchool.id }
    });

    console.log(`Found ${announcements.length} announcements in school ${targetSchool.name}`);

    for (const ann of announcements) {
        // Create / ensure AnnouncementAcknowledgment
        await prisma.announcementAcknowledgment.upsert({
            where: {
                announcementId_userId: {
                    announcementId: ann.id,
                    userId: studentUser.id
                }
            },
            create: {
                announcementId: ann.id,
                userId: studentUser.id,
                organizationId: targetSchool.id,
                recipientType: "STUDENT",
                recipientName: studentUser.name,
                recipientIdentifier: student?.studentId || "STU-2610-4343",
                isRead: false,
                isAcknowledged: false
            },
            update: {
                organizationId: targetSchool.id,
                recipientName: studentUser.name,
                recipientIdentifier: student?.studentId || "STU-2610-4343"
            }
        });

        // Create In-App Notification
        await prisma.notification.create({
            data: {
                userId: studentUser.id,
                organizationId: targetSchool.id,
                title: `School Announcement: ${ann.title}`,
                content: `Priority: ${ann.priority}. ${ann.content.slice(0, 100)}...`,
                link: `/dashboard/student/communication`,
                isRead: false
            }
        });

        console.log(`Created notification and acknowledgment for announcement: ${ann.title}`);
    }

    console.log("=== SYNC COMPLETED SUCCESSFULLY ===");
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
