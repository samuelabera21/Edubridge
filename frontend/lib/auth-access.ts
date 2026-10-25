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

export function getDashboardPath(meData: any): string {
    if (meData?.requiresPasswordChange || meData?.user?.requiresPasswordChange) {
        return "/change-password";
    }

    const primaryAccess = getPrimaryAccess(meData?.access);
    const roleName = primaryAccess?.role?.name;
    const scopeType = primaryAccess?.scope?.type;

    if (scopeType === "FEDERAL") return "/dashboard/federal";
    if (scopeType === "REGION") return "/dashboard/region";
    if (scopeType === "ZONE") return "/dashboard/zone";
    if (scopeType === "WOREDA") return "/dashboard/woreda";

    switch (roleName) {
        case "ADMIN":
        case "SCHOOL_ADMIN":
        case "ADMINISTRATOR":
            return "/dashboard/admin";
        case "TEACHER":
            return "/dashboard/teacher";
        case "STUDENT":
            return "/dashboard/student";
        case "PARENT":
            return "/dashboard/parent";
        case "VICE_PRINCIPAL":
            return "/dashboard/vice-principal";
        default:
            return "/dashboard/federal";
    }
}