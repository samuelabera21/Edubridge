"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchApi } from "../../lib/api";
import {
    FileSpreadsheet,
    Plus,
    ExternalLink,
    RefreshCw,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Layers,
    Search,
    Loader2,
    Calendar,
    Target,
    Link2,
    Copy,
    Check,
    ArrowRight,
    Filter,
    Building2,
    School,
    MapPin,
    Eye,
    ChevronRight,
    X
} from "lucide-react";
import DataRequestCreateView from "./DataRequestCreateView";
import DataRequestDetailView from "./DataRequestDetailView";

export type AdminTier = "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";

export interface DataRequestsListViewProps {
    currentTier?: AdminTier;
}

export default function DataRequestsListView({
    currentTier = "FEDERAL"
}: DataRequestsListViewProps) {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Active View state: 'list' | 'create' | 'detail'
    const [activeView, setActiveView] = useState<"list" | "create" | "detail">("list");
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    // Hierarchy tree data for cascading filters
    const [treeData, setTreeData] = useState<any>(null);

    // Filter states
    const [levelFilter, setLevelFilter] = useState<"ALL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL">("ALL");
    const [filterRegionId, setFilterRegionId] = useState<string>("");
    const [filterZoneId, setFilterZoneId] = useState<string>("");
    const [filterWoredaId, setFilterWoredaId] = useState<string>("");
    const [filterSchoolId, setFilterSchoolId] = useState<string>("");

    // Issuer Filters (by level and specific issuing unit)
    const [filterIssuerLevel, setFilterIssuerLevel] = useState<"ALL" | "FEDERAL" | "REGION" | "ZONE" | "WOREDA">("ALL");
    const [filterIssuerOrgId, setFilterIssuerOrgId] = useState<string>("");

    const [directionFilter, setDirectionFilter] = useState<"all" | "created" | "received">("all");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "COMPLETED" | "DRAFT">("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Load Data Requests for user's scope
    const loadRequests = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchApi("/data-requests");
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load Data Requests");
            }
            const json = await res.json();
            setRequests(json.data || []);
        } catch (err: any) {
            console.error("Failed to load data requests:", err);
            setError(err.message || "Failed to fetch data requests.");
        } finally {
            setLoading(false);
        }
    };

    // Load hierarchy recipients tree for drill-down filters
    useEffect(() => {
        async function loadTree() {
            try {
                const res = await fetchApi("/programs/recipients-tree");
                if (res.ok) {
                    const json = await res.json();
                    setTreeData(json.data);
                }
            } catch (err) {
                console.warn("Failed to load hierarchy tree for filtering:", err);
            }
        }
        loadRequests();
        loadTree();
    }, []);

    const actorTier = treeData?.actorTier || currentTier || "FEDERAL";

    // Extract unique issuers from incoming/existing requests
    const availableIssuers = useMemo(() => {
        const map = new Map<string, { id: string; name: string; type: string }>();
        for (const r of requests) {
            if (r.createdOrganization) {
                map.set(r.createdOrganization.id, {
                    id: r.createdOrganization.id,
                    name: r.createdOrganization.name,
                    type: r.createdOrganization.type
                });
            }
        }
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [requests]);

    // Extract available regions, zones, woredas, schools for cascading target filters
    const availableRegions = useMemo(() => {
        if (!treeData) return [];
        if (treeData.regions) return treeData.regions;
        return (treeData.units || []).filter((u: any) => u.type === "REGION");
    }, [treeData]);

    const availableZones = useMemo(() => {
        if (!treeData) return [];
        if (treeData.regions) {
            if (filterRegionId) {
                const r = (treeData.regions || []).find((reg: any) => reg.id === filterRegionId);
                return r?.children || [];
            }
            return (treeData.regions || []).flatMap((reg: any) => reg.children || []);
        }
        if (treeData.zones) return treeData.zones;
        return (treeData.units || []).filter((u: any) => u.type === "ZONE");
    }, [treeData, filterRegionId]);

    const availableWoredas = useMemo(() => {
        if (!treeData) return [];
        if (treeData.woredas) return treeData.woredas;
        if (availableZones.length > 0) {
            let zonesToScan = availableZones;
            if (filterZoneId) {
                zonesToScan = zonesToScan.filter((z: any) => z.id === filterZoneId);
            }
            return zonesToScan.flatMap((z: any) => z.children || []);
        }
        return (treeData.units || []).filter((u: any) => u.type === "WOREDA");
    }, [treeData, availableZones, filterZoneId]);

    const availableSchools = useMemo(() => {
        if (!treeData) return [];
        if (treeData.schools) return treeData.schools;
        if (availableWoredas.length > 0) {
            let woredasToScan = availableWoredas;
            if (filterWoredaId) {
                woredasToScan = woredasToScan.filter((w: any) => w.id === filterWoredaId);
            }
            return woredasToScan.flatMap((w: any) => w.children || []);
        }
        return (treeData.units || []).filter((u: any) => u.type === "SCHOOL");
    }, [treeData, availableWoredas, filterWoredaId]);

    // Sync Responses for specific request
    const handleSync = async (e: React.MouseEvent, reqId: string) => {
        e.stopPropagation();
        setSyncingId(reqId);
        try {
            const res = await fetchApi(`/data-requests/${reqId}/sync`, { method: "POST" });
            if (res.ok) {
                await loadRequests();
            }
        } catch (err) {
            console.error("Failed to sync responses:", err);
        } finally {
            setSyncingId(null);
        }
    };

    const copyLink = (e: React.MouseEvent, text: string, id: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Filter list
    const filteredRequests = useMemo(() => {
        return requests.filter((r) => {
            // Direction filter
            if (directionFilter === "created" && !r.isCreatedByMe) return false;
            if (directionFilter === "received" && r.isCreatedByMe) return false;

            // Status filter
            if (statusFilter === "PUBLISHED" && r.status !== "PUBLISHED") return false;
            if (statusFilter === "DRAFT" && r.status !== "DRAFT") return false;
            if (statusFilter === "COMPLETED" && (r.completionRate < 100 || r.totalTargets === 0)) return false;

            // Issuer Filters
            if (filterIssuerLevel !== "ALL" && r.createdOrganization?.type !== filterIssuerLevel) return false;
            if (filterIssuerOrgId && r.createdOrganizationId !== filterIssuerOrgId) return false;

            const targets: any[] = r.targets || [];

            // Target Level Filter
            if (levelFilter !== "ALL") {
                const matchesLevel = targets.some((t) => t.organization?.type === levelFilter);
                if (!matchesLevel) return false;
            }

            // Drill-down hierarchy filters
            if (filterSchoolId) {
                const matchesSchool = targets.some((t) => t.organizationId === filterSchoolId);
                if (!matchesSchool) return false;
            } else if (filterWoredaId) {
                const matchesWoreda = targets.some(
                    (t) => t.organizationId === filterWoredaId || t.organization?.parentId === filterWoredaId
                );
                if (!matchesWoreda) return false;
            } else if (filterZoneId) {
                const matchesZone = targets.some(
                    (t) => t.organizationId === filterZoneId || t.organization?.parentId === filterZoneId
                );
                if (!matchesZone) return false;
            } else if (filterRegionId) {
                const matchesRegion = targets.some(
                    (t) => t.organizationId === filterRegionId || t.organization?.parentId === filterRegionId
                );
                if (!matchesRegion) return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const titleMatch = r.title.toLowerCase().includes(q);
                const objMatch = r.objective?.toLowerCase().includes(q);
                const descMatch = r.description?.toLowerCase().includes(q);
                const orgMatch = r.createdOrganization?.name?.toLowerCase().includes(q);
                const targetMatch = targets.some((t: any) =>
                    t.organization?.name?.toLowerCase().includes(q)
                );

                if (!titleMatch && !objMatch && !descMatch && !orgMatch && !targetMatch) {
                    return false;
                }
            }

            return true;
        });
    }, [
        requests,
        directionFilter,
        levelFilter,
        filterIssuerLevel,
        filterIssuerOrgId,
        filterRegionId,
        filterZoneId,
        filterWoredaId,
        filterSchoolId,
        statusFilter,
        searchQuery
    ]);

    // Summary Counts
    const totalRequestsCount = requests.length;
    const activeFormsCount = requests.filter(r => Boolean(r.googleResponderUri)).length;
    const totalSubmissionsCount = requests.reduce((acc, r) => acc + (r.submittedCount || 0), 0);
    const totalTargetsCount = requests.reduce((acc, r) => acc + (r.totalTargets || 0), 0);
    const overallRate = totalTargetsCount > 0 ? Math.round((totalSubmissionsCount / totalTargetsCount) * 100) : 0;

    // Reset drill-down when changing target level tab
    const handleLevelChange = (lvl: "ALL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL") => {
        setLevelFilter(lvl);
        setFilterRegionId("");
        setFilterZoneId("");
        setFilterWoredaId("");
        setFilterSchoolId("");
    };

    // Route to Create View
    if (activeView === "create") {
        return (
            <DataRequestCreateView
                onBack={() => {
                    setActiveView("list");
                    loadRequests();
                }}
                onCreated={(id) => {
                    setSelectedRequestId(id);
                    setActiveView("detail");
                }}
            />
        );
    }

    // Route to Detail View
    if (activeView === "detail" && selectedRequestId) {
        return (
            <DataRequestDetailView
                requestId={selectedRequestId}
                onBack={() => {
                    setActiveView("list");
                    setSelectedRequestId(null);
                    loadRequests();
                }}
            />
        );
    }

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12 w-full">
            {/* Header with Essential Government Metrics */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Data Requests Registry</h1>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <span>Total Requests: <strong className="text-slate-800 font-semibold">{totalRequestsCount}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span>Active Google Forms: <strong className="text-slate-800 font-semibold">{activeFormsCount}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span>Responses: <strong className="text-slate-800 font-semibold">{totalSubmissionsCount}/{totalTargetsCount}</strong> ({overallRate}%)</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={loadRequests}
                        disabled={loading}
                        className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                        title="Refresh list"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveView("create")}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Data Request</span>
                    </button>
                </div>
            </div>

            {/* Error Banner if any */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-medium text-red-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                </div>
            )}

            {/* Comprehensive Multi-Level Filter Toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
                {/* Row 1: Direction / Scope Tabs + Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto w-fit">
                        <button
                            type="button"
                            onClick={() => setDirectionFilter("all")}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                directionFilter === "all"
                                    ? "bg-white text-slate-900 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            All Requests ({requests.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setDirectionFilter("received")}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                directionFilter === "received"
                                    ? "bg-white text-blue-700 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Incoming / Targeted to Us ({requests.filter(r => !r.isCreatedByMe).length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setDirectionFilter("created")}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                directionFilter === "created"
                                    ? "bg-white text-emerald-700 shadow-xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            Issued by Us ({requests.filter(r => r.isCreatedByMe).length})
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search title, objective, issuer..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-blue-500 shadow-2xs"
                        />
                    </div>
                </div>

                {/* Row 2: Issuer and Status Filters */}
                <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 text-xs">
                    {/* Issuer Level Filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-semibold text-[11px] uppercase">Issuer Level:</span>
                        <select
                            value={filterIssuerLevel}
                            onChange={(e) => {
                                setFilterIssuerLevel(e.target.value as any);
                                setFilterIssuerOrgId("");
                            }}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 font-medium shadow-2xs"
                        >
                            <option value="ALL">All Issuing Levels</option>
                            <option value="FEDERAL">Federal Ministry</option>
                            <option value="REGION">Regional Bureaus</option>
                            <option value="ZONE">Zonal Departments</option>
                            <option value="WOREDA">Woreda Offices</option>
                        </select>
                    </div>

                    {/* Specific Issuer Unit Filter */}
                    {availableIssuers.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-semibold text-[11px] uppercase">Specific Issuer:</span>
                            <select
                                value={filterIssuerOrgId}
                                onChange={(e) => setFilterIssuerOrgId(e.target.value)}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 font-medium max-w-[220px] shadow-2xs truncate"
                            >
                                <option value="">All Issuing Organizations</option>
                                {availableIssuers
                                    .filter(issuer => filterIssuerLevel === "ALL" || issuer.type === filterIssuerLevel)
                                    .map((issuer) => (
                                        <option key={issuer.id} value={issuer.id}>
                                            {issuer.name} ({issuer.type})
                                        </option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-semibold text-[11px] uppercase">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 font-medium shadow-2xs"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="PUBLISHED">Published / Active</option>
                            <option value="COMPLETED">100% Completed</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                    </div>

                    {/* Reset All Filters Button */}
                    {(filterIssuerLevel !== "ALL" || filterIssuerOrgId || filterRegionId || filterZoneId || filterWoredaId || filterSchoolId || levelFilter !== "ALL" || statusFilter !== "ALL" || directionFilter !== "all" || searchQuery) && (
                        <button
                            type="button"
                            onClick={() => {
                                setFilterIssuerLevel("ALL");
                                setFilterIssuerOrgId("");
                                setFilterRegionId("");
                                setFilterZoneId("");
                                setFilterWoredaId("");
                                setFilterSchoolId("");
                                setLevelFilter("ALL");
                                setStatusFilter("ALL");
                                setDirectionFilter("all");
                                setSearchQuery("");
                            }}
                            className="inline-flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 ml-auto font-semibold cursor-pointer"
                        >
                            <X className="w-3 h-3" />
                            <span>Clear All Filters</span>
                        </button>
                    )}
                </div>

                {/* Row 3: Target Unit Level and Cascading Drill-Down */}
                <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Target Level:</span>
                        {(
                            [
                                { id: "ALL", label: "All Levels" },
                                { id: "REGION", label: "Regions" },
                                { id: "ZONE", label: "Zones" },
                                { id: "WOREDA", label: "Woredas" },
                                { id: "SCHOOL", label: "Schools" }
                            ] as const
                        ).map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleLevelChange(tab.id)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                    levelFilter === tab.id
                                        ? "bg-slate-900 text-white shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="text-slate-500 text-[11px] font-medium">
                        Showing <strong className="text-slate-900 font-bold">{filteredRequests.length}</strong> of {requests.length} request(s)
                    </div>
                </div>

                {/* Cascading Target Drill-Down if Specific Target Level is selected */}
                {(levelFilter === "ZONE" || levelFilter === "WOREDA" || levelFilter === "SCHOOL" || levelFilter === "REGION") && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-lg text-xs">
                        <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                            <Filter className="w-3 h-3 text-blue-600" />
                            Target Drill Down:
                        </span>

                        {/* Region Selector (Only for Federal) */}
                        {availableRegions.length > 0 && (
                            <div className="flex items-center gap-1">
                                <select
                                    value={filterRegionId}
                                    onChange={(e) => {
                                        setFilterRegionId(e.target.value);
                                        setFilterZoneId("");
                                        setFilterWoredaId("");
                                        setFilterSchoolId("");
                                    }}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 font-medium shadow-2xs"
                                >
                                    <option value="">All Target Regions</option>
                                    {availableRegions.map((r: any) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Zone Selector */}
                        {availableZones.length > 0 && (levelFilter === "ZONE" || levelFilter === "WOREDA" || levelFilter === "SCHOOL") && (
                            <div className="flex items-center gap-1">
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <select
                                    value={filterZoneId}
                                    onChange={(e) => {
                                        setFilterZoneId(e.target.value);
                                        setFilterWoredaId("");
                                        setFilterSchoolId("");
                                    }}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 font-medium shadow-2xs"
                                >
                                    <option value="">All Target Zones</option>
                                    {availableZones.map((z: any) => (
                                        <option key={z.id} value={z.id}>{z.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Woreda Selector */}
                        {availableWoredas.length > 0 && (levelFilter === "WOREDA" || levelFilter === "SCHOOL") && (
                            <div className="flex items-center gap-1">
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <select
                                    value={filterWoredaId}
                                    onChange={(e) => {
                                        setFilterWoredaId(e.target.value);
                                        setFilterSchoolId("");
                                    }}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 font-medium shadow-2xs"
                                >
                                    <option value="">All Target Woredas</option>
                                    {availableWoredas.map((w: any) => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* School Selector */}
                        {availableSchools.length > 0 && levelFilter === "SCHOOL" && (
                            <div className="flex items-center gap-1">
                                <ChevronRight className="w-3 h-3 text-slate-400" />
                                <select
                                    value={filterSchoolId}
                                    onChange={(e) => setFilterSchoolId(e.target.value)}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-blue-500 font-medium max-w-[200px] shadow-2xs truncate"
                                >
                                    <option value="">All Target Schools</option>
                                    {availableSchools.map((s: any) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Official High-Density Table - Fit to Screen Width (No Horizontal Scroll) */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
                {loading ? (
                    <div className="p-16 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium">Loading requests...</p>
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">No Data Requests Found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            No requests match the selected hierarchy level or search filter.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-xs text-left table-auto">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                            <tr>
                                <th className="py-3 px-3.5 w-[34%]">Request Title & Objective</th>
                                <th className="py-3 px-3 w-[18%]">Target Scope</th>
                                <th className="py-3 px-3 w-[13%]">Issued By</th>
                                <th className="py-3 px-2.5 w-[9%]">Status</th>
                                <th className="py-3 px-2.5 w-[9%]">Deadline</th>
                                <th className="py-3 px-3 w-[10%]">Responses</th>
                                <th className="py-3 px-3 text-right w-[7%]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredRequests.map((req) => {
                                const targets: any[] = req.targets || [];
                                const targetNames = targets.slice(0, 2).map((t) => t.organization?.name).join(", ");
                                const moreCount = targets.length > 2 ? ` +${targets.length - 2} more` : "";

                                return (
                                    <tr
                                        key={req.id}
                                        onClick={() => {
                                            setSelectedRequestId(req.id);
                                            setActiveView("detail");
                                        }}
                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                    >
                                        {/* Title & Objective */}
                                        <td className="py-3 px-3.5 align-top">
                                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                                {req.title}
                                            </div>
                                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={req.objective}>
                                                {req.objective}
                                            </div>
                                        </td>

                                        {/* Target Scope */}
                                        <td className="py-3 px-3 align-top">
                                            <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                    {targets[0]?.organization?.type || "TARGETS"}
                                                </span>
                                                <span className="text-[11px]">{req.totalTargets} unit(s)</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 truncate mt-0.5" title={targetNames}>
                                                {targetNames}{moreCount}
                                            </div>
                                        </td>

                                        {/* Issued By */}
                                        <td className="py-3 px-3 align-top">
                                            <span className="font-medium text-slate-800 block truncate" title={req.createdOrganization?.name}>
                                                {req.createdOrganization?.name || "Official Desk"}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {req.isCreatedByMe ? "Issued by Us" : "Incoming"}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="py-3 px-2.5 align-top">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                                                req.status === "PUBLISHED"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>

                                        {/* Deadline */}
                                        <td className="py-3 px-2.5 align-top text-slate-600 whitespace-nowrap">
                                            <span className="font-medium block text-[11px]">
                                                {new Date(req.deadline).toLocaleDateString()}
                                            </span>
                                        </td>

                                        {/* Responses & Progress */}
                                        <td className="py-3 px-3 align-top">
                                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1">
                                                <span>{req.submittedCount}/{req.totalTargets}</span>
                                                <span className="text-blue-700 font-semibold">{req.completionRate || 0}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-blue-600 h-full rounded-full transition-all"
                                                    style={{ width: `${req.completionRate || 0}%` }}
                                                />
                                            </div>
                                        </td>

                                        {/* Action / Open */}
                                        <td className="py-3 px-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                {req.googleResponderUri && (
                                                    <a
                                                        href={req.googleResponderUri}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg transition-colors cursor-pointer"
                                                        title="Open Google Form"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedRequestId(req.id);
                                                        setActiveView("detail");
                                                    }}
                                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-medium rounded-lg transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    Open
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
