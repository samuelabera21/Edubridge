"use client";

import { useEffect, useState, useMemo } from "react";
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
    BookOpen,
    User,
    Building2,
    Sparkles,
    CheckCheck,
    Clock3
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "NOT_RECORDED";

interface AttendanceRecordState {
    enrollmentId: string;
    studentName: string;
    studentIdCode: string;
    status: AttendanceStatus;
    remarks: string;
    recordedBy?: string;
    recordedAt?: string;
}

export default function StudentAttendancePage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [classPeriods, setClassPeriods] = useState<any[]>([]);
    const [timetableEntries, setTimetableEntries] = useState<any[]>([]);

    // Selection States
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");

    // Roster & Attendance State
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordState[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

    // 1. Initial Data Fetching
    const loadInitialData = async () => {
        try {
            setLoading(true);
            
            // Fetch Academic Years
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            const active = yearsData.find(y => y.status === "ACTIVE");
            setActiveYear(active || null);

            if (active) {
                // Fetch SchoolGrades for active year
                let sgData: any[] = [];
                const sgRes = await fetchApi(`/academic/years/${active.id}/grades`);
                if (sgRes.ok) {
                    sgData = await sgRes.json();
                } else {
                    // Fallback to vice-principal endpoint if needed
                    const vpSgRes = await fetchApi(`/vice-principal/academic/years/${active.id}/grades`);
                    if (vpSgRes.ok) sgData = await vpSgRes.json();
                }

                setSchoolGrades(sgData);
                if (sgData.length > 0) {
                    setSelectedGradeId(sgData[0].id);
                }

                // Fetch Class Periods
                const periodsRes = await fetchApi(`/timetable/periods?academicYearId=${active.id}`);
                if (periodsRes.ok) {
                    const periodsData = await periodsRes.json();
                    setClassPeriods(periodsData);
                }

                // Fetch Timetable Entries
                const ttRes = await fetchApi(`/timetable?academicYearId=${active.id}`);
                if (ttRes.ok) {
                    const ttData = await ttRes.json();
                    setTimetableEntries(ttData);
                }
            }
            
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    // 2. Load Sections when Selected Grade changes
    useEffect(() => {
        if (!selectedGradeId) {
            setSections([]);
            setSelectedSectionId("");
            return;
        }

        const currentSG = schoolGrades.find(sg => sg.id === selectedGradeId);
        if (currentSG && currentSG.sections && currentSG.sections.length > 0) {
            setSections(currentSG.sections);
            setSelectedSectionId(currentSG.sections[0].id);
        } else {
            // Fallback fetch sections
            const fetchSections = async () => {
                try {
                    const res = await fetchApi(`/academic/grades/${selectedGradeId}/sections`);
                    if (res.ok) {
                        const secData = await res.json();
                        setSections(secData);
                        if (secData.length > 0) {
                            setSelectedSectionId(secData[0].id);
                        } else {
                            setSelectedSectionId("");
                        }
                    }
                } catch (err) {
                    console.error("Failed to load sections", err);
                }
            };
            fetchSections();
        }
    }, [selectedGradeId, schoolGrades]);

    // 3. Fetch Roster & Saved Attendance for Selected Section & Date
    const loadSectionRosterAndAttendance = async () => {
        if (!selectedSectionId || !selectedDate) {
            setAttendanceRecords([]);
            return;
        }

        try {
            setLoadingRoster(true);
            setSaveSuccessMessage(null);
            
            let url = `/attendance/student/section/${selectedSectionId}?date=${selectedDate}`;
            if (selectedPeriodId) {
                url += `&classPeriodId=${selectedPeriodId}`;
            }

            const res = await fetchApi(url);
            if (!res.ok) throw new Error("Failed to load section attendance roster");
            
            const data = await res.json();

            const records: AttendanceRecordState[] = data.map((item: any) => {
                const existing = item.attendance;
                return {
                    enrollmentId: item.enrollment.id,
                    studentName: `${item.enrollment.student?.firstName || ""} ${item.enrollment.student?.lastName || ""}`.trim(),
                    studentIdCode: item.enrollment.studentIdCode || "N/A",
                    status: existing ? existing.status : "NOT_RECORDED",
                    remarks: existing ? existing.remarks || "" : "",
                    recordedBy: existing?.recordedBy ? `${existing.recordedBy.firstName || ""} ${existing.recordedBy.lastName || ""}` : undefined,
                    recordedAt: existing?.updatedAt ? new Date(existing.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
                };
            });

            setAttendanceRecords(records);
        } catch (err: any) {
            console.error("Error loading roster:", err);
            setAttendanceRecords([]);
        } finally {
            setLoadingRoster(false);
        }
    };

    useEffect(() => {
        loadSectionRosterAndAttendance();
    }, [selectedSectionId, selectedDate, selectedPeriodId]);

    // 4. Active Timetable Lesson Context
    const activeLesson = useMemo(() => {
        if (!selectedSectionId || !selectedPeriodId || !selectedDate) return null;

        const dateObj = new Date(selectedDate);
        const dayOfWeek = dateObj.getDay();

        const match = timetableEntries.find((t: any) => 
            t.teachingAssignment?.sectionId === selectedSectionId &&
            t.classPeriodId === selectedPeriodId &&
            t.dayOfWeek === dayOfWeek
        );

        if (!match) return null;

        return {
            subjectName: match.teachingAssignment?.subject?.name || "Unknown Subject",
            teacherName: match.teachingAssignment?.teacher ? `${match.teachingAssignment.teacher.firstName} ${match.teachingAssignment.teacher.lastName}` : "Unassigned Teacher",
            roomName: match.room?.name || "Unassigned Room"
        };
    }, [selectedSectionId, selectedPeriodId, selectedDate, timetableEntries]);

    // Handlers
    const handleStatusChange = (enrollmentId: string, status: AttendanceStatus) => {
        setAttendanceRecords(prev => 
            prev.map(r => r.enrollmentId === enrollmentId ? { ...r, status } : r)
        );
    };

    const handleRemarksChange = (enrollmentId: string, remarks: string) => {
        setAttendanceRecords(prev => 
            prev.map(r => r.enrollmentId === enrollmentId ? { ...r, remarks } : r)
        );
    };

    const handleMarkAllPresent = () => {
        setAttendanceRecords(prev => prev.map(r => ({ ...r, status: "PRESENT" })));
    };

    const handleSaveAttendance = async () => {
        if (!activeYear || !selectedSectionId || !selectedDate) return;

        const validRecords = attendanceRecords
            .filter(r => r.status !== "NOT_RECORDED")
            .map(r => ({
                enrollmentId: r.enrollmentId,
                status: r.status,
                remarks: r.remarks
            }));

        if (validRecords.length === 0) {
            alert("Please mark at least one student's attendance status before saving.");
            return;
        }

        try {
            setSaving(true);
            setSaveSuccessMessage(null);

            const payload = {
                academicYearId: activeYear.id,
                sectionId: selectedSectionId,
                date: selectedDate,
                classPeriodId: selectedPeriodId || undefined,
                records: validRecords
            };

            const res = await fetchApi("/attendance/student/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save attendance records");

            setSaveSuccessMessage(`Successfully updated attendance records for ${validRecords.length} students!`);
            loadSectionRosterAndAttendance();
        } catch (err: any) {
            alert(err.message || "Failed to save attendance");
        } finally {
            setSaving(false);
        }
    };

    // Stats calculations
    const stats = useMemo(() => {
        const total = attendanceRecords.length;
        const present = attendanceRecords.filter(r => r.status === "PRESENT").length;
        const absent = attendanceRecords.filter(r => r.status === "ABSENT").length;
        const late = attendanceRecords.filter(r => r.status === "LATE").length;
        const excused = attendanceRecords.filter(r => r.status === "EXCUSED").length;
        const unrecorded = attendanceRecords.filter(r => r.status === "NOT_RECORDED").length;
        
        const markedTotal = present + absent + late + excused;
        const rate = markedTotal > 0 ? Math.round((present / markedTotal) * 100) : 0;
        const isFullyRecorded = total > 0 && unrecorded === 0;

        return { total, present, absent, late, excused, unrecorded, rate, isFullyRecorded };
    }, [attendanceRecords]);

    if (loading) {
        return <LoadingState message="Loading attendance monitoring dashboard..." />;
    }

    if (error) {
        return <ErrorState message={error} onRetry={loadInitialData} />;
    }

    if (!activeYear) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center">
                            <ClipboardCheck className="w-6 h-6 mr-2 text-[#006b3f]" />
                            Student Attendance Monitoring
                        </h1>
                    </div>
                </div>
                <EmptyState 
                    title="No Active Academic Year" 
                    message="You must have an active academic year to view student attendance data." 
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Title Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <ClipboardCheck className="w-7 h-7 mr-2 text-[#006b3f]" />
                        Student Attendance Oversight
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Monitor period & daily attendance submitted by assigned teachers for <span className="font-semibold text-[#006b3f]">{activeYear.name}</span>
                    </p>
                </div>

                {saveSuccessMessage && (
                    <div className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-sm font-medium flex items-center animate-fade-in">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                        {saveSuccessMessage}
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Grade Selector */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                School Grade
                            </label>
                            <select
                                value={selectedGradeId}
                                onChange={(e) => setSelectedGradeId(e.target.value)}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] focus:border-transparent outline-none transition font-medium text-gray-900"
                            >
                                {schoolGrades.map((sg) => (
                                    <option key={sg.id} value={sg.id}>
                                        {sg.grade?.name || "Grade"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Section Selector */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Class Section
                            </label>
                            <select
                                value={selectedSectionId}
                                onChange={(e) => setSelectedSectionId(e.target.value)}
                                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] focus:border-transparent outline-none transition font-medium text-gray-900"
                            >
                                {sections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        Section {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Picker */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Date
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] focus:border-transparent outline-none transition"
                                />
                                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            </div>
                        </div>

                        {/* Class Period Selector */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                Class Period
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedPeriodId}
                                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                                    className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#006b3f] focus:border-transparent outline-none transition"
                                >
                                    <option value="">Full Daily Attendance</option>
                                    {classPeriods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.startTime} - {p.endTime})
                                        </option>
                                    ))}
                                </select>
                                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Active Timetable Lesson Context & Teacher Status Banner */}
            {selectedPeriodId && (
                <div className="bg-gradient-to-r from-emerald-900 to-[#006b3f] text-white p-4.5 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                            <Sparkles className="w-5 h-5 text-emerald-300" />
                        </div>
                        <div>
                            <p className="text-xs uppercase font-semibold text-emerald-200 tracking-wider">
                                Timetable Assigned Teacher & Lesson
                            </p>
                            {activeLesson ? (
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-0.5 text-sm font-medium">
                                    <span className="flex items-center text-white font-semibold">
                                        <BookOpen className="w-4 h-4 mr-1 text-emerald-300" />
                                        {activeLesson.subjectName}
                                    </span>
                                    <span className="flex items-center text-emerald-100">
                                        <User className="w-4 h-4 mr-1 text-emerald-300" />
                                        Assigned Teacher: {activeLesson.teacherName}
                                    </span>
                                    <span className="flex items-center text-emerald-100">
                                        <Building2 className="w-4 h-4 mr-1 text-emerald-300" />
                                        {activeLesson.roomName}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-sm text-emerald-100 mt-0.5">
                                    No scheduled lesson for this period & section
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="self-stretch sm:self-auto flex items-center">
                        {stats.isFullyRecorded ? (
                            <span className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 rounded-lg text-xs font-semibold flex items-center justify-center">
                                <CheckCheck className="w-4 h-4 mr-1.5 text-emerald-300" />
                                Teacher Attendance Submitted
                            </span>
                        ) : (
                            <span className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-500/20 border border-amber-400/40 text-amber-100 rounded-lg text-xs font-semibold flex items-center justify-center">
                                <Clock3 className="w-4 h-4 mr-1.5 text-amber-300" />
                                Awaiting Teacher Entry
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Attendance Analytics Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-white border-gray-200">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Total Enrolled</p>
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
                            <p className="text-xs text-amber-700 font-semibold uppercase">Pending / Unrecorded</p>
                            <p className="text-2xl font-bold text-amber-900 mt-1">{stats.unrecorded}</p>
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-700" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance Roster Table */}
            {loadingRoster ? (
                <LoadingState message="Fetching section attendance data..." />
            ) : attendanceRecords.length === 0 ? (
                <EmptyState 
                    title="No Students Found in Section" 
                    message="Select a grade and section above to monitor student attendance." 
                />
            ) : (
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gray-50/70 border-b border-gray-200 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-base font-semibold text-gray-900">
                                Section Attendance Records
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Real-time monitoring of attendance submitted by assigned classroom teachers
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
                                Mark All Present (Admin Test)
                            </Button>

                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={handleSaveAttendance}
                                isLoading={saving}
                                leftIcon={<Save className="w-4 h-4" />}
                                className="w-1/2 sm:w-auto bg-[#006b3f] hover:bg-[#005432]"
                            >
                                Save Changes
                            </Button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Student Name</th>
                                        <th className="px-6 py-3.5 font-semibold">ID Code</th>
                                        <th className="px-6 py-3.5 font-semibold text-center">Attendance Status</th>
                                        <th className="px-6 py-3.5 font-semibold">Recorded Info</th>
                                        <th className="px-6 py-3.5 font-semibold">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {attendanceRecords.map((record) => (
                                        <tr key={record.enrollmentId} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">{record.studentName}</p>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-600">
                                                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                                    {record.studentIdCode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleStatusChange(record.enrollmentId, "PRESENT")}
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
                                                        onClick={() => handleStatusChange(record.enrollmentId, "ABSENT")}
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
                                                        onClick={() => handleStatusChange(record.enrollmentId, "LATE")}
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
                                                        onClick={() => handleStatusChange(record.enrollmentId, "EXCUSED")}
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
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {record.recordedBy ? (
                                                    <div>
                                                        <p className="font-semibold text-gray-700">{record.recordedBy}</p>
                                                        <p className="text-gray-400">{record.recordedAt}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">
                                                        Not Recorded Yet
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="text"
                                                    value={record.remarks}
                                                    onChange={(e) => handleRemarksChange(record.enrollmentId, e.target.value)}
                                                    placeholder="Optional note..."
                                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-md text-xs bg-gray-50 focus:bg-white focus:ring-1 focus:ring-[#006b3f] focus:border-[#006b3f] outline-none transition"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
