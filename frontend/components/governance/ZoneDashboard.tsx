"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    Building2,
    MapPin,
    School,
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

export interface WoredaAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
}

export interface WoredaItem {
    id: string;
    name: string;
    type: "WOREDA";
    parentId: string | null;
    schoolsCount: number;
    admin: WoredaAdmin | null;
}

export interface ZoneOverviewData {
    zoneId: string | null;
    zoneName: string;
    parentRegionName: string;
    counts: {
        totalWoredas: number;
        totalSchools: number;
    };
    woredas: WoredaItem[];
}

export default function ZoneDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams?.get("tab") || "overview";
    const targetOrgId = searchParams?.get("targetOrgId");

    const [data, setData] = useState<ZoneOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Selected / Hovered Woreda on Map
    const [hoveredWoreda, setHoveredWoreda] = useState<WoredaItem | null>(null);

    // Drill-Down Modal state
    const [selectedWoredaForDrilldown, setSelectedWoredaForDrilldown] = useState<WoredaItem | null>(null);

    // Modal State: Create Woreda
    const [createWoredaOpen, setCreateWoredaOpen] = useState(false);
    const [newWoredaName, setNewWoredaName] = useState("");
    const [newWoredaCode, setNewWoredaCode] = useState("");
    const [creatingWoreda, setCreatingWoreda] = useState(false);
    const [createWoredaMessage, setCreateWoredaMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal State: Assign Woreda Administrator
    const [assignAdminOpen, setAssignAdminOpen] = useState(false);
    const [selectedWoredaForAdmin, setSelectedWoredaForAdmin] = useState<WoredaItem | null>(null);
    const [adminFullName, setAdminFullName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [assigningAdmin, setAssigningAdmin] = useState(false);
    const [assignAdminMessage, setAssignAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Action state for resend/cancel
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const loadZoneData = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = targetOrgId
                ? `/hierarchy/zones/${targetOrgId}/overview`
                : `/hierarchy/zone/overview`;
            const res = await fetchApi(endpoint);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load Zone Overview");
            }
            const payload = await res.json();
            setData(payload.data);
            if (payload.data?.woredas && payload.data.woredas.length > 0) {
                setHoveredWoreda(payload.data.woredas[0]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch Zone dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadZoneData();
    }, [targetOrgId]);

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Filter woredas by search query
    const filteredWoredas = useMemo(() => {
        if (!data?.woredas) return [];
        if (!searchQuery.trim()) return data.woredas;
        const q = searchQuery.toLowerCase();
        return data.woredas.filter(
            w =>
                w.name.toLowerCase().includes(q) ||
                (w.admin?.name && w.admin.name.toLowerCase().includes(q)) ||
                (w.admin?.email && w.admin.email.toLowerCase().includes(q))
        );
    }, [data?.woredas, searchQuery]);

    // Extract all administrators for Administration tab
    const assignedAdministrators = useMemo(() => {
        if (!data?.woredas) return [];
        return data.woredas
            .filter(w => w.admin !== null)
            .map(w => ({
                woredaId: w.id,
                woredaName: w.name,
                admin: w.admin!
            }));
    }, [data?.woredas]);

    // Format number helper
    const fmt = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Calculate real proportions for Card 1
    const totalSchools = data?.counts?.totalSchools ?? 0;
    const totalWoredas = data?.counts?.totalWoredas ?? 0;
    const totalEntities = totalSchools + totalWoredas;
    const schoolsPercentage = totalEntities > 0 ? ((totalSchools / totalEntities) * 100).toFixed(1) : "100.0";
    const woredasPercentage = totalEntities > 0 ? ((totalWoredas / totalEntities) * 100).toFixed(1) : "0.0";

    const realWoredas = data?.woredas ?? [];
    const maxSchoolsCount = useMemo(() => {
        if (realWoredas.length === 0) return 5;
        const max = Math.max(...realWoredas.map(w => w.schoolsCount));
        return Math.max(max, 4);
    }, [realWoredas]);

    // Generate clean step values for Y-axis
    const yAxisSteps = useMemo(() => {
        const top = Math.ceil(maxSchoolsCount);
        const step = Math.max(1, Math.ceil(top / 4));
        const steps = [];
        for (let i = top; i >= 0; i -= step) {
            steps.push(i);
        }
        if (steps[steps.length - 1] !== 0) {
            steps.push(0);
        }
        return steps;
    }, [maxSchoolsCount]);

    // Handle Create Woreda Submit
    const handleCreateWoredaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWoredaName.trim()) return;

        setCreatingWoreda(true);
        setCreateWoredaMessage(null);
        try {
            const res = await fetchApi("/hierarchy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newWoredaName.trim(),
                    type: "WOREDA",
                    parentId: data?.zoneId || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to create Woreda");
            }

            setCreateWoredaMessage({
                type: "success",
                text: `Woreda "${newWoredaName.trim()}" created successfully.`
            });

            await loadZoneData();

            setTimeout(() => {
                setCreateWoredaOpen(false);
                setNewWoredaName("");
                setNewWoredaCode("");
                setCreateWoredaMessage(null);
            }, 800);
        } catch (err: any) {
            setCreateWoredaMessage({
                type: "error",
                text: err.message || "Could not create Woreda"
            });
        } finally {
            setCreatingWoreda(false);
        }
    };

    // Open Assign Admin Modal
    const openAssignAdmin = (woreda: WoredaItem) => {
        setSelectedWoredaForAdmin(woreda);
        setAdminFullName("");
        setAdminEmail("");
        setAdminPhone("");
        setAssignAdminMessage(null);
        setAssignAdminOpen(true);
    };

    // Handle Assign Woreda Admin Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWoredaForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/woredas/${selectedWoredaForAdmin.id}/assign-admin`, {
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

            await loadZoneData();

            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedWoredaForAdmin(null);
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
    const handleResendInvitation = async (woredaId: string) => {
        setActionLoadingId(woredaId);
        try {
            const res = await fetchApi(`/hierarchy/woredas/${woredaId}/resend-invitation`, {
                method: "POST"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to resend invitation");

            showToast("success", resJson.message || "Invitation resent.");
            await loadZoneData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (woredaId: string) => {
        if (!confirm("Are you sure you want to cancel this woreda administrator invitation?")) return;
        setActionLoadingId(woredaId);
        try {
            const res = await fetchApi(`/hierarchy/woredas/${woredaId}/cancel-invitation`, {
                method: "DELETE"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to cancel invitation");

            showToast("success", "Invitation cancelled.");
            await loadZoneData();
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
                        onClick={() => router.push(`/dashboard/zone${targetQueryOnly}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "overview"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/zone?tab=woredas${targetParam}`)}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "woredas"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Woredas ({data?.counts?.totalWoredas ?? 0})</span>
                    </button>
                    <button
                        onClick={() => router.push(`/dashboard/zone?tab=administration${targetParam}`)}
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
                            setNewWoredaName("");
                            setNewWoredaCode("");
                            setCreateWoredaMessage(null);
                            setCreateWoredaOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Woreda</span>
                    </button>
                    <button
                        onClick={loadZoneData}
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
                        onClick={loadZoneData}
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
                        
                        {/* CARD 1 (Top-Left): Zone Institutional Proportion (Donut Chart) */}
                        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Zone Educational Proportion
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Ratio of registered schools to subordinate woreda offices">
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
                                    {/* Registered Schools Segment (Sky Blue #38bdf8) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="46"
                                        stroke="#38bdf8"
                                        strokeWidth="16"
                                        strokeDasharray={`${(parseFloat(schoolsPercentage) / 100) * 289} 289`}
                                        strokeLinecap="butt"
                                        fill="transparent"
                                        className="transition-all duration-700 ease-out"
                                    />
                                    {/* Subordinate Woredas Segment (Deep Navy #0f172a) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="46"
                                        stroke="#0f172a"
                                        strokeWidth="16"
                                        strokeDasharray={`${(parseFloat(woredasPercentage) / 100) * 289} 289`}
                                        strokeDashoffset={`-${(parseFloat(schoolsPercentage) / 100) * 289}`}
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
                                    <span>Schools ({totalSchools})</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" />
                                    <span>Woredas ({totalWoredas})</span>
                                </div>
                            </div>

                            {/* 2 Bottom Metric Boxes with Real Data */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="p-3.5 rounded-xl bg-[#e0f2fe]/60 text-center space-y-0.5">
                                    <span className="text-sm font-black text-[#0369a1]">
                                        {schoolsPercentage}%
                                    </span>
                                    <p className="text-[11px] font-bold text-[#0369a1]">Schools Ratio</p>
                                </div>
                                <div className="p-3.5 rounded-xl bg-[#e0f2fe]/60 text-center space-y-0.5">
                                    <span className="text-sm font-black text-[#0369a1]">
                                        {fmt(totalWoredas)}
                                    </span>
                                    <p className="text-[11px] font-bold text-[#0369a1]">Active Woredas</p>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2 (Top-Right): Woreda Educational Distribution (Blue Circular Cards with Hover Tooltips) */}
                        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                        Woreda Educational Distribution
                                    </h2>
                                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Active woreda administrative distribution in this zone">
                                        i
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                    {realWoredas.length} Active {realWoredas.length === 1 ? "Woreda" : "Woredas"}
                                </span>
                            </div>

                            {/* Blue Circular Island Canvas */}
                            <div className="relative w-full min-h-[240px] bg-slate-50/60 rounded-2xl flex items-center justify-center p-6 border border-slate-100 overflow-hidden">
                                {realWoredas.length === 0 ? (
                                    <div className="text-center text-slate-400 text-xs py-8">
                                        No woredas registered yet. Click <strong>Add Woreda</strong> to add a woreda office.
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center justify-center gap-6 relative z-10">
                                        {realWoredas.map((woreda, idx) => {
                                            const bgGradients = [
                                                "bg-gradient-to-br from-[#0284c7] to-[#0369a1]",
                                                "bg-gradient-to-br from-[#38bdf8] to-[#0284c7]",
                                                "bg-gradient-to-br from-[#0369a1] to-[#0f172a]",
                                                "bg-gradient-to-br from-[#7dd3fc] to-[#0284c7]"
                                            ];
                                            const bgClass = bgGradients[idx % bgGradients.length];

                                            return (
                                                <div
                                                    key={woreda.id}
                                                    onMouseEnter={() => setHoveredWoreda(woreda)}
                                                    onClick={() => setSelectedWoredaForDrilldown(woreda)}
                                                    className={`w-40 h-40 ${bgClass} rounded-full shadow-lg shadow-blue-500/10 flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl p-4 text-center group relative`}
                                                >
                                                    {/* Woreda Title in crisp white */}
                                                    <span className="text-xs font-bold tracking-tight text-white line-clamp-2 drop-shadow-xs">
                                                        {woreda.name}
                                                    </span>

                                                    {/* Short badge */}
                                                    <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold backdrop-blur-xs">
                                                        {woreda.schoolsCount} {woreda.schoolsCount === 1 ? "School" : "Schools"}
                                                    </span>

                                                    {/* Floating White Tooltip on Hover matching template */}
                                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-3.5 py-1.5 rounded-xl shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-20">
                                                        <p className="text-[11px] font-bold text-slate-900">{woreda.name}</p>
                                                        <p className="text-[10px] font-black text-blue-600">
                                                            {woreda.schoolsCount} Schools • Admin: {woreda.admin ? woreda.admin.name : "Unassigned"}
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
                                    <span>High Capacity</span>
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

                    {/* Bottom Full-Width Card: Schools per Woreda Bar Graph */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Schools per Woreda
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Comparative distribution of schools across district offices">
                                    i
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" /> Left: Schools
                                </span>
                                <span className="flex items-center gap-1.5 text-[#0284c7]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Right: Capacity Index
                                </span>
                            </div>
                        </div>

                        {/* Chart Grid and Stacked Bars */}
                        <div className="w-full overflow-x-auto pb-8 pt-2">
                            <div className="min-w-[500px] h-72 flex flex-col justify-between relative pl-12 pr-12 pt-4">
                                {/* Horizontal Grid Lines and Dual Y-Axis Labels (Left: Schools, Right: Capacity) */}
                                <div className="absolute inset-0 pl-12 pr-12 pointer-events-none flex flex-col justify-between">
                                    {yAxisSteps.map(val => (
                                        <div key={val} className="w-full flex items-center justify-between relative">
                                            {/* Left Y-Axis: Schools */}
                                            <span className="absolute -left-12 text-[11px] font-bold text-slate-500 w-10 text-right">
                                                {val}
                                            </span>
                                            {/* Horizontal Grid Line */}
                                            <div className="w-full border-b border-dashed border-slate-200" />
                                            {/* Right Y-Axis: Capacity */}
                                            <span className="absolute -right-12 text-[11px] font-bold text-[#0284c7] w-10 text-left pl-2">
                                                {val}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Bars Container (Render ONLY real database woredas) */}
                                <div className="h-full flex items-end justify-around gap-8 relative z-10 pt-2 pb-14">
                                    {realWoredas.length === 0 ? (
                                        <div className="w-full text-center text-slate-400 text-xs py-16">
                                            No woreda data available. Register a woreda to view analytics.
                                        </div>
                                    ) : (
                                        realWoredas.map(woreda => {
                                            const totalHeightVal = maxSchoolsCount > 0 ? maxSchoolsCount : 1;
                                            const schoolsHeight = Math.min(100, Math.max(12, (woreda.schoolsCount / totalHeightVal) * 100));
                                            const capacityHeight = Math.min(100, Math.max(10, ((woreda.schoolsCount * 0.8) / totalHeightVal) * 100));

                                            return (
                                                <div
                                                    key={woreda.id}
                                                    onClick={() => setSelectedWoredaForDrilldown(woreda)}
                                                    className="flex flex-col items-center justify-end h-full group cursor-pointer relative min-w-[70px]"
                                                >
                                                    {/* Floating Tooltip with Full Real Numbers on Hover */}
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 text-center">
                                                        <p className="text-[11px] font-bold text-white">{woreda.name}</p>
                                                        <p className="text-[10px] text-sky-300 font-semibold">
                                                            {woreda.schoolsCount} Schools • Admin: {woreda.admin ? woreda.admin.name : "Unassigned"}
                                                        </p>
                                                    </div>

                                                    {/* Dual / Stacked Bar Column */}
                                                    <div className="flex items-end justify-center gap-1.5 h-full w-14">
                                                        {/* Bar 1: Schools (Deep Navy #0f172a) */}
                                                        <div
                                                            style={{ height: `${schoolsHeight}%` }}
                                                            className="flex-1 bg-[#0f172a] rounded-t-sm transition-all duration-300 group-hover:brightness-125 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Schools: ${woreda.schoolsCount}`}
                                                        >
                                                            {woreda.schoolsCount}
                                                        </div>
                                                        {/* Bar 2: Capacity (Sky Blue #38bdf8) */}
                                                        <div
                                                            style={{ height: `${capacityHeight}%` }}
                                                            className="flex-1 bg-[#38bdf8] rounded-t-sm transition-all duration-300 group-hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Capacity: ${woreda.schoolsCount}`}
                                                        >
                                                            {woreda.schoolsCount}
                                                        </div>
                                                    </div>

                                                    {/* Slanted / Diagonal Slash Woreda Label matching template */}
                                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 origin-top-left rotate-45 pointer-events-none whitespace-nowrap text-left pt-2">
                                                        <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[120px]">
                                                            {woreda.name}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                                                            {woreda.schoolsCount} {woreda.schoolsCount === 1 ? "School" : "Schools"}
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
                                <span>Schools (Left Axis)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                                <span>Capacity Ratio (Right Axis)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: WOREDAS DIRECTORY */}
            {currentTab === "woredas" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Woredas Directory</h2>
                            <p className="text-xs text-slate-500">Subordinate district administrative offices</p>
                        </div>

                        <button
                            onClick={() => {
                                setNewWoredaName("");
                                setNewWoredaCode("");
                                setCreateWoredaMessage(null);
                                setCreateWoredaOpen(true);
                            }}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Woreda</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search woredas..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                    <th className="p-3">Woreda</th>
                                    <th className="p-3">Registered Schools</th>
                                    <th className="p-3">Administrator</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredWoredas.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-500">
                                            No woredas registered. Click <strong>Add Woreda</strong> to create a woreda.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredWoredas.map(woreda => (
                                        <tr key={woreda.id} className="hover:bg-slate-50/60">
                                            <td className="p-3 font-semibold text-slate-900 align-top">
                                                {woreda.name}
                                            </td>
                                            <td className="p-3 text-slate-600 align-top">
                                                <p className="font-semibold text-slate-900">{woreda.schoolsCount} Schools</p>
                                            </td>
                                            <td className="p-3 align-top">
                                                {woreda.admin ? (
                                                    woreda.admin.status === "ACTIVE" ? (
                                                        <div className="space-y-1">
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                Active
                                                            </span>
                                                            <p className="font-semibold text-slate-900 text-xs">{woreda.admin.name}</p>
                                                            <p className="text-[11px] text-slate-500">{woreda.admin.email}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                Invitation Pending
                                                            </span>
                                                            <p className="font-medium text-slate-900">{woreda.admin.name}</p>
                                                            <p className="text-[11px] text-slate-600">{woreda.admin.email}</p>
                                                            <div className="flex items-center gap-2 pt-1">
                                                                <button
                                                                    onClick={() => handleResendInvitation(woreda.id)}
                                                                    disabled={actionLoadingId === woreda.id}
                                                                    className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer disabled:opacity-50"
                                                                >
                                                                    Resend
                                                                </button>
                                                                <span className="text-slate-300">•</span>
                                                                <button
                                                                    onClick={() => handleCancelInvitation(woreda.id)}
                                                                    disabled={actionLoadingId === woreda.id}
                                                                    className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="space-y-2">
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                                            Not Assigned
                                                        </span>
                                                        <div>
                                                            <button
                                                                onClick={() => openAssignAdmin(woreda)}
                                                                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors cursor-pointer"
                                                            >
                                                                Assign Administrator
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right align-top">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedWoredaForDrilldown(woreda)}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer"
                                                    >
                                                        Details
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/dashboard/woreda?targetOrgId=${woreda.id}`)}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded transition-colors cursor-pointer"
                                                    >
                                                        View Woreda
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

            {/* TAB 3: WOREDA ADMINISTRATORS */}
            {currentTab === "administration" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 p-6">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Woreda Leadership</h2>
                        <p className="text-xs text-slate-500">Appointed woreda administrators across the zone</p>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                    <th className="p-3">Administrator</th>
                                    <th className="p-3">Woreda</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assignedAdministrators.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            No woreda administrators appointed yet.
                                        </td>
                                    </tr>
                                ) : (
                                    assignedAdministrators.map(({ woredaId, woredaName, admin }) => (
                                        <tr key={woredaId} className="hover:bg-slate-50/60">
                                            <td className="p-3 font-semibold text-slate-900">
                                                <p>{admin.name}</p>
                                                <p className="text-[11px] text-slate-500 font-normal">{admin.email}</p>
                                            </td>
                                            <td className="p-3 text-slate-800">{woredaName}</td>
                                            <td className="p-3 text-slate-700">Woreda Administrator</td>
                                            <td className="p-3">
                                                {admin.status === "ACTIVE" ? (
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                        Invitation Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {admin.status === "INVITATION_PENDING" && (
                                                        <button
                                                            onClick={() => handleResendInvitation(woredaId)}
                                                            disabled={actionLoadingId === woredaId}
                                                            className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer disabled:opacity-50"
                                                        >
                                                            Resend
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => router.push(`/dashboard/woreda?targetOrgId=${woredaId}`)}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 border border-slate-300 rounded cursor-pointer"
                                                    >
                                                        View Woreda
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

            {/* DRILL-DOWN MODAL */}
            {selectedWoredaForDrilldown && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{selectedWoredaForDrilldown.name}</h3>
                                <p className="text-xs text-slate-500">Woreda District Telemetry</p>
                            </div>
                            <button
                                onClick={() => setSelectedWoredaForDrilldown(null)}
                                className="p-1 rounded text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Totals */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase">Schools</span>
                                <div className="text-lg font-bold text-slate-900">{selectedWoredaForDrilldown.schoolsCount}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase">Status</span>
                                <div className="text-sm font-bold text-emerald-700 mt-1">
                                    {selectedWoredaForDrilldown.admin ? selectedWoredaForDrilldown.admin.status : "Pending Setup"}
                                </div>
                            </div>
                        </div>

                        {/* Admin info */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-600">Administrator:</span>
                            {selectedWoredaForDrilldown.admin ? (
                                <div className="mt-1">
                                    <p className="font-bold text-slate-900">{selectedWoredaForDrilldown.admin.name}</p>
                                    <p className="text-slate-500 text-[11px]">{selectedWoredaForDrilldown.admin.email}</p>
                                </div>
                            ) : (
                                <p className="text-slate-500 mt-1 italic">Not appointed</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedWoredaForDrilldown(null)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => router.push(`/dashboard/woreda?targetOrgId=${selectedWoredaForDrilldown.id}`)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                            >
                                Open Woreda Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: CREATE WOREDA */}
            {createWoredaOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-900">Create Woreda</h3>
                            <button
                                onClick={() => setCreateWoredaOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateWoredaSubmit} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">
                                    Woreda Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Dessie Zuria Woreda, Kalu Woreda"
                                    value={newWoredaName}
                                    onChange={e => setNewWoredaName(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">Woreda Code</label>
                                <input
                                    type="text"
                                    placeholder="e.g., DZ, KL"
                                    value={newWoredaCode}
                                    onChange={e => setNewWoredaCode(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            {createWoredaMessage && (
                                <div
                                    className={`p-3 rounded text-xs flex items-center gap-2 border ${
                                        createWoredaMessage.type === "success"
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : "bg-rose-50 text-rose-800 border-rose-200"
                                    }`}
                                >
                                    <span>{createWoredaMessage.text}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setCreateWoredaOpen(false)}
                                    disabled={creatingWoreda}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingWoreda || !newWoredaName.trim()}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {creatingWoreda ? "Creating..." : "Create Woreda"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: ASSIGN WOREDA ADMINISTRATOR */}
            {assignAdminOpen && selectedWoredaForAdmin && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Assign Woreda Administrator</h3>
                                <p className="text-[11px] text-slate-500">
                                    Woreda: <strong>{selectedWoredaForAdmin.name}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setAssignAdminOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAssignAdminSubmit} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Getachew Assefa"
                                    value={adminFullName}
                                    onChange={e => setAdminFullName(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">
                                    Email Address <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g., getachew@edubridge.gov.et"
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g., +251 911 234 567"
                                    value={adminPhone}
                                    onChange={e => setAdminPhone(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            {assignAdminMessage && (
                                <div
                                    className={`p-3 rounded text-xs flex items-center gap-2 border ${
                                        assignAdminMessage.type === "success"
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : "bg-rose-50 text-rose-800 border-rose-200"
                                    }`}
                                >
                                    <span>{assignAdminMessage.text}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setAssignAdminOpen(false)}
                                    disabled={assigningAdmin}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigningAdmin || !adminFullName.trim() || !adminEmail.trim()}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {assigningAdmin ? "Sending..." : "Send Invitation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
