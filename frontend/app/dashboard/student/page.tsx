"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import { GraduationCap, Calendar, Book, Clock } from "lucide-react";

export default function StudentDashboard() {
    const { authData } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const data = await fetchApi("/student/me");
                setProfile(data);
            } catch (err) {
                console.error("Failed to load student profile:", err);
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
            <div className="bg-gradient-to-r from-blue-600 to-sky-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        Welcome back, {authData?.user?.name?.split(' ')[0] || 'Student'}! 👋
                    </h1>
                    <p className="text-blue-100 text-lg max-w-xl">
                        Here is an overview of your academic progress for the {profile?.academicYear?.name || "current"} school year.
                    </p>
                </div>
                <GraduationCap className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
            </div>

            {/* Quick Stats / Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Current Grade</p>
                        <p className="text-xl font-bold text-gray-900">{profile?.schoolGrade?.grade?.name || "Grade 9"}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Section</p>
                        <p className="text-xl font-bold text-gray-900">{profile?.section?.name || "Not Assigned"}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                        <Book className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Enrolled Subjects</p>
                        <p className="text-xl font-bold text-gray-900">8 (Placeholder)</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
                        <p className="text-xl font-bold text-gray-900">95% (Placeholder)</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Schedule Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Today's Schedule</h3>
                            <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View Full</button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                {/* Placeholder Schedule Items */}
                                {[
                                    { time: "08:30 AM", subject: "Mathematics", room: "Room 101", teacher: "Mr. Abebe" },
                                    { time: "10:15 AM", subject: "Physics", room: "Lab 2", teacher: "Ms. Sara" },
                                    { time: "11:30 AM", subject: "English Literature", room: "Room 205", teacher: "Mr. Dawit" },
                                ].map((cls, i) => (
                                    <div key={i} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors border border-gray-50">
                                        <div className="w-20 flex-shrink-0 text-sm font-medium text-gray-500">{cls.time}</div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{cls.subject}</p>
                                            <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                                                <span>{cls.teacher}</span>
                                                <span>•</span>
                                                <span>{cls.room}</span>
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
                            <h3 className="font-semibold text-gray-900">Recent Assignments</h3>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div className="p-3 rounded-lg bg-orange-50 border border-orange-100 text-orange-800 text-sm">
                                    <span className="font-semibold block mb-1">Math Homework 4</span>
                                    Due tomorrow at 11:59 PM
                                </div>
                                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-gray-700 text-sm">
                                    <span className="font-semibold block mb-1">Physics Lab Report</span>
                                    Due next Monday
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-100 text-center">
                        <h4 className="font-semibold text-blue-900 mb-2">Demo Mode</h4>
                        <p className="text-sm text-blue-700">This dashboard is a placeholder. The interactive features will be built by your team in Sprint 3 based on the foundational APIs.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
