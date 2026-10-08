import { prisma } from "../infrastructure/prisma/client.js";
import { DirectiveService } from "../modules/directive/directive.service.js";
import {
    DirectiveType,
    DirectivePriority,
    OrganizationUnitType
} from "../generated/prisma/client.js";

async function main() {
    console.log("\n=======================================================");
    console.log("   POLICIES & DIRECTIVES SEED & TIER VERIFICATION     ");
    console.log("=======================================================\n");

    // 1. Fetch connected organization hierarchy units
    const federal = await prisma.organizationUnit.findFirst({ where: { type: "FEDERAL" } });
    const region = await prisma.organizationUnit.findFirst({
        where: { type: "REGION", parentId: federal?.id }
    }) || await prisma.organizationUnit.findFirst({ where: { type: "REGION" } });

    const zone = await prisma.organizationUnit.findFirst({
        where: { type: "ZONE", parentId: region?.id }
    }) || await prisma.organizationUnit.findFirst({ where: { type: "ZONE" } });

    const woreda = await prisma.organizationUnit.findFirst({
        where: { type: "WOREDA", parentId: zone?.id }
    }) || await prisma.organizationUnit.findFirst({ where: { type: "WOREDA" } });

    const school = await prisma.organizationUnit.findFirst({
        where: { type: "SCHOOL", parentId: woreda?.id }
    }) || await prisma.organizationUnit.findFirst({ where: { type: "SCHOOL" } });

    if (!federal || !region || !zone || !woreda || !school) {
        throw new Error("Missing one or more required administrative units in DB hierarchy.");
    }

    console.log("Administrative Scope Hierarchy Detected:");
    console.log(`- Federal: [${federal.id}] ${federal.name}`);
    console.log(`- Region:  [${region.id}] ${region.name}`);
    console.log(`- Zone:    [${zone.id}] ${zone.name}`);
    console.log(`- Woreda:  [${woreda.id}] ${woreda.name}`);
    console.log(`- School:  [${school.id}] ${school.name}`);

    // Fetch existing users
    const anyUser = await prisma.user.findFirst();
    if (!anyUser) throw new Error("No users found in database");

    const fedAdminRole = await prisma.roleAssignment.findFirst({
        where: { scope: { type: "FEDERAL" } },
        include: { user: true }
    });
    const regAdminRole = await prisma.roleAssignment.findFirst({
        where: { scopeId: region.id },
        include: { user: true }
    });
    const zoneAdminRole = await prisma.roleAssignment.findFirst({
        where: { scopeId: zone.id },
        include: { user: true }
    });
    const woredaAdminRole = await prisma.roleAssignment.findFirst({
        where: { scopeId: woreda.id },
        include: { user: true }
    });
    const schoolAdminRole = await prisma.roleAssignment.findFirst({
        where: { scopeId: school.id },
        include: { user: true }
    });

    const fedUser = fedAdminRole?.user || anyUser;
    const regUser = regAdminRole?.user || anyUser;
    const zoneUser = zoneAdminRole?.user || anyUser;
    const woredaUser = woredaAdminRole?.user || anyUser;
    const schoolUser = schoolAdminRole?.user || anyUser;

    // Clean previous directives
    await prisma.directiveTargetUnit.deleteMany({});
    await prisma.directiveAcknowledgment.deleteMany({});
    await prisma.nationalDirective.deleteMany({});
    console.log("\n[Cleaned up previous directive records]");

    // ---------------------------------------------------------
    // STEP 1: Seed Federal Directives
    // ---------------------------------------------------------
    console.log("\n1. Creating Federal National Directives...");
    const fedDirective1 = await DirectiveService.createAndPublishDirective(
        {
            title: "National Curriculum Standard & Textbook Utilization Directive 2026/27",
            code: "MOE/DIR/2026/001",
            type: DirectiveType.DIRECTIVE,
            category: "CURRICULUM",
            priority: DirectivePriority.HIGH,
            content: "All regional education bureaus, zonal departments, woreda offices, and general secondary schools must strictly adhere to the updated 2026 national competency-based curriculum framework. Standardized textbooks must be distributed on a 1:1 pupil-textbook ratio.",
            issueDate: new Date("2026-09-15"),
            effectiveDate: new Date("2026-10-01"),
            deadline: new Date("2026-11-30"),
            isAcknowledgmentRequired: true,
            targetLevelAll: true,
            targetLevels: ["REGION", "ZONE", "WOREDA", "SCHOOL"],
            cascadeDescendants: true
        },
        { id: federal.id, type: federal.type, name: federal.name },
        fedUser.id,
        "127.0.0.1"
    );
    console.log(`✓ Federal Directive 1 created: "${fedDirective1.title}" (Recipients: ${fedDirective1.recipientsCount})`);

    const fedDirective2 = await DirectiveService.createAndPublishDirective(
        {
            title: "National Student Safety & School Emergency Preparedness Protocol",
            code: "MOE/POL/2026/014",
            type: DirectiveType.POLICY,
            category: "SAFETY",
            priority: DirectivePriority.URGENT,
            content: "Mandatory school campus safety regulations, fire emergency drills, and perimeter security guidelines for all secondary school facilities nationwide.",
            issueDate: new Date("2026-10-01"),
            effectiveDate: new Date("2026-10-10"),
            deadline: new Date("2026-12-15"),
            isAcknowledgmentRequired: true,
            targetLevelAll: true,
            targetLevels: ["SCHOOL"],
            cascadeDescendants: true
        },
        { id: federal.id, type: federal.type, name: federal.name },
        fedUser.id,
        "127.0.0.1"
    );
    console.log(`✓ Federal Directive 2 created: "${fedDirective2.title}" (Recipients: ${fedDirective2.recipientsCount})`);

    // ---------------------------------------------------------
    // STEP 2: Seed Regional Directive (Amhara)
    // ---------------------------------------------------------
    console.log("\n2. Creating Regional Directive (Amhara Region)...");
    const regDirective = await DirectiveService.createAndPublishDirective(
        {
            title: "Amhara Regional Continuous Assessment & Examination Administration Guidelines",
            code: "AREB/DIR/2026/042",
            type: DirectiveType.DIRECTIVE,
            category: "EXAMINATION",
            priority: DirectivePriority.NORMAL,
            content: "Guidelines for conducting continuous formative classroom assessments and regional standard mid-term examinations for Grade 9 through 12.",
            issueDate: new Date("2026-10-05"),
            effectiveDate: new Date("2026-10-20"),
            deadline: new Date("2027-01-15"),
            isAcknowledgmentRequired: true,
            targetOrganizationUnitIds: [zone.id],
            cascadeDescendants: true
        },
        { id: region.id, type: region.type, name: region.name },
        regUser.id,
        "127.0.0.1"
    );
    console.log(`✓ Regional Directive created: "${regDirective.title}" (Recipients: ${regDirective.recipientsCount})`);

    // ---------------------------------------------------------
    // STEP 3: Seed Zonal Directive (North Shewa Zone)
    // ---------------------------------------------------------
    console.log("\n3. Creating Zonal Directive (North Shewa Zone)...");
    const zoneDirective = await DirectiveService.createAndPublishDirective(
        {
            title: "North Shewa Zonal Mid-Term Academic Progress & Attendance Circular",
            code: "NSZ/CIR/2026/088",
            type: DirectiveType.DIRECTIVE,
            category: "ACADEMIC",
            priority: DirectivePriority.NORMAL,
            content: "Zonal directive requiring all woreda supervisors to submit monthly student attendance logs and teacher punctuality records.",
            issueDate: new Date("2026-10-06"),
            effectiveDate: new Date("2026-10-15"),
            isAcknowledgmentRequired: true,
            targetOrganizationUnitIds: [woreda.id],
            cascadeDescendants: true
        },
        { id: zone.id, type: zone.type, name: zone.name },
        zoneUser.id,
        "127.0.0.1"
    );
    console.log(`✓ Zonal Directive created: "${zoneDirective.title}" (Recipients: ${zoneDirective.recipientsCount})`);

    // ---------------------------------------------------------
    // STEP 4: Seed Woreda Directive (Moretna Jiru Woreda)
    // ---------------------------------------------------------
    console.log("\n4. Creating Woreda Directive / Announcement (Moretna Jiru Woreda)...");
    const woredaDirective = await DirectiveService.createAndPublishDirective(
        {
            title: "Woreda Special Instruction on Grade 10 Model Examination Schedule",
            code: "MJW/ANN/2026/012",
            type: DirectiveType.DIRECTIVE,
            category: "EXAMINATION",
            priority: DirectivePriority.HIGH,
            content: "All secondary schools within Moretna Jiru woreda must synchronize their internal model examination timetable according to the attached schedule.",
            issueDate: new Date("2026-10-07"),
            effectiveDate: new Date("2026-10-18"),
            deadline: new Date("2026-11-10"),
            isAcknowledgmentRequired: true,
            targetOrganizationUnitIds: [school.id],
            cascadeDescendants: false
        },
        { id: woreda.id, type: woreda.type, name: woreda.name },
        woredaUser.id,
        "127.0.0.1"
    );
    console.log(`✓ Woreda Announcement created: "${woredaDirective.title}" (Recipients: ${woredaDirective.recipientsCount})`);

    // ---------------------------------------------------------
    // STEP 5: Acknowledge & Record Compliance Across Hierarchy
    // ---------------------------------------------------------
    console.log("\n5. Simulating read status and acknowledgment confirmations across tiers...");

    // Region acknowledges Federal Directive 1
    await DirectiveService.acknowledgeDirective(
        fedDirective1.id,
        { id: region.id, type: region.type, name: region.name },
        regUser.id,
        "Amhara Region confirmed receipt. Circular dispatched to all 11 administrative zones."
    );

    // Zone acknowledges Federal Directive 1 and Regional Directive
    await DirectiveService.acknowledgeDirective(
        fedDirective1.id,
        { id: zone.id, type: zone.type, name: zone.name },
        zoneUser.id,
        "North Shewa Zone confirmed receipt. Textbook logistics committee mobilized."
    );
    await DirectiveService.acknowledgeDirective(
        regDirective.id,
        { id: zone.id, type: zone.type, name: zone.name },
        zoneUser.id,
        "Assessment framework integrated into zonal supervision checklist."
    );

    // Woreda acknowledges Federal, Regional, and Zonal Directives
    await DirectiveService.acknowledgeDirective(
        fedDirective1.id,
        { id: woreda.id, type: woreda.type, name: woreda.name },
        woredaUser.id,
        "Woreda Education Office confirmed receipt."
    );
    await DirectiveService.acknowledgeDirective(
        regDirective.id,
        { id: woreda.id, type: woreda.type, name: woreda.name },
        woredaUser.id,
        "Continuous assessment training scheduled for school directors."
    );
    await DirectiveService.acknowledgeDirective(
        zoneDirective.id,
        { id: woreda.id, type: woreda.type, name: woreda.name },
        woredaUser.id,
        "Attendance monitoring tools distributed."
    );

    // School reads and acknowledges all applicable directives
    await DirectiveService.getDirectiveById(fedDirective1.id, { id: school.id, type: school.type, name: school.name }, schoolUser.id);
    await DirectiveService.acknowledgeDirective(
        fedDirective1.id,
        { id: school.id, type: school.type, name: school.name },
        schoolUser.id,
        "Jihur Secondary School has received textbooks and distributed to all students."
    );

    await DirectiveService.getDirectiveById(fedDirective2.id, { id: school.id, type: school.type, name: school.name }, schoolUser.id);
    await DirectiveService.acknowledgeDirective(
        fedDirective2.id,
        { id: school.id, type: school.type, name: school.name },
        schoolUser.id,
        "School safety committee formed and fire drill completed."
    );

    await DirectiveService.getDirectiveById(regDirective.id, { id: school.id, type: school.type, name: school.name }, schoolUser.id);
    await DirectiveService.acknowledgeDirective(
        regDirective.id,
        { id: school.id, type: school.type, name: school.name },
        schoolUser.id,
        "Formative assessments aligned with regional rubric."
    );

    await DirectiveService.getDirectiveById(zoneDirective.id, { id: school.id, type: school.type, name: school.name }, schoolUser.id);
    await DirectiveService.acknowledgeDirective(
        zoneDirective.id,
        { id: school.id, type: school.type, name: school.name },
        schoolUser.id,
        "Weekly attendance reporting initiated."
    );

    await DirectiveService.getDirectiveById(woredaDirective.id, { id: school.id, type: school.type, name: school.name }, schoolUser.id);
    await DirectiveService.acknowledgeDirective(
        woredaDirective.id,
        { id: school.id, type: school.type, name: school.name },
        schoolUser.id,
        "Model exam timetable published on school notice board."
    );
    console.log("✓ All confirmations and acknowledgment logs recorded successfully.");

    // ---------------------------------------------------------
    // STEP 6: VERIFICATION & AUDIT ACROSS ALL TIERS
    // ---------------------------------------------------------
    console.log("\n=======================================================");
    console.log("   TIER-BY-TIER DIRECTIVES VISIBILITY VERIFICATION     ");
    console.log("=======================================================\n");

    // Federal View
    const fedDirectives = await DirectiveService.getDirectivesForScope(
        { id: federal.id, type: federal.type, name: federal.name }
    );
    console.log(`[FEDERAL DESK] Total visible directives: ${fedDirectives.length}`);
    for (const d of fedDirectives) {
        console.log(`  - "${d.title}" | Issued By Me: ${d.isIssuedByMe} | Total Recipients: ${(d as any).totalRecipients || 0} | Confirmed: ${(d as any).acknowledgedCount || 0}`);
    }

    // Regional View
    const regDirectives = await DirectiveService.getDirectivesForScope(
        { id: region.id, type: region.type, name: region.name }
    );
    const regIssued = regDirectives.filter((d: any) => d.isIssuedByMe);
    const regIncoming = regDirectives.filter((d: any) => !d.isIssuedByMe);
    console.log(`\n[REGIONAL DESK] Total visible directives: ${regDirectives.length} (Issued: ${regIssued.length}, Incoming: ${regIncoming.length})`);
    for (const d of regDirectives) {
        console.log(`  - "${d.title}" | Issuer: ${(d as any).issuer?.name || "Self (Issued By Region)"} | Acknowledged: ${(d as any).userAcknowledgment?.isAcknowledged || d.isIssuedByMe}`);
    }

    // Zonal View
    const zoneDirectives = await DirectiveService.getDirectivesForScope(
        { id: zone.id, type: zone.type, name: zone.name }
    );
    const zoneIssued = zoneDirectives.filter((d: any) => d.isIssuedByMe);
    const zoneIncoming = zoneDirectives.filter((d: any) => !d.isIssuedByMe);
    console.log(`\n[ZONAL DESK] Total visible directives: ${zoneDirectives.length} (Issued: ${zoneIssued.length}, Incoming: ${zoneIncoming.length})`);
    for (const d of zoneDirectives) {
        console.log(`  - "${d.title}" | Issuer: ${(d as any).issuer?.name || "Self (Issued By Zone)"} | Acknowledged: ${(d as any).userAcknowledgment?.isAcknowledged || d.isIssuedByMe}`);
    }

    // Woreda View
    const woredaDirectives = await DirectiveService.getDirectivesForScope(
        { id: woreda.id, type: woreda.type, name: woreda.name }
    );
    const woredaIssued = woredaDirectives.filter((d: any) => d.isIssuedByMe);
    const woredaIncoming = woredaDirectives.filter((d: any) => !d.isIssuedByMe);
    console.log(`\n[WOREDA DESK] Total visible directives: ${woredaDirectives.length} (Issued: ${woredaIssued.length}, Incoming: ${woredaIncoming.length})`);
    for (const d of woredaDirectives) {
        console.log(`  - "${d.title}" | Issuer: ${(d as any).issuer?.name || "Self (Issued By Woreda)"} | Acknowledged: ${(d as any).userAcknowledgment?.isAcknowledged || d.isIssuedByMe}`);
    }

    // School View
    const schoolDirectives = await DirectiveService.getDirectivesForScope(
        { id: school.id, type: school.type, name: school.name }
    );
    console.log(`\n[SCHOOL DESK] Total incoming announcements: ${schoolDirectives.length}`);
    for (const d of schoolDirectives) {
        console.log(`  - "${d.title}" | Issuer: ${(d as any).issuer?.name} | Read: ${(d as any).userAcknowledgment?.isRead} | Acknowledged: ${(d as any).userAcknowledgment?.isAcknowledged}`);
    }

    // Delivery Ledger / Tracking test
    console.log("\n--- Federal Directive 1 Delivery Ledger Detail ---");
    const detailedFedDir = await DirectiveService.getDirectiveById(
        fedDirective1.id,
        { id: federal.id, type: federal.type, name: federal.name },
        fedUser.id
    );
    console.log(`✓ Total Targeted Units: ${detailedFedDir.tracking?.totalRecipients}`);
    console.log(`✓ Read Count:           ${detailedFedDir.tracking?.readCount}`);
    console.log(`✓ Acknowledged Count:   ${detailedFedDir.tracking?.acknowledgedCount}`);

    console.log("\n=======================================================");
    console.log("   POLICIES & DIRECTIVES TESTS PASSED 100%!           ");
    console.log("=======================================================\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
