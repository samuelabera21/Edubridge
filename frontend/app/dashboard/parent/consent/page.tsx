"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    CheckSquare,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    Check,
    ArrowLeft,
    FileCheck,
    Users,
    Sparkles,
    ShieldCheck,
    Send
} from "lucide-react";

function ConsentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams.get("tab") || "activities";

    const [profile, setProfile] = useState<any>(null);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
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
        async function fetchProfile() {
            try {
                setLoading(true);
                const res = await fetch("/api/parent/me");
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }
            } catch (err) {
                console.error("Failed to load parent profile", err);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
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
                        <CheckSquare className="w-7 h-7 text-amber-600" />
                        Consent & Approvals
                    </h1>
                    <p className="text-sm text-gray-500">
                        Review, sign, and authorize school activities and meeting requests for {studentFullName}.
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
                                <div className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
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
                                                isSelected ? "bg-amber-50/70 font-semibold text-amber-800" : "text-gray-700"
                                            }`}
                                        >
                                            <div>
                                                <div>{s?.firstName} {s?.lastName}</div>
                                                <div className="text-xs text-gray-400">{s?.studentId}</div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-amber-600" />}
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
                    href="/dashboard/parent/consent"
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                        currentTab === "activities"
                            ? "border-amber-600 text-amber-700"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <FileCheck className="w-4 h-4" />
                    Activity & Excursion Consent
                </Link>
                <Link
                    href="/dashboard/parent/consent?tab=meetings"
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                        currentTab === "meetings"
                            ? "border-amber-600 text-amber-700"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <Calendar className="w-4 h-4" />
                    Meeting Confirmations
                </Link>
            </div>

            {/* Tailored Feature Overview Card */}
            <div className="bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 rounded-2xl border border-amber-100 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                            <CheckSquare className="w-7 h-7" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                <Sparkles className="w-3.5 h-3.5" />
                                Official Parental Authorization
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                Parental Consent & Activity Approvals Hub
                            </h2>
                            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
                                Review, sign, and grant digital permission for school field trips, extracurricular activities, and special events. You can also accept or propose rescheduled times for Parent-Teacher conferences securely.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-amber-100/80 pt-6">
                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-amber-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            1-Click Digital Signatures
                        </div>
                        <p className="text-xs text-gray-600">
                            Legally compliant digital permission slips for school trips and athletic events.
                        </p>
                    </div>

                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-amber-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-[#184973]" />
                            Meeting RSVPs
                        </div>
                        <p className="text-xs text-gray-600">
                            Instant confirmation for teacher meetings and virtual consultation appointments.
                        </p>
                    </div>

                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-amber-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-emerald-600" />
                            Approval History
                        </div>
                        <p className="text-xs text-gray-600">
                            Complete historical archive of all granted consents with timestamps for peace of mind.
                        </p>
                    </div>
                </div>
            </div>

            {/* Interactive Preview State */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-bold text-gray-900">
                        {currentTab === "activities" ? "No Pending Consent Forms" : "No Pending Meeting Requests"}
                    </h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                        All required school permissions for {studentFullName} are up to date. When the school initiates a new field trip or requests meeting confirmation, it will appear here for your immediate approval.
                    </p>
                </div>
                <div className="pt-2">
                    <Link
                        href="/dashboard/parent/communication?tab=meetings"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#184973] hover:bg-[#123859] text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                    >
                        Schedule a Parent-Teacher Meeting
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ConsentPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading consent and approvals...</div>}>
            <ConsentContent />
        </Suspense>
    );
}
