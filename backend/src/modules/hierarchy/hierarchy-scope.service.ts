import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType, OrganizationUnit } from "../../generated/prisma/client.js";

export const TIER_RANK: Record<OrganizationUnitType, number> = {
    FEDERAL: 5,
    REGION: 4,
    ZONE: 3,
    WOREDA: 2,
    SCHOOL: 1,
};

export interface MinimalOrganizationUnit {
    id: string;
    name: string;
    type: OrganizationUnitType;
    parentId: string | null;
}

export interface AccessibleOrganizationScope {
    userId: string;
    currentOrganizationId: string;
    currentOrganizationType: OrganizationUnitType;
    currentOrganization: MinimalOrganizationUnit;
    accessibleOrganizationIds: string[];
    descendantSchoolIds: string[];
    lineage: MinimalOrganizationUnit[];
}

export class HierarchyScopeService {
    /**
     * Resolves all descendant school IDs beneath an organization unit.
     * Semantics:
     * - FEDERAL -> all schools under the Federal hierarchy
     * - REGION  -> all schools under that Region
     * - ZONE    -> all schools under that Zone
     * - WOREDA  -> all schools under that Woreda
     * - SCHOOL  -> [that school ID]
     * If an administrative unit has no descendant schools, returns [].
     */
    static async getDescendantSchoolIds(
        organizationId: string,
        organizationType?: OrganizationUnitType
    ): Promise<string[]> {
        if (!organizationId) return [];

        // Fast path: if organization is known to be SCHOOL, return [organizationId]
        if (organizationType === "SCHOOL") {
            return [organizationId];
        }

        // Single query to load all hierarchy units for efficient in-memory traversal
        const rawUnits = await prisma.organizationUnit.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
            },
        });
        const allUnits = rawUnits || [];

        const target = allUnits.find((u) => u.id === organizationId);
        if (!target) {
            return [];
        }

        if (target.type === "SCHOOL") {
            return [target.id];
        }

        // Build adjacency map: parentId -> children[]
        const childrenMap = new Map<string, MinimalOrganizationUnit[]>();
        for (const unit of allUnits) {
            if (unit.parentId) {
                const list = childrenMap.get(unit.parentId) || [];
                list.push(unit);
                childrenMap.set(unit.parentId, list);
            }
        }

        // BFS traversal
        const descendantSchoolIds: string[] = [];
        const queue: string[] = [organizationId];
        const visited = new Set<string>([organizationId]);

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const children = childrenMap.get(currentId) || [];

            for (const child of children) {
                if (!visited.has(child.id)) {
                    visited.add(child.id);
                    if (child.type === "SCHOOL") {
                        descendantSchoolIds.push(child.id);
                    }
                    queue.push(child.id);
                }
            }
        }

        return descendantSchoolIds;
    }

    /**
     * Resolves all accessible organization IDs (self + all descendants) for an organization.
     */
    static async getAccessibleOrganizationIds(
        organizationId: string,
        includeSelf: boolean = true
    ): Promise<string[]> {
        if (!organizationId) return [];

        const rawUnits = await prisma.organizationUnit.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
            },
        });
        const allUnits = rawUnits || [];

        const target = allUnits.find((u) => u.id === organizationId);
        if (!target) {
            return includeSelf ? [organizationId] : [];
        }

        const childrenMap = new Map<string, MinimalOrganizationUnit[]>();
        for (const unit of allUnits) {
            if (unit.parentId) {
                const list = childrenMap.get(unit.parentId) || [];
                list.push(unit);
                childrenMap.set(unit.parentId, list);
            }
        }

        const accessibleIds: string[] = includeSelf ? [organizationId] : [];
        const queue: string[] = [organizationId];
        const visited = new Set<string>([organizationId]);

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const children = childrenMap.get(currentId) || [];

            for (const child of children) {
                if (!visited.has(child.id)) {
                    visited.add(child.id);
                    accessibleIds.push(child.id);
                    queue.push(child.id);
                }
            }
        }

        return accessibleIds;
    }

    /**
     * Resolves the full ancestor lineage chain from the given organization up to the Federal root.
     * Returns: [currentOrg, parent, grandparent, ..., federalRoot]
     */
    static async getLineage(organizationId: string): Promise<MinimalOrganizationUnit[]> {
        if (!organizationId) return [];

        const rawUnits = await prisma.organizationUnit.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
            },
        });
        const allUnits = rawUnits || [];

        const unitMap = new Map<string, MinimalOrganizationUnit>();
        for (const u of allUnits) {
            unitMap.set(u.id, u);
        }

        const target = unitMap.get(organizationId);
        if (!target) return [];

        const lineage: MinimalOrganizationUnit[] = [target];
        const visited = new Set<string>([target.id]);
        let current = target;

        while (current.parentId) {
            if (visited.has(current.parentId)) break; // Cycle guard
            const parent = unitMap.get(current.parentId);
            if (!parent) break;

            visited.add(parent.id);
            lineage.push(parent);
            current = parent;
        }

        return lineage;
    }

    /**
     * Resolves the full hierarchical context for an authenticated user based on their
     * RoleAssignment and OrganizationUnit position in the canonical hierarchy.
     */
    static async getAccessibleOrganizationScope(userId: string): Promise<AccessibleOrganizationScope> {
        if (!userId) {
            throw new Error("User ID is required to resolve hierarchical scope");
        }

        // 1. Fetch user's role assignments with scope (OrganizationUnit)
        const assignments = await prisma.roleAssignment.findMany({
            where: { userId },
            include: {
                scope: true,
                role: true,
            },
        });

        if (!assignments || assignments.length === 0) {
            throw new Error("No authorized organizational scope found for user");
        }

        // 2. Select assignment with highest tier rank (FEDERAL > REGION > ZONE > WOREDA > SCHOOL)
        const sortedAssignments = [...assignments].sort((a, b) => {
            const rankA = TIER_RANK[a.scope.type] || 0;
            const rankB = TIER_RANK[b.scope.type] || 0;
            return rankB - rankA;
        });

        const primaryAssignment = sortedAssignments[0]!;
        const currentOrg = primaryAssignment.scope;

        // 3. Load all units in a single query for graph computation
        const allUnits = await prisma.organizationUnit.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
            },
        });

        const unitMap = new Map<string, MinimalOrganizationUnit>();
        const childrenMap = new Map<string, MinimalOrganizationUnit[]>();

        for (const u of allUnits) {
            unitMap.set(u.id, u);
            if (u.parentId) {
                const list = childrenMap.get(u.parentId) || [];
                list.push(u);
                childrenMap.set(u.parentId, list);
            }
        }

        // 4. Compute accessible organizations & descendant schools via BFS
        const accessibleOrganizationIds: string[] = [currentOrg.id];
        const descendantSchoolIds: string[] = [];

        if (currentOrg.type === "SCHOOL") {
            descendantSchoolIds.push(currentOrg.id);
        } else {
            const queue: string[] = [currentOrg.id];
            const visited = new Set<string>([currentOrg.id]);

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const children = childrenMap.get(currentId) || [];

                for (const child of children) {
                    if (!visited.has(child.id)) {
                        visited.add(child.id);
                        accessibleOrganizationIds.push(child.id);
                        if (child.type === "SCHOOL") {
                            descendantSchoolIds.push(child.id);
                        }
                        queue.push(child.id);
                    }
                }
            }
        }

        // 5. Compute lineage (currentOrg -> ... -> FEDERAL)
        const lineage: MinimalOrganizationUnit[] = [{
            id: currentOrg.id,
            name: currentOrg.name,
            type: currentOrg.type,
            parentId: currentOrg.parentId,
        }];

        const lineageVisited = new Set<string>([currentOrg.id]);
        let currMinimal = unitMap.get(currentOrg.id) || currentOrg;

        while (currMinimal.parentId) {
            if (lineageVisited.has(currMinimal.parentId)) break;
            const parent = unitMap.get(currMinimal.parentId);
            if (!parent) break;

            lineageVisited.add(parent.id);
            lineage.push(parent);
            currMinimal = parent;
        }

        return {
            userId,
            currentOrganizationId: currentOrg.id,
            currentOrganizationType: currentOrg.type,
            currentOrganization: {
                id: currentOrg.id,
                name: currentOrg.name,
                type: currentOrg.type,
                parentId: currentOrg.parentId,
            },
            accessibleOrganizationIds,
            descendantSchoolIds,
            lineage,
        };
    }

    /**
     * Validates whether a target organization is within an actor's authorized hierarchy.
     * Returns true if targetOrgId === actorOrgId OR targetOrgId is a descendant of actorOrgId.
     */
    static async isOrganizationInScope(actorOrgId: string, targetOrgId: string): Promise<boolean> {
        if (!actorOrgId || !targetOrgId) return false;
        if (actorOrgId === targetOrgId) return true;

        const accessibleIds = await this.getAccessibleOrganizationIds(actorOrgId, true);
        if (accessibleIds.includes(targetOrgId)) {
            return true;
        }

        // Fallback: check ancestor chain of targetOrgId upwards to actorOrgId
        try {
            let currentId: string | null = targetOrgId;
            const visited = new Set<string>();
            while (currentId) {
                if (visited.has(currentId)) break;
                visited.add(currentId);

                if (currentId === actorOrgId) return true;

                const unit: { parentId: string | null } | null = await prisma.organizationUnit.findUnique({
                    where: { id: currentId },
                    select: { parentId: true }
                });
                if (!unit || !unit.parentId) break;
                currentId = unit.parentId;
                if (currentId === actorOrgId) return true;
            }
        } catch {
            // Ignore fallback error
        }

        return false;
    }
}
