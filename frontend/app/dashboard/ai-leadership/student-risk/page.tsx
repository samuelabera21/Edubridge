"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Sparkles, 
    ShieldAlert, 
    CheckCircle2, 
    Brain, 
    AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AIStudentRiskInsightsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [aiData, setAiData] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/ai-leadership/student-risk");
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

    if (loading) return <LoadingState message="Running AI Student Risk & Dropout Early Warning Engine..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-red-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-red-700" />
                        SRS Domain 14.3: AI Student Risk & Dropout Prevention Engine
                    </span>
                    <p className="text-red-800">
                        <strong>Who Uses This:</strong> School Principal, Vice-Principal & Guidance Counselors.
                        <br />
                        <strong>Data Source:</strong> Early warning risk AI model queried via REST API (`/api/ai-leadership/student-risk`).
                        <br />
                        <strong>SRS Purpose:</strong> Early identification of academic degradation, dropout risk scores, and automated intervention triggers.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <ShieldAlert className="w-7 h-7 text-red-600" />
                        <span>3. AI Student-Risk Insights Engine</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time risk scoring, early warning detection, and automated counselor alerts.</p>
                </div>
            </div>

            {/* Main AI Card */}
            <Card className="shadow-sm border-l-4 border-l-red-600">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-red-600" />
                        AI Early Warning Risk Model Output
                    </CardTitle>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                        Confidence: {Math.round((aiData?.confidenceScore || 0.98) * 100)}%
                    </span>
                </CardHeader>
                <CardContent className="py-6 space-y-4">
                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                        <p className="text-xs font-bold text-red-900 uppercase">Early Warning Engine Status</p>
                        <p className="text-xl font-extrabold text-red-950 mt-1">{aiData?.overallStatus || "EARLY WARNING SYSTEM ACTIVE"}</p>
                    </div>

                    <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">
                        <p className="font-semibold text-gray-900 mb-1">AI Executive Summary:</p>
                        <p>{aiData?.aiSummary}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-bold uppercase text-gray-700">Risk Prevention Triggers:</p>
                        {aiData?.keyInsights?.map((insight: string, idx: number) => (
                            <div key={idx} className="flex items-start space-x-2 text-xs text-gray-800 bg-white p-3 rounded-lg border border-gray-200">
                                <CheckCircle2 className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <span>{insight}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
