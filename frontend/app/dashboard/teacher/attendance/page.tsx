"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
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
    Check
} from "lucide-react";

export default function TeacherAttendancePage() {
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

    // UI state
    const [loading, setLoading] = useState(true);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            setLoading(true);
            const [classesRes, timetableRes] = await Promise.all([
                fetchApi("/teacher/my-classes"),
                fetchApi("/teacher/my-timetable")
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
            initialAtt[st.id] = "PRESENT";
            initialNotes[st.id] = "";
        });

        setAttendanceMap(initialAtt);
        setNotesMap(initialNotes);
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
            } else {
                throw new Error("Failed to record attendance logs");
            }
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "An error occurred while saving attendance." });
        } finally {
            setSubmitting(false);
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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563eb] mb-4"></div>
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
            
            {/* 1. Header Bar matching Screenshot */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#0f172a]">Attendance</h1>
                    <p className="text-xs font-normal text-gray-500 mt-1">
                        Record and manage attendance for your assigned classes
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

            {/* 2. Top Filter Controls Bar */}
            <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                
                {/* Class / Section Dropdown */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Class/Section</label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => handleSelectClassChange(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
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

                {/* Subject Dropdown */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subject</label>
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    >
                        {availableSubjects.map((sub, idx) => (
                            <option key={idx} value={sub}>{sub}</option>
                        ))}
                    </select>
                </div>

                {/* Period Dropdown */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Period</label>
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    >
                        <option value="">Period 1 (08:00 - 08:45)</option>
                        <option value="period-2">Period 2 (08:30 - 09:15)</option>
                        <option value="period-3">Period 3 (09:15 - 10:00)</option>
                        <option value="period-4">Period 4 (10:30 - 11:15)</option>
                    </select>
                </div>

                {/* Load Students Button */}
                <div>
                    <button
                        type="button"
                        onClick={handleLoadStudents}
                        disabled={loadingRoster}
                        className="w-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold rounded-lg p-2.5 text-xs flex items-center justify-center space-x-2 transition-colors shadow-2xs disabled:opacity-60"
                    >
                        <RotateCw className={`w-4 h-4 ${loadingRoster ? "animate-spin" : ""}`} />
                        <span>Load Students</span>
                    </button>
                </div>
            </div>

            {/* 3. Summary KPI Stat Cards Row (5 Cards matching Screenshot) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                {/* Present Card */}
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

                {/* Absent Card */}
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

                {/* Late Card */}
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

                {/* Excused Card */}
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

                {/* Total Students Card */}
                <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-2xs flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        <Users className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-gray-500">Total Students</p>
                        <div className="flex items-baseline space-x-2">
                            <span className="text-xl font-bold text-gray-900">{totalCount}</span>
                            <span className="text-xs font-semibold text-gray-500">100%</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* 4. Table Filter & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search students..."
                        className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        type="button"
                        onClick={handleMarkAllPresent}
                        className="px-3.5 py-2 bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold transition-colors"
                    >
                        Mark All Present
                    </button>
                    <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-3.5 py-2 bg-white border border-rose-400 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors"
                    >
                        Clear All
                    </button>
                </div>
            </div>

            {/* 5. Registered Students Attendance Table */}
            <div className="bg-white border border-gray-200/80 rounded-xl shadow-2xs overflow-hidden">
                {filteredStudents.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 space-y-2">
                        <Users className="w-10 h-10 mx-auto text-gray-300" />
                        <p className="text-sm font-semibold text-gray-700">No registered students found</p>
                        <p className="text-xs text-gray-500 max-w-md mx-auto">
                            Only students registered and enrolled in your assigned section appear in this roster.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-200/80 bg-gray-50/50 text-gray-500 font-semibold">
                                    <th className="py-3.5 px-4 w-12 text-center">#</th>
                                    <th className="py-3.5 px-4 font-semibold text-gray-700">Student Name</th>
                                    <th className="py-3.5 px-4 font-semibold text-gray-700">Student ID</th>
                                    <th className="py-3.5 px-4 font-semibold text-gray-700">Status</th>
                                    <th className="py-3.5 px-4 font-semibold text-gray-700">Note</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map((st: any, idx: number) => {
                                    const s = st.student || st;
                                    const currentStatus = attendanceMap[st.id] || "PRESENT";
                                    const currentNote = notesMap[st.id] || "";

                                    return (
                                        <tr key={st.id} className="hover:bg-gray-50/60 transition-colors">
                                            
                                            {/* # */}
                                            <td className="py-3.5 px-4 font-medium text-gray-400 text-center">
                                                {idx + 1}
                                            </td>

                                            {/* Student Name */}
                                            <td className="py-3.5 px-4 font-semibold text-gray-900 whitespace-nowrap">
                                                {s.firstName || "Student"} {s.lastName || ""}
                                            </td>

                                            {/* Student ID */}
                                            <td className="py-3.5 px-4 font-medium text-gray-500 whitespace-nowrap">
                                                {s.studentId || `ST-${String(idx + 1).padStart(3, '0')}`}
                                            </td>

                                            {/* Status Dropdown with Dot Indicator matching Screenshot */}
                                            <td className="py-3.5 px-4 min-w-[150px]">
                                                <div className="relative flex items-center">
                                                    <div className={`w-2 h-2 rounded-full absolute left-3 pointer-events-none ${
                                                        currentStatus === "PRESENT" ? "bg-emerald-500" :
                                                        currentStatus === "ABSENT" ? "bg-rose-500" :
                                                        currentStatus === "LATE" ? "bg-amber-500" : "bg-indigo-500"
                                                    }`} />
                                                    <select
                                                        value={currentStatus}
                                                        onChange={(e) => setAttendanceMap({ ...attendanceMap, [st.id]: e.target.value })}
                                                        className="w-full bg-white border border-gray-200 rounded-lg pl-7 pr-7 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none"
                                                    >
                                                        <option value="PRESENT">Present</option>
                                                        <option value="ABSENT">Absent</option>
                                                        <option value="LATE">Late</option>
                                                        <option value="EXCUSED">Excused</option>
                                                    </select>
                                                    <div className="absolute right-3 pointer-events-none text-gray-400 text-[10px]">▼</div>
                                                </div>
                                            </td>

                                            {/* Note Input */}
                                            <td className="py-3.5 px-4 min-w-[220px]">
                                                <input
                                                    type="text"
                                                    value={currentNote}
                                                    onChange={(e) => setNotesMap({ ...notesMap, [st.id]: e.target.value })}
                                                    placeholder="Add note (optional)"
                                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                                                />
                                            </td>

                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 6. Save Attendance Action Button at Bottom Right */}
            <div className="flex justify-end pt-4">
                <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={submitting || students.length === 0}
                    className="px-6 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs rounded-lg flex items-center space-x-2 transition-colors shadow-sm disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    <span>{submitting ? "Saving..." : "Save Attendance"}</span>
                </button>
            </div>

        </div>
    );
}
