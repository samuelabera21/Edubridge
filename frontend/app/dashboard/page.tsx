"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { getPrimaryAccess } from "@/lib/auth-access";
import { Loader2 } from "lucide-react";

export default function DashboardRootPage() {
    const { authData, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!authData) {
            router.replace("/login");
            return;
        }

        const primaryAccess = getPrimaryAccess(authData.access);
        const roleName = primaryAccess?.role?.name;
        const scopeType = primaryAccess?.scope?.type;

        if (scopeType === "FEDERAL") {
            router.replace("/dashboard/federal");
            return;
        }
        if (scopeType === "REGION") {
            router.replace("/dashboard/region");
            return;
        }
        if (scopeType === "ZONE") {
            router.replace("/dashboard/zone");
            return;
        }
        if (scopeType === "WOREDA") {
            router.replace("/dashboard/woreda");
            return;
        }

        switch (roleName) {
            case "FEDERAL_ADMIN":
                router.replace("/dashboard/federal");
                return;
            case "REGION_ADMIN":
                router.replace("/dashboard/region");
                return;
            case "ZONE_ADMIN":
            case "ZONAL_ADMIN":
                router.replace("/dashboard/zone");
                return;
            case "WOREDA_ADMIN":
                router.replace("/dashboard/woreda");
                return;
            case "TEACHER":
                router.replace("/dashboard/teacher");
                return;
            case "STUDENT":
                router.replace("/dashboard/student");
                return;
            case "PARENT":
                router.replace("/dashboard/parent");
                return;
            case "VICE_PRINCIPAL":
                router.replace("/dashboard/vice-principal");
                return;
            case "ADMIN":
            case "SCHOOL_ADMIN":
            case "ADMINISTRATOR":
            case "PRINCIPAL":
                router.replace("/dashboard/admin");
                return;
            default:
                if (scopeType === "SCHOOL") {
                    router.replace("/dashboard/admin");
                } else if (scopeType === "FEDERAL") {
                    router.replace("/dashboard/federal");
                } else {
                    router.replace("/dashboard/admin");
                }
                return;
        }
    }, [authData, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-gray-700">
            <Loader2 className="h-8 w-8 animate-spin text-[#184973] mr-3" />
            <span className="text-sm font-medium">Redirecting to your dashboard...</span>
        </div>
    );
}
