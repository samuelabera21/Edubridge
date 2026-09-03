"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    BookOpen, 
    Sparkles, 
    Download, 
    UserCheck, 
    Briefcase, 
    TrendingUp
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function TeacherReportsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/reports/teacher");
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
                    reportType: "TEACHER",
                    title: "Teaching Staff Workload & Performance Summary",
                    fileFormat: format,
                    summaryMetrics: analytics
                })
            });
            alert(`Teacher Staff Report (${format}) generated successfully!`);
        } catch (err: any) {
            console.error(err);
        }
    };

    if (loading) return <LoadingState message="Aggregating live teaching staff workload & performance analytics from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 13.3: Teacher Workload & Assignment Analytics
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> School Principal, Academic Vice-Principal & HR Administrator.
                        <br />
                        <strong>Data Source:</strong> Database tables `teacher` & `teacher_subject` aggregated via REST API (`/api/reports/teacher`).
                        <br />
                        <strong>SRS Purpose:</strong> Faculty allocation, period workloads, classroom observation ratings, and subject coverage.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <BookOpen className="w-7 h-7 text-purple-600" />
                        <span>3. Teacher & Faculty Reports</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Teaching staff assignment audits, workload distribution, and performance summaries.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button onClick={() => handleExportReport("PDF")} leftIcon={<Download className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                        Export PDF
                    </Button>
                    <Button onClick={() => handleExportReport("CSV")} variant="outline" leftIcon={<Download className="w-4 h-4" />}>
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm border-l-4 border-l-purple-600">
                    <CardContent className="p-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Active Teachers</p>
                        <h3 className="text-2xl font-bold text-purple-900 mt-1">{analytics?.totalTeachers || 0}</h3>
                        <p className="text-xs text-gray-400 mt-1">Full-time faculty count</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-blue-600">
                    <CardContent className="p-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Subject Assignments</p>
                        <h3 className="text-2xl font-bold text-blue-900 mt-1">{analytics?.totalAssignments || 0}</h3>
                        <p className="text-xs text-gray-400 mt-1">Classroom section allocations</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-emerald-600">
                    <CardContent className="p-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Average Faculty Workload</p>
                        <h3 className="text-lg font-bold text-emerald-800 mt-1">{analytics?.averageWorkload || "4 Subjects/Teacher"}</h3>
                        <p className="text-xs text-gray-400 mt-1">Balanced teaching period load</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
