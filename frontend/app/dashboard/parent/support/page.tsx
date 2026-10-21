"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    HeartHandshake,
    ShieldAlert,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ChevronDown,
    Check,
    ArrowLeft,
    Sparkles,
    UserCheck,
    GraduationCap,
    HelpCircle
} from "lucide-react";

function SupportContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams.get("tab") || "notifications";

    const [profile, setProfile] = useState<any>(null);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [earlyWarningFlags, setEarlyWarningFlags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        async function fetchProfileAndFlags() {
            try {
                setLoading(true);
                const [profRes, flagsRes] = await Promise.allSettled([
                    fetch("/api/parent/me"),
                    fetch("/api/support/early-warning")
                ]);

                if (profRes.status === "fulfilled" && profRes.value.ok) {
                    const data = await profRes.value.json();
                    setProfile(data);
                }

                if (flagsRes.status === "fulfilled" && flagsRes.value.ok) {
                    const flags = await flagsRes.value.json();
                    setEarlyWarningFlags(Array.isArray(flags) ? flags : []);
                }
            } catch (err) {
                console.error("Failed to load student support data", err);
            } finally {
                setLoading(false);
            }
        }
        fetchProfileAndFlags();
    }, []);

    const children = profile?.children || [];
    const hasChildren = children.length > 0;
    const currentStudent = hasChildren ? children[selectedChildIndex]?.student : null;
    const studentFullName = currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : "Student";

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Header Panel with Dropdown Student Selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm text-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/parent"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#184973] transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Dashboard
                        </Link>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <HeartHandshake className="w-7 h-7 text-emerald-600" />
                        Student Support & Interventions
                    </h1>
                    <p className="text-sm text-gray-500">
                        Individualized academic care, remedial programs, and guidance for {studentFullName}.
                    </p>
                </div>

                {/* Single Student Selector Dropdown Button */}
                {children.length > 0 && (
                    <div className="relative flex-shrink-0" ref={dropdownRef}>
                        <div className="text-xs text-gray-500 font-semibold mb-1.5 flex items-center justify-between">
                            <span>Active Student</span>
                            {children.length > 1 && (
                                <span className="text-[11px] text-[#184973] font-medium">
                                    {selectedChildIndex + 1} of {children.length}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full sm:w-auto min-w-[240px] flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-300 hover:border-[#184973] rounded-xl shadow-sm hover:shadow transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#184973]/20"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                    {currentStudent?.firstName?.[0] || "S"}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">
                                        {studentFullName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        ID: {currentStudent?.studentId || "N/A"}
                                    </div>
                                </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                        </button>

                        {isDropdownOpen && children.length > 1 && (
                            <div className="absolute right-0 mt-2 w-full sm:w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                                {children.map((child: any, idx: number) => {
                                    const s = child.student;
                                    const isSelected = idx === selectedChildIndex;
                                    return (
                                        <button
                                            key={s?.id || idx}
                                            onClick={() => {
                                                setSelectedChildIndex(idx);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors ${
                                                isSelected ? "bg-emerald-50/70 font-semibold text-emerald-800" : "text-gray-700"
                                            }`}
                                        >
                                            <div>
                                                <div>{s?.firstName} {s?.lastName}</div>
                                                <div className="text-xs text-gray-400">{s?.studentId}</div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 gap-6">
                <Link
                    href="/dashboard/parent/support"
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                        currentTab === "notifications"
                            ? "border-emerald-600 text-emerald-700"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <ShieldAlert className="w-4 h-4" />
                    Support Notifications & Alerts
                </Link>
                <Link
                    href="/dashboard/parent/support?tab=remedial"
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                        currentTab === "remedial"
                            ? "border-emerald-600 text-emerald-700"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <GraduationCap className="w-4 h-4" />
                    Remedial Programs & Mentorship
                </Link>
            </div>

            {/* Tailored Feature Overview Card */}
            <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 rounded-2xl border border-emerald-100 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                            <HeartHandshake className="w-7 h-7" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <Sparkles className="w-3.5 h-3.5" />
                                Proactive Academic Care
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                Student Academic & Behavioral Support Hub
                            </h2>
                            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
                                Access personalized support plans, remedial learning sessions, and early-intervention guidance. Our school's student support team collaborates directly with you to help {studentFullName} overcome challenges and thrive.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-emerald-100/80 pt-6">
                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-emerald-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4 text-emerald-600" />
                            Early Warning Monitoring
                        </div>
                        <p className="text-xs text-gray-600">
                            Automatic detection of sudden attendance drops or academic difficulties for rapid assistance.
                        </p>
                    </div>

                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-emerald-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-[#184973]" />
                            Remedial Class Schedules
                        </div>
                        <p className="text-xs text-gray-600">
                            Custom supplementary tutoring sessions organized by school subject specialists.
                        </p>
                    </div>

                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-emerald-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-teal-600" />
                            Direct Counselor Liaison
                        </div>
                        <p className="text-xs text-gray-600">
                            Direct line to request academic counseling or personalized behavior intervention support.
                        </p>
                    </div>
                </div>
            </div>

            {/* Status Summary Banner */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-bold text-gray-900">
                        {currentTab === "notifications" ? "No Active Early-Warning Flags" : "Remedial Program Status"}
                    </h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                        {studentFullName} is currently meeting academic requirements with no active critical alerts. When support interventions or extra tutoring sessions are scheduled, they will be tracked here.
                    </p>
                </div>
                <div className="pt-2 flex justify-center gap-3">
                    <Link
                        href="/dashboard/parent/attendance"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors shadow-xs"
                    >
                        Check Attendance Records
                    </Link>
                    <Link
                        href="/dashboard/parent/communication?tab=meetings"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                    >
                        Request Teacher Conference
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function SupportPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading student support...</div>}>
            <SupportContent />
        </Suspense>
    );
}
