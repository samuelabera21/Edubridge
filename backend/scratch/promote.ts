import { prisma } from "../src/infrastructure/prisma/client.js";
import { assignRoleToUser, assignPermissionToRole } from "../src/modules/authentication/authorization.service.js";

async function run() {
    const email = process.argv[2];

    if (!email) {
        console.error("Please provide an email address.");
        console.log("Usage: npx tsx scratch/promote.ts <email>");
        process.exit(1);
    }

    console.log(`Promoting ${email} to SCHOOL_ADMIN...`);

    // 1. Find the user
    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        console.error(`User with email ${email} not found. Please register first on the frontend.`);
        process.exit(1);
    }

    // 2. Assign the role and permissions
    try {
        console.log("Assigning role and mapping to a demo school...");
        
        // This links the user to the "SCHOOL_ADMIN" role and creates a demo "OrganizationUnit" (e.g. Test School)
        await assignRoleToUser(user.id, "SCHOOL_ADMIN", "EduBridge Demo School", "SCHOOL");
        
        // Ensure the role has the correct permissions
        await assignPermissionToRole("SCHOOL_ADMIN", "SCHOOL:VIEW", "View school profile");
        await assignPermissionToRole("SCHOOL_ADMIN", "SCHOOL:UPDATE", "Update school profile");

        console.log(`\nSuccess! ${email} is now a School Administrator.`);
        console.log("You can now go to http://localhost:3000/dashboard, and you will see the full School Profile access!");
    } catch (error) {
        console.error("Error promoting user:", error);
    }
}

run().finally(() => prisma.$disconnect());
