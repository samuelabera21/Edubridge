"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import Link from "next/link";
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
    ChevronDown,
    Clock
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
                    sectionId: selectedClass.sectionId || "sec-1",
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
        ? `Mr. ${summary.profile.firstName}` 
        : authData?.user?.name || "Mr. Yohannes";

    const todayClasses = summary?.todayClasses || [
        { id: "c1", period: 1, time: "8:00 - 8:45 AM", class: "Grade 9A", subject: "Mathematics", room: "Room 12", students: 38, status: "Start Class" },
        { id: "c2", period: 2, time: "9:00 - 9:45 AM", class: "Grade 10B", subject: "Mathematics", room: "Room 15", students: 35, status: "Start Class" },
        { id: "c3", period: 3, time: "10:00 - 10:45 AM", class: "Grade 9B", subject: "Mathematics", room: "Room 12", students: 32, status: "Completed" },
        { id: "c4", period: 4, time: "11:00 - 11:45 AM", class: "Grade 11A", subject: "Mathematics", room: "Room 18", students: 23, status: "Start Class" },
    ];

    const todayClassesCount = summary?.todayClassesCount ?? todayClasses.length;
    const totalStudents = summary?.totalStudents ?? 128;
    const attendancePendingCount = summary?.attendancePendingCount ?? 2;
    const pendingAssessmentsCount = summary?.pendingAssessmentsCount ?? 5;
    const pendingSubmissionsCount = summary?.pendingSubmissionsCount ?? 12;
    const studentsNeedAttentionCount = summary?.studentsNeedAttentionCount ?? 7;

    const classPerformance = summary?.classPerformanceOverview || [
        { className: "Grade 9A", averageScore: 78 },
        { className: "Grade 9B", averageScore: 72 },
        { className: "Grade 10B", averageScore: 85 },
        { className: "Grade 11A", averageScore: 90 },
    ];

    const attentionStudents = summary?.studentsRequiringAttention || [
        { id: "st-1", studentName: "Abeba Tesfaye", section: "Grade 9A", type: "Low Performance", detail: "Score: 45%" },
        { id: "st-2", studentName: "Mekonen Alemu", section: "Grade 10B", type: "Frequent Absence", detail: "Attendance: 65%" },
        { id: "st-3", studentName: "Sara Getachew", section: "Grade 9B", type: "Missing Assignments", detail: "Pending: 3" },
        { id: "st-4", studentName: "Dawit Kebede", section: "Grade 11A", type: "Low Performance", detail: "Score: 48%" },
    ];

    const aiInsights = summary?.aiTeachingInsights?.recommendations || [
        "7 students in Grade 9A have shown declining performance in the last 3 assessments.",
        "Grade 10B has an upcoming quiz. Consider reviewing quadratic equations.",
        "82% of your students attended classes last week. Keep it up!",
        "You have 12 pending assignment submissions to review."
    ];

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header Title Bar & Date Badge */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
                        Welcome back, {teacherName}! <span className="inline-block animate-bounce">👋</span>
                    </h1>
                    <p className="text-xs font-medium text-gray-500 mt-1">
                        Here's what's happening in your classes today.
                    </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm flex items-center space-x-3 text-xs">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-800">Tuesday, May 20, 2025</p>
                        <p className="text-[11px] text-gray-500 font-medium">Academic Year: 2024/2025</p>
                    </div>
                </div>
            </div>

            {/* 6 Top Metric Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Metric 1 */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm">
                            <BookOpen className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Today's Classes</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{todayClassesCount}</p>
                    </div>
                    <Link href="/dashboard/teacher/my-classes" className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 mt-3">
                        <span>View timetable</span>
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>

                {/* Metric 2 */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Students</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{totalStudents}</p>
                    </div>
                    <span className="text-[11px] font-medium text-gray-500 mt-3 block">Across 3 classes</span>
                </div>

                {/* Metric 3 */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm">
                            <ClipboardCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Attendance Pending</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{attendancePendingCount}</p>
                    </div>
                    <span className="text-[11px] font-medium text-amber-700 mt-3 block">Classes pending</span>
                </div>

                {/* Metric 4 */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm">
                            <FileText className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pending Assessments</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{pendingAssessmentsCount}</p>
                    </div>
                    <span className="text-[11px] font-medium text-purple-700 mt-3 block">Needs grading</span>
                </div>

                {/* Metric 5 */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
                            <FileCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pending Assignments</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{pendingSubmissionsCount}</p>
                    </div>
                    <span className="text-[11px] font-medium text-rose-700 mt-3 block">Awaiting review</span>
                </div>

                {/* Metric 6 */}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-sm">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Students Need Attention</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{studentsNeedAttentionCount}</p>
                    </div>
                    <Link href="#students-attention" className="text-[11px] font-bold text-cyan-600 hover:text-cyan-800 flex items-center space-x-1 mt-3">
                        <span>View details</span>
                        <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>

            {/* Middle Row Grid: Today's Timetable & AI Teaching Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Card: Today's Timetable (2 Cols) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <h2 className="text-base font-bold text-gray-900">Today's Timetable</h2>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                                        <th className="py-3 px-2">Period</th>
                                        <th className="py-3 px-2">Time</th>
                                        <th className="py-3 px-2">Class</th>
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
                                            <td className="py-3.5 px-2 font-bold text-gray-900">{item.class || item.section}</td>
                                            <td className="py-3.5 px-2 text-gray-600 font-medium">{item.subject}</td>
                                            <td className="py-3.5 px-2 text-gray-500">{item.room}</td>
                                            <td className="py-3.5 px-2 font-semibold text-gray-700">{item.students || item.studentCount}</td>
                                            <td className="py-3.5 px-2 text-right">
                                                {item.status === "Completed" || item.action === "Completed" ? (
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] inline-block">
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={() => setSelectedClass(item)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition-colors shadow-sm"
                                                    >
                                                        Start Class
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4 text-center">
                        <Link href="/dashboard/teacher/my-classes" className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1">
                            <span>View Full Timetable</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {/* Right Card: AI Teaching Insights */}
                <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-purple-50/60 border border-blue-100 rounded-2xl shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <h2 className="text-base font-bold text-gray-900">AI Teaching Insights</h2>
                            </div>
                            <span className="px-2.5 py-0.5 bg-blue-600 text-white rounded-full font-extrabold text-[10px] uppercase tracking-wider">
                                New
                            </span>
                        </div>

                        <p className="text-xs text-gray-600 font-medium mb-4 leading-relaxed">
                            Good morning, {teacherName}! Here are your AI-powered insights for today.
                        </p>

                        <div className="space-y-3">
                            {aiInsights.map((insight: string, idx: number) => (
                                <div key={idx} className="flex items-start space-x-2 text-xs text-gray-700 bg-white/80 backdrop-blur-sm p-2.5 rounded-xl border border-blue-100/60 shadow-2xs">
                                    <span className="text-blue-500 shrink-0 mt-0.5">•</span>
                                    <span className="leading-snug">{insight}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 mt-4 border-t border-blue-100/60 text-center">
                        <button 
                            onClick={() => setShowAiModal(true)}
                            className="w-full py-2.5 bg-white border border-blue-200 text-blue-700 font-bold text-xs rounded-xl shadow-xs hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
                        >
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                            <span>Ask AI Assistant</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Lower Grid Row: Tasks Overview, Class Performance, Students Needing Attention */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Column 1: Tasks Overview */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center space-x-2 mb-4">
                            <ClipboardCheck className="w-5 h-5 text-gray-700" />
                            <h2 className="text-base font-bold text-gray-900">Tasks Overview</h2>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                    <span>Attendance Pending</span>
                                </div>
                                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">2</span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    <span>Pending Assessments</span>
                                </div>
                                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">{pendingAssessmentsCount}</span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                    <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                    <span>Pending Assignments</span>
                                </div>
                                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">{pendingSubmissionsCount}</span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                    <span>Students Need Attention</span>
                                </div>
                                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">{studentsNeedAttentionCount}</span>
                            </div>

                            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center space-x-3 text-xs font-semibold text-gray-700">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span>Upcoming Activities</span>
                                </div>
                                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full font-bold text-xs">4</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4 text-center">
                        <Link href="/dashboard/teacher/activities" className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1">
                            <span>View All Tasks</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {/* Column 2: Class Performance Overview */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <h2 className="text-base font-bold text-gray-900">Class Performance Overview</h2>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg font-medium border border-gray-200 cursor-pointer">
                                <span>This Term</span>
                                <ChevronDown className="w-3 h-3" />
                            </div>
                        </div>

                        {/* Bar Chart Visualization */}
                        <div className="mt-6 space-y-4">
                            <div className="h-44 flex items-end justify-between gap-3 px-2 pb-2 border-b border-gray-200 relative">
                                {/* Grid lines background */}
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
                                            className="w-full bg-blue-600 rounded-t-lg transition-all duration-500 hover:bg-blue-700 shadow-sm"
                                            style={{ height: `${(item.averageScore / 100) * 130}px` }}
                                        ></div>
                                        <span className="text-[10px] font-bold text-gray-600 mt-2 truncate w-full text-center">{item.className}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-center space-x-2 pt-1 text-[11px] text-gray-500">
                                <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs"></span>
                                <span>Average Score</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4 text-center">
                        <Link href="/dashboard/teacher/reports" className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1">
                            <span>View Performance Report</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {/* Column 3: Students Needing Attention */}
                <div id="students-attention" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Users className="w-5 h-5 text-gray-700" />
                                <h2 className="text-base font-bold text-gray-900">Students Needing Attention</h2>
                            </div>
                            <Link href="/dashboard/teacher/students" className="text-xs font-bold text-blue-600 hover:text-blue-800">
                                View All →
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {attentionStudents.map((st: any) => {
                                const isLowPerf = st.type === "Low Performance";
                                return (
                                    <div key={st.id} className="p-3 rounded-xl bg-gray-50/70 hover:bg-gray-50 transition-colors border border-gray-100 flex items-center justify-between">
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
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4 text-center">
                        <Link href="/dashboard/teacher/students" className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1">
                            <span>View All Students</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Bottom Call-To-Action Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center space-x-5 z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
                        <Clock className="w-8 h-8 text-blue-200" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Stay organized and never miss an important task!</h3>
                        <p className="text-xs text-blue-100 mt-1 max-w-xl">
                            Take attendance, record lesson progress, and keep your students on track.
                        </p>
                    </div>
                </div>

                <Link
                    href="/dashboard/teacher/my-classes"
                    className="z-10 bg-white text-blue-700 hover:bg-blue-50 px-6 py-3 rounded-full text-xs font-bold transition-all shadow-md flex items-center space-x-2 shrink-0"
                >
                    <span>Go to My Classes</span>
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>

            {/* Attendance Modal */}
            {selectedClass && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">Take Class Attendance</h3>
                                <p className="text-xs text-gray-500">{selectedClass.subject || "Mathematics"} • {selectedClass.class || selectedClass.section}</p>
                            </div>
                            <button onClick={() => setSelectedClass(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveAttendance} className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                                <p className="font-bold text-gray-700">Quick Section Roster Attendance:</p>
                                <div className="flex items-center justify-between pt-2">
                                    <span className="font-medium text-gray-800">All Students Default</span>
                                    <select 
                                        className="text-xs p-1.5 rounded border border-gray-300 font-bold text-blue-700"
                                        onChange={(e) => {
                                            const status = e.target.value;
                                            const newMap: Record<string, string> = {};
                                            for (let i = 1; i <= (selectedClass.students || 35); i++) {
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
                                className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
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
                                className="w-full py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 shadow-sm"
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
