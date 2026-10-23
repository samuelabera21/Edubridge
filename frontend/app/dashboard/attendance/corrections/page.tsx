"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AttendanceCorrectionsRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/dashboard/attendance?tab=corrections");
    }, [router]);
    return null;
}
