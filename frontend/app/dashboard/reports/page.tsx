"use client";

import HierarchicalReportsView from "../../../components/governance/HierarchicalReportsView";
import { useAuth } from "../../../hooks/useAuth";

export default function ReportsPage() {
    const { authData, loading } = useAuth();

    const activeScope = authData?.access?.[0]?.scope;
    const unitName = activeScope?.name || "Institution";
    const unitType = (activeScope?.type || "FEDERAL") as "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <HierarchicalReportsView
                tierName={unitName}
                tierType={unitType}
            />
        </div>
    );
}
