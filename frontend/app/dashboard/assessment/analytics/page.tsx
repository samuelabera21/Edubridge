"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    TrendingUp, 
    Award, 
    BarChart3, 
    CheckCircle2, 
    AlertTriangle, 
    BookOpen, 
    Sparkles, 
    Users,
    Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { AcademicYear } from "@/types/api";

interface SubjectAnalytics {
    subjectName: string;
    code: string;
    gradeName: string;
    totalExamined: number;
    passedCount: number;
    failedCount: number;
    averageScore: number;
    gradeDistribution: {
        A: number; // 85-100%
        B: number; // 75-84%
        C: number; // 60-74%
        D: number; // 50-59%
        F: number; // <50%
    };
}

export default function SubjectPerformanceAnalyticsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<SubjectAnalytics[]>([]);
    const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL");

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/assessment/analytics/subjects");
            if (res.ok) {
                const data = await res.json();
                setAnalytics(Array.isArray(data) ? data : []);
            } else {
                setAnalytics([]);
            }
        } catch (err: any) {
            console.error(err);
            setAnalytics([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, []);

    const filteredAnalytics = analytics.filter(item => {
        return selectedGradeFilter === "ALL" || item.gradeName === selectedGradeFilter;
    });

    // Overall Summary Metrics
    const totalStudentsTested = analytics.reduce((acc, curr) => acc + curr.totalExamined, 0);
    const overallPassed = analytics.reduce((acc, curr) => acc + curr.passedCount, 0);
    const overallFailed = analytics.reduce((acc, curr) => acc + curr.failedCount, 0);
    const overallPassRate = totalStudentsTested > 0 ? ((overallPassed / totalStudentsTested) * 100).toFixed(1) : "100.0";

    if (loading) return <LoadingState message="Calculating subject performance & grade distribution analytics..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Context SRS Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 8: Performance Analytics & Grade Distribution
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Fills This:</strong> Automatically aggregated from scores submitted by Subject Teachers in the Gradebook.
                        <br />
                        <strong>Data Source:</strong> Computed from `AssessmentResult` records grouped by `SchoolSubject` & `SchoolGrade`.
                        <br />
                        <strong>Who Uses This:</strong> School Principal & Department Heads to evaluate subject pass rates and identify topics needing curriculum improvement.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <BarChart3 className="w-7 h-7 text-[#006b3f]" />
                        <span>Subject Performance & Pass/Fail Analytics</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Analytics on class averages, pass rates, and grade distributions per subject.</p>
                </div>
            </div>

            {/* Overall Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="bg-emerald-50/60 border-emerald-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Overall Pass Rate</p>
                            <p className="text-xl font-bold text-gray-900">{overallPassRate}%</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/60 border-blue-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Passed Assessments</p>
                            <p className="text-xl font-bold text-gray-900">{overallPassed}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-50/60 border-red-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-red-100 text-red-600 rounded-lg">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Deficiencies (&lt;50%)</p>
                            <p className="text-xl font-bold text-red-800">{overallFailed}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50/60 border-purple-100">
                    <CardContent className="p-4 flex items-center space-x-3">
                        <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">Top Subject Avg</p>
                            <p className="text-xl font-bold text-purple-900">82.5% <span className="text-xs text-gray-500 font-normal">(Chemistry)</span></p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <Card className="shadow-sm">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <BookOpen className="w-5 h-5 mr-2 text-[#006b3f]" />
                        Subject Performance Breakdown
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 font-semibold uppercase">Grade Filter:</span>
                        <select
                            value={selectedGradeFilter}
                            onChange={(e) => setSelectedGradeFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg text-xs px-2.5 py-1.5 focus:ring-2 focus:ring-[#006b3f] bg-white"
                        >
                            <option value="ALL">All Grades</option>
                            <option value="Grade 9">Grade 9</option>
                            <option value="Grade 10">Grade 10</option>
                        </select>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold">Subject & Code</th>
                                    <th className="px-6 py-3.5 font-semibold">Grade</th>
                                    <th className="px-6 py-3.5 font-semibold">Class Avg</th>
                                    <th className="px-6 py-3.5 font-semibold">Pass Rate</th>
                                    <th className="px-6 py-3.5 font-semibold">Grade Breakdown (A / B / C / D / F)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredAnalytics.map((item, idx) => {
                                    const passPct = ((item.passedCount / item.totalExamined) * 100).toFixed(1);
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                <p>{item.subjectName}</p>
                                                <p className="text-xs font-mono font-normal text-gray-500">{item.code}</p>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-semibold text-[#006b3f]">
                                                {item.gradeName}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                {item.averageScore}%
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    parseFloat(passPct) >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                                }`}>
                                                    {passPct}% Passed ({item.passedCount}/{item.totalExamined})
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-1.5 text-xs font-bold">
                                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800" title="85-100%">A: {item.gradeDistribution.A}</span>
                                                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800" title="75-84%">B: {item.gradeDistribution.B}</span>
                                                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800" title="60-74%">C: {item.gradeDistribution.C}</span>
                                                    {item.gradeDistribution.F > 0 && (
                                                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800" title="Failing <50%">F: {item.gradeDistribution.F}</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
