import { prisma } from "../infrastructure/prisma/client.js";
import { hashPassword } from "better-auth/crypto";

const FEDERAL_ADMIN_EMAIL = "federal.admin@edubridge.gov.et";
const FEDERAL_ADMIN_PASSWORD = "Federal@2026!";
const FEDERAL_ADMIN_NAME = "Federal Administrator";

async function main() {
    console.log("=========================================");
    console.log("🧹 Wiping Registered Data & Starting Fresh");
    console.log("=========================================");

    // 1. Delete all invitations / verifications
    await prisma.verification.deleteMany({});
    console.log("✅ Cleared all invitation tokens.");

    // 2. Delete all audit logs
    await prisma.auditLog.deleteMany({});
    console.log("✅ Cleared audit logs.");

    // 3. Delete non-federal role assignments
    await prisma.roleAssignment.deleteMany({});
    console.log("✅ Cleared role assignments.");

    // 4. Delete subordinate organization units (Schools, Woredas, Zones, Regions)
    await prisma.organizationUnit.deleteMany({
        where: {
            type: { not: "FEDERAL" }
        }
    });
    console.log("✅ Cleared all Regions, Zones, Woredas, and Schools.");

    // 5. Ensure root FEDERAL organization unit exists
    let federalUnit = await prisma.organizationUnit.findFirst({
        where: { type: "FEDERAL" }
    });
    if (!federalUnit) {
        federalUnit = await prisma.organizationUnit.create({
            data: {
                name: "Federal Ministry of Education",
                type: "FEDERAL",
                parentId: null
            }
        });
        console.log("✅ Created root Federal Ministry of Education unit.");
    } else {
        console.log("✅ Retained root Federal unit:", federalUnit.name);
    }

    // 6. Delete all users except Federal Admin
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("✅ Cleared all previous user accounts and sessions.");

    // 7. Ensure ADMIN role exists
    let adminRole = await prisma.role.findFirst({ where: { name: "ADMIN" } });
    if (!adminRole) {
        adminRole = await prisma.role.create({
            data: { name: "ADMIN", description: "System Administrator" }
        });
    }

    // 8. Re-create the Federal Admin account
    const hashedPassword = await hashPassword(FEDERAL_ADMIN_PASSWORD);
    const userId = "fed_admin_" + Date.now().toString(36);

    const user = await prisma.user.create({
        data: {
            id: userId,
            name: FEDERAL_ADMIN_NAME,
            email: FEDERAL_ADMIN_EMAIL,
            emailVerified: true,
            isActive: true,
            requiresPasswordChange: false
        }
    });

    await prisma.account.create({
        data: {
            id: "acc_fed_" + Date.now().toString(36),
            userId: user.id,
            accountId: user.id,
            providerId: "credential",
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });

    await prisma.roleAssignment.create({
        data: {
            userId: user.id,
            roleId: adminRole.id,
            scopeId: federalUnit.id
        }
    });

    console.log("✅ Re-created clean Federal Admin account.");
    console.log("\n=========================================");
    console.log("🎉 DATABASE CLEANED & READY FOR TESTING!");
    console.log("=========================================");
    console.log("Login URL : http://localhost:3001/login");
    console.log("Email     : " + FEDERAL_ADMIN_EMAIL);
    console.log("Password  : " + FEDERAL_ADMIN_PASSWORD);
    console.log("=========================================\n");

    process.exit(0);
}

main().catch(err => {
    console.error("Error cleaning database:", err);
    process.exit(1);
});
