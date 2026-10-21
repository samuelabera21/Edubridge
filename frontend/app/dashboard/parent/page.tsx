"use client";

import { useAuth } from "../../../hooks/useAuth";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import { 
    Users, 
    GraduationCap, 
    Calendar, 
    MessageSquare, 
    ChevronDown, 
    AlertTriangle, 
    ShieldAlert, 
    TrendingDown, 
    CheckCircle2, 
    Megaphone 
} from "lucide-react";

export default function ParentDashboard() {
    const { authData } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [earlyWarningFlags, setEarlyWarningFlags] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);

    useEffect(() => {
        async function loadDashboardData() {
            try {
                const [profileRes, flagsRes, annRes] = await Promise.allSettled([
                    fetchApi("/parent/me"),
                    fetchApi("/support/early-warning"),
                    fetchApi("/communication/announcements?target=PARENTS")
                ]);

                if (profileRes.status === "fulfilled" && profileRes.value.ok) {
                    const profData = await profileRes.value.json();
                    setProfile(profData);
                }
                if (flagsRes.status === "fulfilled" && flagsRes.value.ok) {
                    const flagsData = await flagsRes.value.json();
                    setEarlyWarningFlags(Array.isArray(flagsData) ? flagsData : []);
                }
                if (annRes.status === "fulfilled" && annRes.value.ok) {
                    const annData = await annRes.value.json();
                    setAnnouncements(Array.isArray(annData) ? annData : []);
                }
            } catch (err) {
                console.error("Failed to load parent dashboard data:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-500 font-medium animate-pulse">Loading dashboard...</div>
            </div>
        );
    }

    const children = profile?.children || [];
    const hasChildren = children.length > 0;
    const currentChild = hasChildren ? children[selectedChildIndex]?.student : null;

    // Find the early warning assessment for the currently selected child
    const currentChildRisk = earlyWarningFlags.find((f: any) => f.studentId === currentChild?.id) || null;

    const overallStatus = currentChildRisk?.overallStatus || "GREEN";
    const currentAverage = currentChildRisk?.recentAverageScore !== null && currentChildRisk?.recentAverageScore !== undefined 
        ? `${currentChildRisk.recentAverageScore}%` 
        : "N/A";
    const attendancePercentage = currentChildRisk?.attendanceRate !== null && currentChildRisk?.attendanceRate !== undefined
        ? `${currentChildRisk.attendanceRate}%`
        : "100%";

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Child Selector */}
            {hasChildren ? (
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <span className="text-gray-500 text-sm font-medium">Viewing details for:</span>
                        <div className="flex gap-2">
                            {children.map((rel: any, idx: number) => (
                                <button
                                    key={rel.student.id || idx}
                                    onClick={() => setSelectedChildIndex(idx)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 border transition-colors ${
                                        selectedChildIndex === idx
                                            ? "bg-[#184973] text-white border-[#184973]"
                                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    <div className="w-5 h-5 rounded-full bg-blue-100 text-[#184973] flex items-center justify-center text-xs font-bold">
                                        {rel.student.firstName?.charAt(0) || "S"}
                                    </div>
                                    <span>{rel.student.firstName} {rel.student.lastName}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Overall Academic & Attendance Badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium">Status:</span>
                        {overallStatus === "RED" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <ShieldAlert className="w-3.5 h-3.5" /> Critical Attention
                            </span>
                        )}
                        {overallStatus === "YELLOW" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5" /> Needs Attention
                            </span>
                        )}
                        {overallStatus === "GREEN" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Good Standing
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
                    There is currently no student linked to your account. Please contact the school administration.
                </div>
            )}

            {/* AUTOMATED EARLY WARNING ALERT BANNER FOR PARENT */}
            {currentChildRisk && currentChildRisk.flags && currentChildRisk.flags.length > 0 && (
                <div className="space-y-3">
                    {currentChildRisk.flags.map((flag: any, index: number) => {
                        const isRed = flag.severity === "RED";
                        return (
                            <div 
                                key={index} 
                                className={`rounded-2xl p-5 border shadow-sm transition-all ${
                                    isRed 
                                        ? "bg-rose-50 border-rose-200 text-rose-950" 
                                        : "bg-amber-50 border-amber-200 text-amber-950"
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl flex-shrink-0 ${isRed ? "bg-rose-200 text-rose-700" : "bg-amber-200 text-amber-700"}`}>
                                        {flag.type === "ACADEMIC" ? <TrendingDown className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-base font-bold text-gray-900">{flag.title}</h3>
                                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                                isRed ? "bg-rose-600 text-white" : "bg-amber-600 text-white"
                                            }`}>
                                                {isRed ? "Urgent" : "Notice"}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                                            {flag.message}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Quick Stats / Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-[#184973] rounded-lg">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Current Average</p>
                        <p className="text-xl font-bold text-gray-900">{currentAverage}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className={`p-3 rounded-lg ${
                        currentChildRisk?.attendanceStatus === "RED" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                    }`}>
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
                        <p className="text-xl font-bold text-gray-900">{attendancePercentage}</p>
                        <span className="text-xs text-gray-400">MoE Minimum: 80%</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Consecutive Absences</p>
                        <p className="text-xl font-bold text-gray-900">
                            {currentChildRisk?.consecutiveAbsences || 0} days
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Megaphone className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Announcements</p>
                        <p className="text-xl font-bold text-gray-900">{announcements.length}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Academic Status Explanation */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900">Academic & Attendance Guidelines (MoE Policy)</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="border border-gray-100 rounded-xl p-4 bg-slate-50">
                                <h4 className="text-sm font-bold text-gray-900 mb-2">MoE Attendance Regulation (80% Rule)</h4>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Under Ethiopian Ministry of Education regulations, students must maintain at least 80% attendance in all instructional periods during a semester. If absences exceed 20%, the student is barred from examinations and must repeat the semester.
                                </p>
                            </div>

                            <div className="border border-gray-100 rounded-xl p-4 bg-slate-50">
                                <h4 className="text-sm font-bold text-gray-900 mb-2">Performance Trends & Grading Thresholds</h4>
                                <ul className="text-xs text-gray-600 space-y-2">
                                    <li>🔴 <strong>Score &lt; 50%:</strong> At-risk status; requires immediate academic intervention and remedial support.</li>
                                    <li>🔴 <strong>Sudden Drop (20%+ Decline):</strong> Flagged for early intervention when a student drops 20% or more compared to previous assessments.</li>
                                    <li>🟡 <strong>Score 50% – 70%:</strong> Moderate standing; opportunity for improvement through focused practice.</li>
                                    <li>🟢 <strong>Score &gt; 70%:</strong> Strong performance; continue encouraging consistent study habits.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Targeted Announcements Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-[#184973]" /> School Announcements
                            </h3>
                        </div>
                        <div className="p-6">
                            {announcements.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">No recent announcements.</p>
                            ) : (
                                <div className="space-y-3">
                                    {announcements.slice(0, 5).map((item: any) => {
                                        const isCritical = item.priority === "CRITICAL" || item.priority === "HIGH";
                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`p-3 rounded-lg border text-xs ${
                                                    isCritical 
                                                        ? "bg-rose-50 border-rose-200 text-rose-950" 
                                                        : "bg-gray-50 border-gray-200 text-gray-800"
                                                }`}
                                            >
                                                <span className="font-bold block mb-1">{item.title}</span>
                                                <p className="line-clamp-2 text-gray-600">{item.content}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
