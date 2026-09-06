"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Sparkles, 
    FileText, 
    CheckCircle2, 
    Brain, 
    Award, 
    Printer
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function AIExecutiveSummariesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [aiData, setAiData] = useState<any>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/ai-leadership/executive-summaries");
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

    if (loading) return <LoadingState message="Synthesizing Weekly Executive Principal AI Briefing..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-[#006b3f]/10 border border-[#006b3f]/30 rounded-xl p-4 text-xs text-[#006b3f] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-[#006b3f] flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-[#006b3f]" />
                        SRS Domain 14.8: AI Executive Principal Intelligence Briefings
                    </span>
                    <p className="text-emerald-900">
                        <strong>Who Uses This:</strong> School Principal, Board of Directors & Woreda Education Bureau.
                        <br />
                        <strong>Data Source:</strong> Executive summary AI engine queried via REST API (`/api/ai-leadership/executive-summaries`).
                        <br />
                        <strong>SRS Purpose:</strong> Auto-synthesizes weekly executive Principal briefings, board memos, and Woreda compliance updates.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <FileText className="w-7 h-7 text-[#006b3f]" />
                        <span>8. AI Executive Principal Summaries</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Automated Principal briefings, Board of Governors memos, and Woreda status summaries.</p>
                </div>
                <Button onClick={() => window.print()} leftIcon={<Printer className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                    Print Executive Briefing
                </Button>
            </div>

            {/* Main AI Briefing Card */}
            <Card className="shadow-sm border-l-4 border-l-[#006b3f]">
                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                        <Brain className="w-5 h-5 mr-2 text-[#006b3f]" />
                        {aiData?.briefingTitle || "Weekly Principal Executive Intelligence Briefing"}
                    </CardTitle>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        Health Index: {aiData?.overallHealthIndex || "96.8 / 100"}
                    </span>
                </CardHeader>
                <CardContent className="py-6 space-y-4">
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-xs font-bold text-[#006b3f] uppercase">Generated Stamp</p>
                        <p className="text-xs text-emerald-800 mt-1">
                            {aiData?.generatedAt ? new Date(aiData.generatedAt).toLocaleString() : "Real-time AI Synthesis"}
                        </p>
                    </div>

                    <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl">
                        <p className="font-semibold text-gray-900 mb-1">Executive Summary Overview:</p>
                        <p>{aiData?.executiveSummary}</p>
                    </div>

                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-bold uppercase text-gray-700">Executive Takeaways & Directives:</p>
                        {aiData?.keyTakeaways?.map((takeaway: string, idx: number) => (
                            <div key={idx} className="flex items-start space-x-2 text-xs text-gray-800 bg-white p-3 rounded-lg border border-gray-200">
                                <CheckCircle2 className="w-4 h-4 text-[#006b3f] mt-0.5 flex-shrink-0" />
                                <span>{takeaway}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
