"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ActivitiesRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard/teacher");
    }, [router]);

    return (
        <div className="w-full max-w-md mx-auto p-12 text-center text-gray-500 min-h-[300px] flex flex-col justify-center items-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-[#4085b3]/20 border-t-[#4085b3] animate-spin"></div>
            <p className="text-sm font-bold text-gray-700">Redirecting to Teacher Dashboard...</p>
            <p className="text-xs text-gray-400">Learning activities are not in scope.</p>
        </div>
    );
}
