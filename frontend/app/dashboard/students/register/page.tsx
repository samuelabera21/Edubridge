"use client";

import { ArrowLeft, UserPlus, ShieldCheck } from "lucide-react";
import { RegistrationForm } from "./components/RegistrationForm";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function StudentRegistrationPage() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/students/enrollments">
                        <Button variant="ghost" size="sm" className="px-2.5 text-gray-600 hover:text-gray-900" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                            Back to Ledger
                        </Button>
                    </Link>
                    <div className="h-6 w-px bg-gray-200" />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-[#4085b3]/10 text-[#4085b3]">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Official Intake Registry
                            </span>
                            <span className="text-xs text-gray-500">• Step 4 Enrollment</span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-[#4085b3]" />
                            Student Registration & Academic Intake
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Register new student identities or re-enroll returning students into the active academic year cohort.
                        </p>
                    </div>
                </div>
            </div>

            {/* Registration Form Component */}
            <RegistrationForm />
        </div>
    );
}
