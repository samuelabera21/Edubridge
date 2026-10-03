import { describe, it, expect, vi, beforeEach } from "vitest";
import { DirectiveService } from "./directive.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { DirectiveType, DirectivePriority, DirectiveStatus, OrganizationUnitType } from "../../generated/prisma/client.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        nationalDirective: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn()
        },
        directiveTargetUnit: {
            createMany: vi.fn()
        },
        directiveAcknowledgment: {
            createMany: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            upsert: vi.fn(),
            count: vi.fn()
        },
        organizationUnit: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn()
        },
        roleAssignment: {
            findMany: vi.fn()
        },
        notification: {
            createMany: vi.fn(),
            findMany: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        }
    }
}));

describe("National Policies & Directives (Federal -> Lower Levels Data-Flow)", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    const mockUnits = [
        { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" as OrganizationUnitType, parentId: null },
        { id: "reg-1", name: "Amhara Region", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "reg-2", name: "Oromia Region", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-1", name: "South Gondar Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-1" },
        { id: "zone-2", name: "Jimma Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-2" },
        { id: "woreda-1", name: "Debre Tabor Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-1" },
        { id: "school-1", name: "Tabor Secondary School", type: "SCHOOL" as OrganizationUnitType, parentId: "woreda-1" }
    ];

    const federalScope = { id: "fed-1", type: "FEDERAL" as OrganizationUnitType, name: "Federal Ministry of Education" };
    const amharaScope = { id: "reg-1", type: "REGION" as OrganizationUnitType, name: "Amhara Region" };
    const oromiaScope = { id: "reg-2", type: "REGION" as OrganizationUnitType, name: "Oromia Region" };
    const southGondarScope = { id: "zone-1", type: "ZONE" as OrganizationUnitType, name: "South Gondar Zone" };
    const debreTaborScope = { id: "woreda-1", type: "WOREDA" as OrganizationUnitType, name: "Debre Tabor Woreda" };
    const schoolScope = { id: "school-1", type: "SCHOOL" as OrganizationUnitType, name: "Tabor Secondary School" };

    describe("1. Publication Authority & Creation", () => {
        it("should allow Federal Administrator to create and publish a national directive", async () => {
            (prisma.nationalDirective.create as any).mockResolvedValue({
                id: "dir-1",
                issuerOrganizationId: "fed-1",
                authorId: "user-fed",
                title: "National Standardized Curriculum Directive 2026",
                code: "DIR-2026-001",
                type: DirectiveType.DIRECTIVE,
                category: "CURRICULUM",
                priority: DirectivePriority.HIGH,
                status: DirectiveStatus.PUBLISHED,
                content: "All schools must adopt the updated STEM syllabus by Term 2.",
                issueDate: new Date(),
                effectiveDate: new Date(),
                deadline: new Date("2026-11-01"),
                attachmentUrl: "https://edubridge.gov.et/docs/curriculum-2026.pdf",
                attachmentName: "curriculum-2026.pdf",
                isAcknowledgmentRequired: true,
                targetLevelAll: true,
                targetLevels: ["REGION", "ZONE", "WOREDA", "SCHOOL"],
                cascadeDescendants: true
            });

            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockUnits);
            (prisma.directiveAcknowledgment.createMany as any).mockResolvedValue({ count: 6 });
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                { userId: "user-amhara", scopeId: "reg-1" },
                { userId: "user-gondar", scopeId: "zone-1" },
                { userId: "user-school", scopeId: "school-1" }
            ]);
            (prisma.notification.createMany as any).mockResolvedValue({ count: 3 });
            (prisma.auditLog.create as any).mockResolvedValue({});

            const result = await DirectiveService.createAndPublishDirective(
                {
                    title: "National Standardized Curriculum Directive 2026",
                    code: "DIR-2026-001",
                    type: DirectiveType.DIRECTIVE,
                    category: "CURRICULUM",
                    priority: DirectivePriority.HIGH,
                    content: "All schools must adopt the updated STEM syllabus by Term 2.",
                    deadline: new Date("2026-11-01"),
                    attachmentUrl: "https://edubridge.gov.et/docs/curriculum-2026.pdf",
                    attachmentName: "curriculum-2026.pdf",
                    isAcknowledgmentRequired: true,
                    targetLevelAll: true,
                    targetLevels: ["REGION", "ZONE", "WOREDA", "SCHOOL"],
                    cascadeDescendants: true
                },
                federalScope,
                "user-fed"
            );

            expect(result).toBeDefined();
            expect(result.id).toBe("dir-1");
            expect(result.title).toBe("National Standardized Curriculum Directive 2026");
            expect(result.recipientsCount).toBe(6); // 6 non-federal units
            expect(result.notificationsCount).toBe(3);
            expect(prisma.directiveAcknowledgment.createMany).toHaveBeenCalledTimes(1);
            expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
        });

        it("should reject non-Federal user attempting to issue a directive", async () => {
            await expect(
                DirectiveService.createAndPublishDirective(
                    {
                        title: "Unauthorized Directive",
                        content: "Test content"
                    },
                    amharaScope,
                    "user-reg"
                )
            ).rejects.toThrow(/Only Federal administrators/);
        });

        it("should validate required fields", async () => {
            await expect(
                DirectiveService.createAndPublishDirective(
                    {
                        title: "",
                        content: "Test content"
                    },
                    federalScope,
                    "user-fed"
                )
            ).rejects.toThrow(/Directive title is required/);
        });
    });

    describe("2. Hierarchical Delivery Flow & Target Scoping", () => {
        it("should deliver directive targeted to Amhara Region to its subordinate Zone, Woreda, and School via cascade", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockUnits);

            const amharaDirective = {
                id: "dir-amhara",
                title: "Amhara Regional Infrastructure Assessment",
                code: "DIR-AMH-01",
                type: DirectiveType.DIRECTIVE,
                category: "INFRASTRUCTURE",
                priority: DirectivePriority.NORMAL,
                status: DirectiveStatus.PUBLISHED,
                content: "Inspect all primary campus structures before rainy season.",
                issueDate: new Date(),
                effectiveDate: new Date(),
                deadline: null,
                attachmentUrl: null,
                attachmentName: null,
                isAcknowledgmentRequired: true,
                targetLevelAll: false,
                targetLevels: [],
                cascadeDescendants: true,
                issuerOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" },
                author: { id: "user-fed", name: "Federal Admin", email: "fed@edubridge.gov.et" },
                targetOrganizationUnits: [{ organizationId: "reg-1" }],
                acknowledgments: [
                    { isRead: false, readAt: null, isAcknowledged: false, acknowledgedAt: null, acknowledgmentNotes: null }
                ]
            };

            (prisma.nationalDirective.findMany as any).mockResolvedValue([amharaDirective]);
            (prisma.directiveAcknowledgment.upsert as any).mockResolvedValue({
                isRead: false,
                isAcknowledged: false
            });

            // Check visibility for School under Amhara (school-1 -> woreda-1 -> zone-1 -> reg-1)
            const schoolDirectives = await DirectiveService.getDirectivesForScope(schoolScope);
            expect(schoolDirectives).toHaveLength(1);
            expect(schoolDirectives[0]?.id).toBe("dir-amhara");

            // Check visibility for Oromia Region (reg-2 is outside Amhara hierarchy)
            const oromiaDirectives = await DirectiveService.getDirectivesForScope(oromiaScope);
            expect(oromiaDirectives).toHaveLength(0);
        });

        it("should respect targetLevels filter (e.g. SCHOOL-only directive)", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockUnits);

            const schoolOnlyDirective = {
                id: "dir-school-only",
                title: "National Student Safety Protocol",
                code: "POL-SCH-01",
                type: DirectiveType.POLICY,
                category: "SAFETY",
                priority: DirectivePriority.URGENT,
                status: DirectiveStatus.PUBLISHED,
                content: "Safety guidelines mandatory for all school campuses.",
                issueDate: new Date(),
                effectiveDate: new Date(),
                deadline: null,
                attachmentUrl: null,
                attachmentName: null,
                isAcknowledgmentRequired: true,
                targetLevelAll: true,
                targetLevels: ["SCHOOL"],
                cascadeDescendants: false,
                issuerOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" },
                author: { id: "user-fed", name: "Federal Admin", email: "fed@edubridge.gov.et" },
                targetOrganizationUnits: [],
                acknowledgments: [
                    { isRead: false, readAt: null, isAcknowledged: false, acknowledgedAt: null, acknowledgmentNotes: null }
                ]
            };

            (prisma.nationalDirective.findMany as any).mockResolvedValue([schoolOnlyDirective]);
            (prisma.directiveAcknowledgment.upsert as any).mockResolvedValue({
                isRead: false,
                isAcknowledged: false
            });

            // School receives it
            const schoolResults = await DirectiveService.getDirectivesForScope(schoolScope);
            expect(schoolResults).toHaveLength(1);
            expect(schoolResults[0]?.id).toBe("dir-school-only");

            // Zone does not receive it since targetLevels is ["SCHOOL"]
            const zoneResults = await DirectiveService.getDirectivesForScope(southGondarScope);
            expect(zoneResults).toHaveLength(0);
        });
    });

    describe("3. Read Status & Recipient Acknowledgment Tracking", () => {
        it("should auto-mark directive as read when recipient opens it", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockUnits);

            const directive = {
                id: "dir-ack-test",
                title: "Academic Calendar Adjustment Directive",
                type: DirectiveType.DIRECTIVE,
                priority: DirectivePriority.NORMAL,
                status: DirectiveStatus.PUBLISHED,
                content: "Term 1 exam dates rescheduled.",
                targetLevelAll: true,
                targetLevels: [],
                cascadeDescendants: true,
                issuerOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" },
                author: { id: "user-fed", name: "Federal Admin", email: "fed@edubridge.gov.et" },
                targetOrganizationUnits: []
            };

            (prisma.nationalDirective.findUnique as any).mockResolvedValue(directive);
            (prisma.directiveAcknowledgment.upsert as any).mockResolvedValue({
                directiveId: "dir-ack-test",
                organizationId: "woreda-1",
                isRead: true,
                readAt: new Date(),
                isAcknowledged: false
            });
            (prisma.directiveAcknowledgment.findUnique as any).mockResolvedValue({
                isRead: true,
                readAt: new Date(),
                isAcknowledged: false,
                acknowledgedAt: null,
                acknowledgmentNotes: null
            });

            const result = await DirectiveService.getDirectiveById("dir-ack-test", debreTaborScope, "user-woreda");
            expect(result).toBeDefined();
            expect(prisma.directiveAcknowledgment.upsert).toHaveBeenCalled();
            expect(result.userAcknowledgment?.isRead).toBe(true);
        });

        it("should record recipient acknowledgment with notes and timestamp", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockUnits);

            (prisma.nationalDirective.findUnique as any).mockResolvedValue({
                id: "dir-ack-test",
                title: "Academic Calendar Adjustment Directive",
                status: DirectiveStatus.PUBLISHED,
                targetLevelAll: true,
                targetLevels: [],
                cascadeDescendants: true,
                targetOrganizationUnits: []
            });

            const ackDate = new Date();
            (prisma.directiveAcknowledgment.upsert as any).mockResolvedValue({
                directiveId: "dir-ack-test",
                organizationId: "school-1",
                userId: "user-principal",
                isRead: true,
                readAt: ackDate,
                isAcknowledged: true,
                acknowledgedAt: ackDate,
                acknowledgmentNotes: "Received and distributed to all department heads."
            });

            (prisma.auditLog.create as any).mockResolvedValue({});

            const ackResult = await DirectiveService.acknowledgeDirective(
                "dir-ack-test",
                schoolScope,
                "user-principal",
                "Received and distributed to all department heads."
            );

            expect(ackResult.success).toBe(true);
            expect(ackResult.data.isAcknowledged).toBe(true);
            expect(ackResult.data.acknowledgmentNotes).toBe("Received and distributed to all department heads.");
        });

        it("should provide Federal Admin with comprehensive recipient tracking metrics", async () => {
            const directive = {
                id: "dir-tracking-test",
                title: "National Assessment Guidelines",
                type: DirectiveType.DIRECTIVE,
                priority: DirectivePriority.HIGH,
                status: DirectiveStatus.PUBLISHED,
                content: "Official testing protocols.",
                targetLevelAll: true,
                targetLevels: [],
                cascadeDescendants: true,
                issuerOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" },
                author: { id: "user-fed", name: "Federal Admin", email: "fed@edubridge.gov.et" },
                targetOrganizationUnits: []
            };

            (prisma.nationalDirective.findUnique as any).mockResolvedValue(directive);
            (prisma.directiveAcknowledgment.findMany as any).mockResolvedValue([
                {
                    organization: { id: "reg-1", name: "Amhara Region", type: "REGION" },
                    user: { name: "Samuel Admin", email: "samuel@amhara.edu.et" },
                    isRead: true,
                    readAt: new Date(),
                    isAcknowledged: true,
                    acknowledgedAt: new Date(),
                    acknowledgmentNotes: "Compliant"
                },
                {
                    organization: { id: "reg-2", name: "Oromia Region", type: "REGION" },
                    user: null,
                    isRead: false,
                    readAt: null,
                    isAcknowledged: false,
                    acknowledgedAt: null,
                    acknowledgmentNotes: null
                }
            ]);

            const result = await DirectiveService.getDirectiveById("dir-tracking-test", federalScope);
            expect(result.tracking).toBeDefined();
            expect(result.tracking?.totalRecipients).toBe(2);
            expect(result.tracking?.readCount).toBe(1);
            expect(result.tracking?.acknowledgedCount).toBe(1);
        });
    });
});
