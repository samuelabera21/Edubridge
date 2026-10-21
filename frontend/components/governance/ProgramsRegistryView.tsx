"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import {
    Search,
    Plus,
    X,
    Paperclip,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ArrowUpRight,
    Send,
    CheckSquare,
    CheckCircle2,
    AlertCircle,
    Target,
    ShieldCheck,
    FileText,
    LayoutList,
    LayoutGrid,
    Filter
} from "lucide-react";
import ProgramCreatePublishView from "./ProgramCreatePublishView";

export interface ProgramRecipientTracking {
    id: string;
    organizationId: string;
    organization: { id: string; name: string; type: string };
    status: "PENDING" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
    isAcknowledged: boolean;
    acknowledgedAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    notes: string | null;
    submittedData: string | null;
    acknowledgedByUser?: { name: string; email: string } | null;
}

export interface ProgramItem {
    id: string;
    name: string;
    description: string;
    objective: string;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
    status: "DRAFT" | "PUBLISHED" | "ACTIVE" | "COMPLETED" | "CLOSED";
    startDate: string;
    endDate: string;
    instructions: string;
    requiredAction: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    createdBy: string;
    createdOrganizationId: string;
    parentProgramId?: string | null;
    targetLevelAll: boolean;
    targetLevels: string[];
    cascadeDescendants: boolean;
    targetOrganizationUnits?: Array<{
        id?: string;
        organizationId?: string;
        organization?: { id: string; name: string; type: string };
    }>;
    isCreatedByMe?: boolean;
    createdOrganization: { id: string; name: string; type: string };
    creator?: { id: string; name: string; email: string } | null;
    parentProgram?: {
        id: string;
        name: string;
        createdOrganization?: { id: string; name: string; type: string };
    } | null;
    subordinatePrograms?: Array<{
        id: string;
        name: string;
        createdOrganization: { id: string; name: string; type: string };
    }>;
    totalRecipients?: number;
    acknowledgedCount?: number;
    inProgressCount?: number;
    completedCount?: number;
    implementations?: ProgramRecipientTracking[];
    userImplementation?: ProgramRecipientTracking | null;
    tracking?: {
        totalRecipients: number;
        acknowledgedCount: number;
        inProgressCount: number;
        completedCount: number;
        implementations: ProgramRecipientTracking[];
    };
}

export interface ProgramsRegistryViewProps {
    tierName?: string;
    tierType?: "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
    organizationId?: string | null;
    canCreateProgram?: boolean;
    initialProgramId?: string | null;
    initialProgramTitle?: string | null;
}

