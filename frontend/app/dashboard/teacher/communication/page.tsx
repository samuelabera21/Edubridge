"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
    MessageSquare,
    Megaphone,
    Users,
    UserCheck,
    Building2,
    GraduationCap,
    Send,
    Search,
    Paperclip,
    FileText,
    CheckCircle2,
    CheckCheck,
    Clock,
    AlertCircle,
    Inbox,
    Filter,
    Sparkles,
    User,
    Shield,
    X,
    ChevronRight,
    ExternalLink,
    RefreshCw
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

type MainTab = "messages" | "announcements";
type MessageChannel = "ALL" | "PARENT" | "STUDENT" | "DEPARTMENT" | "STAFF";

export default function TeacherUnifiedCommunicationPage() {
    const { authData } = useAuth();
    const currentUserId = authData?.user?.id;
    const searchParams = useSearchParams();
    const initialTab = searchParams?.get("tab");

    // Main active tab
    const [activeMainTab, setActiveMainTab] = useState<MainTab>(
        initialTab === "announcements" ? "announcements" : "messages"
    );

    // Channel filter for Messages tab
    const [selectedChannel, setSelectedChannel] = useState<MessageChannel>(
        initialTab === "parent" ? "PARENT" : "ALL"
    );

    // Common Loading & Search states
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // --- Messages State ---
    const [usersList, setUsersList] = useState<any[]>([]);
    const [parentContacts, setParentContacts] = useState<any[]>([]);
    const [messages, setMessages] = useState<any[]>([]);
    const [selectedContact, setSelectedContact] = useState<any | null>(null);
    const [messageText, setMessageText] = useState("");
    const [messageSubject, setMessageSubject] = useState("");
    const [messagePriority, setMessagePriority] = useState<"NORMAL" | "HIGH" | "URGENT">("NORMAL");
    const [sendingMessage, setSendingMessage] = useState(false);
    const [sentStatusMessage, setSentStatusMessage] = useState<string | null>(null);

    // Parent compose specific state
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");

    // --- Announcements State ---
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [announcementFilter, setAnnouncementFilter] = useState<"ALL" | "ACKNOWLEDGED" | "PENDING">("ALL");
    const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
    const [previewMedia, setPreviewMedia] = useState<{ url: string; isPdf?: boolean; name?: string } | null>(null);

    // Load All Necessary Data
    const loadAllData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const [annRes, parentRes, msgRes, usersRes] = await Promise.all([
                fetchApi("/communication/announcements"),
                fetchApi("/communication/teacher/parent-contacts").catch(() => null),
                fetchApi("/communication/messages").catch(() => null),
                fetchApi("/communication/users").catch(() => null)
            ]);

            // 1. Announcements
            if (annRes.ok) {
                const annData = await annRes.json();
                setAnnouncements(Array.isArray(annData) ? annData : []);
            } else {
                setAnnouncements([]);
            }

            // 2. Parent Contacts
            if (parentRes && parentRes.ok) {
                const pData = await parentRes.json();
                const pList = Array.isArray(pData) ? pData : [];
                setParentContacts(pList);
                if (pList.length > 0 && !selectedEnrollmentId) {
                    setSelectedEnrollmentId(pList[0].enrollmentId);
                }
            }

            // 3. Messages
            if (msgRes && msgRes.ok) {
                const mData = await msgRes.json();
                setMessages(Array.isArray(mData) ? mData : []);
            }

            // 4. Messaging Users
            if (usersRes && usersRes.ok) {
                const uData = await usersRes.json();
                setUsersList(Array.isArray(uData) ? uData : []);
            }
        } catch (err) {
            console.error("Failed to load teacher communication data:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedEnrollmentId]);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Update tab / channel from URL if changed
    const channelParam = searchParams?.get("channel")?.toUpperCase();
    useEffect(() => {
        if (channelParam && ["STUDENT", "PARENT", "DEPARTMENT", "STAFF", "ALL"].includes(channelParam)) {
            setSelectedChannel(channelParam as MessageChannel);
        } else if (initialTab === "parent") {
            setSelectedChannel("PARENT");
        }
    }, [channelParam, initialTab]);

    // Handle Confirm Receipt of Announcement
    const handleConfirmReceipt = async (announcementId: string) => {
        try {
            setAcknowledgingId(announcementId);
            const res = await fetchApi(`/communication/announcements/${announcementId}/acknowledge`, {
                method: "POST",
                body: JSON.stringify({})
            });

            if (res.ok) {
                await loadAllData(true);
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

    // Send Parent Message
    const handleSendParentMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEnrollmentId || !messageText.trim()) return;

        try {
            setSendingMessage(true);
            const res = await fetchApi("/communication/teacher/parent-message", {
                method: "POST",
                body: JSON.stringify({
                    enrollmentId: selectedEnrollmentId,
                    content: messageText
                })
            });

            if (res.ok) {
                const contact = parentContacts.find(p => p.enrollmentId === selectedEnrollmentId);
                const targetName = contact ? `${contact.parentName} (${contact.studentName}'s Guardian)` : "Guardian";
                
                // Add to local message list
                setMessages(prev => [
                    {
                        id: `temp-${Date.now()}`,
                        senderId: currentUserId,
                        sender: { name: authData?.user?.name || "Teacher" },
                        recipient: { name: targetName },
                        content: messageText,
                        createdAt: new Date().toISOString()
                    },
                    ...prev
                ]);

                setMessageText("");
                setSentStatusMessage(`Message successfully sent to ${targetName}!`);
                setTimeout(() => setSentStatusMessage(null), 4000);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to send message to parent.");
            }
        } catch (err: any) {
            alert(err.message || "Failed to send message");
        } finally {
            setSendingMessage(false);
        }
    };

    // Send Direct User Message
    const handleSendDirectMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedContact?.id || !messageText.trim()) return;

        try {
            setSendingMessage(true);
            const res = await fetchApi("/communication/messages", {
                method: "POST",
                body: JSON.stringify({
                    recipientId: selectedContact.id,
                    subject: messageSubject || "Direct Communication",
                    content: messageText,
                    priority: messagePriority
                })
            });

            if (res.ok) {
                const newMsg = await res.json();
                setMessages(prev => [newMsg, ...prev]);
                setMessageText("");
                setMessageSubject("");
                setSentStatusMessage(`Message sent to ${selectedContact.name}!`);
                setTimeout(() => setSentStatusMessage(null), 4000);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to send message.");
            }
        } catch (err: any) {
            alert(err.message || "Failed to send direct message.");
        } finally {
            setSendingMessage(false);
        }
    };

    // Filtered Announcements
    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(a => {
            const matchesQuery = !searchQuery.trim() || 
                a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.author?.name?.toLowerCase().includes(searchQuery.toLowerCase());

            const isAck = a.acknowledgments?.some((ack: any) => ack.userId === currentUserId && ack.isAcknowledged);

            if (announcementFilter === "ACKNOWLEDGED") return matchesQuery && isAck;
            if (announcementFilter === "PENDING") return matchesQuery && !isAck;
            return matchesQuery;
        });
    }, [announcements, searchQuery, announcementFilter, currentUserId]);

    // Categorized Contacts List for Messages
    const filteredContacts = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();

        // 1. Parent contacts list
        const formattedParents: Array<{
            id: string;
            type: string;
            enrollmentId?: string;
            name: string;
            subtext: string;
            phone?: string;
            roleName: string;
        }> = parentContacts.map(p => ({
            id: `parent-${p.enrollmentId}`,
            type: "PARENT",
            enrollmentId: p.enrollmentId,
            name: `${p.parentName} (${p.studentName}'s Parent)`,
            subtext: `Grade: ${p.gradeName}${p.sectionName ? ` • Section ${p.sectionName}` : ""}`,
            phone: p.parentPhone,
            roleName: "Parent / Guardian"
        }));

        // 2. School users list categorized
        const formattedUsers = usersList.map(u => {
            let userType = "STAFF";
            const role = (u.role?.name || u.roleName || "").toUpperCase();
            if (role.includes("STUDENT")) userType = "STUDENT";
            else if (role.includes("PARENT")) userType = "PARENT";
            else if (role.includes("TEACHER") || role.includes("DEPARTMENT")) userType = "DEPARTMENT";
            else userType = "STAFF";

            return {
                id: u.id,
                type: userType,
                enrollmentId: undefined as string | undefined,
                name: u.name || u.email,
                subtext: u.email || role,
                phone: undefined as string | undefined,
                roleName: role || "Staff Member"
            };
        });

        const combined = [...formattedParents, ...formattedUsers];

        return combined.filter(c => {
            const matchesType = selectedChannel === "ALL" || c.type === selectedChannel;
            const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.subtext.toLowerCase().includes(q);
            return matchesType && matchesSearch;
        });
    }, [parentContacts, usersList, selectedChannel, searchQuery]);

    // Active conversation messages
    const activeConversationMessages = useMemo(() => {
        if (!selectedContact) {
            return messages.slice(0, 15);
        }
        return messages.filter(m => 
            (m.senderId === selectedContact.id && m.recipientId === currentUserId) ||
            (m.senderId === currentUserId && m.recipientId === selectedContact.id) ||
            (m.recipient?.name?.includes(selectedContact.name))
        );
    }, [messages, selectedContact, currentUserId]);

    const pendingAnnouncementsCount = useMemo(() => {
        return announcements.filter(a => 
            !a.acknowledgments?.some((ack: any) => ack.userId === currentUserId && ack.isAcknowledged)
        ).length;
    }, [announcements, currentUserId]);

    if (loading) {
        return <LoadingState message="Loading teacher communication hub..." />;
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-5 pb-12 font-sans text-slate-800">
            {/* Top Hub Banner */}
            <div className="bg-gradient-to-r from-[#0d2a45] via-[#143e66] to-[#1c558b] text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
                            <MessageSquare className="w-6 h-6 text-amber-300" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">Teacher Communication Hub</h1>
                    </div>
                    <p className="text-xs text-blue-100/90 max-w-2xl">
                        Centralized communications: Send direct messages to Students, Parents, Department heads, and Staff, and view official School Announcements.
                    </p>
                </div>

                <button
                    onClick={() => loadAllData(true)}
                    disabled={refreshing}
                    className="self-start md:self-auto flex items-center space-x-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                    <span>{refreshing ? "Syncing..." : "Refresh"}</span>
                </button>
            </div>

            {/* Primary Tab Switcher */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5 rounded-xl shadow-2xs">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => {
                            setActiveMainTab("messages");
                            setSearchQuery("");
                        }}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                            activeMainTab === "messages"
                                ? "bg-[#143e66] text-amber-300 shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>Messages & Channels</span>
                        <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            activeMainTab === "messages" ? "bg-amber-400 text-slate-900" : "bg-slate-200 text-slate-700"
                        }`}>
                            {filteredContacts.length}
                        </span>
                    </button>

                    <button
                        onClick={() => {
                            setActiveMainTab("announcements");
                            setSearchQuery("");
                        }}
                        className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                            activeMainTab === "announcements"
                                ? "bg-[#143e66] text-amber-300 shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                        }`}
                    >
                        <Megaphone className="w-4 h-4" />
                        <span>School Announcements</span>
                        {pendingAnnouncementsCount > 0 ? (
                            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                                {pendingAnnouncementsCount} New
                            </span>
                        ) : (
                            <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                activeMainTab === "announcements" ? "bg-amber-400 text-slate-900" : "bg-slate-200 text-slate-700"
                            }`}>
                                {announcements.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Quick Search */}
                <div className="relative w-64 hidden sm:block">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={activeMainTab === "messages" ? "Search contacts or messages..." : "Search announcements..."}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Notification Alert if Message Sent */}
            {sentStatusMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-2xs animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{sentStatusMessage}</span>
                </div>
            )}

            {/* TAB 1: MESSAGES & CHANNELS */}
            {activeMainTab === "messages" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* Channel Selector & Contacts Sidebar (4 cols) */}
                    <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-[580px]">
                        {/* Channel Filter Pills */}
                        <div className="p-3 border-b border-slate-100 bg-slate-50/70 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>Channels & Audiences</span>
                                <span>{filteredContacts.length} Contacts</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-xs">
                                {[
                                    { id: "ALL", label: "All", icon: Users },
                                    { id: "PARENT", label: "Parents", icon: UserCheck },
                                    { id: "STUDENT", label: "Students", icon: GraduationCap },
                                    { id: "DEPARTMENT", label: "Department", icon: Building2 },
                                    { id: "STAFF", label: "School Staff", icon: Shield }
                                ].map(ch => {
                                    const Icon = ch.icon;
                                    const isSelected = selectedChannel === ch.id;
                                    return (
                                        <button
                                            key={ch.id}
                                            onClick={() => setSelectedChannel(ch.id as MessageChannel)}
                                            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                isSelected
                                                    ? "bg-[#143e66] text-white shadow-2xs"
                                                    : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/80"
                                            }`}
                                        >
                                            <Icon className="w-3 h-3" />
                                            <span>{ch.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Contacts List */}
                        <div className="flex-1 overflow-y-auto max-h-[460px] divide-y divide-slate-100">
                            {filteredContacts.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 space-y-2">
                                    <Inbox className="w-8 h-8 mx-auto stroke-1" />
                                    <p className="text-xs font-semibold">No contacts found in this channel.</p>
                                </div>
                            ) : (
                                filteredContacts.map((contact, idx) => {
                                    const isSelected = selectedContact?.id === contact.id;
                                    return (
                                        <button
                                            key={contact.id || idx}
                                            onClick={() => {
                                                setSelectedContact(contact);
                                                if (contact.enrollmentId) {
                                                    setSelectedEnrollmentId(contact.enrollmentId);
                                                }
                                            }}
                                            className={`w-full p-3.5 text-left flex items-center justify-between transition-colors ${
                                                isSelected
                                                    ? "bg-blue-50/80 border-l-4 border-blue-600 text-blue-900"
                                                    : "hover:bg-slate-50 text-slate-800"
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3 overflow-hidden">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                                    contact.type === "PARENT"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : contact.type === "STUDENT"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : contact.type === "DEPARTMENT"
                                                        ? "bg-purple-100 text-purple-800"
                                                        : "bg-blue-100 text-blue-800"
                                                }`}>
                                                    {contact.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-xs font-bold truncate">{contact.name}</p>
                                                    <p className="text-[11px] text-slate-400 truncate">{contact.subtext}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0 ml-2">
                                                {contact.type}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Compose & Conversation Workspace (8 cols) */}
                    <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col min-h-[580px] overflow-hidden">
                        {/* Selected Contact Header */}
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100/60 rounded-xl text-blue-700">
                                    <User className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">
                                        {selectedContact ? selectedContact.name : "Broadcast / Direct Message"}
                                    </h2>
                                    <p className="text-xs text-slate-500">
                                        {selectedContact ? selectedContact.roleName || selectedContact.subtext : "Select a contact from the left or compose below"}
                                    </p>
                                </div>
                            </div>

                            {selectedContact?.type === "PARENT" && (
                                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">
                                    Parent / Guardian Channel
                                </span>
                            )}
                        </div>

                        {/* Recent Thread / Message History */}
                        <div className="flex-1 p-4 overflow-y-auto max-h-[300px] space-y-3 bg-slate-50/30">
                            {activeConversationMessages.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 space-y-1">
                                    <MessageSquare className="w-8 h-8 mx-auto stroke-1" />
                                    <p className="text-xs font-medium">No previous messages in this conversation.</p>
                                    <p className="text-[11px] text-slate-400">Compose a message below to start communicating.</p>
                                </div>
                            ) : (
                                activeConversationMessages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUserId;
                                    return (
                                        <div
                                            key={msg.id || idx}
                                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                                        >
                                            <div className={`max-w-lg p-3.5 rounded-2xl text-xs space-y-1 shadow-2xs ${
                                                isMe
                                                    ? "bg-[#143e66] text-white rounded-br-xs"
                                                    : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs"
                                            }`}>
                                                <div className="flex items-center justify-between space-x-3 text-[10px] opacity-75 font-semibold">
                                                    <span>{isMe ? "You" : (msg.sender?.name || "Recipient")}</span>
                                                    <span>{new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Message Composer Form */}
                        <div className="p-4 border-t border-slate-200 bg-white">
                            <form
                                onSubmit={selectedContact?.type === "PARENT" ? handleSendParentMessage : handleSendDirectMessage}
                                className="space-y-3"
                            >
                                {/* If Parent: Quick Dropdown of students if none selected */}
                                {selectedContact?.type === "PARENT" && parentContacts.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Select Guardian</label>
                                        <select
                                            value={selectedEnrollmentId}
                                            onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                                            className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                                        >
                                            {parentContacts.map((p, i) => (
                                                <option key={p.enrollmentId || i} value={p.enrollmentId}>
                                                    {p.studentName} — {p.gradeName}{p.sectionName ? ` (${p.sectionName})` : ""} — Parent: {p.parentName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* If Staff / Direct message: Optional Subject and Priority */}
                                {selectedContact?.type !== "PARENT" && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <input
                                            type="text"
                                            placeholder="Subject / Topic (Optional)..."
                                            value={messageSubject}
                                            onChange={(e) => setMessageSubject(e.target.value)}
                                            className="sm:col-span-2 p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white"
                                        />
                                        <select
                                            value={messagePriority}
                                            onChange={(e) => setMessagePriority(e.target.value as any)}
                                            className="p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 font-semibold"
                                        >
                                            <option value="NORMAL">Normal Priority</option>
                                            <option value="HIGH">High Priority</option>
                                            <option value="URGENT">Urgent Action</option>
                                        </select>
                                    </div>
                                )}

                                {/* Quick Templates */}
                                <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                        <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Templates:
                                    </span>
                                    {[
                                        "Attendance follow-up inquiry",
                                        "Commendable classroom participation",
                                        "Upcoming assignment reminder",
                                        "Request short discussion / meeting"
                                    ].map((tpl, i) => (
                                        <button
                                            type="button"
                                            key={i}
                                            onClick={() => setMessageText(tpl)}
                                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-medium transition-colors"
                                        >
                                            {tpl}
                                        </button>
                                    ))}
                                </div>

                                {/* Textarea and Submit */}
                                <div className="flex gap-2">
                                    <textarea
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        placeholder={
                                            selectedContact 
                                                ? `Type your message to ${selectedContact.name}...` 
                                                : "Type your message here..."
                                        }
                                        className="flex-1 p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none h-20"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={sendingMessage || !messageText.trim() || (!selectedContact && !selectedEnrollmentId)}
                                        className="px-4 bg-[#143e66] hover:bg-[#1a4f82] text-amber-300 font-bold rounded-xl disabled:opacity-50 transition-all flex flex-col items-center justify-center gap-1 shadow-xs shrink-0 active:scale-95"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span className="text-[11px]">{sendingMessage ? "Sending..." : "Send"}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: SCHOOL ANNOUNCEMENTS */}
            {activeMainTab === "announcements" && (
                <div className="space-y-4">
                    {/* Filter Badges */}
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs shadow-2xs">
                        <div className="flex items-center space-x-2">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-bold text-slate-700">Filter Notices:</span>
                            <div className="flex items-center space-x-1">
                                {[
                                    { id: "ALL", label: `All (${announcements.length})` },
                                    { id: "PENDING", label: `Pending Acknowledgment (${pendingAnnouncementsCount})` },
                                    { id: "ACKNOWLEDGED", label: "Confirmed / Acknowledged" }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setAnnouncementFilter(f.id as any)}
                                        className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                                            announcementFilter === f.id
                                                ? "bg-[#143e66] text-white shadow-2xs"
                                                : "text-slate-600 hover:bg-slate-100"
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                            Showing {filteredAnnouncements.length} notices
                        </span>
                    </div>

                    {/* Announcement Cards Feed */}
                    {filteredAnnouncements.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
                            <Megaphone className="w-10 h-10 mx-auto stroke-1" />
                            <h3 className="text-sm font-bold text-slate-700">No Announcements Found</h3>
                            <p className="text-xs text-slate-400">
                                {searchQuery ? "No announcements matching your search criteria." : "There are currently no active administrative notices."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {filteredAnnouncements.map((item) => {
                                const isAck = item.acknowledgments?.some((ack: any) => ack.userId === currentUserId && ack.isAcknowledged);
                                const priority = (item.priority || "NORMAL").toUpperCase();

                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-white rounded-2xl border p-5 transition-all duration-200 shadow-2xs hover:shadow-xs space-y-3 ${
                                            isAck ? "border-slate-200" : "border-amber-300/80 bg-amber-50/10"
                                        }`}
                                    >
                                        {/* Announcement Header */}
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
                                                    Target: {item.targetAudience || item.target || "Faculty & Staff"}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-3 text-xs text-slate-400">
                                                <span className="flex items-center space-x-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{new Date(item.createdAt || item.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                                                </span>
                                                {item.author?.name && (
                                                    <span className="font-medium text-slate-600">
                                                        By: {item.author.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Title & Content */}
                                        <div className="space-y-1.5">
                                            <h3 className="text-base font-extrabold text-slate-900">{item.title}</h3>
                                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                {item.content}
                                            </p>
                                        </div>

                                        {/* Attachments if any */}
                                        {item.attachments && Array.isArray(item.attachments) && item.attachments.length > 0 && (
                                            <div className="pt-2 flex flex-wrap gap-2">
                                                {item.attachments.map((att: any, attIdx: number) => {
                                                    const isImg = isImageUrl(att.url, att.name);
                                                    const isPdf = isPdfUrl(att.url, att.name);
                                                    return (
                                                        <button
                                                            key={attIdx}
                                                            type="button"
                                                            onClick={() => setPreviewMedia({ url: att.url, isPdf, name: att.name })}
                                                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                                                        >
                                                            <Paperclip className="w-3 h-3 text-slate-400" />
                                                            <span>{att.name || `Attachment ${attIdx + 1}`}</span>
                                                            <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Acknowledgment Action Footer */}
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
                                                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span>{acknowledgingId === item.id ? "Confirming..." : "Confirm Receipt (Acknowledge)"}</span>
                                                </button>
                                            )}

                                            <span className="text-[11px] text-slate-400">
                                                Official School Communication
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Lightbox / Media Preview Modal */}
            {previewMedia && (
                <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-3xl w-full p-4 space-y-3 shadow-2xl relative">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-sm font-bold text-slate-800">{previewMedia.name || "Attachment Preview"}</h3>
                            <button
                                onClick={() => setPreviewMedia(null)}
                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="max-h-[70vh] overflow-auto flex items-center justify-center">
                            {previewMedia.isPdf ? (
                                <iframe src={previewMedia.url} className="w-full h-96 rounded-lg" />
                            ) : (
                                <img src={previewMedia.url} alt="Attachment" className="max-h-96 rounded-lg object-contain" />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
