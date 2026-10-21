"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import GovernanceSubnav from "./GovernanceSubnav";
import DirectivesPublishView from "./DirectivesPublishView";
import {
    Search,
    Filter,
    Plus,
    X,
    Paperclip,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ArrowUpRight,
    CheckCircle2,
    AlertCircle,
    FileText,
    LayoutList,
    LayoutGrid,
    Clock,
    Building2,
    Shield
} from "lucide-react";

export interface DirectiveItem {
    id: string;
    title: string;
    code?: string | null;
    type?: "POLICY" | "DIRECTIVE" | "ANNOUNCEMENT" | string;
    category?: string | null;
    priority?: "CRITICAL" | "URGENT" | "HIGH" | "NORMAL" | "LOW" | string;
    status?: "PUBLISHED" | "DRAFT" | "ARCHIVED" | string;
    content: string;
    issueDate?: string | Date;
    effectiveDate?: string | Date;
    deadline?: string | Date | null;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    isAcknowledgmentRequired?: boolean;
    targetLevelAll?: boolean;
    targetLevels?: string[];
    targetOrganizationUnits?: Array<{
        organization?: { id: string; name: string; type: string };
    }>;
    issuerOrganization?: { id: string; name: string; type: string } | null;
    author?: { id: string; name: string; email: string } | null;
    isIssuedByMe?: boolean;
    totalRecipients?: number;
    acknowledgedCount?: number;
    userAcknowledgment?: {
        isRead?: boolean;
        isAcknowledged?: boolean;
        acknowledgedAt?: string | null;
        acknowledgmentNotes?: string | null;
    } | null;
    tracking?: {
        totalRecipients: number;
        acknowledgedCount: number;
        recipients: Array<{
            organizationId: string;
            organizationName: string;
            organizationType: string;
            isRead: boolean;
            isAcknowledged: boolean;
            readAt?: string | null;
            acknowledgedAt?: string | null;
            acknowledgedBy?: { name: string; email: string } | null;
            notes?: string | null;
            remarks?: string | null;
        }>;
    };
    acknowledgmentStatus?: {
        isRead?: boolean;
        isAcknowledged?: boolean;
        acknowledgedAt?: string | null;
    };
}

export interface DirectivesRegistryViewProps {
    tierName?: string;
    tierType?: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
    organizationId?: string | null;
    canCreateDirective?: boolean;
    initialDirectiveId?: string | null;
    showSubnav?: boolean;
}

