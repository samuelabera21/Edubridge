"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AttendanceStudentRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/dashboard/attendance?tab=students");
    }, [router]);
    return null;
}
