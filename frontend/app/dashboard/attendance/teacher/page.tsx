"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Users, 
    Calendar, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    UserCheck, 
    Save, 
    Search, 
    Eye, 
    X, 
    Briefcase,
    ShieldAlert,
    ChevronLeft,
    ChevronRight,
    RefreshCw
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface TeacherAttendanceRow {
    id: string;
    date: string;
    status: AttendanceStatus;
    remarks?: string;
    teacherId: string;
    teacherName: string;
    employeeId: string;
    email: string;
    photoUrl?: string | null;
    recordedBy?: { id: string; name: string } | null;
    createdAt: string;
}

interface TeacherDetailData {
    teacher: {
        id: string;
        name: string;
        employeeId: string;
        email: string;
        status: string;
        phone?: string;
        specializations: string[];
        assignments: Array<{
            id: string;
            subjectName: string;
            gradeName: string;
            sectionName: string;
        }>;
    };
    stats: {
        totalDays: number;
        presentCount: number;
        lateCount: number;
        absentCount: number;
        excusedCount: number;
        attendanceRate: number;
        isAtRisk: boolean;
    };
    records: Array<{
        id: string;
        date: string;
        status: AttendanceStatus;
        remarks?: string;
        recordedBy?: { id: string; name: string } | null;
        createdAt: string;
    }>;
}

