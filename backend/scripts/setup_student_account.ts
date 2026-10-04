import { auth } from "../src/modules/authentication/auth.js";
import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignRoleToUser } from "../src/modules/authentication/authorization.service.js";

async function main() {
    const student = await prisma.student.findFirst({
        where: { firstName: { contains: "butu", mode: "insensitive" } },
        include: {
            enrollments: {
                include: {
                    schoolGrade: true,
                    section: true
                }
            }
        }
    });

    if (!student) {
        console.error("Student not found!");
        process.exit(1);
    }

    const school = await prisma.organizationUnit.findFirst({
        where: { type: "SCHOOL" }
    });

    const email = "student.butu@edubridge.local";
    const password = "EduBridge2026!";
    const name = `${student.firstName} ${student.middleName || ""} ${student.lastName}`.replace(/\s+/g, " ").trim();

    console.log(`Setting up account for student: ${name} (${student.studentId})`);

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        const res = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name,
            },
        });
        user = await prisma.user.update({
            where: { id: res.user.id },
            data: { requiresPasswordChange: false, isActive: true },
        });
    }

    // Link student to user
    await prisma.student.update({
        where: { id: student.id },
        data: {
            user: { connect: { id: user.id } }
        }
    });

    // Assign role
    if (school) {
        await assignRoleToUser(user.id, "STUDENT", school.name, "SCHOOL");
    }

    // Update / ensure announcement acknowledgment record points to user.id
    const announcements = await prisma.announcement.findMany({
        where: {
            organizationId: school?.id
        }
    });

    for (const ann of announcements) {
        await prisma.announcementAcknowledgment.upsert({
            where: {
                announcementId_userId: {
                    announcementId: ann.id,
                    userId: user.id
                }
            },
            create: {
                announcementId: ann.id,
                userId: user.id,
                organizationId: ann.organizationId,
                recipientType: "STUDENT",
                recipientName: name,
                recipientIdentifier: student.studentId || "STU-2610-4343",
                isRead: false,
                isAcknowledged: false
            },
            update: {
                recipientName: name,
                recipientIdentifier: student.studentId || "STU-2610-4343"
            }
        });

        // Also ensure in-app notification exists for student
        await prisma.notification.upsert({
            where: {
                id: `notif_${ann.id}_${user.id}`
            },
            create: {
                id: `notif_${ann.id}_${user.id}`,
                userId: user.id,
                organizationId: ann.organizationId,
                title: `School Announcement: ${ann.title}`,
                content: `Priority: ${ann.priority}. ${ann.content.slice(0, 100)}...`,
                link: `/dashboard/communication/announcements?id=${ann.id}`,
                isRead: false
            },
            update: {}
        });
    }

    console.log("=== STUDENT ACCOUNT READY ===");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Student ID: ${student.studentId}`);
    console.log(`Linked user ID: ${user.id}`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
