"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Megaphone, 
    Plus, 
    Calendar, 
    User, 
    Trash2, 
    Edit2, 
    Search, 
    ChevronLeft, 
    ChevronRight, 
    Users, 
    Paperclip, 
    FileText, 
    X,
    ExternalLink,
    CheckCircle2,
    Clock,
    Eye,
    CheckCheck,
    AlertCircle,
    Send,
    Loader2,
    ShieldCheck,
    MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import SchoolAnnouncementPublishView from "@/components/communication/SchoolAnnouncementPublishView";
import DirectivesRecipientView from "@/components/governance/DirectivesRecipientView";

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
    const { authData } = useAuth();
    const currentUserId = authData?.user?.id;
    const activeScope = authData?.access?.[0]?.scope;

    const [mainTab, setMainTab] = useState<"internal" | "directives">("internal");
    const [viewMode, setViewMode] = useState<"list" | "publish">("list");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [targetFilter, setTargetFilter] = useState("ALL");
    const [previewMedia, setPreviewMedia] = useState<{ url: string; isPdf?: boolean; name?: string } | null>(null);

    // Status / Delivery Tracking Modal
    const [statusModalAnnouncement, setStatusModalAnnouncement] = useState<any | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusReport, setStatusReport] = useState<any | null>(null);
    const [statusRecipientFilter, setStatusRecipientFilter] = useState<"ALL" | "CONFIRMED" | "PENDING" | "READ">("ALL");
    const [statusSearchQuery, setStatusSearchQuery] = useState("");

    // Receiver Confirmation State
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const [acknowledgmentNotes, setAcknowledgmentNotes] = useState("");
    const [activeAckPromptId, setActiveAckPromptId] = useState<string | null>(null);

    // Edit modal
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({
        title: "",
        content: "",
        attachmentUrl: "",
        attachmentName: ""
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/communication/announcements");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(Array.isArray(data) ? data : []);
            } else {
                setAnnouncements([]);
            }
        } catch (err: any) {
            console.error(err);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            let matchesTarget = true;
            if (targetFilter !== "ALL") {
                matchesTarget = item.target === targetFilter;
            }

            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q ||
                item.title?.toLowerCase().includes(q) ||
                item.content?.toLowerCase().includes(q);

            return matchesTarget && matchesSearch;
        });
    }, [announcements, targetFilter, searchQuery]);

    const totalCount = filteredAnnouncements.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const paginatedAnnouncements = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAnnouncements.slice(start, start + pageSize);
    }, [filteredAnnouncements, currentPage, pageSize]);

    // Open Status Tracking Modal
    const handleOpenStatusModal = async (item: any) => {
        setStatusModalAnnouncement(item);
        setStatusRecipientFilter("ALL");
        setStatusSearchQuery("");
        try {
            setStatusLoading(true);
            const res = await fetchApi(`/communication/announcements/${item.id}/status`);
            if (res.ok) {
                const json = await res.json();
                setStatusReport(json.data || null);
            } else {
                // Fallback to locally present acknowledgments
                const acks = item.acknowledgments || [];
                const total = acks.length;
                const confirmed = acks.filter((a: any) => a.isAcknowledged).length;
                const read = acks.filter((a: any) => a.isRead).length;
                setStatusReport({
                    announcement: item,
                    stats: {
                        totalRecipients: total,
                        readCount: read,
                        acknowledgedCount: confirmed,
                        pendingCount: total - confirmed,
                        acknowledgmentRate: total > 0 ? Math.round((confirmed / total) * 100) : 100
                    },
                    recipients: acks.map((a: any) => ({
                        id: a.id,
                        userId: a.userId,
                        name: a.recipientName || a.user?.name || "Recipient",
                        email: a.user?.email || "",
                        identifier: a.recipientIdentifier || "",
                        type: a.recipientType || "RECIPIENT",
                        isRead: a.isRead,
                        readAt: a.readAt,
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

    // Receiver Confirmation Action
    const handleConfirmReceipt = async (announcementId: string, notes?: string) => {
        try {
            setAcknowledgingId(announcementId);
            const res = await fetchApi(`/communication/announcements/${announcementId}/acknowledge`, {
                method: "POST",
                body: JSON.stringify({ notes: notes?.trim() || undefined })
            });
            if (res.ok) {
                setActiveAckPromptId(null);
                setAcknowledgmentNotes("");
                await loadData();
                if (statusModalAnnouncement?.id === announcementId) {
                    await handleOpenStatusModal(statusModalAnnouncement);
                }
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || "Failed to confirm announcement.");
            }
        } catch (err) {
            console.error("Failed to acknowledge announcement:", err);
            alert("Network error while confirming announcement.");
        } finally {
            setAcknowledgingId(null);
        }
    };

    const handleOpenEdit = (item: any) => {
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
            setSubmitting(true);
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
                loadData();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to update announcement");
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to update announcement");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        try {
            const res = await fetchApi(`/communication/announcements/${id}`, { method: "DELETE" });
            if (res.ok) {
                setAnnouncements(prev => prev.filter(a => a.id !== id));
            } else {
                const data = await res.json();
                alert(data.error || "Delete failed");
            }
        } catch (_) {
            alert("Delete failed");
        }
    };

    const renderTargetBadge = (target: string, targetDetails?: any) => {
        if (targetDetails?.targetLabels && Array.isArray(targetDetails.targetLabels) && targetDetails.targetLabels.length > 0) {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Users className="w-3 h-3" />
                    <span>{targetDetails.targetLabels[0]}</span>
                    {targetDetails.targetLabels.length > 1 && (
                        <span>(+{targetDetails.targetLabels.length - 1})</span>
                    )}
                </span>
            );
        }

        switch (target) {
            case "TEACHERS":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">All Teachers</span>;
            case "STUDENTS":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">All Students</span>;
            case "PARENTS":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">All Parents</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Entire School</span>;
        }
    };

    // Filter recipients in status modal
    const filteredRecipients = useMemo(() => {
        if (!statusReport?.recipients) return [];
        return statusReport.recipients.filter((r: any) => {
            if (statusRecipientFilter === "CONFIRMED" && !r.isAcknowledged) return false;
            if (statusRecipientFilter === "PENDING" && r.isAcknowledged) return false;
            if (statusRecipientFilter === "READ" && !r.isRead) return false;

            const q = statusSearchQuery.toLowerCase().trim();
            if (q) {
                const matchName = r.name?.toLowerCase().includes(q);
                const matchId = r.identifier?.toLowerCase().includes(q);
                const matchEmail = r.email?.toLowerCase().includes(q);
                if (!matchName && !matchId && !matchEmail) return false;
            }
            return true;
        });
    }, [statusReport, statusRecipientFilter, statusSearchQuery]);

    if (viewMode === "publish") {
        return (
            <SchoolAnnouncementPublishView
                onBack={() => setViewMode("list")}
                onPublished={() => {
                    setViewMode("list");
                    loadData();
                }}
            />
        );
    }

    if (loading) return <LoadingState message="Loading announcements..." />;

    return (
        <div className="max-w-5xl mx-auto space-y-4 font-sans text-slate-800 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-blue-600" />
                        <span>Communication & Directives</span>
                    </h1>
                    <p className="text-xs text-slate-500">Manage internal school announcements and receive official directives from Woreda, Zone, Region, and Federal MoE.</p>
                </div>
                {mainTab === "internal" && (
                    <Button
                        onClick={() => setViewMode("publish")}
                        leftIcon={<Plus className="w-4 h-4" />}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3.5 font-semibold shadow-xs"
                    >
                        Publish Announcement
                    </Button>
                )}
            </div>

            {/* Sub-Tabs: School Internal Announcements vs Higher Administrative Directives */}
            <div className="flex items-center gap-2 pb-1">
                <button
                    type="button"
                    onClick={() => setMainTab("internal")}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        mainTab === "internal"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                    School Internal Circulars ({announcements.length})
                </button>
                <button
                    type="button"
                    onClick={() => setMainTab("directives")}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        mainTab === "directives"
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                    Higher Directives (Woreda / Zone / Region / MoE)
                </button>
            </div>

            {mainTab === "directives" ? (
                <DirectivesRecipientView
                    tierName={activeScope?.name || "School"}
                    tierType="SCHOOL"
                    organizationId={activeScope?.id}
                />
            ) : (
                <>
                    {/* Filter & Search Bar */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search announcements..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                    />
                </div>

                <select
                    value={targetFilter}
                    onChange={(e) => setTargetFilter(e.target.value)}
                    className="w-full sm:w-48 py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 text-slate-700 font-medium"
                >
                    <option value="ALL">All Audiences</option>
                    <option value="TEACHERS">Faculty Only</option>
                    <option value="STUDENTS">Students Only</option>
                    <option value="PARENTS">Parents Only</option>
                </select>
            </div>

            {/* List Ledger */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                {paginatedAnnouncements.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 space-y-2">
                        <Megaphone className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-semibold text-slate-800 text-sm">No announcements found</p>
                        <p className="text-xs text-slate-400">Click &quot;Publish Announcement&quot; to send an announcement.</p>
                        <div className="pt-2">
                            <Button
                                onClick={() => setViewMode("publish")}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-3.5"
                            >
                                Publish First Announcement
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {paginatedAnnouncements.map((item) => {
                            const stats = item.stats || {
                                totalRecipients: (item.acknowledgments || []).length,
                                readCount: (item.acknowledgments || []).filter((a: any) => a.isRead).length,
                                acknowledgedCount: (item.acknowledgments || []).filter((a: any) => a.isAcknowledged).length,
                                pendingCount: 0,
                                acknowledgmentRate: 0
                            };

                            const hasRecipients = stats.totalRecipients > 0;
                            const isAllConfirmed = hasRecipients && stats.acknowledgedCount === stats.totalRecipients;

                            // Check if viewer is a recipient
                            const myAck = (item.acknowledgments || []).find((a: any) => a.userId === currentUserId);
                            const canAcknowledge = myAck && !myAck.isAcknowledged;

                            return (
                                <div key={item.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-3">
                                    {/* Top Row: Targets, Metadata & Action Controls */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                                            {renderTargetBadge(item.target, item.targetDetails)}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                            </span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <User className="w-3.5 h-3.5 text-slate-400" />
                                                {item.author?.name || "School Administration"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                                            {/* Status Tracking Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleOpenStatusModal(item)}
                                                className={`px-2.5 py-1 text-2xs font-semibold rounded-md border flex items-center gap-1.5 transition-colors ${
                                                    isAllConfirmed
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                        : hasRecipients
                                                        ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                                }`}
                                            >
                                                {isAllConfirmed ? (
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                ) : (
                                                    <Clock className="w-3 h-3 text-amber-600" />
                                                )}
                                                <span>
                                                    {hasRecipients ? (
                                                        `${stats.acknowledgedCount}/${stats.totalRecipients} Confirmed`
                                                    ) : (
                                                        "Delivery Status"
                                                    )}
                                                </span>
                                                <Eye className="w-3 h-3 opacity-60 ml-0.5" />
                                            </button>

                                            <button
                                                onClick={() => handleOpenEdit(item)}
                                                className="px-2 py-1 text-2xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 flex items-center gap-1"
                                            >
                                                <Edit2 className="w-3 h-3 text-slate-500" />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAnnouncement(item.id)}
                                                className="px-2 py-1 text-2xs font-medium text-rose-600 bg-white border border-rose-200 rounded hover:bg-rose-50 flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3 text-rose-500" />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Content Title & Details */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed mt-0.5">{item.content}</p>
                                    </div>

                                    {/* Attachment Direct Preview */}
                                    {item.attachmentUrl && (
                                        <div className="pt-1">
                                            {isImageUrl(item.attachmentUrl, item.attachmentName) ? (
                                                <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 inline-block max-w-full">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={item.attachmentUrl}
                                                        alt={item.attachmentName || "Attached Image"}
                                                        className="max-h-64 w-auto rounded-xl object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                                                        onClick={() => setPreviewMedia({ url: item.attachmentUrl, isPdf: false, name: item.attachmentName })}
                                                    />
                                                    <div
                                                        onClick={() => setPreviewMedia({ url: item.attachmentUrl, isPdf: false, name: item.attachmentName })}
                                                        className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-3xs font-bold backdrop-blur-xs flex items-center gap-1 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                                                    >
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                        <span>Full View</span>
                                                    </div>
                                                </div>
                                            ) : isPdfUrl(item.attachmentUrl, item.attachmentName) ? (
                                                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 max-w-2xl">
                                                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 text-xs font-semibold text-slate-700">
                                                        <span className="flex items-center gap-1.5 truncate">
                                                            <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                            {item.attachmentName || "Document.pdf"}
                                                        </span>
                                                        <a
                                                            href={item.attachmentUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 shrink-0"
                                                        >
                                                            <span>Open PDF</span>
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    </div>
                                                    <iframe
                                                        src={item.attachmentUrl}
                                                        title={item.attachmentName || "PDF Preview"}
                                                        className="w-full h-64 border-0 bg-white"
                                                    />
                                                </div>
                                            ) : (
                                                <a
                                                    href={item.attachmentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-2xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                                                >
                                                    <Paperclip className="w-3 h-3 text-blue-600" />
                                                    <span>{item.attachmentName || "Download Attachment"}</span>
                                                    <ExternalLink className="w-2.5 h-2.5 text-blue-500" />
                                                </a>
                                            )}
                                        </div>
                                    )}

                                    {/* Recipient Interactive Confirmation Card (If current user is a targeted recipient) */}
                                    {myAck && (
                                        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                            myAck.isAcknowledged 
                                                ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                                                : "bg-blue-50/80 border-blue-200 text-blue-900"
                                        }`}>
                                            <div className="flex items-center gap-2">
                                                {myAck.isAcknowledged ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                                                )}
                                                <div>
                                                    <p className="text-xs font-bold">
                                                        {myAck.isAcknowledged 
                                                            ? "Receipt Confirmed"
                                                            : "Action Required: Please Confirm Receipt"
                                                        }
                                                    </p>
                                                    <p className="text-2xs text-slate-600">
                                                        {myAck.isAcknowledged 
                                                            ? `You confirmed receipt on ${new Date(myAck.acknowledgedAt || myAck.updatedAt).toLocaleString()}`
                                                            : "Confirm that you have read and understood this official announcement."
                                                        }
                                                    </p>
                                                </div>
                                            </div>

                                            {canAcknowledge && (
                                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                                    <button
                                                        type="button"
                                                        disabled={acknowledgingId === item.id}
                                                        onClick={() => handleConfirmReceipt(item.id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-xs disabled:opacity-50"
                                                    >
                                                        {acknowledgingId === item.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <CheckCheck className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>Confirm & Acknowledge</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalCount > 0 && (
                    <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                        <span>Showing {Math.min(totalCount, (currentPage - 1) * pageSize + 1)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount}</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-2 py-1 border border-slate-300 rounded bg-white disabled:opacity-40"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2">{currentPage} / {totalPages}</span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-2 py-1 border border-slate-300 rounded bg-white disabled:opacity-40"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </>
            )}

            {/* Recipient Delivery & Status Tracking Modal */}
            {statusModalAnnouncement && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in"
                    onClick={() => setStatusModalAnnouncement(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-blue-100 text-blue-800">
                                        <ShieldCheck className="w-3 h-3" />
                                        Delivery & Acknowledgment Status
                                    </span>
                                    {renderTargetBadge(statusModalAnnouncement.target, statusModalAnnouncement.targetDetails)}
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 mt-1">{statusModalAnnouncement.title}</h3>
                                <p className="text-2xs text-slate-500">
                                    Published on {new Date(statusModalAnnouncement.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <button
                                onClick={() => setStatusModalAnnouncement(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Summary Metrics Cards */}
                        <div className="grid grid-cols-3 gap-2.5 p-4 border-b border-slate-100 bg-white">
                            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-center">
                                <span className="text-2xs font-medium text-slate-500 uppercase">Target Recipients</span>
                                <p className="text-base font-bold text-slate-900 mt-0.5">
                                    {statusReport?.stats?.totalRecipients ?? 0}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/50 text-center">
                                <span className="text-2xs font-medium text-emerald-700 uppercase">Confirmed</span>
                                <p className="text-base font-bold text-emerald-800 mt-0.5">
                                    {statusReport?.stats?.acknowledgedCount ?? 0}
                                    <span className="text-2xs font-medium text-emerald-600 ml-1">
                                        ({statusReport?.stats?.acknowledgmentRate ?? 0}%)
                                    </span>
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl border border-amber-200 bg-amber-50/50 text-center">
                                <span className="text-2xs font-medium text-amber-700 uppercase">Pending</span>
                                <p className="text-base font-bold text-amber-800 mt-0.5">
                                    {statusReport?.stats?.pendingCount ?? 0}
                                </p>
                            </div>
                        </div>

                        {/* Search & Status Filter Tabs */}
                        <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-50/40">
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={statusSearchQuery}
                                    onChange={(e) => setStatusSearchQuery(e.target.value)}
                                    placeholder="Filter by name or ID..."
                                    className="w-full pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                                />
                            </div>

                            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto">
                                <button
                                    type="button"
                                    onClick={() => setStatusRecipientFilter("ALL")}
                                    className={`px-2.5 py-1 rounded text-2xs font-semibold ${
                                        statusRecipientFilter === "ALL"
                                            ? "bg-blue-600 text-white"
                                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    All ({statusReport?.recipients?.length || 0})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusRecipientFilter("CONFIRMED")}
                                    className={`px-2.5 py-1 rounded text-2xs font-semibold ${
                                        statusRecipientFilter === "CONFIRMED"
                                            ? "bg-emerald-600 text-white"
                                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    Confirmed ({statusReport?.stats?.acknowledgedCount || 0})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStatusRecipientFilter("PENDING")}
                                    className={`px-2.5 py-1 rounded text-2xs font-semibold ${
                                        statusRecipientFilter === "PENDING"
                                            ? "bg-amber-600 text-white"
                                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    Pending ({statusReport?.stats?.pendingCount || 0})
                                </button>
                            </div>
                        </div>

                        {/* Recipient Ledger Body */}
                        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-2">
                            {statusLoading ? (
                                <div className="py-12 text-center text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                                    <p className="text-xs">Loading delivery receipts...</p>
                                </div>
                            ) : filteredRecipients.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 space-y-1">
                                    <Users className="w-8 h-8 mx-auto text-slate-300" />
                                    <p className="text-xs font-semibold text-slate-700">No recipient records match criteria</p>
                                    <p className="text-2xs text-slate-400">Recipients will appear here once targeted or filtered.</p>
                                </div>
                            ) : (
                                filteredRecipients.map((rec: any) => (
                                    <div key={rec.id || rec.userId} className="pt-2 pb-2 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                                                rec.isAcknowledged 
                                                    ? "bg-emerald-100 text-emerald-800" 
                                                    : "bg-slate-100 text-slate-700"
                                            }`}>
                                                {rec.name?.charAt(0)?.toUpperCase() || "R"}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-bold text-slate-900 truncate">{rec.name}</span>
                                                    <span className="text-3xs font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase border border-slate-200">
                                                        {rec.type}
                                                    </span>
                                                    {rec.identifier && (
                                                        <span className="text-2xs text-slate-500 font-mono">
                                                            ({rec.identifier})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-2xs text-slate-500 mt-0.5">
                                                    <span>{rec.email || "No email"}</span>
                                                    {rec.readAt && (
                                                        <span>• Seen: {new Date(rec.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status Tag */}
                                        <div className="text-right shrink-0">
                                            {rec.isAcknowledged ? (
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                    <span>Confirmed</span>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                    <Clock className="w-3 h-3 text-amber-600" />
                                                    <span>Pending</span>
                                                </div>
                                            )}
                                            {rec.acknowledgedAt && (
                                                <p className="text-3xs text-slate-400 mt-0.5">
                                                    {new Date(rec.acknowledgedAt).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setStatusModalAnnouncement(null)}
                                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Close Ledger
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Media Lightbox Modal */}
            {previewMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in"
                    onClick={() => setPreviewMedia(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh] bg-white rounded-xl overflow-hidden p-3 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-800 truncate">{previewMedia.name || "Attachment Preview"}</span>
                            <button onClick={() => setPreviewMedia(null)} className="p-1 rounded text-slate-400 hover:text-slate-700">
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-3.5">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                            <h3 className="text-sm font-bold text-slate-900">Edit Announcement</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
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
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={editForm.content}
                                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
