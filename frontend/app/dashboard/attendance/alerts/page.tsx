"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AttendanceAlertsRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/dashboard/attendance?tab=alerts");
    }, [router]);
    return null;
}
