"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    ClipboardCheck, 
    Users, 
    UserCheck, 
    XCircle, 
    AlertTriangle, 
    CheckCircle2, 
    Calendar, 
    ArrowRight,
    TrendingUp,
    Clock,
    School,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    RefreshCw,
    Activity,
    Layers,
    FileCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

interface OverviewData {
    academicYearId: string | null;
    academicYearList: Array<{ id: string; name: string; status: string }>;
    summary: {
        studentAttendanceRate: number;
        teacherAttendanceRate: number;
        totalEnrolledStudents: number;
        totalActiveTeachers: number;
        totalStudentRecords: number;
        totalTeacherRecords: number;
        studentStats: { present: number; late: number; absent: number; excused: number };
        teacherStats: { present: number; late: number; absent: number; excused: number };
    };
    todaySnapshot: {
        date: string;
        student: {
            present: number;
            late: number;
            absent: number;
            excused: number;
            totalMarked: number;
            totalEnrolled: number;
            rate: number;
        };
        teacher: {
            present: number;
            late: number;
            absent: number;
            excused: number;
            totalMarked: number;
            totalActive: number;
            rate: number;
        };
    };
    trends: Array<{
        date: string;
        studentPresent: number;
        studentLate: number;
        studentAbsent: number;
        studentExcused: number;
        studentTotal: number;
        teacherPresent: number;
        teacherLate: number;
        teacherAbsent: number;
        teacherExcused: number;
        teacherTotal: number;
        studentRate: number | null;
        teacherRate: number | null;
    }>;
    gradeBreakdown: Array<{
        gradeId: string;
        schoolGradeId: string;
        gradeName: string;
        gradeLevel: number;
        totalStudents: number;
        totalRecords: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        excusedCount: number;
        attendanceRate: number;
        healthStatus: "Healthy" | "Attention" | "Critical";
        sections: Array<{
            id: string;
            name: string;
            enrollmentCount: number;
            totalRecords: number;
            presentCount: number;
            lateCount: number;
            absentCount: number;
            excusedCount: number;
            attendanceRate: number;
            healthStatus: "Healthy" | "Attention" | "Critical";
        }>;
    }>;
    sectionAnomalies: Array<{
        id: string;
        name: string;
        gradeName: string;
        enrollmentCount: number;
        totalRecords: number;
        attendanceRate: number;
        healthStatus: "Healthy" | "Attention" | "Critical";
    }>;
    riskCounters: {
        totalAlerts: number;
        critical: number;
        warning: number;
        pendingCorrections: number;
    };
}

