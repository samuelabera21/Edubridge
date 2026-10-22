"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { getPrimaryAccess } from "@/lib/auth-access";
import { 
    Users, 
    GraduationCap, 
    Calendar, 
    ArrowRight,
    RefreshCw,
    Clock,
    Layers,
    MessageSquare,
    CalendarRange
} from "lucide-react";
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

export default function AdminDashboardPage() {
    const { authData } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [recentSchoolMessages, setRecentSchoolMessages] = useState<any[]>([]);

    // Auto-redirect governance tiers to their specialized dashboards
    useEffect(() => {
        if (!authData) return;
        const scopeType = getPrimaryAccess(authData.access)?.scope?.type;
        if (scopeType === "FEDERAL") {
            router.replace("/dashboard/federal");
        } else if (scopeType === "REGION") {
            router.replace("/dashboard/region");
        } else if (scopeType === "ZONE") {
            router.replace("/dashboard/zone");
        } else if (scopeType === "WOREDA") {
            router.replace("/dashboard/woreda");
        }
    }, [authData, router]);

    const loadDashboard = async (yearId?: string) => {
        try {
            if (!dashboardData) setLoading(true);
            else setRefreshing(true);
            setError(null);

            const queryParam = yearId ? `?academicYearId=${encodeURIComponent(yearId)}` : "";
            const [res, msgRes] = await Promise.all([
                fetchApi(`/school/dashboard-overview${queryParam}`),
                fetchApi("/communication/messages").catch(() => null)
            ]);

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || `Failed to fetch dashboard (HTTP ${res.status})`);
            }

            const data = await res.json();
            setDashboardData(data);
            if (data.academicYear?.id && !selectedYearId) {
                setSelectedYearId(data.academicYear.id);
            }

            if (msgRes && msgRes.ok) {
                const msgs = await msgRes.json();
                setRecentSchoolMessages(Array.isArray(msgs) ? msgs.slice(-5).reverse() : []);
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

    const fmt = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Combined grade structures
    const combinedGrades = useMemo(() => {
        if (!dashboardData) return [];
        const { timetable, students } = dashboardData;
        const gradeMap = new Map<string, {
            gradeId: string;
            gradeName: string;
            level: number;
            studentCount: number;
            requiredPeriods: number;
            scheduledPeriods: number;
            coverageRate: number;
        }>();

        if (timetable.byGrade && timetable.byGrade.length > 0) {
            timetable.byGrade.forEach(g => {
                gradeMap.set(g.gradeId || g.gradeName, {
                    gradeId: g.gradeId,
                    gradeName: g.gradeName,
                    level: g.level,
                    studentCount: 0,
                    requiredPeriods: g.requiredPeriods || 0,
                    scheduledPeriods: g.scheduledPeriods || 0,
                    coverageRate: g.coverageRate || 0
                });
            });
        }

        if (students.byGrade && students.byGrade.length > 0) {
            students.byGrade.forEach(sg => {
                const key = sg.gradeId || sg.gradeName;
                if (gradeMap.has(key)) {
                    gradeMap.get(key)!.studentCount = sg.studentCount;
                } else {
                    gradeMap.set(key, {
                        gradeId: sg.gradeId,
                        gradeName: sg.gradeName,
                        level: sg.level,
                        studentCount: sg.studentCount,
                        requiredPeriods: 0,
                        scheduledPeriods: 0,
                        coverageRate: 0
                    });
                }
            });
        }

        return Array.from(gradeMap.values()).sort((a, b) => a.level - b.level);
    }, [dashboardData]);

    const maxPeriodVal = useMemo(() => {
        if (!combinedGrades || combinedGrades.length === 0) return 20;
        const max = Math.max(...combinedGrades.map(g => Math.max(g.requiredPeriods, g.scheduledPeriods)));
        return Math.max(max, 10);
    }, [combinedGrades]);

    const chartYSteps = useMemo(() => {
        const top = Math.ceil(maxPeriodVal);
        const step = Math.max(1, Math.ceil(top / 4));
        const steps = [];
        for (let i = top; i >= 0; i -= step) {
            steps.push(i);
        }
        if (steps[steps.length - 1] !== 0) {
            steps.push(0);
        }
        return steps;
    }, [maxPeriodVal]);

    if (loading) {
        return (
            <div className="py-20">
                <LoadingState message="Loading..." />
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

    const { 
        school, 
        academicYear, 
        availableAcademicYears, 
        overview, 
        teachers, 
        timetable, 
        readiness, 
        alerts, 
        recentActivity 
    } = dashboardData;

    return (
        <div className="space-y-6 pb-12 font-sans">
            {/* 1. CLEAN HEADER (Matching Woreda & Federal: Zero filler text) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {school.name}
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {school.status === "ACTIVE" ? "Active" : (school.status || "Active")}
                    </span>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    {availableAcademicYears.length > 0 && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="text-slate-500 font-medium">Year:</span>
                            <select
                                value={academicYear?.id || ""}
                                onChange={(e) => handleYearChange(e.target.value)}
                                className="bg-transparent font-semibold text-slate-900 pr-2 py-0.5 focus:outline-hidden cursor-pointer"
                            >
                                {availableAcademicYears.map((y) => (
                                    <option key={y.id} value={y.id}>
                                        {y.name} {y.status === "ACTIVE" ? "(Current)" : `(${y.status})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => loadDashboard(selectedYearId || undefined)}
                        disabled={refreshing}
                        className="p-2 border border-slate-300 bg-white hover:bg-[#4085b3] text-slate-700 hover:text-white hover:border-[#4085b3] rounded transition-all duration-200 cursor-pointer group/refresh"
                        title="Reload dashboard data"
                        aria-label="Reload dashboard data"
                    >
                        <RefreshCw className={`w-4 h-4 transition-colors ${refreshing ? "animate-spin text-[#4085b3]" : "text-slate-500 group-hover/refresh:text-white"}`} />
                    </button>
                </div>
            </div>

            {/* 2. EXECUTIVE TELEMETRY STRIP (Clean single numbers, no text spam) */}
            <div className="p-4 bg-white border border-slate-200 rounded text-xs text-slate-700">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Students</span>
                        <span className="text-xl font-bold text-slate-900 tabular-nums">{fmt(overview.totalStudents)}</span>
                    </div>
                    <div className="pt-3 sm:pt-0 sm:pl-6">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Teachers</span>
                        <span className="text-xl font-bold text-slate-900 tabular-nums">{fmt(overview.totalTeachers)}</span>
                    </div>
                    <div className="pt-3 sm:pt-0 sm:pl-6">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Sections</span>
                        <span className="text-xl font-bold text-slate-900 tabular-nums">{fmt(overview.totalSections)}</span>
                    </div>
                    <div className="pt-3 sm:pt-0 sm:pl-6">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Timetable</span>
                        <span className="text-xl font-bold text-slate-900 tabular-nums">{timetable.coverageRate}%</span>
                    </div>
                    <div className="pt-3 sm:pt-0 sm:pl-6">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Readiness</span>
                        <span className="text-xl font-bold text-slate-900 tabular-nums">{overview.readinessScore}%</span>
                    </div>
                </div>
            </div>

            {/* 3. MAIN WORK AREA */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT: ACADEMIC CAPACITY (8 COLS) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Table: Academic Structure */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                Academic Structure
                            </h2>
                            <span className="text-xs text-slate-500 font-medium">
                                {combinedGrades.length} {combinedGrades.length === 1 ? "Grade" : "Grades"}
                            </span>
                        </div>

                        <div className="border border-slate-200 bg-white rounded overflow-hidden">
                            <table className="w-full table-fixed text-left text-xs border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                                    <tr>
                                        <th className="py-3 px-4 w-[25%]">Grade</th>
                                        <th className="py-3 px-4 w-[18%]">Students</th>
                                        <th className="py-3 px-4 w-[18%]">Teachers</th>
                                        <th className="py-3 px-4 w-[25%]">Weekly Periods</th>
                                        <th className="py-3 px-4 w-[14%] text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                    {combinedGrades.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400">
                                                No grade levels configured.
                                            </td>
                                        </tr>
                                    ) : (
                                        combinedGrades.map((grade) => {
                                            const pct = grade.requiredPeriods > 0 
                                                ? Math.min(100, Math.round((grade.scheduledPeriods / grade.requiredPeriods) * 100))
                                                : 0;

                                            return (
                                                <tr key={grade.gradeId} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-3 px-4 font-semibold text-slate-900 truncate">
                                                        <div className="flex items-center gap-1.5">
                                                            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span>{grade.gradeName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                        {fmt(grade.studentCount)}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-900 font-medium tabular-nums truncate">
                                                        {teachers.assigned > 0 ? fmt(teachers.assigned) : "0"}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-[11px] font-medium">
                                                                <span className="tabular-nums font-semibold text-slate-900">
                                                                    {grade.scheduledPeriods} / {grade.requiredPeriods}
                                                                </span>
                                                                <span className={`font-semibold ${pct === 100 ? "text-emerald-700" : pct > 0 ? "text-[#4085b3]" : "text-slate-400"}`}>
                                                                    {pct}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className={`h-1.5 rounded-full transition-all duration-300 ${pct === 100 ? "bg-emerald-600" : "bg-[#4085b3]"}`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <Link
                                                            href="/dashboard/academics/timetable"
                                                            className="text-xs font-semibold text-[#4085b3] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                                                        >
                                                            <span>Manage</span>
                                                            <ArrowRight className="w-3 h-3" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Chart: Curriculum Delivery */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight">
                                Curriculum Delivery
                            </h3>
                            <div className="flex items-center gap-4 text-xs font-semibold">
                                <span className="flex items-center gap-1.5 text-[#4085b3]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#4085b3]" /> Scheduled
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Required
                                </span>
                            </div>
                        </div>

                        <div className="w-full overflow-x-auto pb-4 pt-2">
                            <div className="min-w-[450px] h-56 flex flex-col justify-between relative pl-8 pr-4 pt-3">
                                <div className="absolute inset-0 pl-8 pr-4 pointer-events-none flex flex-col justify-between">
                                    {chartYSteps.map(val => (
                                        <div key={val} className="w-full flex items-center justify-between relative">
                                            <span className="absolute -left-8 text-[11px] font-bold text-slate-400 w-6 text-right">
                                                {val}
                                            </span>
                                            <div className="w-full border-b border-dashed border-slate-200" />
                                        </div>
                                    ))}
                                </div>

                                <div className="h-full flex items-end justify-around gap-6 relative z-10 pt-2 pb-8">
                                    {combinedGrades.length === 0 ? (
                                        <div className="w-full text-center text-slate-400 text-xs py-14">
                                            No curriculum data available.
                                        </div>
                                    ) : (
                                        combinedGrades.map(grade => {
                                            const totalHeightVal = maxPeriodVal > 0 ? maxPeriodVal : 1;
                                            const scheduledH = Math.min(100, Math.max(8, (grade.scheduledPeriods / totalHeightVal) * 100));
                                            const requiredH = Math.min(100, Math.max(8, (grade.requiredPeriods / totalHeightVal) * 100));

                                            return (
                                                <div
                                                    key={grade.gradeId}
                                                    className="flex flex-col items-center justify-end h-full group relative min-w-[60px]"
                                                >
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-0.5 rounded shadow text-[10px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                                        {grade.scheduledPeriods} / {grade.requiredPeriods}
                                                    </div>

                                                    <div className="flex items-end gap-1.5 h-full w-full justify-center">
                                                        <div
                                                            className="w-5 rounded-t bg-[#4085b3] hover:bg-[#32698e] transition-colors"
                                                            style={{ height: `${scheduledH}%` }}
                                                        />
                                                        <div
                                                            className="w-5 rounded-t bg-slate-300 hover:bg-slate-400 transition-colors"
                                                            style={{ height: `${requiredH}%` }}
                                                        />
                                                    </div>

                                                    <span className="text-[11px] font-semibold text-slate-600 mt-2 truncate w-full text-center">
                                                        {grade.gradeName.replace(/Grade /i, "G")}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: COMPLIANCE & ACTION ITEMS (4 COLS) */}
                <div className="lg:col-span-4 space-y-4">

                    {/* CARD 1: READINESS */}
                    <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900">
                                Readiness
                            </h3>
                            <span className="text-xs font-semibold text-slate-700 tabular-nums">
                                {readiness.score}%
                            </span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                            <div
                                className="bg-[#4085b3] h-1 rounded-full transition-all duration-500"
                                style={{ width: `${readiness.score}%` }}
                            />
                        </div>

                        <div className="divide-y divide-slate-100">
                            {readiness.checks.slice(0, 5).map((check) => {
                                const isPassed = check.status === "PASSED";
                                const shortName = check.name
                                    .replace(" Status", "")
                                    .replace(" Configured", "")
                                    .replace(" Available", "");

                                return (
                                    <div key={check.id} className="flex items-center justify-between py-1.5 text-xs">
                                        <span className="text-slate-700 font-medium truncate">
                                            {shortName}
                                        </span>
                                        <span className={`text-[11px] font-medium shrink-0 ${
                                            isPassed ? "text-slate-400" : "text-amber-700 font-semibold"
                                        }`}>
                                            {isPassed ? "Ready" : "Review"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* CARD 2: ACTION ITEMS */}
                    <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900">
                                Action Items
                            </h3>
                            <span className="text-xs font-semibold text-slate-500 tabular-nums">
                                {alerts.length}
                            </span>
                        </div>

                        <div className="space-y-1.5">
                            {alerts.length === 0 ? (
                                <div className="text-center py-3 text-xs text-slate-400">
                                    No pending items.
                                </div>
                            ) : (
                                alerts.slice(0, 3).map((alert) => (
                                    <div key={alert.id} className="flex items-center justify-between py-1 text-xs">
                                        <span className="font-medium text-slate-800 truncate pr-2">
                                            {alert.title}
                                        </span>
                                        <Link
                                            href={alert.actionUrl}
                                            className="text-xs font-semibold text-[#4085b3] hover:underline shrink-0"
                                        >
                                            Resolve →
                                        </Link>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* CARD 3: AUDIT ACTIVITY */}
                    <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900">
                                Audit Activity
                            </h3>
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                        </div>

                        <div className="space-y-2">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-3 text-xs text-slate-400">
                                    No recent actions.
                                </div>
                            ) : (
                                recentActivity.slice(0, 3).map((log) => (
                                    <div key={log.id} className="flex items-center justify-between text-xs py-1">
                                        <span className="text-slate-700 font-medium truncate pr-2">
                                            {log.actionLabel}
                                        </span>
                                        <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                                            {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. FACULTY MESSAGES */}
            <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center space-x-2.5">
                        <MessageSquare className="w-4 h-4 text-[#4085b3]" />
                        <h3 className="text-sm font-bold text-slate-900">
                            Faculty Messages
                        </h3>
                    </div>
                    <Link
                        href="/dashboard/communication/messages"
                        className="text-xs font-semibold text-[#4085b3] hover:underline flex items-center gap-1"
                    >
                        <span>Inbox</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div>
                    {recentSchoolMessages.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                            No recent messages.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {recentSchoolMessages.map((msg: any) => (
                                <Link
                                    key={msg.id}
                                    href="/dashboard/communication/messages"
                                    className="p-2.5 rounded hover:bg-slate-50 transition-colors flex items-center justify-between group block"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-7 h-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                            {(msg.sender?.name || "T").charAt(0).toUpperCase()}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-semibold text-slate-900 truncate">
                                                {msg.sender?.name || "Teacher"}
                                            </p>
                                            <p className="text-xs text-slate-600 truncate max-w-xl">
                                                {msg.content}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-4">
                                        <span className="text-[10px] text-slate-400 block">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-[11px] text-[#4085b3] font-semibold group-hover:underline">
                                            Reply
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
