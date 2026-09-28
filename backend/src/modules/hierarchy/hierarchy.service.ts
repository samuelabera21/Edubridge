import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType, OrganizationUnit } from "../../generated/prisma/client.js";

export const ALLOWED_PARENT_TYPE: Record<OrganizationUnitType, OrganizationUnitType | null> = {
    FEDERAL: null,
    REGION: "FEDERAL",
    ZONE: "REGION",
    WOREDA: "ZONE",
    SCHOOL: "WOREDA"
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
     * Creates a new OrganizationUnit with strict hierarchy validation and authorization checks.
     */
    static async createOrganizationUnit(
        input: CreateOrganizationUnitInput,
        actorScope?: { id: string; type: OrganizationUnitType; name: string } | null
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

            // If caller is non-FEDERAL, ensure the new unit is created under caller's hierarchy subtree
            if (actorScope.type !== "FEDERAL" && input.parentId) {
                const ancestors = await this.getAncestors(input.parentId);
                const isUnderCaller = input.parentId === actorScope.id || ancestors.some(a => a.id === actorScope.id);
                if (!isUnderCaller) {
                    throw new Error(`Forbidden: Cannot create organization unit outside your administrative scope (${actorScope.name}).`);
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

        return newUnit;
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
