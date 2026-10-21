"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DirectivesRegistryView from "../../../components/governance/DirectivesRegistryView";
import { useAuth } from "../../../hooks/useAuth";

export default function DirectivesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { authData, loading } = useAuth();

    const activeScope = authData?.access?.[0]?.scope;
    const roleName = authData?.access?.[0]?.role?.name || "";
    const unitName = activeScope?.name || "Institution";
    const unitType = (activeScope?.type || "SCHOOL") as any;

    const directiveId = searchParams?.get("directiveId") || searchParams?.get("id");
    const directiveParam = directiveId ? `&directiveId=${directiveId}` : "";

    useEffect(() => {
        if (loading) return;

        if (unitType === "REGION" || roleName === "REGION_ADMIN") {
            router.replace(`/dashboard/region?tab=directives${directiveParam}`);
        } else if (unitType === "ZONE" || roleName === "ZONE_ADMIN") {
            router.replace(`/dashboard/zone?tab=directives${directiveParam}`);
        } else if (unitType === "WOREDA" || roleName === "WOREDA_ADMIN") {
            router.replace(`/dashboard/woreda?tab=directives${directiveParam}`);
        } else if (unitType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
            router.replace(`/dashboard/federal?tab=directives${directiveParam}`);
        } else if (roleName === "TEACHER") {
            router.replace(`/dashboard/teacher/communication/staff${directiveParam}`);
        } else if (roleName === "STUDENT") {
            router.replace(`/dashboard/student/communication${directiveParam}`);
        }
    }, [unitType, roleName, loading, router, directiveParam]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            <DirectivesRegistryView
                tierName={unitName}
                tierType={unitType}
                organizationId={activeScope?.id}
                canCreateDirective={unitType !== "SCHOOL"}
                initialDirectiveId={directiveId}
            />
        </div>
    );
}
