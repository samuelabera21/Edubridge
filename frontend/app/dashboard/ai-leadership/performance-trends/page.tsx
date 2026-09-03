"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Sparkles, 
    TrendingUp, 
    CheckCircle2, 
    Brain, 
    BarChart2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AIPerformanceTrendsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [aiData, setAiData] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/ai-leadership/performance-trends");
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

    if (loading) return <LoadingState message="Running AI Performance Longitudinal Trend Engine..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-blue-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-blue-700" />
                        SRS Domain 14.4: AI Performance Trend & Anomaly Detection Engine
                    </span>
                    <p className="text-blue-800">
                        <strong>Who Uses This:</strong> School Principal, Academic Vice-Principal & Department Chairs.
                        <br />
                        <strong>Data Source:</strong> Longitudinal trend AI model queried via REST API (`/api/ai-leadership/performance-trends`).
                        <br />
                        <strong>SRS Purpose:</strong> Multi-term score trajectory modeling, subject grade variance anomalies, and national exam percentile projections.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <TrendingUp className="w-7 h-7 text-blue-600" />
                        <span>4. AI Performance Trend Detection</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Longitudinal score trajectory modeling, anomaly detection, and percentile projections.</p>
                </div>
            </div>

            {/* Main AI Card */}
            <Card className="shadow-sm border-l-4 border-l-blue-600">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-blue-600" />
                        AI Longitudinal Trajectory Output
                    </CardTitle>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        Confidence: {Math.round((aiData?.confidenceScore || 0.93) * 100)}%
                    </span>
                </CardHeader>
                <CardContent className="py-6 space-y-4">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <p className="text-xs font-bold text-blue-900 uppercase">Trajectory Status</p>
                        <p className="text-xl font-extrabold text-blue-950 mt-1">{aiData?.overallStatus || "POSITIVE GROWTH TRAJECTORY"}</p>
                    </div>

                    <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">
                        <p className="font-semibold text-gray-900 mb-1">AI Executive Summary:</p>
                        <p>{aiData?.aiSummary}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-bold uppercase text-gray-700">Trend Observations:</p>
                        {aiData?.keyInsights?.map((insight: string, idx: number) => (
                            <div key={idx} className="flex items-start space-x-2 text-xs text-gray-800 bg-white p-3 rounded-lg border border-gray-200">
                                <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <span>{insight}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
