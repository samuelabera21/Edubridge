"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { Clock, CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

export default function TeachingActivityPage() {
    const [activity, setActivity] = useState<any>({ scheduled: 0, completed: 0, missed: 0, lessons: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetchApi("/vice-principal/teaching/today");
                if (res.ok) {
                    const data = await res.json();
                    setActivity(data);
                }
            } catch (err) {
                console.error("Failed to load teaching activity data:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, []);

    if (loading) {
        return <div className="animate-pulse">Loading teaching activity...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Today's Teaching Activity</h1>
                    <p className="text-gray-500">Monitor lesson continuity and timetable execution for today.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Clock className="w-6 h-6"/></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Scheduled Lessons</p>
                        <p className="text-2xl font-bold text-gray-900">{activity.scheduled}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-6 h-6"/></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Completed Lessons</p>
                        <p className="text-2xl font-bold text-gray-900">{activity.completed}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-rose-200 p-6 flex items-center space-x-4 bg-rose-50 shadow-sm">
                    <div className="p-3 bg-rose-100 text-rose-600 rounded-lg"><AlertTriangle className="w-6 h-6"/></div>
                    <div>
                        <p className="text-sm font-medium text-rose-600">Missed Lessons</p>
                        <p className="text-2xl font-bold text-rose-700">{activity.missed}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                    <h2 className="font-semibold text-gray-900">Today's Timetable Execution</h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                                <th className="px-6 py-4">Time</th>
                                <th className="px-6 py-4">Class</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Teacher</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {activity.lessons.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No lessons scheduled for today.
                                    </td>
                                </tr>
                            ) : (
                                activity.lessons.map((lesson: any) => (
                                    <tr key={lesson.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{lesson.period}</div>
                                            <div className="text-xs text-gray-500">{lesson.time}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium">{lesson.grade}</span> - {lesson.section}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">
                                            {lesson.subject}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">
                                            {lesson.teacher}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {lesson.status === 'MISSED' ? (
                                                <div className="flex flex-col items-center">
                                                    <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-full font-medium mb-1">
                                                        Missed
                                                    </span>
                                                    <span className="text-[10px] text-rose-500 flex items-center">
                                                        <AlertCircle className="w-3 h-3 mr-1" /> {lesson.reason}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-medium">
                                                    Completed
                                                </span>
                                            )}
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
