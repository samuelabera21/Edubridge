"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
    Megaphone,
    Building2,
    CheckCircle2,
    CheckCheck,
    Clock,
    Search,
    Paperclip,
    ExternalLink,
    Filter,
    RefreshCw,
    X,
    School,
    FileText,
    Eye
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";

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

type AnnouncementTab = "school" | "department";

export default function TeacherAnnouncementsPage() {
    const { authData } = useAuth();
    const currentUserId = authData?.user?.id;
    const searchParams = useSearchParams();
    const initialTab = searchParams?.get("tab");

    const [activeTab, setActiveTab] = useState<AnnouncementTab>(
        initialTab === "department" ? "department" : "school"
    );

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<"ALL" | "URGENT" | "HIGH" | "NORMAL">("ALL");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "ACKNOWLEDGED">("ALL");

    // Full screen Lightbox
    const [previewMedia, setPreviewMedia] = useState<{ url: string; isPdf?: boolean; name?: string } | null>(null);
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

    const loadAnnouncements = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const res = await fetchApi("/communication/announcements");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(Array.isArray(data) ? data : []);
            } else {
                setAnnouncements([]);
            }
        } catch (err) {
            console.error("Failed to load teacher announcements:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    useEffect(() => {
        if (initialTab === "department") {
            setActiveTab("department");
        } else if (initialTab === "school") {
            setActiveTab("school");
        }
    }, [initialTab]);

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

    // Filter announcements based on tab, priority, status, and search
    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(a => {
            const aud = (a.targetAudience || a.target || "").toUpperCase();
            const title = (a.title || "").toLowerCase();
            const content = (a.content || "").toLowerCase();
            const isDept = aud.includes("DEPT") || aud.includes("DEPARTMENT") || title.includes("dept") || title.includes("department");

            // Tab match
            if (activeTab === "department" && !isDept) return false;
            if (activeTab === "school" && isDept) return false;

            // Search match
            const q = searchQuery.toLowerCase().trim();
            if (q && !title.includes(q) && !content.includes(q) && !a.author?.name?.toLowerCase().includes(q)) {
                return false;
            }

            // Priority match
            if (priorityFilter !== "ALL" && (a.priority || "NORMAL").toUpperCase() !== priorityFilter) {
                return false;
            }

            // Status match
            const isAck = a.acknowledgments?.some((ack: any) => ack.userId === currentUserId && ack.isAcknowledged);
            if (statusFilter === "ACKNOWLEDGED" && !isAck) return false;
            if (statusFilter === "PENDING" && isAck) return false;

            return true;
        });
    }, [announcements, activeTab, searchQuery, priorityFilter, statusFilter, currentUserId]);

    const pendingCount = useMemo(() => {
        return announcements.filter(a => 
            !a.acknowledgments?.some((ack: any) => ack.userId === currentUserId && ack.isAcknowledged)
        ).length;
    }, [announcements, currentUserId]);

    if (loading) {
        return <LoadingState message="Loading announcements..." />;
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-5 pb-12 font-sans text-slate-800">
            {/* Main Tabs (School vs Department) & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2 rounded-xl shadow-2xs">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => {
                            setActiveTab("school");
                            setSearchQuery("");
                        }}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeTab === "school"
                                ? "bg-[#1F5380] text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                    >
                        <School className="w-4 h-4" />
                        <span>School Announcements</span>
                    </button>

                    <button
                        onClick={() => {
                            setActiveTab("department");
                            setSearchQuery("");
                        }}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activeTab === "department"
                                ? "bg-[#1F5380] text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                    >
                        <Building2 className="w-4 h-4" />
                        <span>Department Announcements</span>
                    </button>
                </div>

                {/* Search Bar & Compact Refresh */}
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${activeTab === 'school' ? 'school' : 'department'} notices...`}
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#1F5380]/20 focus:border-[#1F5380]"
                        />
                    </div>
                    <button
                        onClick={() => loadAnnouncements(true)}
                        disabled={refreshing}
                        title="Refresh announcements"
                        className="p-2 text-slate-600 hover:text-[#1F5380] hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center space-x-1.5 text-slate-500 font-bold mr-1">
                        <Filter className="w-3.5 h-3.5" />
                        <span>Status:</span>
                    </div>
                    {[
                        { id: "ALL", label: "All" },
                        { id: "PENDING", label: `Pending (${pendingCount})` },
                        { id: "ACKNOWLEDGED", label: "Acknowledged" }
                    ].map(st => (
                        <button
                            key={st.id}
                            onClick={() => setStatusFilter(st.id as any)}
                            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                                statusFilter === st.id
                                    ? "bg-[#1F5380] text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            {st.label}
                        </button>
                    ))}

                    <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                    <div className="flex items-center space-x-1 text-slate-500 font-bold">
                        <span>Priority:</span>
                    </div>
                    {["ALL", "URGENT", "HIGH", "NORMAL"].map(p => (
                        <button
                            key={p}
                            onClick={() => setPriorityFilter(p as any)}
                            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                                priorityFilter === p
                                    ? "bg-slate-800 text-white shadow-2xs"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <span className="text-xs text-slate-400 font-medium">
                    Showing {filteredAnnouncements.length} records
                </span>
            </div>

            {/* Feed of Notices */}
            {filteredAnnouncements.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
                    <Megaphone className="w-10 h-10 mx-auto stroke-1" />
                    <h3 className="text-sm font-bold text-slate-700">No Announcements Found</h3>
                    <p className="text-xs text-slate-400">
                        {searchQuery ? "No notices matching your search criteria." : `There are no active ${activeTab} announcements right now.`}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAnnouncements.map((item) => {
                        const isAck = item.acknowledgments?.some((ack: any) => ack.userId === currentUserId && ack.isAcknowledged);
                        const priority = (item.priority || "NORMAL").toUpperCase();

                        return (
                            <div
                                key={item.id}
                                className={`bg-white rounded-2xl border p-5 transition-all duration-200 shadow-2xs hover:shadow-xs space-y-3 ${
                                    isAck ? "border-slate-200" : "border-[#1F5380]/30 bg-[#1F5380]/5"
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${
                                            priority === "URGENT"
                                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                                : priority === "HIGH"
                                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        }`}>
                                            {priority} Priority
                                        </span>

                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase">
                                            {item.targetAudience || item.target || "All Staff"}
                                        </span>
                                    </div>

                                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                                        <span className="flex items-center space-x-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span>{new Date(item.createdAt || item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                        </span>
                                        {item.author?.name && (
                                            <span className="font-medium text-slate-600">
                                                From: {item.author.name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <h3 className="text-base font-extrabold text-slate-900">{item.title}</h3>
                                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                        {item.content}
                                    </p>
                                </div>

                                {/* Attachments */}
                                {(() => {
                                    const itemAttachments: Array<{ url: string; name?: string | null }> = [];
                                    if (item.attachmentUrl) {
                                        itemAttachments.push({
                                            url: item.attachmentUrl,
                                            name: item.attachmentName || "Attached Document"
                                        });
                                    }
                                    if (Array.isArray(item.attachments)) {
                                        for (const att of item.attachments) {
                                            if (att && att.url && att.url !== item.attachmentUrl) {
                                                itemAttachments.push(att);
                                            }
                                        }
                                    }

                                    if (itemAttachments.length === 0) return null;

                                    return (
                                        <div className="pt-2 flex flex-wrap gap-2.5">
                                            {itemAttachments.map((att, attIdx) => {
                                                const isImg = isImageUrl(att.url, att.name);
                                                const isPdf = isPdfUrl(att.url, att.name);

                                                if (isPdf) {
                                                    return (
                                                        <div key={attIdx} className="rounded-xl border border-slate-200 bg-slate-50/90 p-2.5 max-w-md w-full flex items-center justify-between gap-3 shadow-2xs">
                                                            <div className="flex items-center space-x-2.5 min-w-0">
                                                                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                                                                    <FileText className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-slate-800 truncate">{att.name || "Document.pdf"}</p>
                                                                    <p className="text-[10px] text-slate-400 font-medium uppercase">PDF Document</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-1.5 shrink-0">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewMedia({ url: att.url, isPdf: true, name: att.name || "PDF Document" })}
                                                                    className="px-2.5 py-1 text-xs font-bold text-[#1F5380] hover:bg-[#1F5380]/10 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    <span>Preview</span>
                                                                </button>
                                                                <a
                                                                    href={att.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="px-2.5 py-1 text-xs font-bold text-white bg-[#1F5380] hover:bg-[#18446b] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                                                                >
                                                                    <span>Open PDF</span>
                                                                    <ExternalLink className="w-3 h-3" />
                                                                </a>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                if (isImg) {
                                                    return (
                                                        <div key={attIdx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 inline-block max-w-xs shadow-2xs">
                                                            <img
                                                                src={att.url}
                                                                alt={att.name || "Attached Image"}
                                                                className="max-h-48 w-auto rounded-xl object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                                                                onClick={() => setPreviewMedia({ url: att.url, isPdf: false, name: att.name || "Image" })}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setPreviewMedia({ url: att.url, isPdf: false, name: att.name || "Image" })}
                                                                className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1 cursor-pointer hover:bg-black"
                                                            >
                                                                <Eye className="w-3 h-3" />
                                                                <span>Full View</span>
                                                            </button>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <a
                                                        key={attIdx}
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center space-x-2 px-3 py-2 bg-slate-50 hover:bg-[#1F5380]/10 border border-slate-200 hover:border-[#1F5380]/40 rounded-xl text-xs font-bold text-slate-700 hover:text-[#1F5380] transition-colors"
                                                    >
                                                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="truncate max-w-[200px]">{att.name || "Download Attachment"}</span>
                                                        <ExternalLink className="w-3 h-3 text-slate-400" />
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                                {/* Footer Action */}
                                <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                                    {isAck ? (
                                        <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                            <CheckCheck className="w-4 h-4 text-emerald-600" />
                                            <span>Receipt Acknowledged</span>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleConfirmReceipt(item.id)}
                                            disabled={acknowledgingId === item.id}
                                            className="flex items-center space-x-2 px-4 py-2 bg-[#1F5380] hover:bg-[#18446b] text-white font-bold rounded-xl text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>{acknowledgingId === item.id ? "Confirming..." : "Confirm Receipt (Acknowledge)"}</span>
                                        </button>
                                    )}

                                    <span className="text-[11px] text-slate-400">
                                        {activeTab === "school" ? "School Administration" : "Department Directorate"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Lightbox / Media Preview Modal */}
            {previewMedia && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-4xl w-full p-4 space-y-3 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-sm font-bold text-slate-800 truncate pr-4">{previewMedia.name || "Attachment Preview"}</h3>
                            <div className="flex items-center space-x-2 shrink-0">
                                <a 
                                    href={previewMedia.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="px-2.5 py-1 hover:bg-slate-100 rounded-lg text-slate-600 flex items-center gap-1 text-xs font-bold"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Open In New Tab</span>
                                </a>
                                <button
                                    onClick={() => setPreviewMedia(null)}
                                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="h-[75vh] overflow-hidden flex items-center justify-center bg-slate-50 rounded-xl">
                            {previewMedia.isPdf ? (
                                <iframe src={previewMedia.url} className="w-full h-full rounded-lg border-0 bg-white" />
                            ) : (
                                <img src={previewMedia.url} alt="Attachment" className="max-h-full max-w-full object-contain" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
