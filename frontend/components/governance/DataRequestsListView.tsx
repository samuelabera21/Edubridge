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
    ChevronLeft,
    LayoutGrid,
    List,
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

    // Helper to classify request tier
    const getRequestTier = (r: any): "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL" => {
        const orgType = (r.createdOrganization?.type || "").toUpperCase();
        if (orgType === "FEDERAL") return "FEDERAL";
        if (orgType === "REGION") return "REGION";
        if (orgType === "ZONE") return "ZONE";
        if (orgType === "WOREDA") return "WOREDA";
        if (orgType === "SCHOOL") return "SCHOOL";

        const orgName = (r.createdOrganization?.name || "").toLowerCase();
        if (orgName.includes("federal") || orgName.includes("ministry") || orgName.includes("platform") || orgName.includes("national")) return "FEDERAL";
        if (orgName.includes("region") || orgName.includes("bureau")) return "REGION";
        if (orgName.includes("zone") || orgName.includes("department")) return "ZONE";
        if (orgName.includes("woreda") || orgName.includes("district") || orgName.includes("office")) return "WOREDA";
        if (orgName.includes("school")) return "SCHOOL";

        return "FEDERAL";
    };

    const federalIssuerCount = useMemo(() => requests.filter(r => getRequestTier(r) === "FEDERAL").length, [requests]);
    const regionIssuerCount = useMemo(() => requests.filter(r => getRequestTier(r) === "REGION").length, [requests]);
    const zoneIssuerCount = useMemo(() => requests.filter(r => getRequestTier(r) === "ZONE").length, [requests]);
    const woredaIssuerCount = useMemo(() => requests.filter(r => getRequestTier(r) === "WOREDA").length, [requests]);

    // Summary Counts
    const totalRequestsCount = requests.length;
    const activeFormsCount = requests.filter(r => Boolean(r.googleResponderUri)).length;
    const totalSubmissionsCount = requests.reduce((acc, r) => acc + (r.submittedCount || 0), 0);
    const totalTargetsCount = requests.reduce((acc, r) => acc + (r.totalTargets || 0), 0);
    const overallRate = totalTargetsCount > 0 ? Math.round((totalSubmissionsCount / totalTargetsCount) * 100) : 0;
    const pendingCount = requests.filter(r => (r.completionRate || 0) < 100).length;
    const completedCount = requests.filter(r => (r.completionRate || 0) === 100 || r.status === "COMPLETED").length;

    // View Mode & Pagination
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(9); // 9 for 3-column grid

    useEffect(() => {
        setPage(1);
    }, [
        directionFilter,
        levelFilter,
        filterIssuerLevel,
        filterIssuerOrgId,
        filterRegionId,
        filterZoneId,
        filterWoredaId,
        filterSchoolId,
        statusFilter,
        searchQuery,
        pageSize
    ]);

    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
    const paginatedRequests = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredRequests.slice(start, start + pageSize);
    }, [filteredRequests, page, pageSize]);

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
        <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full font-sans">
            {/* Error Banner if any */}
            {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs font-medium text-rose-800 shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Interactive Metric Overview Cards (Matching Policies & Initiatives Style) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => {
                        setDirectionFilter("all");
                        setStatusFilter("ALL");
                    }}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
                        directionFilter === "all" && statusFilter === "ALL"
                            ? "border-blue-400 ring-2 ring-blue-500/10 shadow-xs"
                            : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Requests
                    </span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{totalRequestsCount}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Official data collections</span>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter("PUBLISHED");
                    }}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
                        statusFilter === "PUBLISHED"
                            ? "border-blue-400 ring-2 ring-blue-500/10 shadow-xs bg-blue-50/20"
                            : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Active Forms
                    </span>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{activeFormsCount}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Google survey forms online</span>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter("PUBLISHED");
                    }}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 shadow-xs transition-all cursor-pointer"
                >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Responses Progress
                    </span>
                    <p className="text-2xl font-bold text-amber-700 mt-1">
                        {totalSubmissionsCount}/{totalTargetsCount}
                    </p>
                    <span className="text-[11px] text-amber-700/80 font-medium mt-0.5 block">
                        {overallRate}% nationwide coverage
                    </span>
                </div>

                <div
                    onClick={() => {
                        setStatusFilter("COMPLETED");
                    }}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
                        statusFilter === "COMPLETED"
                            ? "border-emerald-400 ring-2 ring-emerald-500/10 shadow-xs bg-emerald-50/20"
                            : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Completed
                    </span>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">100% fulfilled registries</span>
                </div>
            </div>

            {/* Main Data Requests Registry Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                            <span>Data Requests Registry</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Action-oriented data collection and Google Forms tracking across the hierarchy.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        {/* View Switcher: Card Grid vs Table */}
                        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                                }`}
                                title="Card Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("table")}
                                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                                }`}
                                title="Table View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={loadRequests}
                            disabled={loading}
                            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
                            title="Refresh Data Requests"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveView("create")}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New Data Request</span>
                        </button>
                    </div>
                </div>

                {/* Filter and Tab Toolbar (Matching Policies & Initiatives Clean Dropdown Style) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search title, objective, issuer..."
                                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 placeholder-slate-400 bg-white"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>

                        {/* Source / Issuer Level Dropdown (Upper Levels Matching Policies & Directives) */}
                        <div className="w-full sm:w-48">
                            <select
                                value={filterIssuerLevel}
                                onChange={(e) => {
                                    setFilterIssuerLevel(e.target.value as any);
                                    setFilterIssuerOrgId("");
                                }}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                            >
                                <option value="ALL">All Sources ({requests.length})</option>
                                <option value="FEDERAL">Federal Ministry ({federalIssuerCount})</option>
                                {(currentTier === "REGION" || currentTier === "ZONE" || currentTier === "WOREDA" || currentTier === "SCHOOL" || regionIssuerCount > 0) && (
                                    <option value="REGION">Regional Bureau ({regionIssuerCount})</option>
                                )}
                                {(currentTier === "ZONE" || currentTier === "WOREDA" || currentTier === "SCHOOL" || zoneIssuerCount > 0) && (
                                    <option value="ZONE">Zonal Dept ({zoneIssuerCount})</option>
                                )}
                                {(currentTier === "WOREDA" || currentTier === "SCHOOL" || woredaIssuerCount > 0) && (
                                    <option value="WOREDA">Woreda Office ({woredaIssuerCount})</option>
                                )}
                            </select>
                        </div>

                        {/* Target Level Filter Dropdown */}
                        <div className="w-full sm:w-40">
                            <select
                                value={levelFilter}
                                onChange={(e) => handleLevelChange(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                            >
                                <option value="ALL">All Target Levels</option>
                                <option value="REGION">Target Regions</option>
                                <option value="ZONE">Target Zones</option>
                                <option value="WOREDA">Target Woredas</option>
                                <option value="SCHOOL">Target Schools</option>
                            </select>
                        </div>

                        {/* Status Filter Dropdown */}
                        <div className="w-full sm:w-36">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="PUBLISHED">Published / Active</option>
                                <option value="COMPLETED">100% Completed</option>
                                <option value="DRAFT">Draft</option>
                            </select>
                        </div>

                        {/* Reset Filter Button */}
                        {(searchQuery || filterIssuerLevel !== "ALL" || filterIssuerOrgId || levelFilter !== "ALL" || statusFilter !== "ALL" || directionFilter !== "all" || filterRegionId || filterZoneId || filterWoredaId || filterSchoolId) && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setFilterIssuerLevel("ALL");
                                    setFilterIssuerOrgId("");
                                    setLevelFilter("ALL");
                                    setStatusFilter("ALL");
                                    setDirectionFilter("all");
                                    setFilterRegionId("");
                                    setFilterZoneId("");
                                    setFilterWoredaId("");
                                    setFilterSchoolId("");
                                }}
                                className="px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                                title="Reset all filters"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>

                    {/* Direction Tab Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-medium text-slate-600 self-start lg:self-auto">
                        <button
                            onClick={() => setDirectionFilter("all")}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                directionFilter === "all" ? "bg-white text-slate-900 font-bold shadow-xs" : "hover:text-slate-900"
                            }`}
                        >
                            All ({requests.length})
                        </button>
                        <button
                            onClick={() => setDirectionFilter("received")}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                directionFilter === "received" ? "bg-white text-slate-900 font-bold shadow-xs" : "hover:text-slate-900"
                            }`}
                        >
                            Targeted to Us ({requests.filter(r => !r.isCreatedByMe).length})
                        </button>
                        <button
                            onClick={() => setDirectionFilter("created")}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                directionFilter === "created" ? "bg-white text-slate-900 font-bold shadow-xs" : "hover:text-slate-900"
                            }`}
                        >
                            Issued by Us ({requests.filter(r => r.isCreatedByMe).length})
                        </button>
                    </div>
                </div>

                {/* Cascading Target Drill-Down if Specific Target Level is selected */}
                {(levelFilter === "ZONE" || levelFilter === "WOREDA" || levelFilter === "SCHOOL" || levelFilter === "REGION") && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 bg-slate-50/70 p-2.5 rounded-xl text-xs">
                        <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                            <Filter className="w-3 h-3 text-blue-600" />
                            Target Drill Down:
                        </span>

                        {/* Region Selector */}
                        {availableRegions.length > 0 && (
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

                {/* Loading State */}
                {loading && (
                    <div className="py-20 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        <span className="text-xs font-medium">Loading data requests registry...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredRequests.length === 0 && (
                    <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6 space-y-3">
                        <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">No data requests found</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                                No requests match the selected hierarchy level or search criteria.
                            </p>
                        </div>
                        <button
                            onClick={() => setActiveView("create")}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create New Data Request</span>
                        </button>
                    </div>
                )}

                {/* Clean Card Grid View (Simple Text Rectangle Card with Hover - Matching Policies & Initiatives) */}
                {!loading && filteredRequests.length > 0 && viewMode === "grid" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedRequests.map((req) => {
                            const targets: any[] = req.targets || [];
                            const targetType = targets[0]?.organization?.type || req.targetLevels?.[0] || "TARGETS";
                            const targetNames = targets.slice(0, 2).map((t: any) => t.organization?.name).join(", ");
                            const moreCount = targets.length > 2 ? ` +${targets.length - 2} more` : "";
                            const isFederalCreator = req.createdOrganization?.type === "FEDERAL";
                            const isCompleted = (req.completionRate || 0) === 100 || req.status === "COMPLETED";

                            return (
                                <div
                                    key={req.id}
                                    onClick={() => {
                                        setSelectedRequestId(req.id);
                                        setActiveView("detail");
                                    }}
                                    className="group relative rounded-xl border border-slate-200 p-4 bg-white flex flex-col justify-between transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-blue-400"
                                >
                                    <div>
                                        {/* Top Row Badges: Scope / Authority, Status & Form Indicator */}
                                        <div className="flex items-center justify-between gap-1.5 mb-2.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {/* Scope / Authority Badge */}
                                                {isFederalCreator ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white flex items-center gap-1 shrink-0">
                                                        <Building2 className="w-2.5 h-2.5 text-blue-400" />
                                                        <span>Federal</span>
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                                        {req.createdOrganization?.type || "Request"}
                                                    </span>
                                                )}

                                                {/* Status Badge */}
                                                <span
                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase border ${
                                                        isCompleted
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : req.status === "PUBLISHED"
                                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                                    }`}
                                                >
                                                    {isCompleted ? "COMPLETED" : req.status}
                                                </span>
                                            </div>

                                            {/* Google Form Link Badge */}
                                            {req.googleResponderUri && (
                                                <span
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0"
                                                    title="Active Google Form Connected"
                                                >
                                                    <FileSpreadsheet className="w-2.5 h-2.5 text-blue-600" />
                                                    <span>Form</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Request Title - 2 lines clamp */}
                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-1">
                                            {req.title}
                                        </h4>

                                        {/* Objective Snippet - 2 lines clamp */}
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2.5" title={req.objective || req.description}>
                                            {req.objective || req.description || "Official administrative data request registry."}
                                        </p>

                                        {/* Target Scope Badge */}
                                        <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5 mb-2 truncate">
                                            <Target className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                                                {targetType}
                                            </span>
                                            <span className="truncate">
                                                {req.totalTargets} unit(s) • {targetNames}{moreCount}
                                            </span>
                                        </div>

                                        {/* Issuing Desk Metadata */}
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 truncate">
                                            <span>Issued by</span>
                                            <span className="font-semibold text-slate-700 truncate">
                                                {req.createdOrganization?.name || "Official Ministry"}
                                            </span>
                                            <span>•</span>
                                            <span>{req.isCreatedByMe ? "Issued by Us" : "Incoming"}</span>
                                        </div>
                                    </div>

                                    {/* Card Footer: Deadline & Response Progress */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2 mt-auto">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-1 text-slate-600 font-semibold shrink-0">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                <span>
                                                    Due {new Date(req.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                                </span>
                                            </div>
                                            <div className="font-bold text-slate-900 flex items-center gap-1">
                                                <span className="text-slate-500 font-normal">
                                                    {req.submittedCount}/{req.totalTargets}
                                                </span>
                                                <span className="text-blue-700">
                                                    ({req.completionRate || 0}%)
                                                </span>
                                            </div>
                                        </div>

                                        {/* Brand Blue Progress Bar */}
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${Math.min(100, req.completionRate || 0)}%` }}
                                            />
                                        </div>

                                        {/* Quick Link Row */}
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[10px] text-slate-400 font-medium group-hover:text-blue-600 transition-colors">
                                                Click to view analytics & units →
                                            </span>
                                            {req.googleResponderUri && (
                                                <a
                                                    href={req.googleResponderUri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Open Google Form Responder URL"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Table View (Alternative High-Density Display) */}
                {!loading && filteredRequests.length > 0 && viewMode === "table" && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden w-full">
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
                                {paginatedRequests.map((req) => {
                                    const targets: any[] = req.targets || [];
                                    const targetNames = targets.slice(0, 2).map((t: any) => t.organization?.name).join(", ");
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
                                            <td className="py-3 px-3.5 align-top">
                                                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                                    {req.title}
                                                </div>
                                                <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5" title={req.objective}>
                                                    {req.objective || req.description}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 align-top">
                                                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                        {targets[0]?.organization?.type || req.targetLevels?.[0] || "TARGETS"}
                                                    </span>
                                                    <span className="text-[11px]">{req.totalTargets} unit(s)</span>
                                                </div>
                                                <div className="text-[11px] text-slate-400 truncate mt-0.5" title={targetNames}>
                                                    {targetNames}{moreCount}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 align-top">
                                                <span className="font-medium text-slate-800 block truncate" title={req.createdOrganization?.name}>
                                                    {req.createdOrganization?.name || "Official Desk"}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {req.isCreatedByMe ? "Issued by Us" : "Incoming"}
                                                </span>
                                            </td>

                                            <td className="py-3 px-2.5 align-top">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                                                    req.status === "COMPLETED" || req.completionRate === 100
                                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                        : req.status === "PUBLISHED"
                                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                        : "bg-slate-100 text-slate-700 border border-slate-200"
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </td>

                                            <td className="py-3 px-2.5 align-top text-slate-600 whitespace-nowrap">
                                                <span className="font-medium block text-[11px]">
                                                    {new Date(req.deadline).toLocaleDateString()}
                                                </span>
                                            </td>

                                            <td className="py-3 px-3 align-top">
                                                <div className="flex items-center justify-between text-[11px] font-medium text-slate-700 mb-1">
                                                    <span>{req.submittedCount}/{req.totalTargets}</span>
                                                    <span className="text-blue-700 font-semibold">{req.completionRate || 0}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-blue-600 h-full rounded-full transition-all"
                                                        style={{ width: `${Math.min(100, req.completionRate || 0)}%` }}
                                                    />
                                                </div>
                                            </td>

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
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && filteredRequests.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                            <span>
                                Showing <strong className="text-slate-900 font-bold">{(page - 1) * pageSize + 1}</strong> to{" "}
                                <strong className="text-slate-900 font-bold">
                                    {Math.min(page * pageSize, filteredRequests.length)}
                                </strong> of <strong className="text-slate-900 font-bold">{filteredRequests.length}</strong> requests
                            </span>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1">
                                <span>Cards per page:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    className="p-1 border border-slate-200 rounded-md bg-white text-slate-800 font-semibold cursor-pointer"
                                >
                                    <option value={6}>6</option>
                                    <option value={9}>9</option>
                                    <option value={15}>15</option>
                                    <option value={30}>30</option>
                                </select>
                            </div>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center gap-1 self-center sm:self-auto">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                                    title="Previous Page"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 text-slate-700" />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`min-w-7 h-7 px-2 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                                            p === page
                                                ? "bg-blue-600 text-white shadow-2xs"
                                                : "border border-slate-200 hover:bg-slate-50 text-slate-700"
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                                    title="Next Page"
                                >
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
