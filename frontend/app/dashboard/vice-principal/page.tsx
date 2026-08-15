"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import { BookOpen, Users, ClipboardList, TrendingUp } from "lucide-react";

export default function VicePrincipalDashboard() {
    const { authData } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchApi("/vice-principal/me");
                setProfile(data);
            } catch (err) {
                console.error("Failed to load VP profile:", err);
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
            <div className="bg-gradient-to-r from-blue-700 to-indigo-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome, {authData?.user?.name?.split(' ')[0] || 'Vice Principal'}! 🎓
                    </h1>
                    <p className="text-blue-100 text-lg max-w-xl">
                        Academic Leadership Overview for {profile?.school?.name || "the School"}.
                    </p>
                </div>
                <BookOpen className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
            </div>

            {/* Quick Stats / Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-lg">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Active Teachers</p>
                        <p className="text-xl font-bold text-gray-900">42</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Curriculum Sets</p>
                        <p className="text-xl font-bold text-gray-900">12</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Avg Attendance</p>
                        <p className="text-xl font-bold text-gray-900">95.4%</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <ClipboardList className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                        <p className="text-xl font-bold text-gray-900">5</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Academic Activity Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Recent Academic Activity</h3>
                            <button className="text-sm text-blue-500 font-medium hover:text-blue-700">View Report</button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {/* Placeholder Activity Items */}
                                {[
                                    { dept: "Mathematics", update: "Term 1 Syllabus Completed", status: "On Track" },
                                    { dept: "Science", update: "Lab Equipment Request Pending Approval", status: "Action Required" },
                                    { dept: "English", update: "Mid-term Assessments Graded", status: "Completed" },
                                ].map((act, i) => (
                                    <div key={i} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                                        <div className="w-24 flex-shrink-0 text-sm font-medium text-gray-500">{act.dept}</div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{act.update}</p>
                                            <div className="flex items-center space-x-3 mt-1 text-sm">
                                                <span className={`${act.status === 'Action Required' ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                    {act.status}
                                                </span>
                                            </div>
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
                            <h3 className="font-semibold text-gray-900">Action Items</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-800 text-sm">
                                    <span className="font-semibold block mb-1">Teacher Evaluations</span>
                                    3 evaluations for the Science department are overdue.
                                </div>
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-sm">
                                    <span className="font-semibold block mb-1">Schedule Conflict</span>
                                    Room 102 has a double-booking on Thursday at 10 AM.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 text-center">
                        <h4 className="font-semibold text-blue-900 mb-2">Demo Mode</h4>
                        <p className="text-sm text-blue-700">This dashboard is a placeholder. Interactive features for curriculum management and teacher evaluations will be built in the next phase.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
