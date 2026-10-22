"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
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
    CheckCircle2,
    Clock,
    FileText,
    LayoutList,
    LayoutGrid,
    Filter,
    Users,
    Trash2,
    Edit2,
    ExternalLink
} from "lucide-react";
import SchoolAnnouncementPublishView from "@/components/communication/SchoolAnnouncementPublishView";

export interface AnnouncementItem {
    id: string;
    title: string;
    content: string;
    target: string;
    targetId?: string | null;
    targetDetails?: any;
    priority?: string;
    status?: string;
    createdAt: string;
    updatedAt?: string;
    expiresAt?: string | null;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    author?: {
        id: string;
        name: string;
        email?: string;
    } | null;
    acknowledgments?: Array<{
        id: string;
        userId: string;
        recipientName?: string;
        recipientIdentifier?: string;
        recipientType?: string;
        isRead: boolean;
        readAt?: string | null;
        isAcknowledged: boolean;
        acknowledgedAt?: string | null;
        acknowledgmentNotes?: string | null;
        user?: { name: string; email: string };
    }>;
}

function isImageUrl(url?: string | null, name?: string | null): boolean {
    if (!url && !name) return false;
    const testStr = `${name || ""} ${url || ""}`.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|svg|avif)($|\?)/i.test(testStr) || testStr.includes("image") || testStr.startsWith("data:image/");
}

function isPdfUrl(url?: string | null, name?: string | null): boolean {
    if (!url && !name) return false;
    const testStr = `${name || ""} ${url || ""}`.toLowerCase();
    return /\.pdf($|\?)/i.test(testStr) || testStr.includes("application/pdf");
}

