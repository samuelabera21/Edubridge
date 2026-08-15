import { prisma } from './src/infrastructure/prisma/client.js';

async function getEmails() {
    try {
        const users = await prisma.user.findMany({
            where: {
                id: { in: ['pNZS9mKmY3ip15QAeFzn3qnss2vRjBHw', 'sCdWvQHHAIIV54rFliMTx0KtJyPWCJkl', '7LdtQUweYHcKsZ9i7LK6ZyD0sYj7VZeA'] }
            }
        });
        for (const u of users) {
            console.log(`User ID: ${u.id}, Email: ${u.email}`);
        }
    } finally {
        await prisma.$disconnect();
    }
}
getEmails().catch(console.error);
