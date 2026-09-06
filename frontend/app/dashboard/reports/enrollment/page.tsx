"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Users, 
    Sparkles, 
    Download, 
    PieChart, 
    BarChart3, 
    UserCheck
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function EnrollmentReportsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/reports/enrollment");
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
                    reportType: "ENROLLMENT",
                    title: "Institutional Enrollment & Demographics Summary",
                    fileFormat: format,
                    summaryMetrics: analytics
                })
            });
            alert(`Enrollment Report (${format}) generated successfully!`);
        } catch (err: any) {
            console.error(err);
        }
    };

    if (loading) return <LoadingState message="Aggregating live student enrollment analytics from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-blue-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-blue-700" />
                        SRS Domain 13.1: Student Enrollment & Demographics Analytics
                    </span>
                    <p className="text-blue-800">
                        <strong>Who Uses This:</strong> School Principal, Registrar & Regional Education Bureau.
                        <br />
                        <strong>Data Source:</strong> Database table `student` aggregated via REST API (`/api/reports/enrollment`).
                        <br />
                        <strong>SRS Purpose:</strong> Gender ratio breakdowns, grade placement distribution, and demographic reports.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Users className="w-7 h-7 text-blue-600" />
                        <span>1. Student Enrollment Reports</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Official institutional demographic distribution and gender ratio reports.</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="shadow-sm border-l-4 border-l-blue-600">
                    <CardContent className="p-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Enrolled Students</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">{analytics?.totalStudents || 0}</h3>
                        <p className="text-xs text-gray-400 mt-1">Active registered learners</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-emerald-600">
                    <CardContent className="p-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Female Students</p>
                        <h3 className="text-2xl font-bold text-emerald-800 mt-1">{analytics?.femaleStudents || 0}</h3>
                        <p className="text-xs text-gray-400 mt-1">Registered female cohort</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-purple-600">
                    <CardContent className="p-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Male Students</p>
                        <h3 className="text-2xl font-bold text-purple-800 mt-1">{analytics?.maleStudents || 0}</h3>
                        <p className="text-xs text-gray-400 mt-1">Registered male cohort</p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-amber-600">
                    <CardContent className="p-5">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Gender Equity Ratio</p>
                        <h3 className="text-lg font-bold text-amber-900 mt-1">{analytics?.genderRatio || "N/A"}</h3>
                        <p className="text-xs text-gray-400 mt-1">Target parity achieved</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
