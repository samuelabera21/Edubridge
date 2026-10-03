import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType, OrganizationUnit } from "../../generated/prisma/client.js";
import { HierarchyScopeService } from "./hierarchy-scope.service.js";
import { assignRoleToUserByScopeId } from "../authentication/authorization.service.js";
import { sendAdminInvitationEmail } from "../email/email.service.js";

export const ALLOWED_PARENT_TYPE: Record<OrganizationUnitType, OrganizationUnitType | null> = {
    FEDERAL: null,
    REGION: "FEDERAL",
    ZONE: "REGION",
    WOREDA: "ZONE",
    SCHOOL: "WOREDA"
};

export const ALLOWED_DIRECT_CHILD_TYPE: Record<OrganizationUnitType, OrganizationUnitType | null> = {
    FEDERAL: "REGION",
    REGION: "ZONE",
    ZONE: "WOREDA",
    WOREDA: "SCHOOL",
    SCHOOL: null
};

export interface HierarchyTreeNode {
    id: string;
    name: string;
    type: OrganizationUnitType;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    children: HierarchyTreeNode[];
}

export interface CreateOrganizationUnitInput {
    name: string;
    type: OrganizationUnitType;
    parentId?: string | null;
}

export interface RegisterSchoolInput {
    name: string;
    woredaId: string;
    contactEmail?: string;
    phoneNumber?: string;
    address?: string;
    establishedYear?: number;
    adminUserId?: string;
}

export interface UpdateOrganizationUnitInput {
    name?: string;
    parentId?: string | null;
}

export class HierarchyService {
    /**
     * Validates hierarchy rules for parent-child relationship.
     * Enforces:
     * - FEDERAL -> no parent
     * - REGION  -> FEDERAL only
     * - ZONE    -> REGION only
     * - WOREDA  -> ZONE only
     * - SCHOOL  -> WOREDA only
     * - No self-parenting
     * - No nonexistent parents
     * - No circular references
     */
    static async validateParentRelationship(
        type: OrganizationUnitType,
        parentId?: string | null,
        currentUnitId?: string
    ): Promise<OrganizationUnit | null> {
        const expectedParentType = ALLOWED_PARENT_TYPE[type];

        // 1. Root rule: FEDERAL must not have a parent
        if (type === "FEDERAL") {
            if (parentId) {
                throw new Error("Invalid hierarchy: FEDERAL organization unit must not have a parent.");
            }
            return null;
        }

        // 2. Non-root rule: REGION, ZONE, WOREDA, SCHOOL must have a parent
        if (!parentId) {
            throw new Error(`Invalid hierarchy: ${type} organization unit must have a parent of type ${expectedParentType}.`);
        }

        // 3. Self-parenting check
        if (currentUnitId && parentId === currentUnitId) {
            throw new Error("Invalid hierarchy: An organization unit cannot be its own parent.");
        }

        // 4. Verify parent exists
        const parent = await prisma.organizationUnit.findUnique({
            where: { id: parentId }
        });

        if (!parent) {
            throw new Error(`Invalid hierarchy: Parent organization unit with ID '${parentId}' does not exist.`);
        }

        // 5. Verify parent type compatibility
        if (parent.type !== expectedParentType) {
            throw new Error(
                `Invalid hierarchy: ${type} must have a parent of type ${expectedParentType}, but parent '${parent.name}' is of type ${parent.type}.`
            );
        }

        // 6. Circular reference check (if moving or updating an existing unit)
        if (currentUnitId) {
            let ancestor: OrganizationUnit | null = parent;
            const visited = new Set<string>([currentUnitId]);

            while (ancestor) {
                if (visited.has(ancestor.id)) {
                    throw new Error("Invalid hierarchy: Circular parent relationship detected.");
                }
                visited.add(ancestor.id);

                if (!ancestor.parentId) break;

                if (visited.has(ancestor.parentId)) {
                    throw new Error("Invalid hierarchy: Circular parent relationship detected.");
                }

                ancestor = await prisma.organizationUnit.findUnique({
                    where: { id: ancestor.parentId }
                });
            }
        }

        return parent;
    }

