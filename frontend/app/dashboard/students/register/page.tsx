"use client";

import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, ArrowLeft } from "lucide-react";
import { RegistrationForm } from "./components/RegistrationForm";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function StudentRegistrationPage() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/students/enrollments">
                        <Button variant="ghost" className="px-2" leftIcon={<ArrowLeft className="w-5 h-5" />}>
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <GraduationCap className="w-7 h-7 mr-2 text-[#006b3f]" />
                            Student Registration
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">Register a new student identity and enroll them into the active academic year.</p>
                    </div>
                </div>
            </div>

            {/* Registration Form */}
            <RegistrationForm />
        </div>
    );
}
