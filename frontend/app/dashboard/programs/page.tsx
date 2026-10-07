"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ProgramsRegistryView from "../../../components/governance/ProgramsRegistryView";
import { useAuth } from "../../../hooks/useAuth";

export default function ProgramsPage() {
    const router = useRouter();
    const { authData, loading } = useAuth();

    const activeScope = authData?.access?.[0]?.scope;
    const roleName = authData?.access?.[0]?.role?.name || "";
    const unitName = activeScope?.name || "Institution";
    const unitType = (activeScope?.type || "SCHOOL") as "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";

    useEffect(() => {
        if (loading) return;

        if (unitType === "REGION" || roleName === "REGION_ADMIN") {
            router.replace("/dashboard/region?tab=programs");
        } else if (unitType === "ZONE" || roleName === "ZONE_ADMIN") {
            router.replace("/dashboard/zone?tab=programs");
        } else if (unitType === "WOREDA" || roleName === "WOREDA_ADMIN") {
            router.replace("/dashboard/woreda?tab=programs");
        } else if (unitType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
            router.replace("/dashboard/federal?tab=programs");
        }
    }, [unitType, roleName, loading, router]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <ProgramsRegistryView
                tierName={unitName}
                tierType={unitType}
                canCreateProgram={unitType !== "SCHOOL"}
            />
        </div>
    );
}
