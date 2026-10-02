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
    Send,
    Eye,
    Shield,
    Network,
    ArrowRight
} from "lucide-react";
import HierarchyTreeViewer from "./HierarchyTreeViewer";

export interface ZoneAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
}

export interface ZoneItem {
    id: string;
    name: string;
    type: "ZONE";
    parentId: string | null;
    woredasCount: number;
    schoolsCount: number;
    admin: ZoneAdmin | null;
}

export interface RegionOverviewData {
    regionId: string | null;
    regionName: string;
    parentFederalName: string;
    counts: {
        totalZones: number;
        totalWoredas: number;
        totalSchools: number;
    };
    zones: ZoneItem[];
}

export default function RegionalDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams?.get("tab") || "overview";

    const [data, setData] = useState<RegionOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State: Create Zone
    const [createZoneOpen, setCreateZoneOpen] = useState(false);
    const [newZoneName, setNewZoneName] = useState("");
    const [newZoneCode, setNewZoneCode] = useState("");
    const [creatingZone, setCreatingZone] = useState(false);
    const [createZoneMessage, setCreateZoneMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal State: Assign Zone Administrator
    const [assignAdminOpen, setAssignAdminOpen] = useState(false);
    const [selectedZoneForAdmin, setSelectedZoneForAdmin] = useState<ZoneItem | null>(null);
    const [adminFullName, setAdminFullName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [assigningAdmin, setAssigningAdmin] = useState(false);
    const [assignAdminMessage, setAssignAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Action state for resend/cancel
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const loadRegionData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchApi("/hierarchy/region/overview");
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load Regional Overview");
            }
            const payload = await res.json();
            setData(payload.data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch Regional dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRegionData();
    }, []);

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Filter zones by search query
    const filteredZones = useMemo(() => {
        if (!data?.zones) return [];
        if (!searchQuery.trim()) return data.zones;
        const q = searchQuery.toLowerCase();
        return data.zones.filter(
            z =>
                z.name.toLowerCase().includes(q) ||
                (z.admin?.name && z.admin.name.toLowerCase().includes(q)) ||
                (z.admin?.email && z.admin.email.toLowerCase().includes(q))
        );
    }, [data?.zones, searchQuery]);

    // Extract all administrators for Administration tab
    const assignedAdministrators = useMemo(() => {
        if (!data?.zones) return [];
        return data.zones
            .filter(z => z.admin !== null)
            .map(z => ({
                zoneId: z.id,
                zoneName: z.name,
                admin: z.admin!
            }));
    }, [data?.zones]);

    // Handle Create Zone Submit
    const handleCreateZoneSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newZoneName.trim() || !data?.regionId) return;

        setCreatingZone(true);
        setCreateZoneMessage(null);
        try {
            const res = await fetchApi("/hierarchy", {
                method: "POST",
                body: JSON.stringify({
                    name: newZoneName.trim(),
                    type: "ZONE",
                    parentId: data.regionId,
                    code: newZoneCode.trim() || undefined
                })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to create Zone.");
            }

            setCreateZoneMessage({ type: "success", text: `Zone "${newZoneName.trim()}" created successfully.` });
            setNewZoneName("");
            setNewZoneCode("");
            await loadRegionData();
            setTimeout(() => {
                setCreateZoneOpen(false);
                setCreateZoneMessage(null);
            }, 1200);
        } catch (err: any) {
            setCreateZoneMessage({ type: "error", text: err.message || "Failed to create Zone." });
        } finally {
            setCreatingZone(false);
        }
    };

    // Handle Assign Zone Administrator Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedZoneForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/zones/${selectedZoneForAdmin.id}/assign-admin`, {
                method: "POST",
                body: JSON.stringify({
                    name: adminFullName.trim(),
                    email: adminEmail.trim(),
                    phone: adminPhone.trim() || undefined
                })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to assign Zone Administrator.");
            }

            setAssignAdminMessage({
                type: "success",
                text: `Invitation email dispatched to ${adminEmail.trim()} with account activation instructions.`
            });
            setAdminFullName("");
            setAdminEmail("");
            setAdminPhone("");
            await loadRegionData();
            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedZoneForAdmin(null);
                setAssignAdminMessage(null);
            }, 1500);
        } catch (err: any) {
            setAssignAdminMessage({ type: "error", text: err.message || "Failed to assign administrator." });
        } finally {
            setAssigningAdmin(false);
        }
    };

    // Handle Resend Invitation
    const handleResendInvitation = async (zoneId: string, zoneName: string) => {
        setActionLoadingId(zoneId);
        try {
            const res = await fetchApi(`/hierarchy/zones/${zoneId}/resend-invitation`, {
                method: "POST"
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to resend invitation.");
            }
            showToast("success", `Invitation email resent to ${zoneName} Administrator.`);
            await loadRegionData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation.");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (zoneId: string, zoneName: string) => {
        if (!confirm(`Are you sure you want to cancel the administrator invitation for ${zoneName}?`)) {
            return;
        }
        setActionLoadingId(zoneId);
        try {
            const res = await fetchApi(`/hierarchy/zones/${zoneId}/cancel-invitation`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to cancel invitation.");
            }
            showToast("success", `Administrator assignment cancelled for ${zoneName}.`);
            await loadRegionData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to cancel invitation.");
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleTabChange = (tabKey: string) => {
        const url = tabKey === "overview" ? "/dashboard/region" : `/dashboard/region?tab=${tabKey}`;
        router.push(url);
    };

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-[#184973]" />
                <p className="text-sm font-medium">Loading Regional Education Bureau Dashboard...</p>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center space-y-4">
                    <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
                    <h2 className="text-lg font-bold text-gray-900">Unable to Load Regional Dashboard</h2>
                    <p className="text-xs text-red-700">{error}</p>
                    <button
                        onClick={loadRegionData}
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
                            <span>{data?.parentFederalName || "Federal Ministry of Education"}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                {data?.regionName || "Regional Education Bureau"}
                            </h1>
                            <span className="px-2.5 py-0.5 bg-blue-50 text-[#184973] border border-blue-200/80 rounded-md text-[11px] font-bold uppercase tracking-wider">
                                REGION DESK
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            Administrative governance, zonal jurisdiction, and educational hierarchy monitoring.
                        </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                        <button
                            onClick={() => loadRegionData()}
                            disabled={loading}
                            title="Refresh Data"
                            className="p-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-colors cursor-pointer"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#184973]" : ""}`} />
                        </button>

                        <button
                            onClick={() => setCreateZoneOpen(true)}
                            className="px-4 py-2.5 bg-[#184973] hover:bg-[#123655] text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center space-x-2 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add New Zone</span>
                        </button>
                    </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
                    <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between text-gray-500 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Administrative Zones</span>
                            <Building2 className="w-4 h-4 text-[#184973]" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{data?.counts.totalZones ?? 0}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Under regional jurisdiction</p>
                    </div>

                    <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between text-gray-500 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Total Woredas</span>
                            <MapPin className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{data?.counts.totalWoredas ?? 0}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Across all regional zones</p>
                    </div>

                    <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between text-gray-500 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Registered Schools</span>
                            <School className="w-4 h-4 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{data?.counts.totalSchools ?? 0}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Operational institutional units</p>
                    </div>

                    <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-4">
                        <div className="flex items-center justify-between text-gray-500 mb-1">
                            <span className="text-xs font-medium uppercase tracking-wider">Assigned Admins</span>
                            <Shield className="w-4 h-4 text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900">
                            {data?.zones.filter(z => z.admin !== null).length ?? 0}
                            <span className="text-xs text-gray-500 font-normal ml-1">/ {data?.zones.length ?? 0}</span>
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Zonal administrators designated</p>
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
                    onClick={() => handleTabChange("zones")}
                    className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                        currentTab === "zones"
                            ? "border-[#184973] text-[#184973]"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    Administrative Zones ({data?.zones.length ?? 0})
                </button>
                <button
                    onClick={() => handleTabChange("administration")}
                    className={`px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                        currentTab === "administration"
                            ? "border-[#184973] text-[#184973]"
                            : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                    Zone Administrators ({assignedAdministrators.length})
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

            {/* TAB CONTENT: Overview & Zones Table */}
            {(currentTab === "overview" || currentTab === "zones") && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
                        <div>
                            <h2 className="text-base font-bold text-gray-900">Subordinate Administrative Zones</h2>
                            <p className="text-xs text-gray-500">
                                Designated Zonal Education Departments under {data?.regionName || "the Region"}.
                            </p>
                        </div>

                        {/* Search */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Filter zones or administrators..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#184973]"
                            />
                        </div>
                    </div>

                    {filteredZones.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-gray-200 rounded-xl space-y-3">
                            <Building2 className="w-10 h-10 text-gray-300 mx-auto" />
                            <p className="text-sm font-semibold text-gray-700">No Administrative Zones Found</p>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                {searchQuery
                                    ? "No zones match your search query."
                                    : "No Zones have been established under this Region yet. Click below to add the first Zone."}
                            </p>
                            {!searchQuery && (
                                <button
                                    onClick={() => setCreateZoneOpen(true)}
                                    className="mt-2 px-4 py-2 bg-[#184973] text-white text-xs font-semibold rounded-lg hover:bg-[#123655] transition-colors"
                                >
                                    + Add First Zone
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider border-y border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4">Zone Name</th>
                                        <th className="py-3 px-4">Woredas</th>
                                        <th className="py-3 px-4">Schools</th>
                                        <th className="py-3 px-4">Designated Administrator</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {filteredZones.map(zone => {
                                        const hasAdmin = !!zone.admin;
                                        const isPending = zone.admin?.status === "INVITATION_PENDING";
                                        const isActive = zone.admin?.status === "ACTIVE";

                                        return (
                                            <tr key={zone.id} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-gray-900">
                                                    <div className="flex items-center space-x-2">
                                                        <Building2 className="w-4 h-4 text-[#184973]" />
                                                        <span>{zone.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">{zone.woredasCount}</td>
                                                <td className="py-3.5 px-4">{zone.schoolsCount}</td>
                                                <td className="py-3.5 px-4">
                                                    {hasAdmin ? (
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{zone.admin!.name}</p>
                                                            <p className="text-[11px] text-gray-500">{zone.admin!.email}</p>
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
                                                                    setSelectedZoneForAdmin(zone);
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
                                                                            onClick={() => handleResendInvitation(zone.id, zone.name)}
                                                                            disabled={actionLoadingId === zone.id}
                                                                            className="px-2.5 py-1.5 border border-amber-300 hover:bg-amber-50 text-amber-800 text-[11px] font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                                                                            title="Resend Activation Email"
                                                                        >
                                                                            <Send className="w-3 h-3" />
                                                                            <span>Resend</span>
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCancelInvitation(zone.id, zone.name)}
                                                                            disabled={actionLoadingId === zone.id}
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
                                                            onClick={() => router.push(`/dashboard/zone?targetOrgId=${zone.id}`)}
                                                            className="p-1.5 text-gray-500 hover:text-[#184973] hover:bg-gray-100 rounded-lg transition-colors"
                                                            title="Inspect Zone Desk"
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

            {/* TAB CONTENT: Zone Administrators Directory */}
            {currentTab === "administration" && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
                    <div className="pb-2 border-b border-gray-100">
                        <h2 className="text-base font-bold text-gray-900">Zone Administrators Directory</h2>
                        <p className="text-xs text-gray-500">
                            Authorized Zonal Administrators holding governance credentials within {data?.regionName}.
                        </p>
                    </div>

                    {assignedAdministrators.length === 0 ? (
                        <div className="p-12 text-center border border-dashed border-gray-200 rounded-xl space-y-2">
                            <Shield className="w-8 h-8 text-gray-300 mx-auto" />
                            <p className="text-sm font-semibold text-gray-700">No Administrators Assigned</p>
                            <p className="text-xs text-gray-500">Assign an administrator to any of your subordinate Zones above.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50/80 text-gray-500 font-semibold uppercase text-[10px] tracking-wider border-y border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4">Administrator</th>
                                        <th className="py-3 px-4">Assigned Zone</th>
                                        <th className="py-3 px-4">Authority Scope</th>
                                        <th className="py-3 px-4">Account Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium">
                                    {assignedAdministrators.map(({ zoneId, zoneName, admin }) => (
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
                                            <td className="py-3 px-4 font-semibold text-gray-800">{zoneName}</td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 bg-blue-50 text-[#184973] rounded font-bold text-[10px]">
                                                    ZONAL DESK
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
                                                            onClick={() => handleResendInvitation(zoneId, zoneName)}
                                                            disabled={actionLoadingId === zoneId}
                                                            className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition-colors"
                                                        >
                                                            Resend Email
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelInvitation(zoneId, zoneName)}
                                                            disabled={actionLoadingId === zoneId}
                                                            className="px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                        <h2 className="text-base font-bold text-gray-900">Regional Hierarchy Breakdown</h2>
                        <p className="text-xs text-gray-500">
                            Interactive hierarchical map from {data?.regionName} through subordinate Zones, Woredas, and Schools.
                        </p>
                    </div>
                    {data?.regionId ? (
                        <HierarchyTreeViewer rootOrgId={data.regionId} userTier="REGION" />
                    ) : (
                        <div className="p-8 text-center text-xs text-gray-500">Loading hierarchy tree...</div>
                    )}
                </div>
            )}

            {/* MODAL: Create New Zone */}
            {createZoneOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center space-x-2">
                                <Building2 className="w-5 h-5 text-[#184973]" />
                                <h3 className="text-base font-bold text-gray-900">Create New Zone</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setCreateZoneOpen(false);
                                    setCreateZoneMessage(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
                            >
                                &times;
                            </button>
                        </div>

                        {createZoneMessage && (
                            <div
                                className={`p-3 rounded-lg text-xs font-semibold ${
                                    createZoneMessage.type === "success"
                                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                        : "bg-red-50 text-red-800 border border-red-200"
                                }`}
                            >
                                {createZoneMessage.text}
                            </div>
                        )}

                        <form onSubmit={handleCreateZoneSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Parent Regional Bureau
                                </label>
                                <input
                                    type="text"
                                    value={data?.regionName || "Amhara Region"}
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-200 rounded-lg p-2 text-xs text-gray-600 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Zone Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newZoneName}
                                    onChange={e => setNewZoneName(e.target.value)}
                                    placeholder="e.g. North Gondar Zone"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#184973] focus:border-[#184973] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Zone Identifier / Code (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={newZoneCode}
                                    onChange={e => setNewZoneCode(e.target.value)}
                                    placeholder="e.g. ZN-NG"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#184973] focus:border-[#184973] outline-none"
                                />
                            </div>

                            <p className="text-[11px] text-gray-500 italic">
                                Note: Creating a Zone establishes an organizational unit. You will be able to assign an authorized Zone Administrator on the next step.
                            </p>

                            <div className="flex items-center justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreateZoneOpen(false);
                                        setCreateZoneMessage(null);
                                    }}
                                    disabled={creatingZone}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingZone || !newZoneName.trim()}
                                    className="px-5 py-2 bg-[#184973] hover:bg-[#123655] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                                >
                                    {creatingZone && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>{creatingZone ? "Creating Zone..." : "Create Zone"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: Assign Zone Administrator */}
            {assignAdminOpen && selectedZoneForAdmin && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center space-x-2">
                                <UserPlus className="w-5 h-5 text-[#184973]" />
                                <h3 className="text-base font-bold text-gray-900">Assign Zone Administrator</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setAssignAdminOpen(false);
                                    setSelectedZoneForAdmin(null);
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

                        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 space-y-1">
                            <p className="text-[11px] font-bold text-[#184973] uppercase tracking-wider">Designated Administrative Unit</p>
                            <p className="text-sm font-bold text-gray-900">{selectedZoneForAdmin.name} (Zone)</p>
                            <p className="text-xs text-gray-600">
                                Region: <span className="font-semibold text-gray-800">{data?.regionName}</span>
                            </p>
                        </div>

                        <form onSubmit={handleAssignAdminSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    Administrator Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={adminFullName}
                                    onChange={e => setAdminFullName(e.target.value)}
                                    placeholder="e.g. Abebe Bekele"
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
                                    placeholder="e.g. abebe.bekele@edubridge.gov.et"
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
                                    placeholder="e.g. +251 911 000 000"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-[#184973] focus:border-[#184973] outline-none"
                                />
                            </div>

                            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                                <strong>Official Invitation Notice:</strong> EduBridge will dispatch a formal notification from the <strong>{data?.regionName} Regional Education Bureau</strong> containing a secure activation token. The designated administrator will set their own password upon first sign-in.
                            </div>

                            <div className="flex items-center justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAssignAdminOpen(false);
                                        setSelectedZoneForAdmin(null);
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
                                    className="px-5 py-2 bg-[#184973] hover:bg-[#123655] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                                >
                                    {assigningAdmin && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                                    <span>{assigningAdmin ? "Sending Official Invitation..." : "Send Invitation"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
