"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    Layers,
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
    Info,
    ChevronRight,
    ExternalLink
} from "lucide-react";

export interface RegionAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
}

export interface ZoneBreakdown {
    id: string;
    name: string;
    woredasCount: number;
    schoolsCount: number;
    adminName: string | null;
}

export interface RegionItem {
    id: string;
    name: string;
    type: "REGION";
    parentId: string | null;
    zonesCount: number;
    woredasCount: number;
    schoolsCount: number;
    admin: RegionAdmin | null;
    zones?: ZoneBreakdown[];
}

export interface FederalOverviewData {
    federalId: string | null;
    federalName: string;
    counts: {
        totalRegions: number;
        totalZones: number;
        totalWoredas: number;
        totalSchools: number;
        totalStudents: number;
        totalTeachers: number;
    };
    regions: RegionItem[];
}

export default function FederalDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams?.get("tab") || "overview";

    const [data, setData] = useState<FederalOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Selected / Hovered Region on Map
    const [hoveredRegion, setHoveredRegion] = useState<RegionItem | null>(null);

    // Drill-Down Modal state
    const [selectedRegionForDrilldown, setSelectedRegionForDrilldown] = useState<RegionItem | null>(null);

    // Modal State: Create Region
    const [createRegionOpen, setCreateRegionOpen] = useState(false);
    const [newRegionName, setNewRegionName] = useState("");
    const [newRegionCode, setNewRegionCode] = useState("");
    const [creatingRegion, setCreatingRegion] = useState(false);
    const [createRegionMessage, setCreateRegionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal State: Assign Regional Administrator
    const [assignAdminOpen, setAssignAdminOpen] = useState(false);
    const [selectedRegionForAdmin, setSelectedRegionForAdmin] = useState<RegionItem | null>(null);
    const [adminFullName, setAdminFullName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [assigningAdmin, setAssigningAdmin] = useState(false);
    const [assignAdminMessage, setAssignAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Action state for resend/cancel
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const loadFederalData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchApi("/hierarchy/federal/overview");
            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.message || "Failed to load Federal Overview");
            }
            const payload = await res.json();
            setData(payload.data);
            if (payload.data?.regions && payload.data.regions.length > 0) {
                setHoveredRegion(payload.data.regions[0]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch Federal dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFederalData();
    }, []);

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Filter regions by search query
    const filteredRegions = useMemo(() => {
        if (!data?.regions) return [];
        if (!searchQuery.trim()) return data.regions;
        const q = searchQuery.toLowerCase();
        return data.regions.filter(
            r =>
                r.name.toLowerCase().includes(q) ||
                (r.admin?.name && r.admin.name.toLowerCase().includes(q)) ||
                (r.admin?.email && r.admin.email.toLowerCase().includes(q))
        );
    }, [data?.regions, searchQuery]);

    // Extract all administrators for Administration tab
    const assignedAdministrators = useMemo(() => {
        if (!data?.regions) return [];
        return data.regions
            .filter(r => r.admin !== null)
            .map(r => ({
                regionId: r.id,
                regionName: r.name,
                admin: r.admin!
            }));
    }, [data?.regions]);

    // Format number helper
    const fmt = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Calculate real proportions for Card 1
    const totalSchools = data?.counts?.totalSchools ?? 0;
    const totalSubordinateUnits = (data?.counts?.totalZones ?? 0) + (data?.counts?.totalWoredas ?? 0);
    const totalEntities = totalSchools + totalSubordinateUnits;
    const schoolsPercentage = totalEntities > 0 ? ((totalSchools / totalEntities) * 100).toFixed(1) : "100.0";
    const subUnitsPercentage = totalEntities > 0 ? ((totalSubordinateUnits / totalEntities) * 100).toFixed(1) : "0.0";

    // Dynamic Y-axis scale for the bar graph based on REAL max schools
    const realRegions = data?.regions ?? [];
    const maxSchoolsCount = useMemo(() => {
        if (realRegions.length === 0) return 5;
        const max = Math.max(...realRegions.map(r => r.schoolsCount));
        return Math.max(max, 4);
    }, [realRegions]);

    // Generate clean step values for Y-axis (e.g. 0, 1, 2, 3, 4 or 0, 5, 10, 15)
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

    // Handle Create Region Submit
    const handleCreateRegionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRegionName.trim()) return;

        setCreatingRegion(true);
        setCreateRegionMessage(null);
        try {
            const res = await fetchApi("/hierarchy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newRegionName.trim(),
                    type: "REGION",
                    parentId: data?.federalId || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to create region");
            }

            setCreateRegionMessage({
                type: "success",
                text: `Region "${newRegionName.trim()}" created successfully.`
            });

            await loadFederalData();

            setTimeout(() => {
                setCreateRegionOpen(false);
                setNewRegionName("");
                setNewRegionCode("");
                setCreateRegionMessage(null);
            }, 800);
        } catch (err: any) {
            setCreateRegionMessage({
                type: "error",
                text: err.message || "Could not create region"
            });
        } finally {
            setCreatingRegion(false);
        }
    };

    // Open Assign Admin Modal
    const openAssignAdmin = (region: RegionItem) => {
        setSelectedRegionForAdmin(region);
        setAdminFullName("");
        setAdminEmail("");
        setAdminPhone("");
        setAssignAdminMessage(null);
        setAssignAdminOpen(true);
    };

    // Handle Assign Regional Admin Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRegionForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/regions/${selectedRegionForAdmin.id}/assign-admin`, {
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

            await loadFederalData();

            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedRegionForAdmin(null);
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
    const handleResendInvitation = async (regionId: string) => {
        setActionLoadingId(regionId);
        try {
            const res = await fetchApi(`/hierarchy/regions/${regionId}/resend-invitation`, {
                method: "POST"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to resend invitation");

            showToast("success", resJson.message || "Invitation resent.");
            await loadFederalData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (regionId: string) => {
        if (!confirm("Are you sure you want to cancel this regional administrator invitation?")) return;
        setActionLoadingId(regionId);
        try {
            const res = await fetchApi(`/hierarchy/regions/${regionId}/cancel-invitation`, {
                method: "DELETE"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to cancel invitation");

            showToast("success", "Invitation cancelled.");
            await loadFederalData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to cancel invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

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
                        onClick={() => router.push("/dashboard/federal")}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "overview"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <span>Dashboard</span>
                    </button>
                    <button
                        onClick={() => router.push("/dashboard/federal?tab=regions")}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                            currentTab === "regions"
                                ? "text-blue-600 border-b-2 border-blue-600"
                                : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Regions ({data?.counts?.totalRegions ?? 0})</span>
                    </button>
                    <button
                        onClick={() => router.push("/dashboard/federal?tab=administration")}
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
                            setNewRegionName("");
                            setNewRegionCode("");
                            setCreateRegionMessage(null);
                            setCreateRegionOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Region</span>
                    </button>
                    <button
                        onClick={loadFederalData}
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
                        onClick={loadFederalData}
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
                        
                        {/* CARD 1 (Top-Left): National Institutional Proportion (Donut Chart) */}
                        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    National Educational Proportion
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Ratio of registered schools to subordinate administrative offices">
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
                                    {/* Subordinate Offices Segment (Deep Navy #0f172a) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="46"
                                        stroke="#0f172a"
                                        strokeWidth="16"
                                        strokeDasharray={`${(parseFloat(subUnitsPercentage) / 100) * 289} 289`}
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
                                    <span>Offices ({totalSubordinateUnits})</span>
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
                                        {fmt(data?.counts?.totalRegions)}
                                    </span>
                                    <p className="text-[11px] font-bold text-[#0369a1]">Active Regions</p>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2 (Top-Right): Regional Educational Distribution (Blue Circular Cards with Hover Number) */}
                        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                        Regional Educational Distribution
                                    </h2>
                                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Active regional educational distribution">
                                        i
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                    {realRegions.length} Active {realRegions.length === 1 ? "Region" : "Regions"}
                                </span>
                            </div>

                            {/* Blue Circular Island Canvas */}
                            <div className="relative w-full min-h-[240px] bg-slate-50/60 rounded-2xl flex items-center justify-center p-6 border border-slate-100 overflow-hidden">
                                {realRegions.length === 0 ? (
                                    <div className="text-center text-slate-400 text-xs py-8">
                                        No regions registered yet. Click <strong>Add Region</strong> to add a regional bureau.
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center justify-center gap-6 relative z-10">
                                        {realRegions.map((reg, idx) => {
                                            const bgGradients = [
                                                "bg-gradient-to-br from-[#0284c7] to-[#0369a1]",
                                                "bg-gradient-to-br from-[#38bdf8] to-[#0284c7]",
                                                "bg-gradient-to-br from-[#0369a1] to-[#0f172a]",
                                                "bg-gradient-to-br from-[#7dd3fc] to-[#0284c7]"
                                            ];
                                            const bgClass = bgGradients[idx % bgGradients.length];

                                            return (
                                                <div
                                                    key={reg.id}
                                                    onMouseEnter={() => setHoveredRegion(reg)}
                                                    onClick={() => setSelectedRegionForDrilldown(reg)}
                                                    className={`w-40 h-40 ${bgClass} rounded-full shadow-lg shadow-blue-500/10 flex flex-col items-center justify-center text-white cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl p-4 text-center group relative`}
                                                >
                                                    {/* Region Title in crisp white */}
                                                    <span className="text-xs font-bold tracking-tight text-white line-clamp-2 drop-shadow-xs">
                                                        {reg.name}
                                                    </span>

                                                    {/* Short badge */}
                                                    <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold backdrop-blur-xs">
                                                        {reg.schoolsCount} {reg.schoolsCount === 1 ? "School" : "Schools"}
                                                    </span>

                                                    {/* Floating White Tooltip on Hover matching template screenshot */}
                                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-3.5 py-1.5 rounded-xl shadow-lg border border-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-20">
                                                        <p className="text-[11px] font-bold text-slate-900">{reg.name}</p>
                                                        <p className="text-[10px] font-black text-blue-600">
                                                            {reg.schoolsCount} Schools • {reg.woredasCount} Woredas
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

                    {/* Bottom Full-Width Card: Schools & Administrative Units per Region */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                    Schools & Administrative Units per Region
                                </h2>
                                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-help" title="Comparative regional telemetry showing schools (left) and woredas (right)">
                                    i
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                                <span className="flex items-center gap-1.5 text-slate-700">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#0f172a]" /> Left: Schools
                                </span>
                                <span className="flex items-center gap-1.5 text-[#0284c7]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Right: Woredas
                                </span>
                            </div>
                        </div>

                        {/* Chart Grid and Stacked Bars */}
                        <div className="w-full overflow-x-auto pb-8 pt-2">
                            <div className="min-w-[500px] h-72 flex flex-col justify-between relative pl-12 pr-12 pt-4">
                                {/* Horizontal Grid Lines and Dual Y-Axis Labels (Left: Schools, Right: Woredas) */}
                                <div className="absolute inset-0 pl-12 pr-12 pointer-events-none flex flex-col justify-between">
                                    {yAxisSteps.map(val => (
                                        <div key={val} className="w-full flex items-center justify-between relative">
                                            {/* Left Y-Axis: Schools */}
                                            <span className="absolute -left-12 text-[11px] font-bold text-slate-500 w-10 text-right">
                                                {val}
                                            </span>
                                            {/* Horizontal Grid Line */}
                                            <div className="w-full border-b border-dashed border-slate-200" />
                                            {/* Right Y-Axis: Woredas */}
                                            <span className="absolute -right-12 text-[11px] font-bold text-[#0284c7] w-10 text-left pl-2">
                                                {val}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Bars Container (Render ONLY real database regions) */}
                                <div className="h-full flex items-end justify-around gap-8 relative z-10 pt-2 pb-14">
                                    {realRegions.length === 0 ? (
                                        <div className="w-full text-center text-slate-400 text-xs py-16">
                                            No regional data available. Register a region to view analytics.
                                        </div>
                                    ) : (
                                        realRegions.map(reg => {
                                            const totalHeightVal = maxSchoolsCount > 0 ? maxSchoolsCount : 1;
                                            const schoolsHeight = Math.min(100, Math.max(12, (reg.schoolsCount / totalHeightVal) * 100));
                                            const subUnitsHeight = Math.min(100, Math.max(12, (reg.woredasCount / totalHeightVal) * 100));

                                            return (
                                                <div
                                                    key={reg.id}
                                                    onClick={() => setSelectedRegionForDrilldown(reg)}
                                                    className="flex flex-col items-center justify-end h-full group cursor-pointer relative min-w-[70px]"
                                                >
                                                    {/* Floating Tooltip with Full Real Numbers on Hover */}
                                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-30 text-center">
                                                        <p className="text-[11px] font-bold text-white">{reg.name}</p>
                                                        <p className="text-[10px] text-sky-300 font-semibold">
                                                            {reg.schoolsCount} Schools • {reg.woredasCount} Woredas • {reg.zonesCount} {reg.zonesCount === 1 ? "Zone" : "Zones"}
                                                        </p>
                                                    </div>

                                                    {/* Dual / Stacked Bar Column */}
                                                    <div className="flex items-end justify-center gap-1.5 h-full w-14">
                                                        {/* Bar 1: Schools (Deep Navy #0f172a) */}
                                                        <div
                                                            style={{ height: `${schoolsHeight}%` }}
                                                            className="flex-1 bg-[#0f172a] rounded-t-sm transition-all duration-300 group-hover:brightness-125 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Schools: ${reg.schoolsCount}`}
                                                        >
                                                            {reg.schoolsCount}
                                                        </div>
                                                        {/* Bar 2: Woredas (Sky Blue #38bdf8) */}
                                                        <div
                                                            style={{ height: `${subUnitsHeight}%` }}
                                                            className="flex-1 bg-[#38bdf8] rounded-t-sm transition-all duration-300 group-hover:brightness-110 flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                                                            title={`Woredas: ${reg.woredasCount}`}
                                                        >
                                                            {reg.woredasCount}
                                                        </div>
                                                    </div>

                                                    {/* Slanted / Diagonal Slash Region Label matching template */}
                                                    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 origin-top-left rotate-45 pointer-events-none whitespace-nowrap text-left pt-2">
                                                        <span className="text-[11px] font-bold text-slate-800 block truncate max-w-[120px]">
                                                            {reg.name}
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">
                                                            {reg.zonesCount} {reg.zonesCount === 1 ? "Zone" : "Zones"}
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
                                <span>Woredas (Right Axis)</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: REGIONS DIRECTORY */}
            {currentTab === "regions" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Regions Directory</h2>
                            <p className="text-xs text-slate-500">Autonomous regional educational bureaus</p>
                        </div>

                        <button
                            onClick={() => {
                                setNewRegionName("");
                                setNewRegionCode("");
                                setCreateRegionMessage(null);
                                setCreateRegionOpen(true);
                            }}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Region</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search regions..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                    <th className="p-3">Region</th>
                                    <th className="p-3">Subordinate Units</th>
                                    <th className="p-3">Administrator</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRegions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-500">
                                            No regions registered. Click <strong>Add Region</strong> to create a region.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRegions.map(region => (
                                        <tr key={region.id} className="hover:bg-slate-50/60">
                                            <td className="p-3 font-semibold text-slate-900 align-top">
                                                {region.name}
                                            </td>
                                            <td className="p-3 text-slate-600 align-top">
                                                <div className="space-y-0.5">
                                                    <p>{region.zonesCount} Zones</p>
                                                    <p>{region.woredasCount} Woredas</p>
                                                    <p>{region.schoolsCount} Schools</p>
                                                </div>
                                            </td>
                                            <td className="p-3 align-top">
                                                {region.admin ? (
                                                    region.admin.status === "ACTIVE" ? (
                                                        <div className="space-y-1">
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                Active
                                                            </span>
                                                            <p className="font-semibold text-slate-900 text-xs">{region.admin.name}</p>
                                                            <p className="text-[11px] text-slate-500">{region.admin.email}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                Invitation Pending
                                                            </span>
                                                            <p className="font-medium text-slate-900">{region.admin.name}</p>
                                                            <p className="text-[11px] text-slate-600">{region.admin.email}</p>
                                                            <div className="flex items-center gap-2 pt-1">
                                                                <button
                                                                    onClick={() => handleResendInvitation(region.id)}
                                                                    disabled={actionLoadingId === region.id}
                                                                    className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer disabled:opacity-50"
                                                                >
                                                                    Resend
                                                                </button>
                                                                <span className="text-slate-300">•</span>
                                                                <button
                                                                    onClick={() => handleCancelInvitation(region.id)}
                                                                    disabled={actionLoadingId === region.id}
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
                                                                onClick={() => openAssignAdmin(region)}
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
                                                        onClick={() => setSelectedRegionForDrilldown(region)}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer"
                                                    >
                                                        Details
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/dashboard/region?targetOrgId=${region.id}`)}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded transition-colors cursor-pointer"
                                                    >
                                                        View Region
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

            {/* TAB 3: REGIONAL ADMINISTRATORS */}
            {currentTab === "administration" && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm space-y-4 p-6">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Regional Leadership</h2>
                        <p className="text-xs text-slate-500">Appointed regional administrators</p>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                    <th className="p-3">Administrator</th>
                                    <th className="p-3">Region</th>
                                    <th className="p-3">Role</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assignedAdministrators.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                            No regional administrators appointed yet.
                                        </td>
                                    </tr>
                                ) : (
                                    assignedAdministrators.map(({ regionId, regionName, admin }) => (
                                        <tr key={regionId} className="hover:bg-slate-50/60">
                                            <td className="p-3 font-semibold text-slate-900">
                                                <p>{admin.name}</p>
                                                <p className="text-[11px] text-slate-500 font-normal">{admin.email}</p>
                                            </td>
                                            <td className="p-3 text-slate-800">{regionName}</td>
                                            <td className="p-3 text-slate-700">Regional Administrator</td>
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
                                                            onClick={() => handleResendInvitation(regionId)}
                                                            disabled={actionLoadingId === regionId}
                                                            className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer disabled:opacity-50"
                                                        >
                                                            Resend
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => router.push(`/dashboard/region?targetOrgId=${regionId}`)}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 border border-slate-300 rounded cursor-pointer"
                                                    >
                                                        View Region
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
            {selectedRegionForDrilldown && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">{selectedRegionForDrilldown.name}</h3>
                                <p className="text-xs text-slate-500">Autonomous Regional Bureau Telemetry</p>
                            </div>
                            <button
                                onClick={() => setSelectedRegionForDrilldown(null)}
                                className="p-1 rounded text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Totals */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase">Zones</span>
                                <div className="text-lg font-bold text-slate-900">{selectedRegionForDrilldown.zonesCount}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase">Woredas</span>
                                <div className="text-lg font-bold text-slate-900">{selectedRegionForDrilldown.woredasCount}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase">Schools</span>
                                <div className="text-lg font-bold text-slate-900">{selectedRegionForDrilldown.schoolsCount}</div>
                            </div>
                        </div>

                        {/* Admin info */}
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <span className="font-semibold text-slate-600">Administrator:</span>
                            {selectedRegionForDrilldown.admin ? (
                                <div className="mt-1">
                                    <p className="font-bold text-slate-900">{selectedRegionForDrilldown.admin.name}</p>
                                    <p className="text-slate-500 text-[11px]">{selectedRegionForDrilldown.admin.email}</p>
                                </div>
                            ) : (
                                <p className="text-slate-500 mt-1 italic">Not appointed</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedRegionForDrilldown(null)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => router.push(`/dashboard/region?targetOrgId=${selectedRegionForDrilldown.id}`)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
                            >
                                Open Regional Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: CREATE REGION */}
            {createRegionOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-900">Create Region</h3>
                            <button
                                onClick={() => setCreateRegionOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateRegionSubmit} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">
                                    Region Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Tigray Region, Oromia Region"
                                    value={newRegionName}
                                    onChange={e => setNewRegionName(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">Region Code</label>
                                <input
                                    type="text"
                                    placeholder="e.g., TG, OR"
                                    value={newRegionCode}
                                    onChange={e => setNewRegionCode(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            {createRegionMessage && (
                                <div
                                    className={`p-3 rounded text-xs flex items-center gap-2 border ${
                                        createRegionMessage.type === "success"
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : "bg-rose-50 text-rose-800 border-rose-200"
                                    }`}
                                >
                                    <span>{createRegionMessage.text}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setCreateRegionOpen(false)}
                                    disabled={creatingRegion}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingRegion || !newRegionName.trim()}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {creatingRegion ? "Creating..." : "Create Region"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: ASSIGN REGIONAL ADMINISTRATOR */}
            {assignAdminOpen && selectedRegionForAdmin && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Assign Regional Administrator</h3>
                                <p className="text-[11px] text-slate-500">
                                    Region: <strong>{selectedRegionForAdmin.name}</strong>
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
                                    placeholder="e.g., Abebe Kebede"
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
                                    placeholder="e.g., abebe@edubridge.gov.et"
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
