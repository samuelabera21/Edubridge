import { describe, it, expect, vi, beforeEach } from "vitest";
import { HierarchyService } from "./hierarchy.service.js";
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
        studentEnrollment: {
            count: vi.fn()
        },
        teacher: {
            count: vi.fn()
        },
        academicYear: {
            count: vi.fn()
        },
        schoolProfile: {
            findUnique: vi.fn()
        }
    }
}));

describe("HierarchyService (H1 Organization Hierarchy Integrity)", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe("1. VALID Hierarchy Combinations", () => {
        it("should allow FEDERAL with no parent", async () => {
            const result = await HierarchyService.validateParentRelationship("FEDERAL", null);
            expect(result).toBeNull();
        });

        it("should allow REGION under FEDERAL", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "fed-1",
                name: "Federal Ministry",
                type: "FEDERAL"
            });

            const parent = await HierarchyService.validateParentRelationship("REGION", "fed-1");
            expect(parent).toBeDefined();
            expect(parent?.type).toBe("FEDERAL");
        });

        it("should allow ZONE under REGION", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "reg-1",
                name: "Addis Ababa Region",
                type: "REGION"
            });

            const parent = await HierarchyService.validateParentRelationship("ZONE", "reg-1");
            expect(parent?.type).toBe("REGION");
        });

        it("should allow WOREDA under ZONE", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "zone-1",
                name: "Central Zone",
                type: "ZONE"
            });

            const parent = await HierarchyService.validateParentRelationship("WOREDA", "zone-1");
            expect(parent?.type).toBe("ZONE");
        });

        it("should allow SCHOOL under WOREDA", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "wor-1",
                name: "Kirkos Woreda",
                type: "WOREDA"
            });

            const parent = await HierarchyService.validateParentRelationship("SCHOOL", "wor-1");
            expect(parent?.type).toBe("WOREDA");
        });

        it("should create a valid organization unit", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "wor-1",
                name: "Kirkos Woreda",
                type: "WOREDA"
            });
            (prisma.organizationUnit.create as any).mockResolvedValue({
                id: "sch-1",
                name: "Bole High School",
                type: "SCHOOL",
                parentId: "wor-1",
                parent: { id: "wor-1", name: "Kirkos Woreda", type: "WOREDA" }
            });

            const created = await HierarchyService.createOrganizationUnit({
                name: "Bole High School",
                type: "SCHOOL",
                parentId: "wor-1"
            });

            expect(created.id).toBe("sch-1");
            expect(created.type).toBe("SCHOOL");
            expect(prisma.organizationUnit.create).toHaveBeenCalled();
        });

        it("should retrieve valid ancestors chain up to Federal root", async () => {
            // Mock chain: School -> Woreda -> Zone -> Region -> Federal
            (prisma.organizationUnit.findUnique as any)
                .mockResolvedValueOnce({ id: "sch-1", name: "Demo School", type: "SCHOOL", parentId: "wor-1" })
                .mockResolvedValueOnce({ id: "wor-1", name: "Kirkos Woreda", type: "WOREDA", parentId: "zone-1" })
                .mockResolvedValueOnce({ id: "zone-1", name: "Central Zone", type: "ZONE", parentId: "reg-1" })
                .mockResolvedValueOnce({ id: "reg-1", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" })
                .mockResolvedValueOnce({ id: "fed-1", name: "National Platform", type: "FEDERAL", parentId: null });

            const ancestors = await HierarchyService.getAncestors("sch-1");

            expect(ancestors).toHaveLength(4);
            expect(ancestors.map(a => a.type)).toEqual(["WOREDA", "ZONE", "REGION", "FEDERAL"]);
        });

        it("should retrieve direct children of a parent unit", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "reg-1",
                name: "Addis Ababa Region",
                type: "REGION"
            });
            (prisma.organizationUnit.findMany as any).mockResolvedValue([
                { id: "zone-1", name: "Central Zone", type: "ZONE", parentId: "reg-1" },
                { id: "zone-2", name: "Eastern Zone", type: "ZONE", parentId: "reg-1" }
            ]);

            const children = await HierarchyService.getChildren("reg-1");

            expect(children).toHaveLength(2);
            expect(prisma.organizationUnit.findMany).toHaveBeenCalledWith({
                where: { parentId: "reg-1" },
                include: { schoolProfile: true, _count: { select: { children: true } } },
                orderBy: { name: "asc" }
            });
        });

        it("should retrieve full nested hierarchy tree", async () => {
            (prisma.organizationUnit.findMany as any)
                .mockResolvedValueOnce([
                    { id: "fed-1", name: "National", type: "FEDERAL", parentId: null, createdAt: new Date(), updatedAt: new Date() }
                ])
                .mockResolvedValueOnce([
                    { id: "fed-1", name: "National", type: "FEDERAL", parentId: null, createdAt: new Date(), updatedAt: new Date() },
                    { id: "reg-1", name: "Addis Ababa", type: "REGION", parentId: "fed-1", createdAt: new Date(), updatedAt: new Date() },
                    { id: "zone-1", name: "Central", type: "ZONE", parentId: "reg-1", createdAt: new Date(), updatedAt: new Date() },
                    { id: "wor-1", name: "Kirkos", type: "WOREDA", parentId: "zone-1", createdAt: new Date(), updatedAt: new Date() },
                    { id: "sch-1", name: "Demo School", type: "SCHOOL", parentId: "wor-1", createdAt: new Date(), updatedAt: new Date() }
                ]);

            const tree = await HierarchyService.getHierarchyTree();

            expect(tree).toHaveLength(1);
            expect(tree[0]!.id).toBe("fed-1");
            expect(tree[0]!.children[0]!.id).toBe("reg-1");
            expect(tree[0]!.children[0]!.children[0]!.id).toBe("zone-1");
            expect(tree[0]!.children[0]!.children[0]!.children[0]!.id).toBe("wor-1");
            expect(tree[0]!.children[0]!.children[0]!.children[0]!.children[0]!.id).toBe("sch-1");
        });
    });

    describe("2. INVALID Hierarchy Combinations", () => {
        it("should reject FEDERAL with a parent", async () => {
            await expect(
                HierarchyService.validateParentRelationship("FEDERAL", "some-parent")
            ).rejects.toThrow("FEDERAL organization unit must not have a parent");
        });

        it("should reject REGION without a parent", async () => {
            await expect(
                HierarchyService.validateParentRelationship("REGION", null)
            ).rejects.toThrow("REGION organization unit must have a parent of type FEDERAL");
        });

        it("should reject ZONE without a parent", async () => {
            await expect(
                HierarchyService.validateParentRelationship("ZONE", null)
            ).rejects.toThrow("ZONE organization unit must have a parent of type REGION");
        });

        it("should reject WOREDA without a parent", async () => {
            await expect(
                HierarchyService.validateParentRelationship("WOREDA", null)
            ).rejects.toThrow("WOREDA organization unit must have a parent of type ZONE");
        });

        it("should reject SCHOOL without a parent", async () => {
            await expect(
                HierarchyService.validateParentRelationship("SCHOOL", null)
            ).rejects.toThrow("SCHOOL organization unit must have a parent of type WOREDA");
        });

        it("should reject ZONE directly under ZONE", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "zone-1",
                name: "Parent Zone",
                type: "ZONE"
            });

            await expect(
                HierarchyService.validateParentRelationship("ZONE", "zone-1")
            ).rejects.toThrow("ZONE must have a parent of type REGION, but parent 'Parent Zone' is of type ZONE");
        });

        it("should reject WOREDA directly under REGION", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "reg-1",
                name: "Addis Ababa Region",
                type: "REGION"
            });

            await expect(
                HierarchyService.validateParentRelationship("WOREDA", "reg-1")
            ).rejects.toThrow("WOREDA must have a parent of type ZONE, but parent 'Addis Ababa Region' is of type REGION");
        });

        it("should reject SCHOOL directly under REGION", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "reg-1",
                name: "Addis Ababa Region",
                type: "REGION"
            });

            await expect(
                HierarchyService.validateParentRelationship("SCHOOL", "reg-1")
            ).rejects.toThrow("SCHOOL must have a parent of type WOREDA, but parent 'Addis Ababa Region' is of type REGION");
        });

        it("should reject SCHOOL directly under FEDERAL", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "fed-1",
                name: "Federal Platform",
                type: "FEDERAL"
            });

            await expect(
                HierarchyService.validateParentRelationship("SCHOOL", "fed-1")
            ).rejects.toThrow("SCHOOL must have a parent of type WOREDA, but parent 'Federal Platform' is of type FEDERAL");
        });

        it("should reject self-parenting", async () => {
            await expect(
                HierarchyService.validateParentRelationship("ZONE", "zone-1", "zone-1")
            ).rejects.toThrow("An organization unit cannot be its own parent");
        });

        it("should reject nonexistent parent", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue(null);

            await expect(
                HierarchyService.validateParentRelationship("REGION", "nonexistent-id")
            ).rejects.toThrow("Parent organization unit with ID 'nonexistent-id' does not exist");
        });

        it("should reject direct circular relationship when moving/updating unit", async () => {
            // Target unit: reg-1. We attempt to set its parent to fed-1.
            // But fed-1's parent is reg-1 -> circular!
            (prisma.organizationUnit.findUnique as any)
                .mockResolvedValueOnce({ id: "fed-1", name: "Federal", type: "FEDERAL", parentId: "reg-1" });

            await expect(
                HierarchyService.validateParentRelationship("REGION", "fed-1", "reg-1")
            ).rejects.toThrow("Circular parent relationship detected");
        });

        it("should reject multi-node circular relationship", async () => {
            // A -> B -> C -> A
            (prisma.organizationUnit.findUnique as any)
                .mockResolvedValueOnce({ id: "node-c", name: "Node C", type: "REGION", parentId: "node-b" })
                .mockResolvedValueOnce({ id: "node-b", name: "Node B", type: "FEDERAL", parentId: "node-a" });

            await expect(
                HierarchyService.validateParentRelationship("ZONE", "node-c", "node-a")
            ).rejects.toThrow("Circular parent relationship detected");
        });

        it("should reject deleting an organization that has children", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "wor-1",
                name: "Kirkos Woreda",
                type: "WOREDA"
            });
            (prisma.organizationUnit.count as any).mockResolvedValue(3);

            await expect(
                HierarchyService.deleteOrganizationUnit("wor-1")
            ).rejects.toThrow("Cannot delete organization unit 'Kirkos Woreda' because it has 3 child organization(s)");
        });

        it("should reject deleting a school with existing enrollments or teachers", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "sch-1",
                name: "Active Demo School",
                type: "SCHOOL"
            });
            (prisma.organizationUnit.count as any).mockResolvedValue(0); // No child orgs
            (prisma.studentEnrollment.count as any).mockResolvedValue(150);
            (prisma.teacher.count as any).mockResolvedValue(12);
            (prisma.academicYear.count as any).mockResolvedValue(1);

            await expect(
                HierarchyService.deleteOrganizationUnit("sch-1")
            ).rejects.toThrow("Cannot delete organization unit 'Active Demo School' with existing educational domain records");
        });
    });

    describe("3. AUTHORIZATION Rules", () => {
        it("should reject SCHOOL_ADMIN from creating higher-level administrative units", async () => {
            const schoolActorScope = {
                id: "sch-1",
                type: "SCHOOL" as OrganizationUnitType,
                name: "Demo School"
            };

            await expect(
                HierarchyService.createOrganizationUnit(
                    { name: "New Woreda", type: "WOREDA", parentId: "zone-1" },
                    schoolActorScope
                )
            ).rejects.toThrow("School administrators are not authorized to manage the organizational hierarchy");
        });

        it("should reject SCHOOL_ADMIN from deleting organization units", async () => {
            const schoolActorScope = {
                id: "sch-1",
                type: "SCHOOL" as OrganizationUnitType,
                name: "Demo School"
            };

            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "wor-1",
                name: "Kirkos Woreda",
                type: "WOREDA"
            });

            await expect(
                HierarchyService.deleteOrganizationUnit("wor-1", schoolActorScope)
            ).rejects.toThrow("School administrators are not authorized to delete organizational hierarchy units");
        });

        it("should reject regional admin from creating unit under an unrelated region", async () => {
            const regionActorScope = {
                id: "reg-oromia",
                type: "REGION" as OrganizationUnitType,
                name: "Oromia Region"
            };

            // Attempting to create a zone under Addis Ababa region
            (prisma.organizationUnit.findUnique as any)
                .mockResolvedValueOnce({ id: "reg-addis", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" })
                .mockResolvedValueOnce({ id: "fed-1", name: "National Platform", type: "FEDERAL", parentId: null });

            await expect(
                HierarchyService.createOrganizationUnit(
                    { name: "Central Zone", type: "ZONE", parentId: "reg-addis" },
                    regionActorScope
                )
            ).rejects.toThrow("Cannot create organization unit outside your administrative scope (Oromia Region)");
        });
    });

    describe("4. REGRESSION Guarantees", () => {
        it("should preserve existing school organization unit lookup without mutation", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "existing-school-id",
                name: "EduBridge Demo School",
                type: "SCHOOL",
                parentId: "woreda-id",
                schoolProfile: {
                    id: "profile-1",
                    organizationId: "existing-school-id",
                    status: "ACTIVE"
                },
                _count: {
                    children: 0,
                    studentEnrollments: 250,
                    teachers: 18
                }
            });

            const school = await HierarchyService.getOrganizationUnit("existing-school-id");

            expect(school.id).toBe("existing-school-id");
            expect(school.type).toBe("SCHOOL");
            expect(school.schoolProfile).toBeDefined();
            expect(school._count.studentEnrollments).toBe(250);
        });

        it("should allow safe update of organization name without modifying parentId or domain records", async () => {
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "sch-1",
                name: "Old School Name",
                type: "SCHOOL",
                parentId: "wor-1"
            });
            (prisma.organizationUnit.update as any).mockResolvedValue({
                id: "sch-1",
                name: "Renamed School",
                type: "SCHOOL",
                parentId: "wor-1"
            });

            const updated = await HierarchyService.updateOrganizationUnit("sch-1", {
                name: "Renamed School"
            });

            expect(updated.name).toBe("Renamed School");
            expect(prisma.organizationUnit.update).toHaveBeenCalledWith({
                where: { id: "sch-1" },
                data: { name: "Renamed School" },
                include: { parent: true }
            });
        });
    });
});
