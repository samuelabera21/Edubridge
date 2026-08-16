"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import Link from "next/link";
import { BookOpen, Users, ClipboardList, Clock, AlertTriangle, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export default function TeacherDashboard() {
    const { authData } = useAuth();
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSummary() {
            try {
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
        
        loadSummary();
    }, []);

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
                <div className="relative z-10 space-y-3">
                    <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-white/20 text-xs font-semibold tracking-wide">
                        <Sparkles className="w-4 h-4 text-emerald-200" />
                        <span>AI TEACHING ASSISTANT INSIGHTS</span>
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

            {/* Overview Metric Cards */}
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
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Next Class</p>
                        <p className="text-lg font-bold text-gray-900 truncate max-w-[140px]">
                            {nextClass ? nextClass.time.split('-')[0].trim() : "None Today"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Schedule Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900">Today's Teaching Schedule</h3>
                                <p className="text-xs text-gray-500">Live timetable periods assigned to your teaching load today.</p>
                            </div>
                            <Link href="/dashboard/teacher/assessment" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center">
                                <span>Assessments</span>
                                <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </Link>
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
                                            <Link
                                                href={`/dashboard/teacher/assessment`}
                                                className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                                            >
                                                Record Marks
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400 space-y-2">
                                    <Clock className="w-10 h-10 text-gray-300 mx-auto" />
                                    <p className="text-sm font-medium">No live classes scheduled for today.</p>
                                    <p className="text-xs text-gray-400">Enjoy your planning period or review pending student submissions.</p>
                                </div>
                            )}
                        </div>
                    </div>

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

                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl p-6 border border-emerald-100 text-center space-y-2">
                        <h4 className="font-bold text-emerald-900 text-sm">Teacher Workspace Live</h4>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                            Connected directly to live school database records via real-time backend API endpoints.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
