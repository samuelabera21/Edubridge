import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const user = await prisma.user.findUnique({
        where: {
            email: "admin@edubridge.local",
        },
    });

    if (!user) {
        throw new Error("Test user not found");
    }

    const role = await prisma.role.upsert({
        where: {
            name: "SCHOOL_ADMIN",
        },
        update: {},
        create: {
            name: "SCHOOL_ADMIN",
            description: "School administrator",
        },
    });

    const school = await prisma.organizationUnit.create({
        data: {
            name: "EduBridge Demo School",
            type: "SCHOOL",
        },
    });

    await prisma.roleAssignment.upsert({
        where: {
            userId_roleId_scopeId: {
                userId: user.id,
                roleId: role.id,
                scopeId: school.id,
            },
        },
        update: {},
        create: {
            userId: user.id,
            roleId: role.id,
            scopeId: school.id,
        },
    });

    console.log("School Administrator authorization created.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());