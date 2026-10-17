"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    Compass,
    Target,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    Filter,
    Plus,
    X,
    Eye,
    Paperclip,
    ExternalLink,
    RefreshCw,
    Building2,
    Layers,
    MapPin,
    School,
    Shield,
    ChevronLeft,
    ChevronRight,
    Loader2,
    ArrowUpRight,
    Send,
    CheckSquare,
    Check,
    Bell,
    Users
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
    canCreateProgram?: boolean;
    initialProgramId?: string | null;
    initialProgramTitle?: string | null;
}

export default function ProgramsRegistryView({
    tierName = "Administration",
    tierType = "FEDERAL",
    canCreateProgram = true,
    initialProgramId,
    initialProgramTitle
}: ProgramsRegistryViewProps) {
    const searchParams = useSearchParams();
    const targetProgramId = initialProgramId || searchParams?.get("programId") || searchParams?.get("id");
    const targetProgramTitle = initialProgramTitle || searchParams?.get("programTitle");

    const [programs, setPrograms] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Navigation & Filter Mode
    const [activeTab, setActiveTab] = useState<"ALL" | "RECEIVED" | "CREATED" | "ACTIVE" | "COMPLETED">("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [sourceFilter, setSourceFilter] = useState<"ALL" | "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL" | "CREATED" | "RECEIVED">("ALL");
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
    const [pageSize, setPageSize] = useState(9); // 9 for 3-column grid

    const loadPrograms = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchApi("/programs");
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
    }, []);

    const loadProgramDetail = async (id: string) => {
        setDetailLoading(true);
        try {
            const res = await fetchApi(`/programs/${id}`);
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

        // 1. Exact match
        let found = list.find(p => p.name.toLowerCase().trim() === normTitle);
        if (found) return found;

        // 2. Starts with / Prefix match
        found = list.find(p => {
            const normName = p.name.toLowerCase().trim();
            return normName.startsWith(normTitle) || normTitle.startsWith(normName);
        });
        if (found) return found;

        // 3. Substring includes match
        found = list.find(p => {
            const normName = p.name.toLowerCase().trim();
            return normName.includes(normTitle) || normTitle.includes(normName);
        });
        if (found) return found;

        // 4. Token similarity match
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
                // Fetch fresh programs list
                const freshList = await loadPrograms();
                match = matchProgramByTitle(title, freshList);
            }
            if (match) {
                await loadProgramDetail(match.id);
            }
        }
    };

    // Auto-open detail if targetProgramId or targetProgramTitle exists on mount or URL change
    useEffect(() => {
        if (targetProgramId) {
            loadProgramDetail(targetProgramId);
        } else if (targetProgramTitle) {
            openProgramByTitleOrId(null, targetProgramTitle, programs);
        }
    }, [targetProgramId, targetProgramTitle, programs.length]);

    // Real-time custom event listener for in-app notification clicks
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
            const res = await fetchApi(`/programs/${programId}/acknowledge`, {
                method: "POST",
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
            const res = await fetchApi(`/programs/${programId}/implementation-status`, {
                method: "PATCH",
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

    // Tier classifier helper matching Policies & Directives
    const getProgramTier = (p: ProgramItem): "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "SCHOOL" => {
        const orgType = (p.createdOrganization?.type || "").toUpperCase();
        if (orgType === "FEDERAL") return "FEDERAL";
        if (orgType === "REGION") return "REGION";
        if (orgType === "ZONE") return "ZONE";
        if (orgType === "WOREDA") return "WOREDA";
        if (orgType === "SCHOOL") return "SCHOOL";

        const orgName = (p.createdOrganization?.name || "").toLowerCase();
        if (orgName.includes("federal") || orgName.includes("ministry") || orgName.includes("platform") || orgName.includes("national")) return "FEDERAL";
        if (orgName.includes("region") || orgName.includes("bureau")) return "REGION";
        if (orgName.includes("zone") || orgName.includes("department")) return "ZONE";
        if (orgName.includes("woreda") || orgName.includes("district") || orgName.includes("office")) return "WOREDA";
        if (orgName.includes("school")) return "SCHOOL";

        return "FEDERAL";
    };

    // Source level counts matching Policies and Directives
    const federalCount = useMemo(() => programs.filter(p => getProgramTier(p) === "FEDERAL").length, [programs]);
    const regionCount = useMemo(() => programs.filter(p => getProgramTier(p) === "REGION").length, [programs]);
    const zoneCount = useMemo(() => programs.filter(p => getProgramTier(p) === "ZONE").length, [programs]);
    const woredaCount = useMemo(() => programs.filter(p => getProgramTier(p) === "WOREDA").length, [programs]);

    // Filter programs
    const filteredPrograms = useMemo(() => {
        return programs.filter(p => {
            // Pill / Active tab filter
            if (activeTab === "RECEIVED" && p.isCreatedByMe) return false;
            if (activeTab === "CREATED" && !p.isCreatedByMe) return false;
            if (activeTab === "ACTIVE" && p.status !== "ACTIVE" && p.status !== "PUBLISHED") return false;
            if (activeTab === "COMPLETED" && p.status !== "COMPLETED" && p.userImplementation?.status !== "COMPLETED") return false;

            // Source filter dropdown (Upper levels & Hierarchy tiers matching Policies and Directives)
            if (sourceFilter === "FEDERAL") {
                if (getProgramTier(p) !== "FEDERAL") return false;
            } else if (sourceFilter === "REGION") {
                if (getProgramTier(p) !== "REGION") return false;
            } else if (sourceFilter === "ZONE") {
                if (getProgramTier(p) !== "ZONE") return false;
            } else if (sourceFilter === "WOREDA") {
                if (getProgramTier(p) !== "WOREDA") return false;
            } else if (sourceFilter === "SCHOOL") {
                if (getProgramTier(p) !== "SCHOOL") return false;
            } else if (sourceFilter === "CREATED") {
                if (!p.isCreatedByMe) return false;
            } else if (sourceFilter === "RECEIVED") {
                if (p.isCreatedByMe) return false;
            }

            // Priority filter dropdown
            if (priorityFilter !== "ALL" && p.priority !== priorityFilter) return false;

            // Status filter dropdown
            if (statusFilter !== "ALL" && p.status !== statusFilter) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesName = p.name.toLowerCase().includes(q);
                const matchesObj = p.objective?.toLowerCase().includes(q);
                const matchesOrg = p.createdOrganization?.name?.toLowerCase().includes(q);
                const matchesAction = p.requiredAction?.toLowerCase().includes(q);
                if (!matchesName && !matchesObj && !matchesOrg && !matchesAction) return false;
            }

            return true;
        });
    }, [programs, activeTab, sourceFilter, priorityFilter, statusFilter, searchQuery]);

    // Reset pagination on filter change
    useEffect(() => {
        setPage(1);
    }, [activeTab, sourceFilter, priorityFilter, statusFilter, searchQuery, pageSize]);

    // Paginated programs
    const totalPages = Math.max(1, Math.ceil(filteredPrograms.length / pageSize));
    const paginatedPrograms = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredPrograms.slice(start, start + pageSize);
    }, [filteredPrograms, page, pageSize]);

    // Summary metrics
    const metrics = useMemo(() => {
        const total = programs.length;
        const active = programs.filter(p => p.status === "ACTIVE" || p.status === "PUBLISHED").length;
        const pendingSignoff = programs.filter(p => !p.isCreatedByMe && p.userImplementation?.status === "PENDING").length;
        const completed = programs.filter(p => p.status === "COMPLETED" || p.userImplementation?.status === "COMPLETED").length;
        return { total, active, pendingSignoff, completed };
    }, [programs]);

    // Modal tracking implementations filtered
    const modalImplementations = useMemo(() => {
        if (!selectedProgram?.tracking?.implementations) return [];
        return selectedProgram.tracking.implementations.filter(imp => {
            if (trackingStatusFilter !== "ALL" && imp.status !== trackingStatusFilter) return false;
            if (trackingSearch.trim()) {
                const q = trackingSearch.toLowerCase().trim();
                const matchesName = imp.organization?.name?.toLowerCase().includes(q);
                const matchesType = imp.organization?.type?.toLowerCase().includes(q);
                const matchesNotes = imp.notes?.toLowerCase().includes(q);
                if (!matchesName && !matchesType && !matchesNotes) return false;
            }
            return true;
        });
    }, [selectedProgram, trackingStatusFilter, trackingSearch]);

    if (isCreatingProgram || cascadingParentProgram) {
        return (
            <ProgramCreatePublishView
                parentProgram={cascadingParentProgram}
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
        <div className="space-y-6 font-sans">
            {/* Action Toast */}
            {actionToast && (
                <div
                    className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-sm animate-in fade-in ${
                        actionToast.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {actionToast.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{actionToast.text}</span>
                    </div>
                    <button onClick={() => setActionToast(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Metric Overview Cards (Interactive Filters) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    onClick={() => {
                        setActiveTab("ALL");
                        setStatusFilter("ALL");
                    }}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
                        activeTab === "ALL" && statusFilter === "ALL"
                            ? "border-blue-400 ring-2 ring-blue-500/10 shadow-xs"
                            : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Programs
                    </span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Strategic initiatives</span>
                </div>

                <div
                    onClick={() => {
                        setActiveTab("ACTIVE");
                        setStatusFilter("ALL");
                    }}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
                        activeTab === "ACTIVE"
                            ? "border-blue-400 ring-2 ring-blue-500/10 shadow-xs bg-blue-50/20"
                            : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Active Initiatives
                    </span>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.active}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Under execution</span>
                </div>

                <div
                    onClick={() => {
                        setActiveTab("RECEIVED");
                        setStatusFilter("ALL");
                    }}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
                        activeTab === "RECEIVED"
                            ? "border-amber-400 ring-2 ring-amber-500/10 shadow-xs bg-amber-50/20"
                            : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
                        Pending Action / Sign-off
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-2xl font-bold text-amber-800">{metrics.pendingSignoff}</p>
                        {metrics.pendingSignoff > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                Requires Action
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Subordinate desks</span>
                </div>

                <div
                    onClick={() => {
                        setActiveTab("COMPLETED");
                        setStatusFilter("ALL");
                    }}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
                        activeTab === "COMPLETED"
                            ? "border-emerald-400 ring-2 ring-emerald-500/10 shadow-xs bg-emerald-50/20"
                            : "border-slate-200 hover:border-slate-300"
                    }`}
                >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Completed
                    </span>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">{metrics.completed}</p>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">Fully accomplished</span>
                </div>
            </div>

            {/* Programs Registry Main Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Compass className="w-5 h-5 text-blue-600" />
                            <span>National & Regional Programs Registry</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Action-oriented strategic initiatives and execution tracking across the hierarchy.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => loadPrograms()}
                            className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors cursor-pointer"
                            title="Refresh Programs"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
                        </button>

                        {canCreateProgram && (
                            <button
                                onClick={() => setIsCreatingProgram(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Issue Program / Initiative</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter and Tab Toolbar (Clean Dropdown Style matching Federal Policies & Directives) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search program, objective, action..."
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

                        {/* Source Filter Dropdown (matching Policies & Directives upper levels) */}
                        <div className="w-full sm:w-48">
                            <select
                                value={sourceFilter}
                                onChange={e => setSourceFilter(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                            >
                                <option value="ALL">All Sources ({programs.length})</option>
                                <option value="FEDERAL">Federal Ministry ({federalCount})</option>
                                {(tierType === "REGION" || tierType === "ZONE" || tierType === "WOREDA" || tierType === "SCHOOL" || regionCount > 0) && (
                                    <option value="REGION">Regional Bureau ({regionCount})</option>
                                )}
                                {(tierType === "ZONE" || tierType === "WOREDA" || tierType === "SCHOOL" || zoneCount > 0) && (
                                    <option value="ZONE">Zonal Dept ({zoneCount})</option>
                                )}
                                {(tierType === "WOREDA" || tierType === "SCHOOL" || woredaCount > 0) && (
                                    <option value="WOREDA">Woreda Office ({woredaCount})</option>
                                )}
                            </select>
                        </div>

                        {/* Priority Filter Dropdown */}
                        <div className="w-full sm:w-36">
                            <select
                                value={priorityFilter}
                                onChange={e => setPriorityFilter(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                            >
                                <option value="ALL">All Priorities</option>
                                <option value="CRITICAL">Critical</option>
                                <option value="URGENT">Urgent</option>
                                <option value="HIGH">High</option>
                                <option value="NORMAL">Normal</option>
                                <option value="LOW">Low</option>
                            </select>
                        </div>

                        {/* Status Filter Dropdown */}
                        <div className="w-full sm:w-36">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="PUBLISHED">Published</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CLOSED">Closed</option>
                                <option value="DRAFT">Draft</option>
                            </select>
                        </div>

                        {/* Reset Filter Button */}
                        {(searchQuery || sourceFilter !== "ALL" || priorityFilter !== "ALL" || statusFilter !== "ALL" || activeTab !== "ALL") && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setSourceFilter("ALL");
                                    setPriorityFilter("ALL");
                                    setStatusFilter("ALL");
                                    setActiveTab("ALL");
                                }}
                                className="px-2.5 py-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                                title="Reset all filters"
                            >
                                <X className="w-3.5 h-3.5" />
                                <span>Reset</span>
                            </button>
                        )}
                    </div>

                    {/* Source Tab Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-medium text-slate-600 self-start lg:self-auto">
                        <button
                            onClick={() => setActiveTab("ALL")}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                activeTab === "ALL" ? "bg-white text-slate-900 font-bold shadow-xs" : "hover:text-slate-900"
                            }`}
                        >
                            All ({programs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("RECEIVED")}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                activeTab === "RECEIVED" ? "bg-white text-slate-900 font-bold shadow-xs" : "hover:text-slate-900"
                            }`}
                        >
                            Received ({programs.filter(p => !p.isCreatedByMe).length})
                        </button>
                        <button
                            onClick={() => setActiveTab("CREATED")}
                            className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                activeTab === "CREATED" ? "bg-white text-slate-900 font-bold shadow-xs" : "hover:text-slate-900"
                            }`}
                        >
                            Created ({programs.filter(p => p.isCreatedByMe).length})
                        </button>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="py-20 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        <span className="text-xs font-medium">Loading strategic initiatives & programs...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredPrograms.length === 0 && (
                    <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6 space-y-3">
                        <Compass className="w-10 h-10 mx-auto text-slate-300" />
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">No programs found</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                                No initiatives match the selected filter criteria or search query.
                            </p>
                        </div>
                        {canCreateProgram && (
                            <button
                                onClick={() => setIsCreatingProgram(true)}
                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create New Initiative</span>
                            </button>
                        )}
                    </div>
                )}

                {/* Card Grid View (Simple Text Rectangle Card with Hover) */}
                {!loading && filteredPrograms.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedPrograms.map(item => {
                            const isRecipient = !item.isCreatedByMe;
                            const impStatus = item.userImplementation?.status || "PENDING";
                            const isAck = item.userImplementation?.isAcknowledged || false;

                            const isNational = Boolean(item.targetLevelAll && (!item.targetLevels || item.targetLevels.length === 0));
                            const targetUnitsCount = item.totalRecipients || 0;

                            const isFederalCreator = item.createdOrganization?.type === "FEDERAL";

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => loadProgramDetail(item.id)}
                                    className="group relative rounded-xl border border-slate-200 p-4 bg-white flex flex-col justify-between transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-blue-400"
                                >
                                    <div>
                                        {/* Top Row Badges: Scope / Authority, Status & Priority */}
                                        <div className="flex items-center justify-between gap-1.5 mb-2.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {/* Scope / Authority Badge */}
                                                {isFederalCreator ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white flex items-center gap-1 shrink-0">
                                                        <Building2 className="w-2.5 h-2.5 text-blue-400" />
                                                        <span>Federal</span>
                                                    </span>
                                                ) : isNational ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                                                        National
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                                        {item.createdOrganization?.type || "Initiative"}
                                                    </span>
                                                )}

                                                {/* Status Badge */}
                                                <span
                                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase border ${
                                                        item.status === "ACTIVE"
                                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                                            : item.status === "COMPLETED"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : item.status === "PUBLISHED"
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : item.status === "CLOSED"
                                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                                    }`}
                                                >
                                                    {item.status}
                                                </span>
                                            </div>

                                            {/* Priority & Attachment Indicator */}
                                            <div className="flex items-center gap-1 shrink-0">
                                                {item.priority === "CRITICAL" || item.priority === "URGENT" ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                                                        {item.priority}
                                                    </span>
                                                ) : item.priority === "HIGH" ? (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                        HIGH
                                                    </span>
                                                ) : null}

                                                {item.attachmentUrl && (
                                                    <span title="Has attachment" className="p-0.5 text-slate-400">
                                                        <Paperclip className="w-3 h-3" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Program Name - 2 lines clamp */}
                                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-1">
                                            {item.name}
                                        </h4>

                                        {/* Objective Snippet */}
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2.5">
                                            {item.objective || item.description}
                                        </p>

                                        {/* Cascaded Parent Tag if applicable */}
                                        {item.parentProgram && (
                                            <div className="text-[10px] text-blue-600 font-semibold flex items-center gap-1 mb-2">
                                                <Target className="w-2.5 h-2.5" />
                                                <span className="truncate">Cascaded: {item.parentProgram.name}</span>
                                            </div>
                                        )}

                                        {/* Issuing Desk Metadata */}
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 truncate">
                                            <span>Issued by</span>
                                            <span className="font-semibold text-slate-700 truncate">
                                                {item.createdOrganization?.name || "Official Ministry"}
                                            </span>
                                            <span>•</span>
                                            <span>{item.isCreatedByMe ? "Created by Us" : "Incoming"}</span>
                                        </div>
                                    </div>

                                    {/* Card Footer: Timeline & Compliance/Execution Status */}
                                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 shrink-0">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span>
                                                Due {new Date(item.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                            </span>
                                        </div>

                                        <div className="shrink-0">
                                            {isRecipient ? (
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide inline-flex items-center gap-1 ${
                                                        impStatus === "COMPLETED"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : impStatus === "IN_PROGRESS"
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : impStatus === "ACKNOWLEDGED"
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : impStatus === "BLOCKED"
                                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    }`}
                                                >
                                                    {impStatus === "COMPLETED" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                                    <span>{impStatus === "IN_PROGRESS" ? "IN PROGRESS" : impStatus.replace("_", " ")}</span>
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                                    <span>
                                                        {item.completedCount || 0}/{item.totalRecipients || 0} completed
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Clean Pagination Footer */}
                {filteredPrograms.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-3">
                            <span>
                                Showing{" "}
                                <strong className="text-slate-800">
                                    {(page - 1) * pageSize + 1}
                                </strong>{" "}
                                to{" "}
                                <strong className="text-slate-800">
                                    {Math.min(page * pageSize, filteredPrograms.length)}
                                </strong>{" "}
                                of{" "}
                                <strong className="text-slate-800">{filteredPrograms.length}</strong> initiatives
                            </span>

                            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                <span className="text-[11px] text-slate-400">Cards per page:</span>
                                <select
                                    value={pageSize}
                                    onChange={e => setPageSize(Number(e.target.value))}
                                    className="px-1.5 py-0.5 border border-slate-200 rounded text-xs font-medium text-slate-700 bg-white focus:outline-none cursor-pointer"
                                >
                                    <option value={6}>6</option>
                                    <option value={9}>9</option>
                                    <option value={18}>18</option>
                                    <option value={30}>30</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page === 1}
                                className={`p-1.5 rounded-lg border border-slate-200 transition-colors ${
                                    page === 1
                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                                }`}
                                title="Previous page"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => {
                                    if (totalPages <= 5) return true;
                                    if (p === 1 || p === totalPages) return true;
                                    return Math.abs(p - page) <= 1;
                                })
                                .map((p, idx, arr) => {
                                    const prevP = arr[idx - 1];
                                    return (
                                        <div key={p} className="flex items-center">
                                            {prevP && p - prevP > 1 && (
                                                <span className="px-1 text-slate-400 text-xs">...</span>
                                            )}
                                            <button
                                                onClick={() => setPage(p)}
                                                className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                                    page === p
                                                        ? "bg-blue-600 text-white shadow-2xs"
                                                        : "text-slate-600 hover:bg-slate-100"
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        </div>
                                    );
                                })}

                            <button
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page === totalPages}
                                className={`p-1.5 rounded-lg border border-slate-200 transition-colors ${
                                    page === totalPages
                                        ? "text-slate-300 border-slate-100 cursor-not-allowed"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
                                }`}
                                title="Next page"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* SLIDE-OVER DETAIL DRAWER (Right-Hand Panel) */}
            {selectedProgram && (
                <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
                        onClick={() => setSelectedProgram(null)}
                    />

                    {/* Right-Hand Drawer Panel */}
                    <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200 border-l border-slate-200">
                        {/* Drawer Header */}
                        <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-white text-slate-800 border border-slate-200 shadow-2xs">
                                    <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>{selectedProgram.createdOrganization?.name || "Issuing Authority"}</span>
                                </span>

                                <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                                        selectedProgram.status === "ACTIVE"
                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                            : selectedProgram.status === "COMPLETED"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                    }`}
                                >
                                    {selectedProgram.status}
                                </span>

                                <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        selectedProgram.priority === "CRITICAL" || selectedProgram.priority === "URGENT"
                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                            : selectedProgram.priority === "HIGH"
                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                            : "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                    {selectedProgram.priority} PRIORITY
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedProgram(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                                title="Close Panel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Scrollable Body */}
                        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
                            {/* Title & Cascaded info */}
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 leading-snug">
                                    {selectedProgram.name}
                                </h3>
                                {selectedProgram.parentProgram && (
                                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-blue-700 font-semibold bg-blue-50/70 p-2 rounded-lg border border-blue-200">
                                        <Target className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        <span>Cascaded from Higher Level: {selectedProgram.parentProgram.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Key Metadata Grid */}
                            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Start Date</span>
                                    <span className="font-semibold text-slate-800">
                                        {new Date(selectedProgram.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Execution Deadline</span>
                                    <span className="font-semibold text-rose-600">
                                        {new Date(selectedProgram.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Target Level / Scope</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedProgram.targetLevelAll ? "All Subordinate Tiers" : selectedProgram.targetLevels?.join(", ") || "Targeted Units"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-[11px] block">Cascade Mode</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedProgram.cascadeDescendants ? "Cascades to Subordinates" : "Direct Units Only"}
                                    </span>
                                </div>
                            </div>

                            {/* In-App Notification Dispatch Banner */}
                            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2.5 text-blue-900 font-semibold">
                                    <Bell className="w-4 h-4 text-blue-600 shrink-0" />
                                    <span>Program Dispatch Status: <strong className="text-blue-950 font-bold">Active Across Hierarchy</strong></span>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white shadow-2xs">
                                    Live on Recipient Desks
                                </span>
                            </div>

                            {/* Strategic Objective Card */}
                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Strategic Objective</span>
                                </div>
                                <div className="text-xs sm:text-sm text-slate-800 bg-blue-50/30 p-4 rounded-xl border border-blue-100 leading-relaxed font-sans">
                                    {selectedProgram.objective}
                                </div>
                            </div>

                            {/* Scope & Description */}
                            {selectedProgram.description && (
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Scope & Description
                                    </div>
                                    <div className="text-xs sm:text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                                        {selectedProgram.description}
                                    </div>
                                </div>
                            )}

                            {/* Required Action */}
                            {selectedProgram.requiredAction && (
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Required Implementation Action
                                    </div>
                                    <div className="text-xs sm:text-sm text-slate-900 font-medium bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed">
                                        {selectedProgram.requiredAction}
                                    </div>
                                </div>
                            )}

                            {/* Implementation Instructions */}
                            {selectedProgram.instructions && (
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                        Official Implementation Instructions
                                    </div>
                                    <div className="text-xs text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                                        {selectedProgram.instructions}
                                    </div>
                                </div>
                            )}

                            {/* Attached Guidelines / Media */}
                            {selectedProgram.attachmentUrl && (
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Guideline Attachment: {selectedProgram.attachmentName || "Supporting Document"}</span>
                                        </span>
                                        <a
                                            href={selectedProgram.attachmentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-xs flex items-center gap-1 font-semibold"
                                        >
                                            <ArrowUpRight className="w-3 h-3" />
                                            <span>Open Original</span>
                                        </a>
                                    </div>

                                    {selectedProgram.attachmentUrl.includes("image") ||
                                    selectedProgram.attachmentUrl.includes("images.unsplash.com") ||
                                    /\.(jpg|jpeg|png|gif|webp|svg|avif)($|\?)/i.test(selectedProgram.attachmentUrl) ? (
                                        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={selectedProgram.attachmentUrl}
                                                alt={selectedProgram.attachmentName || "Attachment"}
                                                className="w-full max-h-[300px] object-contain rounded-lg"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                                            <div className="flex items-center gap-2 font-semibold text-slate-800">
                                                <Paperclip className="w-4 h-4 text-slate-500" />
                                                <span>{selectedProgram.attachmentName || "Official Guideline Document"}</span>
                                            </div>
                                            <a
                                                href={selectedProgram.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs"
                                            >
                                                <ArrowUpRight className="w-3 h-3" />
                                                <span>Download Document</span>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* RECIPIENT EXECUTION PANEL (For recipient desks) */}
                            {!selectedProgram.isCreatedByMe && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                    <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                                        <span>Your Desk Execution Status</span>
                                        <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                selectedProgram.userImplementation?.status === "COMPLETED"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : selectedProgram.userImplementation?.status === "IN_PROGRESS"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : "bg-amber-100 text-amber-800"
                                            }`}
                                        >
                                            {selectedProgram.userImplementation?.status?.replace("_", " ") || "PENDING"}
                                        </span>
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                                Update Execution Status
                                            </label>
                                            <select
                                                value={actionStatus}
                                                onChange={e => setActionStatus(e.target.value)}
                                                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 cursor-pointer"
                                            >
                                                <option value="ACKNOWLEDGED">Acknowledged / Reviewed</option>
                                                <option value="IN_PROGRESS">In Progress (Execution Started)</option>
                                                <option value="COMPLETED">Completed (Action Fulfilled)</option>
                                                <option value="BLOCKED">Blocked / Hindered</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                                                Implementation Remarks / Action Report
                                            </label>
                                            <input
                                                type="text"
                                                value={actionNotes}
                                                onChange={e => setActionNotes(e.target.value)}
                                                placeholder="e.g. Action completed and recorded."
                                                className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                                        {!selectedProgram.userImplementation?.isAcknowledged ? (
                                            <button
                                                onClick={() => handleAcknowledge(selectedProgram.id)}
                                                disabled={submittingAction}
                                                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5" />
                                                <span>Acknowledge Receipt</span>
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Acknowledged on {new Date(selectedProgram.userImplementation.acknowledgedAt || "").toLocaleDateString()}</span>
                                            </span>
                                        )}

                                        <button
                                            onClick={() => handleUpdateImplementationStatus(selectedProgram.id)}
                                            disabled={submittingAction}
                                            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                                        >
                                            {submittingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                            <span>Update Execution Progress</span>
                                        </button>
                                    </div>

                                    {/* Cascade Subordinate Initiative Option (for intermediate tiers) */}
                                    {tierType !== "SCHOOL" && (
                                        <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
                                            <span className="text-[11px] text-slate-500">
                                                Need to localize instructions for lower tiers?
                                            </span>
                                            <button
                                                onClick={() => {
                                                    const parent = selectedProgram;
                                                    setSelectedProgram(null);
                                                    setCascadingParentProgram(parent);
                                                }}
                                                className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                                            >
                                                <Plus className="w-3 h-3" />
                                                <span>Cascade Subordinate Initiative</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SUBORDINATE DELIVERY & IMPLEMENTATION TRACKING (For creator) */}
                            {selectedProgram.isCreatedByMe && selectedProgram.tracking && (
                                <div className="space-y-3 pt-2 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                            Jurisdiction Delivery & Implementation Tracking
                                        </h4>
                                        <span className="text-xs font-bold text-blue-700">
                                            {selectedProgram.tracking.completedCount} / {selectedProgram.tracking.totalRecipients} Completed ({selectedProgram.tracking.totalRecipients > 0 ? Math.round((selectedProgram.tracking.completedCount / selectedProgram.tracking.totalRecipients) * 100) : 0}%)
                                        </span>
                                    </div>

                                    {/* Brand Blue Progress Bar */}
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${selectedProgram.tracking.totalRecipients > 0 ? Math.round((selectedProgram.tracking.completedCount / selectedProgram.tracking.totalRecipients) * 100) : 0}%`
                                            }}
                                        />
                                    </div>

                                    {/* Metric Chips */}
                                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Units</span>
                                            <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedProgram.tracking.totalRecipients}</p>
                                        </div>
                                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Acknowledged</span>
                                            <p className="text-sm font-bold text-blue-700 mt-0.5">{selectedProgram.tracking.acknowledgedCount}</p>
                                        </div>
                                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">In Progress</span>
                                            <p className="text-sm font-bold text-amber-700 mt-0.5">{selectedProgram.tracking.inProgressCount}</p>
                                        </div>
                                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Completed</span>
                                            <p className="text-sm font-bold text-emerald-700 mt-0.5">{selectedProgram.tracking.completedCount}</p>
                                        </div>
                                    </div>

                                    {/* Search & Filter inside tracking */}
                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        <div className="relative flex-1 max-w-xs">
                                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                                            <input
                                                type="text"
                                                value={trackingSearch}
                                                onChange={e => setTrackingSearch(e.target.value)}
                                                placeholder="Search recipient unit or remarks..."
                                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none text-slate-800"
                                            />
                                        </div>

                                        <select
                                            value={trackingStatusFilter}
                                            onChange={e => setTrackingStatusFilter(e.target.value)}
                                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white cursor-pointer"
                                        >
                                            <option value="ALL">All Statuses</option>
                                            <option value="PENDING">Pending</option>
                                            <option value="ACKNOWLEDGED">Acknowledged</option>
                                            <option value="IN_PROGRESS">In Progress</option>
                                            <option value="COMPLETED">Completed</option>
                                        </select>
                                    </div>

                                    {/* Tracking Table */}
                                    <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px] sticky top-0">
                                                <tr>
                                                    <th className="py-2.5 px-3">Jurisdiction</th>
                                                    <th className="py-2.5 px-3">Tier</th>
                                                    <th className="py-2.5 px-3">Execution Status</th>
                                                    <th className="py-2.5 px-3">Ack Date</th>
                                                    <th className="py-2.5 px-3">Remarks / Report</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                                                {modalImplementations.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-6 text-center text-slate-400">
                                                            No recipient units match the tracking filter.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    modalImplementations.map(imp => (
                                                        <tr key={imp.id} className="hover:bg-slate-50">
                                                            <td className="py-2.5 px-3 font-bold text-slate-900">
                                                                {imp.organization.name}
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                                                    {imp.organization.type}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide inline-block ${
                                                                        imp.status === "COMPLETED"
                                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                            : imp.status === "IN_PROGRESS"
                                                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                            : imp.status === "ACKNOWLEDGED"
                                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                                            : imp.status === "BLOCKED"
                                                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                                                    }`}
                                                                >
                                                                    {imp.status === "IN_PROGRESS" ? "IN PROGRESS" : imp.status.replace("_", " ")}
                                                                </span>
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                                                {imp.acknowledgedAt
                                                                    ? new Date(imp.acknowledgedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                                                    : "—"}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[200px] truncate" title={imp.notes || ""}>
                                                                {imp.notes || "—"}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                            <span className="text-xs text-slate-400 font-medium">
                                National & Regional Governance Desk
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedProgram(null)}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                            >
                                Close Panel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
