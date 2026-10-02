"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    School,
    Users,
    GraduationCap,
    Plus,
    UserPlus,
    RefreshCw,
    Search,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    ArrowUpRight,
    X,
    ExternalLink
} from "lucide-react";

export interface SchoolAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
}

export interface SchoolItem {
    id: string;
    name: string;
    type: "SCHOOL";
    parentId: string | null;
    studentsCount: number;
    teachersCount: number;
    admin: SchoolAdmin | null;
}

export interface WoredaOverviewData {
    woredaId: string | null;
    woredaName: string;
    parentZoneName: string;
    counts: {
        totalSchools: number;
        totalStudents: number;
        totalTeachers: number;
    };
    schools: SchoolItem[];
}

export default function WoredaDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams?.get("tab") || "overview";
    const targetOrgId = searchParams?.get("targetOrgId");

    const [data, setData] = useState<WoredaOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Selected / Hovered School on Map
    const [hoveredSchool, setHoveredSchool] = useState<SchoolItem | null>(null);

    // Drill-Down Modal state
    const [selectedSchoolForDrilldown, setSelectedSchoolForDrilldown] = useState<SchoolItem | null>(null);

    // Modal State: Create School
    const [createSchoolOpen, setCreateSchoolOpen] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState("");
    const [newSchoolCode, setNewSchoolCode] = useState("");
    const [newSchoolAddress, setNewSchoolAddress] = useState("");
    const [newSchoolPhone, setNewSchoolPhone] = useState("");
    const [creatingSchool, setCreatingSchool] = useState(false);
    const [createSchoolMessage, setCreateSchoolMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal State: Assign School Principal / Administrator
    const [assignAdminOpen, setAssignAdminOpen] = useState(false);
    const [selectedSchoolForAdmin, setSelectedSchoolForAdmin] = useState<SchoolItem | null>(null);
    const [adminFullName, setAdminFullName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [assigningAdmin, setAssigningAdmin] = useState(false);
    const [assignAdminMessage, setAssignAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Action state for resend/cancel
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const loadWoredaData = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = targetOrgId
                ? `/hierarchy/woredas/${targetOrgId}/overview`
                : `/hierarchy/woreda/overview`;
            const res = await fetchApi(endpoint);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load Woreda Overview");
            }
            const payload = await res.json();
            setData(payload.data);
            if (payload.data?.schools && payload.data.schools.length > 0) {
                setHoveredSchool(payload.data.schools[0]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch Woreda dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWoredaData();
    }, [targetOrgId]);

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Filter schools by search query
    const filteredSchools = useMemo(() => {
        if (!data?.schools) return [];
        if (!searchQuery.trim()) return data.schools;
        const q = searchQuery.toLowerCase();
        return data.schools.filter(
            s =>
                s.name.toLowerCase().includes(q) ||
                (s.admin?.name && s.admin.name.toLowerCase().includes(q)) ||
                (s.admin?.email && s.admin.email.toLowerCase().includes(q))
        );
    }, [data?.schools, searchQuery]);

    // Extract all administrators for Administration tab
    const assignedAdministrators = useMemo(() => {
        if (!data?.schools) return [];
        return data.schools
            .filter(s => s.admin !== null)
            .map(s => ({
                schoolId: s.id,
                schoolName: s.name,
                admin: s.admin!
            }));
    }, [data?.schools]);

    // Format number helper
    const fmt = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Calculate real proportions for Card 1
    const totalSchools = data?.counts?.totalSchools ?? 0;
    const totalStudents = data?.counts?.totalStudents ?? 0;
    const totalTeachers = data?.counts?.totalTeachers ?? 0;
    const totalIndividuals = totalStudents + totalTeachers;
    const studentsPercentage = totalIndividuals > 0 ? ((totalStudents / totalIndividuals) * 100).toFixed(1) : "100.0";
    const teachersPercentage = totalIndividuals > 0 ? ((totalTeachers / totalIndividuals) * 100).toFixed(1) : "0.0";

    const realSchools = data?.schools ?? [];
    const maxStudentsCount = useMemo(() => {
        if (realSchools.length === 0) return 10;
        const max = Math.max(...realSchools.map(s => s.studentsCount));
        return Math.max(max, 4);
    }, [realSchools]);

    // Generate clean step values for Y-axis
    const yAxisSteps = useMemo(() => {
        const top = Math.ceil(maxStudentsCount);
        const step = Math.max(1, Math.ceil(top / 4));
        const steps = [];
        for (let i = top; i >= 0; i -= step) {
            steps.push(i);
        }
        if (steps[steps.length - 1] !== 0) {
            steps.push(0);
        }
        return steps;
    }, [maxStudentsCount]);

    // Handle Create School Submit
    const handleCreateSchoolSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSchoolName.trim() || !data?.woredaId) return;

        setCreatingSchool(true);
        setCreateSchoolMessage(null);
        try {
            const res = await fetchApi("/hierarchy/schools/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newSchoolName.trim(),
                    woredaId: data.woredaId,
                    address: newSchoolAddress.trim() || undefined,
                    phoneNumber: newSchoolPhone.trim() || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to register School");
            }

            setCreateSchoolMessage({
                type: "success",
                text: `School "${newSchoolName.trim()}" registered successfully.`
            });

            await loadWoredaData();

            setTimeout(() => {
                setCreateSchoolOpen(false);
                setNewSchoolName("");
                setNewSchoolCode("");
                setNewSchoolAddress("");
                setNewSchoolPhone("");
                setCreateSchoolMessage(null);
            }, 800);
        } catch (err: any) {
            setCreateSchoolMessage({
                type: "error",
                text: err.message || "Could not register School"
            });
        } finally {
            setCreatingSchool(false);
        }
    };

    // Open Assign Admin Modal
    const openAssignAdmin = (school: SchoolItem) => {
        setSelectedSchoolForAdmin(school);
        setAdminFullName("");
        setAdminEmail("");
        setAdminPhone("");
        setAssignAdminMessage(null);
        setAssignAdminOpen(true);
    };

    // Handle Assign School Admin / Principal Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchoolForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/schools/${selectedSchoolForAdmin.id}/assign-principal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: adminFullName.trim(),
                    email: adminEmail.trim(),
                    phone: adminPhone.trim() || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to send invitation");
            }

            setAssignAdminMessage({
                type: "success",
                text: `Invitation sent to ${adminEmail.trim()}.`
            });

            await loadWoredaData();

            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedSchoolForAdmin(null);
                setAdminFullName("");
                setAdminEmail("");
                setAdminPhone("");
                setAssignAdminMessage(null);
            }, 1000);
        } catch (err: any) {
            setAssignAdminMessage({
                type: "error",
                text: err.message || "Failed to send invitation"
            });
        } finally {
            setAssigningAdmin(false);
        }
    };

    // Handle Resend Invitation
    const handleResendInvitation = async (schoolId: string) => {
        setActionLoadingId(schoolId);
        try {
            const res = await fetchApi(`/hierarchy/schools/${schoolId}/resend-invitation`, {
                method: "POST"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to resend invitation");

            showToast("success", resJson.message || "Invitation resent.");
            await loadWoredaData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (schoolId: string) => {
        if (!confirm("Are you sure you want to cancel this school principal invitation?")) return;
        setActionLoadingId(schoolId);
        try {
            const res = await fetchApi(`/hierarchy/schools/${schoolId}/cancel-invitation`, {
                method: "DELETE"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to cancel invitation");

            showToast("success", "Invitation cancelled.");
            await loadWoredaData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to cancel invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    const targetParam = targetOrgId ? `&targetOrgId=${targetOrgId}` : "";
    const targetQueryOnly = targetOrgId ? `?targetOrgId=${targetOrgId}` : "";

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
            {toastMessage && (
                <div
                    className={`fixed top-4 right-4 z-50 p-3.5 rounded-lg shadow-md border text-xs font-semibold flex items-center gap-2 ${
                        toastMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                            : "bg-rose-50 text-rose-900 border-rose-200"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Top Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6 border-b border-slate-200 w-full sm:w-auto">
                    <button
                        onClick={() => router.push(`/dashboard/woreda${targetQueryOnly}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "overview"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/woreda?tab=schools${targetParam}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "schools"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <School className="w-3.5 h-3.5" />
                        <span>Schools ({data?.counts?.totalSchools ?? 0})</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/woreda?tab=administration${targetParam}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "administration"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Leadership ({assignedAdministrators.length})</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                        onClick={() => {
                            setNewSchoolName("");
                            setNewSchoolCode("");
                            setNewSchoolAddress("");
                            setNewSchoolPhone("");
                            setCreateSchoolMessage(null);
                            setCreateSchoolOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add School</span>
                    </button>
                    <button
                        onClick={loadWoredaData}
                        className="p-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={loadWoredaData}
                        className="px-3 py-1 bg-rose-600 text-white font-semibold rounded hover:bg-rose-700 cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {currentTab === "overview" && (
                <div className="space-y-6">
                    {/* Top Row: 2 Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        
                        {/* CARD 1 (Top-Left): Woreda Educational Proportion (Donut Chart) */}
                        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Woreda Educational Proportion
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Student and teacher educational community ratio in this woreda">
                                    i
                                </span>
                            </div>

                            {/* Donut Chart with real database total in center */}
                            <div className="flex flex-col items-center justify-center py-2 relative">
                                <svg className="w-48 h-48 -rotate-90" viewBox="0 0 120 120">
                                    {/* Background circle track */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="46"
                                        stroke="#f1f5f9"
                                        strokeWidth="16"
                                        fill="transparent"
                                    />
                                    {/* Students Segment (Sky Blue #38bdf8) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="46"
                                        stroke="#38bdf8"
                                        strokeWidth="16"
                                        strokeDasharray={`${(parseFloat(studentsPercentage) / 100) * 289} 289`}
                                        strokeLinecap="butt"
                                        fill="transparent"
                                        className="transition-all duration-700 ease-out"
                                    />
                                    {/* Teachers Segment (Deep Navy #0f172a) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="46"
                                        stroke="#0f172a"
                                        strokeWidth="16"
                                        strokeDasharray={`${(parseFloat(teachersPercentage) / 100) * 289} 289`}
                                        strokeDashoffset={`-${(parseFloat(studentsPercentage) / 100) * 289}`}
                                        strokeLinecap="butt"
                                        fill="transparent"
                                        className="transition-all duration-700 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-black text-slate-900 tracking-tight">
                                        {fmt(totalSchools)}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Schools</span>
                                </div>
                            </div>

                            {/* Legend Dot indicators */}
                            <div className="flex items-center justify-center gap-6 text-xs text-slate-600">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                    <span>Students ({totalStudents})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                                    <span>Teachers ({totalTeachers})</span>
                                </div>
                            </div>

                            {/* 2 Bottom Metric Boxes with Real Data */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="p-3.5 rounded-xl bg-[#e0f2fe]/60 text-center space-y-0.5">
                                    <span className="text-sm font-black text-[#0369a1]">
                                        {fmt(totalStudents)}
                                    </span>
                                    <p className="text-[11px] font-bold text-[#0369a1]">Total Students</p>
                                </div>
                                <div className="p-3.5 rounded-xl bg-[#e0f2fe]/60 text-center space-y-0.5">
                                    <span className="text-sm font-black text-[#0369a1]">
                                        {fmt(totalTeachers)}
                                    </span>
                                    <p className="text-[11px] font-bold text-[#0369a1]">Total Teachers</p>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2 (Top-Right): School Institutional Distribution (Blue Circular Cards with Hover Tooltips) */}
                        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                        School Institutional Distribution
                                    </h2>
                                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Active school institutions registered in this woreda">
                                        i
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                    {realSchools.length} Active {realSchools.length === 1 ? "School" : "Schools"}
                                </span>
                            </div>

                            {/* Blue Circular Island Canvas */}
                            <div className="relative w-full min-h-[240px] bg-slate-50/60 rounded-2xl flex items-center justify-center p-6 border border-slate-100 overflow-hidden">
                                {realSchools.length === 0 ? (
                                    <div className="text-center text-slate-400 text-xs py-8">
                                        No schools registered yet. Click <strong>Add School</strong> to add an educational institution.
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center justify-center gap-6 relative z-10">
                                        {realSchools.map((school, idx) => {
                                            const bgGradients = [
                                                "bg-gradient-to-br from-[#0284c7] to-[#0369a1]",
                                                "bg-gradient-to-br from-[#38bdf8] to-[#0284c7]",
                                                "bg-gradient-to-br from-[#0369a1] to-[#0f172a]",
                                                "bg-gradient-to-br from-[#7dd3fc] to-[#0284c7]"
                                            ];
                                            const bgClass = bgGradients[idx % bgGradients.length];

                                            return (
                                                <div
                                                    key={school.id}
                                                    onMouseEnter={() => setHoveredSchool(school)}
                                                    onClick={() => setSelectedSchoolForDrilldown(school)}
                                                    className={`w-40 h-40 ${bgClass} rounded-full shadow-lg shadow-blue-500/10 flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl p-4 text-center group relative`}
                                                >
                                                    {/* School Title in crisp white */}
                                                    <span className="text-xs font-bold tracking-tight text-white line-clamp-2 drop-shadow-xs">
                                                        {school.name}
                                                    </span>

                                                    {/* Short badge */}
                                                    <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold backdrop-blur-xs">
                                                        {school.studentsCount} {school.studentsCount === 1 ? "Student" : "Students"}
                                                    </span>

                                                    {/* Floating White Tooltip on Hover matching template */}
                                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-3.5 py-1.5 rounded-xl shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-20">
                                                        <p className="text-[11px] font-bold text-slate-900">{school.name}</p>
                                                        <p className="text-[10px] font-black text-blue-600">
                                                            {school.studentsCount} Students • {school.teachersCount} Teachers
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Scale Legend */}
                            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0369a1]" />
                                    <span>High Enrollment</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                    <span>Standard Growth</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#7dd3fc]" />
                                    <span>Developing</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Full-Width Card: Students & Teachers per School */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Students & Teachers per School
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Comparative school telemetry showing students (left) and teachers (right)">
                                    i
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" /> Left: Students
                                </span>
                                <span className="flex items-center gap-1.5 text-[#0284c7]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Right: Teachers
                                </span>
                            </div>
                        </div>

                        {/* Chart Grid and Stacked Bars */}
                        <div className="w-full overflow-x-auto pb-8 pt-2">
                            <div className="min-w-[500px] h-72 flex flex-col justify-between relative pl-12 pr-12 pt-4">
                                {/* Horizontal Grid Lines and Dual Y-Axis Labels (Left: Students, Right: Teachers) */}
                                <div className="absolute inset-0 pl-12 pr-12 pointer-events-none flex flex-col justify-between">
                                    {yAxisSteps.map(val => (
                                        <div key={val} className="w-full flex items-center justify-between relative">
                                            {/* Left Y-Axis: Students */}
                                            <span className="absolute -left-12 text-[11px] font-bold text-slate-500 w-10 text-right">
                                                {val}
                                            </span>
                                            {/* Horizontal Grid Line */}
                                            <div className="w-full border-b border-dashed border-slate-200" />
                                            {/* Right Y-Axis: Teachers */}
                                            <span className="absolute -right-12 text-[11px] font-bold text-[#0284c7] w-10 text-left pl-2">
                                                {val}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Bars Container (Render ONLY real database schools) */}
                                <div className="h-full flex items-end justify-around gap-8 relative z-10 pt-2 pb-14">
                                    {realSchools.length === 0 ? (
                                        <div className="w-full text-center text-slate-400 text-xs py-16">
                                            No school data available. Register a school to view analytics.
                                        </div>
                                    ) : (
                                        realSchools.map(school => {
                                            const totalHeightVal = maxStudentsCount > 0 ? maxStudentsCount : 1;
                                            const studentsHeight = Math.min(100, Math.max(12, (school.studentsCount / totalHeightVal) * 100));
                                            const teachersHeight = Math.min(100, Math.max(12, (school.teachersCount / totalHeightVal) * 100));

                                            return (
                                                <div
                                                    key={school.id}
                                                    onClick={() => setSelectedSchoolForDrilldown(school)}
                                                    className="flex flex-col items-center justify-end h-full group cursor-pointer relative min-w-[70px]"
                                                >
                                                    {/* Floating Tooltip with Full Real Numbers on Hover */}
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 text-center">
                                                        <p className="text-[11px] font-bold text-white">{school.name}</p>
                                                        <p className="text-[10px] text-sky-300 font-semibold">
                                                            {school.studentsCount} Students • {school.teachersCount} Teachers
                                                        </p>
                                                    </div>

                                                    {/* Dual / Stacked Bar Column */}
                                                    <div className="flex items-end justify-center gap-1.5 h-full w-14">
                                                        {/* Bar 1: Students (Deep Navy #0f172a) */}
                                                        <div
                                                            style={{ height: `${studentsHeight}%` }}
                                                            className="flex-1 bg-[#0f172a] rounded-t-sm transition-all duration-300 group-hover:brightness-125 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Students: ${school.studentsCount}`}
                                                        >
                                                            {school.studentsCount}
                                                        </div>
                                                        {/* Bar 2: Teachers (Sky Blue #38bdf8) */}
                                                        <div
                                                            style={{ height: `${teachersHeight}%` }}
                                                            className="flex-1 bg-[#38bdf8] rounded-t-sm transition-all duration-300 group-hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Teachers: ${school.teachersCount}`}
                                                        >
                                                            {school.teachersCount}
                                                        </div>
                                                    </div>

                                                    {/* Slanted / Diagonal Slash School Label matching template */}
                                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 origin-top-left rotate-45 pointer-events-none whitespace-nowrap text-left pt-2">
                                                        <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[120px]">
                                                            {school.name}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                                                            {school.teachersCount} {school.teachersCount === 1 ? "Teacher" : "Teachers"}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Chart Legend */}
                        <div className="flex items-center justify-center gap-6 text-xs text-slate-600 pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                                <span>Students (Left Axis)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                <span>Teachers (Right Axis)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: SCHOOLS DIRECTORY */}
            {currentTab === "schools" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Schools Directory</h2>
                            <p className="text-xs text-slate-500">Operational educational institutions in this woreda</p>
                        </div>

                        <button
                            onClick={() => {
                                setNewSchoolName("");
                                setNewSchoolCode("");
                                setNewSchoolAddress("");
                                setNewSchoolPhone("");
                                setCreateSchoolMessage(null);
                                setCreateSchoolOpen(true);
                            }}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add School</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by school name, principal, or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Schools Table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-3 px-4">School Name</th>
                                    <th className="py-3 px-4">Students</th>
                                    <th className="py-3 px-4">Teachers</th>
                                    <th className="py-3 px-4">Principal</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                {filteredSchools.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-400">
                                            No schools matching your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSchools.map(school => (
                                        <tr key={school.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                <div className="flex items-center gap-2">
                                                    <School className="w-4 h-4 text-blue-600 shrink-0" />
                                                    <span>{school.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                {school.studentsCount}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                {school.teachersCount}
                                            </td>
                                            <td className="py-3 px-4">
                                                {school.admin ? (
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{school.admin.name}</p>
                                                        <p className="text-[11px] text-slate-500">{school.admin.email}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {school.admin ? (
                                                    school.admin.status === "ACTIVE" ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3" /> Active
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            Pending Invite
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                                        Vacant
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setSelectedSchoolForDrilldown(school)}
                                                        className="px-2.5 py-1 text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                                    >
                                                        Inspect
                                                    </button>
                                                    {!school.admin ? (
                                                        <button
                                                            onClick={() => openAssignAdmin(school)}
                                                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <UserPlus className="w-3 h-3" />
                                                            <span>Assign Principal</span>
                                                        </button>
                                                    ) : school.admin.status === "INVITATION_PENDING" ? (
                                                        <button
                                                            onClick={() => handleResendInvitation(school.id)}
                                                            disabled={actionLoadingId === school.id}
                                                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                                        >
                                                            {actionLoadingId === school.id ? "Resending..." : "Resend Invite"}
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: LEADERSHIP & ADMINISTRATION */}
            {currentTab === "administration" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 p-6">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">School Principals & Administrators</h2>
                        <p className="text-xs text-slate-500">Designated heads of institutions governing woreda schools</p>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-3 px-4">Principal / Admin</th>
                                    <th className="py-3 px-4">School</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                {assignedAdministrators.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-slate-400">
                                            No school principals appointed yet.
                                        </td>
                                    </tr>
                                ) : (
                                    assignedAdministrators.map(({ schoolId, schoolName, admin }) => (
                                        <tr key={schoolId} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-900">
                                                {admin.name}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                {schoolName}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">
                                                {admin.email}
                                            </td>
                                            <td className="py-3 px-4">
                                                {admin.status === "ACTIVE" ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        Pending Invite
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {admin.status === "INVITATION_PENDING" && (
                                                        <button
                                                            onClick={() => handleResendInvitation(schoolId)}
                                                            disabled={actionLoadingId === schoolId}
                                                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-[11px] font-bold transition-colors cursor-pointer"
                                                        >
                                                            {actionLoadingId === schoolId ? "Resending..." : "Resend Invite"}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleCancelInvitation(schoolId)}
                                                        disabled={actionLoadingId === schoolId}
                                                        className="px-2.5 py-1 text-rose-600 hover:text-rose-800 border border-rose-200 hover:bg-rose-50 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                                    >
                                                        Revoke
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL: REGISTER SCHOOL */}
            {createSchoolOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900">Register New School</h3>
                            <button
                                onClick={() => setCreateSchoolOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {createSchoolMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                                    createSchoolMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                }`}
                            >
                                {createSchoolMessage.type === "success" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                )}
                                <span>{createSchoolMessage.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateSchoolSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    School Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Fasiledes Secondary School"
                                    value={newSchoolName}
                                    onChange={e => setNewSchoolName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Physical Address / Location
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Kebele 04, Main Campus"
                                    value={newSchoolAddress}
                                    onChange={e => setNewSchoolAddress(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Official Contact Phone (Optional)
                                </label>
                                <input
                                    type="tel"
                                    placeholder="e.g., +251 58 123 4567"
                                    value={newSchoolPhone}
                                    onChange={e => setNewSchoolPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setCreateSchoolOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingSchool || !newSchoolName.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {creatingSchool ? "Registering..." : "Register School"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ASSIGN SCHOOL PRINCIPAL */}
            {assignAdminOpen && selectedSchoolForAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Assign School Principal</h3>
                                <p className="text-xs text-slate-500">{selectedSchoolForAdmin.name}</p>
                            </div>
                            <button
                                onClick={() => setAssignAdminOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {assignAdminMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                                    assignAdminMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-rose-50 text-rose-800 border border-rose-200"
                                }`}
                            >
                                {assignAdminMessage.type === "success" ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                )}
                                <span>{assignAdminMessage.text}</span>
                            </div>
                        )}

                        <form onSubmit={handleAssignAdminSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Ato Girma Wolde"
                                    value={adminFullName}
                                    onChange={e => setAdminFullName(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Official Email Address <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g., principal@school.edu.et"
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Phone Number (Optional)
                                </label>
                                <input
                                    type="tel"
                                    placeholder="e.g., +251 91 345 6789"
                                    value={adminPhone}
                                    onChange={e => setAdminPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-blue-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAssignAdminOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigningAdmin || !adminFullName.trim() || !adminEmail.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {assigningAdmin ? "Sending Invitation..." : "Send Invitation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: SCHOOL DRILLDOWN DETAILS */}
            {selectedSchoolForDrilldown && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <School className="w-5 h-5 text-blue-600" />
                                <h3 className="text-base font-bold text-slate-900">
                                    {selectedSchoolForDrilldown.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedSchoolForDrilldown(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 py-2">
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[11px] font-bold text-slate-500">Students Enrolled</span>
                                <p className="text-xl font-black text-slate-900">
                                    {selectedSchoolForDrilldown.studentsCount}
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-[11px] font-bold text-slate-500">Teachers Employed</span>
                                <p className="text-xl font-black text-slate-900">
                                    {selectedSchoolForDrilldown.teachersCount}
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 bg-slate-50 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Appointed Principal
                            </span>
                            {selectedSchoolForDrilldown.admin ? (
                                <div>
                                    <p className="text-xs font-bold text-slate-900">{selectedSchoolForDrilldown.admin.name}</p>
                                    <p className="text-[11px] text-slate-500">{selectedSchoolForDrilldown.admin.email}</p>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        selectedSchoolForDrilldown.admin.status === "ACTIVE"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-amber-100 text-amber-800"
                                    }`}>
                                        {selectedSchoolForDrilldown.admin.status === "ACTIVE" ? "Active" : "Invitation Pending"}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">No principal assigned yet.</p>
                            )}
                        </div>

                        <div className="flex items-center justify-end pt-2">
                            <button
                                onClick={() => setSelectedSchoolForDrilldown(null)}
                                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
