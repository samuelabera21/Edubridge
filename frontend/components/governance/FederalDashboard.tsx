"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    Landmark,
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
    Clock,
    UserCheck,
    ArrowUpRight,
    Send,
    Eye
} from "lucide-react";
import HierarchyTreeViewer from "./HierarchyTreeViewer";

export interface RegionAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
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
}

export interface FederalOverviewData {
    federalId: string | null;
    federalName: string;
    counts: {
        totalRegions: number;
        totalZones: number;
        totalWoredas: number;
        totalSchools: number;
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

            {/* Official Header */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold tracking-wide uppercase">
                        <Landmark className="w-4 h-4 text-slate-700" />
                        <span>Federal Democratic Republic of Ethiopia • Ministry of Education</span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mt-1">
                        National Education Administrative Portal
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setNewRegionName("");
                            setNewRegionCode("");
                            setCreateRegionMessage(null);
                            setCreateRegionOpen(true);
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Region</span>
                    </button>
                    <button
                        onClick={loadFederalData}
                        className="p-2 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-slate-700" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="border-b border-slate-200 flex items-center gap-6 text-xs font-semibold">
                <button
                    onClick={() => router.push("/dashboard/federal")}
                    className={`pb-3 transition-colors cursor-pointer ${
                        currentTab === "overview"
                            ? "text-slate-900 border-b-2 border-slate-900 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => router.push("/dashboard/federal?tab=regions")}
                    className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        currentTab === "regions"
                            ? "text-slate-900 border-b-2 border-slate-900 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Regions ({data?.counts.totalRegions ?? 0})</span>
                </button>
                <button
                    onClick={() => router.push("/dashboard/federal?tab=administration")}
                    className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        currentTab === "administration"
                            ? "text-slate-900 border-b-2 border-slate-900 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Regional Administrators ({assignedAdministrators.length})</span>
                </button>
                <button
                    onClick={() => router.push("/dashboard/federal?tab=hierarchy")}
                    className={`pb-3 transition-colors cursor-pointer ${
                        currentTab === "hierarchy"
                            ? "text-slate-900 border-b-2 border-slate-900 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    National Hierarchy
                </button>
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
                    {/* 4 Clean Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Regions</span>
                            <div className="text-2xl font-bold text-slate-900">{data?.counts.totalRegions ?? 0}</div>
                            <p className="text-[11px] text-slate-500">Autonomous Regional Bureaus</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Zones</span>
                            <div className="text-2xl font-bold text-slate-900">{data?.counts.totalZones ?? 0}</div>
                            <p className="text-[11px] text-slate-500">Zonal Departments</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Woredas</span>
                            <div className="text-2xl font-bold text-slate-900">{data?.counts.totalWoredas ?? 0}</div>
                            <p className="text-[11px] text-slate-500">District Offices</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-1">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Schools</span>
                            <div className="text-2xl font-bold text-slate-900">{data?.counts.totalSchools ?? 0}</div>
                            <p className="text-[11px] text-slate-500">Registered Institutions</p>
                        </div>
                    </div>

                    {/* Region Directory Section */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Regions</h2>
                                <p className="text-[11px] text-slate-500">Registered administrative regions and leadership status</p>
                            </div>
                            <button
                                onClick={() => router.push("/dashboard/federal?tab=regions")}
                                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                            >
                                <span>View Directory</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                        <th className="p-3">Region Name</th>
                                        <th className="p-3">Zones</th>
                                        <th className="p-3">Woredas</th>
                                        <th className="p-3">Schools</th>
                                        <th className="p-3">Administrator Status</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRegions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-slate-500">
                                                No regions registered. Click <strong>Add Region</strong> to register a region.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRegions.map(region => (
                                            <tr key={region.id} className="hover:bg-slate-50/60">
                                                <td className="p-3 font-semibold text-slate-900">
                                                    {region.name}
                                                </td>
                                                <td className="p-3 text-slate-700">{region.zonesCount}</td>
                                                <td className="p-3 text-slate-700">{region.woredasCount}</td>
                                                <td className="p-3 text-slate-700">{region.schoolsCount}</td>
                                                <td className="p-3">
                                                    {region.admin ? (
                                                        region.admin.status === "ACTIVE" ? (
                                                            <div className="space-y-0.5">
                                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                    Active
                                                                </span>
                                                                <p className="font-semibold text-slate-900 text-xs">{region.admin.name}</p>
                                                                <p className="text-[11px] text-slate-500">{region.admin.email}</p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-0.5">
                                                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                    Invitation Pending
                                                                </span>
                                                                <p className="text-[11px] text-slate-700">{region.admin.email}</p>
                                                                {region.admin.invitedAt && (
                                                                    <p className="text-[10px] text-slate-400">
                                                                        Sent: {new Date(region.admin.invitedAt).toLocaleDateString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )
                                                    ) : (
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                                            Not Assigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {region.admin ? (
                                                        <button
                                                            onClick={() => router.push(`/dashboard/region?targetOrgId=${region.id}`)}
                                                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer"
                                                        >
                                                            View Region
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => openAssignAdmin(region)}
                                                            className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                                        >
                                                            Assign Administrator
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: REGIONS DIRECTORY */}
            {currentTab === "regions" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Region Directory</h2>
                            <p className="text-xs text-slate-500">Manage administrative regions and regional leadership assignments</p>
                        </div>

                        <button
                            onClick={() => {
                                setNewRegionName("");
                                setNewRegionCode("");
                                setCreateRegionMessage(null);
                                setCreateRegionOpen(true);
                            }}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
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
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-slate-400 outline-none"
                        />
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                    <th className="p-3">Region</th>
                                    <th className="p-3">Subordinate Units</th>
                                    <th className="p-3">Administrator Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRegions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-500">
                                            No regions found. Click <strong>Add Region</strong> to create a region.
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
                                                            <p className="text-[10px] text-slate-600">Regional Administrator</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                Invitation Pending
                                                            </span>
                                                            <p className="font-medium text-slate-900">{region.admin.name}</p>
                                                            <p className="text-[11px] text-slate-600">{region.admin.email}</p>
                                                            {region.admin.invitedAt && (
                                                                <p className="text-[10px] text-slate-400">
                                                                    Invitation sent: {new Date(region.admin.invitedAt).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-2 pt-1">
                                                                <button
                                                                    onClick={() => handleResendInvitation(region.id)}
                                                                    disabled={actionLoadingId === region.id}
                                                                    className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer disabled:opacity-50"
                                                                >
                                                                    Resend Invitation
                                                                </button>
                                                                <span className="text-slate-300">•</span>
                                                                <button
                                                                    onClick={() => handleCancelInvitation(region.id)}
                                                                    disabled={actionLoadingId === region.id}
                                                                    className="text-[11px] font-semibold text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
                                                                >
                                                                    Cancel Invitation
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
                                                                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                                                            >
                                                                Assign Regional Administrator
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right align-top">
                                                <button
                                                    onClick={() => router.push(`/dashboard/region?targetOrgId=${region.id}`)}
                                                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer"
                                                >
                                                    View Region
                                                </button>
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
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 p-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">Regional Administrators</h2>
                        <p className="text-xs text-slate-500">Status of appointed administrators across regions</p>
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
                                                    <div className="space-y-0.5">
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                            Invitation Pending
                                                        </span>
                                                        {admin.invitedAt && (
                                                            <p className="text-[10px] text-slate-400">
                                                                Sent: {new Date(admin.invitedAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {admin.status === "INVITATION_PENDING" && (
                                                        <button
                                                            onClick={() => handleResendInvitation(regionId)}
                                                            disabled={actionLoadingId === regionId}
                                                            className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded cursor-pointer"
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

            {/* TAB 4: HIERARCHY TREE */}
            {currentTab === "hierarchy" && (
                <HierarchyTreeViewer rootOrgId={data?.federalId || undefined} userTier="FEDERAL" />
            )}

            {/* MODAL 1: CREATE REGION */}
            {createRegionOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
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
                                    placeholder="e.g., Amhara Region"
                                    value={newRegionName}
                                    onChange={e => setNewRegionName(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-slate-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">Region Code</label>
                                <input
                                    type="text"
                                    placeholder="e.g., AMH"
                                    value={newRegionCode}
                                    onChange={e => setNewRegionCode(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-slate-500 outline-none"
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
                                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg transition-colors cursor-pointer"
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
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-sm font-bold text-slate-900">Assign Regional Administrator</h3>
                            <button
                                onClick={() => setAssignAdminOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAssignAdminSubmit} className="space-y-3.5 text-xs">
                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Region</label>
                                <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-900 font-semibold">
                                    {selectedRegionForAdmin.name}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Samuel Example"
                                    value={adminFullName}
                                    onChange={e => setAdminFullName(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-slate-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">
                                    Email <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g., samuel@example.com"
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-slate-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 block">Phone (Optional)</label>
                                <input
                                    type="tel"
                                    placeholder="+251 911 000000"
                                    value={adminPhone}
                                    onChange={e => setAdminPhone(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-slate-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Role</label>
                                <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200 text-slate-800 font-semibold">
                                    Regional Administrator
                                </div>
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
                                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-lg transition-colors cursor-pointer"
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