    /**
     * Creates a new OrganizationUnit with strict hierarchy validation and tier authority checks.
     * Enforces:
     * - FEDERAL -> can create REGION (or delegate within national hierarchy)
     * - REGION  -> can only create ZONE (under their authorized Region)
     * - ZONE    -> can only create WOREDA (under their authorized Zone)
     * - WOREDA  -> can only create SCHOOL (under their authorized Woreda)
     * - SCHOOL  -> forbidden from creating hierarchy
     */
    static async createOrganizationUnit(
        input: CreateOrganizationUnitInput,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        userId?: string,
        ipAddress?: string
    ) {
        if (!input.name || !input.name.trim()) {
            throw new Error("Organization name is required.");
        }

        if (!input.type || !Object.values(OrganizationUnitType).includes(input.type)) {
            throw new Error(`Invalid organization unit type: ${input.type}`);
        }

        // Authorization validation based on caller scope
        if (actorScope) {
            if (actorScope.type === "SCHOOL") {
                throw new Error("Forbidden: School administrators are not authorized to manage the organizational hierarchy.");
            }

            // Enforce tier-specific creation authority
            if (actorScope.type !== "FEDERAL") {
                const allowedDirectChild = ALLOWED_DIRECT_CHILD_TYPE[actorScope.type];
                
                // If caller is non-FEDERAL, ensure the new unit is created under caller's hierarchy subtree
                if (input.parentId) {
                    const isParentInScope = await HierarchyScopeService.isOrganizationInScope(actorScope.id, input.parentId);
                    if (!isParentInScope) {
                        throw new Error(`Forbidden: Cannot create organization unit outside your administrative scope (${actorScope.name}).`);
                    }
                }

                // If creating directly under caller's own unit, enforce exact child tier rule
                if (input.parentId === actorScope.id && input.type !== allowedDirectChild) {
                    throw new Error(
                        `Forbidden: Administrators of tier ${actorScope.type} can only create ${allowedDirectChild} units directly under their scope.`
                    );
                }
            }
        }

        await this.validateParentRelationship(input.type, input.parentId);

        const newUnit = await prisma.organizationUnit.create({
            data: {
                name: input.name.trim(),
                type: input.type,
                parentId: input.type === "FEDERAL" ? null : input.parentId
            },
            include: {
                parent: true
            }
        });

        if (newUnit.type === "SCHOOL" && prisma.schoolProfile?.upsert) {
            try {
                await prisma.schoolProfile.upsert({
                    where: { organizationId: newUnit.id },
                    update: {},
                    create: {
                        organizationId: newUnit.id,
                        status: "ACTIVE"
                    }
                });
            } catch (e) {
                // Ignore if profile already exists or in mock
            }
        }

        // Record Audit Log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: newUnit.id,
                    userId: userId || null,
                    action: "HIERARCHY_UNIT_CREATED",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: newUnit.id,
                    newValue: {
                        id: newUnit.id,
                        name: newUnit.name,
                        type: newUnit.type,
                        parentId: newUnit.parentId,
                        parentName: newUnit.parent?.name || null
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (auditErr) {
            console.warn("Failed to write audit log for hierarchy creation:", auditErr);
        }

        return newUnit;
    }

    /**
     * H5: Controlled School Registration Workflow
     * Registers a new School under an authorized Woreda, initializes SchoolProfile,
     * provisions/assigns the initial School Administrator role, and creates an audit log.
     */
    static async registerSchool(
        input: RegisterSchoolInput,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        userId?: string,
        ipAddress?: string
    ) {
        if (!input.name || !input.name.trim()) {
            throw new Error("School name is required.");
        }
        if (!input.woredaId) {
            throw new Error("Target Woreda ID is required.");
        }

        // 1. Verify target Woreda existence and type
        const targetWoreda = await prisma.organizationUnit.findUnique({
            where: { id: input.woredaId }
        });

        if (!targetWoreda) {
            throw new Error(`Target Woreda with ID '${input.woredaId}' not found.`);
        }

        if (targetWoreda.type !== "WOREDA") {
            throw new Error(
                `Invalid registration: Target organization unit '${targetWoreda.name}' is of type '${targetWoreda.type}', not 'WOREDA'. Schools must be registered under a Woreda.`
            );
        }

        // 2. Authorization validation (H2 Scope)
        if (actorScope) {
            if (actorScope.type === "SCHOOL") {
                throw new Error("Forbidden: School administrators are not authorized to register schools in the hierarchy.");
            }

            if (actorScope.type !== "FEDERAL") {
                const isTargetInScope = await HierarchyScopeService.isOrganizationInScope(actorScope.id, input.woredaId);
                if (!isTargetInScope) {
                    throw new Error(
                        `Forbidden: Cannot register school in Woreda '${targetWoreda.name}' outside your administrative scope (${actorScope.name}).`
                    );
                }
            }
        }

        // 3. Hierarchy relationship validation
        await this.validateParentRelationship("SCHOOL", input.woredaId);

        // 4. Create OrganizationUnit of type SCHOOL
        const schoolUnit = await prisma.organizationUnit.create({
            data: {
                name: input.name.trim(),
                type: "SCHOOL",
                parentId: input.woredaId
            },
            include: {
                parent: true
            }
        });

        // 5. Initialize SchoolProfile
        let schoolProfile = null;
        if (prisma.schoolProfile?.upsert) {
            try {
                schoolProfile = await prisma.schoolProfile.upsert({
                    where: { organizationId: schoolUnit.id },
                    update: {
                        contactEmail: input.contactEmail || null,
                        phoneNumber: input.phoneNumber || null,
                        address: input.address || null,
                        establishedYear: input.establishedYear || null,
                        status: "ACTIVE"
                    },
                    create: {
                        organizationId: schoolUnit.id,
                        contactEmail: input.contactEmail || null,
                        phoneNumber: input.phoneNumber || null,
                        address: input.address || null,
                        establishedYear: input.establishedYear || null,
                        status: "ACTIVE"
                    }
                });
            } catch (profileErr) {
                console.warn("Failed to create SchoolProfile during registration:", profileErr);
            }
        }

        // 6. Assign initial School Administrator role if adminUserId is provided
        let adminAssignment = null;
        if (input.adminUserId) {
            try {
                adminAssignment = await assignRoleToUserByScopeId(input.adminUserId, "SCHOOL_ADMIN", schoolUnit.id);
            } catch (assignErr) {
                console.warn("Failed to assign School Admin role during registration:", assignErr);
            }
        }

        // 7. Record Audit Log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: schoolUnit.id,
                    userId: userId || null,
                    action: "SCHOOL_REGISTRATION",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: schoolUnit.id,
                    newValue: {
                        schoolId: schoolUnit.id,
                        schoolName: schoolUnit.name,
                        woredaId: input.woredaId,
                        woredaName: targetWoreda.name,
                        contactEmail: input.contactEmail || null,
                        assignedAdminUserId: input.adminUserId || null
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (auditErr) {
            console.warn("Failed to write audit log for school registration:", auditErr);
        }

        return {
            ...schoolUnit,
            schoolProfile,
            adminAssignment
        };
    }

    /**
     * Retrieves Federal overview metrics and regions list with administrator status.
     */
    static async getFederalOverview() {
        const [totalRegions, totalZones, totalWoredas, totalSchools, totalStudents, totalTeachers] = await Promise.all([
            prisma.organizationUnit.count({ where: { type: "REGION" } }),
            prisma.organizationUnit.count({ where: { type: "ZONE" } }),
            prisma.organizationUnit.count({ where: { type: "WOREDA" } }),
            prisma.organizationUnit.count({ where: { type: "SCHOOL" } }),
            prisma.student.count().catch(() => 0),
            prisma.teacher.count().catch(() => 0)
        ]);

        const federalUnit = await prisma.organizationUnit.findFirst({
            where: { type: "FEDERAL" }
        });

        const regions = await prisma.organizationUnit.findMany({
            where: { type: "REGION" },
            include: {
                children: {
                    include: {
                        children: {
                            include: {
                                children: true
                            }
                        },
                        assignments: {
                            include: {
                                user: true,
                                role: true
                            }
                        }
                    }
                },
                assignments: {
                    include: {
                        user: true,
                        role: true
                    }
                }
            },
            orderBy: { name: "asc" }
        });

        const alerts: Array<{
            id: string;
            type: "UNASSIGNED_ADMIN";
            severity: "WARNING";
            title: string;
            description: string;
            sourceUnit: string;
            timestamp: string;
        }> = [];

        const formattedRegions = regions.map(r => {
            const zonesCount = r.children.length;
            let woredasCount = 0;
            let schoolsCount = 0;

            const zonesBreakdown = r.children.map(zone => {
                const zoneWoredasCount = zone.children.length;
                let zoneSchoolsCount = 0;
                for (const woreda of zone.children) {
                    zoneSchoolsCount += woreda.children.length;
                }

                const zoneAdminAssignment = zone.assignments?.find(
                    a => a.role.name === "ADMIN" || a.role.name === "ZONE_ADMIN"
                );

                return {
                    id: zone.id,
                    name: zone.name,
                    woredasCount: zoneWoredasCount,
                    schoolsCount: zoneSchoolsCount,
                    adminName: zoneAdminAssignment?.user?.name || null
                };
            });

            for (const zone of r.children) {
                woredasCount += zone.children.length;
                for (const woreda of zone.children) {
                    schoolsCount += woreda.children.length;
                }
            }

            const adminAssignment = r.assignments.find(
                a => a.role.name === "ADMIN" || a.role.name === "REGIONAL_ADMIN" || a.role.name === "REGION_ADMIN"
            );

            let admin = null;
            if (adminAssignment && adminAssignment.user) {
                const u = adminAssignment.user;
                admin = {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    status: u.emailVerified ? "ACTIVE" as const : "INVITATION_PENDING" as const,
                    invitedAt: adminAssignment.createdAt,
                    roleName: "Regional Administrator"
                };
            } else {
                alerts.push({
                    id: `alert-region-${r.id}`,
                    type: "UNASSIGNED_ADMIN",
                    severity: "WARNING",
                    title: "Regional Administrator Unassigned",
                    description: `Region "${r.name}" has no appointed administrator.`,
                    sourceUnit: r.name,
                    timestamp: new Date().toISOString()
                });
            }

            return {
                id: r.id,
                name: r.name,
                type: r.type,
                parentId: r.parentId,
                zonesCount,
                woredasCount,
                schoolsCount,
                admin,
                zones: zonesBreakdown
            };
        });

        return {
            federalId: federalUnit?.id || null,
            federalName: federalUnit?.name || "Federal Ministry of Education",
            counts: {
                totalRegions,
                totalZones,
                totalWoredas,
                totalSchools,
                totalStudents,
                totalTeachers
            },
            regions: formattedRegions,
            alerts
        };
    }

    /**
     * Retrieves hierarchical drill-down node data:
     * - Node details & aggregated counts (Zones, Woredas, Schools, Students, Teachers)
     * - Full breadcrumb chain (Federal -> Region -> Zone -> Woreda -> School)
     * - Direct child nodes with their individual aggregated counts
     */
    static async getHierarchyDrilldown(
        unitId?: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null
    ) {
        // 1. Resolve target unit
        let targetUnit: any = null;
        if (!unitId || unitId === "FEDERAL" || unitId === "root") {
            targetUnit = await prisma.organizationUnit.findFirst({
                where: { type: "FEDERAL" },
                include: {
                    assignments: {
                        include: { user: true, role: true }
                    }
                }
            });
            if (!targetUnit) {
                return {
                    node: {
                        id: "federal-root",
                        name: "Federal Ministry of Education",
                        type: "FEDERAL" as const,
                        parentId: null,
                        parentName: null
                    },
                    counts: {
                        totalRegions: 0,
                        zonesCount: 0,
                        woredasCount: 0,
                        schoolsCount: 0,
                        studentsCount: 0,
                        teachersCount: 0
                    },
                    admin: null,
                    schoolProfile: null,
                    breadcrumbs: [{ id: "federal-root", name: "Federal Ministry of Education", type: "FEDERAL" as const }],
                    children: []
                };
            }
        } else {
            targetUnit = await prisma.organizationUnit.findUnique({
                where: { id: unitId },
                include: {
                    parent: true,
                    schoolProfile: true,
                    assignments: {
                        include: { user: true, role: true }
                    }
                }
            });
            if (!targetUnit) {
                throw new Error(`Organization unit with ID '${unitId}' not found.`);
            }
        }

        // 2. Validate scope if actor is not FEDERAL
        if (actorScope && actorScope.type !== "FEDERAL") {
            const accessibleIds = await HierarchyScopeService.getAccessibleOrganizationIds(actorScope.id);
            if (!accessibleIds.includes(targetUnit.id)) {
                throw new Error(`Forbidden: You do not have permission to access unit '${targetUnit.name}'.`);
            }
        }

        // 3. Resolve breadcrumbs via lineage
        const lineage = await HierarchyScopeService.getLineage(targetUnit.id);
        const breadcrumbs = [...lineage].reverse().map(u => ({
            id: u.id,
            name: u.name,
            type: u.type
        }));

        // 4. Resolve admin for targetUnit
        let unitAdmin = null;
        const adminAssignment = targetUnit.assignments?.find(
            (a: any) => a.role.name === "ADMIN" || a.role.name.endsWith("_ADMIN") || a.role.name === "PRINCIPAL"
        );
        if (adminAssignment && adminAssignment.user) {
            const u = adminAssignment.user;
            unitAdmin = {
                id: u.id,
                name: u.name,
                email: u.email,
                status: u.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
                invitedAt: adminAssignment.createdAt?.toISOString(),
                roleName: adminAssignment.role.name
            };
        }

        // 5. Load all units for rollups
        const allUnits = await prisma.organizationUnit.findMany({
            select: { id: true, name: true, type: true, parentId: true }
        });

        // Helper to find all descendant school IDs for any given unit ID
        const getSchoolIdsForUnit = (startId: string, startType: string): string[] => {
            if (startType === "SCHOOL") return [startId];
            const schoolIds: string[] = [];
            const queue = [startId];
            while (queue.length > 0) {
                const cur = queue.shift()!;
                const kids = allUnits.filter(u => u.parentId === cur);
                for (const k of kids) {
                    if (k.type === "SCHOOL") {
                        schoolIds.push(k.id);
                    } else {
                        queue.push(k.id);
                    }
                }
            }
            return schoolIds;
        };

        // Helper to count units of a specific type under a subtree
        const countDescendantsOfType = (startId: string, type: string): number => {
            let count = 0;
            const queue = [startId];
            while (queue.length > 0) {
                const cur = queue.shift()!;
                const kids = allUnits.filter(u => u.parentId === cur);
                for (const k of kids) {
                    if (k.type === type) count++;
                    queue.push(k.id);
                }
            }
            return count;
        };

        // 6. Handle Drill-down per Tier:
        if (targetUnit.type === "FEDERAL") {
            const regions = await prisma.organizationUnit.findMany({
                where: { type: "REGION", parentId: targetUnit.id },
                include: {
                    assignments: { include: { user: true, role: true } }
                },
                orderBy: { name: "asc" }
            });

            const children = await Promise.all(
                regions.map(async r => {
                    const zonesCount = allUnits.filter(u => u.parentId === r.id && u.type === "ZONE").length;
                    const woredasCount = countDescendantsOfType(r.id, "WOREDA");
                    const schoolIds = getSchoolIdsForUnit(r.id, "REGION");
                    const [studentsCount, teachersCount] = await Promise.all([
                        prisma.studentEnrollment.count({ where: { organizationId: { in: schoolIds } } }).catch(() => 0),
                        prisma.teacher.count({ where: { organizationId: { in: schoolIds } } }).catch(() => 0)
                    ]);

                    const rAdminAssignment = r.assignments?.find(
                        (a: any) => a.role.name === "ADMIN" || a.role.name === "REGIONAL_ADMIN" || a.role.name === "REGION_ADMIN"
                    );
                    let rAdmin = null;
                    if (rAdminAssignment && rAdminAssignment.user) {
                        rAdmin = {
                            id: rAdminAssignment.user.id,
                            name: rAdminAssignment.user.name,
                            email: rAdminAssignment.user.email,
                            status: rAdminAssignment.user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
                            roleName: "Regional Administrator"
                        };
                    }

                    return {
                        id: r.id,
                        name: r.name,
                        type: "REGION" as const,
                        parentId: r.parentId,
                        zonesCount,
                        woredasCount,
                        schoolsCount: schoolIds.length,
                        studentsCount,
                        teachersCount,
                        admin: rAdmin
                    };
                })
            );

            const totalRegions = regions.length;
            const totalZones = children.reduce((acc, c) => acc + (c.zonesCount || 0), 0);
            const totalWoredas = children.reduce((acc, c) => acc + (c.woredasCount || 0), 0);
            const totalSchools = children.reduce((acc, c) => acc + (c.schoolsCount || 0), 0);
            const totalStudents = children.reduce((acc, c) => acc + (c.studentsCount || 0), 0);
            const totalTeachers = children.reduce((acc, c) => acc + (c.teachersCount || 0), 0);

            return {
                node: {
                    id: targetUnit.id,
                    name: targetUnit.name,
                    type: targetUnit.type,
                    parentId: null,
                    parentName: null
                },
                counts: {
                    totalRegions,
                    zonesCount: totalZones,
                    woredasCount: totalWoredas,
                    schoolsCount: totalSchools,
                    studentsCount: totalStudents,
                    teachersCount: totalTeachers
                },
                admin: unitAdmin,
                schoolProfile: null,
                breadcrumbs,
                children
            };
        }

        if (targetUnit.type === "REGION") {
            const zones = await prisma.organizationUnit.findMany({
                where: { type: "ZONE", parentId: targetUnit.id },
                include: {
                    assignments: { include: { user: true, role: true } }
                },
                orderBy: { name: "asc" }
            });

            const children = await Promise.all(
                zones.map(async z => {
                    const woredasCount = allUnits.filter(u => u.parentId === z.id && u.type === "WOREDA").length;
                    const schoolIds = getSchoolIdsForUnit(z.id, "ZONE");
                    const [studentsCount, teachersCount] = await Promise.all([
                        prisma.studentEnrollment.count({ where: { organizationId: { in: schoolIds } } }).catch(() => 0),
                        prisma.teacher.count({ where: { organizationId: { in: schoolIds } } }).catch(() => 0)
                    ]);

                    const zAdminAssignment = z.assignments?.find(
                        (a: any) => a.role.name === "ADMIN" || a.role.name === "ZONE_ADMIN" || a.role.name === "ZONAL_ADMIN"
                    );
                    let zAdmin = null;
                    if (zAdminAssignment && zAdminAssignment.user) {
                        zAdmin = {
                            id: zAdminAssignment.user.id,
                            name: zAdminAssignment.user.name,
                            email: zAdminAssignment.user.email,
                            status: zAdminAssignment.user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
                            roleName: "Zonal Administrator"
                        };
                    }

                    return {
                        id: z.id,
                        name: z.name,
                        type: "ZONE" as const,
                        parentId: z.parentId,
                        woredasCount,
                        schoolsCount: schoolIds.length,
                        studentsCount,
                        teachersCount,
                        admin: zAdmin
                    };
                })
            );

            const zonesCount = zones.length;
            const woredasCount = children.reduce((acc, c) => acc + (c.woredasCount || 0), 0);
            const schoolsCount = children.reduce((acc, c) => acc + (c.schoolsCount || 0), 0);
            const studentsCount = children.reduce((acc, c) => acc + (c.studentsCount || 0), 0);
            const teachersCount = children.reduce((acc, c) => acc + (c.teachersCount || 0), 0);

            return {
                node: {
                    id: targetUnit.id,
                    name: targetUnit.name,
                    type: targetUnit.type,
                    parentId: targetUnit.parentId,
                    parentName: targetUnit.parent?.name || "Federal Ministry of Education"
                },
                counts: {
                    zonesCount,
                    woredasCount,
                    schoolsCount,
                    studentsCount,
                    teachersCount
                },
                admin: unitAdmin,
                schoolProfile: null,
                breadcrumbs,
                children
            };
        }

        if (targetUnit.type === "ZONE") {
            const woredas = await prisma.organizationUnit.findMany({
                where: { type: "WOREDA", parentId: targetUnit.id },
                include: {
                    assignments: { include: { user: true, role: true } }
                },
                orderBy: { name: "asc" }
            });

            const children = await Promise.all(
                woredas.map(async w => {
                    const schoolIds = getSchoolIdsForUnit(w.id, "WOREDA");
                    const [studentsCount, teachersCount] = await Promise.all([
                        prisma.studentEnrollment.count({ where: { organizationId: { in: schoolIds } } }).catch(() => 0),
                        prisma.teacher.count({ where: { organizationId: { in: schoolIds } } }).catch(() => 0)
                    ]);

                    const wAdminAssignment = w.assignments?.find(
                        (a: any) => a.role.name === "ADMIN" || a.role.name === "WOREDA_ADMIN"
                    );
                    let wAdmin = null;
                    if (wAdminAssignment && wAdminAssignment.user) {
                        wAdmin = {
                            id: wAdminAssignment.user.id,
                            name: wAdminAssignment.user.name,
                            email: wAdminAssignment.user.email,
                            status: wAdminAssignment.user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
                            roleName: "Woreda Administrator"
                        };
                    }

                    return {
                        id: w.id,
                        name: w.name,
                        type: "WOREDA" as const,
                        parentId: w.parentId,
                        schoolsCount: schoolIds.length,
                        studentsCount,
                        teachersCount,
                        admin: wAdmin
                    };
                })
            );

            const woredasCount = woredas.length;
            const schoolsCount = children.reduce((acc, c) => acc + (c.schoolsCount || 0), 0);
            const studentsCount = children.reduce((acc, c) => acc + (c.studentsCount || 0), 0);
            const teachersCount = children.reduce((acc, c) => acc + (c.teachersCount || 0), 0);

            return {
                node: {
                    id: targetUnit.id,
                    name: targetUnit.name,
                    type: targetUnit.type,
                    parentId: targetUnit.parentId,
                    parentName: targetUnit.parent?.name || "Regional Education Bureau"
                },
                counts: {
                    woredasCount,
                    schoolsCount,
                    studentsCount,
                    teachersCount
                },
                admin: unitAdmin,
                schoolProfile: null,
                breadcrumbs,
                children
            };
        }

        if (targetUnit.type === "WOREDA") {
            const schools = await prisma.organizationUnit.findMany({
                where: { type: "SCHOOL", parentId: targetUnit.id },
                include: {
                    schoolProfile: true,
                    assignments: { include: { user: true, role: true } },
                    _count: {
                        select: {
                            studentEnrollments: true,
                            teachers: true
                        }
                    }
                },
                orderBy: { name: "asc" }
            });

            const children = schools.map(s => {
                const sAdminAssignment = s.assignments?.find(
                    (a: any) => a.role.name === "ADMIN" || a.role.name === "SCHOOL_ADMIN" || a.role.name === "PRINCIPAL"
                );
                let sAdmin = null;
                if (sAdminAssignment && sAdminAssignment.user) {
                    sAdmin = {
                        id: sAdminAssignment.user.id,
                        name: sAdminAssignment.user.name,
                        email: sAdminAssignment.user.email,
                        status: sAdminAssignment.user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
                        roleName: "School Principal"
                    };
                }

                return {
                    id: s.id,
                    name: s.name,
                    type: "SCHOOL" as const,
                    parentId: s.parentId,
                    studentsCount: s._count?.studentEnrollments ?? 0,
                    teachersCount: s._count?.teachers ?? 0,
                    admin: sAdmin,
                    schoolProfile: s.schoolProfile ? {
                        address: s.schoolProfile.address || null,
                        phoneNumber: s.schoolProfile.phoneNumber || null,
                        contactEmail: s.schoolProfile.contactEmail || null,
                        establishedYear: s.schoolProfile.establishedYear || null,
                        status: s.schoolProfile.status || "ACTIVE"
                    } : null
                };
            });

            const schoolsCount = schools.length;
            const studentsCount = children.reduce((acc, c) => acc + (c.studentsCount || 0), 0);
            const teachersCount = children.reduce((acc, c) => acc + (c.teachersCount || 0), 0);

            return {
                node: {
                    id: targetUnit.id,
                    name: targetUnit.name,
                    type: targetUnit.type,
                    parentId: targetUnit.parentId,
                    parentName: targetUnit.parent?.name || "Zonal Education Department"
                },
                counts: {
                    schoolsCount,
                    studentsCount,
                    teachersCount
                },
                admin: unitAdmin,
                schoolProfile: null,
                breadcrumbs,
                children
            };
        }

        if (targetUnit.type === "SCHOOL") {
            const [studentsCount, teachersCount] = await Promise.all([
                prisma.studentEnrollment.count({ where: { organizationId: targetUnit.id } }).catch(() => 0),
                prisma.teacher.count({ where: { organizationId: targetUnit.id } }).catch(() => 0)
            ]);

            return {
                node: {
                    id: targetUnit.id,
                    name: targetUnit.name,
                    type: targetUnit.type,
                    parentId: targetUnit.parentId,
                    parentName: targetUnit.parent?.name || "Woreda Education Office"
                },
                counts: {
                    studentsCount,
                    teachersCount
                },
                admin: unitAdmin,
                schoolProfile: targetUnit.schoolProfile ? {
                    address: targetUnit.schoolProfile.address || null,
                    phoneNumber: targetUnit.schoolProfile.phoneNumber || null,
                    contactEmail: targetUnit.schoolProfile.contactEmail || null,
                    establishedYear: targetUnit.schoolProfile.establishedYear || null,
                    status: targetUnit.schoolProfile.status || "ACTIVE"
                } : null,
                breadcrumbs,
                children: []
            };
        }

        throw new Error(`Unsupported organization unit type '${targetUnit.type}'.`);
    }

    /**
     * Assigns a Regional Administrator by recording user designation,
     * assigning the scoped role, generating invitation token, and auditing.
     */
    static async assignRegionalAdmin(
        regionId: string,
        input: { name: string; email: string; phone?: string },
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        if (!input.name || !input.name.trim()) {
            throw new Error("Full name is required.");
        }
        if (!input.email || !input.email.trim()) {
            throw new Error("Email address is required.");
        }

        const region = await prisma.organizationUnit.findUnique({
            where: { id: regionId }
        });

        if (!region) {
            throw new Error(`Region with ID '${regionId}' not found.`);
        }
        if (region.type !== "REGION") {
            throw new Error(`Target organization '${region.name}' is of type ${region.type}, not REGION.`);
        }

        if (actorScope && actorScope.type !== "FEDERAL") {
            throw new Error("Forbidden: Only Federal Administrators can assign Regional Administrators.");
        }

        const email = input.email.trim().toLowerCase();
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            const userId = "usr_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name: input.name.trim(),
                    email,
                    emailVerified: false,
                    requiresPasswordChange: true,
                    isActive: true
                }
            });
        } else {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { name: input.name.trim() }
            });
        }

        // Attach Role at Region Scope
        const assignment = await assignRoleToUserByScopeId(user.id, "ADMIN", regionId);

        // Verification token for invitation
        const inviteToken = "inv_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        try {
            await prisma.verification.create({
                data: {
                    id: "ver_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    identifier: `invitation:${user.id}:${regionId}`,
                    value: inviteToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        } catch (e) {
            // ignore verification create if duplicate
        }

        // Send invitation email
        try {
            await sendAdminInvitationEmail({
                recipientName: user.name,
                recipientEmail: user.email,
                assignedRole: "Regional Administrator",
                organizationName: region.name,
                organizationType: "Region",
                issuingAuthority: "Federal Ministry of Education",
                activationToken: inviteToken,
                expiryDays: 7
            });
        } catch (emailErr) {
            console.warn("[HierarchyService] Email send failed (non-fatal):", emailErr);
        }

        // Audit Log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: regionId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_SENT",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: regionId,
                    newValue: {
                        regionId,
                        regionName: region.name,
                        assignedUserId: user.id,
                        assignedUserName: user.name,
                        assignedUserEmail: user.email,
                        role: "Regional Administrator"
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {
            console.warn("Failed to write audit log for admin invitation:", e);
        }

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.emailVerified ? "ACTIVE" : "INVITATION_PENDING",
            invitedAt: assignment.createdAt,
            roleName: "Regional Administrator"
        };
    }

    /**
     * Resends invitation for an assigned Regional Administrator.
     */
    static async resendRegionalAdminInvitation(
        regionId: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        const region = await prisma.organizationUnit.findUnique({
            where: { id: regionId },
            include: { assignments: { include: { user: true, role: true } } }
        });

        if (!region) throw new Error(`Region not found.`);
        if (actorScope && actorScope.type !== "FEDERAL") {
            throw new Error("Forbidden: Only Federal Administrators can manage Regional Administrator invitations.");
        }

        const adminAssignment = region.assignments.find(
            a => a.role.name === "ADMIN" || a.role.name === "REGIONAL_ADMIN" || a.role.name === "REGION_ADMIN"
        );

        if (!adminAssignment || !adminAssignment.user) {
            throw new Error("No administrator assigned to this Region.");
        }

        const inviteToken = "inv_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        try {
            await prisma.verification.deleteMany({
                where: { identifier: `invitation:${adminAssignment.user.id}:${regionId}` }
            });
            await prisma.verification.create({
                data: {
                    id: "ver_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    identifier: `invitation:${adminAssignment.user.id}:${regionId}`,
                    value: inviteToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        } catch (e) {}

        // Re-send invitation email
        try {
            await sendAdminInvitationEmail({
                recipientName: adminAssignment.user.name,
                recipientEmail: adminAssignment.user.email,
                assignedRole: "Regional Administrator",
                organizationName: region.name,
                organizationType: "Region",
                issuingAuthority: "Federal Ministry of Education",
                activationToken: inviteToken,
                expiryDays: 7
            });
        } catch (emailErr) {
            console.warn("[HierarchyService] Resend email failed (non-fatal):", emailErr);
        }

        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: regionId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_RESENT",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: regionId,
                    newValue: {
                        regionId,
                        regionName: region.name,
                        userEmail: adminAssignment.user.email
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            success: true,
            message: `Invitation resent to ${adminAssignment.user.email}`,
            invitedAt: new Date()
        };
    }

    /**
     * Cancels invitation for an assigned Regional Administrator.
     */
    static async cancelRegionalAdminInvitation(
        regionId: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        const region = await prisma.organizationUnit.findUnique({
            where: { id: regionId },
            include: { assignments: { include: { user: true, role: true } } }
        });

        if (!region) throw new Error(`Region not found.`);
        if (actorScope && actorScope.type !== "FEDERAL") {
            throw new Error("Forbidden: Only Federal Administrators can manage Regional Administrator invitations.");
        }

        const adminAssignment = region.assignments.find(
            a => a.role.name === "ADMIN" || a.role.name === "REGIONAL_ADMIN" || a.role.name === "REGION_ADMIN"
        );

        if (!adminAssignment) {
            throw new Error("No administrator assigned to this Region.");
        }

        await prisma.roleAssignment.delete({
            where: { id: adminAssignment.id }
        });

        try {
            await prisma.verification.deleteMany({
                where: { identifier: `invitation:${adminAssignment.userId}:${regionId}` }
            });
        } catch (e) {}

        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: regionId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_CANCELLED",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: regionId,
                    newValue: {
                        regionId,
                        regionName: region.name,
                        cancelledUserEmail: adminAssignment.user?.email
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            success: true,
            message: `Regional administrator invitation cancelled successfully.`
        };
    }

    /**
     * Retrieves overview statistics and Zone list for a specific Region.
     */
    static async getRegionOverview(
        regionId?: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null
    ) {
        let targetId = regionId;
        if (!targetId && actorScope?.type === "REGION") {
            targetId = actorScope.id;
        }

        if (!targetId) {
            const firstRegion = await prisma.organizationUnit.findFirst({
                where: { type: "REGION" }
            });
            if (!firstRegion) {
                return {
                    regionId: null,
                    regionName: "Regional Education Bureau",
                    parentFederalName: "Federal Ministry of Education",
                    counts: { totalZones: 0, totalWoredas: 0, totalSchools: 0 },
                    zones: []
                };
            }
            targetId = firstRegion.id;
        }

        const region = await prisma.organizationUnit.findUnique({
            where: { id: targetId },
            include: { parent: true }
        });

        if (!region || region.type !== "REGION") {
            throw new Error(`Region with ID '${targetId}' not found.`);
        }

        // Fetch child Zones with assignments and users
        const zones = await prisma.organizationUnit.findMany({
            where: { type: "ZONE", parentId: targetId },
            include: {
                assignments: {
                    include: {
                        user: true,
                        role: true
                    }
                }
            },
            orderBy: { name: "asc" }
        });

        const zoneIds = zones.map(z => z.id);

        // Fetch woredas under these zones
        const woredas = await prisma.organizationUnit.findMany({
            where: { type: "WOREDA", parentId: { in: zoneIds } },
            select: { id: true, parentId: true }
        });
        const woredaIds = woredas.map(w => w.id);

        // Fetch schools under these woredas
        const schools = await prisma.organizationUnit.findMany({
            where: { type: "SCHOOL", parentId: { in: woredaIds } },
            select: { id: true, parentId: true }
        });

        const formattedZones = zones.map(z => {
            const zWoredas = woredas.filter(w => w.parentId === z.id);
            const zWoredaIds = zWoredas.map(w => w.id);
            const zSchools = schools.filter(s => zWoredaIds.includes(s.parentId || ""));

            const adminAssignment = z.assignments.find(
                a => a.role.name === "ADMIN" || a.role.name === "ZONE_ADMIN" || a.role.name === "ZONAL_ADMIN"
            );

            let admin = null;
            if (adminAssignment && adminAssignment.user) {
                admin = {
                    id: adminAssignment.user.id,
                    name: adminAssignment.user.name,
                    email: adminAssignment.user.email,
                    status: adminAssignment.user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
                    invitedAt: adminAssignment.createdAt?.toISOString(),
                    roleName: "Zonal Administrator"
                };
            }

            return {
                id: z.id,
                name: z.name,
                type: "ZONE" as const,
                parentId: z.parentId,
                woredasCount: zWoredas.length,
                schoolsCount: zSchools.length,
                admin
            };
        });

        return {
            regionId: region.id,
            regionName: region.name,
            parentFederalName: region.parent?.name || "Federal Ministry of Education",
            counts: {
                totalZones: zones.length,
                totalWoredas: woredas.length,
                totalSchools: schools.length
            },
            zones: formattedZones
        };
    }

    /**
     * Assigns a Zone Administrator by recording user designation,
     * assigning the scoped role at ZONE level, generating invitation token, and emailing.
     */
    static async assignZoneAdmin(
        zoneId: string,
        input: { name: string; email: string; phone?: string },
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        if (!input.name || !input.name.trim()) {
            throw new Error("Full name is required.");
        }
        if (!input.email || !input.email.trim()) {
            throw new Error("Email address is required.");
        }

        const zone = await prisma.organizationUnit.findUnique({
            where: { id: zoneId },
            include: { parent: true }
        });

        if (!zone) {
            throw new Error(`Zone with ID '${zoneId}' not found.`);
        }
        if (zone.type !== "ZONE") {
            throw new Error(`Target organization '${zone.name}' is of type ${zone.type}, not ZONE.`);
        }

        // Scope check: actor must be FEDERAL or the parent REGION of this zone
        if (actorScope) {
            if (actorScope.type === "REGION" && zone.parentId !== actorScope.id) {
                throw new Error("Forbidden: You can only assign administrators to Zones within your authorized Region.");
            }
            if (actorScope.type !== "FEDERAL" && actorScope.type !== "REGION") {
                throw new Error("Forbidden: Only Regional or Federal Administrators can assign Zone Administrators.");
            }
        }

        const email = input.email.trim().toLowerCase();
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            const userId = "usr_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name: input.name.trim(),
                    email,
                    emailVerified: false,
                    requiresPasswordChange: true,
                    isActive: true
                }
            });
        } else {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { name: input.name.trim() }
            });
        }

        // Attach Role at Zone Scope
        const assignment = await assignRoleToUserByScopeId(user.id, "ADMIN", zoneId);

        // Verification token for invitation
        const inviteToken = "inv_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        try {
            await prisma.verification.create({
                data: {
                    id: "ver_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    identifier: `invitation:${user.id}:${zoneId}`,
                    value: inviteToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        } catch (e) {}

        const regionName = zone.parent?.name || actorScope?.name || "Regional Education Bureau";
        const issuingAuthority = regionName.includes("Bureau") || regionName.includes("Region") 
            ? `${regionName} Education Bureau` 
            : `${regionName} Regional Education Bureau`;

        // Send invitation email
        try {
            await sendAdminInvitationEmail({
                recipientName: user.name,
                recipientEmail: user.email,
                assignedRole: "Zonal Administrator",
                organizationName: zone.name,
                organizationType: "Zone",
                issuingAuthority,
                activationToken: inviteToken,
                expiryDays: 7
            });
        } catch (emailErr) {
            console.warn("[HierarchyService] Zone admin email send failed (non-fatal):", emailErr);
        }

        // Audit Log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: zoneId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_SENT",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: zoneId,
                    newValue: {
                        zoneId,
                        zoneName: zone.name,
                        assignedUserId: user.id,
                        assignedUserName: user.name,
                        assignedUserEmail: user.email,
                        role: "Zonal Administrator"
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
            invitedAt: assignment.createdAt,
            roleName: "Zonal Administrator"
        };
    }

    /**
     * Resends invitation for an assigned Zone Administrator.
     */
    static async resendZoneAdminInvitation(
        zoneId: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        const zone = await prisma.organizationUnit.findUnique({
            where: { id: zoneId },
            include: { parent: true, assignments: { include: { user: true, role: true } } }
        });

        if (!zone) throw new Error("Zone not found.");
        if (actorScope) {
            if (actorScope.type === "REGION" && zone.parentId !== actorScope.id) {
                throw new Error("Forbidden: Target Zone is outside your regional jurisdiction.");
            }
            if (actorScope.type !== "FEDERAL" && actorScope.type !== "REGION") {
                throw new Error("Forbidden: Insufficient privileges to resend Zone Administrator invitation.");
            }
        }

        const adminAssignment = zone.assignments.find(
            a => a.role.name === "ADMIN" || a.role.name === "ZONE_ADMIN" || a.role.name === "ZONAL_ADMIN"
        );

        if (!adminAssignment || !adminAssignment.user) {
            throw new Error("No administrator assigned to this Zone.");
        }

        const inviteToken = "inv_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        try {
            await prisma.verification.deleteMany({
                where: { identifier: `invitation:${adminAssignment.user.id}:${zoneId}` }
            });
            await prisma.verification.create({
                data: {
                    id: "ver_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    identifier: `invitation:${adminAssignment.user.id}:${zoneId}`,
                    value: inviteToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        } catch (e) {}

        const regionName = zone.parent?.name || actorScope?.name || "Regional Education Bureau";
        const issuingAuthority = regionName.includes("Bureau") || regionName.includes("Region") 
            ? `${regionName} Education Bureau` 
            : `${regionName} Regional Education Bureau`;

        try {
            await sendAdminInvitationEmail({
                recipientName: adminAssignment.user.name,
                recipientEmail: adminAssignment.user.email,
                assignedRole: "Zonal Administrator",
                organizationName: zone.name,
                organizationType: "Zone",
                issuingAuthority,
                activationToken: inviteToken,
                expiryDays: 7
            });
        } catch (emailErr) {
            console.warn("[HierarchyService] Resend email failed (non-fatal):", emailErr);
        }

        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: zoneId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_RESENT",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: zoneId,
                    newValue: {
                        zoneId,
                        zoneName: zone.name,
                        userEmail: adminAssignment.user.email
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            success: true,
            message: `Invitation resent to ${adminAssignment.user.email}`,
            invitedAt: new Date()
        };
    }

    /**
     * Cancels invitation for an assigned Zone Administrator.
     */
    static async cancelZoneAdminInvitation(
        zoneId: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        const zone = await prisma.organizationUnit.findUnique({
            where: { id: zoneId },
            include: { parent: true, assignments: { include: { user: true, role: true } } }
        });

        if (!zone) throw new Error("Zone not found.");
        if (actorScope) {
            if (actorScope.type === "REGION" && zone.parentId !== actorScope.id) {
                throw new Error("Forbidden: Target Zone is outside your regional jurisdiction.");
            }
            if (actorScope.type !== "FEDERAL" && actorScope.type !== "REGION") {
                throw new Error("Forbidden: Insufficient privileges to cancel Zone Administrator invitation.");
            }
        }

        const adminAssignment = zone.assignments.find(
            a => a.role.name === "ADMIN" || a.role.name === "ZONE_ADMIN" || a.role.name === "ZONAL_ADMIN"
        );

        if (!adminAssignment) {
            throw new Error("No administrator assigned to this Zone.");
        }

        await prisma.roleAssignment.delete({
            where: { id: adminAssignment.id }
        });

        try {
            await prisma.verification.deleteMany({
                where: { identifier: `invitation:${adminAssignment.userId}:${zoneId}` }
            });
        } catch (e) {}

        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: zoneId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_CANCELLED",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: zoneId,
                    newValue: {
                        zoneId,
                        zoneName: zone.name,
                        cancelledUserEmail: adminAssignment.user?.email
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            success: true,
            message: `Assignment cancelled for ${zone.name}.`
        };
    }

    /**
     * Aggregates overview metrics for a Zone Desk:
     * - Subordinate Woredas with their designated Woreda Administrators
     * - Total schools count across all woredas
     * - Parent Region information
     */
    static async getZoneOverview(
        zoneId?: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null
    ) {
        let targetId = zoneId;
        if (!targetId && actorScope?.type === "ZONE") {
            targetId = actorScope.id;
        }

        if (!targetId) {
            const firstZone = await prisma.organizationUnit.findFirst({
                where: { type: "ZONE" }
            });
            if (!firstZone) {
                return {
                    zoneId: null,
                    zoneName: "Zonal Education Department",
                    parentRegionName: "Regional Education Bureau",
                    counts: { totalWoredas: 0, totalSchools: 0 },
                    woredas: []
                };
            }
            targetId = firstZone.id;
        }

        const zone = await prisma.organizationUnit.findUnique({
            where: { id: targetId },
            include: { parent: true }
        });

        if (!zone || zone.type !== "ZONE") {
            throw new Error(`Zone with ID '${targetId}' not found.`);
        }

        // Fetch child Woredas with role assignments and users
        const woredas = await prisma.organizationUnit.findMany({
            where: { type: "WOREDA", parentId: targetId },
            include: {
                assignments: {
                    include: {
                        user: true,
                        role: true
                    }
                }
            },
            orderBy: { name: "asc" }
        });

        const woredaIds = woredas.map(w => w.id);

        // Fetch schools under these woredas
        const schools = await prisma.organizationUnit.findMany({
            where: { type: "SCHOOL", parentId: { in: woredaIds } },
            select: { id: true, parentId: true }
        });

        const formattedWoredas = woredas.map(w => {
            const wSchools = schools.filter(s => s.parentId === w.id);

            const adminAssignment = w.assignments.find(
                a => a.role.name === "ADMIN" || a.role.name === "WOREDA_ADMIN"
            );

            let admin = null;
            if (adminAssignment && adminAssignment.user) {
                admin = {
                    id: adminAssignment.user.id,
                    name: adminAssignment.user.name,
                    email: adminAssignment.user.email,
                    status: adminAssignment.user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
                    invitedAt: adminAssignment.createdAt?.toISOString(),
                    roleName: "Woreda Administrator"
                };
            }

            return {
                id: w.id,
                name: w.name,
                type: "WOREDA" as const,
                parentId: w.parentId,
                schoolsCount: wSchools.length,
                admin
            };
        });

        return {
            zoneId: zone.id,
            zoneName: zone.name,
            parentRegionName: zone.parent?.name || "Regional Education Bureau",
            counts: {
                totalWoredas: woredas.length,
                totalSchools: schools.length
            },
            woredas: formattedWoredas
        };
    }

    /**
     * Assigns a Woreda Administrator by creating user, assigning role at WOREDA scope,
     * creating invitation verification token, and emailing.
     */
    static async assignWoredaAdmin(
        woredaId: string,
        input: { name: string; email: string; phone?: string },
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        if (!input.name || !input.name.trim()) {
            throw new Error("Full name is required.");
        }
        if (!input.email || !input.email.trim()) {
            throw new Error("Email address is required.");
        }

        const woreda = await prisma.organizationUnit.findUnique({
            where: { id: woredaId },
            include: { parent: true }
        });

        if (!woreda) {
            throw new Error(`Woreda with ID '${woredaId}' not found.`);
        }
        if (woreda.type !== "WOREDA") {
            throw new Error(`Target organization '${woreda.name}' is of type ${woreda.type}, not WOREDA.`);
        }

        // Scope check: actor must be FEDERAL, REGION (parent region), or ZONE (parent zone)
        if (actorScope) {
            if (actorScope.type === "ZONE" && woreda.parentId !== actorScope.id) {
                throw new Error("Forbidden: You can only assign administrators to Woredas within your authorized Zone.");
            }
            if (actorScope.type !== "FEDERAL" && actorScope.type !== "REGION" && actorScope.type !== "ZONE") {
                throw new Error("Forbidden: Insufficient privileges to assign Woreda Administrator.");
            }
        }

        const email = input.email.trim().toLowerCase();
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            const userId = "usr_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name: input.name.trim(),
                    email,
                    emailVerified: false,
                    requiresPasswordChange: true,
                    isActive: true
                }
            });
        } else {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { name: input.name.trim() }
            });
        }

        // Attach Role at Woreda Scope
        const assignment = await assignRoleToUserByScopeId(user.id, "ADMIN", woredaId);

        // Verification token for invitation
        const inviteToken = "inv_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        try {
            await prisma.verification.create({
                data: {
                    id: "ver_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    identifier: `invitation:${user.id}:${woredaId}`,
                    value: inviteToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        } catch (e) {}

        const zoneName = woreda.parent?.name || actorScope?.name || "Zonal Education Department";
        const issuingAuthority = zoneName.includes("Department") || zoneName.includes("Zone")
            ? `${zoneName} Education Department`
            : `${zoneName} Zonal Education Department`;

        // Send invitation email
        try {
            await sendAdminInvitationEmail({
                recipientName: user.name,
                recipientEmail: user.email,
                assignedRole: "Woreda Administrator",
                organizationName: woreda.name,
                organizationType: "Woreda",
                issuingAuthority,
                activationToken: inviteToken,
                expiryDays: 7
            });
        } catch (emailErr) {
            console.warn("[HierarchyService] Woreda admin email send failed (non-fatal):", emailErr);
        }

        // Audit Log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: woredaId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_SENT",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: woredaId,
                    newValue: {
                        woredaId,
                        woredaName: woreda.name,
                        assignedUserId: user.id,
                        assignedUserName: user.name,
                        assignedUserEmail: user.email,
                        role: "Woreda Administrator"
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
            invitedAt: assignment.createdAt,
            roleName: "Woreda Administrator"
        };
    }

    /**
     * Resends invitation for an assigned Woreda Administrator.
     */
    static async resendWoredaAdminInvitation(
        woredaId: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        const woreda = await prisma.organizationUnit.findUnique({
            where: { id: woredaId },
            include: { parent: true, assignments: { include: { user: true, role: true } } }
        });

        if (!woreda) throw new Error("Woreda not found.");
        if (actorScope) {
            if (actorScope.type === "ZONE" && woreda.parentId !== actorScope.id) {
                throw new Error("Forbidden: Target Woreda is outside your zonal jurisdiction.");
            }
            if (actorScope.type !== "FEDERAL" && actorScope.type !== "REGION" && actorScope.type !== "ZONE") {
                throw new Error("Forbidden: Insufficient privileges to resend Woreda Administrator invitation.");
            }
        }

        const adminAssignment = woreda.assignments.find(
            a => a.role.name === "ADMIN" || a.role.name === "WOREDA_ADMIN"
        );

        if (!adminAssignment || !adminAssignment.user) {
            throw new Error("No administrator assigned to this Woreda.");
        }

        const inviteToken = "inv_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        try {
            await prisma.verification.deleteMany({
                where: { identifier: `invitation:${adminAssignment.user.id}:${woredaId}` }
            });
            await prisma.verification.create({
                data: {
                    id: "ver_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    identifier: `invitation:${adminAssignment.user.id}:${woredaId}`,
                    value: inviteToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        } catch (e) {}

        const zoneName = woreda.parent?.name || actorScope?.name || "Zonal Education Department";
        const issuingAuthority = zoneName.includes("Department") || zoneName.includes("Zone")
            ? `${zoneName} Education Department`
            : `${zoneName} Zonal Education Department`;

        try {
            await sendAdminInvitationEmail({
                recipientName: adminAssignment.user.name,
                recipientEmail: adminAssignment.user.email,
                assignedRole: "Woreda Administrator",
                organizationName: woreda.name,
                organizationType: "Woreda",
                issuingAuthority,
                activationToken: inviteToken,
                expiryDays: 7
            });
        } catch (emailErr) {
            console.warn("[HierarchyService] Resend woreda email failed (non-fatal):", emailErr);
        }

        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: woredaId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_RESENT",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: woredaId,
                    newValue: {
                        woredaId,
                        woredaName: woreda.name,
                        userEmail: adminAssignment.user.email
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            success: true,
            message: `Invitation resent to ${adminAssignment.user.email}`,
            invitedAt: new Date()
        };
    }

    /**
     * Cancels invitation for an assigned Woreda Administrator.
     */
    static async cancelWoredaAdminInvitation(
        woredaId: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        const woreda = await prisma.organizationUnit.findUnique({
            where: { id: woredaId },
            include: { parent: true, assignments: { include: { user: true, role: true } } }
        });

        if (!woreda) throw new Error("Woreda not found.");
        if (actorScope) {
            if (actorScope.type === "ZONE" && woreda.parentId !== actorScope.id) {
                throw new Error("Forbidden: Target Woreda is outside your zonal jurisdiction.");
            }
            if (actorScope.type !== "FEDERAL" && actorScope.type !== "REGION" && actorScope.type !== "ZONE") {
                throw new Error("Forbidden: Insufficient privileges to cancel Woreda Administrator invitation.");
            }
        }

        const adminAssignment = woreda.assignments.find(
            a => a.role.name === "ADMIN" || a.role.name === "WOREDA_ADMIN"
        );

        if (!adminAssignment) {
            throw new Error("No administrator assigned to this Woreda.");
        }

        await prisma.roleAssignment.delete({
            where: { id: adminAssignment.id }
        });

        try {
            await prisma.verification.deleteMany({
                where: { identifier: `invitation:${adminAssignment.userId}:${woredaId}` }
            });
        } catch (e) {}

        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: woredaId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_CANCELLED",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: woredaId,
                    newValue: {
                        woredaId,
                        woredaName: woreda.name,
                        cancelledUserEmail: adminAssignment.user?.email
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            success: true,
            message: `Assignment cancelled for ${woreda.name}.`
        };
    }

    /**
     * Aggregates overview metrics for a Woreda Desk:
     * - Subordinate Schools with their designated School Principals / Admins
     * - Student & Teacher counts
     * - Parent Zone information
     */
    static async getWoredaOverview(
        woredaId?: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null
    ) {
        let targetId = woredaId;
        if (!targetId && actorScope?.type === "WOREDA") {
            targetId = actorScope.id;
        }

        if (!targetId) {
            const firstWoreda = await prisma.organizationUnit.findFirst({
                where: { type: "WOREDA" }
            });
            if (!firstWoreda) {
                return {
                    woredaId: null,
                    woredaName: "Woreda Education Office",
                    parentZoneName: "Zonal Education Department",
                    counts: { totalSchools: 0, totalStudents: 0, totalTeachers: 0 },
                    schools: []
                };
            }
            targetId = firstWoreda.id;
        }

        const woreda = await prisma.organizationUnit.findUnique({
            where: { id: targetId },
            include: { parent: true }
        });

        if (!woreda || woreda.type !== "WOREDA") {
            throw new Error(`Woreda with ID '${targetId}' not found.`);
        }

        // Fetch child Schools with role assignments, schoolProfile, and counts
        const schools = await prisma.organizationUnit.findMany({
            where: { type: "SCHOOL", parentId: targetId },
            include: {
                schoolProfile: true,
                assignments: {
                    include: {
                        user: true,
                        role: true
                    }
                },
                _count: {
                    select: {
                        studentEnrollments: true,
                        teachers: true
                    }
                }
            },
            orderBy: { name: "asc" }
        });

        let totalStudents = 0;
        let totalTeachers = 0;

        const formattedSchools = schools.map(s => {
            totalStudents += s._count.studentEnrollments;
            totalTeachers += s._count.teachers;

            const adminAssignment = s.assignments.find(
                a => a.role.name === "ADMIN" || a.role.name === "SCHOOL_ADMIN" || a.role.name === "PRINCIPAL"
            );

            let admin = null;
            if (adminAssignment && adminAssignment.user) {
                admin = {
                    id: adminAssignment.user.id,
                    name: adminAssignment.user.name,
                    email: adminAssignment.user.email,
                    status: adminAssignment.user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
                    invitedAt: adminAssignment.createdAt?.toISOString(),
                    roleName: "School Principal"
                };
            }

            return {
                id: s.id,
                name: s.name,
                type: "SCHOOL" as const,
                parentId: s.parentId,
                studentsCount: s._count.studentEnrollments,
                teachersCount: s._count.teachers,
                admin
            };
        });

        return {
            woredaId: woreda.id,
            woredaName: woreda.name,
            parentZoneName: woreda.parent?.name || "Zonal Education Department",
            counts: {
                totalSchools: schools.length,
                totalStudents,
                totalTeachers
            },
            schools: formattedSchools
        };
    }

    /**
     * Assigns a School Principal / Administrator by creating user, assigning role at SCHOOL scope,
     * creating invitation verification token, and emailing.
     */
    static async assignSchoolAdmin(
        schoolId: string,
        input: { name: string; email: string; phone?: string },
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        if (!input.name || !input.name.trim()) {
            throw new Error("Full name is required.");
        }
        if (!input.email || !input.email.trim()) {
            throw new Error("Email address is required.");
        }

        const school = await prisma.organizationUnit.findUnique({
            where: { id: schoolId },
            include: { parent: true }
        });

        if (!school) {
            throw new Error(`School with ID '${schoolId}' not found.`);
        }
        if (school.type !== "SCHOOL") {
            throw new Error(`Target organization '${school.name}' is of type ${school.type}, not SCHOOL.`);
        }

        // Scope check: actor must be FEDERAL, REGION, ZONE, or parent WOREDA
        if (actorScope) {
            if (actorScope.type === "WOREDA" && school.parentId !== actorScope.id) {
                throw new Error("Forbidden: You can only assign principals to Schools within your authorized Woreda.");
            }
            if (actorScope.type === "SCHOOL") {
                throw new Error("Forbidden: School-level users cannot assign new School Administrators.");
            }
        }

        const email = input.email.trim().toLowerCase();
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            const userId = "usr_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            user = await prisma.user.create({
                data: {
                    id: userId,
                    name: input.name.trim(),
                    email,
                    emailVerified: false,
                    requiresPasswordChange: true,
                    isActive: true
                }
            });
        } else {
            user = await prisma.user.update({
                where: { id: user.id },
                data: { name: input.name.trim() }
            });
        }

        // Attach Role at School Scope (SCHOOL_ADMIN or ADMIN)
        const assignment = await assignRoleToUserByScopeId(user.id, "SCHOOL_ADMIN", schoolId);

        // Verification token for invitation
        const inviteToken = "inv_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        try {
            await prisma.verification.create({
                data: {
                    id: "ver_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    identifier: `invitation:${user.id}:${schoolId}`,
                    value: inviteToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        } catch (e) {}

        const woredaName = school.parent?.name || actorScope?.name || "Woreda Education Office";
        const issuingAuthority = woredaName.includes("Office") || woredaName.includes("Woreda")
            ? `${woredaName} Education Office`
            : `${woredaName} Woreda Education Office`;

        // Send invitation email
        try {
            await sendAdminInvitationEmail({
                recipientName: user.name,
                recipientEmail: user.email,
                assignedRole: "School Principal",
                organizationName: school.name,
                organizationType: "School",
                issuingAuthority,
                activationToken: inviteToken,
                expiryDays: 7
            });
        } catch (emailErr) {
            console.warn("[HierarchyService] School admin email send failed (non-fatal):", emailErr);
        }

        // Audit Log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: schoolId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_SENT",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: schoolId,
                    newValue: {
                        schoolId,
                        schoolName: school.name,
                        assignedUserId: user.id,
                        assignedUserName: user.name,
                        assignedUserEmail: user.email,
                        role: "School Principal"
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            status: user.emailVerified ? ("ACTIVE" as const) : ("INVITATION_PENDING" as const),
            invitedAt: assignment.createdAt,
            roleName: "School Principal"
        };
    }

    /**
     * Resends invitation for an assigned School Principal.
     */
    static async resendSchoolAdminInvitation(
        schoolId: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        const school = await prisma.organizationUnit.findUnique({
            where: { id: schoolId },
            include: { parent: true, assignments: { include: { user: true, role: true } } }
        });

        if (!school) throw new Error("School not found.");
        if (actorScope) {
            if (actorScope.type === "WOREDA" && school.parentId !== actorScope.id) {
                throw new Error("Forbidden: Target School is outside your Woreda jurisdiction.");
            }
            if (actorScope.type === "SCHOOL") {
                throw new Error("Forbidden: School-level users cannot resend Administrator invitations.");
            }
        }

        const adminAssignment = school.assignments.find(
            a => a.role.name === "ADMIN" || a.role.name === "SCHOOL_ADMIN" || a.role.name === "PRINCIPAL"
        );

        if (!adminAssignment || !adminAssignment.user) {
            throw new Error("No principal or administrator assigned to this School.");
        }

        const inviteToken = "inv_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        try {
            await prisma.verification.deleteMany({
                where: { identifier: `invitation:${adminAssignment.user.id}:${schoolId}` }
            });
            await prisma.verification.create({
                data: {
                    id: "ver_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
                    identifier: `invitation:${adminAssignment.user.id}:${schoolId}`,
                    value: inviteToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
        } catch (e) {}

        const woredaName = school.parent?.name || actorScope?.name || "Woreda Education Office";
        const issuingAuthority = woredaName.includes("Office") || woredaName.includes("Woreda")
            ? `${woredaName} Education Office`
            : `${woredaName} Woreda Education Office`;

        try {
            await sendAdminInvitationEmail({
                recipientName: adminAssignment.user.name,
                recipientEmail: adminAssignment.user.email,
                assignedRole: "School Principal",
                organizationName: school.name,
                organizationType: "School",
                issuingAuthority,
                activationToken: inviteToken,
                expiryDays: 7
            });
        } catch (emailErr) {
            console.warn("[HierarchyService] Resend school principal email failed (non-fatal):", emailErr);
        }

        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: schoolId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_RESENT",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: schoolId,
                    newValue: {
                        schoolId,
                        schoolName: school.name,
                        userEmail: adminAssignment.user.email
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            success: true,
            message: `Invitation resent to ${adminAssignment.user.email}`,
            invitedAt: new Date()
        };
    }

    /**
     * Cancels invitation for an assigned School Principal.
     */
    static async cancelSchoolAdminInvitation(
        schoolId: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        actorUserId?: string,
        ipAddress?: string
    ) {
        const school = await prisma.organizationUnit.findUnique({
            where: { id: schoolId },
            include: { parent: true, assignments: { include: { user: true, role: true } } }
        });

        if (!school) throw new Error("School not found.");
        if (actorScope) {
            if (actorScope.type === "WOREDA" && school.parentId !== actorScope.id) {
                throw new Error("Forbidden: Target School is outside your Woreda jurisdiction.");
            }
            if (actorScope.type === "SCHOOL") {
                throw new Error("Forbidden: School-level users cannot cancel Principal invitations.");
            }
        }

        const adminAssignment = school.assignments.find(
            a => a.role.name === "ADMIN" || a.role.name === "SCHOOL_ADMIN" || a.role.name === "PRINCIPAL"
        );

        if (!adminAssignment) {
            throw new Error("No principal or administrator assigned to this School.");
        }

        await prisma.roleAssignment.delete({
            where: { id: adminAssignment.id }
        });

        try {
            await prisma.verification.deleteMany({
                where: { identifier: `invitation:${adminAssignment.userId}:${schoolId}` }
            });
        } catch (e) {}

        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: schoolId,
                    userId: actorUserId || null,
                    action: "ADMIN_INVITATION_CANCELLED",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: schoolId,
                    newValue: {
                        schoolId,
                        schoolName: school.name,
                        cancelledUserEmail: adminAssignment.user?.email
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (e) {}

        return {
            success: true,
            message: `Assignment cancelled for ${school.name}.`
        };
    }

    /**
     * Gets a single organization unit by ID with parent details and children count.
     */
    static async getOrganizationUnit(id: string) {
        const unit = await prisma.organizationUnit.findUnique({
            where: { id },
            include: {
                parent: true,
                schoolProfile: true,
                _count: {
                    select: {
                        children: true,
                        studentEnrollments: true,
                        teachers: true
                    }
                }
            }
        });

        if (!unit) {
            throw new Error(`Organization unit with ID '${id}' not found.`);
        }

        return unit;
    }

    /**
     * Gets direct children of an organization unit.
     */
    static async getChildren(parentId: string) {
        const parent = await prisma.organizationUnit.findUnique({
            where: { id: parentId }
        });

        if (!parent) {
            throw new Error(`Organization unit with ID '${parentId}' not found.`);
        }

        const children = await prisma.organizationUnit.findMany({
            where: { parentId },
            include: {
                schoolProfile: true,
                _count: {
                    select: {
                        children: true
                    }
                }
            },
            orderBy: { name: "asc" }
        });

        return children;
    }

    /**
     * Gets the full ancestor chain from the immediate parent up to the Federal root.
     */
    static async getAncestors(id: string): Promise<OrganizationUnit[]> {
        const unit = await prisma.organizationUnit.findUnique({
            where: { id }
        });

        if (!unit) {
            throw new Error(`Organization unit with ID '${id}' not found.`);
        }

        const ancestors: OrganizationUnit[] = [];
        let currentParentId = unit.parentId;

        while (currentParentId) {
            const parent = await prisma.organizationUnit.findUnique({
                where: { id: currentParentId }
            });

            if (!parent) break;

            ancestors.push(parent);
            currentParentId = parent.parentId;
        }

        return ancestors;
    }

    /**
     * Builds and returns a nested hierarchy tree starting from root(s) or a specified root ID.
     */
    static async getHierarchyTree(rootId?: string): Promise<HierarchyTreeNode[]> {
        let rootUnits: OrganizationUnit[] = [];

        if (rootId) {
            const root = await prisma.organizationUnit.findUnique({
                where: { id: rootId }
            });
            if (!root) {
                throw new Error(`Root organization unit with ID '${rootId}' not found.`);
            }
            rootUnits = [root];
        } else {
            // Find top-level root organization units (e.g. FEDERAL)
            rootUnits = await prisma.organizationUnit.findMany({
                where: { parentId: null },
                orderBy: { name: "asc" }
            });
        }

        // Fetch all organization units in a single query for fast in-memory tree assembly
        const allUnits = await prisma.organizationUnit.findMany({
            orderBy: { name: "asc" }
        });

        const childrenMap = new Map<string, OrganizationUnit[]>();
        for (const unit of allUnits) {
            if (unit.parentId) {
                const existing = childrenMap.get(unit.parentId) || [];
                existing.push(unit);
                childrenMap.set(unit.parentId, existing);
            }
        }

        function buildNode(unit: OrganizationUnit): HierarchyTreeNode {
            const childrenUnits = childrenMap.get(unit.id) || [];
            return {
                id: unit.id,
                name: unit.name,
                type: unit.type,
                parentId: unit.parentId,
                createdAt: unit.createdAt,
                updatedAt: unit.updatedAt,
                children: childrenUnits.map(buildNode)
            };
        }

        return rootUnits.map(buildNode);
    }

    /**
     * Updates an organization unit's name and/or parent relationship.
     */
    static async updateOrganizationUnit(
        id: string,
        input: UpdateOrganizationUnitInput,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null
    ) {
        const unit = await prisma.organizationUnit.findUnique({
            where: { id }
        });

        if (!unit) {
            throw new Error(`Organization unit with ID '${id}' not found.`);
        }

        if (actorScope) {
            if (actorScope.type === "SCHOOL") {
                throw new Error("Forbidden: School administrators are not authorized to modify the organizational hierarchy.");
            }

            if (actorScope.type !== "FEDERAL") {
                const ancestors = await this.getAncestors(id);
                const isUnderCaller = id === actorScope.id || ancestors.some(a => a.id === actorScope.id);
                if (!isUnderCaller) {
                    throw new Error(`Forbidden: Cannot modify organization unit outside your administrative scope (${actorScope.name}).`);
                }
            }
        }

        const updateData: { name?: string; parentId?: string | null } = {};

        if (input.name !== undefined) {
            if (!input.name.trim()) {
                throw new Error("Organization name cannot be empty.");
            }
            updateData.name = input.name.trim();
        }

        if (input.parentId !== undefined) {
            await this.validateParentRelationship(unit.type, input.parentId, id);
            updateData.parentId = unit.type === "FEDERAL" ? null : input.parentId;
        }

        const updated = await prisma.organizationUnit.update({
            where: { id },
            data: updateData,
            include: {
                parent: true
            }
        });

        return updated;
    }

    /**
     * H4: Assigns or reassigns an existing School to a target Woreda.
     * Enforces:
     * 1. School existence and type === 'SCHOOL'
     * 2. Target Woreda existence and type === 'WOREDA'
     * 3. H1 validation (cycle prevention, type compatibility)
     * 4. H2 authorization:
     *    - School admin is rejected
     *    - Non-Federal actor must have target Woreda and source School within their scope
     * 5. Preserves all existing school domain data
     * 6. Writes an audit log record
     */
    static async assignSchoolPlacement(
        schoolId: string,
        woredaId: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null,
        userId?: string,
        ipAddress?: string
    ) {
        if (!schoolId) {
            throw new Error("School ID is required.");
        }
        if (!woredaId) {
            throw new Error("Target Woreda ID is required.");
        }

        // 1. Verify source school
        const school = await prisma.organizationUnit.findUnique({
            where: { id: schoolId },
            include: {
                parent: true,
                schoolProfile: true
            }
        });

        if (!school) {
            throw new Error(`School with ID '${schoolId}' not found.`);
        }

        if (school.type !== "SCHOOL") {
            throw new Error(
                `Invalid placement: Organization unit '${school.name}' is of type '${school.type}', not 'SCHOOL'. Only schools can be assigned to a Woreda.`
            );
        }

        // 2. Verify target woreda
        const targetWoreda = await prisma.organizationUnit.findUnique({
            where: { id: woredaId }
        });

        if (!targetWoreda) {
            throw new Error(`Target Woreda with ID '${woredaId}' not found.`);
        }

        if (targetWoreda.type !== "WOREDA") {
            throw new Error(
                `Invalid placement: Target organization unit '${targetWoreda.name}' is of type '${targetWoreda.type}', not 'WOREDA'. Schools must be placed directly under a Woreda.`
            );
        }

        // 3. Authorization verification (H2 Hierarchical Scope)
        if (actorScope) {
            if (actorScope.type === "SCHOOL") {
                throw new Error("Forbidden: School administrators are not authorized to manage or place schools in the hierarchy.");
            }

            if (actorScope.type !== "FEDERAL") {
                // Verify target Woreda is inside caller's administrative scope
                const isTargetInScope = await HierarchyScopeService.isOrganizationInScope(actorScope.id, woredaId);
                if (!isTargetInScope) {
                    throw new Error(
                        `Forbidden: Target Woreda '${targetWoreda.name}' is outside your authorized administrative scope (${actorScope.name}).`
                    );
                }

                // If school is currently assigned to a Woreda, verify source school is also in caller's scope
                if (school.parentId) {
                    const isSourceInScope = await HierarchyScopeService.isOrganizationInScope(actorScope.id, school.id);
                    if (!isSourceInScope) {
                        throw new Error(
                            `Forbidden: Cannot reassign school '${school.name}' because it currently belongs to an administrative branch outside your scope (${actorScope.name}).`
                        );
                    }
                }
            }
        }

        // 4. Validate hierarchy relationship & prevent cycles
        await this.validateParentRelationship("SCHOOL", woredaId, schoolId);

        const oldParentId = school.parentId;
        const isReassignment = !!oldParentId;

        // 5. Update school placement
        const updatedSchool = await prisma.organizationUnit.update({
            where: { id: schoolId },
            data: {
                parentId: woredaId
            },
            include: {
                parent: true,
                schoolProfile: true
            }
        });

        // 6. Ensure SchoolProfile exists for canonical school domain
        if (!updatedSchool.schoolProfile) {
            await prisma.schoolProfile.upsert({
                where: { organizationId: schoolId },
                update: {},
                create: {
                    organizationId: schoolId,
                    status: "ACTIVE"
                }
            });
        }

        // 7. Audit log creation for hierarchy change
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: schoolId,
                    userId: userId || null,
                    action: "HIERARCHY_SCHOOL_PLACEMENT",
                    resource: "ORGANIZATION_UNIT",
                    resourceId: schoolId,
                    oldValue: {
                        schoolId,
                        schoolName: school.name,
                        previousParentId: oldParentId,
                        previousParentName: school.parent?.name || null
                    },
                    newValue: {
                        schoolId,
                        schoolName: school.name,
                        newParentId: woredaId,
                        newParentName: targetWoreda.name,
                        placementType: isReassignment ? "REASSIGNMENT" : "INITIAL_PLACEMENT"
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch (auditError) {
            console.warn("Failed to write audit log for school placement:", auditError);
        }

        return updatedSchool;
    }

    /**
     * Resolves the full lineage chain for an organization unit or school.
     */
    static async getLineage(organizationId: string) {
        return HierarchyScopeService.getLineage(organizationId);
    }

    /**
     * Deletes an organization unit safely:
     * - Rejects if unit has children
     * - Rejects if school unit has linked students or teachers
     */
    static async deleteOrganizationUnit(
        id: string,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null
    ) {
        const unit = await prisma.organizationUnit.findUnique({
            where: { id }
        });

        if (!unit) {
            throw new Error(`Organization unit with ID '${id}' not found.`);
        }

        if (actorScope) {
            if (actorScope.type === "SCHOOL") {
                throw new Error("Forbidden: School administrators are not authorized to delete organizational hierarchy units.");
            }

            if (actorScope.type !== "FEDERAL") {
                const ancestors = await this.getAncestors(id);
                const isUnderCaller = id === actorScope.id || ancestors.some(a => a.id === actorScope.id);
                if (!isUnderCaller) {
                    throw new Error(`Forbidden: Cannot delete organization unit outside your administrative scope (${actorScope.name}).`);
                }
            }
        }

        // Check for children
        const childCount = await prisma.organizationUnit.count({
            where: { parentId: id }
        });

        if (childCount > 0) {
            throw new Error(
                `Cannot delete organization unit '${unit.name}' because it has ${childCount} child organization(s). Remove or reassign child units first.`
            );
        }

        // Check for linked domain records (students, teachers, academic years)
        const [enrollmentCount, teacherCount, academicYearCount] = await Promise.all([
            prisma.studentEnrollment.count({ where: { organizationId: id } }),
            prisma.teacher.count({ where: { organizationId: id } }),
            prisma.academicYear.count({ where: { organizationId: id } })
        ]);

        if (enrollmentCount > 0 || teacherCount > 0 || academicYearCount > 0) {
            throw new Error(
                `Cannot delete organization unit '${unit.name}' with existing educational domain records (${enrollmentCount} enrollments, ${teacherCount} teachers, ${academicYearCount} academic years).`
            );
        }

        return prisma.organizationUnit.delete({
            where: { id }
        });
    }
}

export * from "./hierarchy-scope.service.js";