export default function ProgramsRegistryView({
    tierName = "Administration",
    tierType = "FEDERAL",
    organizationId,
    canCreateProgram = true,
    initialProgramId,
    initialProgramTitle
}: ProgramsRegistryViewProps) {
    const { authData } = useAuth(false);
    const searchParams = useSearchParams();
    const targetProgramId = initialProgramId || searchParams?.get("programId") || searchParams?.get("id");
    const targetProgramTitle = initialProgramTitle || searchParams?.get("programTitle");

    // Resolve the active organization ID: prefer prop, otherwise match tierType against user's access scopes
    const activeOrgId = useMemo(() => {
        if (organizationId) return organizationId;
        if (!authData?.access?.length) return null;
        const matchingAccess = authData.access.find((a: any) => a.scope?.type === tierType);
        return matchingAccess?.scope?.id || null;
    }, [organizationId, authData, tierType]);

    const [programs, setPrograms] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // View presentation mode (table = default, cards = clean DfE card grid)
    const [viewMode, setViewMode] = useState<"table" | "cards">("table");

    // Navigation & Filter Mode
    const [originFilter, setOriginFilter] = useState<"ALL" | "RECEIVED" | "CREATED">("ALL");
    const [receivedFromFilter, setReceivedFromFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [targetScopeFilter, setTargetScopeFilter] = useState<"ALL" | "ALL_TIERS" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL">("ALL");
    const [showFilters, setShowFilters] = useState(false);
    const [isCreatingProgram, setIsCreatingProgram] = useState(false);
    const [cascadingParentProgram, setCascadingParentProgram] = useState<ProgramItem | null>(null);

    // Detail Slide-Over Drawer
    const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [trackingSearch, setTrackingSearch] = useState("");
    const [trackingStatusFilter, setTrackingStatusFilter] = useState<string>("ALL");

    // Execution / Action state for recipient
    const [actionNotes, setActionNotes] = useState("");
    const [actionStatus, setActionStatus] = useState<string>("IN_PROGRESS");
    const [submittingAction, setSubmittingAction] = useState(false);
    const [actionToast, setActionToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(9); // 9 aligns well with both 3-column cards and tables

    const loadPrograms = async () => {
        setLoading(true);
        setError(null);
        try {
            const query = activeOrgId ? `?organizationId=${activeOrgId}` : "";
            const res = await fetchApi(`/programs${query}`, {
                headers: activeOrgId ? { "x-organization-id": activeOrgId } : {}
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to load programs & initiatives");
            }
            const data = await res.json();
            const list: ProgramItem[] = data.data || [];
            setPrograms(list);
            return list;
        } catch (err: any) {
            setError(err.message || "Failed to load programs");
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPrograms();
    }, [activeOrgId]);

    const loadProgramDetail = async (id: string) => {
        setDetailLoading(true);
        try {
            const query = activeOrgId ? `?organizationId=${activeOrgId}` : "";
            const res = await fetchApi(`/programs/${id}${query}`, {
                headers: activeOrgId ? { "x-organization-id": activeOrgId } : {}
            });
            if (res.ok) {
                const json = await res.json();
                setSelectedProgram(json.data);
                if (json.data?.userImplementation) {
                    setActionStatus(json.data.userImplementation.status || "IN_PROGRESS");
                    setActionNotes(json.data.userImplementation.notes || "");
                }
            }
        } catch (err) {
            console.error("Failed to fetch program detail:", err);
        } finally {
            setDetailLoading(false);
        }
    };

    const matchProgramByTitle = (title: string, list: ProgramItem[]) => {
        if (!title || !list || list.length === 0) return null;
        const normTitle = title.toLowerCase().trim();

        let found = list.find(p => p.name.toLowerCase().trim() === normTitle);
        if (found) return found;

        found = list.find(p => {
            const normName = p.name.toLowerCase().trim();
            return normName.startsWith(normTitle) || normTitle.startsWith(normName);
        });
        if (found) return found;

        found = list.find(p => {
            const normName = p.name.toLowerCase().trim();
            return normName.includes(normTitle) || normTitle.includes(normName);
        });
        if (found) return found;

        const tokens = normTitle.split(/\s+/).filter(w => w.length > 2);
        if (tokens.length > 0) {
            found = list.find(p => {
                const normName = p.name.toLowerCase();
                return tokens.some(t => normName.includes(t));
            });
        }
        return found || null;
    };

    const openProgramByTitleOrId = async (id?: string | null, title?: string | null, list?: ProgramItem[]) => {
        if (id) {
            await loadProgramDetail(id);
            return;
        }
        if (title) {
            const pool = list && list.length > 0 ? list : programs;
            let match = matchProgramByTitle(title, pool);
            if (!match) {
                const freshList = await loadPrograms();
                match = matchProgramByTitle(title, freshList);
            }
            if (match) {
                await loadProgramDetail(match.id);
            }
        }
    };

    useEffect(() => {
        if (targetProgramId) {
            loadProgramDetail(targetProgramId);
        } else if (targetProgramTitle) {
            openProgramByTitleOrId(null, targetProgramTitle, programs);
        }
    }, [targetProgramId, targetProgramTitle, programs.length]);

    useEffect(() => {
        const handleOpenDetailEvent = (e: any) => {
            const { programId, programTitle } = e?.detail || {};
            if (programId || programTitle) {
                openProgramByTitleOrId(programId, programTitle, programs);
            }
        };

        if (typeof window !== "undefined") {
            window.addEventListener("open-program-detail", handleOpenDetailEvent);
        }
        return () => {
            if (typeof window !== "undefined") {
                window.removeEventListener("open-program-detail", handleOpenDetailEvent);
            }
        };
    }, [programs]);

    const handleAcknowledge = async (programId: string) => {
        setSubmittingAction(true);
        try {
            const query = activeOrgId ? `?organizationId=${activeOrgId}` : "";
            const res = await fetchApi(`/programs/${programId}/acknowledge${query}`, {
                method: "POST",
                headers: activeOrgId ? { "x-organization-id": activeOrgId } : {},
                body: JSON.stringify({ notes: actionNotes || "Acknowledged by administrative desk." })
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to acknowledge program");
            }
            setActionToast({ type: "success", text: "Program acknowledged successfully." });
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("notification-updated"));
            }
            await loadProgramDetail(programId);
            await loadPrograms();
        } catch (err: any) {
            setActionToast({ type: "error", text: err.message || "Acknowledgment failed." });
        } finally {
            setSubmittingAction(false);
        }
    };

    const handleUpdateImplementationStatus = async (programId: string) => {
        setSubmittingAction(true);
        try {
            const query = activeOrgId ? `?organizationId=${activeOrgId}` : "";
            const res = await fetchApi(`/programs/${programId}/implementation-status${query}`, {
                method: "PATCH",
                headers: activeOrgId ? { "x-organization-id": activeOrgId } : {},
                body: JSON.stringify({
                    status: actionStatus,
                    notes: actionNotes
                })
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.message || "Failed to update implementation status");
            }
            setActionToast({ type: "success", text: `Status updated to ${actionStatus.replace("_", " ")}.` });
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("notification-updated"));
            }
            await loadProgramDetail(programId);
            await loadPrograms();
        } catch (err: any) {
            setActionToast({ type: "error", text: err.message || "Status update failed." });
        } finally {
            setSubmittingAction(false);
        }
    };

    const matchesTargetScope = (p: ProgramItem, filter: string): boolean => {
        if (filter === "ALL") return true;
        if (filter === "ALL_TIERS") {
            return Boolean(p.targetLevelAll);
        }
        if (p.targetLevels && p.targetLevels.includes(filter)) {
            return true;
        }
        if (p.targetOrganizationUnits && p.targetOrganizationUnits.some(tu => tu.organization?.type === filter)) {
            return true;
        }
        if (p.implementations && p.implementations.some(imp => imp.organization?.type === filter)) {
            return true;
        }
        return false;
    };

    const matchesReceivedFrom = (p: ProgramItem, filter: string): boolean => {
        if (filter === "ALL") return true;
        const orgType = (p.createdOrganization?.type || "").toUpperCase();
        const orgName = (p.createdOrganization?.name || "").toLowerCase();

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

    const filteredPrograms = useMemo(() => {
        return programs.filter(p => {
            // Origin filter: created by us vs received
            if (originFilter === "RECEIVED" && p.isCreatedByMe) return false;
            if (originFilter === "CREATED" && !p.isCreatedByMe) return false;

            // Received from (issuing authority) filter
            if (receivedFromFilter !== "ALL" && !matchesReceivedFrom(p, receivedFromFilter)) return false;

            // Target scope filter
            if (targetScopeFilter !== "ALL" && !matchesTargetScope(p, targetScopeFilter)) return false;

            if (priorityFilter !== "ALL" && p.priority !== priorityFilter) return false;
            if (statusFilter !== "ALL" && p.status !== statusFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesName = p.name?.toLowerCase().includes(q);
                const matchesObj = p.objective?.toLowerCase().includes(q);
                const matchesOrg = p.createdOrganization?.name?.toLowerCase().includes(q);
                const matchesAction = p.requiredAction?.toLowerCase().includes(q);
                const matchesScope = p.targetLevelAll
                    ? "all subordinate units".includes(q)
                    : p.targetLevels?.some(tl => tl.toLowerCase().includes(q));
                if (!matchesName && !matchesObj && !matchesOrg && !matchesAction && !matchesScope) return false;
            }

            return true;
        });
    }, [programs, originFilter, receivedFromFilter, targetScopeFilter, priorityFilter, statusFilter, searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [originFilter, receivedFromFilter, targetScopeFilter, priorityFilter, statusFilter, searchQuery, pageSize, viewMode]);

    const totalPages = Math.max(1, Math.ceil(filteredPrograms.length / pageSize));
    const paginatedPrograms = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredPrograms.slice(start, start + pageSize);
    }, [filteredPrograms, page, pageSize]);

    const modalImplementations = useMemo(() => {
        if (!selectedProgram?.tracking?.implementations) return [];
        return selectedProgram.tracking.implementations.filter(imp => {
            if (trackingStatusFilter !== "ALL") {
                if (trackingStatusFilter === "ACKNOWLEDGED") {
                    if (!imp.isAcknowledged) return false;
                } else if (trackingStatusFilter === "PENDING") {
                    if (imp.isAcknowledged || imp.status !== "PENDING") return false;
                } else if (imp.status !== trackingStatusFilter) {
                    return false;
                }
            }
            if (trackingSearch.trim()) {
                const q = trackingSearch.toLowerCase().trim();
                const matchesName = imp.organization?.name?.toLowerCase().includes(q);
                const matchesType = imp.organization?.type?.toLowerCase().includes(q);
                const matchesNotes = imp.notes?.toLowerCase().includes(q);
                const matchesUser = imp.acknowledgedByUser?.name?.toLowerCase().includes(q) || imp.acknowledgedByUser?.email?.toLowerCase().includes(q);
                if (!matchesName && !matchesType && !matchesNotes && !matchesUser) return false;
            }
            return true;
        });
    }, [selectedProgram, trackingStatusFilter, trackingSearch]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (originFilter !== "ALL") count++;
        if (tierType !== "FEDERAL" && receivedFromFilter !== "ALL") count++;
        if (targetScopeFilter !== "ALL") count++;
        if (priorityFilter !== "ALL") count++;
        if (statusFilter !== "ALL") count++;
        return count;
    }, [originFilter, tierType, receivedFromFilter, targetScopeFilter, priorityFilter, statusFilter]);

    const hasActiveFilters = searchQuery !== "" || activeFilterCount > 0;

    const clearAllFilters = () => {
        setSearchQuery("");
        setOriginFilter("ALL");
        setReceivedFromFilter("ALL");
        setTargetScopeFilter("ALL");
        setPriorityFilter("ALL");
        setStatusFilter("ALL");
    };

    const getCleanCardMessage = (item: ProgramItem) => {
        const rawObj = item.objective?.trim() || "";
        const rawDesc = item.description?.trim() || "";
        const name = item.name?.trim() || "";
        const nameLower = name.toLowerCase();

        // Helper to test if text is repetitive dev filler or gibberish
        const isGibberishOrRepetitive = (text: string) => {
            if (!text || text.length < 5) return true;
            const lower = text.toLowerCase();
            // Repeats the initiative title
            if (nameLower && (lower === nameLower || lower.includes(nameLower))) {
                return true;
            }
            // Repetitive characters or word patterns (e.g. "aaaaa", "AllAllAll", "testtest")
            if (/(.)\1{4,}/i.test(text) || /([a-zA-Z]{2,6})\1{2,}/i.test(text)) {
                return true;
            }
            // Too few unique words with excessive length
            const words = lower.split(/\s+/).filter(Boolean);
            if (words.length <= 2 && text.length > 20) return true;
            return false;
        };

        // If objective is a legitimate readable human sentence
        if (rawObj && !isGibberishOrRepetitive(rawObj)) {
            const firstSentence = rawObj.split(/[.!?]\s+/)[0];
            return firstSentence.length > 110 ? `${firstSentence.substring(0, 107)}...` : firstSentence;
        }

        // Else if description is a legitimate readable sentence
        if (rawDesc && !isGibberishOrRepetitive(rawDesc)) {
            const firstSentence = rawDesc.split(/[.!?]\s+/)[0];
            return firstSentence.length > 110 ? `${firstSentence.substring(0, 107)}...` : firstSentence;
        }

        // Clean public-sector summary sentence matching DfE card reference
        const authority = item.createdOrganization?.name || "Federal Ministry";
        const scope = item.targetLevelAll
            ? "all administrative tiers"
            : item.targetLevels?.join(", ") || "subordinate units";
        return `Strategic initiative issued by ${authority} for delivery across ${scope}.`;
    };

    if (isCreatingProgram || cascadingParentProgram) {
        return (
            <ProgramCreatePublishView
                parentProgram={cascadingParentProgram}
                organizationId={activeOrgId}
                onBack={() => {
                    setIsCreatingProgram(false);
                    setCascadingParentProgram(null);
                }}
                onPublished={() => {
                    setIsCreatingProgram(false);
                    setCascadingParentProgram(null);
                    loadPrograms();
                }}
            />
        );
    }

    return (
        <div className="space-y-6 font-sans text-slate-900 max-w-7xl">
            {/* Notification Toast */}
            {actionToast && (
                <div
                    role="alert"
                    className={`p-3.5 border-l-4 text-sm flex items-center justify-between ${
                        actionToast.type === "success"
                            ? "bg-slate-50 border-emerald-600 text-slate-900"
                            : "bg-slate-50 border-rose-600 text-slate-900"
                    }`}
                >
                    <div className="flex items-center gap-2.5">
                        {actionToast.type === "success" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                        <span className="font-medium">{actionToast.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setActionToast(null)}
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Error Banner */}
            {error && (
                <div role="alert" className="p-4 border-l-4 border-rose-600 bg-rose-50 text-slate-900 text-sm flex items-center justify-between">
                    <div>
                        <strong className="font-semibold">There is a problem loading the registry:</strong> {error}
                    </div>
                    <button
                        type="button"
                        onClick={() => loadPrograms()}
                        className="text-sm font-semibold text-[#4085b3] hover:underline cursor-pointer ml-4"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* 1. PAGE HEADER (Clean single-line header) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Programs and initiatives
                </h1>

                {canCreateProgram && (
                    <button
                        type="button"
                        onClick={() => setIsCreatingProgram(true)}
                        className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Issue initiative</span>
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
                                id="program-search"
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search initiatives by title, target, or keywords..."
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
                            title="Filter initiatives"
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
                            onClick={() => loadPrograms()}
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
                                <span>Ownership: {originFilter === "CREATED" ? "Created by us" : "Received"}</span>
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
                        {/* Ownership / Origin */}
                        <div>
                            <label htmlFor="origin-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                Ownership
                            </label>
                            <select
                                id="origin-filter"
                                value={originFilter}
                                onChange={e => setOriginFilter(e.target.value as any)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All initiatives ({programs.length})</option>
                                <option value="CREATED">Created by our desk ({programs.filter(p => p.isCreatedByMe).length})</option>
                                {tierType !== "FEDERAL" && (
                                    <option value="RECEIVED">Received from higher tiers ({programs.filter(p => !p.isCreatedByMe).length})</option>
                                )}
                            </select>
                        </div>

                        {/* Received from (Issuing Authority) - Only for tiers below Federal */}
                        {tierType !== "FEDERAL" && (
                            <div>
                                <label htmlFor="received-from-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                    Received from
                                </label>
                                <select
                                    id="received-from-filter"
                                    value={receivedFromFilter}
                                    onChange={e => setReceivedFromFilter(e.target.value)}
                                    disabled={originFilter === "CREATED"}
                                    className={`w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] ${
                                        originFilter === "CREATED" ? "opacity-50 cursor-not-allowed bg-slate-100" : "cursor-pointer"
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
                            <label htmlFor="target-scope-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                Target scope
                            </label>
                            <select
                                id="target-scope-filter"
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
                            <label htmlFor="priority-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                Priority level
                            </label>
                            <select
                                id="priority-filter"
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
                            <label htmlFor="status-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                Current status
                            </label>
                            <select
                                id="status-filter"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="PUBLISHED">Published</option>
                                <option value="DRAFT">Draft</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CLOSED">Closed</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* 4. REGISTRY CONTENT: TABLE VIEW OR DfE CARDS VIEW */}
            <div>
                {/* Loading state */}
                {loading && (
                    <div className="py-20 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#4085b3] mb-2" />
                        <span className="text-sm font-medium">Loading initiatives...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredPrograms.length === 0 && (
                    <div className="py-16 text-center border-t border-b border-slate-200">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                        <h2 className="text-base font-semibold text-slate-900">No initiatives found</h2>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                            {hasActiveFilters
                                ? "No records match your selected filters. Try clearing filters to see all initiatives."
                                : "No programs or initiatives have been registered yet."}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="mt-4 px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-sm font-medium cursor-pointer"
                            >
                                Clear all filters
                            </button>
                        ) : canCreateProgram && (
                            <button
                                type="button"
                                onClick={() => setIsCreatingProgram(true)}
                                className="mt-4 px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white rounded text-sm font-medium cursor-pointer"
                            >
                                Issue initiative
                            </button>
                        )}
                    </div>
                )}

                {/* OPTION A: THE ADMINISTRATIVE TABLE (GOV.UK Standard) */}
                {!loading && filteredPrograms.length > 0 && viewMode === "table" && (
                    <div className="overflow-x-auto border-t border-slate-200">
                        <table className="w-full table-fixed text-left text-sm border-collapse">
                            <caption className="sr-only">Programs and initiatives registry</caption>
                            <thead>
                                <tr className="border-b-2 border-slate-300 text-xs font-semibold text-slate-700">
                                    <th scope="col" className="py-3 pr-3 font-semibold w-[30%]">Initiative</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[18%] whitespace-nowrap">Issuing authority</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[16%] whitespace-nowrap">Target scope</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[13%] whitespace-nowrap">Deadline</th>
                                    <th scope="col" className="py-3 px-2 font-semibold w-[10%] whitespace-nowrap">Priority</th>
                                    <th scope="col" className="py-3 px-2 font-semibold w-[11%] whitespace-nowrap">Status</th>
                                    <th scope="col" className="py-3 pl-2 pr-1 font-semibold w-[8%] text-right whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedPrograms.map(item => (
                                    <tr
                                        key={item.id}
                                        onClick={() => loadProgramDetail(item.id)}
                                        className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                                    >
                                        {/* Initiative Title (Strictly truncated single line) */}
                                        <td className="py-3.5 pr-3 overflow-hidden">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span
                                                    className="text-[#4085b3] group-hover:underline font-semibold text-sm truncate block"
                                                    title={item.name}
                                                >
                                                    {item.name}
                                                </span>
                                                {item.attachmentUrl && (
                                                    <span title="Contains official attachment" className="text-slate-400 shrink-0">
                                                        <Paperclip className="w-3.5 h-3.5" />
                                                    </span>
                                                )}
                                                {item.parentProgram && (
                                                    <span className="text-slate-500 bg-slate-100 px-1 py-0.5 rounded text-[9px] shrink-0 font-medium">
                                                        Cascaded
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Issuing Authority (Single line truncate) */}
                                        <td className="py-3.5 px-3 text-xs text-slate-700 truncate" title={item.createdOrganization?.name || "EduBridge Platform"}>
                                            {item.createdOrganization?.name || "EduBridge Platform"}
                                        </td>

                                        {/* Target Scope (Single line truncate) */}
                                        <td className="py-3.5 px-3 text-xs text-slate-700 truncate" title={item.targetLevelAll ? "All subordinate units" : (item.targetLevels?.join(", ") || "Targeted units")}>
                                            {item.targetLevelAll ? "All subordinate units" : (item.targetLevels?.join(", ") || "Targeted units")}
                                        </td>

                                        {/* Execution Deadline (Single line) */}
                                        <td className="py-3.5 px-3 text-xs text-slate-700 tabular-nums whitespace-nowrap">
                                            {new Date(item.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                        </td>

                                        {/* Priority (Single line pill) */}
                                        <td className="py-3.5 px-2 text-xs whitespace-nowrap">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                                item.priority === "CRITICAL" || item.priority === "URGENT"
                                                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                                                    : item.priority === "HIGH"
                                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                                    : "bg-slate-100 text-slate-700"
                                            }`}>
                                                {item.priority.charAt(0) + item.priority.slice(1).toLowerCase()}
                                            </span>
                                        </td>

                                        {/* Status (Single line pill) */}
                                        <td className="py-3.5 px-2 text-xs whitespace-nowrap">
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                                item.status === "ACTIVE"
                                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                    : item.status === "PUBLISHED"
                                                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                                                    : "bg-slate-100 text-slate-700"
                                            }`}>
                                                {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                                            </span>
                                        </td>

                                        {/* Action Link (Always visible, right-aligned) */}
                                        <td className="py-3.5 pl-2 pr-1 text-right whitespace-nowrap">
                                            <span className="text-xs font-semibold text-[#4085b3] group-hover:underline inline-flex items-center gap-0.5">
                                                <span>View</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* OPTION B: DfE CLEAN CARDS (Signature Department for Education pattern with deep navy hover) */}
                {!loading && filteredPrograms.length > 0 && viewMode === "cards" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
                        {paginatedPrograms.map(item => (
                            <div
                                key={item.id}
                                onClick={() => loadProgramDetail(item.id)}
                                className="group relative bg-white border border-slate-300 p-6 flex flex-col justify-between min-h-[175px] hover:bg-[#002d54] hover:border-[#002d54] transition-all duration-150 cursor-pointer"
                            >
                                <div>
                                    {/* Header: Title */}
                                    <h2 className="text-xl font-bold text-[#4085b3] group-hover:text-white transition-colors leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word] line-clamp-2">
                                        {item.name}
                                    </h2>

                                    {/* Single Clean Message */}
                                    <p className="text-sm text-slate-800 group-hover:text-white transition-colors mt-2.5 leading-relaxed line-clamp-2 break-words">
                                        {getCleanCardMessage(item)}
                                    </p>
                                </div>

                                {/* Minimal Footer: Due Date & Status */}
                                <div className="mt-5 pt-3 border-t border-slate-200 group-hover:border-white/20 flex items-center justify-between text-xs text-slate-500 group-hover:text-white/80 transition-colors">
                                    <span className="tabular-nums">
                                        Due: {new Date(item.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                    <span className="font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 group-hover:bg-white/15 group-hover:text-white transition-colors">
                                        {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 5. PAGINATION (GOV.UK style simple row) */}
                {!loading && filteredPrograms.length > 0 && (
                    <div className="py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 mt-4">
                        <div>
                            Showing <strong className="text-slate-900 font-semibold">{(page - 1) * pageSize + 1}</strong> to{" "}
                            <strong className="text-slate-900 font-semibold">{Math.min(page * pageSize, filteredPrograms.length)}</strong> of{" "}
                            <strong className="text-slate-900 font-semibold">{filteredPrograms.length}</strong> initiatives
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

            {/* 6. SLIDE-OVER DETAIL DRAWER (GOV.UK Official Summary List Pattern) */}
            {selectedProgram && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="docket-title">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 transition-opacity"
                        onClick={() => setSelectedProgram(null)}
                    />

                    {/* Drawer Panel */}
                    <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl flex flex-col z-50 border-l border-slate-300 overflow-hidden">
                        {/* Header */}
                        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/90 flex items-start justify-between gap-4 shrink-0">
                            <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-200/80 text-slate-700 tracking-wide uppercase">
                                        REF: PRG-{selectedProgram.id.substring(0, 8).toUpperCase()}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                        selectedProgram.status === "ACTIVE"
                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                            : selectedProgram.status === "PUBLISHED"
                                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                    }`}>
                                        {selectedProgram.status.charAt(0) + selectedProgram.status.slice(1).toLowerCase()}
                                    </span>
                                </div>
                                <h2
                                    id="docket-title"
                                    className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word]"
                                >
                                    {selectedProgram.name}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedProgram(null)}
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
                                        {selectedProgram.createdOrganization?.name || "EduBridge Platform"} ({selectedProgram.createdOrganization?.type || "FEDERAL"})
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Target scope</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {selectedProgram.targetLevelAll ? "All subordinate units" : selectedProgram.targetLevels?.join(", ") || "Targeted units"}
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Execution period</dt>
                                    <dd className="col-span-2 text-slate-900 tabular-nums">
                                        {new Date(selectedProgram.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                        {" "}to{" "}
                                        <span className="font-semibold">
                                            {new Date(selectedProgram.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                        </span>
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Priority</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {selectedProgram.priority.charAt(0) + selectedProgram.priority.slice(1).toLowerCase()}
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Current status</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {selectedProgram.status.charAt(0) + selectedProgram.status.slice(1).toLowerCase()}
                                    </dd>
                                </div>
                            </dl>

                            {/* Strategic Objective */}
                            {selectedProgram.objective && (
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Strategic objective
                                    </h3>
                                    <div className="text-sm text-slate-900 leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word] bg-slate-50 p-3.5 border-l-3 border-[#4085b3]">
                                        {selectedProgram.objective}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            {selectedProgram.description && (
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Scope & description
                                    </h3>
                                    <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                        {selectedProgram.description}
                                    </div>
                                </div>
                            )}

                            {/* Mandatory Action */}
                            {selectedProgram.requiredAction && (
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Required action
                                    </h3>
                                    <div className="text-sm text-slate-900 leading-relaxed break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                        {selectedProgram.requiredAction}
                                    </div>
                                </div>
                            )}

                            {/* Instructions */}
                            {selectedProgram.instructions && (
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Implementation instructions
                                    </h3>
                                    <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word]">
                                        {selectedProgram.instructions}
                                    </div>
                                </div>
                            )}

                            {/* Attachment Link */}
                            {selectedProgram.attachmentUrl && (
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Supporting documentation
                                    </h3>
                                    <div className="flex items-center justify-between p-3 border border-slate-200 text-sm">
                                        <div className="flex items-center gap-2 truncate">
                                            <Paperclip className="w-4 h-4 text-slate-500 shrink-0" />
                                            <span className="truncate">{selectedProgram.attachmentName || "Guideline Document"}</span>
                                        </div>
                                        <a
                                            href={selectedProgram.attachmentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-[#4085b3] hover:underline font-semibold inline-flex items-center gap-1 shrink-0 ml-3"
                                        >
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                            <span>Download</span>
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Recipient Execution Panel */}
                            {!selectedProgram.isCreatedByMe && (
                                <div className="border border-slate-200 p-4 bg-slate-50 space-y-3">
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Your desk status: {selectedProgram.userImplementation?.status?.replace("_", " ") || "PENDING"}
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <label className="block text-slate-700 font-medium mb-1">
                                                Update status
                                            </label>
                                            <select
                                                value={actionStatus}
                                                onChange={e => setActionStatus(e.target.value)}
                                                className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800"
                                            >
                                                <option value="ACKNOWLEDGED">Acknowledged</option>
                                                <option value="IN_PROGRESS">In progress</option>
                                                <option value="COMPLETED">Completed</option>
                                                <option value="BLOCKED">Blocked</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-slate-700 font-medium mb-1">
                                                Remarks
                                            </label>
                                            <input
                                                type="text"
                                                value={actionNotes}
                                                onChange={e => setActionNotes(e.target.value)}
                                                placeholder="Action report or notes..."
                                                className="w-full p-2 border border-slate-300 rounded bg-white text-slate-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                                        {!selectedProgram.userImplementation?.isAcknowledged ? (
                                            <button
                                                type="button"
                                                onClick={() => handleAcknowledge(selectedProgram.id)}
                                                disabled={submittingAction}
                                                className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-medium rounded inline-flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5" />
                                                <span>Acknowledge receipt</span>
                                            </button>
                                        ) : (
                                            <span className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>
                                                    Acknowledged{selectedProgram.userImplementation?.acknowledgedByUser?.name ? ` by ${selectedProgram.userImplementation.acknowledgedByUser.name}` : ""} on {new Date(selectedProgram.userImplementation?.acknowledgedAt || "").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                                </span>
                                            </span>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => handleUpdateImplementationStatus(selectedProgram.id)}
                                            disabled={submittingAction}
                                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded inline-flex items-center gap-1.5 cursor-pointer"
                                        >
                                            {submittingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                            <span>Update status</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Delivery Tracking Table (For creator desk) */}
                            {selectedProgram.isCreatedByMe && selectedProgram.tracking && (
                                <div className="space-y-3 pt-4 border-t border-slate-200">
                                    {/* Clean Section Header */}
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-slate-900 text-sm">
                                            Jurisdiction delivery tracking
                                        </h3>
                                    </div>

                                    {/* Tracking Search & Status Filter Toolbar */}
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
                                            <option value="IN_PROGRESS">In progress</option>
                                            <option value="COMPLETED">Completed</option>
                                            <option value="PENDING">Pending</option>
                                            <option value="BLOCKED">Blocked</option>
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
                                                {modalImplementations.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="py-6 text-center text-slate-400">
                                                            No recipient units match your search or filter.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    modalImplementations.map(imp => {
                                                        const isAck = imp.isAcknowledged || !!imp.acknowledgedAt || !!imp.acknowledgedByUser;
                                                        return (
                                                            <tr key={imp.id} className="hover:bg-slate-50/80 transition-colors">
                                                                {/* Recipient Unit & Tier */}
                                                                <td className="py-2.5 px-3 align-top">
                                                                    <div className="font-medium text-slate-900 leading-snug break-words [overflow-wrap:anywhere]">
                                                                        {imp.organization.name}
                                                                    </div>
                                                                    <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mt-0.5">
                                                                        {imp.organization.type}
                                                                    </div>
                                                                </td>

                                                                {/* Status Pill */}
                                                                <td className="py-2.5 px-2.5 align-top whitespace-nowrap">
                                                                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                                                                        imp.status === "COMPLETED"
                                                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                                                            : imp.status === "IN_PROGRESS"
                                                                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                                                                            : imp.status === "ACKNOWLEDGED"
                                                                            ? "bg-indigo-50 text-indigo-800 border border-indigo-200"
                                                                            : imp.status === "BLOCKED"
                                                                            ? "bg-rose-50 text-rose-800 border border-rose-200"
                                                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                                                    }`}>
                                                                        {imp.status.replace("_", " ").toLowerCase().replace(/^\w/, c => c.toUpperCase())}
                                                                    </span>
                                                                </td>

                                                                {/* Acknowledged by & Timestamp */}
                                                                <td className="py-2.5 px-3 align-top">
                                                                    {isAck ? (
                                                                        <div className="space-y-0.5">
                                                                            <div className="font-medium text-slate-900 flex items-center gap-1">
                                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                                                <span className="break-words [overflow-wrap:anywhere]">
                                                                                    {imp.acknowledgedByUser?.name || "Administrative desk"}
                                                                                </span>
                                                                            </div>
                                                                            {imp.acknowledgedByUser?.email && (
                                                                                <div className="text-[11px] text-slate-500 truncate" title={imp.acknowledgedByUser.email}>
                                                                                    {imp.acknowledgedByUser.email}
                                                                                </div>
                                                                            )}
                                                                            {imp.acknowledgedAt && (
                                                                                <div className="text-[10px] text-slate-500 tabular-nums">
                                                                                    {new Date(imp.acknowledgedAt).toLocaleDateString("en-GB", {
                                                                                        day: "numeric",
                                                                                        month: "short",
                                                                                        year: "numeric",
                                                                                        hour: "2-digit",
                                                                                        minute: "2-digit"
                                                                                    })}
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
                                onClick={() => setSelectedProgram(null)}
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
