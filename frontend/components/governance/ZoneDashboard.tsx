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
    Clock,
    Shield,
    Send,
    ArrowRight
} from "lucide-react";
import HierarchyTreeViewer from "./HierarchyTreeViewer";

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

    // Handle Create Woreda Submit
    const handleCreateWoredaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWoredaName.trim() || !data?.zoneId) return;

        setCreatingWoreda(true);
        setCreateWoredaMessage(null);
        try {
            const res = await fetchApi("/hierarchy", {
                method: "POST",
                body: JSON.stringify({
                    name: newWoredaName.trim(),
                    type: "WOREDA",
                    parentId: data.zoneId,
                    code: newWoredaCode.trim() || undefined
                })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to create Woreda.");
            }

            setCreateWoredaMessage({ type: "success", text: `Woreda "${newWoredaName.trim()}" created successfully.` });
            setNewWoredaName("");
            setNewWoredaCode("");
            await loadZoneData();
            setTimeout(() => {
                setCreateWoredaOpen(false);
                setCreateWoredaMessage(null);
            }, 1200);
        } catch (err: any) {
            setCreateWoredaMessage({ type: "error", text: err.message || "Failed to create Woreda." });
        } finally {
            setCreatingWoreda(false);
        }
    };

    // Handle Assign Woreda Administrator Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWoredaForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/woredas/${selectedWoredaForAdmin.id}/assign-admin`, {
                method: "POST",
                body: JSON.stringify({
                    name: adminFullName.trim(),
                    email: adminEmail.trim(),
                    phone: adminPhone.trim() || undefined
                })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to assign Woreda Administrator.");
            }

            setAssignAdminMessage({
                type: "success",
                text: `Invitation email dispatched to ${adminEmail.trim()} with account activation instructions.`
            });
            setAdminFullName("");
            setAdminEmail("");
            setAdminPhone("");
            await loadZoneData();
            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedWoredaForAdmin(null);
                setAssignAdminMessage(null);
            }, 1500);
        } catch (err: any) {
            setAssignAdminMessage({ type: "error", text: err.message || "Failed to assign administrator." });
        } finally {
            setAssigningAdmin(false);
        }
    };

    // Handle Resend Invitation
    const handleResendInvitation = async (woredaId: string, woredaName: string) => {
        setActionLoadingId(woredaId);
        try {
            const res = await fetchApi(`/hierarchy/woredas/${woredaId}/resend-invitation`, {
                method: "POST"
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to resend invitation.");
            }
            showToast("success", `Invitation email resent to ${woredaName} Administrator.`);
            await loadZoneData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation.");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (woredaId: string, woredaName: string) => {
        if (!confirm(`Are you sure you want to cancel the administrator invitation for ${woredaName}?`)) {
            return;
        }
        setActionLoadingId(woredaId);
        try {
            const res = await fetchApi(`/hierarchy/woredas/${woredaId}/cancel-invitation`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to cancel invitation.");
            }
            showToast("success", `Administrator assignment cancelled for ${woredaName}.`);
            await loadZoneData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to cancel invitation.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleTabChange = (tabKey: string) => {
        const targetParam = targetOrgId ? `&targetOrgId=${targetOrgId}` : "";
        const url = tabKey === "overview" 
            ? `/dashboard/zone${targetOrgId ? `?targetOrgId=${targetOrgId}` : ""}` 
            : `/dashboard/zone?tab=${tabKey}${targetParam}`;
        router.push(url);
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#184973]" />
                <p className="text-sm font-medium">Loading Zonal Education Department Dashboard...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4">
                    <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
                    <h2 className="text-lg font-bold text-gray-900">Unable to Load Zone Dashboard</h2>
                    <p className="text-xs text-red-700">{error}</p>
                    <button
                        onClick={loadZoneData}
                        className="px-4 py-2 bg-[#184973] text-white text-xs font-semibold rounded-lg hover:bg-[#123655] transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Toast Feedback */}
            {toastMessage && (
                <div
                    className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 ${
                        toastMessage.type === "success"
                            ? "bg-emerald-800 text-white border border-emerald-700"
                            : "bg-red-800 text-white border border-red-700"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-red-300" />
                    )}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Header Banner - Clean Government Style */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1.5 font-medium">
                            <span>Federal Democratic Republic of Ethiopia</span>
                            <span>•</span>
                            <span>{data?.parentRegionName || "Regional Education Bureau"}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                {data?.zoneName || "Zonal Education Department"}
                            </h1>
                            <span className="px-2.5 py-0.5 bg-blue-50 text-[#184973] border border-blue-200/80 rounded-md text-[11px] font-bold uppercase tracking-wider">
                                ZONE DESK
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            Administrative governance, woreda oversight, and educational hierarchy monitoring.
                        </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                        <button
                            onClick={() => loadZoneData()}
                            disabled={loading}
                            title="Refresh Data"
                            className="p-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#184973]" : ""}`} />
                        </button>

                        <button
                            onClick={() => setCreateWoredaOpen(true)}
                            className="px-4 py-2.5 bg-[#184973] hover:bg-[#123655] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add New Woreda</span>
                        </button>
                    </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
                    <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between text-gray-500 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Administrative Woredas</span>
                            <MapPin className="w-4 h-4 text-[#184973]" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{data?.counts.totalWoredas ?? 0}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Under zonal jurisdiction</p>
                    </div>

                    <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between text-gray-500 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Registered Schools</span>
                            <School className="w-4 h-4 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{data?.counts.totalSchools ?? 0}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Across all zonal woredas</p>
                    </div>

                    <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between text-gray-500 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Assigned Admins</span>
                            <Shield className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {data?.woredas.filter(w => w.admin !== null).length ?? 0}
                            <span className="text-xs text-gray-500 font-normal ml-1">/ {data?.woredas.length ?? 0}</span>
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Woreda administrators designated</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-gray-200 bg-white px-4 rounded-xl shadow-xs">
                <button
                    onClick={() => handleTabChange("overview")}
                    className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                        currentTab === "overview"
                            ? "border-[#184973] text-[#184973]"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    Overview & Desks
                </button>
                <button
                    onClick={() => handleTabChange("woredas")}
                    className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                        currentTab === "woredas"
                            ? "border-[#184973] text-[#184973]"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    Administrative Woredas ({data?.woredas.length ?? 0})
                </button>
                <button
                    onClick={() => handleTabChange("administration")}
                    className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                        currentTab === "administration"
                            ? "border-[#184973] text-[#184973]"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    Woreda Administrators ({assignedAdministrators.length})
                </button>
                <button
                    onClick={() => handleTabChange("hierarchy")}
                    className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                        currentTab === "hierarchy"
                            ? "border-[#184973] text-[#184973]"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    Hierarchy Tree
                </button>
            </div>

            {/* TAB CONTENT: Overview & Woredas Table */}
            {(currentTab === "overview" || currentTab === "woredas") && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Subordinate Administrative Woredas</h2>
                            <p className="text-xs text-gray-500">
                                Designated Woreda Education Offices under {data?.zoneName || "the Zone"}.
                            </p>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Filter woredas or administrators..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#184973]"
                            />
                        </div>
                    </div>

                    {filteredWoredas.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-gray-200 rounded-xl space-y-3">
                            <MapPin className="w-10 h-10 text-gray-300 mx-auto" />
                            <p className="text-sm font-semibold text-gray-700">No Administrative Woredas Found</p>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                {searchQuery
                                    ? "No woredas match your search query."
                                    : "No Woredas have been established under this Zone yet. Click below to add the first Woreda."}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={() => setCreateWoredaOpen(true)}
                                    className="mt-2 px-4 py-2 bg-[#184973] text-white text-xs font-semibold rounded-lg hover:bg-[#123655] transition-colors cursor-pointer"
                                >
                                    + Add First Woreda
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider border-y border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4">Woreda Name</th>
                                        <th className="py-3 px-4">Schools</th>
                                        <th className="py-3 px-4">Designated Administrator</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {filteredWoredas.map(woreda => {
                                        const hasAdmin = !!woreda.admin;
                                        const isPending = woreda.admin?.status === "INVITATION_PENDING";
                                        const isActive = woreda.admin?.status === "ACTIVE";

                                        return (
                                            <tr key={woreda.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-gray-900">
                                                    <div className="flex items-center space-x-2">
                                                        <MapPin className="w-4 h-4 text-[#184973]" />
                                                        <span>{woreda.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">{woreda.schoolsCount}</td>
                                                <td className="py-3.5 px-4">
                                                    {hasAdmin ? (
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{woreda.admin!.name}</p>
                                                            <p className="text-[11px] text-gray-500">{woreda.admin!.email}</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No admin assigned</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {isActive && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                                            Active
                                                        </span>
                                                    )}
                                                    {isPending && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            <Clock className="w-3 h-3 mr-1 text-amber-600" />
                                                            Invitation Pending
                                                        </span>
                                                    )}
                                                    {!hasAdmin && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        {!hasAdmin ? (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedWoredaForAdmin(woreda);
                                                                    setAssignAdminOpen(true);
                                                                }}
                                                                className="px-2.5 py-1.5 bg-[#184973] hover:bg-[#123655] text-white text-[11px] font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                                                            >
                                                                <UserPlus className="w-3 h-3" />
                                                                <span>Assign Admin</span>
                                                            </button>
                                                        ) : (
                                                            <>
                                                                {isPending && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleResendInvitation(woreda.id, woreda.name)}
                                                                            disabled={actionLoadingId === woreda.id}
                                                                            className="px-2.5 py-1.5 border border-amber-300 hover:bg-amber-50 text-amber-800 text-[11px] font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                                                                            title="Resend Activation Email"
                                                                        >
                                                                            <Send className="w-3 h-3" />
                                                                            <span>Resend</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCancelInvitation(woreda.id, woreda.name)}
                                                                            disabled={actionLoadingId === woreda.id}
                                                                            className="px-2 py-1.5 text-red-600 hover:bg-red-50 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                                                            title="Cancel Assignment"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => router.push(`/dashboard/woreda?targetOrgId=${woreda.id}`)}
                                                            className="p-1.5 text-gray-500 hover:text-[#184973] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                                            title="Inspect Woreda Desk"
                                                        >
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: Woreda Administrators Directory */}
            {currentTab === "administration" && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="pb-2 border-b border-gray-100">
                        <h2 className="text-base font-bold text-gray-900">Woreda Administrators Directory</h2>
                        <p className="text-xs text-gray-500">
                            Authorized Woreda Administrators holding governance credentials within {data?.zoneName}.
                        </p>
                    </div>

                    {assignedAdministrators.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-gray-200 rounded-xl space-y-2">
                            <Shield className="w-8 h-8 text-gray-300 mx-auto" />
                            <p className="text-sm font-semibold text-gray-700">No Administrators Assigned</p>
                            <p className="text-xs text-gray-500">Assign an administrator to any of your subordinate Woredas above.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider border-y border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4">Administrator</th>
                                        <th className="py-3 px-4">Assigned Woreda</th>
                                        <th className="py-3 px-4">Authority Scope</th>
                                        <th className="py-3 px-4">Account Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {assignedAdministrators.map(({ woredaId, woredaName, admin }) => (
                                        <tr key={admin.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center space-x-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-[#184973] text-white flex items-center justify-center font-bold text-[10px]">
                                                        {admin.name.slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{admin.name}</p>
                                                        <p className="text-[11px] text-gray-500">{admin.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-gray-800">{woredaName}</td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 bg-blue-50 text-[#184973] rounded font-bold text-[10px]">
                                                    WOREDA DESK
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                {admin.status === "ACTIVE" ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <Clock className="w-3 h-3 mr-1 text-amber-600" />
                                                        Invitation Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                {admin.status === "INVITATION_PENDING" && (
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleResendInvitation(woredaId, woredaName)}
                                                            disabled={actionLoadingId === woredaId}
                                                            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                                                        >
                                                            Resend Email
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelInvitation(woredaId, woredaName)}
                                                            disabled={actionLoadingId === woredaId}
                                                            className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: Hierarchy Tree */}
            {currentTab === "hierarchy" && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="pb-2 border-b border-gray-100">
                        <h2 className="text-base font-bold text-gray-900">Zonal Hierarchy Breakdown</h2>
                        <p className="text-xs text-gray-500">
                            Interactive hierarchical map from {data?.zoneName} through subordinate Woredas and Schools.
                        </p>
                    </div>
                    {data?.zoneId ? (
                        <HierarchyTreeViewer rootOrgId={data.zoneId} userTier="ZONE" />
                    ) : (
                        <div className="p-8 text-center text-xs text-gray-500">Loading hierarchy tree...</div>
                    )}
                </div>
            )}

            {/* MODAL: Create New Woreda */}
            {createWoredaOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center space-x-2">
                                <MapPin className="w-5 h-5 text-[#184973]" />
                                <h3 className="text-base font-bold text-gray-900">Create New Woreda</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setCreateWoredaOpen(false);
                                    setCreateWoredaMessage(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        {createWoredaMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold ${
                                    createWoredaMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-red-50 text-red-800 border border-red-200"
                                }`}
                            >
                                {createWoredaMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleCreateWoredaSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Parent Zonal Department
                                </label>
                                <input
                                    type="text"
                                    value={data?.zoneName || "Zonal Education Department"}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2 text-xs text-gray-600 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Woreda Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newWoredaName}
                                    onChange={e => setNewWoredaName(e.target.value)}
                                    placeholder="e.g. Basona Werana Woreda"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#184973] focus:border-[#184973] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Woreda Identifier / Code (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={newWoredaCode}
                                    onChange={e => setNewWoredaCode(e.target.value)}
                                    placeholder="e.g. WR-BW"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#184973] focus:border-[#184973] outline-none"
                                />
                            </div>

                            <p className="text-[11px] text-gray-500 italic">
                                Note: Creating a Woreda establishes an administrative unit. You will be able to assign an authorized Woreda Administrator on the next step.
                            </p>

                            <div className="flex items-center justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreateWoredaOpen(false);
                                        setCreateWoredaMessage(null);
                                    }}
                                    disabled={creatingWoreda}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingWoreda || !newWoredaName.trim()}
                                    className="px-4 py-2 bg-[#184973] hover:bg-[#123655] text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {creatingWoreda ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Create Woreda</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Assign Woreda Administrator */}
            {assignAdminOpen && selectedWoredaForAdmin && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center space-x-2">
                                <UserPlus className="w-5 h-5 text-[#184973]" />
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">Assign Woreda Administrator</h3>
                                    <p className="text-xs text-gray-500">{selectedWoredaForAdmin.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setAssignAdminOpen(false);
                                    setSelectedWoredaForAdmin(null);
                                    setAssignAdminMessage(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        {assignAdminMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold ${
                                    assignAdminMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-red-50 text-red-800 border border-red-200"
                                }`}
                            >
                                {assignAdminMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleAssignAdminSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Target Woreda Unit
                                </label>
                                <input
                                    type="text"
                                    value={selectedWoredaForAdmin.name}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2 text-xs text-gray-600 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Administrator Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={adminFullName}
                                    onChange={e => setAdminFullName(e.target.value)}
                                    placeholder="e.g. Almaz Bekele"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#184973] focus:border-[#184973] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Official Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    placeholder="e.g. almaz.bekele@edubridge.gov.et"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#184973] focus:border-[#184973] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Phone Number (Optional)
                                </label>
                                <input
                                    type="tel"
                                    value={adminPhone}
                                    onChange={e => setAdminPhone(e.target.value)}
                                    placeholder="+251 91 234 5678"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#184973] focus:border-[#184973] outline-none"
                                />
                            </div>

                            <p className="text-[11px] text-gray-500 italic">
                                An official account activation link will be dispatched to this email address automatically.
                            </p>

                            <div className="flex items-center justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAssignAdminOpen(false);
                                        setSelectedWoredaForAdmin(null);
                                        setAssignAdminMessage(null);
                                    }}
                                    disabled={assigningAdmin}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigningAdmin || !adminFullName.trim() || !adminEmail.trim()}
                                    className="px-4 py-2 bg-[#184973] hover:bg-[#123655] text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {assigningAdmin ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Sending Invitation...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Send Invitation</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
