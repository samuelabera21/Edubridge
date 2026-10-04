import { prisma } from "../src/infrastructure/prisma/client.js";
import { CommunicationService } from "../src/modules/communication/communication.service.js";

async function main() {
    const teacher = await prisma.teacher.findFirst({
        include: { user: true }
    });

    const orgId = "cmurbi8ht000076mnpbd0z67h"; // Jihur General Secondary school
    const announcements = await CommunicationService.getAnnouncements(orgId, {
        currentUserId: teacher?.user?.id
    });

    console.log(`Found ${announcements.length} announcements for teacher in Jihur General Secondary school:`);
    for (const a of announcements) {
        console.log({
            id: a.id,
            title: a.title,
            target: a.target,
            targetLabels: (a.targetDetails as any)?.targetLabels,
            viewerAcknowledgment: (a as any).viewerAcknowledgment,
            stats: (a as any).stats
        });
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
