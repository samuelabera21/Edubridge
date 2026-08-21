"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Construction } from "lucide-react";

const sectionTitles: Record<string, string> = {
    profile: "My Profile",
    classes: "My Classes",
    timetable: "Timetable",
    attendance: "My Attendance",
    assessments: "My Assessments",
    learning: "My Learning Activities",
    support: "My Support",
    communication: "Communication",
    resources: "Learning Resources",
    assistant: "AI Study Assistant",
    notifications: "Notifications",
};

export default function StudentSectionPage() {
    const params = useParams<{ path: string[] }>();
    const section = params.path?.[0] || "student";
    const title = sectionTitles[section] || "Student Workspace";

    return (
        <div className="w-full max-w-6xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <div className="flex items-center space-x-3 text-[#006b3f] mb-4">
                    <Construction className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase tracking-wide">Student workspace</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="mt-2 text-gray-600">
                    This student section is connected to the SRS navigation and ready for its feature implementation.
                </p>
                <Link
                    href="/dashboard/student"
                    className="inline-flex items-center mt-6 text-sm font-semibold text-[#006b3f] hover:text-emerald-800"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to My Dashboard
                </Link>
            </div>
        </div>
    );
}
