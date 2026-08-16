"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import Link from "next/link";
import { 
    BookOpen, Users, AlertTriangle, CheckCircle, 
    Clock, Activity, AlertCircle, ChevronRight, GraduationCap, Eye
} from "lucide-react";

export default function VicePrincipalDashboard() {
    const { authData } = useAuth();
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadDashboard() {
            try {
                const res = await fetchApi("/vice-principal/me");
                if (res.ok) {
                    const data = await res.json();
                    setDashboardData(data.overview || data);
                } else {
                    const errText = await res.text();
                    console.error("Dashboard API Error:", res.status, errText);
                    setError(`Failed to load dashboard data. Status: ${res.status}`);
                }
            } catch (err) {
                console.error("Failed to load dashboard data:", err);
                setError("Failed to load dashboard data. Please try again later.");
            } finally {
                setLoading(false);
            }
        }
        
        loadDashboard();
    }, []);

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto space-y-6">
                <div className="animate-pulse bg-gray-200 h-32 rounded-2xl w-full"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="animate-pulse bg-gray-200 h-48 rounded-xl"></div>)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-xl flex items-center space-x-3">
                <AlertCircle className="w-6 h-6" />
                <p className="font-medium">{error}</p>
            </div>
        );
    }

    const school = dashboardData?.schoolOverview || {};
    const teaching = dashboardData?.todayTeaching || {};
    const attendance = dashboardData?.attendanceOverview || {};
    const assessment = dashboardData?.assessmentOverview || {};
    const curriculum = dashboardData?.curriculumProgress || {};
    const alerts = dashboardData?.attentionAlerts || [];
    const announcements = dashboardData?.academicAnnouncements || [];
    const upcomingActivities = dashboardData?.upcomingActivities || [];

    return (
        <div className="w-full max-w-7xl mx-auto space-y-8 pb-10">
            {/* School Overview Banner */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            Academic Leader Dashboard
                        </h1>
                        <p className="text-blue-100 text-lg">
                            Academic Year: <span className="font-semibold">{school.academicYear || "Not Set"}</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <Link href="/dashboard/vice-principal/teachers" className="hover:bg-white/20 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 transition">
                            <p className="text-blue-100 text-xs uppercase font-semibold">Teachers</p>
                            <p className="text-xl font-bold flex items-center">{school.teachers || 0} <ChevronRight className="w-4 h-4 ml-2 opacity-50" /></p>
                        </Link>
                        <Link href="/dashboard/vice-principal/students" className="hover:bg-white/20 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20 transition">
                            <p className="text-blue-100 text-xs uppercase font-semibold">Students</p>
                            <p className="text-xl font-bold flex items-center">{school.students || 0} <ChevronRight className="w-4 h-4 ml-2 opacity-50" /></p>
                        </Link>
                        <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                            <p className="text-blue-100 text-xs uppercase font-semibold">Classes / Sections</p>
                            <p className="text-xl font-bold">{school.activeClasses || 0} / {school.sections || 0}</p>
                        </div>
                    </div>
                </div>
                <GraduationCap className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-5 transform -rotate-12" />
            </div>

            {/* Academic Attention / Alerts (Top priority) */}
            {alerts.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center"><AlertTriangle className="w-5 h-5 text-rose-500 mr-2"/> Action Required</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {alerts.map((alert: any, i: number) => (
                            <Link href={`/dashboard/vice-principal/${alert.area.toLowerCase()}`} key={i} className={`block p-4 rounded-xl border hover:shadow-md transition ${alert.severity === 'HIGH' ? 'bg-rose-50 border-rose-200' : alert.severity === 'MEDIUM' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${alert.severity === 'HIGH' ? 'bg-rose-100 text-rose-700' : alert.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'}`}>
                                        {alert.severity}
                                    </span>
                                </div>
                                <h3 className={`font-semibold mb-1 ${alert.severity === 'HIGH' ? 'text-rose-900' : alert.severity === 'MEDIUM' ? 'text-amber-900' : 'text-gray-900'}`}>{alert.title}</h3>
                                <p className={`text-sm mb-3 ${alert.severity === 'HIGH' ? 'text-rose-700' : alert.severity === 'MEDIUM' ? 'text-amber-700' : 'text-gray-600'}`}>{alert.explanation}</p>
                                <div className={`text-xs font-bold flex items-center ${alert.severity === 'HIGH' ? 'text-rose-700' : alert.severity === 'MEDIUM' ? 'text-amber-700' : 'text-gray-700'}`}>
                                    {alert.action} <ChevronRight className="w-3 h-3 ml-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* High Level Drill-Down Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Teaching */}
                <Link href="/dashboard/vice-principal/teaching" className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                            <Clock className="w-6 h-6" />
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Today's Teaching</h3>
                    <p className="text-sm text-gray-500 mb-4">Scheduled vs Completed Lessons</p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Completed</span>
                            <span className="font-semibold text-emerald-600">{teaching.completedLessons || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Missed</span>
                            <span className="font-semibold text-rose-600">{teaching.missedLessons || 0}</span>
                        </div>
                    </div>
                </Link>

                {/* Attendance */}
                <Link href="/dashboard/vice-principal/attendance" className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-blue-300 hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-500 transition" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Attendance</h3>
                    <p className="text-sm text-gray-500 mb-4">Daily Student & Teacher Rates</p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Students</span>
                            <span className={`font-semibold ${attendance.studentAttendanceToday < 90 ? 'text-amber-600' : 'text-emerald-600'}`}>{attendance.studentAttendanceToday || 0}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Teachers</span>
                            <span className={`font-semibold ${attendance.teacherAttendanceToday < 95 ? 'text-amber-600' : 'text-emerald-600'}`}>{attendance.teacherAttendanceToday || 0}%</span>
                        </div>
                    </div>
                </Link>

                {/* Assessment */}
                <Link href="/dashboard/vice-principal/assessments" className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-emerald-300 hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-emerald-500 transition" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Assessment</h3>
                    <p className="text-sm text-gray-500 mb-4">Completion & Performance</p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Pending</span>
                            <span className="font-semibold text-amber-600">{assessment.pendingAssessments || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Avg Score</span>
                            <span className="font-semibold text-gray-900">{assessment.averagePerformance || 0}%</span>
                        </div>
                    </div>
                </Link>

                {/* Curriculum */}
                <Link href="/dashboard/vice-principal/curriculum" className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-cyan-300 hover:shadow-md transition">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-cyan-50 rounded-lg text-cyan-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-cyan-500 transition" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Curriculum</h3>
                    <p className="text-sm text-gray-500 mb-4">Pacing and Progress</p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Expected</span>
                            <span className="font-semibold text-gray-900">{curriculum.expectedProgress || 0}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Actual</span>
                            <span className={`font-semibold ${curriculum.actualProgress < curriculum.expectedProgress ? 'text-amber-600' : 'text-emerald-600'}`}>{curriculum.actualProgress || 0}%</span>
                        </div>
                    </div>
                </Link>

                {/* Observations */}
                <Link href="/dashboard/vice-principal/observations" className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition col-span-1 md:col-span-1">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                            <Eye className="w-6 h-6" />
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Observations</h3>
                    <p className="text-sm text-gray-500">Supervise teachers & track academic progress.</p>
                </Link>

                {/* Other drill-downs */}
                <Link href="/dashboard/vice-principal/support/students" className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-purple-300 hover:shadow-md transition col-span-1 md:col-span-2 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                        <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                            <Activity className="w-6 h-6" />
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-purple-500 transition" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">Student Support</h3>
                    <p className="text-sm text-gray-500">View flagged students and support requirements.</p>
                </Link>
            </div>

            {/* Bottom Row: Upcoming Activities and Announcements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Upcoming Activities */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-indigo-500" />
                        Upcoming Academic Activities
                    </h3>
                    {upcomingActivities.length > 0 ? (
                        <div className="space-y-4">
                            {upcomingActivities.map((activity: any, i: number) => (
                                <div key={i} className="flex justify-between items-center border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium text-gray-900">{activity.title}</p>
                                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase">{activity.type}</span>
                                    </div>
                                    <div className="text-sm text-gray-500 font-medium">
                                        {new Date(activity.date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No upcoming activities scheduled.</p>
                    )}
                </div>

                {/* Academic Announcements */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-rose-500" />
                        Academic Announcements
                    </h3>
                    {announcements.length > 0 ? (
                        <div className="space-y-4">
                            {announcements.map((announcement: any, i: number) => (
                                <div key={i} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-medium text-gray-900">{announcement.title}</p>
                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">{announcement.target}</span>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        Posted: {new Date(announcement.date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-sm">No new academic announcements.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
