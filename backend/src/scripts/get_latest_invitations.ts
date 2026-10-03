import { prisma } from "../infrastructure/prisma/client.js";

async function main() {
    const verifications = await prisma.verification.findMany({
        orderBy: { createdAt: "desc" },
        take: 5
    });

    console.log("\n=======================================================");
    console.log("📋 ACTIVE INVITATION ACTIVATION LINKS IN DATABASE:");
    console.log("=======================================================");
    for (const v of verifications) {
        console.log(`Identifier : ${v.identifier}`);
        console.log(`Link       : http://localhost:3001/activate?token=${v.value}`);
        console.log(`Expires At : ${v.expiresAt}`);
        console.log("-------------------------------------------------------");
    }
    process.exit(0);
}

main().catch(console.error);
