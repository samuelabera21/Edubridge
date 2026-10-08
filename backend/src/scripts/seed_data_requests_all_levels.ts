import { prisma } from "../infrastructure/prisma/client.js";
import { DataRequestService } from "../modules/data-request/data-request.service.js";
import { DataRequestPriority, DataRequestFieldType, DataRequestSubmissionStatus } from "../generated/prisma/client.js";

async function main() {
    console.log("=================================================");
    console.log("🌱 STARTING MULTI-LEVEL DATA REQUEST SEED & TEST");
    console.log("=================================================\n");

    // 1. Discover connected branch organizations
    const federalOrg = await prisma.organizationUnit.findFirst({ where: { type: "FEDERAL" } });
    const regionOrg = await prisma.organizationUnit.findFirst({ where: { type: "REGION", name: { contains: "Amhara" } } }) || await prisma.organizationUnit.findFirst({ where: { type: "REGION" } });
    const zoneOrg = await prisma.organizationUnit.findFirst({ where: { type: "ZONE", name: { contains: "North shewa" } } }) || await prisma.organizationUnit.findFirst({ where: { type: "ZONE" } });
    const woredaOrg = await prisma.organizationUnit.findFirst({ where: { type: "WOREDA", name: { contains: "moretna" } } }) || await prisma.organizationUnit.findFirst({ where: { type: "WOREDA" } });
    const schoolOrg = await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL", name: { contains: "Jihur" } } }) || await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL" } });

    if (!federalOrg || !regionOrg || !zoneOrg || !woredaOrg || !schoolOrg) {
        throw new Error("Missing organization hierarchy in database. Please ensure Federal, Region, Zone, Woreda, and School exist.");
    }

    console.log("🏛️ Connected Administrative Branch:");
    console.log(`- [FEDERAL] ${federalOrg.name} (${federalOrg.id})`);
    console.log(`- [REGION]  ${regionOrg.name} (${regionOrg.id})`);
    console.log(`- [ZONE]    ${zoneOrg.name} (${zoneOrg.id})`);
    console.log(`- [WOREDA]  ${woredaOrg.name} (${woredaOrg.id})`);
    console.log(`- [SCHOOL]  ${schoolOrg.name} (${schoolOrg.id})\n`);

    // Helper to find an admin user for a given org
    async function getOrgAdmin(orgId: string) {
        const assignment = await prisma.roleAssignment.findFirst({
            where: { scopeId: orgId },
            include: { user: true }
        });
        if (assignment && assignment.user) {
            return assignment.user;
        }
        return await prisma.user.findFirst();
    }

    const federalUser = await getOrgAdmin(federalOrg.id);
    const regionUser = await getOrgAdmin(regionOrg.id);
    const zoneUser = await getOrgAdmin(zoneOrg.id);
    const woredaUser = await getOrgAdmin(woredaOrg.id);
    const schoolUser = await getOrgAdmin(schoolOrg.id);

    if (!federalUser || !regionUser || !zoneUser || !woredaUser || !schoolUser) {
        throw new Error("Could not identify users for all hierarchy tiers.");
    }

    // Clean up past demo data requests
    await prisma.dataRequestSubmission.deleteMany({
        where: { request: { title: { contains: "Demo" } } }
    });
    await prisma.dataRequestTarget.deleteMany({
        where: { request: { title: { contains: "Demo" } } }
    });
    await prisma.dataRequestField.deleteMany({
        where: { request: { title: { contains: "Demo" } } }
    });
    await prisma.dataRequest.deleteMany({
        where: { title: { contains: "Demo" } }
    });

    // -------------------------------------------------------------------------
    // TEST LEVEL 1: FEDERAL -> Region, Zone, Woreda, School
    // -------------------------------------------------------------------------
    console.log("➡️ Level 1: Creating Federal Data Request targeting Region, Zone, Woreda, School...");
    const federalReq = await DataRequestService.createDataRequest(
        {
            title: "2026 National Annual Education Census (Demo)",
            objective: "Collect nationwide comprehensive infrastructure, digital readiness, and staffing census.",
            priority: DataRequestPriority.HIGH,
            startDate: new Date().toISOString(),
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            instructions: "Please accurately provide all requested institution metrics.",
            targetUnitIds: [regionOrg.id, zoneOrg.id, woredaOrg.id, schoolOrg.id],
            fields: [
                { label: "Total Enrolled Students", fieldType: DataRequestFieldType.NUMBER, required: true, order: 1 },
                { label: "Active Certified Teachers", fieldType: DataRequestFieldType.NUMBER, required: true, order: 2 },
                { label: "Broadband Internet Status", fieldType: DataRequestFieldType.SINGLE_SELECT, options: ["High-speed Fiber", "4G Wireless", "None"], required: true, order: 3 }
            ]
        },
        { id: federalOrg.id, type: "FEDERAL", name: federalOrg.name },
        federalUser.id
    );
    await DataRequestService.publishDataRequest(federalReq.id, { id: federalOrg.id, type: "FEDERAL", name: federalOrg.name }, federalUser.id);
    console.log(`✅ Federal Request Published (ID: ${federalReq.id}) with 4 targets.\n`);

    // -------------------------------------------------------------------------
    // TEST LEVEL 2: REGION -> Zone, Woreda, School
    // -------------------------------------------------------------------------
    console.log("➡️ Level 2: Creating Regional Data Request targeting Zone, Woreda, School...");
    const regionReq = await DataRequestService.createDataRequest(
        {
            title: "Regional STEM Lab Equipment Audit (Demo)",
            objective: "Assess lab facilities and scientific instruments across secondary educational units.",
            priority: DataRequestPriority.NORMAL,
            startDate: new Date().toISOString(),
            deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
            targetUnitIds: [zoneOrg.id, woredaOrg.id, schoolOrg.id],
            fields: [
                { label: "Functional Chemistry Stations", fieldType: DataRequestFieldType.NUMBER, required: true, order: 1 },
                { label: "Functional Computers in ICT Lab", fieldType: DataRequestFieldType.NUMBER, required: true, order: 2 },
                { label: "Solar / Backup Power Availability", fieldType: DataRequestFieldType.SINGLE_SELECT, options: ["Yes - Full Solar", "Yes - Generator", "No Backup"], required: true, order: 3 }
            ]
        },
        { id: regionOrg.id, type: "REGION", name: regionOrg.name },
        regionUser.id
    );
    await DataRequestService.publishDataRequest(regionReq.id, { id: regionOrg.id, type: "REGION", name: regionOrg.name }, regionUser.id);
    console.log(`✅ Regional Request Published (ID: ${regionReq.id}) with 3 targets.\n`);

    // -------------------------------------------------------------------------
    // TEST LEVEL 3: ZONE -> Woreda, School
    // -------------------------------------------------------------------------
    console.log("➡️ Level 3: Creating Zonal Data Request targeting Woreda & School...");
    const zoneReq = await DataRequestService.createDataRequest(
        {
            title: "Zonal Mid-Year Textbook Distribution Audit (Demo)",
            objective: "Track textbook-to-student ratios and deficit numbers across subordinate woredas and schools.",
            priority: DataRequestPriority.HIGH,
            startDate: new Date().toISOString(),
            deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            targetUnitIds: [woredaOrg.id, schoolOrg.id],
            fields: [
                { label: "Mathematics Grade 9 Textbooks Deficit", fieldType: DataRequestFieldType.NUMBER, required: true, order: 1 },
                { label: "English Grade 10 Textbooks Deficit", fieldType: DataRequestFieldType.NUMBER, required: true, order: 2 },
                { label: "General Remarks / Urgent Needs", fieldType: DataRequestFieldType.SHORT_TEXT, required: false, order: 3 }
            ]
        },
        { id: zoneOrg.id, type: "ZONE", name: zoneOrg.name },
        zoneUser.id
    );
    await DataRequestService.publishDataRequest(zoneReq.id, { id: zoneOrg.id, type: "ZONE", name: zoneOrg.name }, zoneUser.id);
    console.log(`✅ Zonal Request Published (ID: ${zoneReq.id}) with 2 targets.\n`);

    // -------------------------------------------------------------------------
    // TEST LEVEL 4: WOREDA -> School
    // -------------------------------------------------------------------------
    console.log("➡️ Level 4: Creating Woreda Data Request targeting School...");
    const woredaReq = await DataRequestService.createDataRequest(
        {
            title: "Woreda Special Needs & Inclusive Education Enrollment (Demo)",
            objective: "Determine enrollment of students with disabilities and specific support requirements.",
            priority: DataRequestPriority.NORMAL,
            startDate: new Date().toISOString(),
            deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            targetUnitIds: [schoolOrg.id],
            fields: [
                { label: "Total Students with Visual Impairments", fieldType: DataRequestFieldType.NUMBER, required: true, order: 1 },
                { label: "Total Students with Hearing Impairments", fieldType: DataRequestFieldType.NUMBER, required: true, order: 2 },
                { label: "Special Needs Trained Teachers On-site", fieldType: DataRequestFieldType.NUMBER, required: true, order: 3 }
            ]
        },
        { id: woredaOrg.id, type: "WOREDA", name: woredaOrg.name },
        woredaUser.id
    );
    await DataRequestService.publishDataRequest(woredaReq.id, { id: woredaOrg.id, type: "WOREDA", name: woredaOrg.name }, woredaUser.id);
    console.log(`✅ Woreda Request Published (ID: ${woredaReq.id}) with 1 target.\n`);

    // -------------------------------------------------------------------------
    // TEST SUBMISSIONS & REVIEWS
    // -------------------------------------------------------------------------
    console.log("📝 Testing Submissions & Reviews across tiers...");

    // 1. School submits to Woreda request
    const woredaSubmission = await DataRequestService.recordDirectSubmission(
        woredaReq.id,
        schoolOrg.id,
        {
            "Total Students with Visual Impairments": 3,
            "Total Students with Hearing Impairments": 2,
            "Special Needs Trained Teachers On-site": 1
        },
        schoolUser.id
    );
    console.log(`- School submitted response to Woreda request (Submission ID: ${woredaSubmission.id})`);

    // 2. Woreda reviews and accepts the school submission
    const reviewedWoredaSub = await DataRequestService.reviewSubmission(
        woredaSubmission.id,
        {
            status: "ACCEPTED",
            reviewComment: "Verified by Woreda Special Needs Coordinator. Data accepted without revisions."
        },
        { id: woredaOrg.id, type: "WOREDA", name: woredaOrg.name },
        woredaUser.id
    );
    console.log(`- Woreda reviewed submission -> Status: ${reviewedWoredaSub.status}, Review Notes: "${reviewedWoredaSub.reviewComment}"`);

    // 3. School submits to Zonal request
    const zoneSubmission = await DataRequestService.recordDirectSubmission(
        zoneReq.id,
        schoolOrg.id,
        {
            "Mathematics Grade 9 Textbooks Deficit": 45,
            "English Grade 10 Textbooks Deficit": 30,
            "General Remarks / Urgent Needs": "Supplementary copies urgently needed before semester 2."
        },
        schoolUser.id
    );
    console.log(`- School submitted response to Zonal request (Submission ID: ${zoneSubmission.id})`);

    // 4. Zone reviews and accepts the school submission
    const reviewedZoneSub = await DataRequestService.reviewSubmission(
        zoneSubmission.id,
        {
            status: "ACCEPTED",
            reviewComment: "Approved by Zonal Curriculum & Logistics department."
        },
        { id: zoneOrg.id, type: "ZONE", name: zoneOrg.name },
        zoneUser.id
    );
    console.log(`- Zone reviewed submission -> Status: ${reviewedZoneSub.status}, Review Notes: "${reviewedZoneSub.reviewComment}"`);

    // -------------------------------------------------------------------------
    // ROLE-BASED SCOPED VISIBILITY VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n🔒 Verifying Role-Based Scoped Visibility per Tier:");

    const fedRequests = await DataRequestService.getDataRequestsForScope({ id: federalOrg.id, type: "FEDERAL", name: federalOrg.name });
    console.log(`- Federal Scope sees ${fedRequests.length} request(s) (Expected only Federal requests):`);
    for (const r of fedRequests) console.log(`   • "${r.title}" (CreatedByMe: ${r.isCreatedByMe})`);

    const regRequests = await DataRequestService.getDataRequestsForScope({ id: regionOrg.id, type: "REGION", name: regionOrg.name });
    console.log(`- Region Scope sees ${regRequests.length} request(s) (Expected Federal incoming + Region created):`);
    for (const r of regRequests) console.log(`   • "${r.title}" (CreatedByMe: ${r.isCreatedByMe})`);

    const zoneRequests = await DataRequestService.getDataRequestsForScope({ id: zoneOrg.id, type: "ZONE", name: zoneOrg.name });
    console.log(`- Zone Scope sees ${zoneRequests.length} request(s) (Expected Federal & Region incoming + Zone created; NO Woreda-created):`);
    for (const r of zoneRequests) console.log(`   • "${r.title}" (CreatedByMe: ${r.isCreatedByMe})`);

    const woredaRequests = await DataRequestService.getDataRequestsForScope({ id: woredaOrg.id, type: "WOREDA", name: woredaOrg.name });
    console.log(`- Woreda Scope sees ${woredaRequests.length} request(s) (Expected Federal, Region, Zone incoming + Woreda created):`);
    for (const r of woredaRequests) console.log(`   • "${r.title}" (CreatedByMe: ${r.isCreatedByMe})`);

    const schoolRequests = await DataRequestService.getDataRequestsForScope({ id: schoolOrg.id, type: "SCHOOL", name: schoolOrg.name });
    console.log(`- School Scope sees ${schoolRequests.length} request(s) (Expected all 4 incoming requests):`);
    for (const r of schoolRequests) console.log(`   • "${r.title}" (CreatedByMe: ${r.isCreatedByMe})`);

    // -------------------------------------------------------------------------
    // NOTIFICATION VERIFICATION
    // -------------------------------------------------------------------------
    console.log("\n🔔 Checking Generated In-App Notifications:");
    const recentNotifs = await prisma.notification.findMany({
        where: {
            OR: [
                { title: { contains: "Data Request" } },
                { title: { contains: "Submission" } }
            ]
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
            user: { select: { email: true, name: true } },
            organization: { select: { name: true, type: true } }
        }
    });

    console.log(`Found ${recentNotifs.length} recent data request notifications:`);
    for (const n of recentNotifs) {
        console.log(`- [${n.organization?.type || "USER"}] To: ${n.user?.name || n.user?.email || n.organization?.name} | Title: "${n.title}" | Content: "${n.content}" | Link: ${n.link}`);
    }

    console.log("\n=================================================");
    console.log("🎉 ALL MULTI-LEVEL DATA REQUEST TESTS COMPLETED SUCCESSFULLY!");
    console.log("=================================================");
}

main()
    .catch((err) => {
        console.error("❌ Error in seed test:", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
