"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { fetchApi } from "../../../lib/api";
import Link from "next/link";
import { 
    Users, 
    GraduationCap, 
    Calendar, 
    ClipboardCheck,
    ChevronDown, 
    AlertTriangle, 
    ShieldAlert, 
    TrendingDown, 
    CheckCircle2, 
    Megaphone,
    Clock,
    ArrowRight,
    BookOpen,
    Check,
    FileText,
    Award
} from "lucide-react";

export default function ParentDashboard() {
    const { authData } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [earlyWarningFlags, setEarlyWarningFlags] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<any>(null);
    const [academicsData, setAcademicsData] = useState<any>(null);
    const [activitiesData, setActivitiesData] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [loadingChildData, setLoadingChildData] = useState(false);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Initial load: Profile, System Warnings, Announcements
    useEffect(() => {
        async function loadInitialData() {
            try {
                const [profileRes, flagsRes, annRes] = await Promise.allSettled([
                    fetchApi("/parent/me"),
                    fetchApi("/support/early-warning"),
                    fetchApi("/parent/announcements")
                ]);

                if (profileRes.status === "fulfilled" && profileRes.value.ok) {
                    const profData = await profileRes.value.json();
                    setProfile(profData);
                }
                if (flagsRes.status === "fulfilled" && flagsRes.value.ok) {
                    const flagsData = await flagsRes.value.json();
                    setEarlyWarningFlags(Array.isArray(flagsData) ? flagsData : []);
                }
                if (annRes.status === "fulfilled" && annRes.value.ok) {
                    const annData = await annRes.value.json();
                    setAnnouncements(Array.isArray(annData) ? annData : []);
                }
            } catch (err) {
                console.error("Failed to load initial parent dashboard data:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadInitialData();
    }, []);

    const children = profile?.children || [];
    const hasChildren = children.length > 0;
    const currentRelation = hasChildren ? children[selectedChildIndex] : null;
    const currentChild = currentRelation?.student || null;

    // Load child-specific data whenever selected child changes
    useEffect(() => {
        if (!currentChild?.id) return;

        async function loadChildSpecificData() {
            setLoadingChildData(true);
            try {
                const [attRes, acadRes, actRes] = await Promise.allSettled([
                    fetchApi(`/parent/children/${currentChild.id}/attendance`),
                    fetchApi(`/parent/children/${currentChild.id}/academics`),
                    fetchApi(`/parent/children/${currentChild.id}/activities`)
                ]);

                if (attRes.status === "fulfilled" && attRes.value.ok) {
                    const attJson = await attRes.value.json();
                    setAttendanceData(attJson);
                } else {
                    setAttendanceData(null);
                }

                if (acadRes.status === "fulfilled" && acadRes.value.ok) {
                    const acadJson = await acadRes.value.json();
                    setAcademicsData(acadJson);
                } else {
                    setAcademicsData(null);
                }

                if (actRes.status === "fulfilled" && actRes.value.ok) {
                    const actJson = await actRes.value.json();
                    setActivitiesData(Array.isArray(actJson) ? actJson : []);
                } else {
                    setActivitiesData([]);
                }
            } catch (err) {
                console.error("Failed to load child specific data:", err);
            } finally {
                setLoadingChildData(false);
            }
        }

        loadChildSpecificData();
    }, [currentChild?.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[420px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#184973] border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-500 font-medium text-sm">Loading parent dashboard...</span>
                </div>
            </div>
        );
    }

    // Risk flags for current child
    const currentChildRisk = earlyWarningFlags.find((f: any) => f.studentId === currentChild?.id) || null;
    const overallStatus = currentChildRisk?.overallStatus || (academicsData?.summary?.academicStanding === "GOOD_STANDING" ? "GREEN" : "YELLOW");

    // Attendance calculations
    const attRate = attendanceData?.summary?.rate ?? (currentChildRisk?.attendanceRate ?? 100);
    const totalSessions = attendanceData?.summary?.totalSessions ?? 0;
    const presentCount = attendanceData?.summary?.present ?? 0;
    const absentCount = attendanceData?.summary?.absent ?? 0;
    const lateCount = attendanceData?.summary?.late ?? 0;
    const isAttCompliant = attRate >= 80;

    // Academic calculations
    const currentAverage = academicsData?.summary?.averageScore 
        ? `${academicsData.summary.averageScore}%` 
        : (currentChildRisk?.recentAverageScore ? `${currentChildRisk.recentAverageScore}%` : "N/A");
    const subjects = academicsData?.subjects || [];
    const recentAssessments = academicsData?.assessments?.slice(0, 4) || [];

    // Enrollment details
    const activeEnrollment = currentChild?.enrollments?.[0] || null;
    const schoolName = activeEnrollment?.organization?.name || "Official School Unit";
    const gradeLevel = activeEnrollment?.schoolGrade?.grade?.level 
        ? `Grade ${activeEnrollment.schoolGrade.grade.level}` 
        : (activeEnrollment?.schoolGrade?.name || "Enrolled Grade");
    const sectionName = activeEnrollment?.section?.name ? `Section ${activeEnrollment.section.name}` : "";
    const academicYear = activeEnrollment?.academicYear?.name || "Current Academic Year";

    // Combined Alerts List
    const childAlerts: Array<{ id: string; type: "ACADEMIC" | "ATTENDANCE" | "ANNOUNCEMENT"; title: string; message: string; severity: "CRITICAL" | "WARNING" | "INFO"; date?: string }> = [];

    // 1. Early warning flags from backend
    if (currentChildRisk?.flags) {
        currentChildRisk.flags.forEach((flag: any, idx: number) => {
            childAlerts.push({
                id: `flag-${idx}`,
                type: flag.type === "ACADEMIC" ? "ACADEMIC" : "ATTENDANCE",
                title: flag.title,
                message: flag.message,
                severity: flag.severity === "RED" ? "CRITICAL" : "WARNING"
            });
        });
    }

    // 2. Attendance alerts from attendance summary
    if (attendanceData?.alerts) {
        attendanceData.alerts.forEach((alt: any, idx: number) => {
            childAlerts.push({
                id: `att-alt-${idx}`,
                type: "ATTENDANCE",
                title: alt.title || "Ministry Attendance Rule Alert",
                message: alt.description || alt.message,
                severity: alt.severity === "CRITICAL" ? "CRITICAL" : "WARNING"
            });
        });
    }

    // 3. Ministry 80% Rule Check if attendance is low and not already flagged
    if (attRate < 80 && childAlerts.filter(a => a.type === "ATTENDANCE").length === 0) {
        childAlerts.push({
            id: "att-rule-80",
            type: "ATTENDANCE",
            title: "MoE Attendance Threshold Warning (<80%)",
            message: `Attendance has fallen to ${attRate}%. Under Ethiopian Ministry of Education regulations, students must maintain at least 80% attendance to qualify for semester examinations.`,
            severity: "CRITICAL"
        });
    }

    // 4. Critical Announcements
    announcements.filter((a: any) => a.priority === "CRITICAL" || a.priority === "HIGH").slice(0, 2).forEach((ann: any) => {
        childAlerts.push({
            id: `ann-${ann.id}`,
            type: "ANNOUNCEMENT",
            title: ann.title,
            message: ann.content,
            severity: "INFO",
            date: ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : undefined
        });
    });

    return (
        <div className="w-full max-w-6xl mx-auto space-y-7 pb-12">
            {/* Header with White Background Card & Dropdown Student Selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm text-gray-900 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                        Parent Dashboard
                    </h1>
                </div>

                {/* Single Student Selector Dropdown Button */}
                {hasChildren ? (
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
                                    {currentChild?.firstName?.charAt(0) || "S"}
                                </div>
                                <div className="leading-tight">
                                    <div className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                                        {currentChild?.firstName} {currentChild?.lastName}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate max-w-[150px]">
                                        {gradeLevel} {sectionName ? `• ${sectionName}` : ""}
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
                                        const st = rel.student;
                                        const enr = st?.enrollments?.[0];
                                        const gName = enr?.schoolGrade?.grade?.level ? `Grade ${enr.schoolGrade.grade.level}` : (enr?.schoolGrade?.name || "");
                                        const secName = enr?.section?.name ? `Sec ${enr.section.name}` : "";

                                        return (
                                            <button
                                                key={st?.id || idx}
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
                                                        {st?.firstName?.charAt(0) || "S"}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-900 leading-tight">
                                                            {st?.firstName} {st?.lastName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {st?.admissionNumber || "STU-ID"} {gName ? `• ${gName}` : ""} {secName ? `• ${secName}` : ""}
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
                ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs font-medium">
                        No student linked to this account
                    </div>
                )}
            </div>

            {!hasChildren ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
                    <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">No Linked Students Found</h2>
                    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                        There are currently no active students linked to your parent account. Please contact your school administrator to link your profile.
                    </p>
                </div>
            ) : (
                <div className="space-y-7">
                    {/* 1. LINKED CHILDREN SECTION */}
                    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-50 text-[#184973] rounded-lg">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">1. Linked Children</h2>
                                    <p className="text-xs text-gray-500">Official student identity and enrollment information</p>
                                </div>
                            </div>
                            <Link 
                                href="/dashboard/parent/profile" 
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#184973] hover:underline"
                            >
                                View Full Profile <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Student Identity Card */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-[#184973] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-sm">
                                    {currentChild?.firstName?.charAt(0) || "S"}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block">Student Full Name</span>
                                    <h3 className="text-base font-bold text-gray-900 truncate">
                                        {currentChild?.firstName} {currentChild?.middleName || ""} {currentChild?.lastName}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        ID: <span className="font-mono font-semibold text-gray-700">{currentChild?.admissionNumber || currentChild?.id?.slice(0, 8)}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Academic Enrolment Card */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#184973] flex items-center justify-center font-bold flex-shrink-0">
                                    <GraduationCap className="w-6 h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block">Enrolled Class</span>
                                    <h3 className="text-base font-bold text-gray-900 truncate">
                                        {gradeLevel} {sectionName ? `• ${sectionName}` : ""}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                                        {schoolName}
                                    </p>
                                </div>
                            </div>

                            {/* Guardian Relationship Card */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-gray-100 flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                                    <Award className="w-6 h-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block">Relationship Status</span>
                                    <h3 className="text-base font-bold text-gray-900">
                                        {currentRelation?.relationship || "Guardian"}
                                    </h3>
                                    <p className="text-xs text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Authorized Family Member
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 2. ATTENDANCE OVERVIEW SECTION */}
                    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                                    <ClipboardCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">2. Attendance Overview</h2>
                                    <p className="text-xs text-gray-500">Ethiopian Ministry of Education (MoE) 80% Rule Monitoring</p>
                                </div>
                            </div>
                            <Link 
                                href="/dashboard/parent/attendance" 
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#184973] hover:underline"
                            >
                                View Attendance History <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {/* Attendance Progress & Compliance Card */}
                        <div className="mt-5 p-5 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                                <div>
                                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Attendance Compliance Status</div>
                                    <div className="text-2xl font-black text-gray-900 mt-0.5 flex items-center gap-2.5">
                                        <span>{attRate}%</span>
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                                            isAttCompliant 
                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                                                : "bg-rose-100 text-rose-800 border border-rose-200"
                                        }`}>
                                            {isAttCompliant ? (
                                                <><CheckCircle2 className="w-3.5 h-3.5" /> Good Standing (≥ 80%)</>
                                            ) : (
                                                <><AlertTriangle className="w-3.5 h-3.5" /> Critical (Below 80% MoE Minimum)</>
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-500 max-w-xs text-left sm:text-right">
                                    Federal MoE policy requires minimum 80% attendance to qualify for semester promotion.
                                </div>
                            </div>

                            {/* Visual Progress Bar */}
                            <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden relative">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        attRate >= 85 ? "bg-emerald-500" : attRate >= 80 ? "bg-amber-500" : "bg-rose-500"
                                    }`}
                                    style={{ width: `${Math.min(attRate, 100)}%` }}
                                />
                                <div className="absolute top-0 bottom-0 left-[80%] w-0.5 bg-gray-400 z-10" title="80% MoE Minimum Line" />
                            </div>
                        </div>

                        {/* Attendance Statistics Grid */}
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-4 bg-white rounded-xl border border-gray-200 text-center">
                                <span className="text-xs text-gray-500 font-medium block">Total Sessions</span>
                                <span className="text-xl font-bold text-gray-900 mt-1 block">{totalSessions}</span>
                            </div>
                            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                                <span className="text-xs text-emerald-800 font-medium block">Days Present</span>
                                <span className="text-xl font-bold text-emerald-700 mt-1 block">{presentCount}</span>
                            </div>
                            <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-100 text-center">
                                <span className="text-xs text-rose-800 font-medium block">Days Absent</span>
                                <span className="text-xl font-bold text-rose-700 mt-1 block">{absentCount}</span>
                            </div>
                            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 text-center">
                                <span className="text-xs text-amber-800 font-medium block">Late Arrivals</span>
                                <span className="text-xl font-bold text-amber-700 mt-1 block">{lateCount}</span>
                            </div>
                        </div>
                    </section>

                    {/* 3. ACADEMIC OVERVIEW SECTION */}
                    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">3. Academic Overview</h2>
                                    <p className="text-xs text-gray-500">Cumulative average, grade performance, and recent assessments</p>
                                </div>
                            </div>
                            <Link 
                                href="/dashboard/parent/academics" 
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#184973] hover:underline"
                            >
                                View Academic Results & Trends <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {/* Academic Summary KPI Bar */}
                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-gray-100">
                                <span className="text-xs text-gray-500 font-medium block">Cumulative Average</span>
                                <div className="flex items-baseline gap-2 mt-1">
                                    <span className="text-2xl font-black text-gray-900">{currentAverage}</span>
                                    <span className="text-xs text-gray-500">all subjects</span>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-gray-100">
                                <span className="text-xs text-gray-500 font-medium block">Academic Standing</span>
                                <div className="mt-1.5">
                                    {overallStatus === "GREEN" && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Good Standing
                                        </span>
                                    )}
                                    {overallStatus === "YELLOW" && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                            <AlertTriangle className="w-3.5 h-3.5" /> Needs Attention
                                        </span>
                                    )}
                                    {overallStatus === "RED" && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                            <ShieldAlert className="w-3.5 h-3.5" /> Critical Academic At-Risk
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-gray-100">
                                <span className="text-xs text-gray-500 font-medium block">Active Subjects</span>
                                <div className="text-2xl font-black text-gray-900 mt-1">
                                    {subjects.length > 0 ? subjects.length : "Standard Curriculum"}
                                </div>
                            </div>
                        </div>

                        {/* Recent Subject Performance Table */}
                        <div className="mt-5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                                Recent Assessment Results
                            </h4>
                            {recentAssessments.length === 0 ? (
                                <div className="p-6 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
                                    No recorded assessment results yet for this semester.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-200">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                                            <tr>
                                                <th className="py-3 px-4">Subject</th>
                                                <th className="py-3 px-4">Assessment Title</th>
                                                <th className="py-3 px-4">Type</th>
                                                <th className="py-3 px-4 text-center">Score</th>
                                                <th className="py-3 px-4 text-center">Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {recentAssessments.map((item: any, i: number) => {
                                                const score = item.score !== null && item.score !== undefined ? `${item.score}%` : "Pending";
                                                const grade = item.letterGrade || (item.score >= 90 ? "A" : item.score >= 80 ? "B" : item.score >= 65 ? "C" : item.score >= 50 ? "D" : "F");
                                                return (
                                                    <tr key={item.id || i} className="hover:bg-slate-50/50">
                                                        <td className="py-3 px-4 font-semibold text-gray-900">{item.subjectName}</td>
                                                        <td className="py-3 px-4 text-gray-700">{item.title}</td>
                                                        <td className="py-3 px-4 text-xs">
                                                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                                                                {item.type || "ASSESSMENT"}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-bold text-gray-900">{score}</td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                                                                grade === "A" ? "bg-emerald-100 text-emerald-800" :
                                                                grade === "B" ? "bg-blue-100 text-blue-800" :
                                                                grade === "C" ? "bg-amber-100 text-amber-800" :
                                                                "bg-rose-100 text-rose-800"
                                                            }`}>
                                                                {grade}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 4. UPCOMING ACTIVITIES SECTION */}
                    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-blue-50 text-[#184973] rounded-lg">
                                    <BookOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">4. Upcoming Activities</h2>
                                    <p className="text-xs text-gray-500">Scheduled homework assignments, coursework tasks, and submission deadlines</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5">
                            {activitiesData.length === 0 ? (
                                <div className="p-8 bg-slate-50 rounded-xl border border-gray-100 text-center">
                                    <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm font-semibold text-gray-700">No Upcoming Activities</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Your child has no pending homework assignments or learning tasks due at this time.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {activitiesData.slice(0, 6).map((activity: any) => {
                                        const isOverdue = activity.status === "OVERDUE";
                                        const isSubmitted = activity.status === "SUBMITTED" || activity.status === "GRADED";
                                        const dueDateText = activity.dueDate 
                                            ? new Date(activity.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                            : "No deadline specified";

                                        return (
                                            <div 
                                                key={activity.id} 
                                                className="p-4 rounded-xl border border-gray-200 bg-white hover:border-[#184973]/40 transition-all shadow-sm"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <span className="text-[11px] font-bold text-[#184973] uppercase tracking-wider block">
                                                            {activity.subject}
                                                        </span>
                                                        <h4 className="text-sm font-bold text-gray-900 mt-0.5 truncate">
                                                            {activity.title}
                                                        </h4>
                                                    </div>
                                                    <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                                                        isSubmitted ? "bg-emerald-100 text-emerald-800" :
                                                        isOverdue ? "bg-rose-100 text-rose-800" :
                                                        "bg-blue-100 text-blue-800"
                                                    }`}>
                                                        {activity.status}
                                                    </span>
                                                </div>

                                                {activity.description && (
                                                    <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                                                        {activity.description}
                                                    </p>
                                                )}

                                                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                                    <span className="truncate">Teacher: {activity.teacher}</span>
                                                    <span className="flex items-center gap-1 font-medium text-gray-700 flex-shrink-0">
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" /> {dueDateText}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 5. ALERTS SECTION */}
                    <section className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-rose-50 text-rose-700 rounded-lg">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">5. Alerts</h2>
                                    <p className="text-xs text-gray-500">Academic risk warnings, attendance breaches, and official school alerts</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3.5">
                            {childAlerts.length === 0 ? (
                                <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                                    <h4 className="text-sm font-bold text-emerald-900">All Clear — No Active Alerts</h4>
                                    <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                                        Your child is currently in good standing with no academic risk flags, attendance infractions, or critical school notices.
                                    </p>
                                </div>
                            ) : (
                                childAlerts.map((alert) => {
                                    const isCritical = alert.severity === "CRITICAL";
                                    const isWarning = alert.severity === "WARNING";
                                    return (
                                        <div 
                                            key={alert.id} 
                                            className={`rounded-xl p-4 sm:p-5 border shadow-sm transition-all ${
                                                isCritical 
                                                    ? "bg-rose-50 border-rose-200 text-rose-950" 
                                                    : isWarning 
                                                    ? "bg-amber-50 border-amber-200 text-amber-950"
                                                    : "bg-blue-50 border-blue-200 text-blue-950"
                                            }`}
                                        >
                                            <div className="flex items-start gap-3.5">
                                                <div className={`p-2.5 rounded-lg flex-shrink-0 ${
                                                    isCritical ? "bg-rose-200 text-rose-800" :
                                                    isWarning ? "bg-amber-200 text-amber-800" :
                                                    "bg-blue-200 text-[#184973]"
                                                }`}>
                                                    {alert.type === "ACADEMIC" ? (
                                                        <TrendingDown className="w-5 h-5" />
                                                    ) : alert.type === "ATTENDANCE" ? (
                                                        <ShieldAlert className="w-5 h-5" />
                                                    ) : (
                                                        <Megaphone className="w-5 h-5" />
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h4 className="text-sm font-bold text-gray-900">{alert.title}</h4>
                                                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${
                                                            isCritical ? "bg-rose-600 text-white" :
                                                            isWarning ? "bg-amber-600 text-white" :
                                                            "bg-[#184973] text-white"
                                                        }`}>
                                                            {alert.severity}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                                                        {alert.message}
                                                    </p>
                                                    {alert.date && (
                                                        <span className="text-[11px] text-gray-500 mt-2 block">
                                                            Posted: {alert.date}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
