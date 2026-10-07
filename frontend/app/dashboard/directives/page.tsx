"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DirectivesRecipientView from "../../../components/governance/DirectivesRecipientView";
import { useAuth } from "../../../hooks/useAuth";

export default function DirectivesPage() {
    const router = useRouter();
    const { authData, loading } = useAuth();

    const activeScope = authData?.access?.[0]?.scope;
    const roleName = authData?.access?.[0]?.role?.name || "";
    const unitName = activeScope?.name || "Institution";
    const unitType = (activeScope?.type || "SCHOOL") as any;

    useEffect(() => {
        if (loading) return;

        if (unitType === "REGION" || roleName === "REGION_ADMIN") {
            router.replace("/dashboard/region?tab=directives");
        } else if (unitType === "ZONE" || roleName === "ZONE_ADMIN") {
            router.replace("/dashboard/zone?tab=directives");
        } else if (unitType === "WOREDA" || roleName === "WOREDA_ADMIN") {
            router.replace("/dashboard/woreda?tab=directives");
        } else if (unitType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
            router.replace("/dashboard/federal?tab=directives");
        } else if (roleName === "TEACHER") {
            router.replace("/dashboard/teacher/communication/staff");
        } else if (roleName === "STUDENT") {
            router.replace("/dashboard/student/communication");
        }
    }, [unitType, roleName, loading, router]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <DirectivesRecipientView
                tierName={unitName}
                tierType={unitType}
                organizationId={activeScope?.id}
            />
        </div>
    );
}
