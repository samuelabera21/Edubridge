"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AttendanceTeacherRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/dashboard/attendance");
    }, [router]);
    return null;
}
