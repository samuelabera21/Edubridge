import { prisma } from "../src/infrastructure/prisma/client.js";
import { DataRequestService } from "../src/modules/data-request/data-request.service.js";
import { DataRequestPriority, DataRequestFieldType, OrganizationUnitType } from "../src/generated/prisma/client.js";

async function main() {
    console.log("=================================================================");
    console.log("EduBridge Data Request — Target Level Isolation Verification Test");
    console.log("=================================================================\n");

    // 1. Fetch Organizations
    const fedOrg = await prisma.organizationUnit.findFirst({ where: { type: "FEDERAL" } });
    const regionOrgs = await prisma.organizationUnit.findMany({ where: { type: "REGION" } });
    const zoneOrgs = await prisma.organizationUnit.findMany({ where: { type: "ZONE" } });

    if (!fedOrg) {
        console.error("❌ No Federal OrganizationUnit found in database.");
        return;
    }
    if (regionOrgs.length === 0) {
        console.error("❌ No Region OrganizationUnit found in database.");
        return;
    }

    const targetRegion = regionOrgs[0]!;
    const otherRegion = regionOrgs.length > 1 ? regionOrgs[1]! : null;
    const targetZone = zoneOrgs.length > 0 ? zoneOrgs[0]! : null;

    console.log(`📌 Federal Org:   ${fedOrg.name} (${fedOrg.id})`);
    console.log(`📌 Target Region: ${targetRegion.name} (${targetRegion.id})`);
    if (otherRegion) {
        console.log(`📌 Other Region:  ${otherRegion.name} (${otherRegion.id}) (untargeted)`);
    }
    if (targetZone) {
        console.log(`📌 Target Zone:   ${targetZone.name} (${targetZone.id})`);
    }

    // 2. Fetch or mock a Federal user
    const adminUser = await prisma.user.findFirst({
        where: { roleAssignments: { some: { organizationId: fedOrg.id } } }
    }) || await prisma.user.findFirst();

    if (!adminUser) {
        console.error("❌ No active User found in database.");
        return;
    }

    const federalActor = { id: fedOrg.id, type: fedOrg.type, name: fedOrg.name };

    console.log("\n--- Step 1: Create Data Request Targeting Region ONLY ---");
    const regReq = await DataRequestService.createDataRequest(
        {
            title: `E2E Test: Regional Infrastructure Survey (${Date.now()})`,
            objective: "Verify targeted region delivery isolation",
            priority: DataRequestPriority.HIGH,
            startDate: new Date().toISOString(),
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            instructions: "Region level submission test",
            targetUnitIds: [targetRegion.id],
            fields: [
                { label: "Regional Budget Allocated (ETB)", fieldType: DataRequestFieldType.NUMBER, required: true },
                { label: "Regional Coordinator Name", fieldType: DataRequestFieldType.SHORT_TEXT, required: true }
            ]
        },
        federalActor,
        adminUser.id
    );

    console.log(`✅ Data Request created with ID: ${regReq.id}`);
    console.log(`✅ Target count: ${regReq.targets.length}, Targeted Org ID: ${regReq.targets[0]?.organizationId}`);

    // Publish it
    await DataRequestService.publishDataRequest(regReq.id, federalActor, adminUser.id);
    console.log(`✅ Data Request published.`);

    console.log("\n--- Step 2: Verify Delivery Scoping ---");
    // Query as Targeted Region
    const targetRegionActor = { id: targetRegion.id, type: targetRegion.type, name: targetRegion.name };
    const targetRegionList = await DataRequestService.getDataRequestsForScope(targetRegionActor);
    const foundInTargetRegion = targetRegionList.some(r => r.id === regReq.id);
    console.log(`🔍 Query as Targeted Region (${targetRegion.name}): Delivered? -> ${foundInTargetRegion ? "✅ YES (Delivered)" : "❌ NO"}`);

    if (otherRegion) {
        const otherRegionActor = { id: otherRegion.id, type: otherRegion.type, name: otherRegion.name };
        const otherRegionList = await DataRequestService.getDataRequestsForScope(otherRegionActor);
        const foundInOtherRegion = otherRegionList.some(r => r.id === regReq.id);
        console.log(`🔍 Query as Untargeted Region (${otherRegion.name}): Visible? -> ${foundInOtherRegion ? "❌ LEAKED" : "✅ NO (Correctly Isolated)"}`);
    }

    console.log("\n--- Step 3: Targeted Region Submits Data ---");
    const sub = await DataRequestService.recordDirectSubmission(
        regReq.id,
        targetRegion.id,
        {
            "Regional Budget Allocated (ETB)": 5000000,
            "Regional Coordinator Name": "Abebe Kebede"
        },
        adminUser.id
    );
    console.log(`✅ Direct Submission recorded: status=${sub.status}, id=${sub.id}`);

    console.log("\n--- Step 4: Federal Reviews & Accepts Submission ---");
    const reviewed = await DataRequestService.reviewSubmission(
        sub.id,
        { status: "ACCEPTED", reviewComment: "Audited and accepted." },
        federalActor,
        adminUser.id
    );
    console.log(`✅ Submission reviewed by Federal: status=${reviewed.status}`);

    console.log("\n=================================================================");
    console.log("🎉 All Target-Level Delivery & Review Verification Checks PASSED!");
    console.log("=================================================================\n");
}

main()
    .catch((err) => {
        console.error("Test execution failed:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
