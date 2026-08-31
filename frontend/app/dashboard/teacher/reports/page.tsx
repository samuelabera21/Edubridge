"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BarChart2, ArrowLeft, TrendingUp, Users, CheckCircle2 } from "lucide-react";

export default function TeacherReportsPage() {
    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadReports() {
            try {
                const res = await fetchApi("/teacher/dashboard-summary");
                if (res.ok) {
                    const data = await res.json();
                    setSummary(data);
                }
            } catch (err) {
                console.error("Failed to load reports:", err);
            } finally {
                setLoading(false);
            }
        }
        loadReports();
    }, []);

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Generating class performance analytics...</p>
            </div>
        );
    }

    const classPerf = summary?.classPerformance || [];

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Academic & Attendance Reports</h1>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                        Class average score distributions, section performance comparisons, and student evaluation analytics.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <BarChart2 className="w-5 h-5 text-blue-600" />
                            <span>Class Performance Breakdown</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {classPerf.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 space-y-2">
                                <TrendingUp className="w-10 h-10 mx-auto text-gray-300" />
                                <p className="text-sm font-semibold text-gray-600">No score performance data recorded yet</p>
                                <p className="text-xs text-gray-400">Class scores will display here as assessments and exams are scored.</p>
                            </div>
                        ) : (
                            <div className="space-y-4 text-xs">
                                {classPerf.map((item: any, idx: number) => (
                                    <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                        <div className="flex justify-between font-bold text-gray-900">
                                            <span>{item.section || item.class || `Section ${idx + 1}`} - {item.subject || "Subject"}</span>
                                            <span className="text-blue-600 font-extrabold">{item.avgScore || item.average || 0}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min(item.avgScore || item.average || 0, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <Users className="w-5 h-5 text-purple-600" />
                            <span>Evaluation Summary</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                        <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-[10px] text-blue-700 font-bold uppercase">Total Students Evaluated</p>
                            <p className="text-2xl font-black text-blue-900 mt-0.5">{summary?.metrics?.totalStudents || 0}</p>
                        </div>
                        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                            <p className="text-[10px] text-emerald-700 font-bold uppercase">Active Support Flags</p>
                            <p className="text-2xl font-black text-emerald-900 mt-0.5">{summary?.metrics?.studentsNeedAttentionCount || 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
