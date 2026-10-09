"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
    Megaphone,
    Bell,
    Paperclip,
    FileText,
    ExternalLink,
    CheckCircle2,
    Clock,
    CheckCheck,
    Loader2,
    Search,
    X,
    Inbox
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

export default function TeacherStaffCommunicationPage() {
    const { authData } = useAuth();
    const currentUserId = authData?.user?.id;

    const [activeTab, setActiveTab] = useState<"announcements" | "notifications">("announcements");
    const [loading, setLoading] = useState(true);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Full screen Lightbox
    const [previewMedia, setPreviewMedia] = useState<{ url: string; isPdf?: boolean; name?: string } | null>(null);

    // Confirmation action
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [annRes, notifRes] = await Promise.all([
                fetchApi("/communication/announcements"),
                fetchApi("/communication/notifications")
            ]);

            if (annRes.ok) {
                const annData = await annRes.json();
                setAnnouncements(Array.isArray(annData) ? annData : []);
            } else {
                setAnnouncements([]);
            }

            if (notifRes.ok) {
                const notifData = await notifRes.json();
                setNotifications(Array.isArray(notifData) ? notifData : []);
            } else {
                setNotifications([]);
            }
        } catch (err) {
            console.error("Failed to load teacher communication data:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Handle Confirm Receipt
    const handleConfirmReceipt = async (announcementId: string) => {
        try {
            setAcknowledgingId(announcementId);
            const res = await fetchApi(`/communication/announcements/${announcementId}/acknowledge`, {
                method: "POST",
                body: JSON.stringify({})
            });

            if (res.ok) {
                await loadData();
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

    // Mark notification as read
    const handleMarkNotificationRead = async (id: string) => {
        try {
            await fetchApi(`/communication/notifications/${id}/read`, { method: "PATCH" });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (err) {
            console.error("Failed to mark notification read:", err);
        }
    };

    const filteredAnnouncements = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return announcements;
        return announcements.filter(a =>
            a.title?.toLowerCase().includes(q) ||
            a.content?.toLowerCase().includes(q) ||
            a.author?.name?.toLowerCase().includes(q)
        );
    }, [announcements, searchQuery]);

    const unreadNotifCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    if (loading) return <LoadingState message="Loading teacher communications..." />;

    return (
        <div className="max-w-3xl mx-auto space-y-4 font-sans text-slate-800 pb-16">
            {/* Simple Clean Header */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-emerald-600" />
                    <h1 className="text-lg font-bold text-slate-900">Faculty & Staff Announcements</h1>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setActiveTab("announcements")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "announcements"
                                ? "bg-white text-emerald-700 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <span>Announcements ({announcements.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("notifications")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === "notifications"
                                ? "bg-white text-emerald-700 shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Notifications</span>
                        {unreadNotifCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full text-3xs font-black bg-rose-500 text-white">
                                {unreadNotifCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Announcements View */}
            {activeTab === "announcements" && (
                <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search announcements..."
                            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl shadow-xs focus:ring-1 focus:ring-emerald-600 focus:outline-none"
                        />
                    </div>

                    {filteredAnnouncements.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                            <Inbox className="w-8 h-8 mx-auto text-slate-300" />
                            <p className="font-bold text-slate-800 text-sm">No announcements at this time</p>
                            <p className="text-xs text-slate-400">All announcements from administration will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAnnouncements.map((item) => {
                                // Find acknowledgment record for this teacher user
                                const ack = (item.acknowledgments || []).find((a: any) => a.userId === currentUserId) || item.viewerAcknowledgment;
                                const isConfirmed = !!ack?.isAcknowledged;
                                const hasImage = isImageUrl(item.attachmentUrl, item.attachmentName);
                                const hasPdf = isPdfUrl(item.attachmentUrl, item.attachmentName);

                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-white rounded-2xl border p-5 shadow-xs transition-all space-y-3.5 ${
                                            !isConfirmed 
                                                ? "border-emerald-300 ring-1 ring-emerald-500/20" 
                                                : "border-slate-200"
                                        }`}
                                    >
                                        {/* Header Row: Author/Date + Status */}
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-semibold text-slate-800">{item.author?.name || "Administration"}</span>
                                                <span>•</span>
                                                <span>{new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                                            </div>

                                            {isConfirmed ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>Confirmed</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                    <span>Action Required</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Announcement Title & Content */}
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
                                            {item.content && (
                                                <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed mt-1">
                                                    {item.content}
                                                </p>
                                            )}
                                        </div>

                                        {/* Direct Preview - Embedded Directly */}
                                        {item.attachmentUrl && (
                                            <div className="pt-1">
                                                {hasImage ? (
                                                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 inline-block max-w-full">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={item.attachmentUrl}
                                                            alt={item.attachmentName || "Attached Image"}
                                                            className="max-h-80 w-auto rounded-xl object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                                                            onClick={() => setPreviewMedia({ url: item.attachmentUrl, isPdf: false, name: item.attachmentName })}
                                                        />
                                                        <div
                                                            onClick={() => setPreviewMedia({ url: item.attachmentUrl, isPdf: false, name: item.attachmentName })}
                                                            className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/70 text-white text-3xs font-bold backdrop-blur-xs flex items-center gap-1 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                            <span>Full View</span>
                                                        </div>
                                                    </div>
                                                ) : hasPdf ? (
                                                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                                                        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100/90 border-b border-slate-200 text-xs font-semibold text-slate-700">
                                                            <span className="flex items-center gap-1.5 truncate">
                                                                <FileText className="w-4 h-4 text-rose-600 shrink-0" />
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
                                                            className="w-full h-80 border-0 bg-white"
                                                        />
                                                    </div>
                                                ) : (
                                                    <a
                                                        href={item.attachmentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors"
                                                    >
                                                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                                                        <span>{item.attachmentName || "Download Attachment"}</span>
                                                        <ExternalLink className="w-3 h-3 text-blue-500" />
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {/* Bottom Action / Confirmation */}
                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                            {isConfirmed ? (
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                    <CheckCheck className="w-4 h-4 text-emerald-600" />
                                                    <span>Confirmed on {new Date(ack?.acknowledgedAt || ack?.updatedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                                </div>
                                            ) : (
                                                <div className="w-full flex items-center justify-between gap-3">
                                                    <span className="text-xs text-slate-500">Please confirm receipt of this update</span>
                                                    <button
                                                        type="button"
                                                        disabled={acknowledgingId === item.id}
                                                        onClick={() => handleConfirmReceipt(item.id)}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {acknowledgingId === item.id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <CheckCheck className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>Confirm Receipt</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Notifications View */}
            {activeTab === "notifications" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 space-y-2">
                            <Bell className="w-8 h-8 mx-auto text-slate-300" />
                            <p className="font-bold text-slate-800 text-sm">No notifications yet</p>
                            <p className="text-xs">You have no unread notifications.</p>
                        </div>
                    ) : (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                onClick={() => !n.isRead && handleMarkNotificationRead(n.id)}
                                className={`p-4 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                                    !n.isRead ? "bg-emerald-50/40 hover:bg-emerald-50/70" : "hover:bg-slate-50"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-xl shrink-0 ${
                                        !n.isRead ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                    }`}>
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                                            {!n.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-600 mt-0.5">{n.content}</p>
                                        <span className="text-3xs text-slate-400 mt-1 block">
                                            {new Date(n.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {!n.isRead && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkNotificationRead(n.id);
                                        }}
                                        className="text-2xs font-semibold text-emerald-700 hover:text-emerald-900 shrink-0"
                                    >
                                        Mark Read
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Media Lightbox Modal */}
            {previewMedia && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in"
                    onClick={() => setPreviewMedia(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden p-4 shadow-2xl w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-800 truncate">{previewMedia.name || "Attachment Preview"}</span>
                            <button onClick={() => setPreviewMedia(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {previewMedia.isPdf ? (
                            <iframe
                                src={previewMedia.url}
                                title="PDF Preview"
                                className="w-full h-[70vh] rounded-xl border border-slate-200"
                            />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={previewMedia.url}
                                alt="Preview"
                                className="max-h-[70vh] w-auto object-contain rounded-xl mx-auto"
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
