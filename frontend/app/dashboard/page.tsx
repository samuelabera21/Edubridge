"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Users, 
    GraduationCap, 
    BookOpen, 
    Calendar, 
    CheckCircle2, 
    AlertTriangle, 
    ArrowRight,
    RefreshCw,
    UserCheck,
    Clock,
    Layers,
    CalendarCheck,
    ShieldAlert,
    AlertCircle,
    Info,
    CalendarRange,
    TrendingUp,
    ChevronRight,
    ChevronDown,
    Building2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

interface DashboardData {
    school: {
        id: string;
        name: string;
        type: string;
        status: string;
        lastUpdated: string;
    };
    academicYear: {
        id: string;
        name: string;
        status: string;
        startDate: string;
        endDate: string;
        isLocked: boolean;
    } | null;
    availableAcademicYears: Array<{
        id: string;
        name: string;
        status: string;
        startDate: string;
        endDate: string;
    }>;
    overview: {
        totalStudents: number;
        totalTeachers: number;
        totalGrades: number;
        totalSections: number;
        totalSubjects: number;
        timetableCoveragePercentage: number;
        unplacedStudents: number;
        readinessScore: number;
        readinessStatus: "READY" | "NEEDS_ATTENTION" | "INCOMPLETE";
    };
    students: {
        totalEnrolled: number;
        placed: number;
        unplaced: number;
        placementRate: number;
        byGrade: Array<{
            gradeId: string;
            gradeName: string;
            level: number;
            studentCount: number;
        }>;
        genderRatio: {
            male: number;
            female: number;
            malePercentage: number;
            femalePercentage: number;
        };
    };
    teachers: {
        totalActive: number;
        assigned: number;
        unassigned: number;
        totalAssignments: number;
        totalRequiredPeriods: number;
        totalScheduledPeriods: number;
        remainingPeriods: number;
    };
    timetable: {
        requiredPeriods: number;
        scheduledPeriods: number;
        remainingPeriods: number;
        coverageRate: number;
        incompleteAssignmentsCount: number;
        incompleteSectionsCount: number;
        status: "DRAFT" | "PUBLISHED";
        byGrade: Array<{
            gradeId: string;
            gradeName: string;
            level: number;
            requiredPeriods: number;
            scheduledPeriods: number;
            coverageRate: number;
        }>;
    };
    readiness: {
        score: number;
        status: "READY" | "NEEDS_ATTENTION" | "INCOMPLETE";
        summary: string;
        checks: Array<{
            id: string;
            name: string;
            status: "PASSED" | "WARNING" | "FAILED";
            message: string;
        }>;
    };
    alerts: Array<{
        id: string;
        severity: "CRITICAL" | "WARNING" | "INFO";
        category: "PLACEMENT" | "TIMETABLE" | "TEACHING_ASSIGNMENT" | "ACADEMIC_YEAR" | "ACADEMIC_CONFIG";
        title: string;
        message: string;
        actionUrl: string;
        actionLabel: string;
    }>;
    recentActivity: Array<{
        id: string;
        action: string;
        actionLabel: string;
        resource: string;
        resourceId: string | null;
        userName: string;
        createdAt: string;
    }>;
}