export default function DirectivesRegistryView({
    tierName = "Federal Ministry of Education",
    tierType = "FEDERAL",
    organizationId,
    canCreateDirective = true,
    initialDirectiveId,
    showSubnav = true,
}: DirectivesRegistryViewProps) {
    const searchParams = useSearchParams();
    const { authData } = useAuth();

    // Data State
    const [directives, setDirectives] = useState<DirectiveItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Selected directive & drawer
    const [selectedDirective, setSelectedDirective] = useState<DirectiveItem | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isPublishingDirective, setIsPublishingDirective] = useState(false);

    // Acknowledgment action
    const [isSigning, setIsSigning] = useState(false);
    const [signRemarks, setSignRemarks] = useState("");

    // Tracking table search & filter
    const [trackingSearch, setTrackingSearch] = useState("");
    const [trackingStatusFilter, setTrackingStatusFilter] = useState("ALL");

    // View & Filters
    const [viewMode, setViewMode] = useState<"table" | "cards">("table");
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [originFilter, setOriginFilter] = useState<"ALL" | "ISSUED" | "RECEIVED">("ALL");
    const [receivedFromFilter, setReceivedFromFilter] = useState<string>("ALL");
    const [targetScopeFilter, setTargetScopeFilter] = useState<string>("ALL");
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setDirectivePageSize] = useState(10);

    // Toast
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Load list of directives
    const loadDirectives = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchApi("/directives");
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load policies & directives");
            }
            const payload = await res.json();
            setDirectives(payload.data || []);
        } catch (err: any) {
            setError(err.message || "Failed to fetch directives");
        } finally {
            setLoading(false);
        }
    };

    // Load full directive detail (with tracking and acknowledgment)
    const loadDirectiveDetail = async (id: string) => {
        setDetailLoading(true);
        try {
            const res = await fetchApi(`/directives/${id}`);
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load directive details");
            }
            const payload = await res.json();
            setSelectedDirective(payload.data || null);
        } catch (err: any) {
            showToast("error", err.message || "Failed to load directive tracking");
        } finally {
            setDetailLoading(false);
        }
    };

    // Sign/Acknowledge directive
    const handleAcknowledge = async () => {
        if (!selectedDirective) return;
        setIsSigning(true);
        try {
            const res = await fetchApi(`/directives/${selectedDirective.id}/acknowledge`, {
                method: "POST",
                body: JSON.stringify({ remarks: signRemarks.trim() || undefined }),
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to sign directive");
            }
            showToast("success", "Directive acknowledged and signed successfully.");
            setSignRemarks("");
            // Reload details and list
            await loadDirectiveDetail(selectedDirective.id);
            await loadDirectives();
        } catch (err: any) {
            showToast("error", err.message || "Failed to acknowledge directive");
        } finally {
            setIsSigning(false);
        }
    };

    useEffect(() => {
        loadDirectives();
    }, []);

    // Initial ID deep-linking
    useEffect(() => {
        const idToOpen = initialDirectiveId || searchParams?.get("directiveId");
        if (idToOpen) {
            loadDirectiveDetail(idToOpen);
        }
    }, [initialDirectiveId, searchParams]);

    // Matching logic
    const matchesTargetScope = (d: DirectiveItem, filter: string): boolean => {
        if (filter === "ALL") return true;
        if (filter === "ALL_TIERS") return Boolean(d.targetLevelAll);
        if (d.targetLevels && d.targetLevels.includes(filter)) return true;
        if (d.targetOrganizationUnits && d.targetOrganizationUnits.some(tu => tu.organization?.type === filter)) return true;
        if (d.tracking && d.tracking.recipients.some(r => r.organizationType === filter)) return true;
        return false;
    };

    const matchesReceivedFrom = (d: DirectiveItem, filter: string): boolean => {
        if (filter === "ALL") return true;
        const orgType = (d.issuerOrganization?.type || "").toUpperCase();
        const orgName = (d.issuerOrganization?.name || "").toLowerCase();

        if (filter === "FEDERAL") {
            return orgType === "FEDERAL" || orgName.includes("federal") || orgName.includes("ministry") || orgName.includes("edubridge");
        }
        if (filter === "REGION") {
            return orgType === "REGION" || orgName.includes("region") || orgName.includes("bureau");
        }
        if (filter === "ZONE") {
            return orgType === "ZONE" || orgName.includes("zone") || orgName.includes("department");
        }
        if (filter === "WOREDA") {
            return orgType === "WOREDA" || orgName.includes("woreda") || orgName.includes("office");
        }
        return orgType === filter;
    };

    const filteredDirectives = useMemo(() => {
        return directives.filter(d => {
            // Ownership
            if (originFilter === "ISSUED" && !d.isIssuedByMe) return false;
            if (originFilter === "RECEIVED" && d.isIssuedByMe) return false;

            // Received from
            if (receivedFromFilter !== "ALL" && !matchesReceivedFrom(d, receivedFromFilter)) return false;

            // Target scope
            if (targetScopeFilter !== "ALL" && !matchesTargetScope(d, targetScopeFilter)) return false;

            // Type
            if (typeFilter !== "ALL" && d.type !== typeFilter) return false;

            // Priority
            if (priorityFilter !== "ALL" && d.priority !== priorityFilter) return false;

            // Status
            if (statusFilter !== "ALL") {
                const deskStatus = getDirectiveDeskStatus(d).type;
                if (statusFilter === "PUBLISHED" && deskStatus !== "PUBLISHED") return false;
                if (statusFilter === "ACKNOWLEDGED" && deskStatus !== "ACKNOWLEDGED") return false;
                if (statusFilter === "PENDING" && deskStatus !== "PENDING") return false;
                if (statusFilter === "DRAFT" && deskStatus !== "DRAFT") return false;
            }

            // Search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const titleMatch = d.title.toLowerCase().includes(q);
                const codeMatch = d.code ? d.code.toLowerCase().includes(q) : false;
                const issuerMatch = d.issuerOrganization?.name.toLowerCase().includes(q) || false;
                if (!titleMatch && !codeMatch && !issuerMatch) return false;
            }

            return true;
        });
    }, [directives, originFilter, receivedFromFilter, targetScopeFilter, typeFilter, priorityFilter, statusFilter, searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [originFilter, receivedFromFilter, targetScopeFilter, typeFilter, priorityFilter, statusFilter, searchQuery, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredDirectives.length / pageSize));
    const paginatedDirectives = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredDirectives.slice(start, start + pageSize);
    }, [filteredDirectives, page, pageSize]);

    // Returns governance desk status for table, cards, and filtering
    const getDirectiveDeskStatus = (item: DirectiveItem) => {
        if (item.status === "DRAFT") {
            return {
                label: "Draft",
                className: "text-slate-500 font-medium",
                type: "DRAFT"
            };
        }

        // A single target is when it's explicitly targeted to 1 unit, or recipient count is exactly 1 (and not a broadcast to all units)
        const targetUnitsCount = item.targetOrganizationUnits?.length || 0;
        const totalRecipients = item.totalRecipients ?? item.tracking?.totalRecipients ?? 0;
        const isSingleTarget = targetUnitsCount === 1 || (totalRecipients === 1 && !item.targetLevelAll);

        // When sent to multiple levels/units, show 'Published' on registry table/cards.
        // Detailed per-unit delivery is inspected in the slide-over drawer.
        if (!isSingleTarget) {
            return {
                label: "Published",
                className: "text-slate-700 font-medium",
                type: "PUBLISHED"
            };
        }

        // Single target: exactly 1 targeted unit
        const acked = item.acknowledgedCount ?? item.tracking?.acknowledgedCount ?? 0;
        const isDeskAck = Boolean(
            item.userAcknowledgment?.isAcknowledged ||
            item.acknowledgmentStatus?.isAcknowledged ||
            acked >= 1
        );

        if (isDeskAck) {
            return {
                label: "Acknowledged",
                className: "text-slate-700 font-medium",
                type: "ACKNOWLEDGED"
            };
        }

        return {
            label: "Pending",
            className: "text-slate-700 font-medium",
            type: "PENDING"
        };
    };

    // Clean public-sector summary sentence matching DfE card reference
    const getCleanDirectiveCardMessage = (item: DirectiveItem): string => {
        const rawContent = item.content?.trim() || "";
        const title = item.title?.trim() || "";
        const titleLower = title.toLowerCase();

        const isGibberishOrRepetitive = (text: string) => {
            if (!text || text.length < 5) return true;
            const lower = text.toLowerCase();
            if (titleLower && (lower === titleLower || lower.includes(titleLower))) return true;
            if (/(.)\1{4,}/i.test(text) || /([a-zA-Z]{2,6})\1{2,}/i.test(text)) return true;
            const words = lower.split(/\s+/).filter(Boolean);
            if (words.length <= 2 && text.length > 20) return true;
            return false;
        };

        if (rawContent && !isGibberishOrRepetitive(rawContent)) {
            const firstSentence = rawContent.split(/[.!?]\s+/)[0];
            return firstSentence.length > 110 ? `${firstSentence.substring(0, 107)}...` : firstSentence;
        }

        const authority = item.issuerOrganization?.name || "EduBridge Platform";
        const scope = item.targetLevelAll
            ? "all administrative tiers"
            : item.targetLevels?.join(", ") || "subordinate units";
        return `Strategic directive issued by ${authority} for delivery across ${scope}.`;
    };

    useEffect(() => {
        setTrackingSearch("");
        setTrackingStatusFilter("ALL");
    }, [selectedDirective?.id]);

    const modalRecipients = useMemo(() => {
        if (!selectedDirective?.tracking?.recipients) return [];
        return selectedDirective.tracking.recipients.filter(r => {
            if (trackingStatusFilter === "ACKNOWLEDGED" && !r.isAcknowledged) return false;
            if (trackingStatusFilter === "PENDING" && r.isAcknowledged) return false;
            if (trackingSearch) {
                const q = trackingSearch.toLowerCase();
                const matchName = r.organizationName?.toLowerCase().includes(q);
                const matchType = r.organizationType?.toLowerCase().includes(q);
                const matchUser = r.acknowledgedBy?.name?.toLowerCase().includes(q);
                const matchRemarks = (r.notes || r.remarks)?.toLowerCase().includes(q);
                if (!matchName && !matchType && !matchUser && !matchRemarks) return false;
            }
            return true;
        });
    }, [selectedDirective, trackingSearch, trackingStatusFilter]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (originFilter !== "ALL") count++;
        if (tierType !== "FEDERAL" && receivedFromFilter !== "ALL") count++;
        if (targetScopeFilter !== "ALL") count++;
        if (typeFilter !== "ALL") count++;
        if (priorityFilter !== "ALL") count++;
        if (statusFilter !== "ALL") count++;
        return count;
    }, [originFilter, tierType, receivedFromFilter, targetScopeFilter, typeFilter, priorityFilter, statusFilter]);

    const hasActiveFilters = searchQuery !== "" || activeFilterCount > 0;

    const clearAllFilters = () => {
        setSearchQuery("");
        setOriginFilter("ALL");
        setReceivedFromFilter("ALL");
        setTargetScopeFilter("ALL");
        setTypeFilter("ALL");
        setPriorityFilter("ALL");
        setStatusFilter("ALL");
    };

    if (isPublishingDirective) {
        return (
            <DirectivesPublishView
                onBack={() => setIsPublishingDirective(false)}
                onPublished={() => {
                    setIsPublishingDirective(false);
                    loadDirectives();
                }}
            />
        );
    }

    return (
        <div className="space-y-6 font-sans text-slate-900 max-w-7xl">
            {/* Top Subnav (Option A: Policies & Programs Governance Hub) */}
            {showSubnav && (
                <GovernanceSubnav activeTab="directives" directivesCount={directives.length} />
            )}

            {/* Notification Toast */}
            {toastMessage && (
                <div
                    role="alert"
                    className={`p-3.5 border-l-4 text-sm flex items-center justify-between ${
                        toastMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-600 text-emerald-900"
                            : "bg-rose-50 border-rose-600 text-rose-900"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {toastMessage.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                        )}
                        <span>{toastMessage.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setToastMessage(null)}
                        className="text-xs underline hover:no-underline cursor-pointer"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* 1. PAGE HEADER (Clean single-line header matching Program UI) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Policies and directives
                </h1>

                {canCreateDirective && (
                    <button
                        type="button"
                        onClick={() => setIsPublishingDirective(true)}
                        className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Issue directive</span>
                    </button>
                )}
            </div>

            {/* 2. TOOLBAR: SEARCH, FILTERS & VIEW SWITCHER (Unified in one clean row) */}
            <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Left: Search input + Filters toggle button + Refresh */}
                    <div className="flex items-center gap-2.5 flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
                            <input
                                id="directive-search"
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search directives by title, target, or keywords..."
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
                            className={`px-3 py-2 text-sm font-medium rounded border transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 ${
                                showFilters || activeFilterCount > 0
                                    ? "bg-[#4085b3] text-white border-[#4085b3]"
                                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                            }`}
                            title="Filter directives"
                        >
                            <Filter className="w-4 h-4" />
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
                            onClick={() => loadDirectives()}
                            className="p-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded transition-colors cursor-pointer shrink-0"
                            title="Reload registry data"
                            aria-label="Reload registry data"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#4085b3]" : ""}`} />
                        </button>
                    </div>

                    {/* Right: Table / Cards View Switcher */}
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                                viewMode === "table"
                                    ? "bg-[#4085b3] text-white"
                                    : "text-slate-600 hover:text-slate-900 border border-slate-300 bg-white"
                            }`}
                            title="Display as administrative table"
                        >
                            <LayoutList className="w-3.5 h-3.5" />
                            <span>Table</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                                viewMode === "cards"
                                    ? "bg-[#4085b3] text-white"
                                    : "text-slate-600 hover:text-slate-900 border border-slate-300 bg-white"
                            }`}
                            title="Display as DfE summary cards"
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>Cards</span>
                        </button>
                    </div>
                </div>

                {/* Active Filter Chips / Tags (MoJ / DfE Pattern) */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Applied:</span>
                        {originFilter !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => setOriginFilter("ALL")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>Ownership: {originFilter === "ISSUED" ? "Issued by us" : "Received"}</span>
                                <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" />
                            </button>
                        )}
                        {tierType !== "FEDERAL" && receivedFromFilter !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => setReceivedFromFilter("ALL")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>
                                    From: {
                                        receivedFromFilter === "FEDERAL" ? "Federal Ministry" :
                                        receivedFromFilter === "REGION" ? "Regional Bureau" :
                                        receivedFromFilter === "ZONE" ? "Zone Department" :
                                        receivedFromFilter === "WOREDA" ? "Woreda Office" : receivedFromFilter
                                    }
                                </span>
                                <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" />
                            </button>
                        )}
                        {targetScopeFilter !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => setTargetScopeFilter("ALL")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>
                                    Target: {
                                        targetScopeFilter === "ALL_TIERS" ? "All subordinate units" :
                                        targetScopeFilter === "REGION" ? "Regions" :
                                        targetScopeFilter === "ZONE" ? "Zones" :
                                        targetScopeFilter === "WOREDA" ? "Woredas" :
                                        targetScopeFilter === "SCHOOL" ? "Schools" : targetScopeFilter
                                    }
                                </span>
                                <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-900" />
                            </button>
                        )}
                        {priorityFilter !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => setPriorityFilter("ALL")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>Priority: {priorityFilter.charAt(0) + priorityFilter.slice(1).toLowerCase()}</span>
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
                    <div className={`p-4 bg-slate-50 border border-slate-200 rounded grid grid-cols-1 sm:grid-cols-2 ${
                        tierType === "FEDERAL" ? "lg:grid-cols-4" : "lg:grid-cols-5"
                    } gap-4`}>
                        {/* Ownership */}
                        <div>
                            <label htmlFor="directive-origin-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                Ownership
                            </label>
                            <select
                                id="directive-origin-filter"
                                value={originFilter}
                                onChange={e => setOriginFilter(e.target.value as any)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All directives ({directives.length})</option>
                                <option value="ISSUED">Issued by our desk ({directives.filter(d => d.isIssuedByMe).length})</option>
                                {tierType !== "FEDERAL" && (
                                    <option value="RECEIVED">Received from higher tiers ({directives.filter(d => !d.isIssuedByMe).length})</option>
                                )}
                            </select>
                        </div>

                        {/* Received from (Issuing Authority) - Only for tiers below Federal */}
                        {tierType !== "FEDERAL" && (
                            <div>
                                <label htmlFor="directive-received-from-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Received from
                                </label>
                                <select
                                    id="directive-received-from-filter"
                                    value={receivedFromFilter}
                                    onChange={e => setReceivedFromFilter(e.target.value)}
                                    disabled={originFilter === "ISSUED"}
                                    className={`w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] ${
                                        originFilter === "ISSUED" ? "opacity-50 cursor-not-allowed bg-slate-100" : "cursor-pointer"
                                    }`}
                                >
                                    <option value="ALL">All issuing authorities</option>
                                    <option value="FEDERAL">Federal Ministry</option>
                                    {tierType !== "REGION" && (
                                        <option value="REGION">Regional Bureau</option>
                                    )}
                                    {tierType !== "REGION" && tierType !== "ZONE" && (
                                        <option value="ZONE">Zone Department</option>
                                    )}
                                    {(tierType === "SCHOOL" || !tierType) && (
                                        <option value="WOREDA">Woreda Office</option>
                                    )}
                                </select>
                            </div>
                        )}

                        {/* Target Scope - strictly subordinate levels only */}
                        <div>
                            <label htmlFor="directive-target-scope-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                Target scope
                            </label>
                            <select
                                id="directive-target-scope-filter"
                                value={targetScopeFilter}
                                onChange={e => setTargetScopeFilter(e.target.value as any)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All target scopes</option>
                                <option value="ALL_TIERS">All subordinate units</option>
                                {tierType === "FEDERAL" && (
                                    <option value="REGION">Regional Bureaus</option>
                                )}
                                {(tierType === "FEDERAL" || tierType === "REGION") && (
                                    <option value="ZONE">Zone Departments</option>
                                )}
                                {(tierType === "FEDERAL" || tierType === "REGION" || tierType === "ZONE") && (
                                    <option value="WOREDA">Woreda Offices</option>
                                )}
                                <option value="SCHOOL">Schools</option>
                            </select>
                        </div>

                        {/* Priority */}
                        <div>
                            <label htmlFor="directive-priority-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                Priority level
                            </label>
                            <select
                                id="directive-priority-filter"
                                value={priorityFilter}
                                onChange={e => setPriorityFilter(e.target.value)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All priorities</option>
                                <option value="CRITICAL">Critical</option>
                                <option value="URGENT">Urgent</option>
                                <option value="HIGH">High</option>
                                <option value="NORMAL">Normal</option>
                                <option value="LOW">Low</option>
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label htmlFor="directive-status-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                Current status
                            </label>
                            <select
                                id="directive-status-filter"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All statuses</option>
                                <option value="PUBLISHED">Published</option>
                                <option value="ACKNOWLEDGED">Acknowledged</option>
                                <option value="PENDING">Pending</option>
                                <option value="DRAFT">Draft</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. REGISTRY CONTENT: TABLE VIEW OR DfE CARDS VIEW (1:1 with Program UI) */}
            <div>
                {/* Loading state */}
                {loading && (
                    <div className="py-20 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#4085b3] mb-2" />
                        <span className="text-sm font-medium">Loading directives...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredDirectives.length === 0 && (
                    <div className="py-16 text-center border-t border-b border-slate-200">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                        <h2 className="text-base font-semibold text-slate-900">No directives found</h2>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                            {hasActiveFilters
                                ? "No records match your selected filters. Try clearing filters to see all directives."
                                : "No policies or directives have been registered yet."}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="mt-4 px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-sm font-medium cursor-pointer"
                            >
                                Clear all filters
                            </button>
                        ) : canCreateDirective && (
                            <button
                                type="button"
                                onClick={() => setIsPublishingDirective(true)}
                                className="mt-4 px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white rounded text-sm font-medium cursor-pointer"
                            >
                                Issue directive
                            </button>
                        )}
                    </div>
                )}

                {/* OPTION A: THE ADMINISTRATIVE TABLE (GOV.UK Standard matching Program UI) */}
                {!loading && filteredDirectives.length > 0 && viewMode === "table" && (
                    <div className="overflow-x-auto border-t border-slate-200">
                        <table className="w-full table-fixed text-left text-sm border-collapse">
                            <caption className="sr-only">Policies and directives registry</caption>
                            <thead>
                                <tr className="border-b-2 border-slate-300 text-xs font-semibold text-slate-700">
                                    <th scope="col" className="py-3 pr-3 font-semibold w-[30%]">Directive</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[18%] whitespace-nowrap">Issuing authority</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[16%] whitespace-nowrap">Target scope</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[13%] whitespace-nowrap">Deadline</th>
                                    <th scope="col" className="py-3 px-2 font-semibold w-[10%] whitespace-nowrap">Priority</th>
                                    <th scope="col" className="py-3 px-2 font-semibold w-[11%] whitespace-nowrap">Status</th>
                                    <th scope="col" className="py-3 pl-2 pr-1 font-semibold w-[8%] text-right whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedDirectives.map(item => {
                                    const isNational = Boolean(item.targetLevelAll && (!item.targetLevels || item.targetLevels.length === 0));
                                    const targetUnitsCount = item.targetOrganizationUnits?.length || 0;
                                    const isTargeted = targetUnitsCount > 0;
                                    const scopeLabel = isTargeted
                                        ? `Targeted (${targetUnitsCount} units)`
                                        : isNational
                                        ? "All subordinate units"
                                        : item.targetLevels && item.targetLevels.length > 0
                                        ? item.targetLevels.map(l => l.toUpperCase()).join(", ")
                                        : "All subordinate units";

                                    const priorityLabel = item.priority ? item.priority.charAt(0) + item.priority.slice(1).toLowerCase() : "Normal";
                                    const statusLabel = item.status ? item.status.charAt(0) + item.status.slice(1).toLowerCase() : "Published";

                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => loadDirectiveDetail(item.id)}
                                            className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                                        >
                                            {/* Directive Title */}
                                            <td className="py-3.5 pr-3 overflow-hidden">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span
                                                        className="text-[#4085b3] group-hover:underline font-semibold text-sm truncate block"
                                                        title={item.title}
                                                    >
                                                        {item.title}
                                                    </span>
                                                    {item.attachmentUrl && (
                                                        <span title="Contains official attachment" className="text-slate-400 shrink-0">
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                    {item.code && (
                                                        <span className="text-slate-500 bg-slate-100 px-1 py-0.5 rounded text-[9px] shrink-0 font-medium">
                                                            #{item.code}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Issuing Authority */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 truncate" title={item.issuerOrganization?.name || "EduBridge Platform"}>
                                                {item.issuerOrganization?.name || "EduBridge Platform"}
                                            </td>

                                            {/* Target Scope */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 truncate" title={scopeLabel}>
                                                {scopeLabel}
                                            </td>

                                            {/* Deadline */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 tabular-nums whitespace-nowrap">
                                                {item.deadline
                                                    ? new Date(item.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                                    : new Date(item.effectiveDate || item.issueDate || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                                }
                                            </td>

                                            {/* Priority */}
                                            <td className="py-3.5 px-2 text-xs text-slate-700 whitespace-nowrap">
                                                {priorityLabel}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-2 text-xs text-slate-700 whitespace-nowrap">
                                                {getDirectiveDeskStatus(item).label}
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

                {/* OPTION B: DfE CLEAN CARDS (Signature Department for Education pattern with deep navy hover matching Program UI) */}
                {!loading && filteredDirectives.length > 0 && viewMode === "cards" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
                        {paginatedDirectives.map(item => (
                            <div
                                key={item.id}
                                onClick={() => loadDirectiveDetail(item.id)}
                                className="group relative bg-white border border-slate-300 p-6 flex flex-col justify-between min-h-[175px] hover:bg-[#002d54] hover:border-[#002d54] transition-all duration-150 cursor-pointer"
                            >
                                <div>
                                    {/* Header: Title */}
                                    <h2 className="text-xl font-bold text-[#4085b3] group-hover:text-white transition-colors leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word] line-clamp-2">
                                        {item.title}
                                    </h2>

                                    {/* Single Clean Message */}
                                    <p className="text-sm text-slate-800 group-hover:text-white transition-colors mt-2.5 leading-relaxed line-clamp-2 break-words">
                                        {getCleanDirectiveCardMessage(item)}
                                    </p>
                                </div>

                                {/* Minimal Footer: Due Date & Status */}
                                <div className="mt-5 pt-3 border-t border-slate-200 group-hover:border-white/20 flex items-center justify-between text-xs text-slate-500 group-hover:text-white/80 transition-colors">
                                    <span className="tabular-nums">
                                        Due: {item.deadline
                                            ? new Date(item.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                            : new Date(item.effectiveDate || item.issueDate || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                        }
                                    </span>
                                    <span className="text-xs font-medium text-slate-600 group-hover:text-white/90">
                                        {getDirectiveDeskStatus(item).label}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 5. PAGINATION (GOV.UK style simple row) */}
                {!loading && filteredDirectives.length > 0 && (
                    <div className="py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 mt-4">
                        <div>
                            Showing <strong className="text-slate-900 font-semibold">{(page - 1) * pageSize + 1}</strong> to{" "}
                            <strong className="text-slate-900 font-semibold">{Math.min(page * pageSize, filteredDirectives.length)}</strong> of{" "}
                            <strong className="text-slate-900 font-semibold">{filteredDirectives.length}</strong> directives
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

            {/* 6. SLIDE-OVER DETAIL DRAWER (GOV.UK Official Summary List Pattern matching Program UI 1:1) */}
            {selectedDirective && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="directive-docket-title">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 transition-opacity"
                        onClick={() => setSelectedDirective(null)}
                    />

                    {/* Drawer Panel */}
                    <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl flex flex-col z-50 border-l border-slate-300 overflow-hidden">
                        {/* Header */}
                        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/90 flex items-start justify-between gap-4 shrink-0">
                            <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2 mb-2 flex-wrap text-xs text-slate-500">
                                    <span className="font-mono tracking-wide uppercase">
                                        REF: DIR-{selectedDirective.code ? selectedDirective.code.toUpperCase() : selectedDirective.id.substring(0, 8).toUpperCase()}
                                    </span>
                                    <span>·</span>
                                    <span className="font-medium text-slate-700">
                                        {getDirectiveDeskStatus(selectedDirective).label}
                                    </span>
                                </div>
                                <h2
                                    id="directive-docket-title"
                                    className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word]"
                                >
                                    {selectedDirective.title}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedDirective(null)}
                                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
                            {/* GOV.UK Summary List */}
                            <dl className="divide-y divide-slate-200 border-t border-b border-slate-200 text-sm">
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Issuing authority</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {selectedDirective.issuerOrganization?.name || "EduBridge Platform"} ({selectedDirective.issuerOrganization?.type || "FEDERAL"})
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Target scope</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {selectedDirective.targetLevelAll
                                            ? "All subordinate units"
                                            : selectedDirective.targetLevels && selectedDirective.targetLevels.length > 0
                                            ? selectedDirective.targetLevels.join(", ")
                                            : selectedDirective.targetOrganizationUnits && selectedDirective.targetOrganizationUnits.length > 0
                                            ? `Targeted (${selectedDirective.targetOrganizationUnits.length} units)`
                                            : "All subordinate units"}
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Compliance deadline</dt>
                                    <dd className="col-span-2 text-slate-900 tabular-nums">
                                        {selectedDirective.deadline
                                            ? new Date(selectedDirective.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                            : selectedDirective.effectiveDate
                                            ? `Effective from ${new Date(selectedDirective.effectiveDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                                            : "Standard execution"}
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Priority</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {selectedDirective.priority ? selectedDirective.priority.charAt(0) + selectedDirective.priority.slice(1).toLowerCase() : "Normal"}
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Current status</dt>
                                    <dd className="col-span-2 text-slate-900 font-medium">
                                        {getDirectiveDeskStatus(selectedDirective).label}
                                    </dd>
                                </div>
                            </dl>

                            {/* Official Directive Text */}
                            {selectedDirective.content && (
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Official directive text
                                    </h3>
                                    <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] bg-slate-50 p-3.5 border-l-3 border-[#4085b3]">
                                        {selectedDirective.content}
                                    </div>
                                </div>
                            )}

                            {/* Supporting Documentation */}
                            {selectedDirective.attachmentUrl && (
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Supporting documentation
                                    </h3>
                                    <div className="flex items-center justify-between p-3 border border-slate-200 text-sm">
                                        <div className="flex items-center gap-2 truncate">
                                            <Paperclip className="w-4 h-4 text-slate-500 shrink-0" />
                                            <span className="truncate">{selectedDirective.attachmentName || "Supporting Policy Document"}</span>
                                        </div>
                                        <a
                                            href={selectedDirective.attachmentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-[#4085b3] hover:underline font-semibold inline-flex items-center gap-1 shrink-0 ml-3"
                                        >
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                            <span>Open</span>
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Compliance & Acknowledgment Panel (for all desks when acknowledgment is required) */}
                            {(() => {
                                const isDeskAck = Boolean(
                                    selectedDirective.userAcknowledgment?.isAcknowledged ||
                                    selectedDirective.acknowledgmentStatus?.isAcknowledged
                                );

                                if (!selectedDirective.isAcknowledgmentRequired) {
                                    return null;
                                }

                                return (
                                    <div className="border border-slate-200 p-4 bg-slate-50 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-900">
                                                Compliance & acknowledgment
                                            </h3>
                                            {isDeskAck ? (
                                                <span className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>Confirmed by your desk</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-amber-700">
                                                    Pending your signature
                                                </span>
                                            )}
                                        </div>

                                        {!isDeskAck ? (
                                            <div className="pt-1">
                                                <button
                                                    type="button"
                                                    onClick={handleAcknowledge}
                                                    disabled={isSigning}
                                                    className="px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                                                >
                                                    {isSigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                    <span>Acknowledge directive</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-600">
                                                Recorded on {new Date(selectedDirective.userAcknowledgment?.acknowledgedAt || selectedDirective.acknowledgmentStatus?.acknowledgedAt || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Jurisdiction Delivery & Sign-off Tracking Table */}
                            {selectedDirective.tracking && selectedDirective.tracking.recipients && (
                                <div className="space-y-3 pt-4 border-t border-slate-200">
                                    {/* Clean Section Header */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-900 text-sm">
                                            Jurisdiction delivery tracking
                                        </h3>
                                        <span className="text-xs font-semibold text-[#4085b3]">
                                            {selectedDirective.tracking.acknowledgedCount} / {selectedDirective.tracking.totalRecipients} Signed (
                                            {selectedDirective.tracking.totalRecipients > 0
                                                ? Math.round((selectedDirective.tracking.acknowledgedCount / selectedDirective.tracking.totalRecipients) * 100)
                                                : 0}%)
                                        </span>
                                    </div>

                                    {/* Tracking Search & Status Filter Toolbar (matching Program UI 1:1) */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={trackingSearch}
                                                onChange={e => setTrackingSearch(e.target.value)}
                                                placeholder="Search recipient unit or official..."
                                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                            />
                                            {trackingSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setTrackingSearch("")}
                                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                                    aria-label="Clear filter"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        <select
                                            value={trackingStatusFilter}
                                            onChange={e => setTrackingStatusFilter(e.target.value)}
                                            className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer shrink-0"
                                        >
                                            <option value="ALL">All statuses</option>
                                            <option value="ACKNOWLEDGED">Acknowledged</option>
                                            <option value="PENDING">Pending</option>
                                        </select>
                                    </div>

                                    {/* Detailed Delivery Tracking Table */}
                                    <div className="max-h-72 overflow-y-auto border border-slate-200 rounded text-xs bg-white shadow-xs">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
                                                <tr>
                                                    <th scope="col" className="py-2.5 px-3 w-[45%]">Recipient unit</th>
                                                    <th scope="col" className="py-2.5 px-2.5 w-[22%]">Status</th>
                                                    <th scope="col" className="py-2.5 px-3 w-[33%]">Acknowledged by</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {modalRecipients.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="py-6 text-center text-slate-400">
                                                            No recipient units match your search or filter.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    modalRecipients.map(r => {
                                                        const isAck = r.isAcknowledged || !!r.acknowledgedAt;
                                                        return (
                                                            <tr key={r.organizationId} className="hover:bg-slate-50/80 transition-colors">
                                                                {/* Recipient Unit & Tier */}
                                                                <td className="py-2.5 px-3 align-top">
                                                                    <div className="font-medium text-slate-900 leading-snug break-words [overflow-wrap:anywhere]">
                                                                        {r.organizationName}
                                                                    </div>
                                                                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">
                                                                        {r.organizationType}
                                                                    </div>
                                                                </td>

                                                                {/* Status */}
                                                                <td className="py-2.5 px-2.5 align-top whitespace-nowrap text-xs text-slate-700 font-medium">
                                                                    {isAck ? "Acknowledged" : "Pending"}
                                                                </td>

                                                                {/* Acknowledged by & Timestamp */}
                                                                <td className="py-2.5 px-3 align-top">
                                                                    {isAck ? (
                                                                        <div className="space-y-0.5">
                                                                            <div className="font-medium text-slate-900 flex items-center gap-1">
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                                <span className="break-words [overflow-wrap:anywhere]">
                                                                                    {r.acknowledgedBy?.name || "Administrative desk"}
                                                                                </span>
                                                                            </div>
                                                                            {r.acknowledgedBy?.email && (
                                                                                <div className="text-[11px] text-slate-500 truncate" title={r.acknowledgedBy.email}>
                                                                                    {r.acknowledgedBy.email}
                                                                                </div>
                                                                            )}
                                                                            {r.acknowledgedAt && (
                                                                                <div className="text-[10px] text-slate-500 tabular-nums">
                                                                                    {new Date(r.acknowledgedAt).toLocaleDateString("en-GB", {
                                                                                        day: "numeric",
                                                                                        month: "short",
                                                                                        year: "numeric",
                                                                                        hour: "2-digit",
                                                                                        minute: "2-digit"
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                            {(r.notes || r.remarks) && (
                                                                                <div className="text-[10px] text-slate-600 italic mt-0.5">
                                                                                    "{r.notes || r.remarks}"
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-400 text-[11px] italic">
                                                                            Awaiting acknowledgment
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedDirective(null)}
                                className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded cursor-pointer"
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
