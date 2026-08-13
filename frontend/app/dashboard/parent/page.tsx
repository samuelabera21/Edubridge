"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import { Users, GraduationCap, Calendar, MessageSquare, ChevronDown } from "lucide-react";

export default function ParentDashboard() {
    const { authData } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchApi("/parent/me");
                setProfile(data);
            } catch (err) {
                console.error("Failed to load parent profile:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadProfile();
    }, []);

    if (loading) {
        return <div className="animate-pulse flex space-x-4">Loading your dashboard...</div>;
    }

    const children = profile?.children || [];
    const hasChildren = children.length > 0;

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back, {authData?.user?.name?.split(' ')[0] || 'Parent'}! 👋
                    </h1>
                    <p className="text-violet-100 text-lg max-w-xl">
                        Stay connected with your child's academic journey.
                    </p>
                </div>
                <Users className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
            </div>

            {hasChildren ? (
                <div className="flex items-center space-x-4 mb-6">
                    <span className="text-gray-500 font-medium">Viewing details for:</span>
                    <button className="bg-white border border-gray-200 px-4 py-2 rounded-lg shadow-sm flex items-center space-x-2 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                        <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold mr-1">
                            {children[0]?.student?.firstName?.charAt(0) || "S"}
                        </div>
                        <span>{children[0]?.student?.firstName || "Student"} {children[0]?.student?.lastName || ""}</span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
                    You do not have any children linked to your account yet. Please contact the school administrator.
                </div>
            )}

            {/* Quick Stats / Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-violet-50 text-violet-600 rounded-lg">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Current Average</p>
                        <p className="text-xl font-bold text-gray-900">89%</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Attendance</p>
                        <p className="text-xl font-bold text-gray-900">98%</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Unread Messages</p>
                        <p className="text-xl font-bold text-gray-900">2</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Upcoming Events</p>
                        <p className="text-xl font-bold text-gray-900">Parent-Teacher Night</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Recent Academic Activity</h3>
                            <button className="text-sm text-violet-600 font-medium hover:text-violet-700">View All</button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {/* Placeholder Activity Items */}
                                {[
                                    { date: "Today", action: "Grade Posted", detail: "Mathematics - Midterm Exam: A" },
                                    { date: "Yesterday", action: "Attendance", detail: "Present" },
                                    { date: "Oct 12", action: "Assignment Due", detail: "Science Project (Pending)" },
                                ].map((act, i) => (
                                    <div key={i} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                                        <div className="w-20 flex-shrink-0 text-sm font-medium text-gray-500">{act.date}</div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{act.action}</p>
                                            <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                                                <span>{act.detail}</span>
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
                            <h3 className="font-semibold text-gray-900">School Announcements</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                                    <span className="font-semibold block mb-1">Winter Break Schedule</span>
                                    School will be closed from Dec 20 to Jan 3.
                                </div>
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm">
                                    <span className="font-semibold block mb-1">Fundraiser Success!</span>
                                    Thank you to everyone who participated in the bake sale.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-violet-50 rounded-xl p-6 border border-violet-100 text-center">
                        <h4 className="font-semibold text-violet-900 mb-2">Demo Mode</h4>
                        <p className="text-sm text-violet-700">This dashboard is a placeholder. Interactive features to track grades and message teachers will be built in Sprint 3 based on the foundational APIs.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
