"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../../lib/api";
import { GraduationCap, Users } from "lucide-react";

export default function TeacherSupportPage() {
    const [overview, setOverview] = useState<any>({ teacherNeeds: [], trainingActivities: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetchApi("/vice-principal/support/teachers");
                if (res.ok) {
                    const data = await res.json();
                    setOverview(data);
                }
            } catch (err) {
                console.error("Failed to load teacher support data:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, []);

    if (loading) {
        return <div className="animate-pulse">Loading teacher support data...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Teacher Support & Training</h1>
                    <p className="text-gray-500">Monitor teacher workloads and manage professional development activities.</p>
                </div>
                <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-lg font-medium flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Teachers needing support: {overview.teacherNeeds.length}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Teachers Needing Support */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                        <Users className="w-5 h-5 text-amber-500" />
                        <h2 className="font-semibold text-gray-900">High Workload & Support Needs</h2>
                    </div>
                    <div className="p-0">
                        {overview.teacherNeeds.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">All teachers are currently within normal workload limits.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {overview.teacherNeeds.map((teacher: any) => (
                                    <li key={teacher.id} className="p-5 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{teacher.name}</h3>
                                                <p className="text-sm text-gray-500 mt-1">Assigned Classes: {teacher.classCount}</p>
                                            </div>
                                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                {teacher.reason}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Training Activities */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                        <GraduationCap className="w-5 h-5 text-indigo-500" />
                        <h2 className="font-semibold text-gray-900">Professional Development</h2>
                    </div>
                    <div className="p-0">
                        {overview.trainingActivities.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No training activities planned.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {overview.trainingActivities.map((activity: any) => (
                                    <li key={activity.id} className="p-5 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{activity.title}</h3>
                                                <p className="text-sm text-gray-500 mt-1">Scheduled: {activity.date}</p>
                                            </div>
                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${activity.status === 'UPCOMING' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {activity.status}
                                            </span>
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
