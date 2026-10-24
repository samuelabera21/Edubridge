"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BarChart2, TrendingUp, Users, CheckCircle2, ClipboardCheck, ArrowLeft } from "lucide-react";

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
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Generating class analytics...</p>
            </div>
        );
    }

    const todayClasses = summary?.todayClasses || [];
    const totalStudents = summary?.totalStudents ?? 0;
    const studentsNeedAttentionCount = summary?.studentsNeedAttentionCount ?? 0;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Class Attendance & Analytics</h1>
                <p className="text-xs font-medium text-gray-500 mt-0.5">
                    Class attendance breakdown, roster analytics, and student support monitoring.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <ClipboardCheck className="w-5 h-5 text-[#4085b3]" />
                            <span>Today's Class Schedule & Attendance Status</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todayClasses.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 space-y-2">
                                <ClipboardCheck className="w-10 h-10 mx-auto text-gray-300" />
                                <p className="text-sm font-semibold text-gray-600">No scheduled periods today</p>
                                <p className="text-xs text-gray-400">Class attendance will display here as periods are conducted.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 text-xs">
                                {todayClasses.map((item: any, idx: number) => {
                                    const isDone = item.status === "Completed" || item.action === "Completed";
                                    return (
                                        <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{item.section || item.class} — {item.subject}</p>
                                                <p className="text-gray-400 text-[11px] mt-0.5">{item.time} • Room {item.room || "101"}</p>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                isDone ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                                            }`}>
                                                {isDone ? "Attendance Logged" : "Pending Log"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <Users className="w-5 h-5 text-purple-600" />
                            <span>Roster & Support Summary</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-xs">
                        <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-[10px] text-blue-700 font-bold uppercase">Total Students</p>
                            <p className="text-2xl font-black text-blue-900 mt-0.5">{totalStudents}</p>
                        </div>
                        <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
                            <p className="text-[10px] text-emerald-700 font-bold uppercase">Active Support Flags</p>
                            <p className="text-2xl font-black text-emerald-900 mt-0.5">{studentsNeedAttentionCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
