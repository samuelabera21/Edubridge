"use client";

import { useState, useEffect, useMemo } from "react";
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
    Check
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
}

export default function ProgramsRegistryView({
    tierName = "Administration",
    tierType = "FEDERAL",
    canCreateProgram = true
}: ProgramsRegistryViewProps) {
    const [programs, setPrograms] = useState<ProgramItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Navigation & View Mode
    const [activeTab, setActiveTab] = useState<"ALL" | "RECEIVED" | "CREATED" | "ACTIVE" | "COMPLETED">("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [isCreatingProgram, setIsCreatingProgram] = useState(false);
    const [cascadingParentProgram, setCascadingParentProgram] = useState<ProgramItem | null>(null);

    // Detail Modal
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
    const [pageSize, setPageSize] = useState(10);

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
            setPrograms(data.data || []);
        } catch (err: any) {
            setError(err.message || "Failed to load programs");
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
            await loadProgramDetail(programId);
            await loadPrograms();
        } catch (err: any) {
            setActionToast({ type: "error", text: err.message || "Status update failed." });
        } finally {
            setSubmittingAction(false);
        }
    };

    // Filter programs
    const filteredPrograms = useMemo(() => {
        return programs.filter(p => {
            // Tab filter
            if (activeTab === "RECEIVED" && p.isCreatedByMe) return false;
            if (activeTab === "CREATED" && !p.isCreatedByMe) return false;
            if (activeTab === "ACTIVE" && p.status !== "ACTIVE" && p.status !== "PUBLISHED") return false;
            if (activeTab === "COMPLETED" && p.status !== "COMPLETED" && p.userImplementation?.status !== "COMPLETED") return false;

            // Priority filter
            if (priorityFilter !== "ALL" && p.priority !== priorityFilter) return false;

            // Status filter
            if (statusFilter !== "ALL" && p.status !== statusFilter) return false;

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesName = p.name.toLowerCase().includes(q);
                const matchesObj = p.objective.toLowerCase().includes(q);
                const matchesOrg = p.createdOrganization?.name?.toLowerCase().includes(q);
                const matchesAction = p.requiredAction?.toLowerCase().includes(q);
                if (!matchesName && !matchesObj && !matchesOrg && !matchesAction) return false;
            }

            return true;
        });
    }, [programs, activeTab, priorityFilter, statusFilter, searchQuery]);

    // Reset pagination on filter change
    useEffect(() => {
        setPage(1);
    }, [activeTab, priorityFilter, statusFilter, searchQuery, pageSize]);

    // Paginated programs
    const totalPages = Math.max(1, Math.ceil(filteredPrograms.length / pageSize));
    const paginatedPrograms = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredPrograms.slice(start, start + pageSize);
    }, [filteredPrograms, page, pageSize]);

    // Summary counters
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

            {/* Metric Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Programs
                    </span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Active Initiatives
                    </span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.active}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Pending Action / Sign-off
                    </span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.pendingSignoff}</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Completed
                    </span>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.completed}</p>
                </div>
            </div>

            {/* Programs Registry Main Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Compass className="w-4 h-4 text-slate-700" />
                            <span>National & Regional Programs Registry</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Action-oriented strategic initiatives and execution tracking across the hierarchy.
                        </p>
                    </div>

                    {canCreateProgram && (
                        <button
                            onClick={() => setIsCreatingProgram(true)}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Issue Program / Initiative</span>
                        </button>
                    )}
                </div>

                {/* Filter and Tab Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        <div className="relative min-w-[220px] flex-1 max-w-sm">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search program, objective, action..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 placeholder-slate-400"
                            />
                        </div>

                        <select
                            value={priorityFilter}
                            onChange={e => setPriorityFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none cursor-pointer"
                        >
                            <option value="ALL">All Priorities</option>
                            <option value="LOW">Low</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                            <option value="CRITICAL">Critical</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="CLOSED">Closed</option>
                            <option value="DRAFT">Draft</option>
                        </select>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-medium text-slate-600">
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

                {/* Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th className="py-2.5 px-3.5">Program & Objective</th>
                                <th className="py-2.5 px-3">Issuing Authority</th>
                                <th className="py-2.5 px-3">Program Status</th>
                                <th className="py-2.5 px-3">Priority</th>
                                <th className="py-2.5 px-3">Deadline</th>
                                <th className="py-2.5 px-3">Implementation Status</th>
                                <th className="py-2.5 px-3.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-slate-400">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
                                            <span>Loading programs...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPrograms.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center text-slate-400">
                                        No programs or initiatives found for the selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedPrograms.map(item => {
                                    const isRecipient = !item.isCreatedByMe;
                                    const impStatus = item.userImplementation?.status || "PENDING";
                                    const isAck = item.userImplementation?.isAcknowledged || false;

                                    return (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                                            onClick={() => loadProgramDetail(item.id)}
                                        >
                                            <td className="py-3 px-3.5">
                                                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                                    <span>{item.name}</span>
                                                    {item.attachmentUrl && (
                                                        <Paperclip className="w-3 h-3 text-slate-400" />
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                                    {item.objective}
                                                </p>
                                                {item.parentProgram && (
                                                    <span className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5">
                                                        <Target className="w-2.5 h-2.5" />
                                                        <span>Cascaded from: {item.parentProgram.name}</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">
                                                <span className="font-medium text-slate-800 block">
                                                    {item.createdOrganization?.name || "Official Authority"}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {item.isCreatedByMe ? "Created by Us" : "Incoming Initiative"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                                                        item.status === "ACTIVE"
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                            : item.status === "COMPLETED"
                                                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                                                            : item.status === "PUBLISHED"
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : item.status === "CLOSED"
                                                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                            : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    }`}
                                                >
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                                        item.priority === "CRITICAL" || item.priority === "URGENT"
                                                            ? "bg-slate-900 text-white"
                                                            : item.priority === "HIGH"
                                                            ? "bg-slate-200 text-slate-800"
                                                            : "bg-slate-100 text-slate-600"
                                                    }`}
                                                >
                                                    {item.priority}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">
                                                <div>
                                                    {new Date(item.endDate).toLocaleDateString("en-US", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric"
                                                    })}
                                                </div>
                                                <span className="text-[10px] text-slate-400">
                                                    Starts: {new Date(item.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                {isRecipient ? (
                                                    <div className="space-y-0.5">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide inline-block ${
                                                                impStatus === "COMPLETED"
                                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                    : impStatus === "IN_PROGRESS"
                                                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                    : impStatus === "ACKNOWLEDGED"
                                                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                                    : impStatus === "BLOCKED"
                                                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                                            }`}
                                                        >
                                                            {impStatus === "IN_PROGRESS" ? "IN PROGRESS" : impStatus.replace("_", " ")}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 block font-normal">
                                                            {isAck ? "Acknowledged" : "Action Required"}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1 min-w-[140px]">
                                                        {item.totalRecipients === 1 && item.implementations && item.implementations.length > 0 ? (
                                                            (() => {
                                                                const singleImp = item.implementations[0];
                                                                const singleStatus = singleImp.status;
                                                                const recipientName = singleImp.organization?.name || "1 Target Unit";
                                                                return (
                                                                    <div>
                                                                        <span
                                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide inline-block ${
                                                                                singleStatus === "COMPLETED"
                                                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                                    : singleStatus === "IN_PROGRESS"
                                                                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                                    : singleStatus === "ACKNOWLEDGED"
                                                                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                                                    : singleStatus === "BLOCKED"
                                                                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                                                            }`}
                                                                        >
                                                                            {singleStatus === "IN_PROGRESS" ? "IN PROGRESS" : singleStatus.replace("_", " ")}
                                                                        </span>
                                                                        <span className="text-[10px] text-slate-500 block truncate max-w-[160px] mt-0.5 font-medium" title={recipientName}>
                                                                            {recipientName}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                                                    {item.completedCount && item.completedCount > 0 ? (
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                            {item.completedCount} Done
                                                                        </span>
                                                                    ) : null}
                                                                    {item.inProgressCount && item.inProgressCount > 0 ? (
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                                            {item.inProgressCount} In Progress
                                                                        </span>
                                                                    ) : null}
                                                                    {item.acknowledgedCount && item.acknowledgedCount > 0 && !(item.inProgressCount || item.completedCount) ? (
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                                            {item.acknowledgedCount} Ack
                                                                        </span>
                                                                    ) : null}
                                                                    {(!item.completedCount && !item.inProgressCount && !item.acknowledgedCount) ? (
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                                            Pending ({item.totalRecipients || 0})
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                                                    <span>{item.completedCount || 0}/{item.totalRecipients || 0} completed</span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-slate-800 rounded-full"
                                                                        style={{
                                                                            width: `${
                                                                                item.totalRecipients && item.totalRecipients > 0
                                                                                    ? Math.round(((item.completedCount || 0) / item.totalRecipients) * 100)
                                                                                    : 0
                                                                            }%`
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-3.5 text-right" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => loadProgramDetail(item.id)}
                                                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                                >
                                                    <Eye className="w-3 h-3 text-slate-500" />
                                                    <span>{isRecipient ? "Execute" : "Track"}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                {filteredPrograms.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
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
                                <strong className="text-slate-800">{filteredPrograms.length}</strong> programs
                            </span>

                            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                <span className="text-[11px] text-slate-400">Rows per page:</span>
                                <select
                                    value={pageSize}
                                    onChange={e => setPageSize(Number(e.target.value))}
                                    className="px-1.5 py-0.5 border border-slate-200 rounded text-xs font-medium text-slate-700 bg-white focus:outline-none cursor-pointer"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
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
                                                        ? "bg-slate-900 text-white"
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

            {/* DETAIL MODAL */}
            {selectedProgram && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                                            selectedProgram.status === "ACTIVE"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : selectedProgram.status === "COMPLETED"
                                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                                : "bg-blue-50 text-blue-700 border border-blue-200"
                                        }`}
                                    >
                                        {selectedProgram.status}
                                    </span>

                                    <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                            selectedProgram.priority === "CRITICAL" || selectedProgram.priority === "URGENT"
                                                ? "bg-slate-900 text-white"
                                                : "bg-slate-100 text-slate-800"
                                        }`}
                                    >
                                        {selectedProgram.priority} PRIORITY
                                    </span>

                                    <span className="text-xs text-slate-500 font-medium">
                                        Deadline: {new Date(selectedProgram.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-900">
                                    {selectedProgram.name}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Issued by: <strong>{selectedProgram.createdOrganization?.name || "Official Ministry"}</strong>
                                    {selectedProgram.isCreatedByMe && " (Created by your organization)"}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedProgram(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Objectives & Scope */}
                        <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2 text-xs">
                            <div>
                                <span className="font-bold text-slate-800 block">Objective:</span>
                                <p className="text-slate-600">{selectedProgram.objective}</p>
                            </div>
                            <div className="pt-1">
                                <span className="font-bold text-slate-800 block">Summary / Scope:</span>
                                <p className="text-slate-600 whitespace-pre-wrap">{selectedProgram.description}</p>
                            </div>
                            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-2">
                                <span className="text-slate-700">
                                    <strong>Required Action:</strong> {selectedProgram.requiredAction}
                                </span>
                                {selectedProgram.attachmentUrl && (
                                    <a
                                        href={selectedProgram.attachmentUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline"
                                    >
                                        <Paperclip className="w-3 h-3" />
                                        <span>View Guideline Attachment</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Instructions */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wider text-slate-400">
                                Implementation Instructions
                            </h4>
                            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                                {selectedProgram.instructions}
                            </div>
                        </div>

                        {/* RECIPIENT EXECUTION PANEL (Only shown for recipient organizations) */}
                        {!selectedProgram.isCreatedByMe && (
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                                <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                                    <span>Your Organization Execution Status</span>
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
                                            placeholder="e.g. Assessment completed and documented."
                                            className="w-full p-2 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
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
                                            Need to localize instructions for your lower tiers?
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

                        {/* ISSUING AUTHORITY TRACKING PANEL (Only shown for issuer) */}
                        {selectedProgram.isCreatedByMe && (
                            <div className="space-y-3 pt-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">
                                            Subordinate Delivery & Implementation Tracking
                                        </h4>
                                        <p className="text-[11px] text-slate-500">
                                            Real-time sign-offs and execution reports from subordinate institutions.
                                        </p>
                                    </div>
                                    {selectedProgram.tracking && (
                                        <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                                            {selectedProgram.tracking.completedCount}/{selectedProgram.tracking.totalRecipients} completed
                                        </span>
                                    )}
                                </div>

                                {/* Tracking Summary Metrics */}
                                {selectedProgram.tracking && (
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
                                )}

                                {/* Search & Filter Bar inside tracking */}
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
                                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white cursor-pointer"
                                    >
                                        <option value="ALL">All Statuses</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="ACKNOWLEDGED">Acknowledged</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>

                                {/* Table of implementations */}
                                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase">
                                            <tr>
                                                <th className="py-2 px-3">Organization</th>
                                                <th className="py-2 px-3">Tier</th>
                                                <th className="py-2 px-3">Execution Status</th>
                                                <th className="py-2 px-3">Ack Date</th>
                                                <th className="py-2 px-3">Remarks / Report</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-700">
                                            {modalImplementations.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="py-6 text-center text-slate-400">
                                                        No recipient units match the tracking filter.
                                                    </td>
                                                </tr>
                                            ) : (
                                                modalImplementations.map(imp => (
                                                    <tr key={imp.id} className="hover:bg-slate-50/70">
                                                        <td className="py-2 px-3 font-semibold text-slate-900">
                                                            {imp.organization.name}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-500 text-[10px] uppercase">
                                                            {imp.organization.type}
                                                        </td>
                                                        <td className="py-2 px-3">
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
                                                        <td className="py-2 px-3 text-slate-500 text-[11px]">
                                                            {imp.acknowledgedAt
                                                                ? new Date(imp.acknowledgedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                                                : "—"}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-600 text-[11px] max-w-[200px] truncate" title={imp.notes || ""}>
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

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedProgram(null)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
