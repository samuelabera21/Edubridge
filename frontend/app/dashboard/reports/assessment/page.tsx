"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { 
    FileSpreadsheet, 
    Sparkles, 
    Download, 
    Award, 
    CheckCircle2, 
    TrendingUp,
    BookOpen,
    Users,
    Clock,
    Lock,
    ExternalLink,
    Search
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AssessmentReportsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/reports/assessment");
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleExportReport = async (format: string) => {
        try {
            await fetchApi("/reports/generate", {
                method: "POST",
                body: JSON.stringify({
                    reportType: "ASSESSMENT",
                    title: "Institutional Assessment & Exam Results Report",
                    fileFormat: format,
                    summaryMetrics: analytics
                })
            });
            alert(`Assessment Report (${format}) generated successfully!`);
        } catch (err: any) {
            console.error(err);
        }
    };

    if (loading) return <LoadingState message="Aggregating live examination & assessment results from database..." />;

    const assessmentList = Array.isArray(analytics?.assessments) ? analytics.assessments : [];
    const filteredList = assessmentList.filter((a: any) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
            a.title?.toLowerCase().includes(q) ||
            a.subjectName?.toLowerCase().includes(q) ||
            a.teacherName?.toLowerCase().includes(q) ||
            a.gradeLevel?.toString().includes(q)
        );
    });

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <FileSpreadsheet className="w-7 h-7 text-amber-600" />
                        <span>Assessment & Examination Reports</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Official examination grading reports, class average scores, pass/fail metrics, and teacher submissions.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => handleExportReport("PDF")} leftIcon={<Download className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432] cursor-pointer">
                        Export PDF
                    </Button>
                    <Button onClick={() => handleExportReport("CSV")} variant="outline" leftIcon={<Download className="w-4 h-4" />} className="cursor-pointer">
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Analytics Metric Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-xs border-l-4 border-l-amber-600">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-gray-500 uppercase">Grading Completion</p>
                        <h3 className="text-2xl font-black text-amber-900 mt-1">{analytics?.completionRate || "0%"}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Assessments fully evaluated</p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-l-4 border-l-blue-600">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-gray-500 uppercase">Total Submissions</p>
                        <h3 className="text-2xl font-black text-blue-900 mt-1">{analytics?.totalSubmissions || 0}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Student scores recorded</p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-l-4 border-l-emerald-600">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-gray-500 uppercase">School Average</p>
                        <h3 className="text-2xl font-black text-emerald-800 mt-1">{analytics?.schoolAveragePercentage || "0%"}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Across all subjects</p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs border-l-4 border-l-indigo-600">
                    <CardContent className="p-4">
                        <p className="text-[11px] font-bold text-gray-500 uppercase">Pass Rate</p>
                        <h3 className="text-2xl font-black text-indigo-900 mt-1">{analytics?.passRate || "0%"}</h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">Passed: {analytics?.totalPassed || 0} • Below: {analytics?.totalFailed || 0}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Assessment Roster Table for Admin */}
            <Card className="shadow-xs">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                        <CardTitle className="text-base font-bold text-slate-900 flex items-center space-x-2">
                            <BookOpen className="w-5 h-5 text-[#4085b3]" />
                            <span>Teacher Assessment & Gradebook Registry ({assessmentList.length})</span>
                        </CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Real-time view of evaluations created and graded by teachers across all grades and sections.
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by title, subject, teacher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#4085b3] w-64"
                            />
                        </div>
                        <Link 
                            href="/dashboard/assessment/results"
                            className="px-3 py-1.5 bg-[#0c2454] hover:bg-[#163878] text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                        >
                            <span>Student Breakdown</span>
                            <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </div>
                </CardHeader>

                <CardContent className="pt-3">
                    {filteredList.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <p className="font-semibold text-slate-600">No assessments found matching criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                                        <th className="py-3 px-3">#</th>
                                        <th className="py-3 px-3">Assessment Title</th>
                                        <th className="py-3 px-3">Subject & Class</th>
                                        <th className="py-3 px-3">Teacher</th>
                                        <th className="py-3 px-3 text-center">Status</th>
                                        <th className="py-3 px-3 text-center">Graded Roster</th>
                                        <th className="py-3 px-3 text-center">Class Average</th>
                                        <th className="py-3 px-3 text-center">Pass Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredList.map((a: any, idx: number) => (
                                        <tr key={a.id || idx} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-3 px-3 font-bold text-slate-400">{idx + 1}</td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center space-x-2">
                                                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-[10px] font-black rounded uppercase">
                                                        {a.type}
                                                    </span>
                                                    <span className="font-bold text-slate-900">{a.title}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <p className="font-semibold text-slate-800">{a.subjectName}</p>
                                                <p className="text-[10px] text-slate-400">Grade {a.gradeLevel}-{a.sectionName}</p>
                                            </td>
                                            <td className="py-3 px-3 text-slate-700 font-medium">
                                                {a.teacherName}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                {a.status === "RELEASED" ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        🟢 Live
                                                    </span>
                                                ) : a.status === "CLOSED" ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                        🏁 Closed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                        <Lock className="w-2.5 h-2.5 mr-1" /> Scheduled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-center font-bold text-slate-800">
                                                {a.gradedCount} students
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="font-black text-slate-900">{a.averageScore} / {a.maxScore}</span>
                                                <span className="text-[10px] text-slate-400 block">({a.averagePercentage})</span>
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    {a.passRate}
                                                </span>
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
    );
}
