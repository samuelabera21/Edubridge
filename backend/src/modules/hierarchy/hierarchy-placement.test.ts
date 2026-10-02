import { describe, it, expect, vi, beforeEach } from "vitest";
import { HierarchyService } from "./hierarchy.service.js";
import { HierarchyScopeService } from "./hierarchy-scope.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        organizationUnit: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            count: vi.fn()
        },
        schoolProfile: {
            upsert: vi.fn(),
            findUnique: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        },
        studentEnrollment: {
            count: vi.fn()
        },
        teacher: {
            count: vi.fn()
        },
        academicYear: {
            count: vi.fn()
        }
    }
}));

describe("H4: Hierarchy School Placement & Administrative Lineage", () => {
    // 2-Branch National Hierarchy Fixture
    //
    // FEDERAL (fed-1)
    //  ├── REGION A (reg-a)
    //  │    └── ZONE A1 (zone-a1)
    //  │         └── WOREDA A1 (wor-a1)
    //  │              └── SCHOOL A1 (sch-a1)
    //  └── REGION B (reg-b)
    //       └── ZONE B1 (zone-b1)
    //            └── WOREDA B1 (wor-b1)
    //                 └── SCHOOL B1 (sch-b1)

    const mockHierarchyUnits = [
        { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" as OrganizationUnitType, parentId: null },
        { id: "reg-a", name: "Addis Ababa Region", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-a1", name: "Central Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-a" },
        { id: "wor-a1", name: "Kirkos Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-a1" },
        { id: "sch-a1", name: "EduBridge Demo School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1" },

        { id: "reg-b", name: "Oromia Region", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-b1", name: "East Shewa Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-b" },
        { id: "wor-b1", name: "Ada'a Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-b1" },
        { id: "sch-b1", name: "Bishoftu High School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-b1" },
    ];

    beforeEach(() => {
        vi.resetAllMocks();
        (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchyUnits);
    });

    describe("1. Hierarchy Lineage Resolution (H4 Canonical Chain)", () => {
        it("1.1 Resolves complete lineage: School -> Woreda -> Zone -> Region -> Federal", async () => {
            const lineage = await HierarchyScopeService.getLineage("sch-a1");
            expect(lineage).toHaveLength(5);
            expect(lineage.map((u) => u.id)).toEqual(["sch-a1", "wor-a1", "zone-a1", "reg-a", "fed-1"]);
            expect(lineage.map((u) => u.type)).toEqual(["SCHOOL", "WOREDA", "ZONE", "REGION", "FEDERAL"]);
        });

        it("1.2 Resolves lineage for Woreda: Woreda -> Zone -> Region -> Federal", async () => {
            const lineage = await HierarchyScopeService.getLineage("wor-a1");
            expect(lineage).toHaveLength(4);
            expect(lineage.map((u) => u.id)).toEqual(["wor-a1", "zone-a1", "reg-a", "fed-1"]);
        });

        it("1.3 Resolves lineage for Federal root", async () => {
            const lineage = await HierarchyScopeService.getLineage("fed-1");
            expect(lineage).toHaveLength(1);
            expect(lineage[0]?.id).toBe("fed-1");
        });
    });

    describe("2. School Placement Validation & Type Safety", () => {
        it("2.1 Successfully places an unassigned or existing school under a valid Woreda", async () => {
            const mockSchool = {
                id: "sch-new",
                name: "New Bole Secondary School",
                type: "SCHOOL" as OrganizationUnitType,
                parentId: null,
                parent: null,
                schoolProfile: null
            };
            const mockWoreda = {
                id: "wor-a1",
                name: "Kirkos Woreda",
                type: "WOREDA" as OrganizationUnitType,
                parentId: "zone-a1"
            };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "sch-new") return Promise.resolve(mockSchool);
                if (where.id === "wor-a1") return Promise.resolve(mockWoreda);
                return Promise.resolve(null);
            });

            (prisma.organizationUnit.update as any).mockResolvedValue({
                ...mockSchool,
                parentId: "wor-a1",
                parent: mockWoreda
            });

            const result = await HierarchyService.assignSchoolPlacement(
                "sch-new",
                "wor-a1",
                { id: "fed-1", type: "FEDERAL", name: "Federal Ministry" },
                "user-admin-1"
            );

            expect(result.parentId).toBe("wor-a1");
            expect(prisma.organizationUnit.update).toHaveBeenCalledWith({
                where: { id: "sch-new" },
                data: { parentId: "wor-a1" },
                include: { parent: true, schoolProfile: true }
            });
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "HIERARCHY_SCHOOL_PLACEMENT",
                        resource: "ORGANIZATION_UNIT",
                        resourceId: "sch-new"
                    })
                })
            );
        });

        it("2.2 Rejects placement if target parent is NOT a Woreda", async () => {
            const mockSchool = {
                id: "sch-a1",
                name: "EduBridge Demo School",
                type: "SCHOOL" as OrganizationUnitType,
                parentId: null
            };
            const mockRegion = {
                id: "reg-a",
                name: "Addis Ababa Region",
                type: "REGION" as OrganizationUnitType,
                parentId: "fed-1"
            };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "sch-a1") return Promise.resolve(mockSchool);
                if (where.id === "reg-a") return Promise.resolve(mockRegion);
                return Promise.resolve(null);
            });

            await expect(
                HierarchyService.assignSchoolPlacement("sch-a1", "reg-a", { id: "fed-1", type: "FEDERAL", name: "Federal" })
            ).rejects.toThrow("Schools must be placed directly under a Woreda");
        });

        it("2.3 Rejects placement if target child is NOT a SCHOOL", async () => {
            const mockZone = {
                id: "zone-a1",
                name: "Central Zone",
                type: "ZONE" as OrganizationUnitType,
                parentId: "reg-a"
            };
            const mockWoreda = {
                id: "wor-a1",
                name: "Kirkos Woreda",
                type: "WOREDA" as OrganizationUnitType,
                parentId: "zone-a1"
            };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "zone-a1") return Promise.resolve(mockZone);
                if (where.id === "wor-a1") return Promise.resolve(mockWoreda);
                return Promise.resolve(null);
            });

            await expect(
                HierarchyService.assignSchoolPlacement("zone-a1", "wor-a1", { id: "fed-1", type: "FEDERAL", name: "Federal" })
            ).rejects.toThrow("Only schools can be assigned to a Woreda");
        });
    });

    describe("3. Hierarchical Scope & Authorization (H4 Security)", () => {
        it("3.1 School Admin is forbidden from modifying school placement", async () => {
            const schoolAdminScope = { id: "sch-a1", type: "SCHOOL" as OrganizationUnitType, name: "EduBridge Demo School" };

            const mockSchool = { id: "sch-a1", name: "EduBridge Demo School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1" };
            const mockWoreda = { id: "wor-a1", name: "Kirkos Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-a1" };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "sch-a1") return Promise.resolve(mockSchool);
                if (where.id === "wor-a1") return Promise.resolve(mockWoreda);
                return Promise.resolve(null);
            });

            await expect(
                HierarchyService.assignSchoolPlacement("sch-a1", "wor-a1", schoolAdminScope)
            ).rejects.toThrow("School administrators are not authorized to manage or place schools");
        });

        it("3.2 Regional Administrator can manage schools within their Region", async () => {
            const regionScope = { id: "reg-a", type: "REGION" as OrganizationUnitType, name: "Addis Ababa Region" };

            const mockSchool = { id: "sch-a1", name: "EduBridge Demo School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1" };
            const mockWoreda = { id: "wor-a1", name: "Kirkos Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-a1" };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "sch-a1") return Promise.resolve(mockSchool);
                if (where.id === "wor-a1") return Promise.resolve(mockWoreda);
                return Promise.resolve(null);
            });

            (prisma.organizationUnit.update as any).mockResolvedValue({
                ...mockSchool,
                parentId: "wor-a1",
                parent: mockWoreda
            });

            const result = await HierarchyService.assignSchoolPlacement("sch-a1", "wor-a1", regionScope);
            expect(result).toBeDefined();
            expect(result.parentId).toBe("wor-a1");
        });

        it("3.3 Regional Administrator CANNOT place school under a Woreda in another Region", async () => {
            const regionScope = { id: "reg-a", type: "REGION" as OrganizationUnitType, name: "Addis Ababa Region" };

            const mockSchool = { id: "sch-a1", name: "EduBridge Demo School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1" };
            const targetWoredaInRegionB = { id: "wor-b1", name: "Ada'a Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-b1" };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "sch-a1") return Promise.resolve(mockSchool);
                if (where.id === "wor-b1") return Promise.resolve(targetWoredaInRegionB);
                return Promise.resolve(null);
            });

            await expect(
                HierarchyService.assignSchoolPlacement("sch-a1", "wor-b1", regionScope)
            ).rejects.toThrow("Forbidden: Target Woreda 'Ada'a Woreda' is outside your authorized administrative scope");
        });

        it("3.4 Zonal Administrator can place schools inside their Zone", async () => {
            const zoneScope = { id: "zone-a1", type: "ZONE" as OrganizationUnitType, name: "Central Zone" };

            const mockSchool = { id: "sch-a1", name: "EduBridge Demo School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1" };
            const mockWoreda = { id: "wor-a1", name: "Kirkos Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-a1" };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "sch-a1") return Promise.resolve(mockSchool);
                if (where.id === "wor-a1") return Promise.resolve(mockWoreda);
                return Promise.resolve(null);
            });

            (prisma.organizationUnit.update as any).mockResolvedValue({
                ...mockSchool,
                parentId: "wor-a1",
                parent: mockWoreda
            });

            const result = await HierarchyService.assignSchoolPlacement("sch-a1", "wor-a1", zoneScope);
            expect(result).toBeDefined();
            expect(result.parentId).toBe("wor-a1");
        });

        it("3.5 Zonal Administrator CANNOT place schools into another Zone", async () => {
            const zoneScope = { id: "zone-a1", type: "ZONE" as OrganizationUnitType, name: "Central Zone" };

            const mockSchool = { id: "sch-a1", name: "EduBridge Demo School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1" };
            const targetWoredaInZoneB = { id: "wor-b1", name: "Ada'a Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-b1" };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "sch-a1") return Promise.resolve(mockSchool);
                if (where.id === "wor-b1") return Promise.resolve(targetWoredaInZoneB);
                return Promise.resolve(null);
            });

            await expect(
                HierarchyService.assignSchoolPlacement("sch-a1", "wor-b1", zoneScope)
            ).rejects.toThrow("Forbidden: Target Woreda 'Ada'a Woreda' is outside your authorized administrative scope");
        });

        it("3.6 Woreda Administrator can place schools in their own Woreda", async () => {
            const woredaScope = { id: "wor-a1", type: "WOREDA" as OrganizationUnitType, name: "Kirkos Woreda" };

            const mockSchool = { id: "sch-a1", name: "EduBridge Demo School", type: "SCHOOL" as OrganizationUnitType, parentId: null };
            const mockWoreda = { id: "wor-a1", name: "Kirkos Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-a1" };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "sch-a1") return Promise.resolve(mockSchool);
                if (where.id === "wor-a1") return Promise.resolve(mockWoreda);
                return Promise.resolve(null);
            });

            (prisma.organizationUnit.update as any).mockResolvedValue({
                ...mockSchool,
                parentId: "wor-a1",
                parent: mockWoreda
            });

            const result = await HierarchyService.assignSchoolPlacement("sch-a1", "wor-a1", woredaScope);
            expect(result).toBeDefined();
            expect(result.parentId).toBe("wor-a1");
        });
    });

    describe("4. Data Integrity & Domain Tenancy", () => {
        it("4.1 Reassignment preserves all school-scoped domain ownership under the School OrganizationUnit ID", async () => {
            // When school sch-a1 is moved, its ID remains sch-a1.
            // Students, teachers, and academic records remain linked to organizationId = sch-a1.
            const mockSchool = {
                id: "sch-a1",
                name: "EduBridge Demo School",
                type: "SCHOOL" as OrganizationUnitType,
                parentId: "wor-a1",
                schoolProfile: { organizationId: "sch-a1", status: "ACTIVE" }
            };
            const mockNewWoreda = {
                id: "wor-a1",
                name: "Kirkos Woreda",
                type: "WOREDA" as OrganizationUnitType,
                parentId: "zone-a1"
            };

            (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: any) => {
                if (where.id === "sch-a1") return Promise.resolve(mockSchool);
                if (where.id === "wor-a1") return Promise.resolve(mockNewWoreda);
                return Promise.resolve(null);
            });

            (prisma.organizationUnit.update as any).mockResolvedValue({
                ...mockSchool,
                parentId: "wor-a1"
            });

            const placed = await HierarchyService.assignSchoolPlacement("sch-a1", "wor-a1", null);
            expect(placed.id).toBe("sch-a1");
            expect(placed.parentId).toBe("wor-a1");
        });
    });
});
