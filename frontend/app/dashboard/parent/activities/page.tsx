"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    BookOpen,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    Check,
    ArrowLeft,
    FileText,
    Sparkles,
    Filter,
    FolderKanban,
    Award
} from "lucide-react";

function ActivitiesContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams.get("tab") || "assignments";

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
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#4085b3] transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Dashboard
                        </Link>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <BookOpen className="w-7 h-7 text-[#4085b3]" />
                        Learning Activities
                    </h1>
                    <p className="text-sm text-gray-500">
                        Monitor assignments, project submissions, and study milestones for {studentFullName}.
                    </p>
                </div>

                {/* Single Student Selector Dropdown Button */}
                {children.length > 0 && (
                    <div className="relative flex-shrink-0" ref={dropdownRef}>
                        <div className="text-xs text-gray-500 font-semibold mb-1.5 flex items-center justify-between">
                            <span>Active Student</span>
                            {children.length > 1 && (
                                <span className="text-[11px] text-[#4085b3] font-medium">
                                    {selectedChildIndex + 1} of {children.length}
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full sm:w-auto min-w-[240px] flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-300 hover:border-[#4085b3] rounded-xl shadow-sm hover:shadow transition-all text-left focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#4085b3] text-white flex items-center justify-center text-sm font-bold shadow-sm">
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
                                                isSelected ? "bg-blue-50/70 font-semibold text-[#4085b3]" : "text-gray-700"
                                            }`}
                                        >
                                            <div>
                                                <div>{s?.firstName} {s?.lastName}</div>
                                                <div className="text-xs text-gray-400">{s?.studentId}</div>
                                            </div>
                                            {isSelected && <Check className="w-4 h-4 text-[#4085b3]" />}
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
                    href="/dashboard/parent/activities"
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                        currentTab === "assignments"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <FolderKanban className="w-4 h-4" />
                    Upcoming Assignments
                </Link>
                <Link
                    href="/dashboard/parent/activities?tab=deadlines"
                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
                        currentTab === "deadlines"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    Deadlines & Submission Status
                </Link>
            </div>

            {/* Tailored Feature Overview Card */}
            <div className="bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/40 rounded-2xl border border-blue-100 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#4085b3] text-white flex items-center justify-center flex-shrink-0 shadow-md">
                            <BookOpen className="w-7 h-7" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-[#4085b3]">
                                <Sparkles className="w-3.5 h-3.5" />
                                Feature in Active Rollout
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                                Child Learning Activities & Homework Hub
                            </h2>
                            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
                                Track upcoming homework assignments, project milestones, and class exercises for your child. Stay informed on due dates, teacher instructions, and assignment completion status in real-time.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-blue-100/80 pt-6">
                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-blue-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-[#4085b3]" />
                            Live Assignment Tracker
                        </div>
                        <p className="text-xs text-gray-600">
                            Automatic sync with classroom teachers' scheduled lessons and homework tasks.
                        </p>
                    </div>

                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-blue-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-600" />
                            Deadline Alerts
                        </div>
                        <p className="text-xs text-gray-600">
                            Receive notifications before homework due dates to help support your child's study schedule.
                        </p>
                    </div>

                    <div className="p-4 bg-white/80 backdrop-blur rounded-xl border border-blue-100/60 shadow-xs">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-emerald-600" />
                            Teacher Feedback
                        </div>
                        <p className="text-xs text-gray-600">
                            Read individual teacher comments and grades upon assignment evaluation.
                        </p>
                    </div>
                </div>
            </div>

            {/* Interactive Preview State */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#4085b3] flex items-center justify-center mx-auto">
                    <FolderKanban className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-bold text-gray-900">
                        {currentTab === "assignments" ? "Upcoming Classroom Tasks" : "Submission Timeline"}
                    </h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                        Classroom teachers are currently setting up digital learning modules for {studentFullName}'s section. Verified homework tasks and assessment deadlines will appear here automatically.
                    </p>
                </div>
                <div className="pt-2">
                    <Link
                        href="/dashboard/parent/academics"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#4085b3] text-white text-xs font-semibold rounded-xl hover:bg-[#32698e] transition-colors shadow-sm"
                    >
                        View Published Academic Results
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ActivitiesPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading learning activities...</div>}>
            <ActivitiesContent />
        </Suspense>
    );
}