export default function AttendanceOverviewPage() {
    const router = useRouter();
    const { authData } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [rangeDays, setRangeDays] = useState<number>(30);
    const [data, setData] = useState<OverviewData | null>(null);
    const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});

    const loadData = async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const query = new URLSearchParams();
            if (selectedYearId) query.set("academicYearId", selectedYearId);
            query.set("rangeDays", rangeDays.toString());

            const res = await fetchApi(`/attendance/admin/overview?${query.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to load executive attendance overview");
            }

            const overviewData: OverviewData = await res.json();
            setData(overviewData);

            if (!selectedYearId && overviewData.academicYearId) {
                setSelectedYearId(overviewData.academicYearId);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load attendance oversight dashboard.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedYearId, rangeDays]);

    const toggleGradeExpand = (gradeId: string) => {
        setExpandedGrades(prev => ({
            ...prev,
            [gradeId]: !prev[gradeId]
        }));
    };

    if (loading && !data) {
        return <LoadingState message="Loading school attendance intelligence..." />;
    }

    if (error && !data) {
        return <ErrorState message={error} onRetry={() => loadData()} />;
    }

    const summary = data?.summary;
    const today = data?.todaySnapshot;
    const trends = data?.trends || [];
    const gradeBreakdown = data?.gradeBreakdown || [];
    const sectionAnomalies = data?.sectionAnomalies || [];
    const riskCounters = data?.riskCounters;

    // SVG Trend Chart points calculation
    const validTrends = trends.filter(t => t.studentRate !== null || t.teacherRate !== null);
    const chartHeight = 160;
    const chartWidth = 600;
    const padding = 30;

    const studentPoints = validTrends.map((t, index) => {
        const x = padding + (index / Math.max(1, validTrends.length - 1)) * (chartWidth - padding * 2);
        const rate = t.studentRate ?? 100;
        const y = chartHeight - padding - ((rate - 50) / 50) * (chartHeight - padding * 2);
        return `${x},${Math.max(padding, Math.min(chartHeight - padding, y))}`;
    }).join(" ");

    const teacherPoints = validTrends.map((t, index) => {
        const x = padding + (index / Math.max(1, validTrends.length - 1)) * (chartWidth - padding * 2);
        const rate = t.teacherRate ?? 100;
        const y = chartHeight - padding - ((rate - 50) / 50) * (chartHeight - padding * 2);
        return `${x},${Math.max(padding, Math.min(chartHeight - padding, y))}`;
    }).join(" ");

    return (
        <div className="space-y-6 text-black">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-50 text-[#006b3f] rounded-lg">
                        <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Attendance Overview</h1>
                        <p className="text-xs text-gray-500">School-wide attendance metrics and trends</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Quick Navigation Badges */}
                    <button
                        onClick={() => router.push("/dashboard/attendance/alerts")}
                        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50/70 text-red-800 text-xs font-semibold hover:bg-red-100 transition-colors"
                    >
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                        <span>Risk Alerts</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                            riskCounters && riskCounters.totalAlerts > 0 ? "bg-red-600 text-white" : "bg-red-200 text-red-800"
                        }`}>
                            {riskCounters?.totalAlerts || 0}
                        </span>
                    </button>

                    <button
                        onClick={() => router.push("/dashboard/attendance/corrections")}
                        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 text-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                    >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Corrections</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                            riskCounters && riskCounters.pendingCorrections > 0 ? "bg-amber-500 text-white" : "bg-emerald-200 text-emerald-800"
                        }`}>
                            {riskCounters?.pendingCorrections || 0}
                        </span>
                    </button>

                    {/* Academic Year Switcher */}
                    {data?.academicYearList && data.academicYearList.length > 0 && (
                        <div className="flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            <select
                                value={selectedYearId}
                                onChange={(e) => setSelectedYearId(e.target.value)}
                                className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none cursor-pointer"
                            >
                                {data.academicYearList.map(y => (
                                    <option key={y.id} value={y.id}>
                                        {y.name} {y.status === "ACTIVE" ? "(Active)" : ""}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Trend Period Selector */}
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                        {[
                            { label: "7D", value: 7 },
                            { label: "14D", value: 14 },
                            { label: "30D", value: 30 }
                        ].map((btn) => (
                            <button
                                key={btn.value}
                                onClick={() => setRangeDays(btn.value)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                                    rangeDays === btn.value
                                        ? "bg-white text-[#006b3f] shadow-sm font-bold"
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="h-8 px-2.5 text-xs flex items-center space-x-1"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Core KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Student Attendance Rate */}
                <Card className="border-gray-200 shadow-sm hover:border-emerald-300 transition-colors">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">Student Attendance</span>
                            <div className="p-1.5 bg-emerald-50 text-[#006b3f] rounded-md">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-gray-900">
                                {summary ? `${summary.studentAttendanceRate}%` : "—"}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                (summary?.studentAttendanceRate || 0) >= 90
                                    ? "bg-emerald-100 text-emerald-800"
                                    : (summary?.studentAttendanceRate || 0) >= 80
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                            }`}>
                                {(summary?.studentAttendanceRate || 0) >= 90 ? "Healthy" : (summary?.studentAttendanceRate || 0) >= 80 ? "Attention" : "Critical"}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {summary?.totalEnrolledStudents || 0} enrolled students
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Teacher Attendance Rate */}
                <Card className="border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">Teacher Attendance</span>
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                                <UserCheck className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-gray-900">
                                {summary ? `${summary.teacherAttendanceRate}%` : "—"}
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                Term Avg
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {summary?.totalActiveTeachers || 0} active teachers
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Students Today */}
                <Card className="border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">Students Today</span>
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                                <School className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-gray-900">
                                {today ? `${today.student.present + today.student.late}` : "0"}
                                <span className="text-xs font-normal text-gray-400"> / {today?.student.totalEnrolled || 0}</span>
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                                {today?.student.rate || 0}%
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {today?.student.present || 0} Present · <span className="text-red-600 font-medium">{today?.student.absent || 0} Absent</span>
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Teachers Today */}
                <Card className="border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-500">Teachers Today</span>
                            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                                <Users className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-2xl font-bold text-gray-900">
                                {today ? `${today.teacher.present + today.teacher.late}` : "0"}
                                <span className="text-xs font-normal text-gray-400"> / {today?.teacher.totalActive || 0}</span>
                            </span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                {today?.teacher.rate || 0}%
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {today?.teacher.present || 0} Present · <span className="text-red-600 font-medium">{today?.teacher.absent || 0} Absent</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Multi-Line Attendance Rate Trends Chart */}
            <Card className="border-gray-200 shadow-sm">
                <CardHeader className="py-3.5 px-5 border-b border-gray-100 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                            <Activity className="w-4 h-4 mr-2 text-[#006b3f]" />
                            Attendance Trends
                        </CardTitle>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Daily rate over the last {rangeDays} days
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                        <div className="flex items-center space-x-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#006b3f]" />
                            <span className="font-semibold text-gray-700">Students</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                            <span className="font-semibold text-gray-700">Teachers</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    {validTrends.length === 0 ? (
                        <div className="py-10 text-center text-gray-400">
                            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm font-medium text-gray-600">No attendance data recorded for this period</p>
                        </div>
                    ) : (
                        <div className="relative">
                            <svg
                                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                className="w-full h-44 overflow-visible"
                            >
                                {/* Grid lines */}
                                {[100, 90, 80, 70, 60, 50].map((rate) => {
                                    const y = chartHeight - padding - ((rate - 50) / 50) * (chartHeight - padding * 2);
                                    return (
                                        <g key={rate}>
                                            <line
                                                x1={padding}
                                                y1={y}
                                                x2={chartWidth - padding}
                                                y2={y}
                                                stroke="#f3f4f6"
                                                strokeWidth="1"
                                                strokeDasharray={rate === 80 || rate === 90 ? "4 4" : undefined}
                                            />
                                            <text
                                                x={padding - 6}
                                                y={y + 3}
                                                textAnchor="end"
                                                fontSize="9"
                                                fill="#9ca3af"
                                            >
                                                {rate}%
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Student Line */}
                                {studentPoints && (
                                    <polyline
                                        fill="none"
                                        stroke="#006b3f"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={studentPoints}
                                    />
                                )}

                                {/* Teacher Line */}
                                {teacherPoints && (
                                    <polyline
                                        fill="none"
                                        stroke="#2563eb"
                                        strokeWidth="2"
                                        strokeDasharray="3 3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={teacherPoints}
                                    />
                                )}

                                {/* X-axis dates */}
                                {validTrends.map((t, idx) => {
                                    if (idx === 0 || idx === Math.floor(validTrends.length / 2) || idx === validTrends.length - 1) {
                                        const x = padding + (idx / Math.max(1, validTrends.length - 1)) * (chartWidth - padding * 2);
                                        const dateLabel = t.date.slice(5);
                                        return (
                                            <text
                                                key={t.date}
                                                x={x}
                                                y={chartHeight - 8}
                                                textAnchor="middle"
                                                fontSize="9"
                                                fill="#6b7280"
                                            >
                                                {dateLabel}
                                            </text>
                                        );
                                    }
                                    return null;
                                })}
                            </svg>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Section Anomalies / Attention List (If any section < 85%) */}
            {sectionAnomalies.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/40 shadow-sm">
                    <CardHeader className="py-4 px-6 border-b border-amber-200 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-amber-900 flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                            Section Attendance Anomalies ({sectionAnomalies.length} Deficits Detected)
                        </CardTitle>
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-amber-200 text-amber-900">
                            Threshold: &lt; 85%
                        </span>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-amber-200/60">
                            {sectionAnomalies.map((sec) => (
                                <div key={sec.id} className="p-4 flex items-center justify-between hover:bg-amber-100/40 transition-colors">
                                    <div>
                                        <h4 className="font-bold text-gray-900">
                                            {sec.gradeName} — {sec.name}
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-0.5">
                                            {sec.enrollmentCount} Enrolled Students • {sec.totalRecords} Recorded Sessions
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <div className="text-right">
                                            <span className="text-base font-extrabold text-red-700">
                                                {sec.attendanceRate}%
                                            </span>
                                            <p className="text-[10px] text-gray-500">Cumulative Rate</p>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/attendance/student?sectionId=${sec.id}`)}
                                            className="text-xs bg-white border-amber-300 hover:bg-amber-50"
                                        >
                                            Investigate Section
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Grade & Section Performance Matrix */}
            <Card className="border-gray-200 shadow-sm">
                <CardHeader className="py-3.5 px-5 border-b border-gray-100 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                            <Layers className="w-4 h-4 mr-2 text-[#006b3f]" />
                            Grade Breakdown
                        </CardTitle>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Attendance rate by grade and section
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">≥ 90% Healthy</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">80-89% Attention</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800">&lt; 80% Critical</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {gradeBreakdown.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <p className="text-sm font-semibold text-gray-600">No grades registered for this academic year.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {gradeBreakdown.map((grade) => {
                                const isExpanded = !!expandedGrades[grade.gradeId];
                                return (
                                    <div key={grade.gradeId} className="transition-colors">
                                        <div 
                                            onClick={() => toggleGradeExpand(grade.gradeId)}
                                            className="p-4 sm:px-6 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-3 h-3 rounded-full ${
                                                    grade.healthStatus === "Healthy"
                                                        ? "bg-emerald-500"
                                                        : grade.healthStatus === "Attention"
                                                        ? "bg-amber-500"
                                                        : "bg-red-500"
                                                }`} />
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                                                        {grade.gradeName}
                                                    </h3>
                                                    <p className="text-xs text-gray-500">
                                                        {grade.totalStudents} Students • {grade.sections.length} Sections
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-4">
                                                <div className="text-right">
                                                    <span className="text-base font-extrabold text-gray-900">
                                                        {grade.attendanceRate}%
                                                    </span>
                                                    <p className="text-[10px] text-gray-400">Term Average</p>
                                                </div>
                                                <div className="text-gray-400">
                                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Collapsible Sections Table */}
                                        {isExpanded && (
                                            <div className="bg-gray-50/80 px-6 py-3 border-t border-gray-100">
                                                {grade.sections.length === 0 ? (
                                                    <p className="text-xs text-gray-500 py-2">No sections defined for this grade.</p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-xs text-left">
                                                            <thead>
                                                                <tr className="text-gray-500 border-b border-gray-200">
                                                                    <th className="py-2 font-semibold">Section</th>
                                                                    <th className="py-2 font-semibold">Enrolled</th>
                                                                    <th className="py-2 font-semibold">Present</th>
                                                                    <th className="py-2 font-semibold">Late</th>
                                                                    <th className="py-2 font-semibold">Absent</th>
                                                                    <th className="py-2 font-semibold">Excused</th>
                                                                    <th className="py-2 font-semibold text-right">Presence Rate</th>
                                                                    <th className="py-2 font-semibold text-right">Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100">
                                                                {grade.sections.map((sec) => (
                                                                    <tr key={sec.id} className="hover:bg-white/80 transition-colors">
                                                                        <td className="py-2.5 font-bold text-gray-900">
                                                                            {sec.name}
                                                                        </td>
                                                                        <td className="py-2.5 text-gray-700">
                                                                            {sec.enrollmentCount}
                                                                        </td>
                                                                        <td className="py-2.5 text-emerald-700 font-semibold">
                                                                            {sec.presentCount}
                                                                        </td>
                                                                        <td className="py-2.5 text-amber-700">
                                                                            {sec.lateCount}
                                                                        </td>
                                                                        <td className="py-2.5 text-red-700 font-semibold">
                                                                            {sec.absentCount}
                                                                        </td>
                                                                        <td className="py-2.5 text-blue-700">
                                                                            {sec.excusedCount}
                                                                        </td>
                                                                        <td className="py-2.5 text-right font-extrabold text-gray-900">
                                                                            <span className={`inline-block px-2 py-0.5 rounded ${
                                                                                sec.healthStatus === "Healthy"
                                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                                    : sec.healthStatus === "Attention"
                                                                                    ? "bg-amber-100 text-amber-800"
                                                                                    : "bg-red-100 text-red-800"
                                                                            }`}>
                                                                                {sec.attendanceRate}%
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2.5 text-right">
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    router.push(`/dashboard/attendance/student?sectionId=${sec.id}&gradeId=${grade.gradeId}`);
                                                                                }}
                                                                                className="text-xs font-semibold text-[#006b3f] hover:underline"
                                                                            >
                                                                                Inspect
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
