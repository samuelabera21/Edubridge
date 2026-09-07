"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Building2, 
    Users, 
    GraduationCap, 
    BookOpen, 
    Calendar, 
    CheckCircle2, 
    AlertTriangle, 
    ArrowRight,
    RefreshCw,
    UserCheck,
    UserX,
    Clock,
    Layers,
    CalendarCheck,
    ShieldAlert,
    AlertCircle,
    Info,
    CalendarRange,
    ExternalLink
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
            <div className="py-12">
                <LoadingState message="Aggregating live school operations and leadership metrics..." />
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

    return (
        <div className="space-y-6 pb-12">
            {/* 1. EXECUTIVE LEADERSHIP HEADER */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#4085b3] bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100">
                                School Leadership & Administration
                            </span>
                            {academicYear && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                    academicYear.status === "ACTIVE" 
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}>
                                    {academicYear.status}
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-[#4085b3]" />
                            <span>{school.name}</span>
                        </h1>
                        <p className="text-xs text-slate-500">
                            Leadership monitoring surface for operational readiness, student placements, staffing, and timetable coverage.
                        </p>
                    </div>

                    {/* Academic Year Selector & Refresh */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {availableAcademicYears.length > 0 && (
                            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 text-xs">
                                <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                                <span className="text-slate-500 font-medium hidden sm:inline">Year:</span>
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
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                            title="Refresh dashboard metrics"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-[#4085b3]" : ""}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. PRIMARY SCHOOL OVERVIEW KPI ROW (8 REAL METRICS) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
                {/* Total Students */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-semibold">Students</span>
                        <Users className="w-3.5 h-3.5 text-[#4085b3]" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{overview.totalStudents}</div>
                    <div className="text-[10px] text-slate-400 truncate">Enrolled this year</div>
                </div>

                {/* Total Teachers */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-semibold">Teachers</span>
                        <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{overview.totalTeachers}</div>
                    <div className="text-[10px] text-slate-400 truncate">{teachers.assigned} assigned duties</div>
                </div>

                {/* Total Grades */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-semibold">Grades</span>
                        <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{overview.totalGrades}</div>
                    <div className="text-[10px] text-slate-400 truncate">Configured levels</div>
                </div>

                {/* Total Sections */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-semibold">Sections</span>
                        <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{overview.totalSections}</div>
                    <div className="text-[10px] text-slate-400 truncate">Active classrooms</div>
                </div>

                {/* Total Subjects */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-semibold">Subjects</span>
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{overview.totalSubjects}</div>
                    <div className="text-[10px] text-slate-400 truncate">Curriculum courses</div>
                </div>

                {/* Timetable Coverage */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-semibold">Coverage</span>
                        <CalendarCheck className="w-3.5 h-3.5 text-[#4085b3]" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{overview.timetableCoveragePercentage}%</div>
                    <div className="text-[10px] text-slate-400 truncate">{timetable.scheduledPeriods}/{timetable.requiredPeriods} periods</div>
                </div>

                {/* Unplaced Students */}
                <div className={`border rounded-xl p-3 shadow-2xs transition-all ${
                    overview.unplacedStudents > 0 
                        ? "bg-amber-50/50 border-amber-200" 
                        : "bg-white border-slate-200"
                }`}>
                    <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-semibold ${overview.unplacedStudents > 0 ? "text-amber-800" : "text-slate-500"}`}>
                            Unplaced
                        </span>
                        <UserX className={`w-3.5 h-3.5 ${overview.unplacedStudents > 0 ? "text-amber-600" : "text-slate-400"}`} />
                    </div>
                    <div className={`text-lg font-bold ${overview.unplacedStudents > 0 ? "text-amber-900" : "text-slate-900"}`}>
                        {overview.unplacedStudents}
                    </div>
                    <div className={`text-[10px] truncate ${overview.unplacedStudents > 0 ? "text-amber-700" : "text-slate-400"}`}>
                        {overview.unplacedStudents > 0 ? "Requires placement" : "All placed (100%)"}
                    </div>
                </div>

                {/* Academic Readiness */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 mb-1">
                        <span className="text-[11px] font-semibold">Readiness</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{overview.readinessScore}%</div>
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                        overview.readinessStatus === "READY" 
                            ? "bg-emerald-50 text-emerald-700" 
                            : overview.readinessStatus === "NEEDS_ATTENTION" 
                                ? "bg-amber-50 text-amber-700" 
                                : "bg-red-50 text-red-700"
                    }`}>
                        {overview.readinessStatus.replace(/_/g, " ")}
                    </span>
                </div>
            </div>

            {/* 3. IMPORTANT OPERATIONAL ALERTS (IF ANY) */}
            {alerts.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Leadership Operational Alerts ({alerts.length})
                            </h2>
                        </div>
                        <span className="text-[11px] text-slate-400">Action items requiring administrative attention</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {alerts.map((alert) => {
                            const isCritical = alert.severity === "CRITICAL";
                            const isWarning = alert.severity === "WARNING";
                            return (
                                <div
                                    key={alert.id}
                                    className={`p-3 rounded-lg border flex flex-col justify-between transition-all ${
                                        isCritical 
                                            ? "bg-red-50/50 border-red-200 text-red-950" 
                                            : isWarning 
                                                ? "bg-amber-50/50 border-amber-200 text-amber-950" 
                                                : "bg-blue-50/50 border-blue-200 text-blue-950"
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center gap-1.5 font-bold text-xs">
                                            {isCritical ? (
                                                <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                                            ) : isWarning ? (
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                            ) : (
                                                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            )}
                                            <span className="truncate">{alert.title}</span>
                                        </div>
                                        <p className="text-xs mt-1 text-slate-600 leading-relaxed">
                                            {alert.message}
                                        </p>
                                    </div>
                                    <div className="mt-3 pt-2 border-t border-slate-200/50 flex justify-end">
                                        <Link
                                            href={alert.actionUrl}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#4085b3] hover:underline"
                                        >
                                            <span>{alert.actionLabel}</span>
                                            <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 4. ACADEMIC READINESS & CHECKLIST */}
            <Card className="border border-slate-200 shadow-2xs">
                <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#4085b3]" />
                            <span>Academic & Operational Readiness</span>
                        </CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {readiness.summary}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">{readiness.score}% Readiness</div>
                            <div className="text-[10px] text-slate-400">Deterministic check</div>
                        </div>
                        <div className="w-16 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    readiness.score >= 90 ? "bg-emerald-500" : readiness.score >= 60 ? "bg-amber-500" : "bg-red-500"
                                }`}
                                style={{ width: `${readiness.score}%` }}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        {readiness.checks.map((check) => {
                            const isPassed = check.status === "PASSED";
                            const isWarning = check.status === "WARNING";
                            return (
                                <div
                                    key={check.id}
                                    className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                                        isPassed 
                                            ? "bg-slate-50/60 border-slate-200" 
                                            : isWarning 
                                                ? "bg-amber-50/40 border-amber-200" 
                                                : "bg-red-50/40 border-red-200"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="font-bold text-slate-800 truncate" title={check.name}>
                                            {check.name}
                                        </span>
                                        {isPassed ? (
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                                ✓ Passed
                                            </span>
                                        ) : isWarning ? (
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                                ⚠ Warning
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                                                ✕ Failed
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 leading-snug">
                                        {check.message}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* 5. VISUAL LEADERSHIP ANALYTICS (BAR CHARTS & PLACEMENT COMPOSITION) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Student Population by Grade (Bar Chart) */}
                <div className="lg:col-span-6">
                    <Card className="border border-slate-200 shadow-2xs h-full flex flex-col justify-between">
                        <CardHeader className="py-3 px-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                    Student Distribution by Grade
                                </CardTitle>
                                <p className="text-[11px] text-slate-400 mt-0.5">Active enrollments in {academicYear?.name}</p>
                            </div>
                            <span className="text-xs font-bold text-[#4085b3]">
                                {students.totalEnrolled} total
                            </span>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-center">
                            {students.byGrade.length === 0 ? (
                                <div className="text-center py-8 text-xs text-slate-400">
                                    No students enrolled in configured grades for this year.
                                </div>
                            ) : (
                                students.byGrade.map((grade) => {
                                    const pct = students.totalEnrolled > 0 
                                        ? Math.round((grade.studentCount / students.totalEnrolled) * 100) 
                                        : 0;
                                    return (
                                        <div key={grade.gradeId} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-800">{grade.gradeName}</span>
                                                <span className="text-slate-500">
                                                    <strong>{grade.studentCount}</strong> students ({pct}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-[#4085b3] rounded-full transition-all"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Student Placement Status & Gender (Donut / Composition) */}
                <div className="lg:col-span-3">
                    <Card className="border border-slate-200 shadow-2xs h-full flex flex-col justify-between">
                        <CardHeader className="py-3 px-4 border-b border-slate-100 flex items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Classroom Placement
                            </CardTitle>
                            <Link href="/dashboard/students/placement" className="text-xs text-[#4085b3] hover:underline font-semibold flex items-center gap-0.5">
                                <span>Rosters</span>
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-4 flex flex-col justify-between flex-1 space-y-4">
                            {/* Visual placement progress */}
                            <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-500">Placement Progress</span>
                                    <span className="font-extrabold text-slate-900">{students.placementRate}%</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-emerald-500 transition-all"
                                        style={{ width: `${students.placementRate}%` }}
                                        title={`Placed: ${students.placed}`}
                                    />
                                    <div
                                        className="h-full bg-amber-400 transition-all"
                                        style={{ width: `${100 - students.placementRate}%` }}
                                        title={`Unplaced: ${students.unplaced}`}
                                    />
                                </div>
                            </div>

                            {/* Placement Breakdown cards */}
                            <div className="grid grid-cols-2 gap-2 text-center">
                                <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-200">
                                    <div className="text-[10px] font-semibold text-emerald-800 uppercase">Placed</div>
                                    <div className="text-base font-bold text-emerald-950 mt-0.5">{students.placed}</div>
                                </div>
                                <div className={`p-2 rounded-lg border ${
                                    students.unplaced > 0 
                                        ? "bg-amber-50/60 border-amber-200" 
                                        : "bg-slate-50 border-slate-200"
                                }`}>
                                    <div className={`text-[10px] font-semibold uppercase ${students.unplaced > 0 ? "text-amber-800" : "text-slate-500"}`}>
                                        Unplaced
                                    </div>
                                    <div className={`text-base font-bold mt-0.5 ${students.unplaced > 0 ? "text-amber-950" : "text-slate-700"}`}>
                                        {students.unplaced}
                                    </div>
                                </div>
                            </div>

                            {/* Gender composition */}
                            <div className="border-t border-slate-100 pt-3 text-xs space-y-1">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gender Balance</span>
                                <div className="flex items-center justify-between text-slate-700 text-xs">
                                    <span>Male: <strong>{students.genderRatio.male}</strong> ({students.genderRatio.malePercentage}%)</span>
                                    <span>Female: <strong>{students.genderRatio.female}</strong> ({students.genderRatio.femalePercentage}%)</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Timetable Instructional Coverage by Grade */}
                <div className="lg:col-span-3">
                    <Card className="border border-slate-200 shadow-2xs h-full flex flex-col justify-between">
                        <CardHeader className="py-3 px-4 border-b border-slate-100 flex items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Timetable by Grade
                            </CardTitle>
                            <Link href="/dashboard/academics/timetable" className="text-xs text-[#4085b3] hover:underline font-semibold flex items-center gap-0.5">
                                <span>Grid</span>
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-center">
                            {timetable.byGrade.length === 0 ? (
                                <div className="text-center py-8 text-xs text-slate-400">
                                    No timetable demand configured for grades.
                                </div>
                            ) : (
                                timetable.byGrade.map((tg) => (
                                    <div key={tg.gradeId} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-semibold text-slate-800">{tg.gradeName}</span>
                                            <span className={`text-[11px] font-bold ${
                                                tg.coverageRate >= 100 ? "text-emerald-700" : "text-amber-700"
                                            }`}>
                                                {tg.coverageRate}% ({tg.scheduledPeriods}/{tg.requiredPeriods})
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${
                                                    tg.coverageRate >= 100 ? "bg-emerald-500" : "bg-[#4085b3]"
                                                }`}
                                                style={{ width: `${Math.min(100, tg.coverageRate)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 6. DETAILED OPERATIONAL CARDS & RECENT ACTIVITY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Teaching Staffing Breakdown */}
                <div className="lg:col-span-4">
                    <Card className="border border-slate-200 shadow-2xs h-full">
                        <CardHeader className="py-3 px-4 border-b border-slate-100 flex items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Teacher Staffing & Workload
                            </CardTitle>
                            <Link href="/dashboard/teachers" className="text-xs text-[#4085b3] hover:underline font-semibold">
                                View Staff
                            </Link>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600">Active Teachers on Staff:</span>
                                <span className="font-extrabold text-slate-900">{teachers.totalActive}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600">Teachers with Assignments:</span>
                                <span className="font-extrabold text-emerald-800">{teachers.assigned}</span>
                            </div>
                            <div className={`flex items-center justify-between text-xs p-2.5 rounded-lg border ${
                                teachers.unassigned > 0 ? "bg-amber-50/60 border-amber-200" : "bg-slate-50 border-slate-100"
                            }`}>
                                <span className={teachers.unassigned > 0 ? "text-amber-900 font-semibold" : "text-slate-600"}>
                                    Unassigned Teachers:
                                </span>
                                <span className={`font-extrabold ${teachers.unassigned > 0 ? "text-amber-950" : "text-slate-900"}`}>
                                    {teachers.unassigned}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600">Total Instructional Assignments:</span>
                                <span className="font-extrabold text-slate-900">{teachers.totalAssignments}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600">Total Weekly Instructional Demand:</span>
                                <span className="font-extrabold text-[#4085b3]">{teachers.totalRequiredPeriods} periods</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Timetable Status & Health */}
                <div className="lg:col-span-4">
                    <Card className="border border-slate-200 shadow-2xs h-full">
                        <CardHeader className="py-3 px-4 border-b border-slate-100 flex items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Timetable Operations
                            </CardTitle>
                            <Link href="/dashboard/academics/timetable" className="text-xs text-[#4085b3] hover:underline font-semibold">
                                Open Timetable
                            </Link>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600">Timetable Status:</span>
                                <span className={`font-extrabold px-2 py-0.5 rounded text-[10px] ${
                                    timetable.status === "PUBLISHED" 
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                                        : "bg-amber-50 text-amber-800 border border-amber-200"
                                }`}>
                                    {timetable.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600">Scheduled Periods:</span>
                                <span className="font-extrabold text-slate-900">
                                    {timetable.scheduledPeriods} / {timetable.requiredPeriods} ({timetable.coverageRate}%)
                                </span>
                            </div>
                            <div className={`flex items-center justify-between text-xs p-2.5 rounded-lg border ${
                                timetable.remainingPeriods > 0 ? "bg-amber-50/60 border-amber-200" : "bg-slate-50 border-slate-100"
                            }`}>
                                <span className={timetable.remainingPeriods > 0 ? "text-amber-900 font-semibold" : "text-slate-600"}>
                                    Remaining Unscheduled Periods:
                                </span>
                                <span className={`font-extrabold ${timetable.remainingPeriods > 0 ? "text-amber-950" : "text-emerald-700"}`}>
                                    {timetable.remainingPeriods}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600">Sections with Incomplete Timetables:</span>
                                <span className="font-extrabold text-slate-900">{timetable.incompleteSectionsCount}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-slate-600">Incomplete Teaching Assignments:</span>
                                <span className="font-extrabold text-slate-900">{timetable.incompleteAssignmentsCount}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Administrative Activity Feed */}
                <div className="lg:col-span-4">
                    <Card className="border border-slate-200 shadow-2xs h-full flex flex-col justify-between">
                        <CardHeader className="py-3 px-4 border-b border-slate-100 flex items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Recent Administrative Activity
                            </CardTitle>
                            <span className="text-[10px] text-slate-400 font-medium">Audit Log</span>
                        </CardHeader>
                        <CardContent className="p-3 space-y-2 flex-1 overflow-hidden">
                            {recentActivity.length === 0 ? (
                                <div className="text-center py-8 text-xs text-slate-400">
                                    No recent administrative activity recorded for this school.
                                </div>
                            ) : (
                                recentActivity.map((log) => (
                                    <div key={log.id} className="p-2 rounded-lg bg-slate-50/80 border border-slate-100 text-xs flex items-start gap-2">
                                        <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-slate-800 truncate leading-snug">
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
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 7. QUICK ACTIONS HUB */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Administrative Quick Actions
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    <Link
                        href="/dashboard/students"
                        className="p-3 rounded-lg border border-slate-200 hover:border-[#4085b3] hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
                    >
                        <Users className="w-5 h-5 text-[#4085b3] group-hover:scale-110 transition-transform mb-1.5" />
                        <span className="text-xs font-bold text-slate-800">Students</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Enrollment roster</span>
                    </Link>

                    <Link
                        href="/dashboard/students/placement"
                        className="p-3 rounded-lg border border-slate-200 hover:border-[#4085b3] hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
                    >
                        <UserCheck className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform mb-1.5" />
                        <span className="text-xs font-bold text-slate-800">Placement</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Section assignments</span>
                    </Link>

                    <Link
                        href="/dashboard/teachers"
                        className="p-3 rounded-lg border border-slate-200 hover:border-[#4085b3] hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
                    >
                        <GraduationCap className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform mb-1.5" />
                        <span className="text-xs font-bold text-slate-800">Teachers</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Staff & duties</span>
                    </Link>

                    <Link
                        href="/dashboard/academics/timetable"
                        className="p-3 rounded-lg border border-slate-200 hover:border-[#4085b3] hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
                    >
                        <CalendarRange className="w-5 h-5 text-[#4085b3] group-hover:scale-110 transition-transform mb-1.5" />
                        <span className="text-xs font-bold text-slate-800">Timetable</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Weekly grid & slots</span>
                    </Link>

                    <Link
                        href="/dashboard/academics/academic-years"
                        className="p-3 rounded-lg border border-slate-200 hover:border-[#4085b3] hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
                    >
                        <Calendar className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform mb-1.5" />
                        <span className="text-xs font-bold text-slate-800">Academic Years</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Lifecycle management</span>
                    </Link>

                    <Link
                        href="/dashboard/school"
                        className="p-3 rounded-lg border border-slate-200 hover:border-[#4085b3] hover:bg-slate-50 transition-all flex flex-col items-center justify-center text-center group cursor-pointer"
                    >
                        <Building2 className="w-5 h-5 text-slate-700 group-hover:scale-110 transition-transform mb-1.5" />
                        <span className="text-xs font-bold text-slate-800">School Profile</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Institutional setup</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
