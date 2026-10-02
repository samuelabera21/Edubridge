"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    ClipboardCheck, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    HelpCircle,
    UserCheck,
    Save,
    Search,
    Filter,
    User,
    ChevronLeft,
    ChevronRight,
    Eye,
    X,
    FileText,
    TrendingUp,
    ShieldAlert,
    RefreshCw
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface StudentAttendanceRow {
    id: string;
    date: string;
    status: AttendanceStatus;
    remarks?: string;
    studentId: string;
    enrollmentId: string;
    studentName: string;
    admissionNumber: string;
    gender?: string;
    gradeName: string;
    sectionName: string;
    classPeriodName: string;
    recordedBy?: { id: string; name: string } | null;
    createdAt: string;
}

interface StudentDetailData {
    student: {
        id: string;
        enrollmentId: string;
        name: string;
        admissionNumber: string;
        gender?: string;
        photoUrl?: string;
        gradeName: string;
        sectionName: string;
        academicYearName: string;
        status: string;
    };
    stats: {
        totalSessions: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        excusedCount: number;
        attendanceRate: number;
        consecutiveAbsences: number;
        isAtRisk: boolean;
    };
    records: Array<{
        id: string;
        date: string;
        status: AttendanceStatus;
        remarks?: string;
        classPeriodName: string;
        recordedBy?: { id: string; name: string } | null;
        createdAt: string;
    }>;
    corrections: Array<{
        id: string;
        date: string;
        originalStatus: string;
        requestedStatus: string;
        reasonCategory: string;
        justification: string;
        status: string;
        rejectionReason?: string;
        requestedBy?: { id: string; name: string } | null;
        reviewedBy?: { id: string; name: string } | null;
        reviewedAt?: string;
        createdAt: string;
    }>;
}

