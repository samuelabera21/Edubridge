"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import { Building2, FileText, CheckCircle, Clock } from "lucide-react";

export default function SupportStaffDashboard() {
    const { authData } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchApi("/support-staff/me");
                setProfile(data);
            } catch (err) {
                console.error("Failed to load Support Staff profile:", err);
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
            <div className="bg-gradient-to-r from-orange-600 to-amber-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome, {authData?.user?.name?.split(' ')[0] || 'Staff Member'}! 🏫
                    </h1>
                    <p className="text-orange-100 text-lg max-w-xl">
                        Overview of School Operations and Requests for {profile?.school?.name || "the School"}.
                    </p>
                </div>
                <Building2 className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
            </div>

            {/* Quick Stats / Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Open Tickets</p>
                        <p className="text-xl font-bold text-gray-900">18</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Resolved Today</p>
                        <p className="text-xl font-bold text-gray-900">12</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                        <p className="text-xl font-bold text-gray-900">4</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-[#006b3f] rounded-lg">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Facility Alerts</p>
                        <p className="text-xl font-bold text-gray-900">0</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Operations Activity Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Recent Service Requests</h3>
                            <button className="text-sm text-orange-600 font-medium hover:text-orange-700">View All Tickets</button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {/* Placeholder Activity Items */}
                                {[
                                    { type: "IT Support", desc: "Projector not working in Room 102", status: "Open" },
                                    { type: "Facilities", desc: "Broken desk in the library", status: "In Progress" },
                                    { type: "Registrar", desc: "Transcript request for Abebe Kebede", status: "Completed" },
                                ].map((req, i) => (
                                    <div key={i} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                                        <div className="w-24 flex-shrink-0 text-sm font-medium text-gray-500">{req.type}</div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{req.desc}</p>
                                            <div className="flex items-center space-x-3 mt-1 text-sm">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    req.status === 'Open' ? 'bg-amber-100 text-amber-800' :
                                                    req.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                    {req.status}
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
                                <div className="p-3 rounded-lg bg-orange-50 border border-orange-100 text-orange-800 text-sm">
                                    <span className="font-semibold block mb-1">New Enrollments</span>
                                    5 new student registrations require document verification.
                                </div>
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-blue-800 text-sm">
                                    <span className="font-semibold block mb-1">Upcoming Event</span>
                                    Set up auditorium seating for tomorrow's assembly.
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 text-center">
                        <h4 className="font-semibold text-orange-900 mb-2">Demo Mode</h4>
                        <p className="text-sm text-orange-700">This dashboard is a placeholder. Interactive features for handling support tickets and student records will be built in the next phase.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
