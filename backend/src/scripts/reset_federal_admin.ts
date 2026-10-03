import { prisma } from "../infrastructure/prisma/client.js";
import { auth } from "../modules/authentication/auth.js";
import { hashPassword } from "better-auth/crypto";

const FEDERAL_ADMIN_EMAIL = process.env.FEDERAL_ADMIN_EMAIL || "federal.admin@edubridge.gov.et";
const FEDERAL_ADMIN_PASSWORD = process.env.FEDERAL_ADMIN_PASSWORD || process.env.DEFAULT_INITIAL_PASSWORD || "TestAdminPass2026!";
const FEDERAL_ADMIN_NAME = process.env.FEDERAL_ADMIN_NAME || "Federal Administrator";

async function main() {
    console.log("=== Federal Admin Setup ===");

    // Get or create the FEDERAL org unit
    let federalUnit = await prisma.organizationUnit.findFirst({
        where: { type: "FEDERAL" }
    });

    if (!federalUnit) {
        federalUnit = await prisma.organizationUnit.create({
            data: { name: "Federal Ministry of Education", type: "FEDERAL", parentId: null }
        });
        console.log("Created FEDERAL org unit:", federalUnit.name);
    } else {
        console.log("Found FEDERAL org unit:", federalUnit.name);
    }

    // Get or create the ADMIN role
    let role = await prisma.role.findFirst({ where: { name: "ADMIN" } });
    if (!role) {
        role = await prisma.role.create({ data: { name: "ADMIN", description: "System Administrator" } });
        console.log("Created ADMIN role");
    }

    // Hash the password
    const hashed = await hashPassword(FEDERAL_ADMIN_PASSWORD);

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email: FEDERAL_ADMIN_EMAIL } });

    if (!user) {
        const userId = "fed_admin_" + Date.now().toString(36);
        user = await prisma.user.create({
            data: {
                id: userId,
                name: FEDERAL_ADMIN_NAME,
                email: FEDERAL_ADMIN_EMAIL,
                emailVerified: true,
                isActive: true,
                requiresPasswordChange: false
            }
        });
        console.log("Created user:", user.email);
    } else {
        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true, isActive: true, requiresPasswordChange: false, name: FEDERAL_ADMIN_NAME }
        });
        console.log("Updated existing user:", user.email);
    }

    // Upsert account (credential)
    const existing = await prisma.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
    if (existing) {
        await prisma.account.update({ where: { id: existing.id }, data: { password: hashed } });
        console.log("Reset password on existing account");
    } else {
        await prisma.account.create({
            data: {
                id: "acc_fed_" + Date.now().toString(36),
                userId: user.id,
                accountId: user.id,
                providerId: "credential",
                password: hashed,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        console.log("Created credential account");
    }

    // Assign ADMIN role at FEDERAL scope
    const existing_ra = await prisma.roleAssignment.findFirst({
        where: { userId: user.id, roleId: role.id, scopeId: federalUnit.id }
    });
    if (!existing_ra) {
        await prisma.roleAssignment.create({
            data: { userId: user.id, roleId: role.id, scopeId: federalUnit.id }
        });
        console.log("Assigned ADMIN role at FEDERAL scope");
    } else {
        console.log("Role already assigned");
    }

    console.log("\n=== DONE ===");
    console.log("Login URL  : http://localhost:3001/login");
    console.log("Email      :", FEDERAL_ADMIN_EMAIL);
    console.log("Password   :", FEDERAL_ADMIN_PASSWORD);
    console.log("\nChange this password after first login.");
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
