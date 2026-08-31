"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../../lib/api";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();

    return (
        <div className="w-full text-black text-center py-6 space-y-6">
            <h1 className="text-3xl font-bold">Registration Notice</h1>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm leading-relaxed max-w-sm mx-auto">
                <p className="font-semibold mb-1">Public Self-Registration Disabled</p>
                <p className="text-xs text-amber-800">
                    EduBridge account creation is strictly managed by your School Administrator. Please contact your institution's administrator to obtain your provisioned username and initial password.
                </p>
            </div>

            <div>
                <button
                    onClick={() => router.push("/login")}
                    className="w-full bg-[#4085b3] text-white p-2.5 rounded-md font-medium hover:bg-[#32698e] transition-colors shadow-2xs"
                >
                    Return to Login
                </button>
            </div>
        </div>
    );
}
