import { prisma } from "../src/infrastructure/prisma/client.js";

async function main() {
    const email = process.argv[2];
    
    if (!email) {
        console.error("Please provide an email address as the first argument.");
        console.error("Usage: npx tsx scratch/promote-support-staff.ts <email>");
        process.exit(1);
    }

    console.log(`Promoting ${email} to SUPPORT_STAFF...`);

    // 1. Find the user by email
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error(`User with email ${email} not found.`);
        process.exit(1);
    }

    // 2. Ensure SUPPORT_STAFF role exists
    let supportStaffRole = await prisma.role.findUnique({
        where: { name: "SUPPORT_STAFF" }
    });

    if (!supportStaffRole) {
        supportStaffRole = await prisma.role.create({
            data: {
                name: "SUPPORT_STAFF",
                description: "School Support Staff (e.g. Registrar, Counselor)."
            }
        });
        console.log("Created SUPPORT_STAFF role.");
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
            roleId: supportStaffRole.id,
            scopeId: school.id
        }
    });

    if (existingAssignment) {
        console.log(`User ${email} is already a SUPPORT_STAFF at ${school.name}.`);
    } else {
        // Remove other roles for this demo so they are purely a support staff
        await prisma.roleAssignment.deleteMany({
            where: { userId: user.id }
        });

        await prisma.roleAssignment.create({
            data: {
                userId: user.id,
                roleId: supportStaffRole.id,
                scopeId: school.id
            }
        });
        console.log(`Successfully assigned SUPPORT_STAFF role at ${school.name} to ${email}!`);
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
