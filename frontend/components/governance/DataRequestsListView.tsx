"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
    LayoutList,
    ArrowUpRight,
    List,
    X,
    FileText
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

    const searchParams = useSearchParams();
    const paramRequestId = searchParams?.get("requestId");

    useEffect(() => {
        if (paramRequestId) {
            setSelectedRequestId(paramRequestId);
            setActiveView("detail");
        }
    }, [paramRequestId]);

    useEffect(() => {
        const handleOpenDetail = (e: any) => {
            const reqId = e.detail?.requestId;
            if (reqId) {
                setSelectedRequestId(reqId);
                setActiveView("detail");
            }
        };
        window.addEventListener("open-data-request-detail", handleOpenDetail);
        return () => window.removeEventListener("open-data-request-detail", handleOpenDetail);
    }, []);

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
    const [hasFormFilter, setHasFormFilter] = useState<boolean>(false);
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

            // Connected Form Filter
            if (hasFormFilter && !r.googleResponderUri) return false;

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

    // View Mode & Pagination (Table = default, Cards = clean summary cards)
    const [viewMode, setViewMode] = useState<"table" | "cards">("table");
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10); // 10 items per page

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (directionFilter !== "all") count++;
        if (filterIssuerLevel !== "ALL") count++;
        if (levelFilter !== "ALL") count++;
        if (statusFilter !== "ALL") count++;
        if (filterRegionId || filterZoneId || filterWoredaId || filterSchoolId) count++;
        return count;
    }, [directionFilter, filterIssuerLevel, levelFilter, statusFilter, filterRegionId, filterZoneId, filterWoredaId, filterSchoolId]);

    const hasActiveFilters = searchQuery !== "" || activeFilterCount > 0;

    const clearAllFilters = () => {
        setSearchQuery("");
        setDirectionFilter("all");
        setFilterIssuerLevel("ALL");
        setFilterIssuerOrgId("");
        setLevelFilter("ALL");
        setStatusFilter("ALL");
        setHasFormFilter(false);
        setFilterRegionId("");
        setFilterZoneId("");
        setFilterWoredaId("");
        setFilterSchoolId("");
    };

    // Clean, authentic government card description without dev filler or repetitive letters
    const getCleanRequestCardMessage = (item: any) => {
        const rawObj = item.objective?.trim() || "";
        const rawDesc = item.description?.trim() || "";
        const titleLower = (item.title || "").trim().toLowerCase();

        // Helper to test if text is repetitive dev filler, gibberish, or repeats title
        const isGibberishOrRepetitive = (text: string) => {
            if (!text || text.length < 5) return true;
            const lower = text.toLowerCase();
            if (titleLower && (lower === titleLower || lower.includes(titleLower))) return true;
            if (/(.)\1{3,}/.test(text)) return true;
            const words = lower.split(/\s+/).filter(Boolean);
            if (words.length > 2 && words.every(w => w === words[0])) return true;
            return false;
        };

        if (rawObj && !isGibberishOrRepetitive(rawObj)) {
            const firstSentence = rawObj.split(/[.!?]\s+/)[0];
            return firstSentence.length > 110 ? `${firstSentence.substring(0, 107)}...` : firstSentence;
        }
        if (rawDesc && !isGibberishOrRepetitive(rawDesc)) {
            const firstSentence = rawDesc.split(/[.!?]\s+/)[0];
            return firstSentence.length > 110 ? `${firstSentence.substring(0, 107)}...` : firstSentence;
        }

        const authority = item.createdOrganization?.name || "EduBridge Platform";
        return `Official administrative data collection issued by ${authority} for statutory tracking.`;
    };

    useEffect(() => {
        setPage(1);
    }, [
        directionFilter,
        hasFormFilter,
        levelFilter,
        filterIssuerLevel,
        filterIssuerOrgId,
        filterRegionId,
        filterZoneId,
        filterWoredaId,
        filterSchoolId,
        statusFilter,
        searchQuery,
        pageSize,
        viewMode
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
        <div className="space-y-6 font-sans text-slate-900 max-w-7xl">
            {/* Error Banner if any */}
            {error && (
                <div role="alert" className="p-4 border-l-4 border-rose-600 bg-rose-50 text-slate-900 text-sm flex items-center justify-between">
                    <div>
                        <strong className="font-semibold">There is a problem loading the registry:</strong> {error}
                    </div>
                    <button
                        type="button"
                        onClick={() => loadRequests()}
                        className="text-sm font-semibold text-[#4085b3] hover:underline cursor-pointer ml-4"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* 1. PAGE HEADER (Clean single-line header matching Policies and Directives UI) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Data requests
                </h1>

                <button
                    type="button"
                    onClick={() => setActiveView("create")}
                    className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Issue data request</span>
                </button>
            </div>

            {/* 2. TOOLBAR: SEARCH, FILTERS & VIEW SWITCHER (Unified in one clean row) */}
            <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Search input + Filters toggle button + Refresh */}
                    <div className="flex items-center gap-2.5 flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                            <input
                                id="data-request-search"
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search data requests by title, target, or keywords..."
                                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                    aria-label="Clear search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Filters Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setShowFilters(prev => !prev)}
                            className={`px-3 py-2 text-sm font-medium rounded border transition-all duration-200 flex items-center gap-1.5 cursor-pointer shrink-0 group/filter ${
                                showFilters || activeFilterCount > 0
                                    ? "bg-[#4085b3] text-white border-[#4085b3]"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3]"
                            }`}
                            title="Filter data requests"
                        >
                            <Filter className={`w-4 h-4 transition-colors ${showFilters || activeFilterCount > 0 ? "text-white" : "text-slate-500 group-hover/filter:text-white"}`} />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                                    showFilters || activeFilterCount > 0 ? "bg-white text-[#4085b3]" : "bg-[#4085b3] text-white"
                                }`}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {/* Refresh */}
                        <button
                            type="button"
                            onClick={() => loadRequests()}
                            className="p-2 border border-slate-300 bg-white hover:bg-[#4085b3] text-slate-700 hover:text-white hover:border-[#4085b3] rounded transition-all duration-200 cursor-pointer shrink-0 group/refresh"
                            title="Reload registry data"
                            aria-label="Reload registry data"
                        >
                            <RefreshCw className={`w-4 h-4 transition-colors ${loading ? "animate-spin text-[#4085b3]" : "text-slate-500 group-hover/refresh:text-white"}`} />
                        </button>
                    </div>

                    {/* Right: Table / Cards View Switcher */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5 cursor-pointer group/tbl ${
                                viewMode === "table"
                                    ? "bg-[#4085b3] text-white"
                                    : "text-slate-700 border border-slate-300 bg-white hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3]"
                            }`}
                            title="Display as administrative table"
                        >
                            <LayoutList className={`w-3.5 h-3.5 transition-colors ${viewMode === "table" ? "text-white" : "text-slate-500 group-hover/tbl:text-white"}`} />
                            <span>Table</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5 cursor-pointer group/crd ${
                                viewMode === "cards"
                                    ? "bg-[#4085b3] text-white"
                                    : "text-slate-700 border border-slate-300 bg-white hover:bg-[#4085b3] hover:text-white hover:border-[#4085b3]"
                            }`}
                            title="Display as DfE summary cards"
                        >
                            <LayoutGrid className={`w-3.5 h-3.5 transition-colors ${viewMode === "cards" ? "text-white" : "text-slate-500 group-hover/crd:text-white"}`} />
                            <span>Cards</span>
                        </button>
                    </div>
                </div>

                {/* Active Filter Chips / Tags (MoJ / DfE Pattern) */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Applied:</span>
                        {directionFilter !== "all" && (
                            <button
                                type="button"
                                onClick={() => setDirectionFilter("all")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>Ownership: {directionFilter === "created" ? "Issued by us" : "Received"}</span>
                                <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" />
                            </button>
                        )}
                        {filterIssuerLevel !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => setFilterIssuerLevel("ALL")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>
                                    From: {
                                        filterIssuerLevel === "FEDERAL" ? "Federal Ministry" :
                                        filterIssuerLevel === "REGION" ? "Regional Bureau" :
                                        filterIssuerLevel === "ZONE" ? "Zone Department" :
                                        filterIssuerLevel === "WOREDA" ? "Woreda Office" : filterIssuerLevel
                                    }
                                </span>
                                <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" />
                            </button>
                        )}
                        {levelFilter !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => handleLevelChange("ALL")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>
                                    Target: {
                                        levelFilter === "REGION" ? "Regions" :
                                        levelFilter === "ZONE" ? "Zones" :
                                        levelFilter === "WOREDA" ? "Woredas" :
                                        levelFilter === "SCHOOL" ? "Schools" : levelFilter
                                    }
                                </span>
                                <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" />
                            </button>
                        )}
                        {statusFilter !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => setStatusFilter("ALL")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>Status: {statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}</span>
                                <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={clearAllFilters}
                            className="text-xs text-[#4085b3] hover:underline font-semibold ml-1 cursor-pointer"
                        >
                            Clear all
                        </button>
                    </div>
                )}

                {/* Collapsible Secondary Filters Panel */}
                {showFilters && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Ownership */}
                            <div>
                                <label htmlFor="data-req-origin-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Ownership
                                </label>
                                <select
                                    id="data-req-origin-filter"
                                    value={directionFilter}
                                    onChange={e => setDirectionFilter(e.target.value as any)}
                                    className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                                >
                                    <option value="all">All data requests ({requests.length})</option>
                                    <option value="created">Issued by our desk ({requests.filter(r => r.isCreatedByMe).length})</option>
                                    <option value="received">Targeted to us ({requests.filter(r => !r.isCreatedByMe).length})</option>
                                </select>
                            </div>

                            {/* Target scope */}
                            <div>
                                <label htmlFor="data-req-target-scope-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Target scope
                                </label>
                                <select
                                    id="data-req-target-scope-filter"
                                    value={levelFilter}
                                    onChange={e => handleLevelChange(e.target.value as any)}
                                    className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                                >
                                    <option value="ALL">All target scopes</option>
                                    <option value="REGION">Regional Bureaus</option>
                                    <option value="ZONE">Zone Departments</option>
                                    <option value="WOREDA">Woreda Offices</option>
                                    <option value="SCHOOL">Schools</option>
                                </select>
                            </div>

                            {/* Source authority */}
                            <div>
                                <label htmlFor="data-req-source-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Source authority
                                </label>
                                <select
                                    id="data-req-source-filter"
                                    value={filterIssuerLevel}
                                    onChange={e => setFilterIssuerLevel(e.target.value as any)}
                                    className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                                >
                                    <option value="ALL">All issuing authorities</option>
                                    <option value="FEDERAL">Federal Ministry</option>
                                    <option value="REGION">Regional Bureau</option>
                                    <option value="ZONE">Zone Department</option>
                                    <option value="WOREDA">Woreda Office</option>
                                </select>
                            </div>

                            {/* Current status */}
                            <div>
                                <label htmlFor="data-req-status-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Current status
                                </label>
                                <select
                                    id="data-req-status-filter"
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as any)}
                                    className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                                >
                                    <option value="ALL">All statuses</option>
                                    <option value="PUBLISHED">Published</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="DRAFT">Draft</option>
                                </select>
                            </div>
                        </div>

                        {/* Cascading Target Drill-Down if Specific Target Level is selected */}
                        {(levelFilter === "ZONE" || levelFilter === "WOREDA" || levelFilter === "SCHOOL" || levelFilter === "REGION") && (
                            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 text-xs">
                                <span className="text-[11px] font-bold text-slate-600 uppercase flex items-center gap-1">
                                    <Filter className="w-3 h-3 text-[#4085b3]" />
                                    Target Drill Down:
                                </span>

                                {availableRegions.length > 0 && (
                                    <select
                                        value={filterRegionId}
                                        onChange={(e) => {
                                            setFilterRegionId(e.target.value);
                                            setFilterZoneId("");
                                            setFilterWoredaId("");
                                            setFilterSchoolId("");
                                        }}
                                        className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] font-medium"
                                    >
                                        <option value="">All Target Regions</option>
                                        {availableRegions.map((r: any) => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                )}

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
                                            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] font-medium"
                                        >
                                            <option value="">All Target Zones</option>
                                            {availableZones.map((z: any) => (
                                                <option key={z.id} value={z.id}>{z.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {availableWoredas.length > 0 && (levelFilter === "WOREDA" || levelFilter === "SCHOOL") && (
                                    <div className="flex items-center gap-1">
                                        <ChevronRight className="w-3 h-3 text-slate-400" />
                                        <select
                                            value={filterWoredaId}
                                            onChange={(e) => {
                                                setFilterWoredaId(e.target.value);
                                                setFilterSchoolId("");
                                            }}
                                            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] font-medium"
                                        >
                                            <option value="">All Target Woredas</option>
                                            {availableWoredas.map((w: any) => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {availableSchools.length > 0 && levelFilter === "SCHOOL" && (
                                    <div className="flex items-center gap-1">
                                        <ChevronRight className="w-3 h-3 text-slate-400" />
                                        <select
                                            value={filterSchoolId}
                                            onChange={(e) => setFilterSchoolId(e.target.value)}
                                            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] font-medium max-w-[200px] truncate"
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
                )}

                {/* Loading State */}
                {loading && (
                    <div className="py-20 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#4085b3] mb-2" />
                        <span className="text-xs font-medium">Loading data requests registry...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredRequests.length === 0 && (
                    <div className="py-16 text-center border-t border-slate-200">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                        <h2 className="text-base font-semibold text-slate-900">No data requests found</h2>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                            {hasActiveFilters
                                ? "No records match your selected filters. Try clearing filters to see all requests."
                                : "No administrative data requests have been registered yet."}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="mt-4 px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-sm font-medium cursor-pointer"
                            >
                                Clear all filters
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setActiveView("create")}
                                className="mt-4 px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white rounded text-sm font-medium cursor-pointer"
                            >
                                Issue data request
                            </button>
                        )}
                    </div>
                )}

                {/* OPTION A: THE ADMINISTRATIVE TABLE (GOV.UK Standard matching Policies & Directives 1:1) */}
                {!loading && filteredRequests.length > 0 && viewMode === "table" && (
                    <div className="overflow-x-auto border-t border-slate-200">
                        <table className="w-full table-fixed text-left text-sm border-collapse">
                            <caption className="sr-only">Data requests registry</caption>
                            <thead>
                                <tr className="border-b-2 border-slate-300 text-xs font-semibold text-slate-700">
                                    <th scope="col" className="py-3 pr-3 font-semibold w-[30%]">Request</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[18%] whitespace-nowrap">Issuing authority</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[16%] whitespace-nowrap">Target scope</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[13%] whitespace-nowrap">Deadline</th>
                                    <th scope="col" className="py-3 px-2 font-semibold w-[10%] whitespace-nowrap">Responses</th>
                                    <th scope="col" className="py-3 px-2 font-semibold w-[11%] whitespace-nowrap">Status</th>
                                    <th scope="col" className="py-3 pl-2 pr-1 font-semibold w-[8%] text-right whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedRequests.map((item) => {
                                    const targets: any[] = item.targets || [];
                                    const targetUnitsCount = targets.length || item.totalTargets || 0;
                                    const isTargeted = targetUnitsCount > 0;
                                    const scopeLabel = isTargeted
                                        ? `Targeted (${targetUnitsCount} units)`
                                        : item.targetLevels && item.targetLevels.length > 0
                                        ? item.targetLevels.map((l: string) => l.toUpperCase()).join(", ")
                                        : "All subordinate units";

                                    const isCompleted = (item.completionRate || 0) === 100 || item.status === "COMPLETED";
                                    const statusLabel = isCompleted ? "Completed" : item.status === "PUBLISHED" ? "Published" : "Draft";
                                    const responsesLabel = `${item.submittedCount || 0}/${item.totalTargets || 0} (${item.completionRate || 0}%)`;

                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => {
                                                setSelectedRequestId(item.id);
                                                setActiveView("detail");
                                            }}
                                            className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                                        >
                                            {/* Request Title */}
                                            <td className="py-3.5 pr-3 overflow-hidden">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span
                                                        className="text-[#4085b3] group-hover:underline font-semibold text-sm truncate block"
                                                        title={item.title}
                                                    >
                                                        {item.title}
                                                    </span>
                                                    {item.googleResponderUri && (
                                                        <span title="Contains connected Google Form" className="text-slate-400 shrink-0">
                                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Issuing Authority */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 truncate" title={item.createdOrganization?.name || "EduBridge Platform"}>
                                                {item.createdOrganization?.name || "EduBridge Platform"}
                                            </td>

                                            {/* Target Scope */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 truncate" title={scopeLabel}>
                                                {scopeLabel}
                                            </td>

                                            {/* Deadline */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 tabular-nums whitespace-nowrap">
                                                {item.deadline
                                                    ? new Date(item.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                                    : "—"
                                                }
                                            </td>

                                            {/* Responses Progress (Plain text) */}
                                            <td className="py-3.5 px-2 text-xs text-slate-700 tabular-nums whitespace-nowrap">
                                                {responsesLabel}
                                            </td>

                                            {/* Status (Plain text, no colored pill badges) */}
                                            <td className="py-3.5 px-2 text-xs text-slate-700 whitespace-nowrap">
                                                {statusLabel}
                                            </td>

                                            {/* Action Link */}
                                            <td className="py-3.5 pl-2 pr-1 text-right whitespace-nowrap">
                                                <span className="text-xs font-semibold text-[#4085b3] group-hover:underline inline-flex items-center gap-0.5">
                                                    <span>View</span>
                                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* OPTION B: DfE CLEAN CARDS (Signature Department for Education pattern with deep navy hover matching Policies 1:1) */}
                {!loading && filteredRequests.length > 0 && viewMode === "cards" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
                        {paginatedRequests.map((item) => {
                            const isCompleted = (item.completionRate || 0) === 100 || item.status === "COMPLETED";
                            const statusLabel = isCompleted ? "Completed" : item.status === "PUBLISHED" ? "Published" : "Draft";

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedRequestId(item.id);
                                        setActiveView("detail");
                                    }}
                                    className="group relative bg-white border border-slate-300 p-6 flex flex-col justify-between min-h-[175px] hover:bg-[#002d54] hover:border-[#002d54] transition-all duration-150 cursor-pointer"
                                >
                                    <div>
                                        {/* Header: Title */}
                                        <h2 className="text-xl font-bold text-[#4085b3] group-hover:text-white transition-colors leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word] line-clamp-2">
                                            {item.title}
                                        </h2>

                                        {/* Single Clean Message */}
                                        <p className="text-sm text-slate-800 group-hover:text-white transition-colors mt-2.5 leading-relaxed line-clamp-2 break-words">
                                            {getCleanRequestCardMessage(item)}
                                        </p>
                                    </div>

                                    {/* Minimal Footer: Due Date & Status (No colored badges, just clean text) */}
                                    <div className="mt-5 pt-3 border-t border-slate-200 group-hover:border-white/20 flex items-center justify-between text-xs text-slate-500 group-hover:text-white/80 transition-colors">
                                        <span className="tabular-nums">
                                            Due: {item.deadline
                                                ? new Date(item.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                                : "—"
                                            }
                                        </span>
                                        <span className="text-xs font-medium text-slate-600 group-hover:text-white/90">
                                            {statusLabel}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 5. PAGINATION (GOV.UK style simple row matching Policies 1:1) */}
                {!loading && filteredRequests.length > 0 && (
                    <div className="py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 mt-4">
                        <div>
                            Showing <strong className="text-slate-900 font-semibold">{(page - 1) * pageSize + 1}</strong> to{" "}
                            <strong className="text-slate-900 font-semibold">{Math.min(page * pageSize, filteredRequests.length)}</strong> of{" "}
                            <strong className="text-slate-900 font-semibold">{filteredRequests.length}</strong> data requests
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1}
                                className={`px-2.5 py-1 rounded border border-slate-300 text-xs font-medium transition-colors ${
                                    page === 1 ? "text-slate-300 border-slate-200 cursor-not-allowed" : "text-slate-700 hover:bg-slate-50 cursor-pointer"
                                }`}
                            >
                                Previous
                            </button>

                            <span className="px-1 text-slate-600">
                                Page {page} of {totalPages}
                            </span>

                            <button
                                type="button"
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page === totalPages}
                                className={`px-2.5 py-1 rounded border border-slate-300 text-xs font-medium transition-colors ${
                                    page === totalPages ? "text-slate-300 border-slate-200 cursor-not-allowed" : "text-slate-700 hover:bg-slate-50 cursor-pointer"
                                }`}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
