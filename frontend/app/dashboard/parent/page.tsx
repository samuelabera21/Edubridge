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

                if (profileRes.status === "fulfilled") {
                    setProfile(profileRes.value);
                }
                if (flagsRes.status === "fulfilled") {
                    setEarlyWarningFlags(Array.isArray(flagsRes.value) ? flagsRes.value : []);
                }
                if (annRes.status === "fulfilled") {
                    const data = annRes.value;
                    setAnnouncements(Array.isArray(data) ? data : []);
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
                <div className="text-gray-500 font-medium animate-pulse">መረጃዎችን በማዘጋጀት ላይ (Loading dashboard)...</div>
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
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold mb-2">
                        እንኳን ደህና መጡ (Welcome back), {authData?.user?.name?.split(' ')[0] || 'Parent'}! 👋
                    </h1>
                    <p className="text-violet-100 text-lg max-w-xl">
                        የልጅዎን የትምህርት ውጤት፣ የመገኘት ሁኔታ እና የትምህርት ቤት ማሳሰቢያዎች በቀጥታ ይከታተሉ።
                    </p>
                </div>
                <Users className="absolute -right-10 -bottom-10 w-64 h-64 text-white opacity-10 transform -rotate-12" />
            </div>

            {/* Child Selector */}
            {hasChildren ? (
                <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-3">
                        <span className="text-gray-500 text-sm font-medium">የተማሪ ዝርዝር (Viewing details for):</span>
                        <div className="flex gap-2">
                            {children.map((rel: any, idx: number) => (
                                <button
                                    key={rel.student.id || idx}
                                    onClick={() => setSelectedChildIndex(idx)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 border transition-colors ${
                                        selectedChildIndex === idx
                                            ? "bg-violet-50 text-violet-700 border-violet-200"
                                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                                    }`}
                                >
                                    <div className="w-5 h-5 rounded-full bg-violet-200 text-violet-800 flex items-center justify-center text-xs font-bold">
                                        {rel.student.firstName?.charAt(0) || "S"}
                                    </div>
                                    <span>{rel.student.firstName} {rel.student.lastName}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Overall Academic & Attendance Badge */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-medium">አጠቃላይ ሁኔታ:</span>
                        {overallStatus === "RED" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                <ShieldAlert className="w-3.5 h-3.5" /> 🔴 አስቸኳይ ክትትል የሚሻ (Critical Attention)
                            </span>
                        )}
                        {overallStatus === "YELLOW" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3.5 h-3.5" /> 🟡 ማሻሻል የሚሻ (Needs Attention)
                            </span>
                        )}
                        {overallStatus === "GREEN" && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> 🟢 በጥሩ ሁኔታ ላይ (Good Standing)
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
                    በአሁኑ ሰዓት ከመለያዎ ጋር የተገናኘ ተማሪ የለም። እባክዎ የትምህርት ቤቱን አስተዳዳሪ ያነጋግሩ።
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
                                                {isRed ? "አስቸኳይ" : "ማሳሰቢያ"}
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
                    <div className="p-3 bg-violet-50 text-violet-600 rounded-lg">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">አማካይ ውጤት (Current Average)</p>
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
                        <p className="text-sm font-medium text-gray-500">የመገኘት ምጣኔ (Attendance)</p>
                        <p className="text-xl font-bold text-gray-900">{attendancePercentage}</p>
                        <span className="text-xs text-gray-400">የትምህርት ሚኒስቴር ገደብ፡ 80%</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">ተከታታይ መቅረት (Absences)</p>
                        <p className="text-xl font-bold text-gray-900">
                            {currentChildRisk?.consecutiveAbsences || 0} ቀን
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                        <Megaphone className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">ማስታወቂያዎች (Announcements)</p>
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
                            <h3 className="font-semibold text-gray-900">የትምህርት እና የመገኘት ክትትል መመሪያ (MoE & Academic Rules)</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="border border-gray-100 rounded-xl p-4 bg-slate-50">
                                <h4 className="text-sm font-bold text-gray-900 mb-2">📜 የኢትዮጵያ ትምህርት ሚኒስቴር የመገኘት ደንብ (80% Rule)</h4>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    በሚኒስቴሩ መመሪያ መሰረት ማንኛውም ተማሪ በሴሚስተሩ ከ 80% በላይ በክፍል መገኘት አለበት። የመቅረት ምጣኔው ከ 20% በላይ ከደረሰ ተማሪው ፈተና መውሰድ የማይችል ሲሆን ሴሚስተሩን የመድገም ግዴታ አለበት።
                                </p>
                            </div>

                            <div className="border border-gray-100 rounded-xl p-4 bg-slate-50">
                                <h4 className="text-sm font-bold text-gray-900 mb-2">📊 የአዝማሚያ ትንተና እና ውጤት ክትትል (Trend & Grading)</h4>
                                <ul className="text-xs text-gray-600 space-y-2">
                                    <li>🔴 <strong>ውጤት &lt; 50%፦</strong> የመውደቅ አደጋ ተጋርጦበታል፤ ወዲያውኑ ድጋፍ ያስፈልጋል።</li>
                                    <li>🔴 <strong>ድንገተኛ ውድቀት (20%+ Drop)፦</strong> ተማሪው ካለፈው አማካዩ በ 20% እና ከዚያ በላይ ከቀነሰ ልዩ ክትትል ይደረጋል።</li>
                                    <li>🟡 <strong>ውጤት 50% – 70%፦</strong> ማሻሻል የሚችልበት ምቹ ሁኔታ ስላለ ተጨማሪ ጥረት ያስፈልጋል።</li>
                                    <li>🟢 <strong>ውጤት &gt; 70%፦</strong> ጥሩ ውጤት፤ እንዲቀጥልበት ማበረታታት።</li>
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
                                <Megaphone className="w-4 h-4 text-violet-600" /> የትምህርት ቤት ማስታወቂያዎች
                            </h3>
                        </div>
                        <div className="p-6">
                            {announcements.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">ምንም አዲስ ማስታወቂያ የለም።</p>
                            ) : (
                                <div className="space-y-3">
                                    {announcements.slice(0, 5).map((item: any) => {
                                        const isCritical = item.priority === "CRITICAL" || item.priority === "HIGH";
                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`p-3 rounded-lg border text-xs ${
                                                    isCritical 
                                                        ? "bg-rose-50 border-rose-200 text-rose-900" 
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
