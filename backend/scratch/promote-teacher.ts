import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const email = process.argv[2];
    
    if (!email) {
        console.error("Please provide an email address as the first argument.");
        console.error("Usage: npx tsx scratch/promote-teacher.ts <email>");
        process.exit(1);
    }

    console.log(`Promoting ${email} to TEACHER...`);

    // 1. Find the user by email
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error(`User with email ${email} not found.`);
        process.exit(1);
    }

    // 2. Ensure TEACHER role exists
    let teacherRole = await prisma.role.findUnique({
        where: { name: "TEACHER" }
    });

    if (!teacherRole) {
        teacherRole = await prisma.role.create({
            data: {
                name: "TEACHER",
                description: "Teacher with access to their own classes and students."
            }
        });
        console.log("Created TEACHER role.");
    }

    // 3. Find EduBridge Demo School
    const school = await prisma.organizationUnit.findFirst({
        where: { name: "EduBridge Demo School" }
    });

    if (!school) {
        console.error("EduBridge Demo School not found. Run seed scripts first.");
        process.exit(1);
    }

    // 4. Assign the Role + Scope to the User
    const existingAssignment = await prisma.roleAssignment.findFirst({
        where: {
            userId: user.id,
            roleId: teacherRole.id,
            scopeId: school.id
        }
    });

    if (existingAssignment) {
        console.log(`User ${email} is already a TEACHER at ${school.name}.`);
    } else {
        // Remove other roles for this demo so they are purely a teacher
        await prisma.roleAssignment.deleteMany({
            where: { userId: user.id }
        });

        await prisma.roleAssignment.create({
            data: {
                userId: user.id,
                roleId: teacherRole.id,
                scopeId: school.id
            }
        });
        console.log(`Successfully assigned TEACHER role at ${school.name} to ${email}!`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
