"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { Eye, Plus, Calendar, FileText, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";

export default function ObservationsPage() {
    const [observations, setObservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetchApi("/vice-principal/observations");
                if (res.ok) {
                    const data = await res.json();
                    setObservations(data);
                }
            } catch (err) {
                console.error("Failed to load observations:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, []);

    if (loading) {
        return <div className="animate-pulse">Loading observations...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Classroom Observations</h1>
                    <p className="text-gray-500">Schedule, record, and track academic supervision of teachers.</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition cursor-not-allowed opacity-50" title="Scheduling form coming in next PR">
                    <Plus className="w-5 h-5" />
                    <span>Schedule Observation</span>
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                    <Eye className="w-5 h-5 text-gray-500" />
                    <h2 className="font-semibold text-gray-900">Observation Log</h2>
                </div>
                
                <div className="p-0">
                    {observations.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                            <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-900">No observations scheduled</p>
                            <p className="mt-1">Click "Schedule Observation" to plan an academic supervision session.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {observations.map((obs) => (
                                <div key={obs.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-start space-x-4">
                                            <div className={`p-3 rounded-lg ${obs.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {obs.status === 'COMPLETED' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">
                                                    {obs.teacher.firstName} {obs.teacher.lastName}
                                                </h3>
                                                <div className="text-sm text-gray-500 flex items-center space-x-2 mt-1">
                                                    <span className="font-medium text-gray-700">{obs.subject.name}</span>
                                                    <span>•</span>
                                                    <span>{obs.schoolGrade.grade.name} {obs.section?.name ? `- ${obs.section.name}` : ''}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {new Date(obs.date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${obs.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                                            {obs.status}
                                        </div>
                                    </div>

                                    {/* Topic */}
                                    <div className="mb-4">
                                        <span className="text-xs font-bold text-gray-500 uppercase">Topic / Lesson</span>
                                        <p className="text-gray-900 font-medium">{obs.topic}</p>
                                    </div>

                                    {/* Expand details if completed */}
                                    {obs.status === 'COMPLETED' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-white p-4 rounded-lg border border-gray-100">
                                            <div>
                                                <span className="text-xs font-bold text-emerald-600 uppercase flex items-center mb-1"><Plus className="w-3 h-3 mr-1"/> Strengths</span>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{obs.strengths || "Not recorded"}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-amber-600 uppercase flex items-center mb-1"><AlertTriangle className="w-3 h-3 mr-1"/> Areas for Improvement</span>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{obs.weaknesses || "Not recorded"}</p>
                                            </div>
                                            <div className="md:col-span-2 pt-3 border-t border-gray-100 mt-2">
                                                <span className="text-xs font-bold text-blue-600 uppercase flex items-center mb-1"><FileText className="w-3 h-3 mr-1"/> Recommendations / Feedback</span>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{obs.recommendations || obs.feedback || "Not recorded"}</p>
                                            </div>
                                            {(obs.followUpAction || obs.followUpDate) && (
                                                <div className="md:col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                                                    <span className="text-xs font-bold text-blue-800 uppercase flex items-center mb-1">Follow-up Action</span>
                                                    <p className="text-sm text-blue-900">{obs.followUpAction}</p>
                                                    {obs.followUpDate && (
                                                        <p className="text-xs text-blue-700 mt-2 font-medium">Due: {new Date(obs.followUpDate).toLocaleDateString()}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex justify-end mt-4">
                                            <button className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-4 py-2 rounded-lg transition opacity-50 cursor-not-allowed" title="Completion form coming in next PR">
                                                Record Observation Notes
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
// Stub for AlertTriangle to avoid import error
const AlertTriangle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
);