export default function TeacherAttendancePage() {
    const { authData } = useAuth();
    const [activeTab, setActiveTab] = useState<"OVERSIGHT" | "DAILY_RECORD">("OVERSIGHT");

    // Academic Structure
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");

    // Oversight Filters
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [filterDate, setFilterDate] = useState<string>("");
    const [page, setPage] = useState<number>(1);
    const limit = 20;

    // Oversight Data State
    const [oversightData, setOversightData] = useState<{
        data: TeacherAttendanceRow[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
        summary: { totalMarked: number; totalActiveTeachers: number; presentCount: number; lateCount: number; absentCount: number; excusedCount: number; attendanceRate: number };
    } | null>(null);
    const [loadingOversight, setLoadingOversight] = useState(false);
    const [errorOversight, setErrorOversight] = useState<string | null>(null);

    // Individual Teacher Detail Modal
    const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
    const [teacherDetail, setTeacherDetail] = useState<TeacherDetailData | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Daily Record Roster State
    const [recDate, setRecDate] = useState<string>(new Date().toISOString().split("T")[0]);
    const [dailyRoster, setDailyRoster] = useState<any[]>([]);
    const [rosterAttendance, setRosterAttendance] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>({});
    const [loadingDailyRoster, setLoadingDailyRoster] = useState(false);
    const [savingDailyRoster, setSavingDailyRoster] = useState(false);
    const [dailySuccessMsg, setDailySuccessMsg] = useState<string | null>(null);

    // Load academic years
    useEffect(() => {
        const initYears = async () => {
            try {
                const res = await fetchApi("/academic/years");
                if (res.ok) {
                    const data: AcademicYear[] = await res.json();
                    setYears(data);
                    const active = data.find(y => y.status === "ACTIVE");
                    if (active) setSelectedYearId(active.id);
                }
            } catch (e) {
                console.error(e);
            }
        };
        initYears();
    }, []);

    // Load oversight logs
    const loadOversight = async () => {
        try {
            setLoadingOversight(true);
            setErrorOversight(null);

            const q = new URLSearchParams();
            if (selectedYearId) q.set("academicYearId", selectedYearId);
            if (searchQuery.trim()) q.set("search", searchQuery.trim());
            if (filterStatus) q.set("status", filterStatus);
            if (filterDate) q.set("date", filterDate);
            q.set("page", page.toString());
            q.set("limit", limit.toString());

            const res = await fetchApi(`/attendance/admin/teachers?${q.toString()}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to load faculty attendance records");
            }

            const data = await res.json();
            setOversightData(data);
        } catch (err: any) {
            setErrorOversight(err.message || "Failed to load faculty attendance data");
        } finally {
            setLoadingOversight(false);
        }
    };

    useEffect(() => {
        if (activeTab === "OVERSIGHT") {
            loadOversight();
        }
    }, [selectedYearId, filterStatus, filterDate, page, activeTab]);

    // Load Individual Teacher Detail
    const openTeacherDetail = async (teacherId: string) => {
        setSelectedTeacherId(teacherId);
        setLoadingDetail(true);
        try {
            const query = selectedYearId ? `?academicYearId=${selectedYearId}` : "";
            const res = await fetchApi(`/attendance/admin/teachers/${teacherId}${query}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to load teacher detail");
            }
            const data = await res.json();
            setTeacherDetail(data);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoadingDetail(false);
        }
    };

    // Daily Roster Management
    const loadDailyRoster = async () => {
        if (!recDate) return;
        try {
            setLoadingDailyRoster(true);
            setDailySuccessMsg(null);

            const res = await fetchApi(`/attendance/teacher/daily?date=${recDate}`);
            if (res.ok) {
                const data = await res.json();
                setDailyRoster(Array.isArray(data) ? data : []);

                const map: Record<string, { status: AttendanceStatus; remarks: string }> = {};
                for (const item of data) {
                    map[item.teacher.id] = {
                        status: item.attendance?.status || "PRESENT",
                        remarks: item.attendance?.remarks || ""
                    };
                }
                setRosterAttendance(map);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDailyRoster(false);
        }
    };

    useEffect(() => {
        if (activeTab === "DAILY_RECORD") {
            loadDailyRoster();
        }
    }, [recDate, activeTab]);

    const handleSaveDailyRoster = async () => {
        if (!selectedYearId || !recDate) return;
        try {
            setSavingDailyRoster(true);
            setDailySuccessMsg(null);

            const records = Object.entries(rosterAttendance).map(([teacherId, val]) => ({
                teacherId,
                status: val.status,
                remarks: val.remarks
            }));

            const res = await fetchApi("/attendance/teacher/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId: selectedYearId,
                    date: recDate,
                    records
                })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to record faculty attendance");
            }

            setDailySuccessMsg(`Saved attendance for ${records.length} faculty members successfully.`);
            loadDailyRoster();
        } catch (err: any) {
            alert(err.message || "Failed to save attendance");
        } finally {
            setSavingDailyRoster(false);
        }
    };

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <span>Faculty Attendance</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Teacher presence records, check-in log, and daily roster
                    </p>
                </div>

                <div className="flex items-center space-x-3">
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

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 space-x-8">
                <button
                    onClick={() => setActiveTab("OVERSIGHT")}
                    className={`py-3 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                        activeTab === "OVERSIGHT"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <Search className="w-4 h-4" />
                    <span>School-Wide Faculty Logs & History</span>
                </button>
                <button
                    onClick={() => setActiveTab("DAILY_RECORD")}
                    className={`py-3 text-sm font-bold border-b-2 flex items-center space-x-2 transition-colors ${
                        activeTab === "DAILY_RECORD"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <UserCheck className="w-4 h-4" />
                    <span>Daily Check-In Roll-Call</span>
                </button>
            </div>

            {/* TAB 1: SCHOOL-WIDE FACULTY OVERSIGHT */}
            {activeTab === "OVERSIGHT" && (
                <div className="space-y-6">
                    {/* Filter Bar */}
                    <Card className="border-gray-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Search Faculty</label>
                                    <div className="relative">
                                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Name, Staff ID, or Email"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); loadOversight(); } }}
                                            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                        />
                                    </div>
                                </div>

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

                                <div className="flex items-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => { setPage(1); loadOversight(); }}
                                        className="w-full text-xs font-semibold"
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary Ribbon */}
                    {oversightData?.summary && (
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-gray-500 uppercase">Total Logged</span>
                                <p className="text-xl font-bold text-gray-900 mt-0.5">{oversightData.summary.totalMarked}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-gray-500 uppercase">Presence Rate</span>
                                <p className="text-xl font-bold text-gray-900 mt-0.5">
                                    {oversightData.summary.totalMarked > 0 ? `${oversightData.summary.attendanceRate}%` : "—"}
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-emerald-700 uppercase">Present</span>
                                <p className="text-xl font-bold text-emerald-700 mt-0.5">{oversightData.summary.presentCount}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-amber-700 uppercase">Late</span>
                                <p className="text-xl font-bold text-amber-700 mt-0.5">{oversightData.summary.lateCount}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <span className="text-[11px] font-semibold text-red-700 uppercase">Absent</span>
                                <p className="text-xl font-bold text-red-700 mt-0.5">{oversightData.summary.absentCount}</p>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <Card className="border-gray-200 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            {loadingOversight ? (
                                <div className="p-12">
                                    <LoadingState message="Loading faculty attendance records..." />
                                </div>
                            ) : errorOversight ? (
                                <div className="p-8">
                                    <ErrorState message={errorOversight} onRetry={loadOversight} />
                                </div>
                            ) : !oversightData || oversightData.data.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p className="font-bold text-gray-700">No faculty attendance records found</p>
                                    <p className="text-xs text-gray-500 mt-1">Try changing search or date filters.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Teacher Name</th>
                                                <th className="px-4 py-3 font-semibold">Staff Code</th>
                                                <th className="px-4 py-3 font-semibold">Email</th>
                                                <th className="px-4 py-3 font-semibold">Date</th>
                                                <th className="px-4 py-3 font-semibold">Status</th>
                                                <th className="px-4 py-3 font-semibold">Remarks</th>
                                                <th className="px-6 py-3 font-semibold text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {oversightData.data.map((row) => (
                                                <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-6 py-3.5 font-bold text-gray-900">
                                                        {row.teacherName}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs font-mono text-gray-600">
                                                        {row.employeeId || "STAFF-ID"}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-gray-500">
                                                        {row.email || "—"}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs font-medium text-gray-800">
                                                        {row.date}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        {row.status === "PRESENT" ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                                                PRESENT
                                                            </span>
                                                        ) : row.status === "LATE" ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                                LATE
                                                            </span>
                                                        ) : row.status === "ABSENT" ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                                                ABSENT
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                                                EXCUSED
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-gray-500">
                                                        {row.remarks || "—"}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openTeacherDetail(row.teacherId)}
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

                            {/* Pagination */}
                            {oversightData && oversightData.pagination.totalPages > 1 && (
                                <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, oversightData.pagination.total)} of {oversightData.pagination.total} entries
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
                                            Page {page} of {oversightData.pagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={page >= oversightData.pagination.totalPages}
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

            {/* TAB 2: DAILY CHECK-IN ROLL-CALL */}
            {activeTab === "DAILY_RECORD" && (
                <div className="space-y-6">
                    <Card className="border-gray-200 shadow-sm">
                        <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold text-gray-900">
                                Daily Faculty Check-In ({recDate})
                            </CardTitle>
                            <div className="flex items-center space-x-3">
                                <input
                                    type="date"
                                    value={recDate}
                                    onChange={(e) => setRecDate(e.target.value)}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                                />
                                <Button
                                    onClick={handleSaveDailyRoster}
                                    disabled={savingDailyRoster}
                                    className="bg-[#006b3f] hover:bg-[#005a34] text-white text-xs flex items-center space-x-1"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{savingDailyRoster ? "Saving..." : "Save Faculty Attendance"}</span>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {dailySuccessMsg && (
                                <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-semibold flex items-center">
                                    <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
                                    {dailySuccessMsg}
                                </div>
                            )}

                            {loadingDailyRoster ? (
                                <div className="p-12">
                                    <LoadingState message="Loading daily faculty list..." />
                                </div>
                            ) : dailyRoster.length === 0 ? (
                                <div className="p-12 text-center text-gray-400">
                                    <p className="font-bold text-gray-700">No active teachers found in the school roster.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3.5 font-semibold">Faculty Member</th>
                                                <th className="px-4 py-3.5 font-semibold">Staff Code</th>
                                                <th className="px-6 py-3.5 font-semibold">Daily Check-In Status</th>
                                                <th className="px-6 py-3.5 font-semibold">Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {dailyRoster.map((item) => {
                                                const tId = item.teacher.id;
                                                const currentVal = rosterAttendance[tId] || { status: "PRESENT", remarks: "" };
                                                return (
                                                    <tr key={tId} className="hover:bg-gray-50/50">
                                                        <td className="px-6 py-3 font-bold text-gray-900">
                                                            {item.teacher.firstName} {item.teacher.lastName}
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-mono text-gray-600">
                                                            {item.teacher.staffIdCode || item.teacher.employeeId || "TCH-STAFF"}
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
                                                                                [tId]: {
                                                                                    ...prev[tId],
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
                                                                placeholder="Optional check-in notes..."
                                                                value={currentVal.remarks}
                                                                onChange={(e) => {
                                                                    const text = e.target.value;
                                                                    setRosterAttendance(prev => ({
                                                                        ...prev,
                                                                        [tId]: { ...prev[tId], remarks: text }
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
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Individual Teacher Detail Modal */}
            {selectedTeacherId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-150">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
                                    <Briefcase className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {teacherDetail?.teacher.name || "Faculty Member Timeline"}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {teacherDetail?.teacher.employeeId} • {teacherDetail?.teacher.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelectedTeacherId(null); setTeacherDetail(null); }}
                                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {loadingDetail ? (
                                <LoadingState message="Loading faculty attendance details..." />
                            ) : teacherDetail ? (
                                <>
                                    {/* Stats KPI Ribbon */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <span className="text-[10px] font-bold text-blue-800 uppercase">Presence Rate</span>
                                            <p className="text-2xl font-extrabold text-blue-900">{teacherDetail.stats.attendanceRate}%</p>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Days Logged</span>
                                            <p className="text-2xl font-extrabold text-gray-900">{teacherDetail.stats.totalDays}</p>
                                        </div>
                                        <div className={`p-3 rounded-lg border ${
                                            teacherDetail.stats.absentCount >= 3
                                                ? "bg-red-50 border-red-200"
                                                : "bg-gray-50 border-gray-200"
                                        }`}>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Absences</span>
                                            <p className={`text-2xl font-extrabold ${
                                                teacherDetail.stats.absentCount >= 3 ? "text-red-700" : "text-gray-900"
                                            }`}>
                                                {teacherDetail.stats.absentCount} Days
                                            </p>
                                        </div>
                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                            <span className="text-[10px] font-bold text-amber-800 uppercase">Late Check-Ins</span>
                                            <p className="text-2xl font-extrabold text-amber-900">{teacherDetail.stats.lateCount}</p>
                                        </div>
                                    </div>

                                    {teacherDetail.stats.isAtRisk && (
                                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-800 text-xs font-semibold">
                                            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                                            <span>Exceeded absence threshold (≥3 absent days). Review class coverages.</span>
                                        </div>
                                    )}

                                    {/* Teaching Assignments */}
                                    {teacherDetail.teacher.assignments.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Teaching Schedule Context</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {teacherDetail.teacher.assignments.map(a => (
                                                    <span key={a.id} className="text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded-md font-medium">
                                                        {a.subjectName} ({a.gradeName} - {a.sectionName})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Chronological Table */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                                            <Clock className="w-4 h-4 mr-1.5 text-gray-500" />
                                            Chronological Daily Records
                                        </h4>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-gray-50 text-gray-500 uppercase border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-2.5 font-semibold">Date</th>
                                                        <th className="px-4 py-2.5 font-semibold">Status</th>
                                                        <th className="px-4 py-2.5 font-semibold">Recorded By</th>
                                                        <th className="px-4 py-2.5 font-semibold">Remarks</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {teacherDetail.records.map((r) => (
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
                                                            <td className="px-4 py-2 text-gray-500">{r.recordedBy?.name || "Self / Duty Officer"}</td>
                                                            <td className="px-4 py-2 text-gray-500">{r.remarks || "—"}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <Button
                                variant="outline"
                                onClick={() => { setSelectedTeacherId(null); setTeacherDetail(null); }}
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
