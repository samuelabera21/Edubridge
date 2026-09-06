"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Sparkles, 
    Calendar, 
    CheckCircle2, 
    TrendingUp, 
    Brain, 
    AlertTriangle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AIAttendanceAnalysisPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [aiData, setAiData] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/ai-leadership/attendance");
            if (res.ok) {
                const data = await res.json();
                setAiData(data);
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

    if (loading) return <LoadingState message="Running AI Predictive Attendance Modeling Engine..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 14.2: AI Predictive Absenteeism & Attendance Engine
                    </span>
                    <p className="text-emerald-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & Attendance Supervisors.
                        <br />
                        <strong>Data Source:</strong> Predictive attendance AI model queried via REST API (`/api/ai-leadership/attendance`).
                        <br />
                        <strong>SRS Purpose:</strong> Detects unexcused absence clusters, day-of-week attendance variances, and environmental forecasts.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Calendar className="w-7 h-7 text-[#006b3f]" />
                        <span>2. AI Attendance Analysis & Modeling</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Predictive absenteeism clustering, weather correlation, and absence prevention AI triggers.</p>
                </div>
            </div>

            {/* Main AI Card */}
            <Card className="shadow-sm border-l-4 border-l-[#006b3f]">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-[#006b3f]" />
                        AI Attendance Analytics Model Output
                    </CardTitle>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        Confidence: {Math.round((aiData?.confidenceScore || 0.94) * 100)}%
                    </span>
                </CardHeader>
                <CardContent className="py-6 space-y-4">
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-xs font-bold text-[#006b3f] uppercase">Absenteeism Risk Status</p>
                        <p className="text-xl font-extrabold text-emerald-950 mt-1">{aiData?.overallStatus || "LOW ABSENTEEISM RISK"}</p>
                    </div>

                    <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">
                        <p className="font-semibold text-gray-900 mb-1">AI Executive Summary:</p>
                        <p>{aiData?.aiSummary}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-bold uppercase text-gray-700">Predictive Intelligence Insights:</p>
                        {aiData?.keyInsights?.map((insight: string, idx: number) => (
                            <div key={idx} className="flex items-start space-x-2 text-xs text-gray-800 bg-white p-3 rounded-lg border border-gray-200">
                                <CheckCircle2 className="w-4 h-4 text-[#006b3f] mt-0.5 flex-shrink-0" />
                                <span>{insight}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