export default function SchoolDashboardPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [selectedYearId, setSelectedYearId] = useState<string>("");

    const loadDashboard = async (yearId?: string) => {
        try {
            if (!dashboardData) setLoading(true);
            else setRefreshing(true);
            setError(null);

            const queryParam = yearId ? `?academicYearId=${encodeURIComponent(yearId)}` : "";
            const res = await fetchApi(`/school/dashboard-overview${queryParam}`);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Failed to fetch dashboard (HTTP ${res.status})`);
            }

            const data = await res.json();
            setDashboardData(data);
            if (data.academicYear?.id && !selectedYearId) {
                setSelectedYearId(data.academicYear.id);
            }
        } catch (err: any) {
            console.error("Failed to load school dashboard:", err);
            setError(err.message || "An unexpected error occurred while loading the dashboard.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboard(selectedYearId || undefined);
    }, [selectedYearId]);

    const handleYearChange = (newYearId: string) => {
        setSelectedYearId(newYearId);
    };

    if (loading) {
        return (
            <div className="py-20">
                <LoadingState message="Loading School Admin Dashboard..." />
            </div>
        );
    }

    if (error || !dashboardData) {
        return (
            <div className="p-6">
                <ErrorState 
                    title="Dashboard Loading Error" 
                    message={error || "Unable to aggregate school leadership metrics at this time."} 
                    onRetry={() => loadDashboard(selectedYearId || undefined)} 
                />
            </div>
        );
    }

    const { school, academicYear, availableAcademicYears, overview, students, teachers, timetable, readiness, alerts, recentActivity } = dashboardData;

    // SVG Donut calculation for Placed vs Unplaced
    const totalStudents = students.totalEnrolled || 0;
    const placedCount = students.placed || 0;
    const unplacedCount = students.unplaced || 0;
    const placedPercent = totalStudents > 0 ? (placedCount / totalStudents) * 100 : 100;
    const unplacedPercent = totalStudents > 0 ? (unplacedCount / totalStudents) * 100 : 0;
    
    // Circle circumference for r=40 is 2 * PI * 40 = ~251.32
    const circumference = 2 * Math.PI * 40;
    const placedDash = (placedPercent / 100) * circumference;
    const unplacedDash = (unplacedPercent / 100) * circumference;

    return (
        <div className="space-y-6 pb-12 font-sans">
            {/* TOP BAR: BREADCRUMBS, TITLE & ACADEMIC YEAR SELECTOR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                        <span>Home</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-[#4085b3] font-semibold">Admin</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-slate-600 font-semibold">{school.name}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Admin Dashboard
                    </h1>
                </div>

                {/* Right controls: Academic Year selector + refresh */}
                <div className="flex items-center gap-2">
                    {availableAcademicYears.length > 0 && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
                            <Calendar className="w-4 h-4 text-[#4085b3]" />
                            <span className="text-slate-500 font-medium">Year:</span>
                            <select
                                value={academicYear?.id || ""}
                                onChange={(e) => handleYearChange(e.target.value)}
                                className="bg-transparent font-bold text-slate-800 pr-2 py-0.5 focus:outline-hidden cursor-pointer"
                            >
                                {availableAcademicYears.map((y) => (
                                    <option key={y.id} value={y.id}>
                                        {y.name} {y.status === "ACTIVE" ? "(Active)" : `(${y.status})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={() => loadDashboard(selectedYearId || undefined)}
                        disabled={refreshing}
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-[#4085b3] hover:border-[#4085b3]/40 shadow-2xs transition-colors cursor-pointer"
                        title="Refresh metrics"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#4085b3]" : ""}`} />
                    </button>
                </div>
            </div>

            {/* 1. TOP 4 MAIN STATS CARDS (EXACT MATCH TO TEMPLATE) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* CARD 1: STUDENTS */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Users className="w-7 h-7" />
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Students</span>
                        <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
                            {overview.totalStudents.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                            {students.placed} placed ({students.placementRate}%)
                        </div>
                    </div>
                </div>

                {/* CARD 2: TEACHERS */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-[#4085b3] flex items-center justify-center shrink-0">
                        <GraduationCap className="w-7 h-7" />
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Teachers</span>
                        <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
                            {overview.totalTeachers.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-semibold text-[#4085b3] mt-0.5">
                            {teachers.assigned} with assignments
                        </div>
                    </div>
                </div>

                {/* CARD 3: CLASSROOMS & SECTIONS */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <BookOpen className="w-7 h-7" />
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Sections</span>
                        <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
                            {overview.totalSections.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-semibold text-amber-600 mt-0.5">
                            Across {overview.totalGrades} grade levels
                        </div>
                    </div>
                </div>

                {/* CARD 4: TIMETABLE & READINESS */}
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <CalendarCheck className="w-7 h-7" />
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Timetable</span>
                        <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
                            {overview.timetableCoveragePercentage}%
                        </div>
                        <div className="text-[11px] font-semibold text-indigo-600 mt-0.5">
                            {overview.readinessScore}% Readiness ({overview.readinessStatus})
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. MAIN SECTION: VISUAL ANALYTICS & MONITORING (LEFT 8 COLUMNS + RIGHT 4 COLUMNS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* LEFT & CENTER COLUMN (8 COLS): DEMAND, GRADES & SCHEDULE VISUAL */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* INSTRUCTIONAL COVERAGE & DEMAND (BAR/PROGRESS COMPARISON) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">
                                    Instructional Demand & Timetable Coverage
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Weekly instructional periods scheduled per grade in {academicYear?.name}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#4085b3]"></span>
                                    Scheduled: {timetable.scheduledPeriods}
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                                    Required: {timetable.requiredPeriods}
                                </span>
                            </div>
                        </div>

                        {/* Grade coverage bars */}
                        <div className="pt-5 space-y-4">
                            {timetable.byGrade.length === 0 ? (
                                <div className="text-center py-10 text-xs text-slate-400">
                                    No grade curriculum schedules configured yet for this academic year.
                                </div>
                            ) : (
                                timetable.byGrade.map((tg) => {
                                    const isComplete = tg.coverageRate >= 100;
                                    return (
                                        <div key={tg.gradeId} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-slate-700">{tg.gradeName}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-500">
                                                        {tg.scheduledPeriods} / {tg.requiredPeriods} periods
                                                    </span>
                                                    <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                                        isComplete 
                                                            ? "bg-emerald-50 text-emerald-700" 
                                                            : "bg-blue-50 text-[#4085b3]"
                                                    }`}>
                                                        {tg.coverageRate}%
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        isComplete ? "bg-emerald-500" : "bg-[#4085b3]"
                                                    }`}
                                                    style={{ width: `${Math.min(100, tg.coverageRate)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Bottom metrics strip */}
                        <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
                            <div>
                                <span className="text-[11px] font-medium text-slate-400">Overall Coverage</span>
                                <div className="text-lg font-bold text-[#4085b3]">{timetable.coverageRate}%</div>
                            </div>
                            <div>
                                <span className="text-[11px] font-medium text-slate-400">Remaining Deficit</span>
                                <div className={`text-lg font-bold ${timetable.remainingPeriods > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                                    {timetable.remainingPeriods} periods
                                </div>
                            </div>
                            <div>
                                <span className="text-[11px] font-medium text-slate-400">Timetable State</span>
                                <div className="text-lg font-bold text-slate-800">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs uppercase font-extrabold ${
                                        timetable.status === "PUBLISHED" 
                                            ? "bg-emerald-50 text-emerald-700" 
                                            : "bg-amber-50 text-amber-700"
                                    }`}>
                                        {timetable.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* OPERATIONAL ALERTS & NOTICE BOARD (EXACT MATCH TO NOTICE BOARD IN TEMPLATE) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Notice Board & Operational Alerts</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Real-time alerts requiring school administrator action</p>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                                {alerts.length} Notices
                            </span>
                        </div>

                        <div className="pt-4 space-y-3">
                            {alerts.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl">
                                    No active operational alerts. All academic operations are in compliance!
                                </div>
                            ) : (
                                alerts.map((alert) => {
                                    const isCritical = alert.severity === "CRITICAL";
                                    const isWarning = alert.severity === "WARNING";
                                    return (
                                        <div 
                                            key={alert.id}
                                            className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        isCritical 
                                                            ? "bg-red-100 text-red-700" 
                                                            : isWarning 
                                                                ? "bg-amber-100 text-amber-800" 
                                                                : "bg-blue-100 text-[#4085b3]"
                                                    }`}>
                                                        {alert.category.replace(/_/g, " ")}
                                                    </span>
                                                    <h4 className="text-xs font-bold text-slate-900">{alert.title}</h4>
                                                </div>
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    {alert.message}
                                                </p>
                                            </div>

                                            <Link
                                                href={alert.actionUrl}
                                                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#4085b3] text-[#4085b3] hover:bg-blue-50 text-xs font-bold transition-all"
                                            >
                                                <span>{alert.actionLabel}</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </Link>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN (4 COLS): DONUT CHART, RECENT ACTIVITY & QUICK ACTIONS */}
                <div className="lg:col-span-4 space-y-6">
                    
                    {/* STUDENTS DONUT CHART (EXACT MATCH TO TEMPLATE) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Students Placement</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Section allocation ratio</p>
                            </div>
                            <Link href="/dashboard/students/placement" className="text-xs text-[#4085b3] hover:underline font-semibold flex items-center gap-0.5">
                                <span>Roster</span>
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {/* Circular SVG Donut Chart */}
                        <div className="py-6 flex flex-col items-center justify-center">
                            <div className="relative w-44 h-44 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    {/* Background Circle */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="transparent"
                                        stroke="#f1f5f9"
                                        strokeWidth="14"
                                    />
                                    {/* Placed Slice (Blue #4085b3) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="transparent"
                                        stroke="#4085b3"
                                        strokeWidth="14"
                                        strokeDasharray={`${placedDash} ${circumference}`}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                    {/* Unplaced Slice (Amber #f59e0b) */}
                                    {unplacedCount > 0 && (
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            fill="transparent"
                                            stroke="#f59e0b"
                                            strokeWidth="14"
                                            strokeDasharray={`${unplacedDash} ${circumference}`}
                                            strokeDashoffset={`-${placedDash}`}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                        />
                                    )}
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center text-center">
                                    <span className="text-2xl font-black text-slate-800">
                                        {totalStudents}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Total Students
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Legend Below Chart */}
                        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                            <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                                <div className="flex items-center justify-center gap-1.5 text-xs text-[#4085b3] font-bold">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#4085b3]"></span>
                                    Placed
                                </div>
                                <div className="text-base font-black text-slate-800 mt-0.5">
                                    {placedCount} ({Math.round(placedPercent)}%)
                                </div>
                            </div>
                            <div className={`p-2 rounded-xl border ${
                                unplacedCount > 0 
                                    ? "bg-amber-50/60 border-amber-200" 
                                    : "bg-slate-50 border-slate-100"
                            }`}>
                                <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 font-bold">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                    Unplaced
                                </div>
                                <div className="text-base font-black text-slate-800 mt-0.5">
                                    {unplacedCount} ({Math.round(unplacedPercent)}%)
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RECENT ADMINISTRATIVE ACTIVITY (AUDIT LOG) */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Recent Activity</h3>
                                <p className="text-xs text-slate-400 mt-0.5">System audit log events</p>
                            </div>
                            <Clock className="w-4 h-4 text-slate-400" />
                        </div>

                        <div className="pt-4 space-y-3">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-400">
                                    No administrative actions recorded yet.
                                </div>
                            ) : (
                                recentActivity.slice(0, 5).map((log) => (
                                    <div key={log.id} className="flex items-start gap-3 text-xs">
                                        <div className="w-7 h-7 rounded-full bg-blue-50 text-[#4085b3] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                                            {log.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-800 leading-snug">
                                                {log.actionLabel}
                                            </p>
                                            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                                                <span className="truncate">{log.userName}</span>
                                                <span className="shrink-0">{new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* QUICK ACTIONS HUB */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <h3 className="text-base font-bold text-slate-800 mb-3">Quick Navigation</h3>
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                            <Link
                                href="/dashboard/students"
                                className="p-3 rounded-xl border border-slate-100 hover:border-[#4085b3] hover:bg-blue-50/50 transition-all font-bold text-slate-700 hover:text-[#4085b3] flex flex-col items-center gap-1.5"
                            >
                                <Users className="w-4 h-4 text-[#4085b3]" />
                                <span>Students</span>
                            </Link>
                            <Link
                                href="/dashboard/teachers"
                                className="p-3 rounded-xl border border-slate-100 hover:border-[#4085b3] hover:bg-blue-50/50 transition-all font-bold text-slate-700 hover:text-[#4085b3] flex flex-col items-center gap-1.5"
                            >
                                <GraduationCap className="w-4 h-4 text-purple-600" />
                                <span>Teachers</span>
                            </Link>
                            <Link
                                href="/dashboard/academics/timetable"
                                className="p-3 rounded-xl border border-slate-100 hover:border-[#4085b3] hover:bg-blue-50/50 transition-all font-bold text-slate-700 hover:text-[#4085b3] flex flex-col items-center gap-1.5"
                            >
                                <CalendarRange className="w-4 h-4 text-amber-600" />
                                <span>Timetable</span>
                            </Link>
                            <Link
                                href="/dashboard/school"
                                className="p-3 rounded-xl border border-slate-100 hover:border-[#4085b3] hover:bg-blue-50/50 transition-all font-bold text-slate-700 hover:text-[#4085b3] flex flex-col items-center gap-1.5"
                            >
                                <Building2 className="w-4 h-4 text-emerald-600" />
                                <span>School Profile</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. OPERATIONAL READINESS CHECKLIST (SLEEK BOTTOM CARD) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-base font-bold text-slate-800">Academic & Operational Readiness Standards</h3>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                            {readiness.summary}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-slate-800">{readiness.score}%</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                            readiness.status === "READY" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                            {readiness.status.replace(/_/g, " ")}
                        </span>
                    </div>
                </div>

                <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {readiness.checks.map((check) => {
                        const isPassed = check.status === "PASSED";
                        const isWarning = check.status === "WARNING";
                        return (
                            <div 
                                key={check.id}
                                className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                                    isPassed 
                                        ? "bg-slate-50/50 border-slate-100" 
                                        : isWarning 
                                            ? "bg-amber-50/40 border-amber-200" 
                                            : "bg-red-50/40 border-red-200"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-bold text-slate-800 truncate" title={check.name}>
                                        {check.name}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        isPassed 
                                            ? "text-emerald-700 bg-emerald-50" 
                                            : isWarning 
                                                ? "text-amber-700 bg-amber-50" 
                                                : "text-red-700 bg-red-50"
                                    }`}>
                                        {isPassed ? "✓ Passed" : isWarning ? "⚠ Warning" : "✕ Failed"}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 leading-snug">
                                    {check.message}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
