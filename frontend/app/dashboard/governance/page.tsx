"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../hooks/useAuth";

export default function GovernanceRedirectPage() {
    const router = useRouter();
    const { authData } = useAuth(false);

    useEffect(() => {
        const orgType = (authData?.access?.[0] as any)?.organization?.type || (authData?.user as any)?.organizationType;
        if (orgType === "FEDERAL") {
            router.replace("/dashboard/federal");
        } else if (orgType === "REGION") {
            router.replace("/dashboard/region");
        } else if (orgType === "ZONE") {
            router.replace("/dashboard/zone");
        } else if (orgType === "WOREDA") {
            router.replace("/dashboard/woreda");
        } else {
            router.replace("/dashboard");
        }
    }, [authData, router]);

    return (
        <div className="p-8 text-center text-sm text-gray-500">
            Redirecting to authorized administrative tier dashboard...
        </div>
    );
}
