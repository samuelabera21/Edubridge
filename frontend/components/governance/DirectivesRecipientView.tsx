"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    FileText,
    Shield,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    Search,
    Filter,
    ArrowUpRight,
    Paperclip,
    ExternalLink,
    X,
    Eye,
    CheckSquare,
    Info,
    RefreshCw,
    Building2,
    Image as ImageIcon,
    ChevronRight
} from "lucide-react";

export interface RecipientDirectiveItem {
    id: string;
    title: string;
    code?: string | null;
    type: "POLICY" | "DIRECTIVE";
    category?: string | null;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
    status: string;
    content: string;
    issueDate: string;
    effectiveDate: string;
    deadline?: string | null;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    isAcknowledgmentRequired: boolean;
    targetLevels: string[];
    cascadeDescendants: boolean;
    issuer?: {
        id?: string;
        name?: string;
        type?: string;
        authorName?: string;
    } | null;
    issuerOrganization?: {
        id: string;
        name: string;
        type: string;
    } | null;
    author?: {
        id: string;
        name: string;
        email: string;
    } | null;
    userAcknowledgment?: {
        isRead: boolean;
        readAt?: string | null;
        isAcknowledged: boolean;
        acknowledgedAt?: string | null;
        acknowledgmentNotes?: string | null;
    } | null;
}

interface DirectivesRecipientViewProps {
    tierName?: string; // e.g. "Amhara Regional Education Bureau"
    tierType?: "REGION" | "ZONE" | "WOREDA" | "SCHOOL";
    organizationId?: string;
    initialDirectiveId?: string | null;
}

