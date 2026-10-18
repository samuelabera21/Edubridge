export interface UserAccess {
    role?: { name?: string };
    scope?: { id?: string; name?: string; type?: string };
    createdAt?: string | Date;
}

const hierarchyRanks: Record<string, number> = {
    FEDERAL: 5,
    REGION: 4,
    ZONE: 3,
    WOREDA: 2,
};

const hierarchyAdminRoles = new Set([
    "ADMIN",
    "ADMINISTRATOR",
    "FEDERAL_ADMIN",
    "REGION_ADMIN",
    "ZONE_ADMIN",
    "ZONAL_ADMIN",
    "WOREDA_ADMIN",
]);

export function isHierarchyAdminAccess(access?: UserAccess): boolean {
    return Boolean(
        access &&
        hierarchyAdminRoles.has(access.role?.name || "") &&
        hierarchyRanks[access.scope?.type || ""] !== undefined
    );
}

export function getPrimaryAccess(access?: UserAccess[] | null): UserAccess | undefined {
    if (!access?.length) return undefined;

    const hierarchyAccess = access
        .filter(isHierarchyAdminAccess)
        .sort((left, right) => {
            const rankDifference = hierarchyRanks[right.scope?.type || ""] - hierarchyRanks[left.scope?.type || ""];
            if (rankDifference !== 0) return rankDifference;

            const leftCreatedAt = left.createdAt ? new Date(left.createdAt).getTime() : 0;
            const rightCreatedAt = right.createdAt ? new Date(right.createdAt).getTime() : 0;
            return rightCreatedAt - leftCreatedAt;
        });

    return hierarchyAccess[0] || access[0];
}