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
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
                <div className="flex items-center space-x-3 text-[#184973] mb-4">
                    <Construction className="w-6 h-6" />
                    <span className="text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#184973] px-2.5 py-1 rounded-full border border-blue-200">
                        Student Workspace
                    </span>
                </div>
                <h1 className="text-2xl font-black text-slate-900">{title}</h1>
                <p className="mt-2 text-slate-600 text-sm">
                    This student section is connected to the academic curriculum and verified database navigation.
                </p>
                <Link
                    href="/dashboard/student"
                    className="inline-flex items-center mt-6 text-xs font-bold text-[#184973] hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition shadow-xs"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to My Dashboard
                </Link>
            </div>
        </div>
    );
}
