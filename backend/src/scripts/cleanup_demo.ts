import { prisma } from "../infrastructure/prisma/client.js";

async function main() {
    console.log("Cleaning demo regions, zones, woredas, schools and verifications...");
    
    // 1. Delete non-federal role assignments
    const delAssignments = await prisma.roleAssignment.deleteMany({
        where: { scope: { type: { not: "FEDERAL" } } }
    });
    console.log(`Deleted ${delAssignments.count} role assignments.`);

    // 2. Delete verifications
    const delVerifications = await prisma.verification.deleteMany({});
    console.log(`Deleted ${delVerifications.count} verifications.`);

    // 3. Delete School Profiles
    const delProfiles = await prisma.schoolProfile.deleteMany({});
    console.log(`Deleted ${delProfiles.count} school profiles.`);

    // 4. Delete OrganizationUnits in reverse hierarchy order
    const delSchools = await prisma.organizationUnit.deleteMany({ where: { type: "SCHOOL" } });
    console.log(`Deleted ${delSchools.count} schools.`);

    const delWoredas = await prisma.organizationUnit.deleteMany({ where: { type: "WOREDA" } });
    console.log(`Deleted ${delWoredas.count} woredas.`);

    const delZones = await prisma.organizationUnit.deleteMany({ where: { type: "ZONE" } });
    console.log(`Deleted ${delZones.count} zones.`);

    const delRegions = await prisma.organizationUnit.deleteMany({ where: { type: "REGION" } });
    console.log(`Deleted ${delRegions.count} regions.`);

    const remaining = await prisma.organizationUnit.findMany({
        select: { id: true, name: true, type: true }
    });
    console.log("✅ Remaining Root Units in DB:", remaining);
}

main()
    .catch((err) => {
        console.error("Cleanup error:", err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
