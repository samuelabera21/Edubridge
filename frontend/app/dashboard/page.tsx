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

    // Real data points for Timetable Wave Chart (Scheduled vs Required across grades)
    const gradesData = timetable.byGrade.length > 0 
        ? timetable.byGrade 
        : [{ gradeId: "1", gradeName: "Configured Grades", level: 1, requiredPeriods: timetable.requiredPeriods || 1, scheduledPeriods: timetable.scheduledPeriods || 0, coverageRate: timetable.coverageRate }];
    
    const maxPeriodVal = Math.max(
        ...gradesData.map(g => Math.max(g.requiredPeriods, g.scheduledPeriods, 1)),
        10
    );

    // SVG coordinates generator for smooth wave chart (viewBox 0 0 500 160)
    const chartWidth = 500;
    const chartHeight = 160;
    const paddingX = 40;
    const paddingY = 25;
    const usableW = chartWidth - paddingX * 2;
    const usableH = chartHeight - paddingY * 2;
    
    const pointsCount = gradesData.length;
    const getX = (index: number) => pointsCount > 1 
        ? paddingX + (index / (pointsCount - 1)) * usableW 
        : chartWidth / 2;
    const getY = (val: number) => chartHeight - paddingY - (val / maxPeriodVal) * usableH;

    // Build smooth SVG path using cubic bezier curves
    const buildSmoothPath = (values: number[]) => {
        if (values.length === 0) return "";
        if (values.length === 1) return `M ${getX(0)} ${getY(values[0])} L ${getX(0) + 1} ${getY(values[0])}`;

        const pts = values.map((v, i) => ({ x: getX(i), y: getY(v) }));
        let path = `M ${pts[0].x} ${pts[0].y}`;

        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = i > 0 ? pts[i - 1] : pts[i];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = i != pts.length - 2 ? pts[i + 2] : p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return path;
    };

    const requiredValues = gradesData.map(g => g.requiredPeriods);
    const scheduledValues = gradesData.map(g => g.scheduledPeriods);

    const requiredPath = buildSmoothPath(requiredValues);
    const scheduledPath = buildSmoothPath(scheduledValues);

    const requiredArea = pointsCount > 1 
        ? `${requiredPath} L ${getX(pointsCount - 1)} ${chartHeight - paddingY} L ${getX(0)} ${chartHeight - paddingY} Z`
        : "";
    const scheduledArea = pointsCount > 1 
        ? `${scheduledPath} L ${getX(pointsCount - 1)} ${chartHeight - paddingY} L ${getX(0)} ${chartHeight - paddingY} Z`
        : "";

    return (
        <div className="space-y-6 pb-12 font-sans">
            {/* TOP BAR: BREADCRUMBS, TITLE & ACADEMIC YEAR SELECTOR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-1">
                        <span>Home</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-[#f59e0b] font-semibold">Admin</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-slate-600 font-semibold">{school.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Admin Dashboard
                        </h1>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            {school.status || "ACTIVE"}
                        </span>
                    </div>
                </div>

                {/* Right controls: Academic Year selector + refresh */}
                <div className="flex items-center gap-2">
                    {availableAcademicYears.length > 0 && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
                            <Calendar className="w-4 h-4 text-[#f59e0b]" />
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
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:text-[#f59e0b] hover:border-[#f59e0b]/40 shadow-2xs transition-colors cursor-pointer"
                        title="Refresh metrics"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#f59e0b]" : ""}`} />
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
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Students</span>
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
                    <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-7 h-7" />
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Teachers</span>
                        <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
                            {overview.totalTeachers.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-semibold text-blue-600 mt-0.5">
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
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sections</span>
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
                    <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                        <CalendarCheck className="w-7 h-7" />
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Readiness</span>
                        <div className="text-2xl font-black text-slate-800 tracking-tight mt-0.5">
                            {overview.readinessScore}%
                        </div>
                        <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
                            Coverage: {overview.timetableCoveragePercentage}% ({overview.readinessStatus})
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. MIDDLE CHARTS ROW (MATCHING TEMPLATE: LINE/WAVE CHART + BAR CHART + DONUT CHART) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* CHART 1: INSTRUCTIONAL COVERAGE WAVE CHART (MATCHES EARNINGS CHART IN TEMPLATE) - 5 COLS */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">
                                    Timetable Coverage
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Instructional periods scheduled vs required
                                </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-semibold">
                                <span className="flex items-center gap-1 text-blue-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                                    Req: {timetable.requiredPeriods}
                                </span>
                                <span className="flex items-center gap-1 text-red-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                                    Sched: {timetable.scheduledPeriods}
                                </span>
                            </div>
                        </div>

                        {/* Top summary figures */}
                        <div className="pt-3 pb-1 flex items-baseline gap-6">
                            <div>
                                <span className="text-xs text-slate-400 font-medium">Scheduled</span>
                                <div className="text-xl font-extrabold text-slate-800">
                                    {timetable.scheduledPeriods} <span className="text-xs font-normal text-slate-400">periods</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 font-medium">Required</span>
                                <div className="text-xl font-extrabold text-blue-600">
                                    {timetable.requiredPeriods} <span className="text-xs font-normal text-slate-400">periods</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 font-medium">Coverage</span>
                                <div className="text-xl font-extrabold text-emerald-600">
                                    {timetable.coverageRate}%
                                </div>
                            </div>
                        </div>

                        {/* SVG Wave Chart */}
                        <div className="w-full pt-2">
                            <svg className="w-full h-40 overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                                    </linearGradient>
                                    <linearGradient id="redAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                                    </linearGradient>
                                </defs>

                                {/* Grid horizontal lines */}
                                {[0.25, 0.5, 0.75, 1].map((ratio) => (
                                    <line
                                        key={ratio}
                                        x1={paddingX}
                                        y1={chartHeight - paddingY - ratio * usableH}
                                        x2={chartWidth - paddingX}
                                        y2={chartHeight - paddingY - ratio * usableH}
                                        stroke="#f1f5f9"
                                        strokeDasharray="4 4"
                                    />
                                ))}

                                {/* Areas */}
                                {requiredArea && <path d={requiredArea} fill="url(#blueAreaGrad)" />}
                                {scheduledArea && <path d={scheduledArea} fill="url(#redAreaGrad)" />}

                                {/* Lines */}
                                {requiredPath && (
                                    <path
                                        d={requiredPath}
                                        fill="none"
                                        stroke="#3b82f6"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        className="transition-all duration-700 ease-out"
                                    />
                                )}
                                {scheduledPath && (
                                    <path
                                        d={scheduledPath}
                                        fill="none"
                                        stroke="#ef4444"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        className="transition-all duration-700 ease-out"
                                    />
                                )}

                                {/* Data circles and X-axis Labels */}
                                {gradesData.map((g, i) => {
                                    const cx = getX(i);
                                    const reqY = getY(g.requiredPeriods);
                                    const schY = getY(g.scheduledPeriods);
                                    return (
                                        <g key={g.gradeId || i}>
                                            <circle cx={cx} cy={reqY} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                                            <circle cx={cx} cy={schY} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                                            <text
                                                x={cx}
                                                y={chartHeight - 4}
                                                textAnchor="middle"
                                                fontSize="10"
                                                fill="#94a3b8"
                                                fontWeight="600"
                                            >
                                                {g.gradeName.replace(/Grade /i, "G")}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Timetable State:</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase ${
                            timetable.status === "PUBLISHED" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                            {timetable.status}
                        </span>
                    </div>
                </div>

                {/* CHART 2: INSTRUCTIONAL DEMAND BY GRADE (MATCHES EXPENSES BAR CHART IN TEMPLATE) - 3 COLS */}
                <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">
                                    Curriculum Demand
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Periods required per grade
                                </p>
                            </div>
                            <span className="text-xs font-bold text-slate-500">
                                {overview.totalGrades} Grades
                            </span>
                        </div>

                        {/* Top quick figure */}
                        <div className="pt-3 pb-2">
                            <span className="text-xs text-slate-400 font-medium">Total Demand</span>
                            <div className="text-2xl font-black text-slate-800">
                                {timetable.requiredPeriods} <span className="text-xs font-semibold text-slate-400">weekly periods</span>
                            </div>
                        </div>

                        {/* Vertical Bar Chart */}
                        <div className="h-44 pt-4 flex items-end justify-around gap-2">
                            {gradesData.map((g, idx) => {
                                const barColors = [
                                    "bg-emerald-400 hover:bg-emerald-500",
                                    "bg-blue-500 hover:bg-blue-600",
                                    "bg-amber-400 hover:bg-amber-500",
                                    "bg-indigo-500 hover:bg-indigo-600",
                                    "bg-rose-400 hover:bg-rose-500"
                                ];
                                const colorClass = barColors[idx % barColors.length];
                                const heightPercent = Math.max(12, Math.round((g.requiredPeriods / maxPeriodVal) * 100));

                                return (
                                    <div key={g.gradeId || idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                                        <span className="text-[10px] font-bold text-slate-500 mb-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                            {g.requiredPeriods}
                                        </span>
                                        <div 
                                            className={`w-full max-w-[36px] rounded-t-lg transition-all duration-700 ${colorClass}`}
                                            style={{ height: `${heightPercent}%` }}
                                            title={`${g.gradeName}: ${g.requiredPeriods} required periods, ${g.scheduledPeriods} scheduled`}
                                        />
                                        <span className="text-[10px] font-bold text-slate-500 mt-2 truncate w-full text-center">
                                            {g.gradeName.replace(/Grade /i, "G")}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-center text-xs font-semibold text-slate-500">
                        {timetable.incompleteAssignmentsCount} incomplete assignments
                    </div>
                </div>

                {/* CHART 3: STUDENTS DONUT CHART (EXACT MATCH TO DONUT CHART IN TEMPLATE) - 4 COLS */}
                <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Students</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Placement & enrollment balance</p>
                            </div>
                            <Link href="/dashboard/students/placement" className="text-xs text-[#f59e0b] hover:underline font-semibold flex items-center gap-0.5">
                                <span>Roster</span>
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        {/* Circular SVG Donut Chart */}
                        <div className="py-4 flex flex-col items-center justify-center">
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
                                    {/* Placed Slice (Blue #2563eb) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="transparent"
                                        stroke="#2563eb"
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
                    </div>

                    {/* Legend Below Chart (Matching template) */}
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                        <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                            <div className="flex items-center justify-center gap-1.5 text-xs text-blue-700 font-bold">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
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
            </div>

            {/* 3. BOTTOM ROW (MATCHING TEMPLATE: READINESS CALENDAR + NOTICE BOARD ALERTS + RECENT ACTIVITY & QUICK ACTIONS) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* BOTTOM LEFT: ACADEMIC READINESS STANDARDS (CALENDAR / SCHEDULE WIDGET IN TEMPLATE) - 4 COLS */}
                <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Readiness Standards</h3>
                                <p className="text-xs text-slate-400 mt-0.5">10-point deterministic checks</p>
                            </div>
                            <span className="text-base font-black text-slate-800">
                                {readiness.score}%
                            </span>
                        </div>

                        <div className="pt-3 space-y-2">
                            {readiness.checks.slice(0, 6).map((check) => {
                                const isPassed = check.status === "PASSED";
                                const isWarning = check.status === "WARNING";
                                return (
                                    <div key={check.id} className="flex items-center justify-between py-1.5 text-xs border-b border-slate-50 last:border-none">
                                        <span className="font-semibold text-slate-700 truncate pr-2">
                                            {check.name}
                                        </span>
                                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                                            isPassed 
                                                ? "text-emerald-700 bg-emerald-50" 
                                                : isWarning 
                                                    ? "text-amber-700 bg-amber-50" 
                                                    : "text-red-700 bg-red-50"
                                        }`}>
                                            {isPassed ? "✓ Passed" : isWarning ? "⚠ Warning" : "✕ Failed"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Status Evaluation:</span>
                        <span className="font-bold text-emerald-600 uppercase">
                            {readiness.status}
                        </span>
                    </div>
                </div>

                {/* BOTTOM CENTER: NOTICE BOARD & OPERATIONAL ALERTS (NOTICE BOARD IN TEMPLATE) - 4 COLS */}
                <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Notice Board</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Actionable operational alerts</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {alerts.length} Items
                            </span>
                        </div>

                        <div className="pt-3 space-y-3">
                            {alerts.length === 0 ? (
                                <div className="text-center py-10 text-xs text-slate-400">
                                    No active operational alerts. All school records compliant!
                                </div>
                            ) : (
                                alerts.slice(0, 3).map((alert) => (
                                    <div key={alert.id} className="p-3 rounded-xl bg-slate-50/60 border border-slate-100 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                                alert.severity === "CRITICAL" 
                                                    ? "bg-red-100 text-red-700" 
                                                    : alert.severity === "WARNING" 
                                                        ? "bg-amber-100 text-amber-800" 
                                                        : "bg-blue-100 text-blue-700"
                                            }`}>
                                                {alert.category.replace(/_/g, " ")}
                                            </span>
                                            <Link
                                                href={alert.actionUrl}
                                                className="text-[11px] font-bold text-[#f59e0b] hover:underline inline-flex items-center gap-0.5"
                                            >
                                                <span>{alert.actionLabel}</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-800">{alert.title}</h4>
                                        <p className="text-[11px] text-slate-500 leading-snug">{alert.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-center text-xs font-semibold text-slate-500">
                        {alerts.length > 0 ? `${alerts.length} action items require attention` : "Operations Healthy"}
                    </div>
                </div>

                {/* BOTTOM RIGHT: RECENT ACTIVITY & QUICK ACTIONS - 4 COLS */}
                <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Recent Activity</h3>
                                <p className="text-xs text-slate-400 mt-0.5">Audit log records</p>
                            </div>
                            <Clock className="w-4 h-4 text-slate-400" />
                        </div>

                        <div className="pt-3 space-y-2.5">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-400">
                                    No administrative actions recorded yet.
                                </div>
                            ) : (
                                recentActivity.slice(0, 3).map((log) => (
                                    <div key={log.id} className="flex items-start gap-2.5 text-xs">
                                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                                            {log.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-800 leading-tight">
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

                        {/* Quick Navigation buttons */}
                        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                            <Link
                                href="/dashboard/students"
                                className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-700 transition-colors font-bold text-slate-700 flex flex-col items-center gap-1"
                            >
                                <Users className="w-4 h-4 text-emerald-600" />
                                <span className="text-[10px]">Students</span>
                            </Link>
                            <Link
                                href="/dashboard/teachers"
                                className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-700 transition-colors font-bold text-slate-700 flex flex-col items-center gap-1"
                            >
                                <GraduationCap className="w-4 h-4 text-blue-600" />
                                <span className="text-[10px]">Teachers</span>
                            </Link>
                            <Link
                                href="/dashboard/academics/timetable"
                                className="p-2 rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-700 transition-colors font-bold text-slate-700 flex flex-col items-center gap-1"
                            >
                                <CalendarRange className="w-4 h-4 text-amber-600" />
                                <span className="text-[10px]">Timetable</span>
                            </Link>
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-400">
                        School Operations &bull; EduBridge Principal Portal
                    </div>
                </div>
            </div>
        </div>
    );
}
