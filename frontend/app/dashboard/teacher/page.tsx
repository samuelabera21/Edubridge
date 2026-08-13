"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import { BookOpen, Users, ClipboardList, Clock } from "lucide-react";

export default function TeacherDashboard() {
    const { authData } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchApi("/teacher/me");
                setProfile(data);
            } catch (err) {
                console.error("Failed to load teacher profile:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadProfile();
    }, []);

    if (loading) {
        return <div className="animate-pulse flex space-x-4">Loading your dashboard...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back, {authData?.user?.name?.split(' ')[0] || 'Teacher'}! 👋
                    </h1>
                    <p className="text-emerald-100 text-lg max-w-xl">
                        Here is an overview of your classes and tasks for today.
                    </p>
                </div>
                <BookOpen className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
            </div>

            {/* Quick Stats / Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Active Classes</p>
                        <p className="text-xl font-bold text-gray-900">{profile?.assignments?.length || "0"}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Students</p>
                        <p className="text-xl font-bold text-gray-900">120 (Placeholder)</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Grades</p>
                        <p className="text-xl font-bold text-gray-900">14</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Next Class</p>
                        <p className="text-xl font-bold text-gray-900">10:15 AM</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Schedule Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Today's Teaching Schedule</h3>
                            <button className="text-sm text-emerald-600 font-medium hover:text-emerald-700">View Full Roster</button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {/* Placeholder Schedule Items */}
                                {[
                                    { time: "08:30 AM", subject: "Mathematics", section: "Grade 9A", room: "Room 101" },
                                    { time: "10:15 AM", subject: "Mathematics", section: "Grade 9B", room: "Room 102" },
                                    { time: "01:00 PM", subject: "Advanced Calculus", section: "Grade 12A", room: "Room 304" },
                                ].map((cls, i) => (
                                    <div key={i} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                                        <div className="w-20 flex-shrink-0 text-sm font-medium text-gray-500">{cls.time}</div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{cls.subject} - {cls.section}</p>
                                            <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                                                <span>{cls.room}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <button className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded hover:bg-emerald-100 transition-colors">
                                                Take Attendance
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900">Needs Attention</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 text-sm">
                                    <span className="font-semibold block mb-1">Grade Submissions</span>
                                    Mid-term grades for Grade 9A are due in 2 days.
                                </div>
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-sm">
                                    <span className="font-semibold block mb-1">Parent Message</span>
                                    You have 1 unread message from a parent in Grade 9B.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100 text-center">
                        <h4 className="font-semibold text-emerald-900 mb-2">Demo Mode</h4>
                        <p className="text-sm text-emerald-700">This dashboard is a placeholder. The interactive features for taking attendance and grading will be built in Sprint 3 based on the foundational APIs.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
