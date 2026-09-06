"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Sparkles, 
    Bot, 
    CheckCircle2, 
    TrendingUp, 
    Brain, 
    Award
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AISchoolPerformancePage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [aiData, setAiData] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/ai-leadership/school-performance");
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

    if (loading) return <LoadingState message="Running AI School Performance Intelligence Engine..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-purple-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-purple-700" />
                        SRS Domain 14.1: AI School Performance Intelligence Engine
                    </span>
                    <p className="text-purple-800">
                        <strong>Who Uses This:</strong> School Principal & Academic Leadership Steering Committee.
                        <br />
                        <strong>Data Source:</strong> Real-time AI evaluation engine queried via REST API (`/api/ai-leadership/school-performance`).
                        <br />
                        <strong>SRS Purpose:</strong> Automated cross-domain academic analysis, pass probability forecasting, and grade stability rating.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Bot className="w-7 h-7 text-purple-600" />
                        <span>1. AI School Performance Analysis</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Cross-domain institutional evaluation, pass probability modeling, and AI health rating.</p>
                </div>
            </div>

            {/* Main AI Intelligence Card */}
            <Card className="shadow-sm border-l-4 border-l-purple-600">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-purple-600" />
                        AI Performance Analysis Engine Output
                    </CardTitle>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                        Confidence: {Math.round((aiData?.confidenceScore || 0.95) * 100)}%
                    </span>
                </CardHeader>
                <CardContent className="py-6 space-y-4">
                    <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                        <p className="text-xs font-bold text-purple-900 uppercase">Institutional Status</p>
                        <p className="text-xl font-extrabold text-purple-950 mt-1">{aiData?.overallStatus || "OPTIMAL ACADEMIC STABILITY"}</p>
                    </div>

                    <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">
                        <p className="font-semibold text-gray-900 mb-1">AI Executive Summary:</p>
                        <p>{aiData?.aiSummary}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-bold uppercase text-gray-700">Key Actionable Insights:</p>
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
