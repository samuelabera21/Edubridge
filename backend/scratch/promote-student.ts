import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const email = process.argv[2];
    
    if (!email) {
        console.error("Please provide an email address as the first argument.");
        console.error("Usage: npx tsx scratch/promote-student.ts <email>");
        process.exit(1);
    }

    console.log(`Promoting ${email} to STUDENT...`);

    // 1. Find the user by email
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error(`User with email ${email} not found.`);
        process.exit(1);
    }

    // 2. Ensure STUDENT role exists
    let studentRole = await prisma.role.findUnique({
        where: { name: "STUDENT" }
    });

    if (!studentRole) {
        studentRole = await prisma.role.create({
            data: {
                name: "STUDENT",
                description: "Student with access to their own data."
            }
        });
        console.log("Created STUDENT role.");
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
            roleId: studentRole.id,
            scopeId: school.id
        }
    });

    if (existingAssignment) {
        console.log(`User ${email} is already a STUDENT at ${school.name}.`);
    } else {
        // Remove other roles for this demo so they are purely a student
        await prisma.roleAssignment.deleteMany({
            where: { userId: user.id }
        });

        await prisma.roleAssignment.create({
            data: {
                userId: user.id,
                roleId: studentRole.id,
                scopeId: school.id
            }
        });
        console.log(`Successfully assigned STUDENT role at ${school.name} to ${email}!`);
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
