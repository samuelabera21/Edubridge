"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../../lib/api";
import { AlertCircle, Activity } from "lucide-react";

export default function StudentSupportPage() {
    const [overview, setOverview] = useState<any>({ activeFlags: [], recentInterventions: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetchApi("/vice-principal/support/students");
                if (res.ok) {
                    const data = await res.json();
                    setOverview(data);
                }
            } catch (err) {
                console.error("Failed to load student support data:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, []);

    if (loading) {
        return <div className="animate-pulse">Loading student support data...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Support & Interventions</h1>
                    <p className="text-gray-500">Monitor at-risk students and track active remedial activities.</p>
                </div>
                <div className="bg-rose-50 text-rose-700 px-4 py-2 rounded-lg font-medium flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>Active Alerts: {overview.activeFlags.length}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Support Flags */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                        <AlertCircle className="w-5 h-5 text-rose-500" />
                        <h2 className="font-semibold text-gray-900">At-Risk Students (Flagged)</h2>
                    </div>
                    <div className="p-0">
                        {overview.activeFlags.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No active support flags.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {overview.activeFlags.map((flag: any) => (
                                    <li key={flag.id} className="p-5 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{flag.studentName}</h3>
                                                <p className="text-xs text-gray-500">Grade: {flag.grade} • Flagged by {flag.raisedBy}</p>
                                            </div>
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                                                {flag.type}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-100 shadow-sm">
                                            "{flag.description}"
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Intervention Plans */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                        <Activity className="w-5 h-5 text-blue-500" />
                        <h2 className="font-semibold text-gray-900">Active Interventions</h2>
                    </div>
                    <div className="p-0">
                        {overview.recentInterventions.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No active interventions.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {overview.recentInterventions.map((plan: any, idx: number) => (
                                    <li key={idx} className="p-5 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{plan.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">{plan.studentCount} Students Enrolled</p>
                                            </div>
                                            <div className="flex flex-col items-end space-y-2">
                                                <span className="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-600">
                                                    {plan.type}
                                                </span>
                                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${plan.status === 'ONGOING' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                                                    {plan.status}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
