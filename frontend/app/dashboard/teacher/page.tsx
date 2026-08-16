"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import Link from "next/link";
import { 
    BookOpen, 
    Users, 
    ClipboardList, 
    Clock, 
    AlertTriangle, 
    Sparkles, 
    CheckCircle2, 
    ArrowRight,
    PlusCircle,
    MessageSquare,
    Send,
    X,
    FileText
} from "lucide-react";

export default function TeacherDashboard() {
    const { authData } = useAuth();
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"schedule" | "students" | "issues">("schedule");

    // Modal States
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [issueTitle, setIssueTitle] = useState("");
    const [issueDesc, setIssueDesc] = useState("");
    const [issuePriority, setIssuePriority] = useState("MEDIUM");
    const [submittingIssue, setSubmittingIssue] = useState(false);

    // AI Modal State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiCategory, setAiCategory] = useState("LESSON_PLANNING");
    const [aiResult, setAiResult] = useState<any>(null);
    const [loadingAi, setLoadingAi] = useState(false);

    // Attendance Modal State
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

    async function handleReportIssue(e: React.FormEvent) {
        e.preventDefault();
        if (!issueTitle) return;
        try {
            setSubmittingIssue(true);
            const res = await fetchApi("/teacher/issues", {
                method: "POST",
                body: JSON.stringify({
                    title: issueTitle,
                    description: issueDesc,
                    priority: issuePriority
                })
            });
            if (res.ok) {
                setIssueTitle("");
                setIssueDesc("");
                setShowIssueModal(false);
                loadSummary();
            }
        } catch (err) {
            console.error("Failed to report issue:", err);
        } finally {
            setSubmittingIssue(false);
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
                    academicYearId: selectedClass.teachingAssignmentId,
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
            <div className="w-full max-w-6xl mx-auto p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                Loading your personalized Teacher Dashboard...
            </div>
        );
    }

    const todayClasses = summary?.todayClasses || [];
    const totalStudents = summary?.totalStudents || 0;
    const pendingAssessments = summary?.pendingAssessmentsCount || 0;
    const pendingSubmissions = summary?.pendingSubmissionsCount || 0;
    const requiringAttention = summary?.studentsRequiringAttention || [];
    const aiInsights = summary?.aiTeachingInsights;
    const teacherProfile = summary?.profile;
    const nextClass = todayClasses.length > 0 ? todayClasses[0] : null;

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Welcome & AI Teaching Insights Banner */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 text-xs font-semibold tracking-wide">
                            <Sparkles className="w-4 h-4 text-emerald-200" />
                            <span>AI TEACHING ASSISTANT INSIGHTS</span>
                        </div>
                        <button
                            onClick={() => setShowAiModal(true)}
                            className="flex items-center space-x-2 bg-white text-emerald-800 hover:bg-emerald-50 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                        >
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            <span>Open AI Assistant</span>
                        </button>
                    </div>

                    <h1 className="text-3xl font-bold">
                        Welcome back, {teacherProfile?.firstName || authData?.user?.name?.split(' ')[0] || 'Teacher'}! 👋
                    </h1>
                    <p className="text-emerald-100 text-base max-w-2xl leading-relaxed">
                        {aiInsights?.summary || "Here is your teaching schedule, student roster overview, and pending tasks for today."}
                    </p>
                </div>
                <BookOpen className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
            </div>

            {/* Metric Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Assignments</p>
                        <p className="text-2xl font-bold text-gray-900">{teacherProfile?.assignments?.length || 0}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Students</p>
                        <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Grading</p>
                        <p className="text-2xl font-bold text-gray-900">{pendingAssessments + pendingSubmissions}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Next Period</p>
                        <p className="text-lg font-bold text-gray-900 truncate max-w-[140px]">
                            {nextClass ? nextClass.time.split('-')[0].trim() : "None Today"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Action Navigation Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setActiveTab("schedule")}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                            activeTab === "schedule" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        Today's Schedule ({todayClasses.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("students")}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                            activeTab === "students" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                        Assigned Students ({totalStudents})
                    </button>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowIssueModal(true)}
                        className="px-3.5 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 font-semibold text-xs rounded-lg transition-colors border border-amber-200 flex items-center space-x-1.5"
                    >
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Report Facility Issue</span>
                    </button>
                    <Link
                        href="/dashboard/teacher/assessment"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1.5"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>New Assessment</span>
                    </Link>
                </div>
            </div>

            {/* Main Section Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Main View */}
                <div className="lg:col-span-2 space-y-6">
                    {activeTab === "schedule" && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h3 className="font-bold text-gray-900">Today's Class Schedule</h3>
                                    <p className="text-xs text-gray-500">Scheduled class periods for today.</p>
                                </div>
                            </div>
                            <div className="p-6">
                                {todayClasses.length > 0 ? (
                                    <div className="space-y-4">
                                        {todayClasses.map((cls: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100">
                                                <div className="flex items-center space-x-4">
                                                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-100">
                                                        {cls.time}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{cls.subject}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">{cls.section} • {cls.room} • {cls.studentCount} Students</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedClass(cls);
                                                            setAttendanceMap({});
                                                        }}
                                                        className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 border border-emerald-200"
                                                    >
                                                        Take Attendance
                                                    </button>
                                                    <Link
                                                        href="/dashboard/teacher/assessment"
                                                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                                    >
                                                        Marks
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-400 space-y-2">
                                        <Clock className="w-10 h-10 text-gray-300 mx-auto" />
                                        <p className="text-sm font-medium">No live classes scheduled for today.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "students" && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                            <h3 className="font-bold text-gray-900">Assigned Sections & Roster Overview</h3>
                            <div className="space-y-3">
                                {teacherProfile?.assignments?.map((a: any) => (
                                    <div key={a.id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-gray-900">{a.subject?.name}</p>
                                            <p className="text-xs text-gray-500">Grade {a.schoolGrade?.grade?.level} {a.section?.name}</p>
                                        </div>
                                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">
                                            {a.section?.studentEnrollments?.length || 0} Students
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Priorities & Action Checklist */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6 space-y-4">
                        <h3 className="font-bold text-gray-900 flex items-center space-x-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span>Recommended Priorities for Today</span>
                        </h3>
                        <ul className="space-y-2.5">
                            {aiInsights?.priorities?.map((priority: string, idx: number) => (
                                <li key={idx} className="flex items-start space-x-3 text-sm text-gray-700 bg-gray-50/80 p-3 rounded-lg border border-gray-100">
                                    <span className="w-5 h-5 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                        {idx + 1}
                                    </span>
                                    <span>{priority}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Column: Students Requiring Attention */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center space-x-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span>Students Requiring Attention</span>
                            </h3>
                            <span className="text-xs font-bold px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                                {requiringAttention.length}
                            </span>
                        </div>
                        <div className="p-6">
                            {requiringAttention.length > 0 ? (
                                <div className="space-y-3">
                                    {requiringAttention.map((st: any) => (
                                        <div key={st.id} className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/60 space-y-1">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-gray-900 text-sm">{st.studentName}</p>
                                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                                                    {st.type}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600">{st.section}</p>
                                            <p className="text-xs text-amber-800 font-medium pt-1">{st.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 text-center py-6">
                                    No active support flags or high-risk student warnings flagged today.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Assistant Modal */}
            {showAiModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-gray-900 flex items-center space-x-2">
                                <Sparkles className="w-5 h-5 text-emerald-600" />
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
                                className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center space-x-2"
                            >
                                {loadingAi ? <span>Generating AI Insight...</span> : <><Send className="w-4 h-4" /><span>Generate Insight</span></>}
                            </button>
                        </form>

                        {aiResult && (
                            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-2 text-xs text-emerald-900">
                                <p className="font-bold">AI Advisory Recommendation:</p>
                                <p className="whitespace-pre-line">{aiResult.recommendation}</p>
                                <p className="text-[10px] text-emerald-700 italic pt-1">{aiResult.disclaimer}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Report Facility Issue Modal */}
            {showIssueModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-gray-900 flex items-center space-x-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                <span>Report Facility / Classroom Issue</span>
                            </h3>
                            <button onClick={() => setShowIssueModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleReportIssue} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Issue Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Broken Projector in Room 101"
                                    value={issueTitle}
                                    onChange={(e) => setIssueTitle(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                                <textarea
                                    placeholder="Provide details about the obstacle or facility issue..."
                                    value={issueDesc}
                                    onChange={(e) => setIssueDesc(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200 h-24"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
                                <select
                                    value={issuePriority}
                                    onChange={(e) => setIssuePriority(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-lg border border-gray-200"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={submittingIssue}
                                className="w-full py-2.5 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-colors"
                            >
                                {submittingIssue ? "Submitting Issue..." : "Submit Report"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
