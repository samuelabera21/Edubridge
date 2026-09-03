"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
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
    Loader2,
    ArrowLeft,
    Filter,
    UserCheck,
    MessageSquare,
    BookOpenCheck,
    ChevronRight,
    GraduationCap,
    List,
    LayoutGrid,
    BookOpen,
    FileCheck,
    Paperclip
} from "lucide-react";

function AttendanceContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");

    // 5 Tab state: 'take' | 'history' | 'reasons' | 'repeated' | 'report'
    const [activeTab, setActiveTab] = useState<"take" | "history" | "reasons" | "repeated" | "report">(
        (tabParam as any) || "take"
    );

    const [classes, setClasses] = useState<any[]>([]);
    const [timetable, setTimetable] = useState<any[]>([]);
    
    // Selections for Tab 1 (Take Attendance)
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

    // Tab 2 Hierarchical History State (Step 1: grades | Step 2: sections | Step 3: students | Step 4: detail)
    const [historyViewMode, setHistoryViewMode] = useState<"hierarchy" | "table">("hierarchy");
    const [historyStep, setHistoryStep] = useState<"grades" | "sections" | "students" | "detail">("grades");
    const [historySelectedGrade, setHistorySelectedGrade] = useState<string>("");
    const [historySelectedSection, setHistorySelectedSection] = useState<any>(null);
    const [historySelectedStudent, setHistorySelectedStudent] = useState<any>(null);
    const [historyStudentSearch, setHistoryStudentSearch] = useState<string>("");
    const [attendanceHistoryLogs, setAttendanceHistoryLogs] = useState<any[]>([]);

    // Tab 3 Record Absence Reason state (SRS FR-ATT-004 & FR-ATT-005)
    const [selectedStudentForReason, setSelectedStudentForReason] = useState<any>(null);
    const [absenceReasonText, setAbsenceReasonText] = useState<string>("");
    const [reasonCategory, setReasonCategory] = useState<"MEDICAL" | "FAMILY" | "SCHOOL_ACTIVITY" | "PARENT_NOTE" | "UNEXCUSED">("MEDICAL");
    const [reasonStatus, setReasonStatus] = useState<"EXCUSED" | "ABSENT">("EXCUSED");
    const [reasonDocumentRef, setReasonDocumentRef] = useState<string>("");
    const [reasonDate, setReasonDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [savingReason, setSavingReason] = useState(false);

    // Tab 4 Repeated Absences data
    const [repeatedAbsenceStudents, setRepeatedAbsenceStudents] = useState<any[]>([]);

    // Tab 5 Report modal/form & flags list
    const [existingSupportFlags, setExistingSupportFlags] = useState<any[]>([]);
    const [reportingStudent, setReportingStudent] = useState<any>(null);
    const [reportReason, setReportReason] = useState<string>("");
    const [reportSeverity, setReportSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
    const [submittingReport, setSubmittingReport] = useState(false);

    // General UI state
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (tabParam && ["take", "history", "reasons", "repeated", "report"].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [tabParam]);

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            setLoading(true);
            const [classesRes, timetableRes, repeatedRes, historyRes, flagsRes] = await Promise.all([
                fetchApi("/teacher/my-classes"),
                fetchApi("/teacher/my-timetable"),
                fetchApi("/teacher/attendance/repeated-absences"),
                fetchApi("/teacher/attendance/history"),
                fetchApi("/teacher/support-flags")
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

            if (historyRes.ok) {
                const histData = await historyRes.json();
                if (Array.isArray(histData)) {
                    setAttendanceHistoryLogs(histData);
                }
            }

            if (flagsRes.ok) {
                const flagsData = await flagsRes.json();
                if (Array.isArray(flagsData)) {
                    setExistingSupportFlags(flagsData);
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

        stList.forEach((st: any) => {
            const id = st.id;
            initialAtt[id] = "PRESENT";
            initialNotes[id] = "";
        });

        setAttendanceMap(initialAtt);
        setNotesMap(initialNotes);
    }

    function handleClassChange(assignmentId: string) {
        setSelectedClassId(assignmentId);
        const clsObj = classes.find(c => (c.assignment?.id || c.id) === assignmentId);
        if (clsObj) {
            if (clsObj.assignment?.subject?.name) {
                setSelectedSubject(clsObj.assignment.subject.name);
            }
            loadRosterForClass(clsObj);
        }
    }

    function markAllStatus(status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED") {
        const updated: Record<string, string> = {};
        students.forEach((st: any) => {
            updated[st.id] = status;
        });
        setAttendanceMap(updated);
    }

    function handleStatusToggle(studentEnrollmentId: string, status: string) {
        setAttendanceMap(prev => ({
            ...prev,
            [studentEnrollmentId]: status
        }));
    }

    function handleNoteChange(studentEnrollmentId: string, note: string) {
        setNotesMap(prev => ({
            ...prev,
            [studentEnrollmentId]: note
        }));
    }

    async function handleSubmitAttendance() {
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
                
                // Refresh attendance history dynamically from DB
                const histRes = await fetchApi("/teacher/attendance/history");
                if (histRes.ok) {
                    const hData = await histRes.json();
                    if (Array.isArray(hData)) setAttendanceHistoryLogs(hData);
                }

                // Refresh repeated absences dynamically from DB
                const repRes = await fetchApi("/teacher/attendance/repeated-absences");
                if (repRes.ok) {
                    const rData = await repRes.json();
                    if (Array.isArray(rData)) setRepeatedAbsenceStudents(rData);
                }
            } else {
                throw new Error("Failed to record attendance logs");
            }
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "An error occurred while saving attendance." });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSaveAbsenceReason() {
        if (!selectedStudentForReason || !absenceReasonText) {
            setMsg({ type: "error", text: "Please select a student and provide an absence reason explanation." });
            return;
        }

        setSavingReason(true);
        try {
            const enrollmentId = selectedStudentForReason.id || selectedStudentForReason.enrollmentId;
            const fullRemark = `[Category: ${reasonCategory}] ${reasonDocumentRef ? `[DocRef: ${reasonDocumentRef}] ` : ''}${absenceReasonText}`;

            setNotesMap(prev => ({
                ...prev,
                [enrollmentId]: fullRemark
            }));
            setAttendanceMap(prev => ({
                ...prev,
                [enrollmentId]: reasonStatus
            }));

            // Submit single student attendance log update to backend DB
            const activeCls = classes.find(c => (c.assignment?.id || c.id) === selectedClassId);
            const assignment = activeCls?.assignment || activeCls || {};

            const res = await fetchApi("/teacher/attendance/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId: assignment.academicYearId || "active-year",
                    sectionId: assignment.sectionId || assignment.section?.id,
                    date: reasonDate,
                    attendances: [{
                        enrollmentId,
                        status: reasonStatus,
                        remarks: fullRemark
                    }]
                })
            });

            if (res.ok) {
                setMsg({ type: "success", text: `Absence reason saved to database for ${selectedStudentForReason.student?.firstName || 'Student'}!` });
                setSelectedStudentForReason(null);
                setAbsenceReasonText("");
                setReasonDocumentRef("");

                // Refresh history from DB
                const histRes = await fetchApi("/teacher/attendance/history");
                if (histRes.ok) {
                    const hData = await histRes.json();
                    if (Array.isArray(hData)) setAttendanceHistoryLogs(hData);
                }
            } else {
                throw new Error("Failed to save absence reason to DB");
            }
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to record absence reason." });
        } finally {
            setSavingReason(false);
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
                setMsg({ type: "success", text: `Support flag saved to database for ${reportingStudent.student?.firstName || 'Student'}!` });
                setReportingStudent(null);
                setReportReason("");

                // Refresh flags list from DB
                const flagsRes = await fetchApi("/teacher/support-flags");
                if (flagsRes.ok) {
                    const flagsData = await flagsRes.json();
                    if (Array.isArray(flagsData)) setExistingSupportFlags(flagsData);
                }
            } else {
                throw new Error("Failed to report attendance problem");
            }
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to submit attendance report." });
        } finally {
            setSubmittingReport(false);
        }
    }

    // Filtered roster for search in Tab 1
    const filteredRoster = useMemo(() => {
        return students.filter((st: any) => {
            const studentObj = st.student || st;
            const fullName = `${studentObj.firstName || ''} ${studentObj.lastName || ''} ${studentObj.fatherName || ''}`.toLowerCase();
            const code = (studentObj.studentId || '').toLowerCase();
            const q = searchQuery.toLowerCase();
            return fullName.includes(q) || code.includes(q);
        });
    }, [students, searchQuery]);

    // Computed dynamic database metrics for Tab 2
    const dynamicMetrics = useMemo(() => {
        const total = attendanceHistoryLogs.length;
        if (total === 0) {
            return { presentRate: 100, totalSessions: 0, presentCount: 0, absentCount: 0, lateCount: 0, excusedCount: 0 };
        }

        const presentCount = attendanceHistoryLogs.filter(l => l.status === "PRESENT").length;
        const absentCount = attendanceHistoryLogs.filter(l => l.status === "ABSENT").length;
        const lateCount = attendanceHistoryLogs.filter(l => l.status === "LATE").length;
        const excusedCount = attendanceHistoryLogs.filter(l => l.status === "EXCUSED").length;
        const presentRate = Math.round((presentCount / total) * 100);

        return { presentRate, totalSessions: total, presentCount, absentCount, lateCount, excusedCount };
    }, [attendanceHistoryLogs]);

    // Helper to safely extract Grade Level string
    function getGradeLevel(cls: any): string {
        const raw = cls.assignment?.schoolGrade?.grade?.level ?? 
                    cls.assignment?.section?.schoolGrade?.grade?.level ??
                    cls.section?.schoolGrade?.grade?.level ??
                    cls.schoolGrade?.grade?.level ??
                    cls.gradeLevel ??
                    "9";
        return String(raw);
    }

    // Dynamic Grouping of Assigned Classes by Grade Level for Step 1
    const gradeGroups = useMemo(() => {
        const map: Record<string, any[]> = {};
        classes.forEach(cls => {
            const level = getGradeLevel(cls);
            if (!map[level]) map[level] = [];
            map[level].push(cls);
        });
        return Object.entries(map).map(([level, sections]) => ({
            gradeLevel: level,
            sections,
            totalStudents: sections.reduce((acc, curr) => acc + (curr.students?.length || curr.assignment?.section?.studentEnrollments?.length || 0), 0)
        }));
    }, [classes]);

    // Sections for selected Grade Level in Step 2
    const sectionsForSelectedGrade = useMemo(() => {
        if (!historySelectedGrade) return classes;
        return classes.filter(cls => getGradeLevel(cls) === String(historySelectedGrade));
    }, [classes, historySelectedGrade]);

    // Step 3 Filtered Students for selected section
    const sectionStudentsInHistory = useMemo(() => {
        if (!historySelectedSection) return [];
        const stList = historySelectedSection.students || historySelectedSection.assignment?.section?.studentEnrollments || [];
        return stList.filter((stItem: any) => {
            const studentObj = stItem.student || stItem;
            const fullName = `${studentObj.firstName || ''} ${studentObj.lastName || ''} ${studentObj.fatherName || ''}`.toLowerCase();
            const code = (studentObj.studentId || '').toLowerCase();
            const q = historyStudentSearch.toLowerCase();
            return fullName.includes(q) || code.includes(q);
        });
    }, [historySelectedSection, historyStudentSearch]);

    // Step 4 Logs for selected student in Tab 2 Hierarchy
    const individualStudentLogs = useMemo(() => {
        if (!historySelectedStudent) return [];
        const enrollmentId = historySelectedStudent.id || historySelectedStudent.enrollmentId;
        return attendanceHistoryLogs.filter(log => log.enrollmentId === enrollmentId || log.enrollment?.id === enrollmentId);
    }, [historySelectedStudent, attendanceHistoryLogs]);

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#247297] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading dynamic database records...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard/teacher" className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Attendance Operations</h1>
                    </div>
                </div>
            </div>

            {/* Notification Bar */}
            {msg && (
                <div className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between shadow-2xs ${
                    msg.type === "success" 
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200" 
                        : "bg-red-50 text-red-900 border-red-200"
                }`}>
                    <div className="flex items-center space-x-2">
                        {msg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                        <span>{msg.text}</span>
                    </div>
                    <button onClick={() => setMsg(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 1: TAKE STUDENT ATTENDANCE */}
            {/* ======================================================== */}
            {(activeTab === "take" || !activeTab) && (
                <div className="space-y-5">
                    {/* Class & Date Selector Controls */}
                    <Card className="border border-gray-200">
                        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
                            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Select Class Section</label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => handleClassChange(e.target.value)}
                                        className="bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#247297]"
                                    >
                                        {classes.length === 0 ? (
                                            <option value="">No classes assigned in database</option>
                                        ) : (
                                            classes.map((cls: any) => {
                                                const id = cls.assignment?.id || cls.id;
                                                const gradeLevel = getGradeLevel(cls);
                                                const secName = cls.assignment?.section?.name || cls.section?.name || 'A';
                                                const subj = cls.assignment?.subject?.name || 'Subject';
                                                return (
                                                    <option key={id} value={id}>
                                                        Grade {gradeLevel} - Section {secName} ({subj})
                                                    </option>
                                                );
                                            })
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Attendance Date</label>
                                    <input
                                        type="date"
                                        value={attendanceDate}
                                        onChange={(e) => setAttendanceDate(e.target.value)}
                                        className="bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#247297]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Class Period</label>
                                    <select
                                        value={selectedPeriod}
                                        onChange={(e) => setSelectedPeriod(e.target.value)}
                                        className="bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#247297]"
                                    >
                                        <option value="">Daily Attendance (Full Day)</option>
                                        <option value="Period 1">Period 1 (8:00 AM - 8:45 AM)</option>
                                        <option value="Period 2">Period 2 (8:45 AM - 9:30 AM)</option>
                                        <option value="Period 3">Period 3 (9:45 AM - 10:30 AM)</option>
                                        <option value="Period 4">Period 4 (10:30 AM - 11:15 AM)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Batch Action Buttons */}
                            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                                <button
                                    onClick={() => markAllStatus("PRESENT")}
                                    className="px-3.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center space-x-1.5"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Mark All Present</span>
                                </button>
                                <button
                                    onClick={handleSubmitAttendance}
                                    disabled={submitting}
                                    className="px-4 py-2 bg-[#247297] text-white rounded-xl text-xs font-bold hover:bg-[#1b5875] transition-colors shadow-2xs flex items-center space-x-1.5 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    <span>Save Attendance Logs</span>
                                </button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section Roster Table with Status Toggles */}
                    <Card className="border border-gray-200 overflow-hidden">
                        <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-[#247297]" />
                                <CardTitle className="text-sm font-bold text-gray-900">
                                    Student Section Roster ({filteredRoster.length} Enrolled)
                                </CardTitle>
                            </div>
                            <div className="relative w-64">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    placeholder="Filter by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-8 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-[#247297]"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                                            <th className="py-3 px-4">#</th>
                                            <th className="py-3 px-4">Student Name</th>
                                            <th className="py-3 px-4">Student ID</th>
                                            <th className="py-3 px-4 text-center">Status Selection</th>
                                            <th className="py-3 px-4">Remarks / Absence Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium">
                                        {filteredRoster.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                                                    No students enrolled in this section in database.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredRoster.map((stItem: any, idx: number) => {
                                                const studentObj = stItem.student || stItem;
                                                const enrollmentId = stItem.id;
                                                const currentStatus = attendanceMap[enrollmentId] || "PRESENT";

                                                return (
                                                    <tr key={enrollmentId} className="hover:bg-[#247297]/5 transition-colors">
                                                        <td className="py-3 px-4 font-mono text-gray-400 font-bold">{idx + 1}</td>
                                                        <td className="py-3 px-4 font-bold text-gray-900">
                                                            {studentObj.firstName} {studentObj.lastName} {studentObj.fatherName || ''}
                                                        </td>
                                                        <td className="py-3 px-4 font-mono font-bold text-[#247297]">
                                                            {studentObj.studentId || 'N/A'}
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center justify-center space-x-1.5">
                                                                <button
                                                                    onClick={() => handleStatusToggle(enrollmentId, "PRESENT")}
                                                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors border ${
                                                                        currentStatus === "PRESENT"
                                                                            ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                                                                            : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-emerald-50"
                                                                    }`}
                                                                >
                                                                    PRESENT
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusToggle(enrollmentId, "ABSENT")}
                                                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors border ${
                                                                        currentStatus === "ABSENT"
                                                                            ? "bg-red-600 text-white border-red-700 shadow-2xs"
                                                                            : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-red-50"
                                                                    }`}
                                                                >
                                                                    ABSENT
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusToggle(enrollmentId, "LATE")}
                                                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors border ${
                                                                        currentStatus === "LATE"
                                                                            ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                                                                            : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-amber-50"
                                                                    }`}
                                                                >
                                                                    LATE
                                                                </button>
                                                                <button
                                                                    onClick={() => handleStatusToggle(enrollmentId, "EXCUSED")}
                                                                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors border ${
                                                                        currentStatus === "EXCUSED"
                                                                            ? "bg-blue-600 text-white border-blue-700 shadow-2xs"
                                                                            : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-blue-50"
                                                                    }`}
                                                                >
                                                                    EXCUSED
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <input
                                                                type="text"
                                                                placeholder="Add remark or reason..."
                                                                value={notesMap[enrollmentId] || ""}
                                                                onChange={(e) => handleNoteChange(enrollmentId, e.target.value)}
                                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-[#247297]"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: ATTENDANCE HISTORY (Grade -> Section -> Student List Hierarchy) */}
            {/* ======================================================== */}
            {activeTab === "history" && (
                <div className="space-y-5">
                    {/* Top Bar: View Switcher & Metrics */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => {
                                    setHistoryViewMode("hierarchy");
                                    setHistoryStep("grades");
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                                    historyViewMode === "hierarchy" 
                                        ? "bg-[#247297] text-white shadow-2xs" 
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>📁 By Grade & Section Hierarchy</span>
                            </button>
                            <button
                                onClick={() => setHistoryViewMode("table")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                                    historyViewMode === "table" 
                                        ? "bg-[#247297] text-white shadow-2xs" 
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                            >
                                <List className="w-3.5 h-3.5" />
                                <span>📋 All Logged Sessions Directory</span>
                            </button>
                        </div>

                        <div className="flex items-center space-x-4 text-xs font-bold">
                            <span className="text-gray-600">Total DB Logs: <strong className="text-gray-900">{dynamicMetrics.totalSessions}</strong></span>
                            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                Present Rate: <strong>{dynamicMetrics.presentRate}%</strong>
                            </span>
                        </div>
                    </div>

                    {/* MODE A: HIERARCHICAL STEP-BY-STEP FLOW */}
                    {historyViewMode === "hierarchy" && (
                        <div className="space-y-5">
                            {/* STEP 1: GRADE CARDS VIEW */}
                            {historyStep === "grades" && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-gray-900">Select Grade Level to Inspect Attendance</h2>
                                        <span className="text-xs font-semibold text-gray-500">{gradeGroups.length} Assigned Grades</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {gradeGroups.map((gGroup: any) => (
                                            <Card 
                                                key={gGroup.gradeLevel}
                                                onClick={() => {
                                                    setHistorySelectedGrade(gGroup.gradeLevel);
                                                    setHistoryStep("sections");
                                                }}
                                                className="border border-gray-200 hover:border-[#247297] hover:shadow-md transition-all cursor-pointer group bg-white"
                                            >
                                                <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-[#247297]/10 flex items-center justify-center text-[#247297] font-black text-base group-hover:bg-[#247297] group-hover:text-white transition-colors">
                                                            G{gGroup.gradeLevel}
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-base font-extrabold text-gray-900 group-hover:text-[#247297] transition-colors">
                                                                Grade {gGroup.gradeLevel}
                                                            </CardTitle>
                                                            <span className="text-xs font-semibold text-gray-500">{gGroup.sections.length} Sections Assigned</span>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-4 pb-4 text-xs space-y-3">
                                                    <div className="flex items-center justify-between text-gray-600">
                                                        <span>Enrolled Students:</span>
                                                        <strong className="text-gray-900">{gGroup.totalStudents} Students</strong>
                                                    </div>
                                                    <div className="flex items-center justify-between text-gray-600">
                                                        <span>Status:</span>
                                                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">
                                                            Active Attendance
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setHistorySelectedGrade(gGroup.gradeLevel);
                                                            setHistoryStep("sections");
                                                        }}
                                                        className="w-full py-2 bg-[#247297] text-white font-bold text-xs rounded-xl hover:bg-[#1b5875] transition-colors flex items-center justify-center space-x-1.5 shadow-2xs mt-2"
                                                    >
                                                        <span>Explore Grade {gGroup.gradeLevel} Sections</span>
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: SECTION CARDS VIEW */}
                            {historyStep === "sections" && (
                                <div className="space-y-4">
                                    {/* Breadcrumb Trail */}
                                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <button 
                                            onClick={() => setHistoryStep("grades")}
                                            className="text-[#247297] hover:underline"
                                        >
                                            All Assigned Grades
                                        </button>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-gray-900">Grade {historySelectedGrade} Sections</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-gray-900">Select Section in Grade {historySelectedGrade}</h2>
                                        <span className="text-xs font-semibold text-gray-500">{sectionsForSelectedGrade.length} Sections</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {sectionsForSelectedGrade.map((clsItem: any) => {
                                            const id = clsItem.assignment?.id || clsItem.id;
                                            const secName = clsItem.assignment?.section?.name || clsItem.section?.name || 'A';
                                            const subj = clsItem.assignment?.subject?.name || 'Subject';
                                            const stList = clsItem.students || clsItem.assignment?.section?.studentEnrollments || [];

                                            return (
                                                <Card 
                                                    key={id}
                                                    onClick={() => {
                                                        setHistorySelectedSection(clsItem);
                                                        setHistoryStep("students");
                                                    }}
                                                    className="border border-gray-200 hover:border-[#247297] hover:shadow-md transition-all cursor-pointer group bg-white"
                                                >
                                                    <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            <div className="w-9 h-9 rounded-xl bg-[#247297]/10 flex items-center justify-center text-[#247297] font-black text-sm group-hover:bg-[#247297] group-hover:text-white transition-colors">
                                                                {secName}
                                                            </div>
                                                            <div>
                                                                <CardTitle className="text-sm font-bold text-gray-900 group-hover:text-[#247297] transition-colors">
                                                                    Section {secName}
                                                                </CardTitle>
                                                                <span className="text-[11px] font-semibold text-gray-500">{subj}</span>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="pt-3 pb-4 text-xs space-y-2">
                                                        <div className="flex items-center justify-between text-gray-600">
                                                            <span>Enrolled Students:</span>
                                                            <strong className="text-gray-900">{stList.length} Students</strong>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                setHistorySelectedSection(clsItem);
                                                                setHistoryStep("students");
                                                            }}
                                                            className="w-full py-2 bg-[#247297] text-white font-bold text-xs rounded-xl hover:bg-[#1b5875] transition-colors flex items-center justify-center space-x-1.5 shadow-2xs mt-2"
                                                        >
                                                            <span>View Section Students Roster</span>
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: SECTION STUDENTS ATTENDANCE ROSTER */}
                            {historyStep === "students" && historySelectedSection && (
                                <div className="space-y-4">
                                    {/* Breadcrumb Trail */}
                                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <button 
                                            onClick={() => setHistoryStep("grades")}
                                            className="text-[#247297] hover:underline"
                                        >
                                            All Assigned Grades
                                        </button>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                        <button 
                                            onClick={() => setHistoryStep("sections")}
                                            className="text-[#247297] hover:underline"
                                        >
                                            Grade {historySelectedGrade}
                                        </button>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-gray-900">
                                            Section {historySelectedSection.assignment?.section?.name || 'A'} Roster
                                        </span>
                                    </div>

                                    {/* Section Roster Search & Controls */}
                                    <Card className="border border-gray-200">
                                        <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                                            <CardTitle className="text-sm font-bold text-gray-900">
                                                Enrolled Students ({sectionStudentsInHistory.length})
                                            </CardTitle>
                                            <div className="relative w-64">
                                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                                                <input
                                                    type="text"
                                                    placeholder="Search student by name or ID..."
                                                    value={historyStudentSearch}
                                                    onChange={(e) => setHistoryStudentSearch(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 text-xs rounded-xl pl-8 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-[#247297]"
                                                />
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                                                        <th className="py-3 px-4">#</th>
                                                        <th className="py-3 px-4">Student Name</th>
                                                        <th className="py-3 px-4">Student ID</th>
                                                        <th className="py-3 px-4 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 font-medium">
                                                    {sectionStudentsInHistory.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                                                                No students found matching search criteria.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        sectionStudentsInHistory.map((stItem: any, idx: number) => {
                                                            const stObj = stItem.student || stItem;
                                                            return (
                                                                <tr key={stItem.id} className="hover:bg-gray-50">
                                                                    <td className="py-3 px-4 font-mono text-gray-400 font-bold">{idx + 1}</td>
                                                                    <td className="py-3 px-4 font-bold text-gray-900">
                                                                        {stObj.firstName} {stObj.lastName} {stObj.fatherName || ''}
                                                                    </td>
                                                                    <td className="py-3 px-4 font-mono font-bold text-[#247297]">
                                                                        {stObj.studentId || 'N/A'}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-center">
                                                                        <button
                                                                            onClick={() => {
                                                                                setHistorySelectedStudent(stItem);
                                                                                setHistoryStep("detail");
                                                                            }}
                                                                            className="px-3 py-1 bg-[#247297] text-white text-[11px] font-bold rounded-lg hover:bg-[#1b5875] transition-colors"
                                                                        >
                                                                            View Student Attendance Logs ➔
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}

                            {/* STEP 4: INDIVIDUAL STUDENT DETAILED ATTENDANCE LOGS */}
                            {historyStep === "detail" && historySelectedStudent && (
                                <div className="space-y-4">
                                    {/* Breadcrumb Trail */}
                                    <div className="flex items-center space-x-2 text-xs font-bold text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <button 
                                            onClick={() => setHistoryStep("grades")}
                                            className="text-[#247297] hover:underline"
                                        >
                                            All Assigned Grades
                                        </button>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                        <button 
                                            onClick={() => setHistoryStep("sections")}
                                            className="text-[#247297] hover:underline"
                                        >
                                            Grade {historySelectedGrade}
                                        </button>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                        <button 
                                            onClick={() => setHistoryStep("students")}
                                            className="text-[#247297] hover:underline"
                                        >
                                            Section {historySelectedSection?.assignment?.section?.name || 'A'}
                                        </button>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                        <span className="text-gray-900">
                                            Student: {historySelectedStudent.student?.firstName} {historySelectedStudent.student?.lastName}
                                        </span>
                                    </div>

                                    {/* Student Header */}
                                    <Card className="border border-gray-200 bg-white">
                                        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900">
                                                    {historySelectedStudent.student?.firstName} {historySelectedStudent.student?.lastName} {historySelectedStudent.student?.fatherName || ''}
                                                </h3>
                                                <p className="text-xs text-gray-500 font-mono">
                                                    ID: {historySelectedStudent.student?.studentId || 'N/A'} • Grade {historySelectedGrade} - Section {historySelectedSection?.assignment?.section?.name || 'A'}
                                                </p>
                                            </div>

                                            <div className="flex items-center space-x-3 text-xs font-bold">
                                                <span className="px-3 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-200">
                                                    Present Rate: 100%
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Student Logs Timeline Table */}
                                    <Card className="border border-gray-200">
                                        <CardHeader className="pb-3 border-b border-gray-100">
                                            <CardTitle className="text-sm font-bold text-gray-900">Individual Attendance Log Timeline</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <table className="w-full text-left text-xs border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                                                        <th className="py-3 px-4">Date</th>
                                                        <th className="py-3 px-4">Period</th>
                                                        <th className="py-3 px-4 text-center">Status</th>
                                                        <th className="py-3 px-4">Remarks / Excuse Notes</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 font-medium">
                                                    {individualStudentLogs.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                                                                No individual attendance logs found in database for this student.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        individualStudentLogs.map((log: any) => {
                                                            const logDate = new Date(log.date).toISOString().split('T')[0];
                                                            return (
                                                                <tr key={log.id} className="hover:bg-gray-50">
                                                                    <td className="py-3 px-4 font-mono font-bold text-gray-700">{logDate}</td>
                                                                    <td className="py-3 px-4 text-gray-600">{log.classPeriod?.name || 'Daily Attendance'}</td>
                                                                    <td className="py-3 px-4 text-center">
                                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                                                            log.status === "PRESENT" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                                                            log.status === "ABSENT" ? "bg-red-100 text-red-800 border-red-200" :
                                                                            log.status === "LATE" ? "bg-amber-100 text-amber-800 border-amber-200" :
                                                                            "bg-blue-100 text-blue-800 border-blue-200"
                                                                        }`}>
                                                                            {log.status}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-4 text-gray-500 italic">
                                                                        {log.remarks || '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MODE B: ALL LOGGED SESSIONS DIRECTORY TABLE */}
                    {historyViewMode === "table" && (
                        <Card className="border border-gray-200">
                            <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold text-gray-900">All Database Attendance Records</CardTitle>
                                <span className="text-xs text-gray-500 font-semibold">{attendanceHistoryLogs.length} Total Records</span>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                                            <th className="py-3 px-4">Date</th>
                                            <th className="py-3 px-4">Student Name</th>
                                            <th className="py-3 px-4">Class Section</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                            <th className="py-3 px-4">Remarks / Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 font-medium">
                                        {attendanceHistoryLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                                                    No attendance logs found in database. Take attendance to see records here.
                                                </td>
                                            </tr>
                                        ) : (
                                            attendanceHistoryLogs.map((log: any) => {
                                                const st = log.enrollment?.student;
                                                const sec = log.enrollment?.section?.name || 'A';
                                                const gr = log.enrollment?.schoolGrade?.grade?.level || '9';
                                                const logDate = new Date(log.date).toISOString().split('T')[0];

                                                return (
                                                    <tr key={log.id} className="hover:bg-gray-50">
                                                        <td className="py-3 px-4 font-mono font-bold text-gray-700">{logDate}</td>
                                                        <td className="py-3 px-4 font-bold text-gray-900">
                                                            {st ? `${st.firstName} ${st.lastName}` : 'Enrolled Student'}
                                                        </td>
                                                        <td className="py-3 px-4 font-semibold text-gray-600">
                                                            Grade {gr} — Section {sec}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                                                log.status === "PRESENT" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                                                                log.status === "ABSENT" ? "bg-red-100 text-red-800 border-red-200" :
                                                                log.status === "LATE" ? "bg-amber-100 text-amber-800 border-amber-200" :
                                                                "bg-blue-100 text-blue-800 border-blue-200"
                                                            }`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-500 italic">
                                                            {log.remarks || '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: RECORD ABSENCE REASON */}
            {/* ======================================================== */}
            {activeTab === "reasons" && (
                <div className="space-y-5">
                    <Card className="border border-gray-200 bg-white">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                                <FileCheck className="w-5 h-5 text-[#247297]" />
                                <CardTitle className="text-sm font-bold text-gray-900">
                                    Record Controlled Absence Reason & Explanation
                                </CardTitle>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                Select an absent student to attach school-approved reason classifications, parent telephone communications, or medical certificates.
                            </p>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">1. Select Class Section</label>
                                    <select
                                        value={selectedClassId}
                                        onChange={(e) => handleClassChange(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#247297]"
                                    >
                                        {classes.map((cls: any) => {
                                            const id = cls.assignment?.id || cls.id;
                                            const gradeLevel = getGradeLevel(cls);
                                            const secName = cls.assignment?.section?.name || cls.section?.name || 'A';
                                            const subj = cls.assignment?.subject?.name || 'Subject';
                                            return (
                                                <option key={id} value={id}>
                                                    Grade {gradeLevel} - Section {secName} ({subj})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">2. Select Absent Student</label>
                                    <select
                                        value={selectedStudentForReason?.id || ""}
                                        onChange={(e) => {
                                            const st = students.find(s => s.id === e.target.value);
                                            setSelectedStudentForReason(st || null);
                                        }}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#247297]"
                                    >
                                        <option value="">-- Choose Student from Roster --</option>
                                        {students.map((st: any) => {
                                            const stObj = st.student || st;
                                            return (
                                                <option key={st.id} value={st.id}>
                                                    {stObj.firstName} {stObj.lastName} ({stObj.studentId || 'ID'})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">3. Date of Missed Session</label>
                                    <input
                                        type="date"
                                        value={reasonDate}
                                        onChange={(e) => setReasonDate(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-bold rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#247297]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">4. Reason Category</label>
                                    <select
                                        value={reasonCategory}
                                        onChange={(e) => setReasonCategory(e.target.value as any)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#247297]"
                                    >
                                        <option value="MEDICAL">🏥 Medical / Illness (Doctor Note / Sick Leave)</option>
                                        <option value="FAMILY">🏠 Family Emergency / Urgent Private Matter</option>
                                        <option value="SCHOOL_ACTIVITY">🏆 Official School Activity (Sports / Field Trip)</option>
                                        <option value="PARENT_NOTE">📞 Parent Communication Note (Phone Call / Letter)</option>
                                        <option value="UNEXCUSED">❌ Unexcused Absence / Truancy</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">5. Optional Document / Certificate Reference ID</label>
                                    <div className="relative">
                                        <Paperclip className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                        <input
                                            type="text"
                                            placeholder="e.g. DOC-9874 / Medical Cert #104..."
                                            value={reasonDocumentRef}
                                            onChange={(e) => setReasonDocumentRef(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-xl pl-9 pr-3 py-2.5 outline-none focus:ring-2 focus:ring-[#247297]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">6. Written Explanation & Remarks</label>
                                <textarea
                                    rows={3}
                                    placeholder="Enter detailed explanatory notes (e.g. 'Father called at 8:15 AM confirming student is home with high fever. Doctor note expected tomorrow.')..."
                                    value={absenceReasonText}
                                    onChange={(e) => setAbsenceReasonText(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#247297]"
                                    required
                                />
                            </div>

                            <button
                                onClick={handleSaveAbsenceReason}
                                disabled={savingReason}
                                className="px-5 py-2.5 bg-[#247297] text-white text-xs font-bold rounded-xl hover:bg-[#1b5875] transition-colors shadow-2xs flex items-center space-x-2 disabled:opacity-50"
                            >
                                {savingReason ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>Save Absence Reason Log to Database</span>
                            </button>
                        </CardContent>
                    </Card>

                    {/* Dynamic Table of Recorded Absence Reasons in Database */}
                    <Card className="border border-gray-200">
                        <CardHeader className="pb-3 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-gray-900">Recorded Absence Reasons & Explanations History</CardTitle>
                            <span className="text-xs font-semibold text-gray-500">Database Audit Trail</span>
                        </CardHeader>
                        <CardContent className="p-0">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Student Name</th>
                                        <th className="py-3 px-4 text-center">Status</th>
                                        <th className="py-3 px-4">Recorded Explanation & Reason Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {attendanceHistoryLogs.filter(l => l.status === "EXCUSED" || (l.remarks && l.remarks.includes("[Category:"))).length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                                                No recorded absence reasons found in database. Use the form above to log medical or parent excuse notes.
                                            </td>
                                        </tr>
                                    ) : (
                                        attendanceHistoryLogs
                                            .filter(l => l.status === "EXCUSED" || (l.remarks && l.remarks.includes("[Category:")))
                                            .map((log: any) => {
                                                const st = log.enrollment?.student;
                                                const logDate = new Date(log.date).toISOString().split('T')[0];

                                                return (
                                                    <tr key={log.id} className="hover:bg-gray-50">
                                                        <td className="py-3 px-4 font-mono font-bold text-gray-700">{logDate}</td>
                                                        <td className="py-3 px-4 font-bold text-gray-900">
                                                            {st ? `${st.firstName} ${st.lastName}` : 'Enrolled Student'}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                                                                log.status === "EXCUSED" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-red-100 text-red-800 border-red-200"
                                                            }`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-gray-700">
                                                            {log.remarks || '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: IDENTIFY REPEATED ABSENCES (100% Dynamic Database Fetched) */}
            {/* ======================================================== */}
            {activeTab === "repeated" && (
                <div className="space-y-5">
                    <Card className="border border-amber-200 bg-amber-50/30">
                        <CardHeader className="pb-3 border-b border-amber-100 flex flex-row items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                                <CardTitle className="text-sm font-bold text-amber-950">At-Risk Students — Repeated Absence Warning</CardTitle>
                            </div>
                            <span className="px-3 py-1 bg-amber-200 text-amber-950 font-black rounded-lg text-xs">
                                Database Audit ({repeatedAbsenceStudents.length} Flagged)
                            </span>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-xs text-amber-900 font-medium mb-4">
                                The system queries PostgreSQL database records to flag students with repeated absences or high absenteeism.
                            </p>

                            {repeatedAbsenceStudents.length === 0 ? (
                                <div className="p-8 text-center bg-white rounded-xl border border-amber-100 text-gray-500 text-xs font-semibold">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <span>No repeated absence warnings found for your assigned sections in database.</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {repeatedAbsenceStudents.map((flaggedItem: any) => {
                                        const stObj = flaggedItem.student || {};
                                        return (
                                            <Card key={flaggedItem.enrollmentId} className="border border-red-200 bg-white">
                                                <CardContent className="p-4 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-extrabold text-gray-900">{stObj.firstName} {stObj.lastName}</span>
                                                        <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-black rounded-full border border-red-200">
                                                            {flaggedItem.absentCount} Absences Logged
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-mono">
                                                        ID: {stObj.studentId || 'N/A'} • Grade {flaggedItem.grade} - Section {flaggedItem.section}
                                                    </p>
                                                    <div className="flex items-center justify-between text-xs bg-red-50 p-2 rounded-xl">
                                                        <span className="text-red-700 font-semibold">Total Attendance Flags:</span>
                                                        <span className="font-black text-red-950">{flaggedItem.totalFlags}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setReportingStudent(flaggedItem);
                                                            setActiveTab("report");
                                                        }}
                                                        className="w-full py-2 bg-amber-600 text-white font-bold text-xs rounded-xl hover:bg-amber-700 transition-colors mt-2"
                                                    >
                                                        Report Attendance Problem
                                                    </button>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: REPORT ATTENDANCE PROBLEMS */}
            {/* ======================================================== */}
            {activeTab === "report" && (
                <div className="space-y-5">
                    <Card className="border border-gray-200">
                        <CardHeader className="pb-3 border-b border-gray-100">
                            <CardTitle className="text-sm font-bold text-gray-900">Report Attendance Concern & Raise Support Flag</CardTitle>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">Submit an automated notification to parents and school administration regarding severe student absenteeism.</p>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-xs">
                            <form onSubmit={handleReportAttendanceProblem} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Select Student</label>
                                        <select
                                            value={reportingStudent?.id || reportingStudent?.enrollmentId || ""}
                                            onChange={(e) => {
                                                const st = students.find(s => s.id === e.target.value);
                                                setReportingStudent(st || null);
                                            }}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#247297]"
                                        >
                                            <option value="">-- Choose Student from Database --</option>
                                            {students.map((st: any) => {
                                                const stObj = st.student || st;
                                                return (
                                                    <option key={st.id} value={st.id}>
                                                        {stObj.firstName} {stObj.lastName} ({stObj.studentId || 'ID'})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Alert Severity Level</label>
                                        <select
                                            value={reportSeverity}
                                            onChange={(e) => setReportSeverity(e.target.value as any)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#247297]"
                                        >
                                            <option value="LOW">LOW — First Unexcused Absence</option>
                                            <option value="MEDIUM">MEDIUM — 2 Unexcused Absences</option>
                                            <option value="HIGH">HIGH — 3+ Consecutive Absences</option>
                                            <option value="CRITICAL">CRITICAL — Severe Chronic Absenteeism</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Issue Description & Action Request</label>
                                    <textarea
                                        rows={4}
                                        placeholder="Describe attendance pattern concerns, parent phone calls made, or administrative intervention needed..."
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#247297]"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingReport}
                                    className="px-5 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors shadow-2xs flex items-center space-x-2 disabled:opacity-50"
                                >
                                    {submittingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    <span>Submit Support Flag to DB & Notify Parent</span>
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Support Flags Table from Database */}
                    {existingSupportFlags.length > 0 && (
                        <Card className="border border-gray-200">
                            <CardHeader className="pb-3 border-b border-gray-100">
                                <CardTitle className="text-sm font-bold text-gray-900">Database Support Flags History</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                                            <th className="py-3 px-4">Student</th>
                                            <th className="py-3 px-4">Severity</th>
                                            <th className="py-3 px-4">Description</th>
                                            <th className="py-3 px-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {existingSupportFlags.map((flag: any) => (
                                            <tr key={flag.id} className="hover:bg-gray-50">
                                                <td className="py-3 px-4 font-bold text-gray-900">
                                                    {flag.student?.firstName} {flag.student?.lastName}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-black rounded-full">
                                                        {flag.severity}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">{flag.description}</td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                                                        {flag.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}

export default function AttendancePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-sm font-semibold">Loading Attendance Operations...</div>}>
            <AttendanceContent />
        </Suspense>
    );
}
