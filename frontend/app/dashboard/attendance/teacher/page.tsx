"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    ClipboardCheck, 
    Calendar, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    HelpCircle,
    UserCheck,
    Save,
    User
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface TeacherRecordState {
    teacherId: string;
    teacherName: string;
    staffIdCode: string;
    status: AttendanceStatus;
    remarks: string;
}

export default function TeacherAttendancePage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);

    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );

    const [teacherRecords, setTeacherRecords] = useState<TeacherRecordState[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

    // Initial Load (Years & Daily Roster)
    const loadYears = async () => {
        try {
            setLoading(true);
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            const active = yearsData.find(y => y.status === "ACTIVE");
            setActiveYear(active || null);
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadYears();
    }, []);

    const loadDailyTeacherAttendance = async () => {
        if (!selectedDate) return;
        try {
            setLoading(true);
            setSaveSuccessMessage(null);
            
            const res = await fetchApi(`/attendance/teacher/daily?date=${selectedDate}`);
            if (!res.ok) throw new Error("Failed to load daily teacher attendance");

            const data = await res.json();

            const records: TeacherRecordState[] = data.map((item: any) => {
                const existing = item.attendance;
                return {
                    teacherId: item.teacher.id,
                    teacherName: `${item.teacher.firstName || ""} ${item.teacher.lastName || ""}`.trim(),
                    staffIdCode: item.teacher.staffIdCode || "N/A",
                    status: existing ? existing.status : "PRESENT",
                    remarks: existing ? existing.remarks || "" : ""
                };
            });

            setTeacherRecords(records);
        } catch (err: any) {
            console.error("Error loading teacher attendance:", err);
            setTeacherRecords([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDailyTeacherAttendance();
    }, [selectedDate]);

    // Handlers
    const handleStatusChange = (teacherId: string, status: AttendanceStatus) => {
        setTeacherRecords(prev => 
            prev.map(r => r.teacherId === teacherId ? { ...r, status } : r)
        );
    };

    const handleRemarksChange = (teacherId: string, remarks: string) => {
        setTeacherRecords(prev => 
            prev.map(r => r.teacherId === teacherId ? { ...r, remarks } : r)
        );
    };

    const handleMarkAllPresent = () => {
        setTeacherRecords(prev => prev.map(r => ({ ...r, status: "PRESENT" })));
    };

    const handleSaveAttendance = async () => {
        if (!activeYear || !selectedDate) return;

        try {
            setSaving(true);
            setSaveSuccessMessage(null);

            const payload = {
                academicYearId: activeYear.id,
                date: selectedDate,
                records: teacherRecords.map(r => ({
                    teacherId: r.teacherId,
                    status: r.status,
                    remarks: r.remarks
                }))
            };

            const res = await fetchApi("/attendance/teacher/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save teacher attendance records");

            setSaveSuccessMessage(`Successfully saved attendance records for ${teacherRecords.length} faculty members!`);
            setTimeout(() => setSaveSuccessMessage(null), 4000);
        } catch (err: any) {
            alert(err.message || "Failed to save teacher attendance");
        } finally {
            setSaving(false);
        }
    };

    // Stats
    const stats = useMemo(() => {
        const total = teacherRecords.length;
        const present = teacherRecords.filter(r => r.status === "PRESENT").length;
        const absent = teacherRecords.filter(r => r.status === "ABSENT").length;
        const late = teacherRecords.filter(r => r.status === "LATE").length;
        const excused = teacherRecords.filter(r => r.status === "EXCUSED").length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 100;

        return { total, present, absent, late, excused, rate };
    }, [teacherRecords]);

    if (loading && teacherRecords.length === 0) {
        return <LoadingState message="Loading teacher attendance..." />;
    }

    if (error) {
        return <ErrorState message={error} onRetry={loadYears} />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <ClipboardCheck className="w-7 h-7 mr-2 text-[#006b3f]" />
                        Teacher & Faculty Daily Attendance
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Track daily presence and arrival status for active teaching staff
                    </p>
                </div>

                {saveSuccessMessage && (
                    <div className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm font-medium flex items-center animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                        {saveSuccessMessage}
                    </div>
                )}
            </div>

            {/* Date Control */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-[#006b3f]/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#006b3f]" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-semibold text-gray-500">Attendance Date</p>
                            <p className="text-sm font-semibold text-gray-900">Selecting Date for Daily Staff Sheet</p>
                        </div>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] focus:border-transparent outline-none transition"
                        />
                        <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    </div>
                </CardContent>
            </Card>

            {/* Stats Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-white border-gray-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Total Faculty</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-gray-600" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50/50 border-emerald-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-emerald-700 font-semibold uppercase">Present ({stats.rate}%)</p>
                            <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.present}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-rose-50/50 border-rose-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-rose-700 font-semibold uppercase">Absent</p>
                            <p className="text-2xl font-bold text-rose-900 mt-1">{stats.absent}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-rose-700" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-amber-50/50 border-amber-100">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-amber-700 font-semibold uppercase">Late / Excused</p>
                            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.late + stats.excused}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Roster Table */}
            {teacherRecords.length === 0 ? (
                <EmptyState 
                    title="No Active Teachers" 
                    message="There are no active faculty members registered to record attendance." 
                />
            ) : (
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gray-50/70 border-b border-gray-200 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-semibold text-gray-900">
                                Faculty Daily Attendance Roster
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Mark presence, absence, or tardiness for active teachers
                            </p>
                        </div>

                        <div className="flex items-center space-x-3 w-full sm:w-auto">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={handleMarkAllPresent}
                                className="w-1/2 sm:w-auto text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" />
                                Mark All Present
                            </Button>

                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={handleSaveAttendance}
                                isLoading={saving}
                                leftIcon={<Save className="w-4 h-4" />}
                                className="w-1/2 sm:w-auto bg-[#006b3f] hover:bg-[#005432]"
                            >
                                Save Attendance
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Teacher Name</th>
                                        <th className="px-6 py-3.5 font-semibold">Staff ID</th>
                                        <th className="px-6 py-3.5 font-semibold text-center">Status</th>
                                        <th className="px-6 py-3.5 font-semibold">Remarks / Note</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {teacherRecords.map((record) => (
                                        <tr key={record.teacherId} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4 flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-[#006b3f]/10 flex items-center justify-center mr-3">
                                                    <User className="w-4 h-4 text-[#006b3f]" />
                                                </div>
                                                <p className="font-semibold text-gray-900">{record.teacherName}</p>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-600">
                                                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                                    {record.staffIdCode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(record.teacherId, "PRESENT")}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center ${
                                                            record.status === "PRESENT"
                                                                ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30"
                                                                : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                                                        }`}
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                                        Present
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(record.teacherId, "ABSENT")}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center ${
                                                            record.status === "ABSENT"
                                                                ? "bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30"
                                                                : "bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700"
                                                        }`}
                                                    >
                                                        <XCircle className="w-3.5 h-3.5 mr-1" />
                                                        Absent
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(record.teacherId, "LATE")}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center ${
                                                            record.status === "LATE"
                                                                ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30"
                                                                : "bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700"
                                                        }`}
                                                    >
                                                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                                                        Late
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(record.teacherId, "EXCUSED")}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center ${
                                                            record.status === "EXCUSED"
                                                                ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30"
                                                                : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                                                        }`}
                                                    >
                                                        <HelpCircle className="w-3.5 h-3.5 mr-1" />
                                                        Excused
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    value={record.remarks}
                                                    onChange={(e) => handleRemarksChange(record.teacherId, e.target.value)}
                                                    placeholder="Optional note..."
                                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-md text-xs bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#006b3f] focus:border-[#006b3f] outline-none transition"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
                            <p className="text-xs text-gray-500 font-medium">
                                Showing {teacherRecords.length} active faculty members
                            </p>
                            <Button 
                                type="button" 
                                onClick={handleSaveAttendance}
                                isLoading={saving}
                                leftIcon={<Save className="w-4 h-4" />}
                                className="bg-[#006b3f] hover:bg-[#005432]"
                            >
                                Save Teacher Attendance
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
