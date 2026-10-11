"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { 
    Users, 
    MonitorPlay, 
    FileText, 
    FileCheck, 
    AlertCircle, 
    Calendar, 
    Clock, 
    BookOpen, 
    CheckCircle2, 
    ChevronRight, 
    ArrowUpRight,
    Sparkles, 
    Send, 
    X,
    Inbox,
    GraduationCap,
    HelpCircle,
    MessageSquareQuote
} from "lucide-react";

export default function TeacherDashboard() {
    const { authData } = useAuth();
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiCategory, setAiCategory] = useState("LESSON_PLANNING");
    const [aiResult, setAiResult] = useState<any>(null);
    const [loadingAi, setLoadingAi] = useState(false);

    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
    const [submittingAttendance, setSubmittingAttendance] = useState(false);

    useEffect(() => {
        loadSummary();
    }, []);

    async function loadSummary() {
        try {
            setLoading(true);
            const res = await fetchApi("/teacher/dashboard-summary");
            if (res.ok) {
                const data = await res.json();
                setSummary(data);
            }
        } catch (err) {
            console.error("Failed to load teacher dashboard summary:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAskAi(e: React.FormEvent) {
        e.preventDefault();
        if (!aiPrompt) return;
        try {
            setLoadingAi(true);
            const res = await fetchApi("/teacher/ai-assistant", {
                method: "POST",
                body: JSON.stringify({ prompt: aiPrompt, category: aiCategory })
            });
            if (res.ok) {
                const data = await res.json();
                setAiResult(data);
            }
        } catch (err) {
            console.error("Failed to fetch AI response:", err);
        } finally {
            setLoadingAi(false);
        }
    }

    async function handleSaveAttendance(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedClass) return;
        try {
            setSubmittingAttendance(true);
            const attendances = Object.entries(attendanceMap).map(([enrollmentId, status]) => ({
                enrollmentId,
                status
            }));

            const res = await fetchApi("/teacher/attendance/batch", {
                method: "POST",
                body: JSON.stringify({
                    academicYearId: selectedClass.teachingAssignmentId || "active-year",
                    sectionId: selectedClass.sectionId,
                    classPeriodId: selectedClass.classPeriodId,
                    date: new Date().toISOString().split('T')[0],
                    attendances
                })
            });

            if (res.ok) {
                setSelectedClass(null);
                setAttendanceMap({});
                loadSummary();
            }
        } catch (err) {
            console.error("Failed to save batch attendance:", err);
        } finally {
            setSubmittingAttendance(false);
        }
    }

    const teacherName = summary?.profile?.firstName 
        ? `Mr. ${summary.profile.firstName} ${summary.profile.lastName || ''}`.trim() 
        : authData?.user?.name || "Mr. Teacher";

    const todayClasses = summary?.todayClasses || [];
    const totalStudents = summary?.totalStudents ?? 0;
    const attendancePendingCount = summary?.attendancePendingCount ?? 0;
    const pendingAssessmentsCount = summary?.pendingAssessmentsCount ?? 0;
    const pendingSubmissionsCount = summary?.pendingSubmissionsCount ?? 0;
    const studentsNeedAttentionCount = summary?.studentsNeedAttentionCount ?? 0;
    const attentionStudents = summary?.studentsRequiringAttention || [];

    // Demographic and subject breakdown from real database
    const studentsByGrade = summary?.studentsByGrade || [];
    const genderDist = summary?.genderDistribution || { male: 0, female: 0, malePercentage: 0, femalePercentage: 0 };
    const assessmentsBySubject = summary?.assessmentsBySubject || [];
    const assignmentsBySubject = summary?.assignmentsBySubject || [];

    // Attendance stats
    const completedClassesToday = todayClasses.filter((c: any) => c.status === "Completed" || c.action === "Completed").length;
    const upcomingClassesToday = todayClasses.length - completedClassesToday;

    const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[600px] flex flex-col justify-center items-center">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-[#1F5380]/20 border-t-[#1F5380] animate-spin"></div>
                </div>
                <p className="text-sm font-bold text-gray-800 mt-4">Loading Teacher Dashboard...</p>
                <p className="text-xs text-gray-400 mt-1">Fetching live classes, roster statistics & assessments</p>
            </div>
        );
    }

    // Gradient blue shades for student donut chart
    const gradeColors = ["#1F5380", "#2c6ea6", "#4589c3", "#6ea5d8", "#9bc1eb", "#c5dcf4"];

    return (
        <div className="w-full max-w-[1400px] mx-auto space-y-5 text-gray-800 font-sans pb-12">
            
            {/* Top Bar: Greeting & Academic Term Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                        Good morning, {teacherName}
                    </h1>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Here's what's happening in your classes today.
                    </p>
                </div>

                <div className="flex items-center space-x-3 self-start sm:self-auto">
                    {/* AI Assistant Quick Trigger */}
                    <button
                        onClick={() => setShowAiModal(true)}
                        className="px-3.5 py-1.5 bg-[#1F5380] hover:bg-[#18446b] text-white rounded-xl transition-all cursor-pointer shadow-xs flex items-center space-x-1.5 text-xs font-bold"
                        title="AI Lesson Assistant"
                    >
                        <Sparkles className="w-4 h-4 text-white" />
                        <span>AI Assistant</span>
                    </button>
                </div>
            </div>

            {/* Top 3 KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* 1. Total Students */}
                <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Students</span>
                        <p className="text-3xl font-black text-gray-900">{totalStudents}</p>
                        <p className="text-[11px] font-bold text-[#1F5380] flex items-center gap-0.5">
                            <span>Active in your sections</span>
                        </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-[#1F5380]/10 text-[#1F5380] flex items-center justify-center shadow-xs">
                        <Users className="w-7 h-7" />
                    </div>
                </div>

                {/* 2. Today's Classes */}
                <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Classes</span>
                        <p className="text-3xl font-black text-gray-900">{todayClasses.length}</p>
                        <p className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#1F5380]"></span>
                            <span>{completedClassesToday} completed • {upcomingClassesToday} upcoming</span>
                        </p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-[#1F5380]/10 text-[#1F5380] flex items-center justify-center shadow-xs">
                        <MonitorPlay className="w-7 h-7" />
                    </div>
                </div>

                {/* 3. Students Needing Attention */}
                <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs flex items-center justify-between transition-all hover:shadow-xs">
                    <div className="space-y-1">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Needs Attention</span>
                        <p className="text-3xl font-black text-gray-900">{studentsNeedAttentionCount}</p>
                        <a href="#students-attention" className="text-[11px] font-bold text-[#1F5380] hover:underline flex items-center gap-0.5">
                            <span>View intervention details</span>
                            <span>→</span>
                        </a>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-[#1F5380]/10 text-[#1F5380] flex items-center justify-center shadow-xs">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                </div>

            </div>

            {/* Today's Timetable */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center space-x-2.5">
                        <Clock className="w-5 h-5 text-[#1F5380]" />
                        <div>
                            <h3 className="font-extrabold text-sm text-gray-900">Today's Timetable</h3>
                            <p className="text-[11px] text-gray-400 font-medium">{formattedDate}</p>
                        </div>
                    </div>
                    <Link href="/dashboard/teacher/my-classes" className="text-xs font-bold text-[#1F5380] hover:text-[#18446b] flex items-center gap-1 transition-colors">
                        <span>View all classes</span>
                        <span>→</span>
                    </Link>
                </div>

                {todayClasses.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 space-y-2">
                        <Clock className="w-8 h-8 mx-auto text-gray-300" />
                        <p className="text-xs font-bold text-gray-600">No scheduled periods today</p>
                        <p className="text-[11px] text-gray-400">Classes assigned to your timetable will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 pt-2">
                        {todayClasses.map((cls: any, idx: number) => {
                            const isDone = cls.status === "Completed" || cls.action === "Completed";
                            const isFirst = idx === 0 && !isDone;

                            return (
                                <div key={cls.id || idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 px-3 rounded-xl transition-colors">
                                    <div className="flex items-center space-x-3.5">
                                        <div className="w-10 h-10 rounded-xl bg-[#1F5380]/10 text-[#1F5380] flex items-center justify-center shrink-0 font-bold">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="font-extrabold text-sm text-gray-900">
                                                    {cls.section || cls.class}
                                                </span>
                                                <span className="text-gray-300">•</span>
                                                <span className="text-xs font-semibold text-gray-700">{cls.subject}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-[11px] text-gray-400 mt-0.5">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-[#1F5380]" />
                                                    {cls.time}
                                                </span>
                                                <span>•</span>
                                                <span>{cls.room || "Room 101"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                            isDone 
                                                ? "bg-slate-100 text-slate-700" 
                                                : isFirst 
                                                    ? "bg-[#1F5380]/10 text-[#1F5380]" 
                                                    : "bg-gray-100 text-gray-600"
                                        }`}>
                                            {isDone ? "Completed" : isFirst ? "In Progress" : "Upcoming"}
                                        </span>
                                        <button
                                            onClick={() => setSelectedClass(cls)}
                                            className="px-3 py-1.5 bg-[#1F5380] hover:bg-[#18446b] text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer"
                                        >
                                            {isDone ? "Review" : "Take Attendance"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom Row: 2-Column Operations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* 1. Attendance Tasks */}
                <div className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                                <CheckCircle2 className="w-4 h-4 text-[#1F5380]" />
                                <h3 className="font-extrabold text-sm text-gray-900">Attendance Tasks</h3>
                            </div>
                            <Link href="/dashboard/teacher/attendance" className="text-xs font-bold text-[#1F5380] hover:text-[#18446b] flex items-center gap-0.5">
                                <span>View all</span>
                                <span>→</span>
                            </Link>
                        </div>

                        {/* Circular Progress & Completed Count */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                                {(() => {
                                    const totalToday = todayClasses.length || 1;
                                    const pct = Math.round((completedClassesToday / totalToday) * 100);
                                    return (
                                        <>
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                                <circle cx="18" cy="18" r="14" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />
                                                <circle
                                                    cx="18"
                                                    cy="18"
                                                    r="14"
                                                    fill="none"
                                                    stroke="#1F5380"
                                                    strokeWidth="3.5"
                                                    strokeDasharray={`${pct} ${100 - pct}`}
                                                />
                                            </svg>
                                            <div className="absolute text-center">
                                                <span className="text-xs font-black text-gray-900">{pct}%</span>
                                                <p className="text-[9px] text-gray-400 font-medium">Logged</p>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center space-x-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#1F5380]"></span>
                                    <span className="text-gray-600">Completed:</span>
                                    <span className="font-extrabold text-gray-900">{completedClassesToday}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                                    <span className="text-gray-600">Pending:</span>
                                    <span className="font-extrabold text-gray-900">{attendancePendingCount}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#1F5380]/40"></span>
                                    <span className="text-gray-600">Total:</span>
                                    <span className="font-extrabold text-gray-900">{todayClasses.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Horizontal Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mt-3">
                            <div 
                                className="bg-[#1F5380] h-full rounded-full transition-all" 
                                style={{ width: `${Math.round((completedClassesToday / (todayClasses.length || 1)) * 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center space-x-2 text-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-[#1F5380] shrink-0" />
                        <span className="text-[11px] font-medium leading-tight">
                            {attendancePendingCount === 0 ? "All attendance tasks for today are logged." : `${attendancePendingCount} period(s) pending attendance log.`}
                        </span>
                    </div>
                </div>


                {/* 4. Students Requiring Attention */}
                <div id="students-attention" className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4 text-[#1F5380]" />
                                <h3 className="font-extrabold text-sm text-gray-900">Students Requiring Attention</h3>
                            </div>
                            <Link href="/dashboard/teacher/students" className="text-xs font-bold text-[#1F5380] hover:text-[#18446b] flex items-center gap-0.5">
                                <span>View all</span>
                                <span>→</span>
                            </Link>
                        </div>

                        {/* Alert Pill Banner */}
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-2.5 text-slate-800">
                            <AlertCircle className="w-5 h-5 text-[#1F5380] shrink-0" />
                            <div className="text-[11px] leading-tight">
                                <p className="font-extrabold text-gray-900">{attentionStudents.length} student{attentionStudents.length === 1 ? '' : 's'} need your attention</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Click on a student to view details.</p>
                            </div>
                        </div>

                        {/* Attention List from Real Database */}
                        {attentionStudents.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 space-y-1">
                                <CheckCircle2 className="w-7 h-7 mx-auto text-[#1F5380]" />
                                <p className="text-xs font-bold text-gray-700">All Students On Track</p>
                                <p className="text-[11px] text-gray-400">No active intervention flags found.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                                {attentionStudents.map((st: any, i: number) => {
                                    return (
                                        <Link 
                                            key={st.id || i} 
                                            href={`/dashboard/teacher/students?studentId=${st.id}`}
                                            className="flex items-center justify-between text-xs py-1.5 px-1 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-none"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <span className="w-2 h-2 rounded-full bg-[#1F5380] shrink-0"></span>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-[11px] leading-tight">{st.studentName}</p>
                                                    <span className="text-[10px] text-gray-400 font-medium">{st.section}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md border bg-slate-50 text-slate-700 border-slate-200">
                                                {st.type || "Support Flag"}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="pt-3 border-t border-gray-100">
                        <Link 
                            href="/dashboard/teacher/support"
                            className="w-full py-2 bg-[#1F5380] hover:bg-[#18446b] text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 shadow-2xs"
                        >
                            <span>Open Support Flags</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

            </div>

            {/* Inspirational Quote Footer Banner */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 border-t border-gray-100 gap-2">
                <p className="italic">
                    "Education is the most powerful weapon which you can use to change the world." — Nelson Mandela
                </p>
                <div className="flex items-center space-x-4">
                    <span className="hover:text-gray-600 cursor-pointer">Help</span>
                    <span>•</span>
                    <span className="hover:text-gray-600 cursor-pointer">Feedback</span>
                    <span>•</span>
                    <span className="font-semibold text-gray-500">EduBridge v1.0</span>
                </div>
            </div>

            {/* Attendance Modal */}
            {selectedClass && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Take Class Attendance</h3>
                                <p className="text-xs text-gray-500">{selectedClass.subject} • {selectedClass.section || selectedClass.class}</p>
                            </div>
                            <button onClick={() => setSelectedClass(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAttendance} className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                                <p className="font-bold text-gray-700">Quick Roster Attendance:</p>
                                <div className="flex items-center justify-between pt-2">
                                    <span className="font-medium text-gray-800">All Students Default</span>
                                    <select 
                                        className="text-xs p-1.5 rounded border border-gray-300 font-bold text-blue-700"
                                        onChange={(e) => {
                                            const status = e.target.value;
                                            const newMap: Record<string, string> = {};
                                            for (let i = 1; i <= (selectedClass.studentCount || 30); i++) {
                                                newMap[`st-${i}`] = status;
                                            }
                                            setAttendanceMap(newMap);
                                        }}
                                    >
                                        <option value="PRESENT">Mark All PRESENT</option>
                                        <option value="ABSENT">Mark All ABSENT</option>
                                        <option value="LATE">Mark All LATE</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submittingAttendance}
                                className="w-full py-2.5 bg-[#1F5380] text-white text-xs font-bold rounded-xl hover:bg-[#18446b] transition-colors shadow-xs cursor-pointer"
                            >
                                {submittingAttendance ? "Saving Attendance..." : "Save Class Attendance"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Assistant Modal */}
            {showAiModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-gray-900 flex items-center space-x-2">
                                <Sparkles className="w-5 h-5 text-[#1F5380]" />
                                <span>AI Teacher Assistant</span>
                            </h3>
                            <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAskAi} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                                <select
                                    value={aiCategory}
                                    onChange={(e) => setAiCategory(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200"
                                >
                                    <option value="LESSON_PLANNING">Lesson Planning Assistance</option>
                                    <option value="QUESTION_GENERATION">Generate Practice Questions</option>
                                    <option value="PERFORMANCE_INSIGHT">Learning Gap Explanation</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Topic or Concept Prompt</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Quadratic Equations or Photosynthesis..."
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loadingAi}
                                className="w-full py-2.5 bg-[#1F5380] text-white text-xs font-bold rounded-xl hover:bg-[#18446b] transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                            >
                                {loadingAi ? <span>Generating AI Insight...</span> : <><Send className="w-4 h-4" /><span>Generate Insight</span></>}
                            </button>
                        </form>

                        {aiResult && (
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-2 text-xs text-blue-950">
                                <p className="font-bold">AI Advisory Recommendation:</p>
                                <p className="whitespace-pre-line">{aiResult.recommendation}</p>
                                <p className="text-[10px] text-blue-700 italic pt-1">{aiResult.disclaimer}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
