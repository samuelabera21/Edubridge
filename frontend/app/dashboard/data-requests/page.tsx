"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DataRequestsListView from "../../../components/governance/DataRequestsListView";
import { useAuth } from "../../../hooks/useAuth";

export default function DataRequestsPage() {
    const router = useRouter();
    const { authData, loading } = useAuth();

    const activeScope = authData?.access?.[0]?.scope;
    const roleName = authData?.access?.[0]?.role?.name || "";
    const unitType = (activeScope?.type || "SCHOOL") as "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";

    useEffect(() => {
        if (loading) return;

        if (unitType === "REGION" || roleName === "REGION_ADMIN") {
            router.replace("/dashboard/region?tab=data-requests");
        } else if (unitType === "ZONE" || roleName === "ZONE_ADMIN") {
            router.replace("/dashboard/zone?tab=data-requests");
        } else if (unitType === "WOREDA" || roleName === "WOREDA_ADMIN") {
            router.replace("/dashboard/woreda?tab=data-requests");
        } else if (unitType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
            router.replace("/dashboard/federal?tab=data-requests");
        }
    }, [unitType, roleName, loading, router]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <DataRequestsListView currentTier={unitType} />
        </div>
    );
}