export default function DirectivesRecipientView({
    tierName = "Regional Bureau",
    tierType = "REGION",
    organizationId,
    initialDirectiveId
}: DirectivesRecipientViewProps) {
    const searchParams = useSearchParams();
    const targetDirectiveId = initialDirectiveId || searchParams?.get("directiveId");

    const [directives, setDirectives] = useState<RecipientDirectiveItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState<"ALL" | "FEDERAL" | "REGION" | "ZONE" | "WOREDA">("ALL");
    const [typeFilter, setTypeFilter] = useState<"ALL" | "POLICY" | "DIRECTIVE">("ALL");
    const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
    const [ackFilter, setAckFilter] = useState<"ALL" | "PENDING" | "ACKNOWLEDGED" | "UNREAD">("ALL");

    // Modal view
    const [selectedDirective, setSelectedDirective] = useState<RecipientDirectiveItem | null>(null);
    const [readingLoading, setReadingLoading] = useState(false);

    // Image lightbox
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

    // Acknowledgment dialog state
    const [ackModalDirective, setAckModalDirective] = useState<RecipientDirectiveItem | null>(null);
    const [ackNotes, setAckNotes] = useState("");
    const [ackConfirmed, setAckConfirmed] = useState(false);
    const [ackSubmitting, setAckSubmitting] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    const showToast = (text: string, type: "success" | "error" = "success") => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    const loadDirectives = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (typeFilter !== "ALL") params.append("type", typeFilter);
            if (priorityFilter !== "ALL") params.append("priority", priorityFilter);
            if (searchQuery.trim()) params.append("search", searchQuery.trim());
            if (organizationId) params.append("organizationId", organizationId);

            const url = `/directives${params.toString() ? `?${params.toString()}` : ""}`;
            const res = await fetchApi(url);
            if (res.ok) {
                const json = await res.json();
                const list = json?.data ? json.data : (Array.isArray(json) ? json : []);
                setDirectives(list);
            } else {
                setDirectives([]);
            }
        } catch (err: any) {
            console.error("Error loading directives:", err);
            setError(err.message || "Failed to load national policies and directives");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDirectives();
    }, [typeFilter, priorityFilter, organizationId]);

    useEffect(() => {
        if (targetDirectiveId && directives.length > 0 && !selectedDirective) {
            const match = directives.find(d => d.id === targetDirectiveId);
            if (match) {
                openDirectiveDetails(match);
            }
        }
    }, [targetDirectiveId, directives]);

    const openDirectiveDetails = async (d: RecipientDirectiveItem) => {
        setSelectedDirective(d);
        setReadingLoading(true);
        try {
            // Fetch single directive will auto-mark it as read in backend
            const res = await fetchApi(`/directives/${d.id}`);
            if (res.ok) {
                const json = await res.json();
                const detailed = json?.data || json;
                if (detailed && detailed.id) {
                    // Update in local state so the unread badge clears
                    setDirectives(prev =>
                        prev.map(item =>
                            item.id === d.id
                                ? {
                                      ...item,
                                      userAcknowledgment: {
                                          ...(item.userAcknowledgment || { isAcknowledged: false }),
                                          isRead: true,
                                          readAt: new Date().toISOString()
                                      }
                                  }
                                : item
                        )
                    );
                    setSelectedDirective({
                        ...d,
                        ...detailed,
                        userAcknowledgment: {
                            ...(d.userAcknowledgment || { isAcknowledged: false }),
                            isRead: true,
                            readAt: new Date().toISOString()
                        }
                    });
                }
            }
        } catch (err) {
            console.error("Failed to load directive details:", err);
        } finally {
            setReadingLoading(false);
        }
    };

    // Direct Acknowledgment with a single click (no textarea notes required)
    const handleDirectAcknowledge = async (directiveId: string) => {
        setAckSubmitting(true);
        try {
            const res = await fetchApi(`/directives/${directiveId}/acknowledge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({})
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.error || errData.message || "Failed to submit acknowledgment.", "error");
                return;
            }

            const nowIso = new Date().toISOString();
            setDirectives(prev =>
                prev.map(item =>
                    item.id === directiveId
                        ? {
                              ...item,
                              userAcknowledgment: {
                                  isRead: true,
                                  readAt: item.userAcknowledgment?.readAt || nowIso,
                                  isAcknowledged: true,
                                  acknowledgedAt: nowIso
                              }
                          }
                        : item
                )
            );

            if (selectedDirective && selectedDirective.id === directiveId) {
                setSelectedDirective(prev =>
                    prev
                        ? {
                              ...prev,
                              userAcknowledgment: {
                                  isRead: true,
                                  readAt: prev.userAcknowledgment?.readAt || nowIso,
                                  isAcknowledged: true,
                                  acknowledgedAt: nowIso
                              }
                          }
                        : null
                );
            }
            showToast("Directive acknowledged successfully.", "success");
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("notification-updated"));
            }
        } catch (err: any) {
            console.error("Failed to acknowledge directive:", err);
            showToast(err.message || "Failed to submit acknowledgment.", "error");
        } finally {
            setAckSubmitting(false);
        }
    };

    const handleAcknowledgeSubmit = async () => {
        if (!ackModalDirective) return;
        if (!ackConfirmed) {
            showToast("Please check the confirmation box to verify you have reviewed this directive.", "error");
            return;
        }

        setAckSubmitting(true);
        try {
            const res = await fetchApi(`/directives/${ackModalDirective.id}/acknowledge`, {
                method: "POST",
                body: JSON.stringify({ notes: ackNotes.trim() || undefined })
            });

            if (res.ok) {
                const data = await res.json();
                showToast(data.message || "Directive officially acknowledged and recorded.", "success");
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("notification-updated"));
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.error || errData.message || "Failed to submit acknowledgment.", "error");
                return;
            }

            // Update in local state
            const nowIso = new Date().toISOString();
            setDirectives(prev =>
                prev.map(item =>
                    item.id === ackModalDirective.id
                        ? {
                              ...item,
                              userAcknowledgment: {
                                  isRead: true,
                                  readAt: item.userAcknowledgment?.readAt || nowIso,
                                  isAcknowledged: true,
                                  acknowledgedAt: nowIso,
                                  acknowledgmentNotes: ackNotes.trim() || null
                              }
                          }
                        : item
                )
            );

            if (selectedDirective && selectedDirective.id === ackModalDirective.id) {
                setSelectedDirective(prev =>
                    prev
                        ? {
                              ...prev,
                              userAcknowledgment: {
                                  isRead: true,
                                  readAt: prev.userAcknowledgment?.readAt || nowIso,
                                  isAcknowledged: true,
                                  acknowledgedAt: nowIso,
                                  acknowledgmentNotes: ackNotes.trim() || null
                              }
                          }
                        : null
                );
            }

            setAckModalDirective(null);
            setAckNotes("");
            setAckConfirmed(false);
        } catch (err: any) {
            console.error("Failed to acknowledge directive:", err);
            showToast(err.message || "Failed to submit acknowledgment.", "error");
        } finally {
            setAckSubmitting(false);
        }
    };

    // Tier classifier helper
    const getDirectiveTier = (d: RecipientDirectiveItem): "FEDERAL" | "REGION" | "ZONE" | "WOREDA" | "OTHER" => {
        const type = (d.issuer?.type || d.issuerOrganization?.type || "").toUpperCase();
        const name = (d.issuer?.name || d.issuerOrganization?.name || "").toLowerCase();
        if (type === "FEDERAL" || name.includes("federal") || name.includes("ministry")) return "FEDERAL";
        if (type === "REGION" || name.includes("region") || name.includes("bureau")) return "REGION";
        if (type === "ZONE" || name.includes("zone") || name.includes("department")) return "ZONE";
        if (type === "WOREDA" || name.includes("woreda") || name.includes("office") || name.includes("district")) return "WOREDA";
        return "OTHER";
    };

    // Filtered list
    const filteredDirectives = useMemo(() => {
        return directives.filter(d => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = d.title?.toLowerCase().includes(q);
                const matchContent = d.content?.toLowerCase().includes(q);
                const matchCode = d.code?.toLowerCase().includes(q);
                if (!matchTitle && !matchContent && !matchCode) return false;
            }

            if (sourceFilter !== "ALL") {
                const tier = getDirectiveTier(d);
                if (tier !== sourceFilter) return false;
            }

            if (ackFilter === "PENDING") {
                if (!d.isAcknowledgmentRequired || d.userAcknowledgment?.isAcknowledged) return false;
            } else if (ackFilter === "ACKNOWLEDGED") {
                if (!d.userAcknowledgment?.isAcknowledged) return false;
            } else if (ackFilter === "UNREAD") {
                if (d.userAcknowledgment?.isRead) return false;
            }

            return true;
        });
    }, [directives, searchQuery, sourceFilter, ackFilter]);

    // Source level counts
    const federalCount = useMemo(() => directives.filter(d => getDirectiveTier(d) === "FEDERAL").length, [directives]);
    const regionCount = useMemo(() => directives.filter(d => getDirectiveTier(d) === "REGION").length, [directives]);
    const zoneCount = useMemo(() => directives.filter(d => getDirectiveTier(d) === "ZONE").length, [directives]);
    const woredaCount = useMemo(() => directives.filter(d => getDirectiveTier(d) === "WOREDA").length, [directives]);

    // KPI Rollups
    const totalReceived = directives.length;
    const pendingAckCount = directives.filter(d => d.isAcknowledgmentRequired && !d.userAcknowledgment?.isAcknowledged).length;
    const urgentCount = directives.filter(d => d.priority === "URGENT" || d.priority === "CRITICAL" || d.priority === "HIGH").length;
    const acknowledgedCount = directives.filter(d => d.userAcknowledgment?.isAcknowledged).length;

    const isImageUrl = (url?: string | null) => {
        if (!url) return false;
        const cleanUrl = url.toLowerCase().split("?")[0];
        return (
            cleanUrl.endsWith(".jpg") ||
            cleanUrl.endsWith(".jpeg") ||
            cleanUrl.endsWith(".png") ||
            cleanUrl.endsWith(".gif") ||
            cleanUrl.endsWith(".webp") ||
            cleanUrl.endsWith(".svg") ||
            cleanUrl.endsWith(".avif") ||
            url.includes("images.unsplash.com") ||
            url.includes("cloudinary.com") ||
            url.includes("imgur.com") ||
            url.startsWith("data:image/") ||
            url.includes("image")
        );
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "CRITICAL":
                return "bg-rose-50 text-rose-700 border-rose-200";
            case "URGENT":
                return "bg-amber-50 text-amber-700 border-amber-200";
            case "HIGH":
                return "bg-orange-50 text-orange-700 border-orange-200";
            case "LOW":
                return "bg-slate-100 text-slate-600 border-slate-200";
            case "NORMAL":
            default:
                return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

    const getTypeBadge = (type: string) => {
        return type === "POLICY"
            ? "bg-purple-50 text-purple-700 border-purple-200"
            : "bg-blue-50 text-blue-700 border-blue-200";
    };

    return (
        <div className="space-y-5">
            {/* Notification Toast */}
            {toastMessage && (
                <div
                    className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-semibold shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
                        toastMessage.type === "success"
                            ? "bg-blue-50 text-blue-800 border-blue-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Clean Header */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
                        <Shield className="w-4 h-4 text-slate-400" />
                        <span>Official Ministry Directives • {tierName}</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                        National Policies & Directives
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Official policy documents and executive directives cascaded to your administrative jurisdiction.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadDirectives}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin text-blue-600" : ""}`} />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Stat Summary Cards - Clean Interactive Neutral/Blue Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div
                    onClick={() => {
                        setSourceFilter("ALL");
                        setAckFilter("ALL");
                        setPriorityFilter("ALL");
                    }}
                    className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-300 transition-all cursor-pointer"
                >
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">Total Received</span>
                        <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{totalReceived}</div>
                </div>

                <div
                    onClick={() => setAckFilter(ackFilter === "PENDING" ? "ALL" : "PENDING")}
                    className={`bg-white rounded-xl p-4 border shadow-xs transition-all cursor-pointer ${
                        ackFilter === "PENDING"
                            ? "border-amber-400 bg-amber-50/20 ring-2 ring-amber-400/20"
                            : "border-slate-200 hover:border-amber-300"
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">Action Required</span>
                        <AlertCircle className={`w-4 h-4 ${pendingAckCount > 0 ? "text-amber-500" : "text-slate-400"}`} />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900">{pendingAckCount}</span>
                        {pendingAckCount > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Pending
                            </span>
                        )}
                    </div>
                </div>

                <div
                    onClick={() => setPriorityFilter(priorityFilter === "HIGH" ? "ALL" : "HIGH")}
                    className={`bg-white rounded-xl p-4 border shadow-xs transition-all cursor-pointer ${
                        priorityFilter === "HIGH"
                            ? "border-rose-400 bg-rose-50/20 ring-2 ring-rose-400/20"
                            : "border-slate-200 hover:border-rose-300"
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">High / Critical Priority</span>
                        <Shield className={`w-4 h-4 ${urgentCount > 0 ? "text-rose-500" : "text-slate-400"}`} />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{urgentCount}</div>
                </div>

                <div
                    onClick={() => setAckFilter(ackFilter === "ACKNOWLEDGED" ? "ALL" : "ACKNOWLEDGED")}
                    className={`bg-white rounded-xl p-4 border shadow-xs transition-all cursor-pointer ${
                        ackFilter === "ACKNOWLEDGED"
                            ? "border-blue-400 bg-blue-50/20 ring-2 ring-blue-400/20"
                            : "border-slate-200 hover:border-blue-300"
                    }`}
                >
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">Acknowledged</span>
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{acknowledgedCount}</div>
                </div>
            </div>

            {/* Clean Filter Toolbar */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto flex-1">
                        {/* Search input */}
                        <div className="relative w-full sm:w-60">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by title, code, or content..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && loadDirectives()}
                                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-slate-400 text-slate-800 placeholder-slate-400 bg-white"
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

                        {/* Source Filter Dropdown */}
                        <div className="w-full sm:w-44">
                            <select
                                value={sourceFilter}
                                onChange={e => setSourceFilter(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                            >
                                <option value="ALL">All Sources ({directives.length})</option>
                                <option value="FEDERAL">Federal Ministry ({federalCount})</option>
                                <option value="REGION">Regional Bureau ({regionCount})</option>
                                <option value="ZONE">Zonal Dept ({zoneCount})</option>
                                <option value="WOREDA">Woreda Office ({woredaCount})</option>
                            </select>
                        </div>

                        {/* Status Filter Dropdown */}
                        <div className="w-full sm:w-40">
                            <select
                                value={ackFilter}
                                onChange={e => setAckFilter(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:border-slate-400 cursor-pointer"
                            >
                                <option value="ALL">All Status</option>
                                <option value="PENDING">Pending ({pendingAckCount})</option>
                                <option value="ACKNOWLEDGED">Acknowledged ({acknowledgedCount})</option>
                            </select>
                        </div>

                        {/* Priority Filter Dropdown */}
                        <div className="w-full sm:w-36">
                            <select
                                value={priorityFilter}
                                onChange={e => setPriorityFilter(e.target.value as any)}
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

                        {/* Reset button if filters active */}
                        {(typeFilter !== "ALL" || sourceFilter !== "ALL" || ackFilter !== "ALL" || priorityFilter !== "ALL" || searchQuery.trim() !== "") && (
                            <button
                                onClick={() => {
                                    setTypeFilter("ALL");
                                    setSourceFilter("ALL");
                                    setAckFilter("ALL");
                                    setPriorityFilter("ALL");
                                    setSearchQuery("");
                                }}
                                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                                <X className="w-3 h-3" />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>

                    {/* Type Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setTypeFilter("ALL")}
                            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                typeFilter === "ALL"
                                    ? "bg-white text-slate-900 shadow-2xs"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => setTypeFilter("POLICY")}
                            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                typeFilter === "POLICY"
                                    ? "bg-white text-slate-900 shadow-2xs"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Policies
                        </button>
                        <button
                            type="button"
                            onClick={() => setTypeFilter("DIRECTIVE")}
                            className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                typeFilter === "DIRECTIVE"
                                    ? "bg-white text-slate-900 shadow-2xs"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Directives
                        </button>
                    </div>
                </div>
            </div>

            {/* Directives Content (Rectangle Card Grid) */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Loading directives...</p>
                </div>
            ) : filteredDirectives.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center shadow-xs">
                    <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-slate-800">No Directives Found</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        No policies or directives match your current source or status filter criteria.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredDirectives.map(d => {
                        const isRead = d.userAcknowledgment?.isRead;
                        const isAck = d.userAcknowledgment?.isAcknowledged;
                        const reqAck = d.isAcknowledgmentRequired;
                        const tier = getDirectiveTier(d);
                        const hasImage = isImageUrl(d.attachmentUrl);

                        return (
                            <div
                                key={d.id}
                                onClick={() => openDirectiveDetails(d)}
                                className={`group relative rounded-xl border p-4 bg-white flex flex-col justify-between transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                                    reqAck && !isAck
                                        ? "border-amber-300 hover:border-amber-400 bg-linear-to-b from-amber-50/20 to-white"
                                        : "border-slate-200 hover:border-blue-400 bg-white"
                                }`}
                            >
                                <div>
                                    {/* Top Badges: Source, Type, Priority & Attachment */}
                                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {/* Source Badge */}
                                            {tier === "FEDERAL" ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white flex items-center gap-1 shrink-0">
                                                    <Building2 className="w-2.5 h-2.5 text-blue-400" />
                                                    <span>Federal</span>
                                                </span>
                                            ) : tier === "REGION" ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 shrink-0">
                                                    <Building2 className="w-2.5 h-2.5 text-blue-600" />
                                                    <span>Regional</span>
                                                </span>
                                            ) : tier === "ZONE" ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white flex items-center gap-1 shrink-0">
                                                    <Building2 className="w-2.5 h-2.5 text-indigo-300" />
                                                    <span>Zone</span>
                                                </span>
                                            ) : tier === "WOREDA" ? (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200 flex items-center gap-1 shrink-0">
                                                    <Building2 className="w-2.5 h-2.5 text-sky-600" />
                                                    <span>Woreda</span>
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                                                    Official
                                                </span>
                                            )}

                                            {/* Type Badge */}
                                            <span
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase border ${getTypeBadge(
                                                    d.type
                                                )}`}
                                            >
                                                {d.type || "DIRECTIVE"}
                                            </span>
                                        </div>

                                        {/* Priority & Attachment */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {d.priority === "CRITICAL" || d.priority === "URGENT" ? (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                                                    {d.priority}
                                                </span>
                                            ) : d.priority === "HIGH" ? (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                    HIGH
                                                </span>
                                            ) : null}

                                            {d.attachmentUrl && (
                                                <span title="Has attachment" className="p-0.5 text-slate-400">
                                                    <Paperclip className="w-3 h-3" />
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Directive Title - 2 lines clamp */}
                                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug mb-1">
                                        {d.title}
                                    </h4>

                                    {/* Reference Code & Origin Authority */}
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 truncate">
                                        {d.code && (
                                            <span className="font-mono text-[10px] text-slate-400 font-medium">
                                                #{d.code}
                                            </span>
                                        )}
                                        {d.code && (d.issuer?.name || d.issuerOrganization?.name) && <span>•</span>}
                                        <span className="truncate">
                                            {d.issuer?.name || d.issuerOrganization?.name || "Official Authority"}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer: Due Date & Action Status */}
                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
                                    {d.deadline ? (
                                        <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 shrink-0">
                                            <Clock className="w-3 h-3" />
                                            <span>Due {new Date(d.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                        </span>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 shrink-0">
                                            {new Date(d.effectiveDate || d.issueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                        </span>
                                    )}

                                    <div className="shrink-0">
                                        {reqAck && isAck ? (
                                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                                <span>Confirmed</span>
                                            </span>
                                        ) : reqAck && !isAck ? (
                                            <button
                                                type="button"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setAckModalDirective(d);
                                                    setAckNotes("");
                                                    setAckConfirmed(false);
                                                }}
                                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                            >
                                                <CheckSquare className="w-3 h-3" />
                                                <span>Confirm</span>
                                            </button>
                                        ) : (
                                            <span className="text-[11px] font-semibold text-slate-400 group-hover:text-blue-600 flex items-center gap-0.5">
                                                <span>Review</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* SLIDE-OVER DRAWER (GOV.UK Summary List Pattern matching Program UI 1:1) */}
            {selectedDirective && (
                <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="recipient-directive-title">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 transition-opacity"
                        onClick={() => setSelectedDirective(null)}
                    />

                    <div className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl flex flex-col z-50 border-l border-slate-300 overflow-hidden">
                        {/* Drawer Header */}
                        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/90 flex items-start justify-between gap-4 shrink-0">
                            <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-200/80 text-slate-700 tracking-wide uppercase">
                                        REF: DIR-{selectedDirective.code ? selectedDirective.code.toUpperCase() : selectedDirective.id.substring(0, 8).toUpperCase()}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                        selectedDirective.status === "ACTIVE"
                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                            : selectedDirective.status === "PUBLISHED"
                                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                    }`}>
                                        {selectedDirective.status ? selectedDirective.status.charAt(0) + selectedDirective.status.slice(1).toLowerCase() : "Published"}
                                    </span>
                                </div>
                                <h2
                                    id="recipient-directive-title"
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
                                        {selectedDirective.issuer?.name || selectedDirective.issuerOrganization?.name || "Official Authority"}
                                    </dd>
                                </div>
                                <div className="py-3 grid grid-cols-3 gap-2">
                                    <dt className="text-slate-600 font-medium">Target scope</dt>
                                    <dd className="col-span-2 text-slate-900">
                                        {getDirectiveTier(selectedDirective)} Tier
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
                                    <dd className="col-span-2 text-slate-900">
                                        {selectedDirective.status ? selectedDirective.status.charAt(0) + selectedDirective.status.slice(1).toLowerCase() : "Published"}
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

                            {/* Recipient Compliance & Acknowledgment Panel */}
                            {selectedDirective.isAcknowledgmentRequired && (
                                <div className="border border-slate-200 p-4 bg-slate-50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-slate-900">
                                            Compliance & acknowledgment
                                        </h3>
                                        {selectedDirective.userAcknowledgment?.isAcknowledged ? (
                                            <span className="text-xs text-emerald-800 font-medium inline-flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Confirmed by your desk</span>
                                            </span>
                                        ) : (
                                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                Pending your signature
                                            </span>
                                        )}
                                    </div>

                                    {selectedDirective.userAcknowledgment?.isAcknowledged ? (
                                        <p className="text-xs text-slate-600">
                                            Recorded on {new Date(selectedDirective.userAcknowledgment.acknowledgedAt!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                            {selectedDirective.userAcknowledgment.acknowledgmentNotes && (
                                                <span className="block mt-1 italic text-slate-700">
                                                    "{selectedDirective.userAcknowledgment.acknowledgmentNotes}"
                                                </span>
                                            )}
                                        </p>
                                    ) : (
                                        <div className="space-y-2 pt-1">
                                            <p className="text-xs text-slate-600">
                                                Formal acknowledgment of receipt is required for your administrative jurisdiction.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleDirectAcknowledge(selectedDirective.id)}
                                                disabled={ackSubmitting}
                                                className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold rounded inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5" />
                                                <span>Acknowledge directive</span>
                                            </button>
                                        </div>
                                    )}
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

            {/* Lightbox Modal for Image */}
            {previewImageUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setPreviewImageUrl(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImageUrl(null)}
                            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={previewImageUrl}
                            alt="Preview"
                            className="max-h-[80vh] w-auto object-contain rounded-xl"
                        />
                    </div>
                </div>
            )}

            {/* Acknowledge Action Modal */}
            {ackModalDirective && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                                <CheckSquare className="w-5 h-5 text-slate-700" />
                                <h3 className="text-base font-bold text-slate-900">
                                    Acknowledge Directive
                                </h3>
                            </div>
                            <button
                                onClick={() => setAckModalDirective(null)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                            <div className="font-bold text-slate-900">{ackModalDirective.title}</div>
                            <div className="text-[11px] text-slate-500">
                                Issued by {ackModalDirective.issuer?.name || ackModalDirective.issuerOrganization?.name || "Official Authority"}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                                Optional Compliance Notes / Response
                            </label>
                            <textarea
                                value={ackNotes}
                                onChange={e => setAckNotes(e.target.value)}
                                placeholder="e.g., Received and circulated to relevant zonal/woreda departments."
                                rows={3}
                                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all text-slate-800 placeholder-slate-400"
                            />
                        </div>

                        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={ackConfirmed}
                                onChange={e => setAckConfirmed(e.target.checked)}
                                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span className="text-xs text-slate-700 leading-relaxed">
                                I confirm that our administrative office has received and reviewed this national directive.
                            </span>
                        </label>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setAckModalDirective(null)}
                                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAcknowledgeSubmit}
                                disabled={ackSubmitting || !ackConfirmed}
                                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ${
                                    ackSubmitting || !ackConfirmed
                                        ? "bg-slate-300 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700"
                                }`}
                            >
                                {ackSubmitting ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Confirm Acknowledgment</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
