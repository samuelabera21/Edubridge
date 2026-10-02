"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
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

        const primaryAccess = authData.access?.[0];
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
                router.replace("/dashboard/federal");
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