export default function SchoolAnnouncementsPage() {
    const { authData } = useAuth(false);
    const searchParams = useSearchParams();

    // Data State
    const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Selected Announcement & Drawer
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusReport, setStatusReport] = useState<any | null>(null);
    const [trackingSearch, setTrackingSearch] = useState("");
    const [trackingStatusFilter, setTrackingStatusFilter] = useState<"ALL" | "ACKNOWLEDGED" | "PENDING">("ALL");
    const [trackingRoleFilter, setTrackingRoleFilter] = useState<"ALL" | "TEACHER" | "STUDENT" | "PARENT">("ALL");

    // View & Creation State
    const [viewMode, setViewMode] = useState<"table" | "cards">("table");
    const [isPublishing, setIsPublishing] = useState(false);

    // Filter Toolbar State
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [audienceFilter, setAudienceFilter] = useState<"ALL" | "ALL_SCHOOL" | "TEACHERS" | "STUDENTS" | "PARENTS">("ALL");
    const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 12;

    // Full screen Lightbox
    const [previewMedia, setPreviewMedia] = useState<{ url: string; isPdf?: boolean; name?: string } | null>(null);

    // Edit modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
    const [editForm, setEditForm] = useState({
        title: "",
        content: "",
        attachmentUrl: "",
        attachmentName: ""
    });
    const [submittingEdit, setSubmittingEdit] = useState(false);

    // Load Data
    const loadAnnouncements = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchApi("/communication/announcements");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(Array.isArray(data) ? data : []);
            } else {
                setAnnouncements([]);
                setError("Failed to retrieve announcements from the registry.");
            }
        } catch (err: any) {
            console.error(err);
            setAnnouncements([]);
            setError(err.message || "A network error occurred.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    // Format Target Audience
    const getAudienceLabel = (item: AnnouncementItem) => {
        if (item.targetDetails?.targetLabels && Array.isArray(item.targetDetails.targetLabels) && item.targetDetails.targetLabels.length > 0) {
            return item.targetDetails.targetLabels[0];
        }
        const t = (item.target || "").toUpperCase();
        if (t === "TEACHERS") return "Faculty & Teachers";
        if (t === "STUDENTS") return "All Students";
        if (t === "PARENTS") return "Parents & Guardians";
        if (t === "SPECIFIC_GRADE") return "Specific Grade";
        if (t === "SPECIFIC_SECTION") return "Specific Section";
        return "Entire School";
    };

    // Calculate Desk Status
    const getAnnouncementStatus = (item: AnnouncementItem) => {
        const acks = item.acknowledgments || [];
        const total = acks.length;
        if (total === 0) {
            return {
                label: "Published",
                className: "text-slate-700 font-medium"
            };
        }
        const confirmed = acks.filter(a => a.isAcknowledged).length;
        if (confirmed === total) {
            return {
                label: "Acknowledged",
                className: "text-slate-700 font-medium"
            };
        }
        if (confirmed > 0) {
            return {
                label: `In progress (${confirmed}/${total})`,
                className: "text-slate-700 font-medium"
            };
        }
        return {
            label: "Pending",
            className: "text-slate-700 font-medium"
        };
    };

    // Filter Logic
    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            // Audience Filter
            if (audienceFilter !== "ALL") {
                const t = (item.target || "").toUpperCase();
                if (audienceFilter === "ALL_SCHOOL" && t !== "ALL") return false;
                if (audienceFilter === "TEACHERS" && t !== "TEACHERS" && !(item.targetDetails?.targetRoles || []).includes("TEACHERS")) return false;
                if (audienceFilter === "STUDENTS" && t !== "STUDENTS" && t !== "SPECIFIC_GRADE" && t !== "SPECIFIC_SECTION" && !(item.targetDetails?.targetRoles || []).includes("STUDENTS")) return false;
                if (audienceFilter === "PARENTS" && t !== "PARENTS" && !(item.targetDetails?.targetRoles || []).includes("PARENTS")) return false;
            }

            // Priority Filter
            if (priorityFilter !== "ALL") {
                const p = (item.priority || "NORMAL").toUpperCase();
                if (p !== priorityFilter) return false;
            }

            // Status Filter
            if (statusFilter !== "ALL") {
                const acks = item.acknowledgments || [];
                const total = acks.length;
                const confirmed = acks.filter(a => a.isAcknowledged).length;
                if (statusFilter === "PUBLISHED" && total > 0 && confirmed === total) return false;
                if (statusFilter === "ACKNOWLEDGED" && (total === 0 || confirmed < total)) return false;
                if (statusFilter === "PENDING" && (total === 0 || confirmed === total)) return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesTitle = item.title?.toLowerCase().includes(q);
                const matchesContent = item.content?.toLowerCase().includes(q);
                const matchesAuthor = item.author?.name?.toLowerCase().includes(q);
                const matchesTarget = getAudienceLabel(item).toLowerCase().includes(q);
                if (!matchesTitle && !matchesContent && !matchesAuthor && !matchesTarget) return false;
            }

            return true;
        });
    }, [announcements, audienceFilter, priorityFilter, statusFilter, searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [audienceFilter, priorityFilter, statusFilter, searchQuery, viewMode]);

    const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / pageSize));
    const paginatedAnnouncements = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredAnnouncements.slice(start, start + pageSize);
    }, [filteredAnnouncements, page, pageSize]);

    // Active Filter Count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (audienceFilter !== "ALL") count++;
        if (priorityFilter !== "ALL") count++;
        if (statusFilter !== "ALL") count++;
        return count;
    }, [audienceFilter, priorityFilter, statusFilter]);

    const hasActiveFilters = searchQuery !== "" || activeFilterCount > 0;

    const clearAllFilters = () => {
        setSearchQuery("");
        setAudienceFilter("ALL");
        setPriorityFilter("ALL");
        setStatusFilter("ALL");
    };

    // Card Excerpt Summary (Matching DfE Cards)
    const getCleanCardMessage = (item: AnnouncementItem) => {
        const text = item.content?.trim() || "";
        if (!text || text.length < 5) {
            return `Official circular notice broadcast to ${getAudienceLabel(item)}.`;
        }
        const firstSentence = text.split(/[.!?]\s+/)[0];
        return firstSentence.length > 115 ? `${firstSentence.substring(0, 112)}...` : firstSentence;
    };

    // Open Announcement Detail Drawer
    const loadAnnouncementDetail = async (item: AnnouncementItem) => {
        setSelectedAnnouncement(item);
        setTrackingSearch("");
        setTrackingStatusFilter("ALL");
        setTrackingRoleFilter("ALL");

        try {
            setStatusLoading(true);
            const res = await fetchApi(`/communication/announcements/${item.id}/status`);
            if (res.ok) {
                const json = await res.json();
                setStatusReport(json.data || null);
            } else {
                const acks = item.acknowledgments || [];
                const total = acks.length;
                const confirmed = acks.filter(a => a.isAcknowledged).length;
                setStatusReport({
                    announcement: item,
                    stats: {
                        totalRecipients: total,
                        acknowledgedCount: confirmed,
                        pendingCount: total - confirmed
                    },
                    recipients: acks.map(a => ({
                        id: a.id,
                        name: a.recipientName || a.user?.name || "Recipient",
                        email: a.user?.email || "",
                        identifier: a.recipientIdentifier || "",
                        type: a.recipientType || "RECIPIENT",
                        isAcknowledged: a.isAcknowledged,
                        acknowledgedAt: a.acknowledgedAt,
                        notes: a.acknowledgmentNotes
                    }))
                });
            }
        } catch (err) {
            console.error("Failed to load status report:", err);
        } finally {
            setStatusLoading(false);
        }
    };

    // Filter Recipients in Drawer
    const drawerRecipients = useMemo(() => {
        if (!statusReport?.recipients) return [];
        return statusReport.recipients.filter((r: any) => {
            if (trackingStatusFilter === "ACKNOWLEDGED" && !r.isAcknowledged) return false;
            if (trackingStatusFilter === "PENDING" && r.isAcknowledged) return false;

            if (trackingRoleFilter !== "ALL") {
                const recRole = (r.type || "").toUpperCase();
                if (trackingRoleFilter === "TEACHER" && recRole !== "TEACHER") return false;
                if (trackingRoleFilter === "STUDENT" && recRole !== "STUDENT") return false;
                if (trackingRoleFilter === "PARENT" && recRole !== "PARENT") return false;
            }

            if (trackingSearch.trim()) {
                const q = trackingSearch.toLowerCase().trim();
                const matchName = r.name?.toLowerCase().includes(q);
                const matchEmail = r.email?.toLowerCase().includes(q);
                const matchId = r.identifier?.toLowerCase().includes(q);
                if (!matchName && !matchEmail && !matchId) return false;
            }

            return true;
        });
    }, [statusReport, trackingStatusFilter, trackingRoleFilter, trackingSearch]);

    // Delete Announcement
    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        try {
            const res = await fetchApi(`/communication/announcements/${id}`, { method: "DELETE" });
            if (res.ok) {
                setAnnouncements(prev => prev.filter(a => a.id !== id));
                if (selectedAnnouncement?.id === id) {
                    setSelectedAnnouncement(null);
                }
            } else {
                alert("Failed to delete announcement.");
            }
        } catch (_) {
            alert("Error deleting announcement.");
        }
    };

    // Edit Announcement Handlers
    const handleOpenEdit = (item: AnnouncementItem) => {
        setEditingItem(item);
        setEditForm({
            title: item.title || "",
            content: item.content || "",
            attachmentUrl: item.attachmentUrl || "",
            attachmentName: item.attachmentName || ""
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            setSubmittingEdit(true);
            const payload = {
                title: editForm.title.trim(),
                content: editForm.content.trim(),
                attachmentUrl: editForm.attachmentUrl.trim() || undefined,
                attachmentName: editForm.attachmentName.trim() || undefined
            };

            const res = await fetchApi(`/communication/announcements/${editingItem.id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsEditModalOpen(false);
                setEditingItem(null);
                loadAnnouncements();
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed to update announcement.");
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to update announcement.");
        } finally {
            setSubmittingEdit(false);
        }
    };

    if (isPublishing) {
        return (
            <SchoolAnnouncementPublishView
                onBack={() => setIsPublishing(false)}
                onPublished={() => {
                    setIsPublishing(false);
                    loadAnnouncements();
                }}
            />
        );
    }

    return (
        <div className="space-y-6 font-sans text-slate-900 max-w-7xl">
            {/* Error Banner */}
            {error && (
                <div role="alert" className="p-4 border-l-4 border-rose-600 bg-rose-50 text-slate-900 text-sm flex items-center justify-between">
                    <div>
                        <strong className="font-semibold">There is a problem loading the registry:</strong> {error}
                    </div>
                    <button
                        type="button"
                        onClick={() => loadAnnouncements()}
                        className="text-sm font-semibold text-[#4085b3] hover:underline cursor-pointer ml-4"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* 1. PAGE HEADER (Clean single-line header matching Policies & Directives) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Announcements and circulars
                </h1>

                <button
                    type="button"
                    onClick={() => setIsPublishing(true)}
                    className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    <span>Issue announcement</span>
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
                                id="announcement-search"
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search announcements by title, target, or keywords..."
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
                            title="Filter announcements"
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
                            onClick={() => loadAnnouncements()}
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

                {/* Active Filter Chips / Tags */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Applied:</span>
                        {audienceFilter !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => setAudienceFilter("ALL")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>
                                    Audience: {
                                        audienceFilter === "ALL_SCHOOL" ? "Entire School" :
                                        audienceFilter === "TEACHERS" ? "Faculty & Teachers" :
                                        audienceFilter === "STUDENTS" ? "Students" : "Parents"
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
                                <span>
                                    Status: {
                                        statusFilter === "PUBLISHED" ? "Published" :
                                        statusFilter === "ACKNOWLEDGED" ? "Acknowledged" :
                                        statusFilter === "PENDING" ? "Pending" : statusFilter
                                    }
                                </span>
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
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Target Audience */}
                        <div>
                            <label htmlFor="audience-filter" className="block text-xs font-semibold text-slate-700 mb-1">
                                Target audience
                            </label>
                            <select
                                id="audience-filter"
                                value={audienceFilter}
                                onChange={e => setAudienceFilter(e.target.value as any)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All audiences ({announcements.length})</option>
                                <option value="ALL_SCHOOL">Entire School Community</option>
                                <option value="TEACHERS">Faculty & Teachers</option>
                                <option value="STUDENTS">Students & Grades</option>
                                <option value="PARENTS">Parents & Guardians</option>
                            </select>
                        </div>

                        {/* Priority Level */}
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
                                <option value="PUBLISHED">Published</option>
                                <option value="ACKNOWLEDGED">Acknowledged</option>
                                <option value="PENDING">Pending</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. REGISTRY CONTENT: TABLE VIEW OR DfE CARDS VIEW */}
            <div>
                {/* Loading state */}
                {loading && (
                    <div className="py-20 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#4085b3] mb-2" />
                        <span className="text-sm font-medium">Loading announcements...</span>
                    </div>
                )}

                {/* Empty State */}
                {!loading && filteredAnnouncements.length === 0 && (
                    <div className="py-16 text-center border-t border-b border-slate-200">
                        <FileText className="w-10 h-10 mx-auto text-slate-300 stroke-1 mb-2" />
                        <h2 className="text-base font-semibold text-slate-900">No announcements found</h2>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                            {hasActiveFilters
                                ? "No records match your selected filters. Try clearing filters to see all announcements."
                                : "No announcements or circulars have been registered yet."}
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
                                onClick={() => setIsPublishing(true)}
                                className="mt-4 px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white rounded text-sm font-medium cursor-pointer"
                            >
                                Issue announcement
                            </button>
                        )}
                    </div>
                )}

                {/* OPTION A: THE ADMINISTRATIVE TABLE (Exact 1:1 match with Policies & Directives / Programs UI) */}
                {!loading && filteredAnnouncements.length > 0 && viewMode === "table" && (
                    <div className="overflow-x-auto border-t border-slate-200">
                        <table className="w-full table-fixed text-left text-sm border-collapse">
                            <caption className="sr-only">School announcements registry</caption>
                            <thead>
                                <tr className="border-b-2 border-slate-300 text-xs font-semibold text-slate-700">
                                    <th scope="col" className="py-3 pr-3 font-semibold w-[30%]">Announcement</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[18%] whitespace-nowrap">Issuing authority</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[16%] whitespace-nowrap">Target scope</th>
                                    <th scope="col" className="py-3 px-3 font-semibold w-[13%] whitespace-nowrap">Published date</th>
                                    <th scope="col" className="py-3 px-2 font-semibold w-[10%] whitespace-nowrap">Priority</th>
                                    <th scope="col" className="py-3 px-2 font-semibold w-[11%] whitespace-nowrap">Status</th>
                                    <th scope="col" className="py-3 pl-2 pr-1 font-semibold w-[8%] text-right whitespace-nowrap">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {paginatedAnnouncements.map(item => {
                                    const priorityLabel = (item.priority || "NORMAL").charAt(0) + (item.priority || "NORMAL").slice(1).toLowerCase();
                                    const statusObj = getAnnouncementStatus(item);

                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => loadAnnouncementDetail(item)}
                                            className="hover:bg-slate-50/90 transition-colors cursor-pointer group"
                                        >
                                            {/* Announcement Title */}
                                            <td className="py-3.5 pr-3 overflow-hidden">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span
                                                        className="text-[#4085b3] group-hover:underline font-semibold text-sm truncate block"
                                                        title={item.title}
                                                    >
                                                        {item.title}
                                                    </span>
                                                    {item.attachmentUrl && (
                                                        <span title="Contains attachment" className="text-slate-400 shrink-0">
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Issuing Authority */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 truncate" title={item.author?.name || "School Administration"}>
                                                {item.author?.name || "School Administration"}
                                            </td>

                                            {/* Target Scope */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 truncate" title={getAudienceLabel(item)}>
                                                {getAudienceLabel(item)}
                                            </td>

                                            {/* Published Date */}
                                            <td className="py-3.5 px-3 text-xs text-slate-700 tabular-nums whitespace-nowrap">
                                                {new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                            </td>

                                            {/* Priority */}
                                            <td className="py-3.5 px-2 text-xs text-slate-700 whitespace-nowrap">
                                                {priorityLabel}
                                            </td>

                                            {/* Status */}
                                            <td className="py-3.5 px-2 text-xs text-slate-700 whitespace-nowrap">
                                                {statusObj.label}
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

                {/* OPTION B: DfE CLEAN CARDS (Exact 1:1 match with Policies & Directives / Programs UI) */}
                {!loading && filteredAnnouncements.length > 0 && viewMode === "cards" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
                        {paginatedAnnouncements.map(item => (
                            <div
                                key={item.id}
                                onClick={() => loadAnnouncementDetail(item)}
                                className="group relative bg-white border border-slate-300 p-6 flex flex-col justify-between min-h-[175px] hover:bg-[#002d54] hover:border-[#002d54] transition-all duration-150 cursor-pointer"
                            >
                                <div>
                                    {/* Header: Title */}
                                    <h2 className="text-xl font-bold text-[#4085b3] group-hover:text-white transition-colors leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word] line-clamp-2">
                                        {item.title}
                                    </h2>

                                    {/* Single Clean Message */}
                                    <p className="text-sm text-slate-800 group-hover:text-white transition-colors mt-2.5 leading-relaxed line-clamp-2 break-words">
                                        {getCleanCardMessage(item)}
                                    </p>
                                </div>

                                {/* Minimal Footer: Date & Status */}
                                <div className="mt-5 pt-3 border-t border-slate-200 group-hover:border-white/20 flex items-center justify-between text-xs text-slate-500 group-hover:text-white/80 transition-colors">
                                    <span className="tabular-nums">
                                        Due: {new Date(item.expiresAt || item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                    <span className="text-xs font-medium text-slate-600 group-hover:text-white/90">
                                        {getAnnouncementStatus(item).label}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 4. PAGINATION (GOV.UK style simple row) */}
                {!loading && filteredAnnouncements.length > 0 && (
                    <div className="py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 mt-4">
                        <div>
                            Showing <strong className="text-slate-900 font-semibold">{(page - 1) * pageSize + 1}</strong> to{" "}
                            <strong className="text-slate-900 font-semibold">{Math.min(page * pageSize, filteredAnnouncements.length)}</strong> of{" "}
                            <strong className="text-slate-900 font-semibold">{filteredAnnouncements.length}</strong> announcements
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

            {/* 5. SLIDE-OVER DETAIL DRAWER (Exact 1:1 match with Screenshot 3) */}
            {selectedAnnouncement && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="ann-detail-title">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 transition-opacity"
                        onClick={() => setSelectedAnnouncement(null)}
                    />

                    {/* Drawer Panel */}
                    <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl flex flex-col z-50 border-l border-slate-300 overflow-hidden">
                        {/* Header */}
                        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/90 flex items-start justify-between gap-4 shrink-0">
                            <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2 mb-2 flex-wrap text-xs text-slate-500">
                                    <span className="font-mono tracking-wide uppercase">
                                        REF: ANN-{selectedAnnouncement.id.substring(0, 8).toUpperCase()}
                                    </span>
                                    <span>·</span>
                                    <span className="font-medium text-slate-700">
                                        {getAnnouncementStatus(selectedAnnouncement).label}
                                    </span>
                                </div>
                                <h2
                                    id="ann-detail-title"
                                    className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug break-words [overflow-wrap:anywhere] [word-break:break-word]"
                                >
                                    {selectedAnnouncement.title}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedAnnouncement(null)}
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
                                        {selectedAnnouncement.author?.name || "School Administration"} (SCHOOL)
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Target scope</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {getAudienceLabel(selectedAnnouncement)}
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Published date</dt>
                                    <dd className="col-span-2 text-slate-900 tabular-nums">
                                        Effective from {new Date(selectedAnnouncement.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Priority</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {(selectedAnnouncement.priority || "NORMAL").charAt(0) + (selectedAnnouncement.priority || "NORMAL").slice(1).toLowerCase()}
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Current status</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {getAnnouncementStatus(selectedAnnouncement).label}
                                    </dd>
                                </div>
                            </dl>

                            {/* Official Announcement Text */}
                            <div>
                                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                    OFFICIAL ANNOUNCEMENT TEXT
                                </h3>
                                <div className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] bg-slate-50 p-3.5 border-l-3 border-[#4085b3]">
                                    {selectedAnnouncement.content}
                                </div>
                            </div>

                            {/* Supporting Documentation / Attachment */}
                            {selectedAnnouncement.attachmentUrl && (
                                <div>
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                                        Supporting documentation
                                    </h3>
                                    {isImageUrl(selectedAnnouncement.attachmentUrl, selectedAnnouncement.attachmentName) ? (
                                        <div className="space-y-2">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={selectedAnnouncement.attachmentUrl}
                                                alt={selectedAnnouncement.attachmentName || "Attached Image"}
                                                className="max-h-56 rounded border border-slate-200 object-contain mx-auto cursor-pointer"
                                                onClick={() => setPreviewMedia({ url: selectedAnnouncement.attachmentUrl!, isPdf: false, name: selectedAnnouncement.attachmentName || undefined })}
                                            />
                                            <div className="text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewMedia({ url: selectedAnnouncement.attachmentUrl!, isPdf: false, name: selectedAnnouncement.attachmentName || undefined })}
                                                    className="text-xs text-[#4085b3] hover:underline font-medium inline-flex items-center gap-1"
                                                >
                                                    <span>View full image</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 border border-slate-200 text-sm">
                                            <div className="flex items-center gap-2 truncate">
                                                <Paperclip className="w-4 h-4 text-slate-500 shrink-0" />
                                                <span className="truncate">{selectedAnnouncement.attachmentName || "Guideline Document"}</span>
                                            </div>
                                            <a
                                                href={selectedAnnouncement.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-[#4085b3] hover:underline font-semibold inline-flex items-center gap-1 shrink-0 ml-3"
                                            >
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                                <span>Download</span>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Compliance & Acknowledgment Tracking */}
                            <div className="border border-slate-200 p-4 bg-slate-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Compliance & acknowledgment
                                    </h3>
                                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>
                                            {statusReport?.stats?.acknowledgedCount ?? 0} of {statusReport?.stats?.totalRecipients ?? (selectedAnnouncement.acknowledgments?.length || 0)} confirmed
                                        </span>
                                    </span>
                                </div>

                                {/* Recipient search & role filters */}
                                <div className="flex items-center gap-2 pt-1">
                                    <div className="relative flex-1">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={trackingSearch}
                                            onChange={e => setTrackingSearch(e.target.value)}
                                            placeholder="Filter recipients by name, ID, or email..."
                                            className="w-full pl-8 pr-2 py-1 text-xs bg-white border border-slate-300 rounded"
                                        />
                                    </div>
                                    <select
                                        value={trackingRoleFilter}
                                        onChange={e => setTrackingRoleFilter(e.target.value as any)}
                                        className="py-1 px-2 text-xs bg-white border border-slate-300 rounded text-slate-700"
                                    >
                                        <option value="ALL">All Roles</option>
                                        <option value="TEACHER">Teachers</option>
                                        <option value="STUDENT">Students</option>
                                        <option value="PARENT">Parents</option>
                                    </select>
                                </div>

                                {/* Recipients List */}
                                <div className="border border-slate-200 rounded bg-white divide-y divide-slate-100 max-h-56 overflow-y-auto">
                                    {statusLoading ? (
                                        <div className="py-6 text-center text-xs text-slate-400">
                                            <Loader2 className="w-4 h-4 animate-spin mx-auto text-[#4085b3] mb-1" />
                                            <span>Loading recipient compliance receipts...</span>
                                        </div>
                                    ) : drawerRecipients.length === 0 ? (
                                        <div className="py-6 text-center text-xs text-slate-400">
                                            No recipient acknowledgment records found.
                                        </div>
                                    ) : (
                                        drawerRecipients.map((rec: any) => (
                                            <div key={rec.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-slate-900 truncate">{rec.name}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono">[{rec.type}]</span>
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 truncate block">
                                                        {rec.email || rec.identifier || "No ID"}
                                                    </span>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    {rec.isAcknowledged ? (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            <span>Confirmed</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                                                            <Clock className="w-3 h-3 text-amber-600" />
                                                            <span>Pending</span>
                                                        </span>
                                                    )}
                                                    {rec.acknowledgedAt && (
                                                        <span className="text-[10px] text-slate-400 block font-mono">
                                                            {new Date(rec.acknowledgedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer (Matching Screenshot 3) */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleOpenEdit(selectedAnnouncement);
                                        setSelectedAnnouncement(null);
                                    }}
                                    className="text-xs text-slate-600 hover:text-slate-900 font-medium underline cursor-pointer"
                                >
                                    Edit announcement
                                </button>
                                <span className="text-slate-300">•</span>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteAnnouncement(selectedAnnouncement.id)}
                                    className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
                                >
                                    Delete
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedAnnouncement(null)}
                                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-sm font-medium transition-colors cursor-pointer bg-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Media Lightbox */}
            {previewMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in"
                    onClick={() => setPreviewMedia(null)}
                >
                    <div
                        className="relative max-w-3xl max-h-[85vh] bg-white rounded-md overflow-hidden p-3 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-800 truncate">
                                {previewMedia.name || "Attachment Preview"}
                            </span>
                            <button
                                onClick={() => setPreviewMedia(null)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {previewMedia.isPdf ? (
                            <iframe
                                src={previewMedia.url}
                                title="PDF Preview"
                                className="w-full h-[70vh] rounded border border-slate-200"
                            />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={previewMedia.url}
                                alt="Preview"
                                className="max-h-[70vh] w-auto object-contain rounded mx-auto"
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
                    <div className="bg-white rounded-md shadow-xl max-w-md w-full p-4 space-y-3 border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <h3 className="text-sm font-bold text-slate-900">Edit Announcement</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateAnnouncement} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className="w-full border border-slate-200 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={editForm.content}
                                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                                    className="w-full border border-slate-200 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingEdit}
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#32698e] rounded cursor-pointer disabled:opacity-50"
                                >
                                    {submittingEdit ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
