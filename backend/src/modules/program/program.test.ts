import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProgramService } from "./program.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
    OrganizationUnitType,
    ProgramPriority,
    ProgramStatus,
    ProgramImplementationStatus
} from "../../generated/prisma/client.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        program: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn(),
            count: vi.fn()
        },
        programTargetUnit: {
            createMany: vi.fn()
        },
        programImplementation: {
            createMany: vi.fn(),
            findUnique: vi.fn(),
            upsert: vi.fn(),
            update: vi.fn(),
            count: vi.fn()
        },
        organizationUnit: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        }
    }
}));

describe("Hierarchical National Programs / Initiatives Service", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    const mockHierarchyUnits = [
        { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" as OrganizationUnitType, parentId: null },
        { id: "reg-amhara", name: "Amhara Regional Education Bureau", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "reg-oromia", name: "Oromia Regional Education Bureau", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-gondar", name: "South Gondar Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-amhara" },
        { id: "zone-jimma", name: "Jimma Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-oromia" },
        { id: "woreda-tabor", name: "Debre Tabor Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-gondar" },
        { id: "school-tabor-sec", name: "Tabor Secondary School", type: "SCHOOL" as OrganizationUnitType, parentId: "woreda-tabor" },
        { id: "school-gondar-elem", name: "Gondar Elementary School", type: "SCHOOL" as OrganizationUnitType, parentId: "woreda-tabor" }
    ];

    const federalActor = { id: "fed-1", type: "FEDERAL" as OrganizationUnitType, name: "Federal Ministry of Education" };
    const amharaActor = { id: "reg-amhara", type: "REGION" as OrganizationUnitType, name: "Amhara Regional Education Bureau" };
    const oromiaActor = { id: "reg-oromia", type: "REGION" as OrganizationUnitType, name: "Oromia Regional Education Bureau" };
    const gondarZoneActor = { id: "zone-gondar", type: "ZONE" as OrganizationUnitType, name: "South Gondar Zone" };
    const taborWoredaActor = { id: "woreda-tabor", type: "WOREDA" as OrganizationUnitType, name: "Debre Tabor Woreda" };
    const taborSchoolActor = { id: "school-tabor-sec", type: "SCHOOL" as OrganizationUnitType, name: "Tabor Secondary School" };

    describe("1. Program Creation & Scoping", () => {
        it("1. Federal can create a national program targeting all regions and descendants", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);
            (prisma.program.create as any).mockResolvedValue({
                id: "prog-nat-1",
                name: "National School Improvement Program 2026",
                description: "Nationwide modernization initiative",
                objective: "Improve pedagogical standards and school infrastructure",
                priority: ProgramPriority.HIGH,
                status: ProgramStatus.PUBLISHED,
                startDate: new Date("2026-10-01"),
                endDate: new Date("2026-12-30"),
                instructions: "Conduct comprehensive school assessment",
                requiredAction: "Submit completed baseline assessment report",
                createdBy: "user-fed-1",
                createdOrganizationId: "fed-1",
                targetLevelAll: true,
                targetLevels: ["REGION", "ZONE", "WOREDA", "SCHOOL"],
                cascadeDescendants: true,
                parentProgramId: null
            });
            (prisma.programImplementation.createMany as any).mockResolvedValue({ count: 7 });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-1" });

            const result = await ProgramService.createAndPublishProgram(
                {
                    name: "National School Improvement Program 2026",
                    description: "Nationwide modernization initiative",
                    objective: "Improve pedagogical standards and school infrastructure",
                    priority: ProgramPriority.HIGH,
                    startDate: "2026-10-01",
                    endDate: "2026-12-30",
                    instructions: "Conduct comprehensive school assessment",
                    requiredAction: "Submit completed baseline assessment report",
                    targetLevelAll: true,
                    targetLevels: ["REGION", "ZONE", "WOREDA", "SCHOOL"],
                    cascadeDescendants: true
                },
                federalActor,
                "user-fed-1",
                "127.0.0.1"
            );

            expect(result).toBeDefined();
            expect(result.id).toBe("prog-nat-1");
            expect(prisma.program.create).toHaveBeenCalledTimes(1);
            expect(prisma.programImplementation.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    expect.objectContaining({ organizationId: "reg-amhara", status: ProgramImplementationStatus.PENDING }),
                    expect.objectContaining({ organizationId: "reg-oromia", status: ProgramImplementationStatus.PENDING }),
                    expect.objectContaining({ organizationId: "school-tabor-sec", status: ProgramImplementationStatus.PENDING })
                ]),
                skipDuplicates: true
            });
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "PROGRAM_CREATED",
                        organizationId: "fed-1",
                        userId: "user-fed-1"
                    })
                })
            );
        });

        it("2. Federal can target a specific region only (e.g. Amhara)", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);
            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                return Promise.resolve(mockHierarchyUnits.find(u => u.id === where.id));
            });
            (prisma.program.create as any).mockResolvedValue({
                id: "prog-reg-specific",
                name: "Amhara Regional Literacy Boost",
                description: "Targeted literacy development",
                objective: "Enhance reading levels in primary schools",
                priority: ProgramPriority.NORMAL,
                status: ProgramStatus.PUBLISHED,
                startDate: new Date("2026-10-01"),
                endDate: new Date("2026-12-30"),
                instructions: "Roll out new reading materials",
                requiredAction: "Distribute reader books and report headcount",
                createdBy: "user-fed-1",
                createdOrganizationId: "fed-1",
                targetLevelAll: false,
                targetLevels: [],
                cascadeDescendants: true,
                parentProgramId: null
            });
            (prisma.programTargetUnit.createMany as any).mockResolvedValue({ count: 1 });
            (prisma.programImplementation.createMany as any).mockResolvedValue({ count: 4 });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-2" });

            const result = await ProgramService.createAndPublishProgram(
                {
                    name: "Amhara Regional Literacy Boost",
                    description: "Targeted literacy development",
                    objective: "Enhance reading levels in primary schools",
                    startDate: "2026-10-01",
                    endDate: "2026-12-30",
                    instructions: "Roll out new reading materials",
                    requiredAction: "Distribute reader books and report headcount",
                    targetUnitIds: ["reg-amhara"],
                    cascadeDescendants: true
                },
                federalActor,
                "user-fed-1"
            );

            expect(result).toBeDefined();
            expect(prisma.programTargetUnit.createMany).toHaveBeenCalledWith({
                data: [{ programId: "prog-reg-specific", organizationId: "reg-amhara" }],
                skipDuplicates: true
            });
            // Should cascade only to Amhara descendants (South Gondar, Debre Tabor, and its 2 schools)
            expect(prisma.programImplementation.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    expect.objectContaining({ organizationId: "reg-amhara" }),
                    expect.objectContaining({ organizationId: "zone-gondar" }),
                    expect.objectContaining({ organizationId: "woreda-tabor" }),
                    expect.objectContaining({ organizationId: "school-tabor-sec" })
                ]),
                skipDuplicates: true
            });
        });

        it("3. Region can target only its descendants and is rejected if targeting another region or cross-branch units", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);
            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                return Promise.resolve(mockHierarchyUnits.find(u => u.id === where.id));
            });

            // Amhara attempts to target Jimma Zone (under Oromia)
            await expect(
                ProgramService.createAndPublishProgram(
                    {
                        name: "Invalid Cross Branch Program",
                        description: "Attempting unauthorized cross-branch delivery",
                        objective: "Unauthorized",
                        startDate: "2026-10-01",
                        endDate: "2026-12-30",
                        instructions: "Test",
                        requiredAction: "Test",
                        targetUnitIds: ["zone-jimma"]
                    },
                    amharaActor,
                    "user-amhara-1"
                )
            ).rejects.toThrow(/outside your authorized hierarchical jurisdiction/);
        });

        it("4. Zone can target only its subordinate Woredas and Schools", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);
            (prisma.program.create as any).mockResolvedValue({
                id: "prog-zone-1",
                name: "Zonal STEM Initiative",
                description: "Zonal lab equipment distribution",
                objective: "Equip secondary schools with chemistry kits",
                priority: ProgramPriority.HIGH,
                status: ProgramStatus.PUBLISHED,
                startDate: new Date("2026-10-01"),
                endDate: new Date("2026-12-30"),
                instructions: "Verify science lab safety and inventory",
                requiredAction: "Acknowledge receipt and submit equipment checklist",
                createdBy: "user-zone-1",
                createdOrganizationId: "zone-gondar",
                targetLevelAll: true,
                targetLevels: ["WOREDA", "SCHOOL"],
                cascadeDescendants: true,
                parentProgramId: null
            });
            (prisma.programImplementation.createMany as any).mockResolvedValue({ count: 3 });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-3" });

            const result = await ProgramService.createAndPublishProgram(
                {
                    name: "Zonal STEM Initiative",
                    description: "Zonal lab equipment distribution",
                    objective: "Equip secondary schools with chemistry kits",
                    startDate: "2026-10-01",
                    endDate: "2026-12-30",
                    instructions: "Verify science lab safety and inventory",
                    requiredAction: "Acknowledge receipt and submit equipment checklist",
                    targetLevelAll: true,
                    targetLevels: ["WOREDA", "SCHOOL"]
                },
                gondarZoneActor,
                "user-zone-1"
            );

            expect(result).toBeDefined();
            expect(prisma.programImplementation.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    expect.objectContaining({ organizationId: "woreda-tabor" }),
                    expect.objectContaining({ organizationId: "school-tabor-sec" })
                ]),
                skipDuplicates: true
            });
        });

        it("5. Woreda can target only its schools", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);
            (prisma.program.create as any).mockResolvedValue({
                id: "prog-woreda-1",
                name: "Woreda Sports Day 2026",
                description: "Annual school sports competition",
                objective: "Encourage athletics and teamwork",
                priority: ProgramPriority.NORMAL,
                status: ProgramStatus.PUBLISHED,
                startDate: new Date("2026-10-01"),
                endDate: new Date("2026-12-30"),
                instructions: "Register school soccer and track teams",
                requiredAction: "Submit participant team roster",
                createdBy: "user-woreda-1",
                createdOrganizationId: "woreda-tabor",
                targetLevelAll: true,
                targetLevels: ["SCHOOL"],
                cascadeDescendants: true,
                parentProgramId: null
            });
            (prisma.programImplementation.createMany as any).mockResolvedValue({ count: 2 });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-4" });

            const result = await ProgramService.createAndPublishProgram(
                {
                    name: "Woreda Sports Day 2026",
                    description: "Annual school sports competition",
                    objective: "Encourage athletics and teamwork",
                    startDate: "2026-10-01",
                    endDate: "2026-12-30",
                    instructions: "Register school soccer and track teams",
                    requiredAction: "Submit participant team roster",
                    targetLevelAll: true,
                    targetLevels: ["SCHOOL"]
                },
                taborWoredaActor,
                "user-woreda-1"
            );

            expect(result).toBeDefined();
            expect(prisma.programImplementation.createMany).toHaveBeenCalledWith({
                data: expect.arrayContaining([
                    expect.objectContaining({ organizationId: "school-tabor-sec" }),
                    expect.objectContaining({ organizationId: "school-gondar-elem" })
                ]),
                skipDuplicates: true
            });
        });
    });

    describe("2. Implementation Chain & Cascading", () => {
        it("9. Lower level can cascade a subordinate initiative referencing the parent program", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);
            (prisma.program.findUnique as any).mockResolvedValue({
                id: "prog-nat-1",
                name: "National School Improvement Program 2026",
                createdOrganizationId: "fed-1",
                createdOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" }
            });
            (prisma.program.create as any).mockResolvedValue({
                id: "prog-amhara-sub-1",
                name: "Amhara Regional Implementation: School Improvement 2026",
                description: "Regional adaptation and execution plan",
                objective: "Deploy regional inspectors and distribute assessment rubrics",
                priority: ProgramPriority.HIGH,
                status: ProgramStatus.PUBLISHED,
                startDate: new Date("2026-10-01"),
                endDate: new Date("2026-12-30"),
                instructions: "Inspect and assist all zonal education offices",
                requiredAction: "Conduct zonal workshops and monitor submission",
                createdBy: "user-amhara-1",
                createdOrganizationId: "reg-amhara",
                parentProgramId: "prog-nat-1",
                targetLevelAll: true,
                targetLevels: ["ZONE", "WOREDA", "SCHOOL"],
                cascadeDescendants: true
            });
            (prisma.programImplementation.createMany as any).mockResolvedValue({ count: 4 });
            (prisma.programImplementation.findUnique as any).mockResolvedValue({
                id: "imp-amhara-parent",
                programId: "prog-nat-1",
                organizationId: "reg-amhara",
                status: ProgramImplementationStatus.PENDING
            });
            (prisma.programImplementation.update as any).mockResolvedValue({ id: "imp-amhara-parent", status: ProgramImplementationStatus.IN_PROGRESS });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-5" });

            const result = await ProgramService.createAndPublishProgram(
                {
                    name: "Amhara Regional Implementation: School Improvement 2026",
                    description: "Regional adaptation and execution plan",
                    objective: "Deploy regional inspectors and distribute assessment rubrics",
                    startDate: "2026-10-01",
                    endDate: "2026-12-30",
                    instructions: "Inspect and assist all zonal education offices",
                    requiredAction: "Conduct zonal workshops and monitor submission",
                    parentProgramId: "prog-nat-1",
                    targetLevelAll: true,
                    targetLevels: ["ZONE", "WOREDA", "SCHOOL"]
                },
                amharaActor,
                "user-amhara-1"
            );

            expect(result).toBeDefined();
            expect(result.parentProgramId).toBe("prog-nat-1");
            expect(prisma.programImplementation.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: ProgramImplementationStatus.IN_PROGRESS
                    })
                })
            );
        });
    });

    describe("3. Recipient Delivery, Acknowledgment & Status Updates", () => {
        it("7 & 8. Recipient receives program and unrelated organizations cannot see cross-branch programs", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);
            // Tabor School lists received programs
            (prisma.program.findMany as any).mockResolvedValue([
                {
                    id: "prog-nat-1",
                    name: "National School Improvement Program 2026",
                    createdOrganizationId: "fed-1",
                    createdOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" },
                    creator: { id: "u-1", name: "Federal Admin", email: "fed@moe.gov.et" },
                    targetLevels: ["REGION", "ZONE", "WOREDA", "SCHOOL"],
                    targetLevelAll: true,
                    targetOrganizationUnits: [],
                    cascadeDescendants: true,
                    implementations: [
                        {
                            id: "imp-tabor-1",
                            programId: "prog-nat-1",
                            organizationId: "school-tabor-sec",
                            status: ProgramImplementationStatus.PENDING,
                            isAcknowledged: false,
                            acknowledgedByUser: null
                        }
                    ]
                }
            ]);

            const received = await ProgramService.getProgramsForScope(taborSchoolActor, { tab: "received" });

            expect(received).toHaveLength(1);
            expect(received[0].name).toBe("National School Improvement Program 2026");
            expect(received[0].userImplementation?.organizationId).toBe("school-tabor-sec");
        });

        it("10. School can acknowledge program and update implementation status to IN_PROGRESS and COMPLETED", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);
            (prisma.program.findUnique as any).mockResolvedValue({
                id: "prog-nat-1",
                name: "National School Improvement Program 2026",
                createdOrganizationId: "fed-1",
                createdOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" },
                targetLevelAll: true,
                targetLevels: [],
                targetOrganizationUnits: [],
                cascadeDescendants: true
            });
            (prisma.programImplementation.upsert as any).mockResolvedValue({
                id: "imp-tabor-1",
                programId: "prog-nat-1",
                organizationId: "school-tabor-sec",
                isAcknowledged: true,
                acknowledgedAt: new Date(),
                acknowledgedByUserId: "user-principal-1",
                status: ProgramImplementationStatus.ACKNOWLEDGED,
                notes: "Received and scheduled for staff briefing."
            });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-ack-1" });

            // Acknowledge
            const ackResult = await ProgramService.acknowledgeProgram(
                "prog-nat-1",
                taborSchoolActor,
                "user-principal-1",
                "Received and scheduled for staff briefing."
            );

            expect(ackResult.isAcknowledged).toBe(true);
            expect(ackResult.status).toBe(ProgramImplementationStatus.ACKNOWLEDGED);
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "PROGRAM_ACKNOWLEDGED",
                        organizationId: "school-tabor-sec"
                    })
                })
            );

            // Update to IN_PROGRESS
            (prisma.programImplementation.findUnique as any).mockResolvedValue({
                id: "imp-tabor-1",
                programId: "prog-nat-1",
                organizationId: "school-tabor-sec",
                status: ProgramImplementationStatus.ACKNOWLEDGED
            });
            (prisma.programImplementation.upsert as any).mockResolvedValue({
                id: "imp-tabor-1",
                programId: "prog-nat-1",
                organizationId: "school-tabor-sec",
                status: ProgramImplementationStatus.IN_PROGRESS,
                notes: "School assessment survey underway.",
                startedAt: new Date()
            });

            const inProgressResult = await ProgramService.updateImplementationStatus(
                "prog-nat-1",
                taborSchoolActor,
                "user-principal-1",
                {
                    status: ProgramImplementationStatus.IN_PROGRESS,
                    notes: "School assessment survey underway."
                }
            );

            expect(inProgressResult.status).toBe(ProgramImplementationStatus.IN_PROGRESS);

            // Update to COMPLETED
            (prisma.programImplementation.upsert as any).mockResolvedValue({
                id: "imp-tabor-1",
                programId: "prog-nat-1",
                organizationId: "school-tabor-sec",
                status: ProgramImplementationStatus.COMPLETED,
                notes: "All assessment rubrics uploaded and verified.",
                completedAt: new Date()
            });

            const completedResult = await ProgramService.updateImplementationStatus(
                "prog-nat-1",
                taborSchoolActor,
                "user-principal-1",
                {
                    status: ProgramImplementationStatus.COMPLETED,
                    notes: "All assessment rubrics uploaded and verified."
                }
            );

            expect(completedResult.status).toBe(ProgramImplementationStatus.COMPLETED);
        });

        it("11. Program targeted from Federal to specific School is isolated and only visible to that specific school", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);

            const targetedSchoolProgram = {
                id: "prog-targeted-school-1",
                name: "Specific School Pilot 2026",
                createdOrganizationId: "fed-1",
                createdOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" },
                creator: { id: "u-1", name: "Federal Admin", email: "fed@moe.gov.et" },
                targetLevels: ["SCHOOL"],
                targetLevelAll: false,
                targetOrganizationUnits: [{ organizationId: "school-tabor-sec" }],
                cascadeDescendants: false,
                implementations: []
            };

            (prisma.program.findMany as any).mockResolvedValue([targetedSchoolProgram]);

            // Tabor School (targeted) checks received programs
            const taborReceived = await ProgramService.getProgramsForScope(taborSchoolActor, { tab: "received" });
            expect(taborReceived).toHaveLength(1);
            expect(taborReceived[0].id).toBe("prog-targeted-school-1");

            // Gondar Elementary School (not targeted) checks received programs
            const gondarElemActor = { id: "school-gondar-elem", type: "SCHOOL" as OrganizationUnitType, name: "Gondar Elementary School" };
            const gondarReceived = await ProgramService.getProgramsForScope(gondarElemActor, { tab: "received" });
            expect(gondarReceived).toHaveLength(0);
        });

        it("12. Program targeted from Federal to Amhara Region is received strictly by Amhara Region and does NOT leak to its Zones, Woredas, or Schools", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);

            const regionTargetedProgram = {
                id: "prog-targeted-region-1",
                name: "Amhara Regional Literacy Capacity 2026",
                createdOrganizationId: "fed-1",
                createdOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" },
                creator: { id: "u-1", name: "Federal Admin", email: "fed@moe.gov.et" },
                targetLevels: ["REGION"],
                targetLevelAll: false,
                targetOrganizationUnits: [{ organizationId: "reg-amhara" }],
                cascadeDescendants: false,
                implementations: []
            };

            (prisma.program.findMany as any).mockResolvedValue([regionTargetedProgram]);

            // Amhara Region (targeted) checks received programs
            const amharaReceived = await ProgramService.getProgramsForScope(amharaActor, { tab: "received" });
            expect(amharaReceived).toHaveLength(1);
            expect(amharaReceived[0].id).toBe("prog-targeted-region-1");

            // South Gondar Zone under Amhara (not targeted tier) checks received programs
            const gondarReceived = await ProgramService.getProgramsForScope(gondarZoneActor, { tab: "received" });
            expect(gondarReceived).toHaveLength(0);

            // Debre Tabor Woreda under Gondar (not targeted tier) checks received programs
            const taborWoredaReceived = await ProgramService.getProgramsForScope(taborWoredaActor, { tab: "received" });
            expect(taborWoredaReceived).toHaveLength(0);

            // Tabor School under Debre Tabor (not targeted tier) checks received programs
            const taborSchoolReceived = await ProgramService.getProgramsForScope(taborSchoolActor, { tab: "received" });
            expect(taborSchoolReceived).toHaveLength(0);
        });

        it("6. Recipient cannot modify original program status as if they owned it", async () => {
            (prisma.program.findUnique as any).mockResolvedValue({
                id: "prog-nat-1",
                name: "National School Improvement Program 2026",
                status: ProgramStatus.PUBLISHED,
                createdOrganizationId: "fed-1"
            });

            // School attempts to close/modify higher-level program
            await expect(
                ProgramService.updateProgramStatus(
                    "prog-nat-1",
                    taborSchoolActor,
                    "user-principal-1",
                    ProgramStatus.CLOSED
                )
            ).rejects.toThrow(/Only the issuing organization can change the program status/);
        });
    });
});
