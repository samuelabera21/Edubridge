import { describe, it, expect, vi, beforeEach } from "vitest";
import { HierarchyService } from "./hierarchy.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        organizationUnit: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
            count: vi.fn()
        },
        studentEnrollment: {
            count: vi.fn()
        },
        teacher: {
            count: vi.fn()
        },
        schoolProfile: {
            findUnique: vi.fn()
        }
    }
}));

describe("Hierarchy Drill-Down (Federal -> Region -> Zone -> Woreda -> School)", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    const mockUnits = [
        { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" as OrganizationUnitType, parentId: null },
        { id: "reg-1", name: "Amhara Region", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "reg-2", name: "Oromia Region", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-1", name: "South Gondar Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-1" },
        { id: "woreda-1", name: "Debre Tabor Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-1" },
        { id: "school-1", name: "Tabor Secondary School", type: "SCHOOL" as OrganizationUnitType, parentId: "woreda-1" },
        { id: "school-2", name: "Gondar Elementary School", type: "SCHOOL" as OrganizationUnitType, parentId: "woreda-1" }
    ];

    describe("1. Federal Root Drill-Down", () => {
        it("should return Federal summary with all Regions and aggregated metrics", async () => {
            (prisma.organizationUnit.findFirst as any).mockResolvedValue({
                id: "fed-1",
                name: "Federal Ministry of Education",
                type: "FEDERAL",
                assignments: []
            });

            (prisma.organizationUnit.findMany as any).mockImplementation((args: any) => {
                if (args?.where?.type === "REGION") {
                    return Promise.resolve([
                        { id: "reg-1", name: "Amhara Region", type: "REGION", parentId: "fed-1", assignments: [] },
                        { id: "reg-2", name: "Oromia Region", type: "REGION", parentId: "fed-1", assignments: [] }
                    ]);
                }
                return Promise.resolve(mockUnits);
            });

            (prisma.studentEnrollment.count as any).mockResolvedValue(1250);
            (prisma.teacher.count as any).mockResolvedValue(45);

            const result: any = await HierarchyService.getHierarchyDrilldown();

            expect(result).toBeDefined();
            expect(result.node.type).toBe("FEDERAL");
            expect(result.node.name).toBe("Federal Ministry of Education");
            expect(result.breadcrumbs).toHaveLength(1);
            expect(result.breadcrumbs[0].name).toBe("Federal Ministry of Education");
            expect(result.children).toHaveLength(2);

            const amhara = result.children.find((c: any) => c.id === "reg-1");
            expect(amhara).toBeDefined();
            expect(amhara?.name).toBe("Amhara Region");
            expect(amhara?.zonesCount).toBe(1);
            expect(amhara?.woredasCount).toBe(1);
            expect(amhara?.schoolsCount).toBe(2);
            expect(amhara?.studentsCount).toBe(1250);
            expect(amhara?.teachersCount).toBe(45);
        });
    });

    describe("2. Region Level Drill-Down", () => {
        it("should return Region details and all Zones under that Region", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "reg-1",
                name: "Amhara Region",
                type: "REGION",
                parentId: "fed-1",
                parent: { id: "fed-1", name: "Federal Ministry of Education" },
                assignments: []
            });

            (prisma.organizationUnit.findMany as any).mockImplementation((args: any) => {
                if (args?.where?.type === "ZONE") {
                    return Promise.resolve([
                        { id: "zone-1", name: "South Gondar Zone", type: "ZONE", parentId: "reg-1", assignments: [] }
                    ]);
                }
                return Promise.resolve(mockUnits);
            });

            (prisma.studentEnrollment.count as any).mockResolvedValue(800);
            (prisma.teacher.count as any).mockResolvedValue(30);

            const result: any = await HierarchyService.getHierarchyDrilldown("reg-1");

            expect(result).toBeDefined();
            expect(result.node.id).toBe("reg-1");
            expect(result.node.type).toBe("REGION");
            expect(result.breadcrumbs).toHaveLength(2);
            expect(result.breadcrumbs[0].type).toBe("FEDERAL");
            expect(result.breadcrumbs[1].type).toBe("REGION");
            expect(result.children).toHaveLength(1);

            const zone = result.children[0];
            expect(zone.id).toBe("zone-1");
            expect(zone.name).toBe("South Gondar Zone");
            expect(zone.woredasCount).toBe(1);
            expect(zone.schoolsCount).toBe(2);
            expect(zone.studentsCount).toBe(800);
            expect(zone.teachersCount).toBe(30);
        });
    });

    describe("3. Zone Level Drill-Down", () => {
        it("should return Zone details and all Woredas under that Zone", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "zone-1",
                name: "South Gondar Zone",
                type: "ZONE",
                parentId: "reg-1",
                parent: { id: "reg-1", name: "Amhara Region" },
                assignments: []
            });

            (prisma.organizationUnit.findMany as any).mockImplementation((args: any) => {
                if (args?.where?.type === "WOREDA") {
                    return Promise.resolve([
                        { id: "woreda-1", name: "Debre Tabor Woreda", type: "WOREDA", parentId: "zone-1", assignments: [] }
                    ]);
                }
                return Promise.resolve(mockUnits);
            });

            (prisma.studentEnrollment.count as any).mockResolvedValue(550);
            (prisma.teacher.count as any).mockResolvedValue(22);

            const result: any = await HierarchyService.getHierarchyDrilldown("zone-1");

            expect(result).toBeDefined();
            expect(result.node.id).toBe("zone-1");
            expect(result.node.type).toBe("ZONE");
            expect(result.breadcrumbs).toHaveLength(3);
            expect(result.breadcrumbs[2].name).toBe("South Gondar Zone");
            expect(result.children).toHaveLength(1);

            const woreda = result.children[0];
            expect(woreda.id).toBe("woreda-1");
            expect(woreda.name).toBe("Debre Tabor Woreda");
            expect(woreda.schoolsCount).toBe(2);
            expect(woreda.studentsCount).toBe(550);
            expect(woreda.teachersCount).toBe(22);
        });
    });

    describe("4. Woreda Level Drill-Down", () => {
        it("should return Woreda details and all Schools under that Woreda with summary info", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "woreda-1",
                name: "Debre Tabor Woreda",
                type: "WOREDA",
                parentId: "zone-1",
                parent: { id: "zone-1", name: "South Gondar Zone" },
                assignments: []
            });

            (prisma.organizationUnit.findMany as any).mockImplementation((args: any) => {
                if (args?.where?.type === "SCHOOL") {
                    return Promise.resolve([
                        {
                            id: "school-1",
                            name: "Tabor Secondary School",
                            type: "SCHOOL",
                            parentId: "woreda-1",
                            schoolProfile: {
                                address: "Kebele 02",
                                phoneNumber: "+251581234567",
                                contactEmail: "tabor@school.edu.et",
                                establishedYear: 1985,
                                status: "ACTIVE"
                            },
                            assignments: [],
                            _count: { studentEnrollments: 300, teachers: 12 }
                        },
                        {
                            id: "school-2",
                            name: "Gondar Elementary School",
                            type: "SCHOOL",
                            parentId: "woreda-1",
                            schoolProfile: {
                                address: "Kebele 05",
                                phoneNumber: "+251587654321",
                                contactEmail: "elementary@school.edu.et",
                                establishedYear: 2002,
                                status: "ACTIVE"
                            },
                            assignments: [],
                            _count: { studentEnrollments: 250, teachers: 10 }
                        }
                    ]);
                }
                return Promise.resolve(mockUnits);
            });

            const result: any = await HierarchyService.getHierarchyDrilldown("woreda-1");

            expect(result).toBeDefined();
            expect(result.node.id).toBe("woreda-1");
            expect(result.node.type).toBe("WOREDA");
            expect(result.counts.schoolsCount).toBe(2);
            expect(result.counts.studentsCount).toBe(550);
            expect(result.counts.teachersCount).toBe(22);
            expect(result.breadcrumbs).toHaveLength(4);
            expect(result.children).toHaveLength(2);

            const school = result.children[0];
            expect(school.id).toBe("school-1");
            expect(school.name).toBe("Tabor Secondary School");
            expect(school.studentsCount).toBe(300);
            expect(school.teachersCount).toBe(12);
            expect(school.schoolProfile?.address).toBe("Kebele 02");
            expect(school.schoolProfile?.establishedYear).toBe(1985);
        });
    });

    describe("5. School Level Drill-Down (Leaf Node)", () => {
        it("should return full School summary and empty children list", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "school-1",
                name: "Tabor Secondary School",
                type: "SCHOOL",
                parentId: "woreda-1",
                parent: { id: "woreda-1", name: "Debre Tabor Woreda" },
                schoolProfile: {
                    address: "Kebele 02, Tabor Main Road",
                    phoneNumber: "+251581234567",
                    contactEmail: "info@tabor.edu.et",
                    establishedYear: 1985,
                    status: "ACTIVE"
                },
                assignments: []
            });

            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockUnits);
            (prisma.studentEnrollment.count as any).mockResolvedValue(300);
            (prisma.teacher.count as any).mockResolvedValue(12);

            const result: any = await HierarchyService.getHierarchyDrilldown("school-1");

            expect(result).toBeDefined();
            expect(result.node.id).toBe("school-1");
            expect(result.node.type).toBe("SCHOOL");
            expect(result.counts.studentsCount).toBe(300);
            expect(result.counts.teachersCount).toBe(12);
            expect(result.schoolProfile?.address).toBe("Kebele 02, Tabor Main Road");
            expect(result.schoolProfile?.establishedYear).toBe(1985);
            expect(result.breadcrumbs).toHaveLength(5);
            expect(result.breadcrumbs.map((b: any) => b.type)).toEqual(["FEDERAL", "REGION", "ZONE", "WOREDA", "SCHOOL"]);
            expect(result.children).toHaveLength(0);
        });
    });

    describe("6. Scope & Authority Validation", () => {
        it("should reject non-Federal user attempting to drilldown into unauthorized units", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "reg-2",
                name: "Oromia Region",
                type: "REGION",
                parentId: "fed-1",
                assignments: []
            });
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockUnits);

            const amharaScope = { id: "reg-1", type: "REGION" as OrganizationUnitType, name: "Amhara Region" };

            await expect(
                HierarchyService.getHierarchyDrilldown("reg-2", amharaScope)
            ).rejects.toThrow(/Forbidden/);
        });

        it("should allow Federal administrator to drilldown into any national unit", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "school-1",
                name: "Tabor Secondary School",
                type: "SCHOOL",
                parentId: "woreda-1",
                parent: { id: "woreda-1", name: "Debre Tabor Woreda" },
                schoolProfile: null,
                assignments: []
            });
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockUnits);
            (prisma.studentEnrollment.count as any).mockResolvedValue(300);
            (prisma.teacher.count as any).mockResolvedValue(12);

            const federalScope = { id: "fed-1", type: "FEDERAL" as OrganizationUnitType, name: "Federal Ministry of Education" };

            const result: any = await HierarchyService.getHierarchyDrilldown("school-1", federalScope);
            expect(result).toBeDefined();
            expect(result.node.id).toBe("school-1");
        });
    });
});
