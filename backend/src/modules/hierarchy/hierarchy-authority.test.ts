import { describe, it, expect, vi, beforeEach } from "vitest";
import { HierarchyService } from "./hierarchy.service.js";
import { HierarchyScopeService } from "./hierarchy-scope.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";
import * as authService from "../authentication/authorization.service.js";

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
        roleAssignment: {
            findFirst: vi.fn(),
            create: vi.fn(),
            delete: vi.fn()
        },
        user: {
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        },
        verification: {
            create: vi.fn(),
            deleteMany: vi.fn()
        }
    }
}));

vi.mock("../authentication/authorization.service.js", () => ({
    assignRoleToUserByScopeId: vi.fn()
}));

describe("H5: Administrative Hierarchy Authority & School Registration", () => {
    // Standard Hierarchy Mock
    // FEDERAL (fed-1)
    //   ├── REGION A (reg-a)
    //   │     └── ZONE A1 (zone-a1)
    //   │           └── WOREDA A1 (wor-a1)
    //   │                 └── SCHOOL A1 (sch-a1)
    //   └── REGION B (reg-b)
    //         └── ZONE B1 (zone-b1)
    //               └── WOREDA B1 (wor-b1)
    //                     └── SCHOOL B1 (sch-b1)

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
        (prisma.organizationUnit.findUnique as any).mockImplementation(({ where }: { where: { id: string } }) => {
            const found = mockHierarchyUnits.find(u => u.id === where.id);
            return Promise.resolve(found ? { ...found, parent: mockHierarchyUnits.find(p => p.id === found.parentId) || null } : null);
        });
    });

    describe("1. Hierarchy Creation Authority (Tier-by-Tier)", () => {
        it("1.1 Federal Admin can create a Region under Federal root", async () => {
            const federalScope = { id: "fed-1", type: "FEDERAL" as OrganizationUnitType, name: "Federal Ministry" };
            const createdRegion = { id: "reg-c", name: "Amhara Region", type: "REGION", parentId: "fed-1" };
            (prisma.organizationUnit.create as any).mockResolvedValue(createdRegion);

            const result = await HierarchyService.createOrganizationUnit(
                { name: "Amhara Region", type: "REGION", parentId: "fed-1" },
                federalScope,
                "user-fed-1",
                "127.0.0.1"
            );

            expect(result.name).toBe("Amhara Region");
            expect(result.type).toBe("REGION");
            expect(prisma.organizationUnit.create).toHaveBeenCalledWith({
                data: {
                    name: "Amhara Region",
                    type: "REGION",
                    parentId: "fed-1"
                },
                include: { parent: true }
            });
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "HIERARCHY_UNIT_CREATED",
                        organizationId: "reg-c"
                    })
                })
            );
        });

        it("1.2 Region Admin can create a Zone within its authorized Region", async () => {
            const regionScope = { id: "reg-a", type: "REGION" as OrganizationUnitType, name: "Addis Ababa Region" };
            const createdZone = { id: "zone-a2", name: "Bole Zone", type: "ZONE", parentId: "reg-a" };
            (prisma.organizationUnit.create as any).mockResolvedValue(createdZone);

            const result = await HierarchyService.createOrganizationUnit(
                { name: "Bole Zone", type: "ZONE", parentId: "reg-a" },
                regionScope,
                "user-reg-a"
            );

            expect(result.id).toBe("zone-a2");
            expect(prisma.organizationUnit.create).toHaveBeenCalled();
        });

        it("1.3 Region Admin CANNOT create a Zone under a different Region (cross-scope rejection)", async () => {
            const regionScope = { id: "reg-a", type: "REGION" as OrganizationUnitType, name: "Addis Ababa Region" };

            await expect(
                HierarchyService.createOrganizationUnit(
                    { name: "Jimma Zone", type: "ZONE", parentId: "reg-b" }, // reg-b is Oromia
                    regionScope,
                    "user-reg-a"
                )
            ).rejects.toThrow(/Forbidden.*outside your administrative scope/i);
        });

        it("1.4 Region Admin CANNOT directly create invalid child types (e.g., WOREDA or REGION under REGION)", async () => {
            const regionScope = { id: "reg-a", type: "REGION" as OrganizationUnitType, name: "Addis Ababa Region" };

            await expect(
                HierarchyService.createOrganizationUnit(
                    { name: "Direct Woreda", type: "WOREDA", parentId: "reg-a" },
                    regionScope,
                    "user-reg-a"
                )
            ).rejects.toThrow(/Forbidden.*can only create ZONE units/i);
        });

        it("1.5 Zone Admin can create a Woreda within its authorized Zone", async () => {
            const zoneScope = { id: "zone-a1", type: "ZONE" as OrganizationUnitType, name: "Central Zone" };
            const createdWoreda = { id: "wor-a2", name: "Arada Woreda", type: "WOREDA", parentId: "zone-a1" };
            (prisma.organizationUnit.create as any).mockResolvedValue(createdWoreda);

            const result = await HierarchyService.createOrganizationUnit(
                { name: "Arada Woreda", type: "WOREDA", parentId: "zone-a1" },
                zoneScope,
                "user-zone-a1"
            );

            expect(result.id).toBe("wor-a2");
        });

        it("1.6 Zone Admin CANNOT create a Woreda in a different Zone (cross-scope rejection)", async () => {
            const zoneScope = { id: "zone-a1", type: "ZONE" as OrganizationUnitType, name: "Central Zone" };

            await expect(
                HierarchyService.createOrganizationUnit(
                    { name: "Ada'a North Woreda", type: "WOREDA", parentId: "zone-b1" }, // zone-b1 is East Shewa
                    zoneScope,
                    "user-zone-a1"
                )
            ).rejects.toThrow(/Forbidden.*outside your administrative scope/i);
        });

        it("1.7 School Admin / Principal CANNOT create any hierarchy units", async () => {
            const schoolScope = { id: "sch-a1", type: "SCHOOL" as OrganizationUnitType, name: "EduBridge Demo School" };

            await expect(
                HierarchyService.createOrganizationUnit(
                    { name: "Sub-school", type: "SCHOOL", parentId: "wor-a1" },
                    schoolScope,
                    "user-sch-a1"
                )
            ).rejects.toThrow(/Forbidden: School administrators are not authorized to manage the organizational hierarchy/i);
        });
    });

    describe("2. Controlled School Registration Workflow (Woreda -> School)", () => {
        it("2.1 Woreda Admin can register a School in their authorized Woreda", async () => {
            const woredaScope = { id: "wor-a1", type: "WOREDA" as OrganizationUnitType, name: "Kirkos Woreda" };
            const registeredSchoolUnit = {
                id: "sch-a2",
                name: "Kirkos Comprehensive Secondary",
                type: "SCHOOL",
                parentId: "wor-a1",
                parent: { id: "wor-a1", name: "Kirkos Woreda", type: "WOREDA" }
            };
            const mockSchoolProfile = {
                id: "prof-1",
                organizationId: "sch-a2",
                contactEmail: "admin@kirkos.edu.et",
                phoneNumber: "+251911223344",
                address: "Kirkos Subcity, Addis Ababa",
                establishedYear: 2010,
                status: "ACTIVE"
            };

            (prisma.organizationUnit.create as any).mockResolvedValue(registeredSchoolUnit);
            (prisma.schoolProfile.upsert as any).mockResolvedValue(mockSchoolProfile);
            (authService.assignRoleToUserByScopeId as any).mockResolvedValue({ id: "role-1", role: "SCHOOL_ADMIN" });

            const result = await HierarchyService.registerSchool(
                {
                    name: "Kirkos Comprehensive Secondary",
                    woredaId: "wor-a1",
                    contactEmail: "admin@kirkos.edu.et",
                    phoneNumber: "+251911223344",
                    address: "Kirkos Subcity, Addis Ababa",
                    establishedYear: 2010,
                    adminUserId: "user-principal-1"
                },
                woredaScope,
                "user-woreda-admin",
                "192.168.1.10"
            );

            expect(result.id).toBe("sch-a2");
            expect(result.type).toBe("SCHOOL");
            expect(result.parentId).toBe("wor-a1");
            expect(result.schoolProfile).toEqual(mockSchoolProfile);

            // Verify SchoolProfile initialization
            expect(prisma.schoolProfile.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { organizationId: "sch-a2" },
                    create: expect.objectContaining({
                        organizationId: "sch-a2",
                        contactEmail: "admin@kirkos.edu.et",
                        status: "ACTIVE"
                    })
                })
            );

            // Verify School Admin role provisioning
            expect(authService.assignRoleToUserByScopeId).toHaveBeenCalledWith(
                "user-principal-1",
                "SCHOOL_ADMIN",
                "sch-a2"
            );

            // Verify Audit Log
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "SCHOOL_REGISTRATION",
                        organizationId: "sch-a2",
                        resource: "ORGANIZATION_UNIT"
                    })
                })
            );
        });

        it("2.2 Woreda Admin CANNOT register a School in a different Woreda (cross-woreda rejection)", async () => {
            const woredaScope = { id: "wor-a1", type: "WOREDA" as OrganizationUnitType, name: "Kirkos Woreda" };

            await expect(
                HierarchyService.registerSchool(
                    {
                        name: "Ada'a International Academy",
                        woredaId: "wor-b1" // wor-b1 is in Oromia / Ada'a
                    },
                    woredaScope,
                    "user-woreda-a1"
                )
            ).rejects.toThrow(/Forbidden.*outside your administrative scope/i);
        });

        it("2.3 Registering school under a non-WOREDA parent is rejected", async () => {
            const regionScope = { id: "reg-a", type: "REGION" as OrganizationUnitType, name: "Addis Ababa Region" };

            await expect(
                HierarchyService.registerSchool(
                    {
                        name: "Invalid Placement School",
                        woredaId: "zone-a1" // Target is ZONE, not WOREDA
                    },
                    regionScope,
                    "user-reg-a"
                )
            ).rejects.toThrow(/Schools must be registered under a Woreda/i);
        });

        it("2.4 School Admin CANNOT register schools", async () => {
            const schoolScope = { id: "sch-a1", type: "SCHOOL" as OrganizationUnitType, name: "EduBridge Demo School" };

            await expect(
                HierarchyService.registerSchool(
                    {
                        name: "Unauthorized School",
                        woredaId: "wor-a1"
                    },
                    schoolScope,
                    "user-principal-1"
                )
            ).rejects.toThrow(/Forbidden: School administrators are not authorized to register schools/i);
        });
    });

    describe("3. School Admin Hierarchy Protection & Placement Immutability", () => {
        it("3.1 School Admin CANNOT update organization parentId / placement", async () => {
            const schoolScope = { id: "sch-a1", type: "SCHOOL" as OrganizationUnitType, name: "EduBridge Demo School" };

            await expect(
                HierarchyService.updateOrganizationUnit(
                    "sch-a1",
                    { parentId: "wor-b1" },
                    schoolScope
                )
            ).rejects.toThrow(/Forbidden: School administrators are not authorized to modify the organizational hierarchy/i);
        });

        it("3.2 School Admin CANNOT move school using assignSchoolPlacement", async () => {
            const schoolScope = { id: "sch-a1", type: "SCHOOL" as OrganizationUnitType, name: "EduBridge Demo School" };

            await expect(
                HierarchyService.assignSchoolPlacement(
                    "sch-a1",
                    "wor-b1",
                    schoolScope,
                    "user-principal-1"
                )
            ).rejects.toThrow(/Forbidden: School administrators are not authorized to manage or place schools/i);
        });

        it("3.3 School Admin CANNOT delete organization unit", async () => {
            const schoolScope = { id: "sch-a1", type: "SCHOOL" as OrganizationUnitType, name: "EduBridge Demo School" };

            await expect(
                HierarchyService.deleteOrganizationUnit(
                    "sch-a1",
                    schoolScope
                )
            ).rejects.toThrow(/Forbidden: School administrators are not authorized to delete organizational hierarchy units/i);
        });
    });

    describe("4. Regional Administrator Assignment & Invitation Lifecycle", () => {
        it("4.1 Federal Admin can assign and invite a Regional Administrator", async () => {
            const federalScope = { id: "fed-1", type: "FEDERAL" as OrganizationUnitType, name: "Federal Ministry" };
            (prisma.user.findUnique as any).mockResolvedValue(null);
            (prisma.user.create as any).mockResolvedValue({
                id: "usr-reg-1",
                name: "Samuel Example",
                email: "samuel@example.com",
                emailVerified: false,
                requiresPasswordChange: true,
                isActive: true
            });
            (authService.assignRoleToUserByScopeId as any).mockResolvedValue({
                id: "assign-1",
                userId: "usr-reg-1",
                roleId: "role-admin",
                scopeId: "reg-a",
                createdAt: new Date("2026-09-23")
            });

            const result = await HierarchyService.assignRegionalAdmin(
                "reg-a",
                { name: "Samuel Example", email: "samuel@example.com" },
                federalScope,
                "user-fed-1"
            );

            expect(result.name).toBe("Samuel Example");
            expect(result.email).toBe("samuel@example.com");
            expect(result.status).toBe("INVITATION_PENDING");
            expect(result.roleName).toBe("Regional Administrator");
            expect(authService.assignRoleToUserByScopeId).toHaveBeenCalledWith("usr-reg-1", "ADMIN", "reg-a");
            expect(prisma.verification.create).toHaveBeenCalled();
            expect(prisma.auditLog.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        action: "ADMIN_INVITATION_SENT",
                        organizationId: "reg-a"
                    })
                })
            );
        });

        it("4.2 Non-Federal Admin CANNOT assign a Regional Administrator", async () => {
            const regionScope = { id: "reg-a", type: "REGION" as OrganizationUnitType, name: "Addis Ababa Region" };

            await expect(
                HierarchyService.assignRegionalAdmin(
                    "reg-a",
                    { name: "Unauthorized User", email: "unauth@example.com" },
                    regionScope,
                    "user-reg-a"
                )
            ).rejects.toThrow(/Forbidden: Only Federal Administrators can assign Regional Administrators/i);
        });

        it("4.3 Federal Admin can resend invitation", async () => {
            const federalScope = { id: "fed-1", type: "FEDERAL" as OrganizationUnitType, name: "Federal Ministry" };
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "reg-a",
                name: "Addis Ababa Region",
                type: "REGION",
                assignments: [
                    {
                        id: "assign-1",
                        role: { name: "ADMIN" },
                        user: { id: "usr-reg-1", email: "samuel@example.com" }
                    }
                ]
            });

            const result = await HierarchyService.resendRegionalAdminInvitation(
                "reg-a",
                federalScope,
                "user-fed-1"
            );

            expect(result.success).toBe(true);
            expect(prisma.verification.create).toHaveBeenCalled();
        });

        it("4.4 Federal Admin can cancel invitation", async () => {
            const federalScope = { id: "fed-1", type: "FEDERAL" as OrganizationUnitType, name: "Federal Ministry" };
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "reg-a",
                name: "Addis Ababa Region",
                type: "REGION",
                assignments: [
                    {
                        id: "assign-1",
                        role: { name: "ADMIN" },
                        user: { id: "usr-reg-1", email: "samuel@example.com" }
                    }
                ]
            });

            const result = await HierarchyService.cancelRegionalAdminInvitation(
                "reg-a",
                federalScope,
                "user-fed-1"
            );

            expect(result.success).toBe(true);
            expect(prisma.roleAssignment.delete).toHaveBeenCalledWith({ where: { id: "assign-1" } });
        });
    });
});
