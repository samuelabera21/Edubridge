"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
    Search,
    X,
    Paperclip,
    RefreshCw,
    Loader2,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    FileText,
    LayoutList,
    LayoutGrid,
    Filter,
    ExternalLink
} from "lucide-react";

export interface ParentAnnouncementItem {
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
        id?: string;
        name?: string;
        firstName?: string;
        lastName?: string;
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

export default function ParentAnnouncementsRegistryView() {
    const { authData } = useAuth();
    const currentUserId = authData?.user?.id;

    // Data State
    const [announcements, setAnnouncements] = useState<ParentAnnouncementItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Selected Announcement & Drawer
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<ParentAnnouncementItem | null>(null);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

    // View State (Table / Cards)
    const [viewMode, setViewMode] = useState<"table" | "cards">("table");

    // Filter Toolbar State
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [scopeFilter, setScopeFilter] = useState<"ALL" | "SCHOOL" | "PARENTS">("ALL");
    const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ACKNOWLEDGED">("ALL");

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 12;

    // Media Preview
    const [previewMedia, setPreviewMedia] = useState<{ url: string; isPdf?: boolean; name?: string } | null>(null);

    const loadAnnouncements = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const res = await fetchApi("/parent/announcements");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(Array.isArray(data) ? data : []);
            } else {
                setAnnouncements([]);
                setError("Failed to load school announcements.");
            }
        } catch (err: any) {
            console.error("Failed to load parent announcements:", err);
            setAnnouncements([]);
            setError(err.message || "Network error occurred.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    // Handle Confirm Receipt
    const handleConfirmReceipt = async (announcementId: string) => {
        try {
            setAcknowledgingId(announcementId);
            const res = await fetchApi(`/communication/announcements/${announcementId}/acknowledge`, {
                method: "POST",
                body: JSON.stringify({})
            });

            if (res.ok) {
                await loadAnnouncements(true);
                if (selectedAnnouncement?.id === announcementId) {
                    setSelectedAnnouncement(prev => prev ? {
                        ...prev,
                        acknowledgments: [
                            ...(prev.acknowledgments?.filter(a => a.userId !== currentUserId) || []),
                            {
                                id: "ack_" + Date.now(),
                                userId: currentUserId || "",
                                isRead: true,
                                isAcknowledged: true,
                                acknowledgedAt: new Date().toISOString()
                            }
                        ]
                    } : null);
                }
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed to confirm announcement receipt.");
            }
        } catch (err) {
            console.error("Failed to acknowledge announcement:", err);
            alert("Network error while confirming announcement receipt.");
        } finally {
            setAcknowledgingId(null);
        }
    };

    // Format Target Scope
    const getAudienceLabel = (item: ParentAnnouncementItem) => {
        if (item.targetDetails?.targetLabels && Array.isArray(item.targetDetails.targetLabels) && item.targetDetails.targetLabels.length > 0) {
            return item.targetDetails.targetLabels[0];
        }
        const t = (item.target || "").toUpperCase();
        if (t === "PARENTS") return "Parent: All Parents";
        if (t === "STUDENTS") return "Student: All Students";
        return "Entire School";
    };

    const getAuthorName = (item: ParentAnnouncementItem) => {
        if (!item.author) return "School Administration";
        if (item.author.name) return item.author.name;
        if (item.author.firstName) return `${item.author.firstName} ${item.author.lastName || ""}`.trim();
        return "School Administration";
    };

    // Status helper
    const getParentItemStatus = (item: ParentAnnouncementItem) => {
        const myAck = item.acknowledgments?.find(a => a.userId === currentUserId);
        if (myAck?.isAcknowledged) {
            return {
                label: "Acknowledged",
                isAck: true,
                acknowledgedAt: myAck.acknowledgedAt
            };
        }
        return {
            label: "Pending",
            isAck: false,
            acknowledgedAt: null
        };
    };

    // Filter Logic
    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            const aud = (item.target || "").toUpperCase();
            const title = (item.title || "").toLowerCase();
            const content = (item.content || "").toLowerCase();
            const author = getAuthorName(item).toLowerCase();

            // Scope filter
            if (scopeFilter === "PARENTS" && aud !== "PARENTS") return false;
            if (scopeFilter === "SCHOOL" && aud === "PARENTS") return false;

            // Search query
            const q = searchQuery.toLowerCase().trim();
            if (q && !title.includes(q) && !content.includes(q) && !author.includes(q)) {
                return false;
            }

            // Priority filter
            if (priorityFilter !== "ALL" && (item.priority || "NORMAL").toUpperCase() !== priorityFilter) {
                return false;
            }

            // Status filter
            const isAck = item.acknowledgments?.some(a => a.userId === currentUserId && a.isAcknowledged);
            if (statusFilter === "ACKNOWLEDGED" && !isAck) return false;
            if (statusFilter === "PENDING" && isAck) return false;

            return true;
        });
    }, [announcements, scopeFilter, searchQuery, priorityFilter, statusFilter, currentUserId]);

    useEffect(() => {
        setPage(1);
    }, [scopeFilter, searchQuery, priorityFilter, statusFilter, viewMode]);

    const totalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / pageSize));
    const paginatedAnnouncements = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredAnnouncements.slice(start, start + pageSize);
    }, [filteredAnnouncements, page, pageSize]);

    // Active Filter Count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (scopeFilter !== "ALL") count++;
        if (priorityFilter !== "ALL") count++;
        if (statusFilter !== "ALL") count++;
        return count;
    }, [scopeFilter, priorityFilter, statusFilter]);

    const hasActiveFilters = searchQuery !== "" || activeFilterCount > 0;

    const clearAllFilters = () => {
        setSearchQuery("");
        setScopeFilter("ALL");
        setPriorityFilter("ALL");
        setStatusFilter("ALL");
    };

    const getCleanCardMessage = (item: ParentAnnouncementItem) => {
        const text = item.content?.trim() || "";
        if (!text || text.length < 5) {
            return `Official circular notice broadcast to ${getAudienceLabel(item)}.`;
        }
        const firstSentence = text.split(/[.!?]\s+/)[0];
        return firstSentence.length > 115 ? `${firstSentence.substring(0, 112)}...` : firstSentence;
    };

    return (
        <div className="space-y-6 font-sans text-slate-900 max-w-7xl">
            {/* Error Banner */}
            {error && (
                <div role="alert" className="p-4 border-l-4 border-rose-600 bg-rose-50 text-slate-900 text-sm flex items-center justify-between">
                    <div>
                        <strong className="font-semibold">There is a problem loading announcements:</strong> {error}
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

            {/* 1. PAGE HEADER (Clean single-line header matching School Announcements) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Announcements and circulars
                </h1>
            </div>

            {/* 2. TOOLBAR: SEARCH, FILTERS & VIEW SWITCHER (Exact 1:1 match) */}
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
                                placeholder="Search announcements by title, target, or keyword"
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
                            onClick={() => loadAnnouncements(true)}
                            className="p-2 border border-slate-300 bg-white hover:bg-[#4085b3] text-slate-700 hover:text-white hover:border-[#4085b3] rounded transition-all duration-200 cursor-pointer shrink-0 group/refresh"
                            title="Reload registry data"
                            aria-label="Reload registry data"
                        >
                            <RefreshCw className={`w-4 h-4 transition-colors ${refreshing ? "animate-spin text-[#4085b3]" : "text-slate-500 group-hover/refresh:text-white"}`} />
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
                        {scopeFilter !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => setScopeFilter("ALL")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                            >
                                <span>Scope: {scopeFilter === "PARENTS" ? "Parents only" : "School-wide"}</span>
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
                                <span>Status: {statusFilter === "ACKNOWLEDGED" ? "Acknowledged" : "Pending"}</span>
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
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Notice scope
                            </label>
                            <select
                                value={scopeFilter}
                                onChange={e => setScopeFilter(e.target.value as any)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All notices ({announcements.length})</option>
                                <option value="SCHOOL">School-wide notices</option>
                                <option value="PARENTS">Parent circulars only</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Priority level
                            </label>
                            <select
                                value={priorityFilter}
                                onChange={e => setPriorityFilter(e.target.value)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All priorities</option>
                                <option value="HIGH">High</option>
                                <option value="NORMAL">Normal</option>
                                <option value="LOW">Low</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Your acknowledgment
                            </label>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] cursor-pointer"
                            >
                                <option value="ALL">All receipt statuses</option>
                                <option value="PENDING">Pending receipt</option>
                                <option value="ACKNOWLEDGED">Acknowledged by you</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. REGISTRY CONTENT: TABLE VIEW OR CARDS VIEW */}
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
                                : "There are no circular notices active for you right now."}
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearAllFilters}
                                className="mt-4 px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-sm font-medium cursor-pointer"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}

                {/* OPTION A: THE ADMINISTRATIVE TABLE (Exact 1:1 match with Image 1) */}
                {!loading && filteredAnnouncements.length > 0 && viewMode === "table" && (
                    <div className="overflow-x-auto border-t border-slate-200">
                        <table className="w-full table-fixed text-left text-sm border-collapse">
                            <caption className="sr-only">Parent announcements registry</caption>
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
                                    const statusObj = getParentItemStatus(item);

                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => setSelectedAnnouncement(item)}
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
                                            <td className="py-3.5 px-3 text-xs text-slate-700 truncate" title={getAuthorName(item)}>
                                                {getAuthorName(item)}
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

                {/* OPTION B: DfE CLEAN CARDS (Exact 1:1 match with Image 2) */}
                {!loading && filteredAnnouncements.length > 0 && viewMode === "cards" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1">
                        {paginatedAnnouncements.map(item => {
                            const isSelected = selectedAnnouncement?.id === item.id;
                            const statusObj = getParentItemStatus(item);

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedAnnouncement(item)}
                                    className={`group relative p-6 flex flex-col justify-between min-h-[175px] transition-all duration-150 cursor-pointer ${
                                        isSelected
                                            ? "bg-[#4085b3] border border-[#4085b3]"
                                            : "bg-white border border-slate-300 hover:bg-[#4085b3] hover:border-[#4085b3]"
                                    }`}
                                >
                                    <div>
                                        {/* Header: Title */}
                                        <h2 className={`text-xl font-bold leading-snug break-words line-clamp-2 transition-colors ${
                                            isSelected ? "text-white" : "text-[#4085b3] group-hover:text-white"
                                        }`}>
                                            {item.title}
                                        </h2>

                                        {/* Single Clean Message */}
                                        <p className={`text-sm mt-2.5 leading-relaxed line-clamp-2 break-words transition-colors ${
                                            isSelected ? "text-white" : "text-slate-800 group-hover:text-white"
                                        }`}>
                                            {getCleanCardMessage(item)}
                                        </p>
                                    </div>

                                    {/* Minimal Footer: Date & Status */}
                                    <div className={`mt-5 pt-3 border-t flex items-center justify-between text-xs transition-colors ${
                                        isSelected
                                            ? "border-white/20 text-white/80"
                                            : "border-slate-200 group-hover:border-white/20 text-slate-500 group-hover:text-white/80"
                                    }`}>
                                        <span className="tabular-nums">
                                            Due: {new Date(item.expiresAt || item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                        </span>
                                        <span className={`text-xs font-medium ${
                                            isSelected ? "text-white/90" : "text-slate-600 group-hover:text-white/90"
                                        }`}>
                                            {statusObj.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* 4. PAGINATION (GOV.UK style simple row matching Image 1 & 2) */}
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

            {/* 5. SLIDE-OVER DETAIL DRAWER (Exact 1:1 match with Image 3) */}
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
                                        {getParentItemStatus(selectedAnnouncement).label}
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
                                        {getAuthorName(selectedAnnouncement)} (SCHOOL)
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
                                        {getParentItemStatus(selectedAnnouncement).label}
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
                                                <span className="truncate">{selectedAnnouncement.attachmentName || "Export document"}</span>
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

                            {/* Compliance & Acknowledgment Action */}
                            <div className="border border-slate-200 p-4 bg-slate-50 space-y-3">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Compliance & acknowledgment
                                </h3>

                                {(() => {
                                    const { isAck, acknowledgedAt } = getParentItemStatus(selectedAnnouncement);
                                    if (isAck) {
                                        return (
                                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-2 text-emerald-800 text-xs">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <span>
                                                    <strong>Receipt confirmed.</strong> You acknowledged this circular notice on{" "}
                                                    {acknowledgedAt ? new Date(acknowledgedAt).toLocaleString() : "record"}.
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-2">
                                            <p className="text-xs text-slate-600">
                                                Please confirm your acknowledgment of this official announcement for school record keeping.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleConfirmReceipt(selectedAnnouncement.id)}
                                                disabled={acknowledgingId === selectedAnnouncement.id}
                                                className="w-full py-2 px-4 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {acknowledgingId === selectedAnnouncement.id ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span>Recording receipt...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span>Confirm receipt</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Drawer Footer */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedAnnouncement(null)}
                                className="px-4 py-1.5 border border-slate-300 text-slate-700 hover:bg-white rounded text-sm font-medium cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Media Lightbox */}
            {previewMedia && (
                <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-white rounded max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <span className="text-xs font-semibold text-slate-800 truncate">
                                {previewMedia.name || "Document Preview"}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPreviewMedia(null)}
                                className="p-1 text-slate-500 hover:text-slate-800 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-900/10">
                            {previewMedia.isPdf ? (
                                <iframe
                                    src={previewMedia.url}
                                    className="w-full h-[75vh] border-0 rounded"
                                    title="PDF Document"
                                />
                            ) : (
                                <img
                                    src={previewMedia.url}
                                    alt="Preview"
                                    className="max-h-[75vh] max-w-full object-contain rounded"
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
