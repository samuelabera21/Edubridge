"use client";

import { useState, useEffect, useMemo } from "react";
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
    Image as ImageIcon
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
}

export default function DirectivesRecipientView({
    tierName = "Regional Bureau",
    tierType = "REGION",
    organizationId
}: DirectivesRecipientViewProps) {
    const [directives, setDirectives] = useState<RecipientDirectiveItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
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

            if (ackFilter === "PENDING") {
                if (!d.isAcknowledgmentRequired || d.userAcknowledgment?.isAcknowledged) return false;
            } else if (ackFilter === "ACKNOWLEDGED") {
                if (!d.userAcknowledgment?.isAcknowledged) return false;
            } else if (ackFilter === "UNREAD") {
                if (d.userAcknowledgment?.isRead) return false;
            }

            return true;
        });
    }, [directives, searchQuery, ackFilter]);

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
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
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

            {/* Stat Summary Cards - Clean Neutral Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">Total Received</span>
                        <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{totalReceived}</div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
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

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">High / Critical Priority</span>
                        <Shield className={`w-4 h-4 ${urgentCount > 0 ? "text-rose-500" : "text-slate-400"}`} />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{urgentCount}</div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 mb-2">
                        <span className="text-xs font-medium">Acknowledged</span>
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{acknowledgedCount}</div>
                </div>
            </div>

            {/* Filter Bar & Search */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && loadDirectives()}
                            placeholder="Search by title, code, or content..."
                            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400/20 focus:border-slate-400 transition-all text-slate-800 placeholder-slate-400"
                        />
                    </div>

                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    >
                        <option value="ALL">All Types</option>
                        <option value="POLICY">Policies</option>
                        <option value="DIRECTIVE">Directives</option>
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={e => setPriorityFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    >
                        <option value="ALL">All Priorities</option>
                        <option value="CRITICAL">Critical</option>
                        <option value="URGENT">Urgent</option>
                        <option value="HIGH">High</option>
                        <option value="NORMAL">Normal</option>
                        <option value="LOW">Low</option>
                    </select>

                    <select
                        value={ackFilter}
                        onChange={e => setAckFilter(e.target.value as any)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending Acknowledgment</option>
                        <option value="ACKNOWLEDGED">Acknowledged</option>
                        <option value="UNREAD">Unread</option>
                    </select>
                </div>
            </div>

            {/* Directives Table View */}
            {loading ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">Loading directives...</p>
                </div>
            ) : filteredDirectives.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-200 p-12 text-center shadow-xs">
                    <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <h3 className="text-sm font-semibold text-slate-800">No National Policies or Directives</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        There are currently no active policies or directives targeted to your administrative jurisdiction.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                                    <th className="py-3 px-4">Title & Description</th>
                                    <th className="py-3 px-3">Priority</th>
                                    <th className="py-3 px-3">Issuing Authority</th>
                                    <th className="py-3 px-3">Effective Date</th>
                                    <th className="py-3 px-3">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDirectives.map(d => {
                                    const isRead = d.userAcknowledgment?.isRead;
                                    const isAck = d.userAcknowledgment?.isAcknowledged;
                                    const reqAck = d.isAcknowledgmentRequired;
                                    const hasImage = isImageUrl(d.attachmentUrl);

                                    return (
                                        <tr
                                            key={d.id}
                                            className={`hover:bg-slate-50/70 transition-colors ${
                                                !isRead ? "bg-blue-50/20" : ""
                                            }`}
                                        >
                                            <td className="py-3 px-4 max-w-md">
                                                <div className="flex items-start gap-3">
                                                    {/* Image preview thumbnail if attached */}
                                                    {d.attachmentUrl && hasImage ? (
                                                        <div
                                                            onClick={() => setPreviewImageUrl(d.attachmentUrl || null)}
                                                            className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shrink-0 cursor-pointer hover:opacity-85 transition-opacity"
                                                            title="Click to view full image"
                                                        >
                                                            <img
                                                                src={d.attachmentUrl}
                                                                alt={d.attachmentName || d.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ) : d.attachmentUrl ? (
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-500">
                                                            <Paperclip className="w-4 h-4" />
                                                        </div>
                                                    ) : null}

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                            {!isRead && (
                                                                <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" title="Unread" />
                                                            )}
                                                            <span
                                                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getTypeBadge(
                                                                    d.type
                                                                )}`}
                                                            >
                                                                {d.type}
                                                            </span>
                                                            {d.code && (
                                                                <span className="text-[10px] font-mono text-slate-500 font-medium">
                                                                    #{d.code}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div
                                                            onClick={() => openDirectiveDetails(d)}
                                                            className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer truncate"
                                                        >
                                                            {d.title}
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                                            {d.content}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityBadge(
                                                        d.priority
                                                    )}`}
                                                >
                                                    {d.priority}
                                                </span>
                                            </td>

                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <div className="text-xs font-medium text-slate-800">
                                                    {d.issuer?.name || d.issuerOrganization?.name || "Official Authority"}
                                                </div>
                                                <div className="text-[10px] text-slate-400">
                                                    {d.issuer?.authorName || d.author?.name || "Governance Desk"}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <div className="text-xs text-slate-700">
                                                    {new Date(d.effectiveDate).toLocaleDateString(undefined, {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric"
                                                    })}
                                                </div>
                                                {d.deadline && (
                                                    <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        <span>Due: {new Date(d.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3 px-3 whitespace-nowrap">
                                                {reqAck ? (
                                                    isAck ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                            Acknowledged
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                            <AlertCircle className="w-3 h-3 text-amber-600" />
                                                            Ack Required
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                                        {isRead ? "Viewed" : "Unread"}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openDirectiveDetails(d)}
                                                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>View</span>
                                                    </button>
                                                    {reqAck && !isAck && (
                                                        <button
                                                            onClick={() => {
                                                                setAckModalDirective(d);
                                                                setAckNotes("");
                                                                setAckConfirmed(false);
                                                            }}
                                                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                                                        >
                                                            <CheckSquare className="w-3.5 h-3.5" />
                                                            <span>Acknowledge</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Read Directive Details Modal */}
            {selectedDirective && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl border border-slate-200 overflow-hidden my-auto">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-start justify-between gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getTypeBadge(
                                            selectedDirective.type
                                        )}`}
                                    >
                                        {selectedDirective.type}
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityBadge(
                                            selectedDirective.priority
                                        )}`}
                                    >
                                        Priority: {selectedDirective.priority}
                                    </span>
                                    {selectedDirective.code && (
                                        <span className="text-xs font-mono text-slate-500 font-medium">
                                            #{selectedDirective.code}
                                        </span>
                                    )}
                                </div>
                                <h3 className="text-base font-bold text-slate-900 leading-snug">
                                    {selectedDirective.title}
                                </h3>
                                <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                                    <span>Issued by: <strong className="text-slate-700">{selectedDirective.issuer?.name || selectedDirective.issuerOrganization?.name || "Official Authority"}</strong></span>
                                    <span>•</span>
                                    <span>Effective: {new Date(selectedDirective.effectiveDate).toLocaleDateString()}</span>
                                    {selectedDirective.deadline && (
                                        <>
                                            <span>•</span>
                                            <span className="text-amber-700 font-medium">
                                                Due: {new Date(selectedDirective.deadline).toLocaleDateString()}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedDirective(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-800">
                            {/* Acknowledgment Status Banner */}
                            {selectedDirective.isAcknowledgmentRequired && (
                                <div
                                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                                        selectedDirective.userAcknowledgment?.isAcknowledged
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                            : "bg-amber-50 border-amber-200 text-amber-900"
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        {selectedDirective.userAcknowledgment?.isAcknowledged ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <div className="font-bold">
                                                {selectedDirective.userAcknowledgment?.isAcknowledged
                                                    ? "Receipt Acknowledged"
                                                    : "Acknowledgment Required"}
                                            </div>
                                            <p className="mt-0.5 text-slate-600">
                                                {selectedDirective.userAcknowledgment?.isAcknowledged ? (
                                                    <span>
                                                        Recorded on {new Date(selectedDirective.userAcknowledgment.acknowledgedAt!).toLocaleString()}
                                                        {selectedDirective.userAcknowledgment.acknowledgmentNotes && (
                                                            <span className="block mt-0.5 italic text-slate-700">
                                                                "{selectedDirective.userAcknowledgment.acknowledgmentNotes}"
                                                            </span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    "Formal acknowledgment of receipt is required for your administrative jurisdiction."
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {!selectedDirective.userAcknowledgment?.isAcknowledged && (
                                        <button
                                            onClick={() => {
                                                setAckModalDirective(selectedDirective);
                                                setAckNotes("");
                                                setAckConfirmed(false);
                                            }}
                                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                                        >
                                            Acknowledge
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Attached Image Preview */}
                            {selectedDirective.attachmentUrl && (
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Attached Document / Image</span>
                                        </span>
                                        <a
                                            href={selectedDirective.attachmentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-xs flex items-center gap-1"
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                            <span>Open Original</span>
                                        </a>
                                    </div>

                                    {isImageUrl(selectedDirective.attachmentUrl) ? (
                                        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 p-2">
                                            <img
                                                src={selectedDirective.attachmentUrl}
                                                alt={selectedDirective.attachmentName || "Directive Image Attachment"}
                                                className="w-full max-h-[350px] object-contain rounded-lg"
                                            />
                                            {selectedDirective.attachmentName && (
                                                <p className="text-[11px] text-slate-500 font-medium text-center mt-1.5">
                                                    {selectedDirective.attachmentName}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-2.5">
                                                <Paperclip className="w-4 h-4 text-slate-500" />
                                                <div>
                                                    <div className="text-xs font-semibold text-slate-800">
                                                        {selectedDirective.attachmentName || "Attached Policy Document"}
                                                    </div>
                                                    <div className="text-[10px] text-slate-400">PDF / Document File</div>
                                                </div>
                                            </div>
                                            <a
                                                href={selectedDirective.attachmentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                <span>Download</span>
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Directive Content */}
                            <div>
                                <div className="text-xs font-semibold text-slate-600 mb-1.5">
                                    Official Directive Text
                                </div>
                                <div className="text-xs sm:text-sm text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                                    {selectedDirective.content}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setSelectedDirective(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
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
                                Issued by {ackModalDirective.issuer.name}
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
                                        : "bg-slate-900 hover:bg-slate-800"
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
