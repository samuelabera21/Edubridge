import { prisma } from '../src/infrastructure/prisma/client.js';

async function promoteAdmin() {
    const email = process.argv[2];
    if (!email) {
        console.error("Please provide an email address.");
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        // Make sure there is an organization
        let org = await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL" }});
        if (!org) {
            org = await prisma.organizationUnit.create({
                data: {
                    name: "Demo School",
                    type: "SCHOOL"
                }
            });
            console.log("Created missing Demo School organization.");
        }

        // Get or create SCHOOL_ADMIN role
        const role = await prisma.role.upsert({
            where: { name: "SCHOOL_ADMIN" },
            update: {},
            create: { name: "SCHOOL_ADMIN", description: "School Administrator" }
        });

        // Assign role
        await prisma.roleAssignment.upsert({
            where: {
                userId_roleId_scopeId: {
                    userId: user.id,
                    roleId: role.id,
                    scopeId: org.id
                }
            },
            update: {},
            create: {
                userId: user.id,
                roleId: role.id,
                scopeId: org.id
            }
        });

        console.log(`Successfully promoted ${email} to SCHOOL_ADMIN for organization ${org.name}.`);
    } catch (error) {
        console.error("Error promoting user:", error);
    } finally {
        await prisma.$disconnect();
    }
}

promoteAdmin();
