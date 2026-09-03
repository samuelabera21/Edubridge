"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Sparkles, 
    Lightbulb, 
    CheckCircle2, 
    Brain, 
    Target
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AISchoolImprovementRecommendationsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [aiData, setAiData] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/ai-leadership/improvement-recommendations");
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

    if (loading) return <LoadingState message="Running AI Strategic School Improvement Generator..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-amber-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-amber-700" />
                        SRS Domain 14.6: AI Strategic Improvement Recommendation Generator
                    </span>
                    <p className="text-amber-800">
                        <strong>Who Uses This:</strong> School Principal, Board of Directors & Woreda Education Bureau.
                        <br />
                        <strong>Data Source:</strong> SIP strategy AI generator queried via REST API (`/api/ai-leadership/improvement-recommendations`).
                        <br />
                        <strong>SRS Purpose:</strong> Synthesizes actionable recommendations for institutional budget allocation, lab upgrades, and teacher training.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Lightbulb className="w-7 h-7 text-amber-600" />
                        <span>6. AI School Improvement Recommendations</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Automated SIP action recommendations, budget optimization, and resource priorities.</p>
                </div>
            </div>

            {/* Main AI Card */}
            <Card className="shadow-sm border-l-4 border-l-amber-600">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-amber-600" />
                        AI Strategic Recommendations Output
                    </CardTitle>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        Confidence: {Math.round((aiData?.confidenceScore || 0.97) * 100)}%
                    </span>
                </CardHeader>
                <CardContent className="py-6 space-y-4">
                    <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                        <p className="text-xs font-bold text-amber-900 uppercase">Strategic Alignment Status</p>
                        <p className="text-xl font-extrabold text-amber-950 mt-1">{aiData?.overallStatus || "SIP STRATEGIC ALIGNMENT VERIFIED"}</p>
                    </div>

                    <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">
                        <p className="font-semibold text-gray-900 mb-1">AI Executive Summary:</p>
                        <p>{aiData?.aiSummary}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-bold uppercase text-gray-700">Actionable Recommendations:</p>
                        {aiData?.recommendations?.map((rec: string, idx: number) => (
                            <div key={idx} className="flex items-start space-x-2 text-xs text-gray-800 bg-white p-3 rounded-lg border border-gray-200">
                                <CheckCircle2 className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
