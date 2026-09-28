import { describe, it, expect, vi, beforeEach } from "vitest";
import { HierarchyScopeService, AccessibleOrganizationScope } from "./hierarchy-scope.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";
import { requireHierarchicalScope } from "../authentication/authorization.middleware.js";
import { auth } from "../authentication/auth.js";
import { Request, Response, NextFunction } from "express";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        organizationUnit: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
        },
        roleAssignment: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
        },
    },
}));

vi.mock("../authentication/auth.js", () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        },
    },
}));

vi.mock("better-auth/node", () => ({
    fromNodeHeaders: vi.fn(),
}));

describe("HierarchyScopeService (H2 Hierarchical Scope & Descendant Data Access)", () => {
    // Standard 2-branch national test hierarchy fixture:
    //
    // FEDERAL (fed-1)
    //  ├── REGION A (reg-a)
    //  │    └── ZONE A1 (zone-a1)
    //  │         └── WOREDA A1a (wor-a1a)
    //  │              ├── SCHOOL A1a-1 (sch-a1a1)
    //  │              └── SCHOOL A1a-2 (sch-a1a2)
    //  │         └── WOREDA A1b (wor-a1b) [empty, no schools]
    //  └── REGION B (reg-b)
    //       └── ZONE B1 (zone-b1)
    //            └── WOREDA B1a (wor-b1a)
    //                 └── SCHOOL B1a-1 (sch-b1a1)
    const mockAllUnits = [
        { id: "fed-1", name: "Federal Ministry", type: "FEDERAL" as OrganizationUnitType, parentId: null },
        { id: "reg-a", name: "Region A (Addis Ababa)", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-a1", name: "Zone A1 (Central)", type: "ZONE" as OrganizationUnitType, parentId: "reg-a" },
        { id: "wor-a1a", name: "Woreda A1a (Kirkos)", type: "WOREDA" as OrganizationUnitType, parentId: "zone-a1" },
        { id: "sch-a1a1", name: "School A1a-1 (Primary)", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1a" },
        { id: "sch-a1a2", name: "School A1a-2 (Secondary)", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1a" },
        { id: "wor-a1b", name: "Woreda A1b (Empty)", type: "WOREDA" as OrganizationUnitType, parentId: "zone-a1" },
        { id: "reg-b", name: "Region B (Oromia)", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-b1", name: "Zone B1 (East)", type: "ZONE" as OrganizationUnitType, parentId: "reg-b" },
        { id: "wor-b1a", name: "Woreda B1a (Ada'a)", type: "WOREDA" as OrganizationUnitType, parentId: "zone-b1" },
        { id: "sch-b1a1", name: "School B1a-1 (Bishoftu)", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-b1a" },
    ];

    beforeEach(() => {
        vi.resetAllMocks();
        (prisma.organizationUnit.findMany as any).mockResolvedValue(mockAllUnits);
    });

    describe("1. Descendant School Resolution", () => {
        it("1.1 FEDERAL: should return all descendant schools across the national hierarchy", async () => {
            const schools = await HierarchyScopeService.getDescendantSchoolIds("fed-1");
            expect(schools).toHaveLength(3);
            expect(schools).toEqual(expect.arrayContaining(["sch-a1a1", "sch-a1a2", "sch-b1a1"]));
        });

        it("1.2 REGION: should return only schools beneath Region A", async () => {
            const schools = await HierarchyScopeService.getDescendantSchoolIds("reg-a");
            expect(schools).toHaveLength(2);
            expect(schools).toEqual(expect.arrayContaining(["sch-a1a1", "sch-a1a2"]));
            expect(schools).not.toContain("sch-b1a1");
        });

        it("1.3 ZONE: should return only schools beneath Zone A1", async () => {
            const schools = await HierarchyScopeService.getDescendantSchoolIds("zone-a1");
            expect(schools).toHaveLength(2);
            expect(schools).toEqual(expect.arrayContaining(["sch-a1a1", "sch-a1a2"]));
            expect(schools).not.toContain("sch-b1a1");
        });

        it("1.4 WOREDA: should return only schools beneath Woreda A1a", async () => {
            const schools = await HierarchyScopeService.getDescendantSchoolIds("wor-a1a");
            expect(schools).toHaveLength(2);
            expect(schools).toEqual(["sch-a1a1", "sch-a1a2"]);
        });

        it("1.5 SCHOOL: should return [that school] only", async () => {
            const schools = await HierarchyScopeService.getDescendantSchoolIds("sch-a1a1", "SCHOOL");
            expect(schools).toEqual(["sch-a1a1"]);
        });

        it("1.6 EMPTY SCOPE: should return [] for an administrative unit with no descendant schools", async () => {
            const schools = await HierarchyScopeService.getDescendantSchoolIds("wor-a1b");
            expect(schools).toEqual([]);
        });

        it("1.7 Nonexistent Organization: should return [] without throwing", async () => {
            const schools = await HierarchyScopeService.getDescendantSchoolIds("nonexistent-org");
            expect(schools).toEqual([]);
        });
    });

    describe("2. Cross-Branch Isolation & Scope Checking", () => {
        it("2.1 Region A cannot access Region B schools or sub-units", async () => {
            const isSelf = await HierarchyScopeService.isOrganizationInScope("reg-a", "reg-a");
            const isChild = await HierarchyScopeService.isOrganizationInScope("reg-a", "sch-a1a1");
            const isCrossRegionSchool = await HierarchyScopeService.isOrganizationInScope("reg-a", "sch-b1a1");
            const isCrossRegion = await HierarchyScopeService.isOrganizationInScope("reg-a", "reg-b");

            expect(isSelf).toBe(true);
            expect(isChild).toBe(true);
            expect(isCrossRegionSchool).toBe(false);
            expect(isCrossRegion).toBe(false);
        });

        it("2.2 Zone A1 cannot access Zone B1 schools", async () => {
            const isAllowed = await HierarchyScopeService.isOrganizationInScope("zone-a1", "sch-a1a1");
            const isForbidden = await HierarchyScopeService.isOrganizationInScope("zone-a1", "sch-b1a1");

            expect(isAllowed).toBe(true);
            expect(isForbidden).toBe(false);
        });

        it("2.3 Woreda A1a cannot access Woreda B1a schools", async () => {
            const isAllowed = await HierarchyScopeService.isOrganizationInScope("wor-a1a", "sch-a1a2");
            const isForbidden = await HierarchyScopeService.isOrganizationInScope("wor-a1a", "sch-b1a1");

            expect(isAllowed).toBe(true);
            expect(isForbidden).toBe(false);
        });

        it("2.4 School A1a-1 cannot access School A1a-2 or School B1a-1", async () => {
            const isSelf = await HierarchyScopeService.isOrganizationInScope("sch-a1a1", "sch-a1a1");
            const isSibling = await HierarchyScopeService.isOrganizationInScope("sch-a1a1", "sch-a1a2");
            const isForeign = await HierarchyScopeService.isOrganizationInScope("sch-a1a1", "sch-b1a1");

            expect(isSelf).toBe(true);
            expect(isSibling).toBe(false);
            expect(isForeign).toBe(false);
        });
    });

    describe("3. Lineage / Ancestor Resolution", () => {
        it("3.1 should resolve exact ordered lineage from School up to Federal", async () => {
            const lineage = await HierarchyScopeService.getLineage("sch-a1a1");

            expect(lineage).toHaveLength(5);
            expect(lineage[0]!.id).toBe("sch-a1a1");
            expect(lineage[0]!.type).toBe("SCHOOL");
            expect(lineage[1]!.id).toBe("wor-a1a");
            expect(lineage[1]!.type).toBe("WOREDA");
            expect(lineage[2]!.id).toBe("zone-a1");
            expect(lineage[2]!.type).toBe("ZONE");
            expect(lineage[3]!.id).toBe("reg-a");
            expect(lineage[3]!.type).toBe("REGION");
            expect(lineage[4]!.id).toBe("fed-1");
            expect(lineage[4]!.type).toBe("FEDERAL");
        });

        it("3.2 should resolve lineage for Region up to Federal", async () => {
            const lineage = await HierarchyScopeService.getLineage("reg-b");

            expect(lineage).toHaveLength(2);
            expect(lineage[0]!.id).toBe("reg-b");
            expect(lineage[1]!.id).toBe("fed-1");
        });

        it("3.3 should resolve lineage for Federal root as [self]", async () => {
            const lineage = await HierarchyScopeService.getLineage("fed-1");

            expect(lineage).toHaveLength(1);
            expect(lineage[0]!.id).toBe("fed-1");
        });
    });

    describe("4. Authenticated User Scope Resolution", () => {
        it("4.1 should resolve full scope for a Regional Admin user", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    id: "ra-reg-1",
                    userId: "user-reg-a",
                    scopeId: "reg-a",
                    scope: { id: "reg-a", name: "Region A (Addis Ababa)", type: "REGION", parentId: "fed-1" },
                    role: { name: "REGION_ADMIN" }
                }
            ]);

            const scope: AccessibleOrganizationScope = await HierarchyScopeService.getAccessibleOrganizationScope("user-reg-a");

            expect(scope.userId).toBe("user-reg-a");
            expect(scope.currentOrganizationId).toBe("reg-a");
            expect(scope.currentOrganizationType).toBe("REGION");
            expect(scope.accessibleOrganizationIds).toEqual(
                expect.arrayContaining(["reg-a", "zone-a1", "wor-a1a", "sch-a1a1", "sch-a1a2", "wor-a1b"])
            );
            expect(scope.accessibleOrganizationIds).not.toContain("reg-b");
            expect(scope.descendantSchoolIds).toEqual(expect.arrayContaining(["sch-a1a1", "sch-a1a2"]));
            expect(scope.lineage.map(l => l.id)).toEqual(["reg-a", "fed-1"]);
        });

        it("4.2 should prioritize highest tier assignment if user has multiple roles", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    id: "ra-school",
                    userId: "user-multi",
                    scopeId: "sch-a1a1",
                    scope: { id: "sch-a1a1", name: "School A1a-1", type: "SCHOOL", parentId: "wor-a1a" },
                    role: { name: "TEACHER" }
                },
                {
                    id: "ra-federal",
                    userId: "user-multi",
                    scopeId: "fed-1",
                    scope: { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null },
                    role: { name: "FEDERAL_ADMIN" }
                }
            ]);

            const scope = await HierarchyScopeService.getAccessibleOrganizationScope("user-multi");

            expect(scope.currentOrganizationId).toBe("fed-1");
            expect(scope.currentOrganizationType).toBe("FEDERAL");
            expect(scope.descendantSchoolIds).toEqual(expect.arrayContaining(["sch-a1a1", "sch-a1a2", "sch-b1a1"]));
        });

        it("4.3 should throw error if user has no role assignments", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([]);

            await expect(
                HierarchyScopeService.getAccessibleOrganizationScope("user-unassigned")
            ).rejects.toThrow("No authorized organizational scope found for user");
        });
    });

    describe("5. Hierarchical Authorization Middleware (requireHierarchicalScope)", () => {
        let mockReq: Partial<Request>;
        let mockRes: Partial<Response>;
        let nextFunction: NextFunction;

        beforeEach(() => {
            mockReq = {
                headers: {},
                params: {},
                body: {},
                query: {},
            };
            mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };
            nextFunction = vi.fn();
        });

        it("5.1 should allow access when target school is within user's regional subtree", async () => {
            (auth.api.getSession as any).mockResolvedValue({ user: { id: "user-reg-a" } });
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    id: "ra-1",
                    userId: "user-reg-a",
                    scopeId: "reg-a",
                    scope: { id: "reg-a", name: "Region A", type: "REGION", parentId: "fed-1" },
                    role: { name: "REGION_ADMIN" }
                }
            ]);

            mockReq.params = { schoolId: "sch-a1a1" };

            const middleware = requireHierarchicalScope("schoolId");
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
            expect((mockReq as any).accessScope.id).toBe("reg-a");
            expect((mockReq as any).hierarchicalScope.descendantSchoolIds).toContain("sch-a1a1");
        });

        it("5.2 should reject with 403 when target school belongs to another region", async () => {
            (auth.api.getSession as any).mockResolvedValue({ user: { id: "user-reg-a" } });
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    id: "ra-1",
                    userId: "user-reg-a",
                    scopeId: "reg-a",
                    scope: { id: "reg-a", name: "Region A", type: "REGION", parentId: "fed-1" },
                    role: { name: "REGION_ADMIN" }
                }
            ]);

            mockReq.params = { schoolId: "sch-b1a1" }; // School in Region B!

            const middleware = requireHierarchicalScope("schoolId");
            await middleware(mockReq as Request, mockRes as Response, nextFunction);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining("Target organization is outside your authorized hierarchy scope")
                })
            );
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });
});
