"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AttendanceOverviewRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/dashboard/attendance?tab=overview");
    }, [router]);
    return null;
}
