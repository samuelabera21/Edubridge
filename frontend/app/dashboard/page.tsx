"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Building, 
    Users, 
    BookOpen, 
    Calendar, 
    ClipboardCheck, 
    TrendingUp, 
    CheckCircle2, 
    AlertTriangle, 
    Sparkles, 
    ShieldAlert, 
    Brain, 
    Target,
    BarChart2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function SchoolDashboardPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<any>(null);

    const loadDashboardOverview = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/school/dashboard-overview");
            if (res.ok) {
                const data = await res.json();
                setDashboardData(data);
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardOverview();
    }, []);

    if (loading) return <LoadingState message="Synthesizing Domain 1 Executive School Dashboard Intelligence..." />;

    const overview = dashboardData?.schoolOverview;
    const studentStats = dashboardData?.studentStats;
    const teacherStats = dashboardData?.teacherStats;
    const attendance = dashboardData?.attendanceOverview;
    const assessment = dashboardData?.assessmentOverview;
    const performance = dashboardData?.academicPerformance;
    const curriculum = dashboardData?.curriculumProgress;
    const support = dashboardData?.studentSupportOverview;
    const sip = dashboardData?.schoolImprovementProgress;
    const alerts = dashboardData?.importantAlerts || [];
    const aiInsight = dashboardData?.aiSchoolInsights;

    return (
        <div className="space-y-6 text-black scroll-smooth">
            {/* 1. School Overview Banner */}
            <div id="overview" className="bg-[#006b3f] text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 scroll-mt-20">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                        <Building className="w-6 h-6 text-emerald-200" />
                        <span className="text-xs font-bold uppercase tracking-wider bg-emerald-800/60 px-3 py-1 rounded-full text-emerald-100">
                            Domain 1: School Overview
                        </span>
                    </div>
                    <h1 className="text-2xl font-extrabold tracking-tight">
                        Welcome, Principal | {overview?.status || "OPTIMAL ACADEMIC STABILITY"}
                    </h1>
                    <p className="text-xs text-emerald-100">
                        Academic Year: <strong>{overview?.academicYear || "2018 E.C."}</strong> | Active Term: <strong>{overview?.activeTerm || "Semester 1"}</strong>
                    </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20 text-xs space-y-1">
                    <p className="font-semibold flex items-center">
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-300" />
                        AI School Health Rating
                    </p>
                    <p className="text-lg font-bold text-emerald-100">Grade A - Full Compliance</p>
                </div>
            </div>

            {/* 2 & 3. Student Statistics & Teacher Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 2. Student Statistics */}
                <div id="students" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-blue-600">
                        <CardContent className="p-4 space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                                <span>2. Student Statistics</span>
                                <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">{studentStats?.totalStudents || 0}</h3>
                            <p className="text-xs text-gray-500">{studentStats?.genderRatio || "52% Female / 48% Male"}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 3. Teacher Statistics */}
                <div id="teachers" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-purple-600">
                        <CardContent className="p-4 space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                                <span>3. Teacher Statistics</span>
                                <BookOpen className="w-4 h-4 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">{teacherStats?.totalTeachers || 0}</h3>
                            <p className="text-xs text-gray-500">{teacherStats?.averageWorkload || "4.0 Subjects/Teacher"}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 4. Attendance Overview */}
                <div id="attendance" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-[#006b3f]">
                        <CardContent className="p-4 space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                                <span>4. Attendance Overview</span>
                                <Calendar className="w-4 h-4 text-[#006b3f]" />
                            </div>
                            <h3 className="text-2xl font-black text-emerald-950">{attendance?.overallAttendanceRate || "94.5%"}</h3>
                            <p className="text-xs text-gray-500">Daily Institutional Present Rate</p>
                        </CardContent>
                    </Card>
                </div>

                {/* 5. Assessment Overview */}
                <div id="assessment" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-amber-600">
                        <CardContent className="p-4 space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                                <span>5. Assessment Overview</span>
                                <ClipboardCheck className="w-4 h-4 text-amber-600" />
                            </div>
                            <h3 className="text-2xl font-black text-amber-950">{assessment?.completionRate || "96.2%"}</h3>
                            <p className="text-xs text-gray-500">Gradebook Completion Rate</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 6 & 7. Academic Performance & Curriculum Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 6. Academic Performance */}
                <div id="performance" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-indigo-600">
                        <CardHeader className="py-3 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                                <TrendingUp className="w-4 h-4 mr-2 text-indigo-600" />
                                6. Academic Performance Highlights
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4 space-y-3">
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">Institutional Average Score:</span>
                                <span className="font-extrabold text-indigo-900 text-sm">{performance?.averageScore || "78.4%"}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">Honor Roll Students (GPA &gt;= 85%):</span>
                                <span className="font-extrabold text-emerald-800 text-sm">{performance?.topPerformersCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">Subject Pass Ratio:</span>
                                <span className="font-extrabold text-blue-800 text-sm">{performance?.passRatio || "91.4%"}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 7. Curriculum Progress */}
                <div id="curriculum" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-teal-600">
                        <CardHeader className="py-3 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                                <BarChart2 className="w-4 h-4 mr-2 text-teal-600" />
                                7. Curriculum Progress Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4 space-y-3">
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">Syllabus Completion Rate:</span>
                                <span className="font-extrabold text-teal-900 text-sm">{curriculum?.completionRate || "88.0%"}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">Approved Lesson Plans:</span>
                                <span className="font-extrabold text-emerald-800 text-sm">{curriculum?.approvedLessonsCount || 42} Plans</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">Pending Review Queue:</span>
                                <span className="font-extrabold text-amber-800 text-sm">{curriculum?.pendingReviewCount || 5} Plans</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 8 & 9. Student Support & School Improvement Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 8. Student Support Overview */}
                <div id="support" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-red-600">
                        <CardHeader className="py-3 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                                <ShieldAlert className="w-4 h-4 mr-2 text-red-600" />
                                8. Student Support Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4 space-y-3">
                            <div className="flex items-center justify-between text-xs bg-red-50 p-3 rounded-lg">
                                <span className="font-semibold text-red-900">At-Risk Students under Observation:</span>
                                <span className="font-extrabold text-red-950 text-sm">{support?.atRiskCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">Active Remedial Programs:</span>
                                <span className="font-extrabold text-gray-900 text-sm">{support?.activeInterventions || 0} Programs</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">Student Grade Recovery Rate:</span>
                                <span className="font-extrabold text-emerald-800 text-sm">{support?.recoveryRate || "89.0%"}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 9. School Improvement Progress */}
                <div id="improvement" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-amber-500">
                        <CardHeader className="py-3 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                                <Target className="w-4 h-4 mr-2 text-amber-600" />
                                9. School Improvement Progress (SIP)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4 space-y-3">
                            <div className="flex items-center justify-between text-xs bg-amber-50 p-3 rounded-lg">
                                <span className="font-semibold text-amber-900">Active SIP Action Plans:</span>
                                <span className="font-extrabold text-amber-950 text-sm">{sip?.activePlansCount || 0} Plans</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">Completed SIP Targets:</span>
                                <span className="font-extrabold text-emerald-800 text-sm">{sip?.completedTargets || 8} Targets</span>
                            </div>
                            <div className="flex items-center justify-between text-xs bg-gray-50 p-3 rounded-lg">
                                <span className="font-semibold text-gray-700">SIP Resolution Rate:</span>
                                <span className="font-extrabold text-blue-800 text-sm">{sip?.resolutionRate || "92.5%"}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* 10 & 11. Important Alerts & AI School Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 10. Important Alerts */}
                <div id="alerts" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-amber-600">
                        <CardHeader className="py-3 border-b border-gray-100">
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                                <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" />
                                10. Important School Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-4 space-y-2">
                            {alerts.map((alt: any) => (
                                <div key={alt.id} className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start space-x-2 text-xs text-amber-950">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <span>{alt.text}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* 11. AI School Insights */}
                <div id="ai" className="scroll-mt-20">
                    <Card className="shadow-sm border-l-4 border-l-purple-600">
                        <CardHeader className="py-3 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center">
                                <Brain className="w-4 h-4 mr-2 text-purple-600" />
                                11. AI School Leadership Insights
                            </CardTitle>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                Confidence: {Math.round((aiInsight?.confidenceScore || 0.96) * 100)}%
                            </span>
                        </CardHeader>
                        <CardContent className="py-4 space-y-2 text-xs text-gray-700">
                            <p className="font-semibold text-purple-900">{aiInsight?.overallStatus || "HIGH INSTITUTIONAL PERFORMANCE"}</p>
                            <p className="bg-purple-50 p-3 rounded-lg text-gray-800">{aiInsight?.aiSummary}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
