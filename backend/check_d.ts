import { prisma } from './src/infrastructure/prisma/client.js';

async function main() {
    const ds = await prisma.nationalDirective.findMany({
        select: {
            id: true,
            title: true,
            isAcknowledgmentRequired: true,
            status: true,
            acknowledgments: {
                select: {
                    organizationId: true,
                    isAcknowledged: true,
                    organization: { select: { name: true, type: true } }
                }
            }
        }
    });

    console.log(JSON.stringify(ds.map(d => ({
        title: d.title,
        status: d.status,
        reqAck: d.isAcknowledgmentRequired,
        totalAcks: d.acknowledgments.length,
        acked: d.acknowledgments.filter(a => a.isAcknowledged).length,
        pending: d.acknowledgments.filter(a => !a.isAcknowledged).length,
        federalAck: d.acknowledgments.find(a => a.organization?.type === 'FEDERAL')
    })), null, 2));
}

main().finally(() => prisma.$disconnect());
