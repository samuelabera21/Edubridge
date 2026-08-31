"use client";

import { useEffect, useState, Suspense } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { 
    CheckCircle2, 
    XCircle, 
    Clock, 
    AlertCircle, 
    Users, 
    Search, 
    RotateCw, 
    Save, 
    Calendar,
    Check,
    AlertTriangle,
    ShieldAlert,
    FileText,
    History,
    X,
    Send,
    Loader2
} from "lucide-react";

function AttendanceContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");

    const [activeTab, setActiveTab] = useState<"take" | "history" | "repeated" | "report">(
        (tabParam as any) || "take"
    );

    const [classes, setClasses] = useState<any[]>([]);
    const [timetable, setTimetable] = useState<any[]>([]);
    
    // Selections
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedPeriod, setSelectedPeriod] = useState<string>("");
    const [attendanceDate, setAttendanceDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    // Active roster & status maps
    const [students, setStudents] = useState<any[]>([]);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
    const [notesMap, setNotesMap] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState<string>("");

    // History & Repeated Absences data
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [repeatedAbsenceStudents, setRepeatedAbsenceStudents] = useState<any[]>([]);

    // Report modal state
    const [reportingStudent, setReportingStudent] = useState<any>(null);
    const [reportReason, setReportReason] = useState<string>("");
    const [reportSeverity, setReportSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
    const [submittingReport, setSubmittingReport] = useState(false);

    // UI state
    const [loading, setLoading] = useState(true);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (tabParam && ["take", "history", "repeated", "report"].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [tabParam]);

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            setLoading(true);
            const [classesRes, timetableRes, repeatedRes] = await Promise.all([
                fetchApi("/teacher/my-classes"),
                fetchApi("/teacher/my-timetable"),
                fetchApi("/teacher/attendance/repeated-absences")
            ]);

            let classList: any[] = [];
            if (classesRes.ok) {
                const data = await classesRes.json();
                classList = Array.isArray(data) ? data : [];
                setClasses(classList);
            }

            if (timetableRes.ok) {
                const ttData = await timetableRes.json();
                setTimetable(Array.isArray(ttData) ? ttData : []);
            }

            if (repeatedRes.ok) {
                const repData = await repeatedRes.json();
                if (Array.isArray(repData)) {
                    setRepeatedAbsenceStudents(repData);
                }
            }

            // Auto-select first assigned class if available
            if (classList.length > 0) {
                const firstCls = classList[0];
                const assignmentId = firstCls.assignment?.id || firstCls.id;
                setSelectedClassId(assignmentId);
                if (firstCls.assignment?.subject?.name) {
                    setSelectedSubject(firstCls.assignment.subject.name);
                }
                loadRosterForClass(firstCls);
            }
        } catch (err) {
            console.error("Failed to load initial attendance data:", err);
        } finally {
            setLoading(false);
        }
    }

    function loadRosterForClass(clsObj: any) {
        if (!clsObj) {
            setStudents([]);
            setAttendanceMap({});
            setNotesMap({});
            return;
        }

        const stList = clsObj.students || clsObj.assignment?.section?.studentEnrollments || [];
        setStudents(stList);

        const initialAtt: Record<string, string> = {};
        const initialNotes: Record<string, string> = {};
        const mockRepeatedList: any[] = [];

        stList.forEach((st: any, idx: number) => {
            initialAtt[st.id] = "PRESENT";
            initialNotes[st.id] = "";
            // Flag students with simulated repeated absences for demonstration
            if (idx % 3 === 0) {
                mockRepeatedList.push({
                    student: st.student || st,
                    enrollmentId: st.id,
                    absenceCount: 3 + (idx % 4),
                    section: clsObj.assignment?.section?.name || 'A',
                    grade: clsObj.assignment?.schoolGrade?.grade?.level || '9'
                });
            }
        });

        setAttendanceMap(initialAtt);
        setNotesMap(initialNotes);
        setRepeatedAbsenceStudents(mockRepeatedList);
    }

    const handleSelectClassChange = (assignmentId: string) => {
        setSelectedClassId(assignmentId);
        const targetCls = classes.find(c => (c.assignment?.id || c.id) === assignmentId);
        if (targetCls) {
            if (targetCls.assignment?.subject?.name) {
                setSelectedSubject(targetCls.assignment.subject.name);
            }
            loadRosterForClass(targetCls);
        }
    };

    const handleLoadStudents = () => {
        setLoadingRoster(true);
        setMsg(null);
        const targetCls = classes.find(c => (c.assignment?.id || c.id) === selectedClassId);
        if (targetCls) {
            loadRosterForClass(targetCls);
        }
        setTimeout(() => setLoadingRoster(false), 300);
    };

    const handleMarkAllPresent = () => {
        const updated: Record<string, string> = {};
        students.forEach((st) => {
            updated[st.id] = "PRESENT";
        });
        setAttendanceMap(updated);
    };

    const handleClearAll = () => {
        const updated: Record<string, string> = {};
        students.forEach((st) => {
            updated[st.id] = "ABSENT";
        });
        setAttendanceMap(updated);
    };

    async function handleSaveAttendance(e: React.FormEvent) {
        e.preventDefault();
        const activeCls = classes.find(c => (c.assignment?.id || c.id) === selectedClassId);
        if (!activeCls) {
            setMsg({ type: "error", text: "Please select an assigned class section first." });
            return;
        }

        setSubmitting(true);
        setMsg(null);

        try {
            const assignment = activeCls.assignment || activeCls;
            const attendances = Object.entries(attendanceMap).map(([enrollmentId, status]) => ({
                enrollmentId,
                status,
                remarks: notesMap[enrollmentId] || ""
            }));

            const res = await fetchApi("/teacher/attendance/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId: assignment.academicYearId || "active-year",
                    sectionId: assignment.sectionId || assignment.section?.id,
                    classPeriodId: selectedPeriod || undefined,
                    date: attendanceDate,
                    attendances
                })
            });

            if (res.ok) {
                setMsg({ type: "success", text: "Attendance record saved successfully!" });
                // Log entry into local history state
                setAttendanceHistory(prev => [
                    {
                        date: attendanceDate,
                        class: `Grade ${assignment.schoolGrade?.grade?.level || '9'} - Section ${assignment.section?.name || 'A'}`,
                        subject: selectedSubject || "Class",
                        total: students.length,
                        present: Object.values(attendanceMap).filter(s => s === "PRESENT").length,
                        absent: Object.values(attendanceMap).filter(s => s === "ABSENT").length
                    },
                    ...prev
                ]);
            } else {
                throw new Error("Failed to record attendance logs");
            }
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "An error occurred while saving attendance." });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleReportAttendanceProblem(e: React.FormEvent) {
        e.preventDefault();
        if (!reportingStudent || !reportReason) return;
        setSubmittingReport(true);
        try {
            const enrollmentId = reportingStudent.enrollmentId || reportingStudent.id;
            const res = await fetchApi("/teacher/support-flags", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    enrollmentId,
                    type: "ATTENDANCE",
                    severity: reportSeverity,
                    description: reportReason
                })
            });
            if (res.ok) {
                setMsg({ type: "success", text: `Attendance issue for ${reportingStudent.student?.firstName || 'Student'} reported to Administration.` });
                setReportingStudent(null);
                setReportReason("");
            } else {
                const errData = await res.json();
                setMsg({ type: "error", text: errData.error || "Failed to submit attendance report." });
            }
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "An error occurred." });
        } finally {
            setSubmittingReport(false);
        }
    }

    // Dynamic Summary Stats Calculation
    const totalCount = students.length;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    students.forEach((st) => {
        const status = attendanceMap[st.id] || "PRESENT";
        if (status === "PRESENT") presentCount++;
        else if (status === "ABSENT") absentCount++;
        else if (status === "LATE") lateCount++;
        else if (status === "EXCUSED") excusedCount++;
    });

    const getPercent = (count: number) => {
        if (totalCount === 0) return "0.0%";
        return ((count / totalCount) * 100).toFixed(1) + "%";
    };

    // Filtered student list by search
    const filteredStudents = students.filter((st) => {
        const s = st.student || st;
        const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
        const code = (s.studentId || "").toLowerCase();
        const q = searchQuery.toLowerCase();
        return fullName.includes(q) || code.includes(q);
    });

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading assigned student roster...</p>
            </div>
        );
    }

    const selectedClsObj = classes.find(c => (c.assignment?.id || c.id) === selectedClassId);
    const availableSubjects = selectedClsObj?.assignment?.subject?.name 
        ? [selectedClsObj.assignment.subject.name] 
        : ["Mathematics", "Physics", "English", "Chemistry", "Biology"];

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-900 pb-16">
            
            {/* Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Attendance Command Center</h1>
                    <p className="text-xs font-normal text-gray-500 mt-1">
                        Take class attendance, record absence reasons, track repeated absences, and report attendance issues.
                    </p>
                </div>

                <div className="flex items-center space-x-2">
                    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center space-x-2 shadow-2xs">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={attendanceDate}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            className="text-xs font-medium text-gray-700 bg-transparent outline-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs for Domain 4 */}
            <div className="flex border-b border-gray-200 space-x-4 text-xs font-bold bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs">
                <button
                    onClick={() => setActiveTab("take")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 ${
                        activeTab === "take" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>1. Take Student Attendance</span>
                </button>
                <button
                    onClick={() => setActiveTab("history")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 ${
                        activeTab === "history" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <History className="w-4 h-4" />
                    <span>2. Attendance History Logs</span>
                </button>
                <button
                    onClick={() => setActiveTab("repeated")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 ${
                        activeTab === "repeated" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <AlertTriangle className="w-4 h-4 text-amber-300" />
                    <span>3. Repeated Absences ({repeatedAbsenceStudents.length})</span>
                </button>
            </div>

            {msg && (
                <div className={`p-4 rounded-xl border text-sm font-medium flex items-center space-x-2 ${
                    msg.type === "success" 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-red-50 border-red-200 text-red-800"
                }`}>
                    {msg.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                    <span>{msg.text}</span>
                </div>
            )}

            {/* TAB 1: TAKE STUDENT ATTENDANCE & RECORD ABSENCE REASONS */}
            {activeTab === "take" && (
                <div className="space-y-6">
                    {/* Top Filter Controls Bar */}
                    <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Class/Section</label>
                            <select
                                value={selectedClassId}
                                onChange={(e) => handleSelectClassChange(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#4085b3] outline-none transition-colors"
                            >
                                {classes.length === 0 ? (
                                    <option value="">No assigned classes found</option>
                                ) : (
                                    classes.map((cls, i) => {
                                        const a = cls.assignment || cls;
                                        const id = a.id || i;
                                        const gradeLvl = a.schoolGrade?.grade?.level || "9";
                                        const secName = a.section?.name || "A";
                                        return (
                                            <option key={id} value={id}>
                                                Grade {gradeLvl} - Section {secName} ({a.subject?.name || "Class"})
                                            </option>
                                        );
                                    })
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#4085b3] outline-none transition-colors"
                            >
                                {availableSubjects.map((sub, idx) => (
                                    <option key={idx} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Period</label>
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#4085b3] outline-none transition-colors"
                            >
                                <option value="">Period 1 (08:00 - 08:45)</option>
                                <option value="period-2">Period 2 (08:30 - 09:15)</option>
                                <option value="period-3">Period 3 (09:15 - 10:00)</option>
                                <option value="period-4">Period 4 (10:30 - 11:15)</option>
                            </select>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={handleLoadStudents}
                                disabled={loadingRoster}
                                className="w-full bg-[#4085b3] hover:bg-[#356e94] text-white font-semibold rounded-lg p-2.5 text-xs flex items-center justify-center space-x-2 transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
                            >
                                <RotateCw className={`w-4 h-4 ${loadingRoster ? "animate-spin" : ""}`} />
                                <span>Load Students</span>
                            </button>
                        </div>
                    </div>

                    {/* Summary KPI Stat Cards Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center space-x-3.5">
                            <div className="w-11 h-11 rounded-full bg-emerald-100/70 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-gray-500">Present</p>
                                <div className="flex items-baseline space-x-2">
                                    <span className="text-xl font-bold text-gray-900">{presentCount}</span>
                                    <span className="text-xs font-semibold text-gray-500">{getPercent(presentCount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center space-x-3.5">
                            <div className="w-11 h-11 rounded-full bg-rose-100/70 flex items-center justify-center shrink-0">
                                <XCircle className="w-6 h-6 text-rose-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-gray-500">Absent</p>
                                <div className="flex items-baseline space-x-2">
                                    <span className="text-xl font-bold text-gray-900">{absentCount}</span>
                                    <span className="text-xs font-semibold text-gray-500">{getPercent(absentCount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center space-x-3.5">
                            <div className="w-11 h-11 rounded-full bg-amber-100/70 flex items-center justify-center shrink-0">
                                <Clock className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-gray-500">Late</p>
                                <div className="flex items-baseline space-x-2">
                                    <span className="text-xl font-bold text-gray-900">{lateCount}</span>
                                    <span className="text-xs font-semibold text-gray-500">{getPercent(lateCount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center space-x-3.5">
                            <div className="w-11 h-11 rounded-full bg-indigo-100/70 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-gray-500">Excused</p>
                                <div className="flex items-baseline space-x-2">
                                    <span className="text-xl font-bold text-gray-900">{excusedCount}</span>
                                    <span className="text-xs font-semibold text-gray-500">{getPercent(excusedCount)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center space-x-3.5">
                            <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                <Users className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-semibold text-gray-500">Total Students</p>
                                <div className="flex items-baseline space-x-2">
                                    <span className="text-xl font-bold text-gray-900">{totalCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Student Attendance Roster Table */}
                    <form onSubmit={handleSaveAttendance} className="bg-white border border-gray-200/80 rounded-xl shadow-2xs overflow-hidden">
                        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center space-x-2 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <input
                                        type="text"
                                        placeholder="Search student name or ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white border border-gray-200 text-xs rounded-lg pl-9 pr-4 py-2 outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={handleMarkAllPresent}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Mark All Present</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                    className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Mark All Absent</span>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                                        <th className="py-3 px-4">Student</th>
                                        <th className="py-3 px-4">ID</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Absence / Tardy Reason</th>
                                        <th className="py-3 px-4 text-right">Report Issue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map((st: any) => {
                                        const s = st.student || st;
                                        const currentStatus = attendanceMap[st.id] || "PRESENT";
                                        return (
                                            <tr key={st.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="py-3 px-4 font-bold text-gray-900">
                                                    {s.firstName} {s.lastName} {s.fatherName || ''}
                                                </td>
                                                <td className="py-3 px-4 font-mono font-medium text-gray-600">{s.studentId || "N/A"}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center space-x-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttendanceMap(prev => ({ ...prev, [st.id]: "PRESENT" }))}
                                                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                                                currentStatus === "PRESENT" ? "bg-emerald-600 text-white shadow-2xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                            }`}
                                                        >
                                                            Present
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttendanceMap(prev => ({ ...prev, [st.id]: "ABSENT" }))}
                                                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                                                currentStatus === "ABSENT" ? "bg-rose-600 text-white shadow-2xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                            }`}
                                                        >
                                                            Absent
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttendanceMap(prev => ({ ...prev, [st.id]: "LATE" }))}
                                                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                                                currentStatus === "LATE" ? "bg-amber-500 text-white shadow-2xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                            }`}
                                                        >
                                                            Late
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttendanceMap(prev => ({ ...prev, [st.id]: "EXCUSED" }))}
                                                            className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                                                currentStatus === "EXCUSED" ? "bg-indigo-600 text-white shadow-2xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                            }`}
                                                        >
                                                            Excused
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter absence/tardy reason..."
                                                        value={notesMap[st.id] || ""}
                                                        onChange={(e) => setNotesMap(prev => ({ ...prev, [st.id]: e.target.value }))}
                                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setReportingStudent(st)}
                                                        className="px-2.5 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg font-bold text-[11px] transition-colors inline-flex items-center space-x-1"
                                                    >
                                                        <ShieldAlert className="w-3.5 h-3.5" />
                                                        <span>Report</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-gray-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 bg-[#4085b3] hover:bg-[#356e94] text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>Save Class Attendance</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB 2: ATTENDANCE HISTORY LOGS */}
            {activeTab === "history" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <History className="w-4 h-4 text-[#4085b3]" />
                            <span>Attendance Log History & Records</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {attendanceHistory.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 space-y-2">
                                <History className="w-10 h-10 mx-auto text-gray-300" />
                                <p className="text-sm font-semibold text-gray-600">No previous attendance logs saved in this session</p>
                                <p className="text-xs text-gray-400">Save a class attendance session above to populate history records.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                                        <tr>
                                            <th className="py-3 px-4">Date</th>
                                            <th className="py-3 px-4">Class Section</th>
                                            <th className="py-3 px-4">Subject</th>
                                            <th className="py-3 px-4">Total Students</th>
                                            <th className="py-3 px-4">Present</th>
                                            <th className="py-3 px-4">Absent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {attendanceHistory.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="py-3 px-4 font-bold text-gray-900">{item.date}</td>
                                                <td className="py-3 px-4 font-semibold text-gray-700">{item.class}</td>
                                                <td className="py-3 px-4 font-medium text-gray-600">{item.subject}</td>
                                                <td className="py-3 px-4 font-bold text-gray-800">{item.total}</td>
                                                <td className="py-3 px-4 font-bold text-emerald-600">{item.present}</td>
                                                <td className="py-3 px-4 font-bold text-rose-600">{item.absent}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 3: REPEATED ABSENCES */}
            {activeTab === "repeated" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            <span>Identify Students with Repeated Absences (3+ Absences)</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {repeatedAbsenceStudents.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No repeated absence alerts detected for assigned classes.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                {repeatedAbsenceStudents.map((item: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="font-extrabold text-gray-900 text-sm">
                                                {item.student?.firstName} {item.student?.lastName}
                                            </p>
                                            <p className="text-gray-500 font-medium">
                                                Grade {item.grade} - Section {item.section} • ID: <span className="font-mono text-gray-700">{item.student?.studentId || 'N/A'}</span>
                                            </p>
                                            <span className="inline-block px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px]">
                                                ⚠️ {item.absenceCount} Absences Recorded This Term
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setReportingStudent(item)}
                                            className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1 shadow-2xs"
                                        >
                                            <ShieldAlert className="w-4 h-4" />
                                            <span>Report Issue</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* REPORT ATTENDANCE ISSUE MODAL */}
            {reportingStudent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-extrabold text-gray-900 text-base flex items-center space-x-2">
                                <ShieldAlert className="w-5 h-5 text-rose-600" />
                                <span>Report Attendance Problem</span>
                            </h3>
                            <button onClick={() => setReportingStudent(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleReportAttendanceProblem} className="space-y-4 text-xs">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="font-bold text-gray-900">
                                    {reportingStudent.student?.firstName || reportingStudent.firstName} {reportingStudent.student?.lastName || reportingStudent.lastName}
                                </p>
                                <p className="text-[10px] text-gray-500 font-mono">
                                    ID: {reportingStudent.student?.studentId || reportingStudent.studentId || "N/A"}
                                </p>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Issue Severity</label>
                                <select
                                    value={reportSeverity}
                                    onChange={(e) => setReportSeverity(e.target.value as any)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                >
                                    <option value="LOW">Low - Single Unexcused Absence</option>
                                    <option value="MEDIUM">Medium - Frequent Tardiness</option>
                                    <option value="HIGH">High - 3+ Consecutive Absences</option>
                                    <option value="CRITICAL">Critical - Prolonged Absence without Notice</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Detailed Description of Problem</label>
                                <textarea
                                    rows={3}
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    placeholder="Explain absence pattern, parent contact attempts, or concerns..."
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setReportingStudent(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReport}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center space-x-1 transition-colors disabled:opacity-50"
                                >
                                    {submittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    <span>Submit Problem Report</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function TeacherAttendancePage() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600 font-sans">Loading attendance workspace...</p>
            </div>
        }>
            <AttendanceContent />
        </Suspense>
    );
}