export default function StudentAttendancePage() {
    const searchParams = useSearchParams();
    const { authData } = useAuth();

    const [activeTab, setActiveTab] = useState<"INVESTIGATION" | "SECTION_RECORD">("INVESTIGATION");

    // Common Academic Structure
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);

    // Investigation Filters
    const [filterGradeId, setFilterGradeId] = useState<string>(searchParams.get("gradeId") || "");
    const [filterSectionId, setFilterSectionId] = useState<string>(searchParams.get("sectionId") || "");
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filterDate, setFilterDate] = useState<string>("");
    const [page, setPage] = useState<number>(1);
    const limit = 20;

    // Investigation Results State
    const [investigationData, setInvestigationData] = useState<{
        data: StudentAttendanceRow[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
        summary: { total: number; presentCount: number; lateCount: number; absentCount: number; excusedCount: number; attendanceRate: number };
    } | null>(null);
    const [loadingInvestigation, setLoadingInvestigation] = useState(false);
    const [errorInvestigation, setErrorInvestigation] = useState<string | null>(null);

    // Detail Modal State
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
    const [studentDetail, setStudentDetail] = useState<StudentDetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Section Recording View State
    const [recGradeId, setRecGradeId] = useState<string>("");
    const [recSectionId, setRecSectionId] = useState<string>("");
    const [recDate, setRecDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [recPeriodId, setRecPeriodId] = useState<string>("");
    const [classPeriods, setClassPeriods] = useState<any[]>([]);
    const [sectionRoster, setSectionRoster] = useState<any[]>([]);
    const [rosterAttendance, setRosterAttendance] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [savingRoster, setSavingRoster] = useState(false);
    const [rosterSuccessMsg, setRosterSuccessMsg] = useState<string | null>(null);

    // Load initial academic years and structure
    useEffect(() => {
        const initData = async () => {
            try {
                const yearsRes = await fetchApi("/academic/years");
                if (yearsRes.ok) {
                    const yearsData: AcademicYear[] = await yearsRes.json();
                    setYears(yearsData);
                    const active = yearsData.find(y => y.status === "ACTIVE");
                    if (active) {
                        setSelectedYearId(active.id);
                    }
                }
            } catch (e) {
                console.error("Failed to load years", e);
            }
        };
        initData();
    }, []);

    // Load grades whenever academic year changes
    useEffect(() => {
        if (!selectedYearId) return;
        const loadGrades = async () => {
            try {
                const res = await fetchApi(`/academic/years/${selectedYearId}/grades`);
                if (res.ok) {
                    const gData = await res.json();
                    setSchoolGrades(Array.isArray(gData) ? gData : []);
                }
            } catch (e) {
                console.error("Failed to load grades", e);
            }
        };
        loadGrades();
    }, [selectedYearId]);

    // Load investigation records
    const loadInvestigation = async () => {
        try {
            setLoadingInvestigation(true);
            setErrorInvestigation(null);

            const q = new URLSearchParams();
            if (selectedYearId) q.set("academicYearId", selectedYearId);
            if (filterGradeId) q.set("gradeId", filterGradeId);
            if (filterSectionId) q.set("sectionId", filterSectionId);
            if (filterStatus) q.set("status", filterStatus);
            if (searchQuery.trim()) q.set("search", searchQuery.trim());
            if (filterDate) q.set("date", filterDate);
            q.set("page", page.toString());
            q.set("limit", limit.toString());

            const res = await fetchApi(`/attendance/admin/students?${q.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to load student attendance data");
            }

            const data = await res.json();
            setInvestigationData(data);
        } catch (err: any) {
            setErrorInvestigation(err.message || "Failed to load investigation data");
        } finally {
            setLoadingInvestigation(false);
        }
    };

    useEffect(() => {
        if (activeTab === "INVESTIGATION") {
            loadInvestigation();
        }
    }, [selectedYearId, filterGradeId, filterSectionId, filterStatus, filterDate, page, activeTab]);

    // Investigation sections for selected filter grade
    const availableSections = useMemo(() => {
        if (!filterGradeId) return [];
        const found = schoolGrades.find(g => g.gradeId === filterGradeId || g.id === filterGradeId);
        return found?.sections || [];
    }, [schoolGrades, filterGradeId]);

    // Load Student Detail modal data
    const openStudentDetail = async (enrollmentId: string) => {
        setSelectedEnrollmentId(enrollmentId);
        setLoadingDetail(true);
        try {
            const query = selectedYearId ? `?academicYearId=${selectedYearId}` : "";
            const res = await fetchApi(`/attendance/admin/students/${enrollmentId}${query}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to load student details");
            }
            const data = await res.json();
            setStudentDetail(data);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoadingDetail(false);
        }
    };

    // --- Section Recording Functions ---
    const recAvailableSections = useMemo(() => {
        if (!recGradeId) return [];
        const found = schoolGrades.find(g => g.gradeId === recGradeId || g.id === recGradeId);
        return found?.sections || [];
    }, [schoolGrades, recGradeId]);

    const loadSectionRoster = async () => {
        if (!recSectionId || !recDate) return;
        try {
            setLoadingRoster(true);
            setRosterSuccessMsg(null);

            const q = new URLSearchParams({ date: recDate });
            if (recPeriodId) q.set("classPeriodId", recPeriodId);

            const res = await fetchApi(`/attendance/student/section/${recSectionId}?${q.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setSectionRoster(Array.isArray(data) ? data : []);

                const initialMap: Record<string, { status: AttendanceStatus; remarks: string }> = {};
                for (const item of data) {
                    initialMap[item.enrollment.id] = {
                        status: item.attendance?.status || "PRESENT",
                        remarks: item.attendance?.remarks || ""
                    };
                }
                setRosterAttendance(initialMap);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRoster(false);
        }
    };

    useEffect(() => {
        if (activeTab === "SECTION_RECORD" && recSectionId) {
            loadSectionRoster();
        }
    }, [recSectionId, recDate, recPeriodId, activeTab]);

    const handleSaveRoster = async () => {
        if (!selectedYearId || !recSectionId || !recDate) return;
        try {
            setSavingRoster(true);
            setRosterSuccessMsg(null);

            const records = Object.entries(rosterAttendance).map(([enrollmentId, val]) => ({
                enrollmentId,
                status: val.status,
                remarks: val.remarks
            }));

            const res = await fetchApi("/attendance/student/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId: selectedYearId,
                    sectionId: recSectionId,
                    date: recDate,
                    classPeriodId: recPeriodId || undefined,
                    records
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to save attendance");
            }

            setRosterSuccessMsg(`Successfully saved attendance for ${records.length} students!`);
            loadSectionRoster();
        } catch (err: any) {
            alert(err.message || "Failed to save roster");
        } finally {
            setSavingRoster(false);
        }
    };

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <span>Student Attendance</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        School-wide attendance records audit and section roll-call
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    {/* Academic Year Selector */}
                    {years.length > 0 && (
                        <select
                            value={selectedYearId}
                            onChange={(e) => { setSelectedYearId(e.target.value); setPage(1); }}
                            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white font-medium shadow-sm focus:ring-2 focus:ring-[#006b3f]"
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.status === "ACTIVE" ? "(Active)" : ""}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex border-b border-gray-200 space-x-8">
                <button
                    onClick={() => setActiveTab("INVESTIGATION")}
                    className={`py-3 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                        activeTab === "INVESTIGATION"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <Search className="w-4 h-4" />
                    <span>School-Wide Investigation & Logs</span>
                </button>
                <button
                    onClick={() => setActiveTab("SECTION_RECORD")}
                    className={`py-3 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                        activeTab === "SECTION_RECORD"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Classroom Section Daily Roll-Call</span>
                </button>
            </div>

            {/* TAB 1: SCHOOL-WIDE INVESTIGATION */}
            {activeTab === "INVESTIGATION" && (
                <div className="space-y-6">
                    {/* Filter Bar */}
                    <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                {/* Search */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Search Student</label>
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Name or Admission #"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); loadInvestigation(); } }}
                                            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                        />
                                    </div>
                                </div>

                                {/* Grade Filter */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Grade</label>
                                    <select
                                        value={filterGradeId}
                                        onChange={(e) => {
                                            setFilterGradeId(e.target.value);
                                            setFilterSectionId("");
                                            setPage(1);
                                        }}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                                    >
                                        <option value="">All Grades</option>
                                        {schoolGrades.map(sg => (
                                            <option key={sg.id} value={sg.gradeId || sg.id}>
                                                {sg.grade?.name || sg.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Section Filter */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Section</label>
                                    <select
                                        value={filterSectionId}
                                        onChange={(e) => { setFilterSectionId(e.target.value); setPage(1); }}
                                        disabled={!filterGradeId}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
                                    >
                                        <option value="">All Sections</option>
                                        {availableSections.map((sec: any) => (
                                            <option key={sec.id} value={sec.id}>
                                                {sec.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Status Filter */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Status</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                                    >
                                        <option value="">All Statuses</option>
                                        <option value="PRESENT">Present</option>
                                        <option value="LATE">Late</option>
                                        <option value="ABSENT">Absent</option>
                                        <option value="EXCUSED">Excused</option>
                                    </select>
                                </div>

                                {/* Date Filter */}
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Date</label>
                                    <div className="flex space-x-2">
                                        <input
                                            type="date"
                                            value={filterDate}
                                            onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                                        />
                                        {filterDate && (
                                            <button
                                                onClick={() => { setFilterDate(""); setPage(1); }}
                                                className="p-1.5 text-gray-400 hover:text-gray-700 text-xs"
                                                title="Clear date"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Investigation Summary Ribbon */}
                    {investigationData?.summary && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-gray-500 uppercase">Filtered Records</span>
                                <p className="text-xl font-bold text-gray-900 mt-0.5">{investigationData.summary.total}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-gray-500 uppercase">Presence Rate</span>
                                <p className="text-xl font-bold text-gray-900 mt-0.5">
                                    {investigationData.summary.total > 0 ? `${investigationData.summary.attendanceRate}%` : "—"}
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-emerald-700 uppercase">Present</span>
                                <p className="text-xl font-bold text-emerald-700 mt-0.5">{investigationData.summary.presentCount}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-amber-700 uppercase">Late</span>
                                <p className="text-xl font-bold text-amber-700 mt-0.5">{investigationData.summary.lateCount}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-red-700 uppercase">Absent</span>
                                <p className="text-xl font-bold text-red-700 mt-0.5">{investigationData.summary.absentCount}</p>
                            </div>
                        </div>
                    )}

                    {/* Investigation Table */}
                    <Card className="border-gray-200 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            {loadingInvestigation ? (
                                <div className="p-12">
                                    <LoadingState message="Searching student attendance records..." />
                                </div>
                            ) : errorInvestigation ? (
                                <div className="p-8">
                                    <ErrorState message={errorInvestigation} onRetry={loadInvestigation} />
                                </div>
                            ) : !investigationData || investigationData.data.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p className="font-bold text-gray-700">No attendance records found</p>
                                    <p className="text-xs text-gray-500 mt-1">Try adjusting your filters or date range.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Student</th>
                                                <th className="px-4 py-3 font-semibold">Admission #</th>
                                                <th className="px-4 py-3 font-semibold">Grade & Section</th>
                                                <th className="px-4 py-3 font-semibold">Date</th>
                                                <th className="px-4 py-3 font-semibold">Status</th>
                                                <th className="px-4 py-3 font-semibold">Period / Type</th>
                                                <th className="px-4 py-3 font-semibold">Recorded By</th>
                                                <th className="px-6 py-3 font-semibold text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {investigationData.data.map((row) => (
                                                <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-6 py-3.5 font-bold text-gray-900">
                                                        {row.studentName}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs font-mono text-gray-600">
                                                        {row.admissionNumber}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-gray-700">
                                                        {row.gradeName} — {row.sectionName}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs font-medium text-gray-800">
                                                        {row.date}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {row.status === "PRESENT" ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                                PRESENT
                                                            </span>
                                                        ) : row.status === "LATE" ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                                LATE
                                                            </span>
                                                        ) : row.status === "ABSENT" ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                                                ABSENT
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                                EXCUSED
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-gray-500">
                                                        {row.classPeriodName}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-gray-500">
                                                        {row.recordedBy?.name || "System / Staff"}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openStudentDetail(row.enrollmentId)}
                                                            className="text-xs flex items-center space-x-1"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>Timeline</span>
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {investigationData && investigationData.pagination.totalPages > 1 && (
                                <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, investigationData.pagination.total)} of {investigationData.pagination.total} entries
                                    </p>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page <= 1}
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span className="text-xs font-bold text-gray-700">
                                            Page {page} of {investigationData.pagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page >= investigationData.pagination.totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 2: CLASSROOM SECTION RECORDING */}
            {activeTab === "SECTION_RECORD" && (
                <div className="space-y-6">
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="py-4 border-b border-gray-100">
                            <CardTitle className="text-base font-bold text-gray-900">
                                Section Attendance Roll-Call Selector
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Grade</label>
                                    <select
                                        value={recGradeId}
                                        onChange={(e) => {
                                            setRecGradeId(e.target.value);
                                            setRecSectionId("");
                                        }}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                                    >
                                        <option value="">Select Grade</option>
                                        {schoolGrades.map(sg => (
                                            <option key={sg.id} value={sg.gradeId || sg.id}>
                                                {sg.grade?.name || sg.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Section</label>
                                    <select
                                        value={recSectionId}
                                        onChange={(e) => setRecSectionId(e.target.value)}
                                        disabled={!recGradeId}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
                                    >
                                        <option value="">Select Section</option>
                                        {recAvailableSections.map((sec: any) => (
                                            <option key={sec.id} value={sec.id}>
                                                {sec.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={recDate}
                                        onChange={(e) => setRecDate(e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                                    />
                                </div>

                                <div className="flex items-end">
                                    <Button
                                        onClick={loadSectionRoster}
                                        disabled={!recSectionId}
                                        className="w-full bg-[#006b3f] hover:bg-[#005a34] text-white"
                                    >
                                        Load Roster
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {rosterSuccessMsg && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-semibold flex items-center">
                            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
                            {rosterSuccessMsg}
                        </div>
                    )}

                    {loadingRoster ? (
                        <LoadingState message="Loading section student roster..." />
                    ) : sectionRoster.length > 0 ? (
                        <Card className="border-gray-200 shadow-sm">
                            <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold text-gray-900">
                                    Student Roll-Call Roster ({sectionRoster.length} Students)
                                </CardTitle>
                                <Button
                                    onClick={handleSaveRoster}
                                    disabled={savingRoster}
                                    className="bg-[#006b3f] hover:bg-[#005a34] text-white text-xs flex items-center space-x-1"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{savingRoster ? "Saving..." : "Save All Records"}</span>
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3.5 font-semibold">Student</th>
                                                <th className="px-4 py-3.5 font-semibold">Admission #</th>
                                                <th className="px-6 py-3.5 font-semibold">Attendance Status</th>
                                                <th className="px-6 py-3.5 font-semibold">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {sectionRoster.map((item) => {
                                                const enrId = item.enrollment.id;
                                                const currentVal = rosterAttendance[enrId] || { status: "PRESENT", remarks: "" };
                                                return (
                                                    <tr key={enrId} className="hover:bg-gray-50/50">
                                                        <td className="px-6 py-3 font-bold text-gray-900">
                                                            {item.enrollment.student.firstName} {item.enrollment.student.lastName}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-mono text-gray-600">
                                                            {item.enrollment.student.admissionNumber}
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <div className="flex space-x-1.5">
                                                                {[
                                                                    { label: "P", full: "PRESENT", color: "bg-emerald-600 text-white" },
                                                                    { label: "L", full: "LATE", color: "bg-amber-500 text-white" },
                                                                    { label: "A", full: "ABSENT", color: "bg-red-600 text-white" },
                                                                    { label: "E", full: "EXCUSED", color: "bg-blue-600 text-white" }
                                                                ].map((btn) => (
                                                                    <button
                                                                        key={btn.full}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setRosterAttendance(prev => ({
                                                                                ...prev,
                                                                                [enrId]: {
                                                                                    ...prev[enrId],
                                                                                    status: btn.full as AttendanceStatus
                                                                                }
                                                                            }));
                                                                        }}
                                                                        className={`w-8 h-8 rounded-md text-xs font-extrabold transition-all ${
                                                                            currentVal.status === btn.full
                                                                                ? `${btn.color} ring-2 ring-offset-1 ring-gray-400`
                                                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                                        }`}
                                                                    >
                                                                        {btn.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-3">
                                                            <input
                                                                type="text"
                                                                placeholder="Optional notes..."
                                                                value={currentVal.remarks}
                                                                onChange={(e) => {
                                                                    const text = e.target.value;
                                                                    setRosterAttendance(prev => ({
                                                                        ...prev,
                                                                        [enrId]: { ...prev[enrId], remarks: text }
                                                                    }));
                                                                }}
                                                                className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-[#006b3f]"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            <p className="text-sm font-semibold text-gray-600">Select Grade, Section, and Date above to load student roll-call.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Individual Student Detail Modal */}
            {selectedEnrollmentId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-150">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {studentDetail?.student.name || "Student Timeline"}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {studentDetail?.student.admissionNumber} • {studentDetail?.student.gradeName} - {studentDetail?.student.sectionName}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelectedEnrollmentId(null); setStudentDetail(null); }}
                                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {loadingDetail ? (
                                <LoadingState message="Loading student attendance history..." />
                            ) : studentDetail ? (
                                <>
                                    {/* Stats KPI Ribbon */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <span className="text-[10px] font-bold text-emerald-800 uppercase">Presence Rate</span>
                                            <p className="text-2xl font-extrabold text-emerald-900">{studentDetail.stats.attendanceRate}%</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Total Sessions</span>
                                            <p className="text-2xl font-extrabold text-gray-900">{studentDetail.stats.totalSessions}</p>
                                        </div>
                                        <div className={`p-3 rounded-lg border ${
                                            studentDetail.stats.consecutiveAbsences >= 3
                                                ? "bg-red-50 border-red-200"
                                                : "bg-gray-50 border-gray-200"
                                        }`}>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Absence Streak</span>
                                            <p className={`text-2xl font-extrabold ${
                                                studentDetail.stats.consecutiveAbsences >= 3 ? "text-red-700" : "text-gray-900"
                                            }`}>
                                                {studentDetail.stats.consecutiveAbsences} Days
                                            </p>
                                        </div>
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <span className="text-[10px] font-bold text-blue-800 uppercase">Excused / Late</span>
                                            <p className="text-2xl font-extrabold text-blue-900">
                                                {studentDetail.stats.excusedCount} / {studentDetail.stats.lateCount}
                                            </p>
                                        </div>
                                    </div>

                                    {studentDetail.stats.isAtRisk && (
                                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800 text-xs font-semibold">
                                            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                                            <span>Flagged at risk due to consecutive absences (≥3 days) or low overall presence rate (&lt;80%).</span>
                                        </div>
                                    )}

                                    {/* Chronological History */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                            <Clock className="w-4 h-4 mr-1.5 text-gray-500" />
                                            Chronological Attendance Log
                                        </h4>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 text-gray-500 uppercase border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-2.5 font-semibold">Date</th>
                                                        <th className="px-4 py-2.5 font-semibold">Status</th>
                                                        <th className="px-4 py-2.5 font-semibold">Session</th>
                                                        <th className="px-4 py-2.5 font-semibold">Recorded By</th>
                                                        <th className="px-4 py-2.5 font-semibold">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {studentDetail.records.map((r) => (
                                                        <tr key={r.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 font-medium text-gray-900">{r.date}</td>
                                                            <td className="px-4 py-2">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    r.status === "PRESENT"
                                                                        ? "bg-emerald-100 text-emerald-800"
                                                                        : r.status === "LATE"
                                                                        ? "bg-amber-100 text-amber-800"
                                                                        : r.status === "ABSENT"
                                                                        ? "bg-red-100 text-red-800"
                                                                        : "bg-blue-100 text-blue-800"
                                                                }`}>
                                                                    {r.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-600">{r.classPeriodName}</td>
                                                            <td className="px-4 py-2 text-gray-500">{r.recordedBy?.name || "System"}</td>
                                                            <td className="px-4 py-2 text-gray-500">{r.remarks || "—"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Correction Audit Log */}
                                    {studentDetail.corrections.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                                <FileText className="w-4 h-4 mr-1.5 text-emerald-600" />
                                                Official Attendance Corrections & Overrides
                                            </h4>
                                            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                                                {studentDetail.corrections.map((c) => (
                                                    <div key={c.id} className="p-3 text-xs bg-gray-50/50 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-gray-900">
                                                                {c.date}: {c.originalStatus} ➔ {c.requestedStatus}
                                                            </span>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                c.status === "APPROVED"
                                                                    ? "bg-emerald-100 text-emerald-800"
                                                                    : c.status === "REJECTED"
                                                                    ? "bg-red-100 text-red-800"
                                                                    : "bg-amber-100 text-amber-800"
                                                            }`}>
                                                                {c.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600">Category: {c.reasonCategory} • {c.justification}</p>
                                                        {c.reviewedBy && (
                                                            <p className="text-[10px] text-gray-400">
                                                                Authorized by {c.reviewedBy.name} on {c.reviewedAt?.slice(0, 10)}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <Button
                                variant="outline"
                                onClick={() => { setSelectedEnrollmentId(null); setStudentDetail(null); }}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
