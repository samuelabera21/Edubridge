"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { 
    ClipboardCheck, 
    Calendar, 
    Clock, 
    AlertTriangle, 
    ShieldAlert, 
    CheckCircle2, 
    XCircle, 
    Users, 
    Building2, 
    FileText, 
    HelpCircle, 
    ArrowUpRight,
    Search,
    Filter,
    Info,
    CalendarDays,
    ChevronDown,
    Check
} from "lucide-react";

function ParentAttendanceContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams.get("tab") || "overview";

    const [profile, setProfile] = useState<any>(null);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [attendanceData, setAttendanceData] = useState<any>(null);
    const [earlyWarningFlags, setEarlyWarningFlags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [attLoading, setAttLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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

    // Initial load: parent profile + early warning
    useEffect(() => {
        async function loadInitialData() {
            try {
                setLoading(true);
                const [profRes, flagsRes] = await Promise.allSettled([
                    fetchApi("/parent/me"),
                    fetchApi("/support/early-warning")
                ]);

                if (profRes.status === "fulfilled" && profRes.value.ok) {
                    const data = await profRes.value.json();
                    setProfile(data);
                } else {
                    throw new Error("Failed to load parent profile");
                }

                if (flagsRes.status === "fulfilled" && flagsRes.value.ok) {
                    const flags = await flagsRes.value.json();
                    setEarlyWarningFlags(Array.isArray(flags) ? flags : []);
                }
            } catch (err: any) {
                console.error("Failed to load parent attendance data:", err);
                setError(err.message || "Failed to load data.");
            } finally {
                setLoading(false);
            }
        }

        loadInitialData();
    }, []);

    const children = profile?.children || [];
    const hasChildren = children.length > 0;
    const currentChildRelation = hasChildren ? children[selectedChildIndex] : null;
    const currentStudent = currentChildRelation?.student;

    // Load attendance for selected student
    useEffect(() => {
        if (!currentStudent?.id) return;

        async function loadChildAttendance() {
            try {
                setAttLoading(true);
                const res = await fetchApi(`/parent/children/${currentStudent.id}/attendance`);
                if (res.ok) {
                    const data = await res.json();
                    setAttendanceData(data);
                } else {
                    setAttendanceData(null);
                }
            } catch (err) {
                console.error("Child attendance load error:", err);
                setAttendanceData(null);
            } finally {
                setAttLoading(false);
            }
        }

        loadChildAttendance();
    }, [currentStudent?.id]);

    const setTab = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === "overview") {
            params.delete("tab");
        } else {
            params.set("tab", tab);
        }
        router.push(`/dashboard/parent/attendance?${params.toString()}`);
    };

    if (loading) {
        return (
            <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse">
                <div className="h-28 bg-gray-200 rounded-2xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="h-24 bg-gray-100 rounded-xl" />
                    <div className="h-24 bg-gray-100 rounded-xl" />
                    <div className="h-24 bg-gray-100 rounded-xl" />
                    <div className="h-24 bg-gray-100 rounded-xl" />
                </div>
                <div className="h-64 bg-gray-100 rounded-2xl" />
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="w-full max-w-5xl mx-auto p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 shrink-0 text-red-600" />
                <div>
                    <h3 className="font-bold text-sm">Unable to load attendance</h3>
                    <p className="text-xs text-red-600 mt-0.5">{error || "Please verify your parent account connection."}</p>
                </div>
            </div>
        );
    }

    if (!currentStudent) {
        return (
            <div className="w-full max-w-5xl mx-auto p-8 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-center space-y-3">
                <Users className="w-12 h-12 mx-auto text-amber-600 opacity-60" />
                <h3 className="font-bold text-base">No Linked Student Found</h3>
                <p className="text-xs text-amber-700 max-w-md mx-auto">
                    There is currently no student linked to your account. Please contact the school administration to link your student profile.
                </p>
            </div>
        );
    }

    // Attendance stats
    const stats = attendanceData?.stats || {
        totalSessions: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        excusedCount: 0,
        attendanceRate: 100,
        consecutiveAbsences: 0,
        isAtRisk: false
    };

    const records: any[] = attendanceData?.records || [];
    const absentOrLateRecords = records.filter(r => r.status === "ABSENT" || r.status === "LATE" || r.status === "EXCUSED");

    // Early warning flag for child
    const childEarlyWarning = earlyWarningFlags.find((f: any) => f.studentId === currentStudent.id);
    const isBelowMoEThreshold = stats.totalSessions > 0 && stats.attendanceRate < 80;
    const hasConsecutiveAbsences = stats.consecutiveAbsences >= 3;
    const isCritical = isBelowMoEThreshold || hasConsecutiveAbsences;

    const studentFullName = `${currentStudent.firstName} ${currentStudent.lastName}`;

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6">
            {/* Header Panel with Dropdown Student Selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm text-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                        Attendance
                    </h1>
                </div>

                {/* Single Student Selector Dropdown Button */}
                {hasChildren && (
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
                                <div className="w-9 h-9 rounded-full bg-[#184973] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                                    {currentStudent.firstName?.charAt(0) || "S"}
                                </div>
                                <div className="leading-tight">
                                    <div className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                                        {currentStudent.firstName} {currentStudent.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                        {currentStudent.enrollments?.[0]?.schoolGrade?.grade?.name || "Grade"} {currentStudent.enrollments?.[0]?.section?.name ? `• Sec ${currentStudent.enrollments[0].section.name}` : ""}
                                    </div>
                                </div>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                <div className="px-3.5 py-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                    Select Linked Child ({children.length})
                                </div>
                                <div className="max-h-72 overflow-y-auto py-1 divide-y divide-gray-50">
                                    {children.map((rel: any, idx: number) => {
                                        const isSelected = selectedChildIndex === idx;
                                        const ch = rel.student;
                                        const chEnrollment = ch?.enrollments?.[0];
                                        const gName = chEnrollment?.schoolGrade?.grade?.name || "";
                                        const sName = chEnrollment?.section?.name ? `Sec ${chEnrollment.section.name}` : "";

                                        return (
                                            <button
                                                key={ch?.id || idx}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedChildIndex(idx);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors ${
                                                    isSelected ? "bg-blue-50/70 text-[#184973]" : "hover:bg-gray-50 text-gray-800"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        isSelected ? "bg-[#184973] text-white" : "bg-gray-100 text-gray-700"
                                                    }`}>
                                                        {ch?.firstName?.charAt(0) || "S"}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                            {ch?.firstName} {ch?.lastName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {ch?.studentId || "STU-ID"} {gName ? `• ${gName}` : ""} {sName ? `• ${sName}` : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <Check className="w-4 h-4 text-[#184973] flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MoE 80% Rule Alert Banner */}
            {isCritical && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-950 shadow-sm flex items-start gap-4">
                    <div className="p-3 bg-rose-200 text-rose-800 rounded-xl shrink-0 mt-0.5">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-rose-900">
                                Critical Attendance Alert
                            </h3>
                            <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                                Urgent
                            </span>
                        </div>
                        <p className="text-xs text-rose-800 leading-relaxed">
                            {isBelowMoEThreshold && (
                                <span>
                                    The student's overall attendance rate is <strong>{stats.attendanceRate}%</strong>. Under Ministry of Education regulations, students with attendance below 80% may not sit for semester examinations.{" "}
                                </span>
                            )}
                            {hasConsecutiveAbsences && (
                                <span>
                                    The student has been absent for <strong>{stats.consecutiveAbsences}</strong> consecutive days. Please contact the school administration immediately.
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            )}

            {/* Key Attendance Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-gray-500 text-[11px] font-semibold block">Total Sessions</span>
                    <p className="text-xl font-bold text-gray-900">{stats.totalSessions}</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present
                    </span>
                    <p className="text-xl font-bold text-emerald-800">{stats.presentCount}</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-rose-700 text-[11px] font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Absent
                    </span>
                    <p className="text-xl font-bold text-rose-800">{stats.absentCount}</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-amber-700 text-[11px] font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Late
                    </span>
                    <p className="text-xl font-bold text-amber-800">{stats.lateCount}</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-blue-700 text-[11px] font-semibold flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Excused
                    </span>
                    <p className="text-xl font-bold text-blue-800">{stats.excusedCount}</p>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-purple-700 text-[11px] font-semibold block">Consecutive Absences</span>
                    <p className="text-xl font-bold text-purple-900">{stats.consecutiveAbsences} days</p>
                </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setTab("overview")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "overview"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Attendance Overview</span>
                </button>

                <button
                    onClick={() => setTab("records")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "records"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Absence & Late Records ({absentOrLateRecords.length})</span>
                </button>

                <button
                    onClick={() => setTab("alerts")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "alerts"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Attendance Alerts & Ministry Rules</span>
                </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {currentTab === "overview" && (
                <div className="space-y-6">
                    {/* Rate progress & policy info */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 text-[#184973]" />
                                <span>Semester Attendance Progress</span>
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">
                                Minimum Required: <strong className="text-gray-900">80%</strong>
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold">
                                <span className="text-gray-600">Actual Attendance: {stats.attendanceRate}%</span>
                                <span className={stats.attendanceRate >= 80 ? "text-emerald-700" : "text-rose-700"}>
                                    {stats.attendanceRate >= 80 ? "Compliant" : "Needs Improvement"}
                                </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        stats.attendanceRate >= 80 ? "bg-emerald-500" : stats.attendanceRate >= 70 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(0, stats.attendanceRate))}%` }}
                                />
                            </div>
                        </div>

                        {/* Ministry Guideline Note */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-600 leading-relaxed flex items-start gap-2.5">
                            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>
                                <strong>MoE Attendance Regulation:</strong> According to Ministry of Education regulations, students must maintain at least 80% classroom attendance throughout the semester to be eligible for semester examinations. All absences must be formally reported with valid documentation.
                            </span>
                        </div>
                    </div>

                    {/* All Session Records Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[#184973]" />
                                <span>Recent Attendance Log</span>
                            </h3>
                            <span className="text-xs text-gray-500">{records.length} records</span>
                        </div>

                        {attLoading ? (
                            <div className="py-12 text-center text-xs text-gray-500 animate-pulse">
                                Loading attendance records...
                            </div>
                        ) : records.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-xs">
                                No attendance sessions recorded yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                                        <tr>
                                            <th className="py-3 px-4">Date</th>
                                            <th className="py-3 px-4">Session</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">Remarks</th>
                                            <th className="py-3 px-4">Recorded By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                        {records.slice(0, 15).map((rec: any, idx: number) => {
                                            const isPresent = rec.status === "PRESENT";
                                            const isAbsent = rec.status === "ABSENT";
                                            const isLate = rec.status === "LATE";
                                            const isExcused = rec.status === "EXCUSED";

                                            return (
                                                <tr key={rec.id || idx} className="hover:bg-gray-50/80 transition-colors">
                                                    <td className="py-3 px-4 font-medium text-gray-900 font-mono">
                                                        {rec.date ? new Date(rec.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-600">
                                                        {rec.classPeriodName || "Daily Homeroom"}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        {isPresent && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                                                <CheckCircle2 className="w-3 h-3" /> Present
                                                            </span>
                                                        )}
                                                        {isAbsent && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                                                <XCircle className="w-3 h-3" /> Absent
                                                            </span>
                                                        )}
                                                        {isLate && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                                                <Clock className="w-3 h-3" /> Late
                                                            </span>
                                                        )}
                                                        {isExcused && (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                                                                <FileText className="w-3 h-3" /> Excused
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-500">
                                                        {rec.remarks || "—"}
                                                    </td>
                                                    <td className="py-3 px-4 text-gray-500">
                                                        {rec.recordedBy?.name || "Homeroom Teacher"}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: ABSENCE & LATE RECORDS */}
            {currentTab === "records" && (
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-600" />
                                    <span>Absence & Late Incident Records</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    All recorded absences, late arrivals, and excused sessions for this student.
                                </p>
                            </div>
                            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl font-bold">
                                Total Incidents: {absentOrLateRecords.length}
                            </span>
                        </div>

                        {absentOrLateRecords.length === 0 ? (
                            <div className="py-16 text-center space-y-2">
                                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto opacity-75" />
                                <h4 className="font-bold text-sm text-gray-900">No Unexcused Absences Found</h4>
                                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                    The student currently has no unexcused absences or late arrivals. Keep up the good work!
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {absentOrLateRecords.map((item: any, idx: number) => {
                                    const isAbsent = item.status === "ABSENT";
                                    const isLate = item.status === "LATE";
                                    const isExcused = item.status === "EXCUSED";

                                    return (
                                        <div key={item.id || idx} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        isAbsent ? "bg-rose-100 text-rose-800 border border-rose-200" :
                                                        isLate ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                                        "bg-blue-100 text-blue-800 border border-blue-200"
                                                    }`}>
                                                        {isAbsent ? "Absent" : isLate ? "Late" : "Excused"}
                                                    </span>
                                                    <span className="font-bold text-gray-900 font-mono">
                                                        {item.date ? new Date(item.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                                                    </span>
                                                </div>
                                                <p className="text-gray-600">
                                                    Period: <strong>{item.classPeriodName || "Daily Homeroom Session"}</strong>
                                                </p>
                                                {item.remarks && (
                                                    <p className="text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                        Teacher Note: "{item.remarks}"
                                                    </p>
                                                )}
                                            </div>

                                            <div className="text-left sm:text-right text-gray-500 text-[11px] space-y-0.5">
                                                <span>Recorded by: {item.recordedBy?.name || "Teacher"}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: ATTENDANCE ALERTS & MINISTRY RULES */}
            {currentTab === "alerts" && (
                <div className="space-y-6">
                    {/* Active Warnings Card */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600" />
                                <span>Active Early Warnings</span>
                            </h3>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${isCritical ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                                {isCritical ? "High Risk" : "Low Risk"}
                            </span>
                        </div>

                        {childEarlyWarning?.flags && childEarlyWarning.flags.length > 0 ? (
                            <div className="space-y-3">
                                {childEarlyWarning.flags.map((flag: any, fIdx: number) => {
                                    const isRed = flag.severity === "RED";
                                    return (
                                        <div 
                                            key={fIdx} 
                                            className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                                                isRed ? "bg-rose-50 border-rose-200 text-rose-950" : "bg-amber-50 border-amber-200 text-amber-950"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-sm">{flag.title}</h4>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                                    isRed ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                                                }`}>
                                                    {flag.severity}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                                {flag.message}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <div>
                                    <span className="font-bold">No Active Warnings</span>
                                    <p className="text-emerald-700 mt-0.5">The student's attendance is in good standing.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ministry Rules & Legal Framework */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900">
                                Ethiopian MoE Policy Framework & Attendance Regulations
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <h4 className="font-bold text-gray-900">1. 80% Minimum Attendance Requirement</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Any secondary school student in Ethiopia must maintain at least 80% classroom attendance across total instructional sessions in a semester to sit for final semester examinations.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <h4 className="font-bold text-gray-900">2. 3 Consecutive Days Absence Alert</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    If a student is absent for three consecutive days without prior authorization, the school administration is required to notify parents or guardians immediately.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <h4 className="font-bold text-gray-900">3. Medical & Excused Absences</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    For health-related absences, official medical documentation must be submitted to the school administration within 5 school days.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <h4 className="font-bold text-gray-900">4. Parent / Guardian Responsibilities</h4>
                                <p className="text-gray-600 leading-relaxed">
                                    Parents and guardians are encouraged to regularly monitor their child's attendance and arrival records on the EduBridge portal.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ParentAttendancePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-gray-500 text-xs font-medium animate-pulse">
                    Loading attendance data...
                </div>
            </div>
        }>
            <ParentAttendanceContent />
        </Suspense>
    );
}
