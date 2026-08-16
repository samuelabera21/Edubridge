"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { FileText, TrendingUp } from "lucide-react";

export default function AssessmentMonitoringPage() {
    const [overview, setOverview] = useState<any>({ recentAssessments: [], subjectPerformance: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetchApi("/vice-principal/assessments");
                if (res.ok) {
                    const data = await res.json();
                    setOverview(data);
                }
            } catch (err) {
                console.error("Failed to load assessment data:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, []);

    if (loading) {
        return <div className="animate-pulse">Loading assessment dashboard...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Assessment Monitoring</h1>
                    <p className="text-gray-500">Monitor assessment completion rates and class performance trends.</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-medium flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5" />
                    <span>Assessments Tracked: {overview.recentAssessments.length}</span>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    <h2 className="font-semibold text-gray-900">Recent Assessments & Pass Rates</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Assessment Title</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Grade</th>
                                <th className="px-6 py-4 text-center">Max Score</th>
                                <th className="px-6 py-4 text-center">Pass Rate</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {overview.recentAssessments.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No assessments recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                overview.recentAssessments.map((assessment: any) => (
                                    <tr key={assessment.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {assessment.title}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {assessment.subject}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {assessment.grade}
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-700">
                                            {assessment.maxScore}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`font-bold ${assessment.passRate >= 75 ? 'text-emerald-600' : assessment.passRate >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                    {assessment.passRate}%
                                                </span>
                                                <div className="w-full max-w-[80px] mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full ${assessment.passRate >= 75 ? 'bg-emerald-500' : assessment.passRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                                        style={{ width: `${assessment.passRate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
