"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { Sparkles, BrainCircuit, ArrowRight, Lightbulb } from "lucide-react";

export default function AiInsightsPage() {
    const [overview, setOverview] = useState<any>({ summary: "", insights: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetchApi("/vice-principal/ai-insights");
                if (res.ok) {
                    const data = await res.json();
                    setOverview(data);
                }
            } catch (err) {
                console.error("Failed to load AI insights:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, []);

    if (loading) {
        return <div className="animate-pulse">Analyzing academic data with AI...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl shadow-md p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BrainCircuit className="w-48 h-48" />
                </div>
                <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center space-x-2 mb-4">
                        <Sparkles className="w-6 h-6 text-purple-300" />
                        <h1 className="text-3xl font-bold">AI Academic Assistant</h1>
                    </div>
                    <p className="text-indigo-100 text-lg mb-6 leading-relaxed">
                        {overview.summary || "Your AI assistant is actively monitoring student performance, attendance, and curriculum pacing to provide actionable recommendations."}
                    </p>
                    <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white border border-white/30 px-6 py-2.5 rounded-lg font-medium flex items-center space-x-2 transition-all">
                        <Sparkles className="w-4 h-4" />
                        <span>Run Fresh Analysis</span>
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900 px-1">Detected Insights & Recommendations</h2>
                
                {overview.insights.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
                        No critical insights detected at this time. All systems normal.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {overview.insights.map((insight: any) => (
                            <div key={insight.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden">
                                {insight.actionable && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                                )}
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <span className="text-xs font-bold tracking-wider uppercase text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full">
                                                {insight.category}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">{insight.title}</h3>
                                        <p className="text-gray-600 mb-4">{insight.description}</p>
                                        
                                        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex gap-3">
                                            <Lightbulb className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-indigo-900 mb-1">AI Recommendation</h4>
                                                <p className="text-sm text-indigo-800">{insight.recommendedAction}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {insight.actionable && (
                                        <div className="md:w-48 flex-shrink-0 pt-2">
                                            <button className="w-full bg-white border border-gray-300 hover:border-[#006b3f] hover:text-[#006b3f] text-gray-700 px-4 py-2.5 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors">
                                                <span>Take Action</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
