"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { 
    BookOpen, 
    Users, 
    ClipboardCheck, 
    FileText, 
    FileCheck,
    AlertCircle,
    Calendar, 
    Sparkles, 
    ArrowRight,
    MessageSquare,
    Send,
    X,
    TrendingUp,
    Clock,
    CheckCircle2,
    Inbox,
    Plus
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

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[600px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading your Teacher Command Center...</p>
            </div>
        );
    }

    const teacherName = summary?.profile?.firstName 
        ? `Mr. ${summary.profile.firstName} ${summary.profile.lastName || ''}` 
        : authData?.user?.name || "Teacher";

    const todayClasses = summary?.todayClasses || [];
    const todayClassesCount = summary?.todayClassesCount ?? todayClasses.length;
    const totalStudents = summary?.totalStudents ?? 0;
    const attendancePendingCount = summary?.attendancePendingCount ?? 0;
    const pendingAssessmentsCount = summary?.pendingAssessmentsCount ?? 0;
    const pendingSubmissionsCount = summary?.pendingSubmissionsCount ?? 0;
    const studentsNeedAttentionCount = summary?.studentsNeedAttentionCount ?? 0;
    const upcomingActivitiesCount = summary?.upcomingActivitiesCount ?? 0;

    const classPerformance = summary?.classPerformanceOverview || [];
    const attentionStudents = summary?.studentsRequiringAttention || [];
    const aiInsights = summary?.aiTeachingInsights?.recommendations || [];

    const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Top Right Corner Date & Active Term Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
                        Welcome back, {teacherName}!
                    </h1>
                    <p className="text-xs font-medium text-gray-500 mt-1">
                        Teacher Operational Command Center • Assigned Classes & Live Analytics
                    </p>
                </div>

                {/* Top Right Corner Date & Active Term Card */}
                <div className="flex items-center space-x-3 self-end sm:self-auto">
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-2xs flex items-center space-x-3 text-xs">
                        <div className="p-2 bg-blue-50 text-[#4085b3] rounded-lg">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-gray-900 leading-tight">{formattedDate}</p>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Active Term</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Action Bar */}
            <div className="flex flex-wrap items-center gap-3">
                <Link
                    href="/dashboard/teacher/attendance"
                    className="px-3.5 py-2 bg-[#4085b3] hover:bg-[#356e94] text-white font-medium rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-2xs"
                >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Take Attendance</span>
                </Link>

                <Link
                    href="/dashboard/teacher/assessment"
                    className="px-3.5 py-2 bg-[#4a6b82] hover:bg-[#3d596d] text-white font-medium rounded-xl text-xs flex items-center space-x-1.5 transition-colors shadow-2xs"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Assessment</span>
                </Link>
            </div>

            {/* Teacher Sector in Numbers — Styled identically to Admin Dashboard */}
            <Card>
                <CardHeader className="text-center pb-0 border-none">
                    <CardTitle className="text-gray-600 font-medium">The Sector in Numbers</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        
                        {/* Today's Classes */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#f59e0b] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <BookOpen className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">{todayClassesCount}</p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">Today's Classes</p>
                            </div>
                        </div>

                        {/* Enrolled Students */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#10b981] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <Users className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">{totalStudents}</p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">Enrolled Students</p>
                            </div>
                        </div>

                        {/* Pending Attendance */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#ef4444] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <ClipboardCheck className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">{attendancePendingCount}</p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">Pending Attendance</p>
                            </div>
                        </div>

                        {/* Active Assessments */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#8b5cf6] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <FileText className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">{pendingAssessmentsCount}</p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">Active Assessments</p>
                            </div>
                        </div>

                        {/* Pending Submissions */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#3b82f6] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <FileCheck className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">{pendingSubmissionsCount}</p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">Pending Submissions</p>
                            </div>
                        </div>

                        {/* Students Need Attention */}
                        <div className="bg-white border border-gray-100 rounded-[10px] shadow-sm flex items-center p-4 transition-all hover:shadow-md">
                            <div className="bg-[#06b6d4] w-14 h-14 rounded-[12px] flex items-center justify-center shrink-0">
                                <AlertCircle className="text-white h-7 w-7" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-xl font-bold text-gray-900 leading-none">{studentsNeedAttentionCount}</p>
                                <p className="text-xs text-gray-500 mt-1.5 font-medium">Need Attention</p>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* Middle Row Grid: Today's Timetable */}
            <div>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <span>Today's Timetable</span>
                        </CardTitle>
                        <span className="text-xs font-semibold text-gray-500">
                            {todayClasses.length} Scheduled Period(s)
                        </span>
                    </CardHeader>

                    <CardContent>
                        {todayClasses.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 space-y-2">
                                <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                                <p className="text-sm font-semibold text-gray-600">No classes scheduled for today</p>
                                <p className="text-xs text-gray-400">Timetable slots assigned by school administrators will appear here automatically.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                                            <th className="py-3 px-2">Period</th>
                                            <th className="py-3 px-2">Time</th>
                                            <th className="py-3 px-2">Class / Section</th>
                                            <th className="py-3 px-2">Subject</th>
                                            <th className="py-3 px-2">Room</th>
                                            <th className="py-3 px-2">Students</th>
                                            <th className="py-3 px-2 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {todayClasses.map((item: any, idx: number) => (
                                            <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="py-3.5 px-2 font-bold text-gray-700">{item.period || idx + 1}</td>
                                                <td className="py-3.5 px-2 font-medium text-gray-600 whitespace-nowrap">{item.time}</td>
                                                <td className="py-3.5 px-2 font-bold text-gray-900">{item.section || item.class}</td>
                                                <td className="py-3.5 px-2 text-gray-600 font-medium">{item.subject}</td>
                                                <td className="py-3.5 px-2 text-gray-500">{item.room || "Room Assigned"}</td>
                                                <td className="py-3.5 px-2 font-semibold text-gray-700">{item.studentCount ?? item.students ?? 0}</td>
                                                <td className="py-3.5 px-2 text-right">
                                                    {item.status === "Completed" || item.action === "Completed" ? (
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] inline-flex items-center space-x-1">
                                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                                            Completed
                                                        </span>
                                                    ) : (
                                                        <button 
                                                            onClick={() => setSelectedClass(item)}
                                                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition-colors shadow-xs"
                                                        >
                                                            Take Attendance
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Lower Grid Row: Tasks Overview, Class Performance, Students Needing Attention */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: Tasks Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <ClipboardCheck className="w-5 h-5 text-gray-700" />
                            <span>Tasks Overview</span>
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                            <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                <span>Attendance Pending</span>
                            </div>
                            <span className="px-2.5 py-0.5 bg-white text-gray-800 rounded-full font-bold text-xs shadow-2xs border border-gray-200">{attendancePendingCount}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                            <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                                <span>Pending Assessments</span>
                            </div>
                            <span className="px-2.5 py-0.5 bg-white text-gray-800 rounded-full font-bold text-xs shadow-2xs border border-gray-200">{pendingAssessmentsCount}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                            <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                <span>Pending Submissions</span>
                            </div>
                            <span className="px-2.5 py-0.5 bg-white text-gray-800 rounded-full font-bold text-xs shadow-2xs border border-gray-200">{pendingSubmissionsCount}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                            <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div>
                                <span>Students Need Attention</span>
                            </div>
                            <span className="px-2.5 py-0.5 bg-white text-gray-800 rounded-full font-bold text-xs shadow-2xs border border-gray-200">{studentsNeedAttentionCount}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                            <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                <span>Upcoming Activities</span>
                            </div>
                            <span className="px-2.5 py-0.5 bg-white text-gray-800 rounded-full font-bold text-xs shadow-2xs border border-gray-200">{upcomingActivitiesCount}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Column 2: Class Performance Overview */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            <span>Class Performance Overview</span>
                        </CardTitle>
                        <span className="text-[11px] font-medium text-gray-500">Score Averages</span>
                    </CardHeader>

                    <CardContent>
                        {classPerformance.length === 0 ? (
                            <div className="py-10 text-center text-gray-400 space-y-2">
                                <TrendingUp className="w-8 h-8 mx-auto text-gray-300" />
                                <p className="text-xs font-semibold text-gray-600">No performance records</p>
                                <p className="text-[11px] text-gray-400">Class score averages will calculate automatically once assessments are recorded.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="h-44 flex items-end justify-between gap-3 px-2 pb-2 border-b border-gray-200 relative">
                                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[9px] text-gray-300">
                                        <div className="border-b border-gray-100 w-full flex justify-between"><span className="-mt-2">100%</span></div>
                                        <div className="border-b border-gray-100 w-full flex justify-between"><span className="-mt-2">75%</span></div>
                                        <div className="border-b border-gray-100 w-full flex justify-between"><span className="-mt-2">50%</span></div>
                                        <div className="border-b border-gray-100 w-full flex justify-between"><span className="-mt-2">25%</span></div>
                                        <div className="w-full flex justify-between"><span className="-mt-2">0%</span></div>
                                    </div>

                                    {classPerformance.map((item: any, i: number) => (
                                        <div key={i} className="flex-1 flex flex-col items-center z-10">
                                            <span className="text-[10px] font-extrabold text-blue-600 mb-1">{item.averageScore}%</span>
                                            <div 
                                                className="w-full bg-blue-600 rounded-t-lg transition-all duration-500 hover:bg-blue-700 shadow-xs"
                                                style={{ height: `${Math.max(10, (item.averageScore / 100) * 130)}px` }}
                                            ></div>
                                            <span className="text-[10px] font-bold text-gray-600 mt-2 truncate w-full text-center">{item.className}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-center space-x-2 pt-1 text-[11px] text-gray-500">
                                    <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs"></span>
                                    <span>Average Score per Section</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Column 3: Students Needing Attention */}
                <div id="students-attention">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                                <Users className="w-5 h-5 text-gray-700" />
                                <span>Students Needing Attention</span>
                            </CardTitle>
                            <span className="text-xs font-bold text-blue-600">
                                {attentionStudents.length} Active
                            </span>
                        </CardHeader>

                        <CardContent>
                            {attentionStudents.length === 0 ? (
                                <div className="py-10 text-center text-gray-400 space-y-2">
                                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                                    <p className="text-xs font-semibold text-gray-700">No support flags active</p>
                                    <p className="text-[11px] text-gray-400">All students in your assigned sections are performing well without active intervention flags.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {attentionStudents.map((st: any) => {
                                        const isLowPerf = st.type === "Low Performance";
                                        return (
                                            <div key={st.id} className="p-3 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors border border-gray-100 flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                                                        {st.studentName.split(' ').map((n: string) => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-xs text-gray-900">{st.studentName}</p>
                                                        <p className="text-[10px] text-gray-500">{st.section}</p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center ${
                                                        isLowPerf ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isLowPerf ? "bg-rose-500" : "bg-amber-500"}`}></span>
                                                        {st.type}
                                                    </span>
                                                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{st.detail}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>


            {/* Attendance Modal */}
            {selectedClass && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Take Class Attendance</h3>
                                <p className="text-xs text-gray-500">{selectedClass.subject || "Subject"} • {selectedClass.section || selectedClass.class}</p>
                            </div>
                            <button onClick={() => setSelectedClass(null)} className="text-gray-400 hover:text-gray-600">
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
                                className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
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
                                <Sparkles className="w-5 h-5 text-blue-600" />
                                <span>AI Teacher Assistant</span>
                            </h3>
                            <button onClick={() => setShowAiModal(false)} className="text-gray-400 hover:text-gray-600">
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
                                className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 shadow-xs"
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
