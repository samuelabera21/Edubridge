"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProgramsRegistryView from "../../../components/governance/ProgramsRegistryView";
import { useAuth } from "../../../hooks/useAuth";
import { getPrimaryAccess } from "../../../lib/auth-access";

export default function ProgramsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { authData, loading } = useAuth();

    const primaryAccess = getPrimaryAccess(authData?.access);
    const activeScope = primaryAccess?.scope;
    const roleName = primaryAccess?.role?.name || "";
    const unitName = activeScope?.name || "Institution";
    const unitType = (activeScope?.type || "SCHOOL") as "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";

    const programId = searchParams?.get("programId") || searchParams?.get("id");
    const programTitle = searchParams?.get("programTitle");

    const queryParams = new URLSearchParams();
    if (programId) queryParams.set("programId", programId);
    if (programTitle) queryParams.set("programTitle", programTitle);
    const queryString = queryParams.toString() ? `&${queryParams.toString()}` : "";

    useEffect(() => {
        if (loading) return;

        if (unitType === "REGION" || roleName === "REGION_ADMIN") {
            router.replace(`/dashboard/region?tab=programs${queryString}`);
        } else if (unitType === "ZONE" || roleName === "ZONE_ADMIN") {
            router.replace(`/dashboard/zone?tab=programs${queryString}`);
        } else if (unitType === "WOREDA" || roleName === "WOREDA_ADMIN") {
            router.replace(`/dashboard/woreda?tab=programs${queryString}`);
        } else if (unitType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
            router.replace(`/dashboard/federal?tab=programs${queryString}`);
        }
    }, [unitType, roleName, loading, router, queryString]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <ProgramsRegistryView
                tierName={unitName}
                tierType={unitType}
                organizationId={activeScope?.id}
                canCreateProgram={unitType !== "SCHOOL"}
                initialProgramId={programId}
                initialProgramTitle={programTitle}
            />
        </div>
    );
}
