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

        const allRoles: string[] = (authData.access || []).map((a: any) => a.role?.name).filter(Boolean);
        const hasTeacherRole = roleName === "TEACHER" || allRoles.includes("TEACHER");
        const hasAdminRole = ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "PRINCIPAL"].includes(roleName || "") || allRoles.some((r: string) => ["ADMIN", "SCHOOL_ADMIN", "ADMINISTRATOR", "PRINCIPAL"].includes(r));
        const hasStudentRole = roleName === "STUDENT" || allRoles.includes("STUDENT");
        const hasParentRole = roleName === "PARENT" || allRoles.includes("PARENT");
        const hasVicePrincipalRole = roleName === "VICE_PRINCIPAL" || allRoles.includes("VICE_PRINCIPAL");

        if (scopeType === "FEDERAL" || roleName === "FEDERAL_ADMIN") {
            router.replace("/dashboard/federal");
            return;
        }
        if (scopeType === "REGION" || roleName === "REGION_ADMIN") {
            router.replace("/dashboard/region");
            return;
        }
        if (scopeType === "ZONE" || roleName === "ZONE_ADMIN" || roleName === "ZONAL_ADMIN") {
            router.replace("/dashboard/zone");
            return;
        }
        if (scopeType === "WOREDA" || roleName === "WOREDA_ADMIN") {
            router.replace("/dashboard/woreda");
            return;
        }

        if (hasTeacherRole) {
            router.replace("/dashboard/teacher");
            return;
        }
        if (hasAdminRole) {
            router.replace("/dashboard/admin");
            return;
        }
        if (hasStudentRole) {
            router.replace("/dashboard/student");
            return;
        }
        if (hasParentRole) {
            router.replace("/dashboard/parent");
            return;
        }
        if (hasVicePrincipalRole) {
            router.replace("/dashboard/vice-principal");
            return;
        }

        if (hasAdminRole && scopeType === "SCHOOL") {
            router.replace("/dashboard/admin");
            return;
        }
        router.replace("/dashboard/teacher");
    }, [authData, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7] text-gray-700">
            <Loader2 className="h-8 w-8 animate-spin text-[#184973] mr-3" />
            <span className="text-sm font-medium">Redirecting to your dashboard...</span>
        </div>
    );
}
