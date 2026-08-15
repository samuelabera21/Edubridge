"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import { Scale, Users, FileBarChart, MessageSquare } from "lucide-react";

export default function CommitteeDashboard() {
    const { authData } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchApi("/committee/me");
                setProfile(data);
            } catch (err) {
                console.error("Failed to load Committee profile:", err);
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
            <div className="bg-gradient-to-r from-teal-700 to-cyan-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome, {authData?.user?.name?.split(' ')[0] || 'Committee Member'}! 🤝
                    </h1>
                    <p className="text-teal-100 text-lg max-w-xl">
                        School Committee Portal for {profile?.school?.name || "the School"}.
                    </p>
                </div>
                <Scale className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
            </div>

            {/* Quick Stats / Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Upcoming Meetings</p>
                        <p className="text-xl font-bold text-gray-900">2</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-lg">
                        <FileBarChart className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Reports</p>
                        <p className="text-xl font-bold text-gray-900">1</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Community Feedback</p>
                        <p className="text-xl font-bold text-gray-900">8</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
                        <Scale className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Disciplinary Cases</p>
                        <p className="text-xl font-bold text-gray-900">0</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Committee Activity Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Recent Board Activity</h3>
                            <button className="text-sm text-teal-600 font-medium hover:text-teal-700">View All Documents</button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {/* Placeholder Activity Items */}
                                {[
                                    { title: "Q2 Budget Review Minutes", date: "Oct 15", category: "Meeting Minutes" },
                                    { title: "Parent-Teacher Association Policy Update", date: "Oct 10", category: "Policy Draft" },
                                    { title: "Annual Science Fair Planning", date: "Oct 05", category: "Committee Notes" },
                                ].map((doc, i) => (
                                    <div key={i} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                                        <div className="w-20 flex-shrink-0 text-sm font-medium text-gray-500">{doc.date}</div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{doc.title}</p>
                                            <div className="flex items-center space-x-3 mt-1 text-sm text-teal-700">
                                                <span>{doc.category}</span>
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
                            <h3 className="font-semibold text-gray-900">Announcements</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="p-3 rounded-lg bg-teal-50 border border-teal-100 text-teal-800 text-sm">
                                    <span className="font-semibold block mb-1">Next PTA Meeting</span>
                                    Scheduled for Friday at 6:00 PM in the Main Auditorium.
                                </div>
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-800 text-sm">
                                    <span className="font-semibold block mb-1">Feedback Collection</span>
                                    The survey for the new lunch menu closes this week.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-teal-50 rounded-xl p-6 border border-teal-100 text-center">
                        <h4 className="font-semibold text-teal-900 mb-2">Demo Mode</h4>
                        <p className="text-sm text-teal-700">This dashboard is a placeholder. Interactive features for document sharing and committee voting will be built in the next phase.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
