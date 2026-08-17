"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { ClipboardCheck, AlertTriangle } from "lucide-react";

export default function AttendanceMonitoringPage() {
    const [overview, setOverview] = useState<any>({ trends: [], recentAbsences: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetchApi("/vice-principal/attendance");
                if (res.ok) {
                    const data = await res.json();
                    setOverview(data);
                }
            } catch (err) {
                console.error("Failed to load attendance data:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, []);

    if (loading) {
        return <div className="animate-pulse">Loading attendance dashboard...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Student Attendance</h1>
                    <p className="text-gray-500">Monitor school-wide daily attendance trends and students at risk.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium flex items-center space-x-2">
                    <ClipboardCheck className="w-5 h-5" />
                    <span>Overall Rate: {
                        overview.trends.length > 0 
                            ? Math.round(overview.trends.reduce((acc: number, val: any) => acc + val.rate, 0) / overview.trends.length)
                            : 0
                    }%</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 7-Day Trend */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                        <h2 className="font-semibold text-gray-900">7-Day Attendance Trend</h2>
                    </div>
                    <div className="p-6">
                        {overview.trends.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">No attendance data recorded yet.</div>
                        ) : (
                            <div className="space-y-4">
                                {overview.trends.map((day: any) => (
                                    <div key={day.date} className="flex items-center justify-between">
                                        <div className="w-24 text-sm font-medium text-gray-700">{day.date}</div>
                                        <div className="flex-1 mx-4 h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${day.rate > 90 ? 'bg-emerald-500' : day.rate > 80 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                                style={{ width: `${day.rate}%` }}
                                            />
                                        </div>
                                        <div className="w-12 text-right text-sm font-bold text-gray-900">{day.rate}%</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* At-Risk Students (Repeated Absences) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-rose-50">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                        <h2 className="font-semibold text-gray-900">At-Risk: Repeated Absences</h2>
                    </div>
                    <div className="p-0">
                        {overview.recentAbsences.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No students with repeated absences.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {overview.recentAbsences.map((record: any, idx: number) => (
                                    <li key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div>
                                            <h3 className="font-bold text-gray-900">
                                                {record.student.firstName} {record.student.lastName}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1">Grade: {record.grade}</p>
                                        </div>
                                        <div className="text-sm font-medium text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
                                            {record.count} Absences
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
