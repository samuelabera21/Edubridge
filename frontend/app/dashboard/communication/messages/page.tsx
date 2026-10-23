"use client";

import { useEffect, useState, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
    MessageSquare, Send, X, ChevronLeft, Trash2, Copy, Check,
    Reply, Edit3, Paperclip, Download, ExternalLink, FileText,
    Share2, Search, ChevronDown, CheckCheck, MoreVertical, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface ContactUser {
    id: string;
    name: string;
    email: string;
    category?: "TEACHER" | "STUDENT" | "PARENT" | "ADMIN";
    role?: { name: string; description?: string };
    detail?: string;
}

interface Message {
    id: string;
    content: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
    isRead: boolean;
    createdAt: string;
    updatedAt?: string;
    sender: ContactUser;
    receiver: ContactUser;
}

type TabCategory = "ALL" | "TEACHER" | "STUDENT" | "PARENT";

export default function MessagesPage() {
    const { authData } = useAuth();
    const currentUserId = authData?.user?.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<ContactUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<ContactUser | null>(null);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [showCompose, setShowCompose] = useState(false);

    // Active Category Filter for conversations/contacts
    const [activeTab, setActiveTab] = useState<TabCategory>("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    // Real-time activity states
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);

    // Message action states
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);

    // Forwarding state
    const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
    const [forwardRecipientId, setForwardRecipientId] = useState<string>("");
    const [forwarding, setForwarding] = useState(false);

    // Toast Notification System
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Action Menu State (WhatsApp / Telegram style popup menu)
    const [activeMenu, setActiveMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        message: Message | null;
    }>({ visible: false, x: 0, y: 0, message: null });

    // Attachment states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachedFile, setAttachedFile] = useState<{ file: File; name: string; size: number; type: string } | null>(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    const chatScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadInitial();
    }, []);

    // Dismiss menu on global click or scroll
    useEffect(() => {
        const handleClickOutside = () => {
            if (activeMenu.visible) {
                setActiveMenu(prev => ({ ...prev, visible: false }));
            }
        };
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [activeMenu.visible]);

    // Real-time polling: refresh active conversation every 4 seconds
    useEffect(() => {
        if (!selectedUser) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetchApi(`/communication/messages?otherUserId=${selectedUser.id}`);
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setConversation(prev => {
                            if (JSON.stringify(prev) !== JSON.stringify(data)) {
                                return data;
                            }
                            return prev;
                        });
                    }
                }
            } catch (_) {}
        }, 4000);

        return () => clearInterval(interval);
    }, [selectedUser?.id]);

    // Scroll to bottom when conversation updates
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [conversation, isPartnerTyping]);

    const loadInitial = async () => {
        try {
            setLoading(true);
            setError(null);

            const [msgRes, usersRes] = await Promise.all([
                fetchApi("/communication/messages"),
                fetchApi("/communication/users")
            ]);

            if (!msgRes.ok) throw new Error("Failed to load messages");
            if (!usersRes.ok) throw new Error("Failed to load contacts directory");

            const msgData = await msgRes.json();
            const usersData = await usersRes.json();

            setMessages(Array.isArray(msgData) ? msgData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (err: any) {
            setError(err.message || "Failed to load messages");
        } finally {
            setLoading(false);
        }
    };

    const openConversation = async (user: ContactUser) => {
        setSelectedUser(user);
        setShowCompose(false);
        setReplyingTo(null);
        setIsPartnerTyping(false);
        try {
            const res = await fetchApi(`/communication/messages?otherUserId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setConversation(Array.isArray(data) ? data : []);
                setMessages(prev => prev.map(m => m.sender.id === user.id ? { ...m, isRead: true } : m));
            }
        } catch (_) {
            setConversation([]);
        }
    };

    const handleSelectAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
            alert("File size exceeds 25MB limit. Please select a smaller file.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        setAttachedFile({
            file,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream"
        });
    };

    const handleRemoveAttachment = () => {
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadFileToStorage = async (fileItem: { file: File; name: string; type: string }): Promise<string> => {
        const presignRes = await fetchApi("/storage/presign", {
            method: "POST",
            body: JSON.stringify({
                fileName: fileItem.name,
                contentType: fileItem.type || "application/octet-stream",
                folder: "messages"
            })
        });

        if (!presignRes.ok) {
            const err = await presignRes.json().catch(() => ({}));
            throw new Error(err.error || "Failed to generate upload URL for attachment");
        }

        const { presignedUrl, publicUrl } = await presignRes.json();

        const uploadRes = await fetch(presignedUrl, {
            method: "PUT",
            headers: {
                "Content-Type": fileItem.type || "application/octet-stream"
            },
            body: fileItem.file
        });

        if (!uploadRes.ok) {
            throw new Error("Failed to upload attached file to storage server.");
        }

        return publicUrl;
    };

    const handleSend = async () => {
        if (!selectedUser || (!newMessage.trim() && !attachedFile)) return;
        setSending(true);
        try {
            let uploadedAttachmentUrl: string | null = null;
            let uploadedAttachmentName: string | null = null;
            let uploadedAttachmentType: string | null = null;

            if (attachedFile) {
                setUploadingAttachment(true);
                try {
                    uploadedAttachmentUrl = await uploadFileToStorage(attachedFile);
                    uploadedAttachmentName = attachedFile.name;
                    uploadedAttachmentType = attachedFile.type;
                } catch (uploadErr: any) {
                    showToast(uploadErr.message || "Failed to upload file");
                    setUploadingAttachment(false);
                    setSending(false);
                    return;
                } finally {
                    setUploadingAttachment(false);
                }
            }

            const baseText = newMessage.trim() || (uploadedAttachmentName ? `Sent an attachment: ${uploadedAttachmentName}` : "");
            const outgoingContent = replyingTo
                ? `> In reply to ${replyingTo.senderName}: "${replyingTo.content.slice(0, 80)}${replyingTo.content.length > 80 ? '...' : ''}"\n\n${baseText}`
                : baseText;

            const res = await fetchApi("/communication/messages", {
                method: "POST",
                body: JSON.stringify({
                    receiverId: selectedUser.id,
                    content: outgoingContent,
                    attachmentUrl: uploadedAttachmentUrl,
                    attachmentName: uploadedAttachmentName,
                    attachmentType: uploadedAttachmentType
                })
            });

            if (res.ok) {
                const msg = await res.json();
                setConversation(prev => [...prev, msg]);
                setMessages(prev => [...prev, msg]);
                setNewMessage("");
                setReplyingTo(null);
                handleRemoveAttachment();
                showToast("Message sent");
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.error || "Failed to send message");
            }
        } catch (_) {
            showToast("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    // Open WhatsApp/Telegram style bubble menu
    const handleOpenMenu = (e: React.MouseEvent, msg: Message) => {
        e.preventDefault();
        e.stopPropagation();

        const x = Math.min(e.clientX, window.innerWidth - 190);
        const y = Math.min(e.clientY, window.innerHeight - 220);

        setActiveMenu({
            visible: true,
            x,
            y,
            message: msg
        });
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied to clipboard");
        } catch (err) {
            showToast("Failed to copy");
        }
    };

    const handleStartReply = (msg: Message) => {
        const isMe = currentUserId ? msg.sender.id === currentUserId : false;
        setReplyingTo({
            id: msg.id,
            senderName: isMe ? "You" : msg.sender.name,
            content: msg.content
        });
    };

    const handleStartEdit = (msg: Message) => {
        setEditingId(msg.id);
        setEditContent(msg.content);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditContent("");
    };

    const handleSaveEdit = async (msgId: string) => {
        if (!editContent.trim()) return;
        setSavingEdit(true);
        try {
            const res = await fetchApi(`/communication/messages/${msgId}`, {
                method: "PATCH",
                body: JSON.stringify({ content: editContent.trim() })
            });
            if (res.ok) {
                const updated = await res.json();
                setConversation(prev => prev.map(m => m.id === msgId ? { ...m, content: updated.content || editContent.trim(), updatedAt: new Date().toISOString() } : m));
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: updated.content || editContent.trim(), updatedAt: new Date().toISOString() } : m));
                setEditingId(null);
                setEditContent("");
                showToast("Message updated");
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.error || "Failed to update message");
            }
        } catch (_) {
            showToast("Failed to update message");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            const res = await fetchApi(`/communication/messages/${msgId}`, { method: "DELETE" });
            if (res.ok) {
                setConversation(prev => prev.map(m => m.id === msgId ? { ...m, content: "[This message was deleted]", attachmentUrl: null, attachmentName: null } : m));
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: "[This message was deleted]", attachmentUrl: null, attachmentName: null } : m));
                if (replyingTo?.id === msgId) setReplyingTo(null);
                showToast("Message deleted");
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.error || "Failed to delete message");
            }
        } catch (_) {
            showToast("Failed to delete message");
        }
    };

    const handleForwardSend = async () => {
        if (!forwardingMsg || !forwardRecipientId) return;
        setForwarding(true);
        try {
            const res = await fetchApi("/communication/messages", {
                method: "POST",
                body: JSON.stringify({
                    receiverId: forwardRecipientId,
                    content: `> Forwarded from ${forwardingMsg.sender.name}:\n${forwardingMsg.content}`,
                    attachmentUrl: forwardingMsg.attachmentUrl || null,
                    attachmentName: forwardingMsg.attachmentName || null,
                    attachmentType: forwardingMsg.attachmentType || null
                })
            });

            if (res.ok) {
                const newMsg = await res.json();
                setMessages(prev => [...prev, newMsg]);
                if (selectedUser?.id === forwardRecipientId) {
                    setConversation(prev => [...prev, newMsg]);
                }
                setForwardingMsg(null);
                setForwardRecipientId("");
                showToast("Message forwarded");
            } else {
                const data = await res.json().catch(() => ({}));
                showToast(data.error || "Failed to forward message");
            }
        } catch (_) {
            showToast("Failed to forward message");
        } finally {
            setForwarding(false);
        }
    };

    const getContactCategory = (u: ContactUser): "TEACHER" | "STUDENT" | "PARENT" | "ADMIN" => {
        if (u.category) return u.category;
        const roleName = u.role?.name?.toUpperCase() || "";
        if (roleName.includes("TEACHER")) return "TEACHER";
        if (roleName.includes("STUDENT")) return "STUDENT";
        if (roleName.includes("PARENT")) return "PARENT";
        return "ADMIN";
    };

    // Build unified directory list combining all school contacts (users) with their message history
    const contactDirectoryItems = (() => {
        const messageMap = new Map<string, { lastMessage: Message; unreadCount: number }>();

        for (const msg of messages) {
            if (!msg?.sender || !msg?.receiver) continue;
            const isMe = currentUserId ? msg.sender.id === currentUserId : false;
            const partnerUser = isMe ? msg.receiver : msg.sender;
            if (!partnerUser?.id) continue;

            const existing = messageMap.get(partnerUser.id);
            const isUnread = !isMe && !msg.isRead;

            if (!existing) {
                messageMap.set(partnerUser.id, {
                    lastMessage: msg,
                    unreadCount: isUnread ? 1 : 0
                });
            } else {
                if (new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
                    existing.lastMessage = msg;
                }
                if (isUnread) {
                    existing.unreadCount += 1;
                }
            }
        }

        const itemMap = new Map<string, { user: ContactUser; lastMessage: Message | null; unreadCount: number }>();

        for (const u of users) {
            if (u.id === currentUserId) continue;
            const history = messageMap.get(u.id);
            itemMap.set(u.id, {
                user: u,
                lastMessage: history?.lastMessage || null,
                unreadCount: history?.unreadCount || 0
            });
        }

        for (const [partnerId, history] of messageMap.entries()) {
            if (!itemMap.has(partnerId)) {
                const partnerMsg = messages.find(m => m.sender.id === partnerId || m.receiver.id === partnerId);
                const partnerObj = partnerMsg?.sender.id === partnerId ? partnerMsg.sender : partnerMsg?.receiver;
                if (partnerObj && partnerObj.id !== currentUserId) {
                    itemMap.set(partnerId, {
                        user: partnerObj,
                        lastMessage: history.lastMessage,
                        unreadCount: history.unreadCount
                    });
                }
            }
        }

        const list = Array.from(itemMap.values());

        list.sort((a, b) => {
            if (a.lastMessage && b.lastMessage) {
                return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
            }
            if (a.lastMessage) return -1;
            if (b.lastMessage) return 1;
            return (a.user.name || "").localeCompare(b.user.name || "");
        });

        return list;
    })();

    const filteredContacts = contactDirectoryItems.filter(({ user }) => {
        const cat = getContactCategory(user);
        if (activeTab !== "ALL" && cat !== activeTab) {
            return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const nameMatch = user.name?.toLowerCase().includes(q);
            const emailMatch = user.email?.toLowerCase().includes(q);
            const detailMatch = user.detail?.toLowerCase().includes(q);
            return Boolean(nameMatch || emailMatch || detailMatch);
        }
        return true;
    });

    const counts = {
        all: contactDirectoryItems.length,
        teacher: contactDirectoryItems.filter(p => getContactCategory(p.user) === "TEACHER").length,
        student: contactDirectoryItems.filter(p => getContactCategory(p.user) === "STUDENT").length,
        parent: contactDirectoryItems.filter(p => getContactCategory(p.user) === "PARENT").length,
    };

    if (loading) return <LoadingState message="Loading messages..." />;

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 text-sm">{error}</p>
                <Button onClick={loadInitial} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-3 text-slate-800">
            {/* Page Header - Clean & Minimal */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-slate-900 leading-tight">Direct Messages</h1>
                        <p className="text-[11px] text-slate-400">Official direct communication channel</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => { setShowCompose(true); setSelectedUser(null); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-1.5 shadow-2xs font-semibold"
                    >
                        New Message
                    </Button>
                </div>
            </div>

            {/* Global Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Main WhatsApp / Telegram Split Panel Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3" style={{ minHeight: "72vh" }}>
                {/* Left Panel: Contacts Directory & Chats (4 cols) */}
                <div className="md:col-span-5 lg:col-span-4 border border-slate-200 rounded-xl overflow-hidden bg-white flex flex-col shadow-2xs">
                    {/* Role Filter Tabs */}
                    <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600">
                        <button
                            type="button"
                            onClick={() => setActiveTab("ALL")}
                            className={`py-2 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                activeTab === "ALL" ? "border-blue-600 text-blue-600 bg-white font-bold" : "border-transparent hover:text-slate-900"
                            }`}
                        >
                            <span>All</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "ALL" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>{counts.all}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("TEACHER")}
                            className={`py-2 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                activeTab === "TEACHER" ? "border-blue-600 text-blue-600 bg-white font-bold" : "border-transparent hover:text-slate-900"
                            }`}
                        >
                            <span>Teachers</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "TEACHER" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>{counts.teacher}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("STUDENT")}
                            className={`py-2 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                activeTab === "STUDENT" ? "border-blue-600 text-blue-600 bg-white font-bold" : "border-transparent hover:text-slate-900"
                            }`}
                        >
                            <span>Students</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "STUDENT" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>{counts.student}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("PARENT")}
                            className={`py-2 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                activeTab === "PARENT" ? "border-blue-600 text-blue-600 bg-white font-bold" : "border-transparent hover:text-slate-900"
                            }`}
                        >
                            <span>Parents</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === "PARENT" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>{counts.parent}</span>
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-100 bg-white">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50"
                            />
                        </div>
                    </div>

                    {/* Contacts & Conversations list */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[62vh]">
                        {filteredContacts.length === 0 ? (
                            <div className="p-8 text-center text-xs text-slate-400">
                                {searchQuery ? "No matching contacts found." : "No contacts in this category."}
                            </div>
                        ) : (
                            filteredContacts.map(({ user, lastMessage, unreadCount }) => {
                                const cat = getContactCategory(user);
                                const isSelected = selectedUser?.id === user.id;

                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => openConversation(user)}
                                        className={`px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-2.5 ${
                                            isSelected ? "bg-blue-50/70 border-l-4 border-l-blue-600" : ""
                                        }`}
                                    >
                                        {/* Avatar with status indicator */}
                                        <div className="relative shrink-0 mt-0.5">
                                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs">
                                                {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
                                            </div>
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
                                                {lastMessage ? (
                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                        {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] text-blue-600 font-medium shrink-0 bg-blue-50 px-1.5 py-0.2 rounded-sm border border-blue-100">
                                                        New
                                                    </span>
                                                )}
                                            </div>

                                            {/* Role badge */}
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm uppercase tracking-wider ${
                                                    cat === "TEACHER" ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60" :
                                                    cat === "STUDENT" ? "bg-sky-50 text-sky-700 border border-sky-200/60" :
                                                    cat === "PARENT" ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                                                    "bg-blue-50 text-blue-700 border border-blue-200/60"
                                                }`}>
                                                    {cat}
                                                </span>
                                                {user.detail && (
                                                    <span className="text-[10px] text-slate-500 truncate">{user.detail}</span>
                                                )}
                                            </div>

                                            {/* Message preview snippet */}
                                            <div className="flex items-center justify-between gap-1 mt-1">
                                                {lastMessage ? (
                                                    <p className={`text-[11px] truncate ${unreadCount > 0 ? "font-semibold text-slate-900" : "text-slate-500"}`}>
                                                        {lastMessage.content}
                                                    </p>
                                                ) : (
                                                    <p className="text-[11px] text-slate-400 italic truncate">
                                                        Tap to start conversation
                                                    </p>
                                                )}
                                                {unreadCount > 0 && (
                                                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                                        {unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Telegram / WhatsApp styled Chat Area (8 cols) */}
                <div className="md:col-span-7 lg:col-span-8 border border-slate-200 rounded-xl bg-white flex flex-col shadow-2xs overflow-hidden">
                    {showCompose ? (
                        /* Compose View */
                        <div className="p-5 flex-1 space-y-4">
                            <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                                <div>
                                    <p className="text-sm font-bold text-slate-900">New Direct Message</p>
                                    <p className="text-xs text-slate-400">Select any teacher, student, or parent to start chatting.</p>
                                </div>
                                <button onClick={() => setShowCompose(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Recipient</label>
                                <select
                                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 bg-white text-slate-800"
                                    onChange={e => {
                                        const u = users.find(u => u.id === e.target.value);
                                        if (u) {
                                            openConversation(u);
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select a teacher, student, or parent...</option>
                                    <optgroup label="Faculty & Teachers">
                                        {users.filter(u => getContactCategory(u) === "TEACHER").map(u => (
                                            <option key={u.id} value={u.id}>{u.name} — {u.detail || u.email}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Enrolled Students">
                                        {users.filter(u => getContactCategory(u) === "STUDENT").map(u => (
                                            <option key={u.id} value={u.id}>{u.name} — {u.detail || u.email}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Parents & Guardians">
                                        {users.filter(u => getContactCategory(u) === "PARENT").map(u => (
                                            <option key={u.id} value={u.id}>{u.name} — {u.detail || u.email}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Message Content</label>
                                <textarea
                                    rows={5}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-3 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                                    placeholder="Write your message here..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCompose(false)}
                                    className="text-xs"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSend}
                                    isLoading={sending}
                                    disabled={!selectedUser || !newMessage.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 text-xs text-white"
                                >
                                    Send Message
                                </Button>
                            </div>
                        </div>
                    ) : selectedUser ? (
                        /* Active Conversation Thread */
                        <>
                            {/* WhatsApp / Telegram Styled Header */}
                            <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="md:hidden text-slate-400 hover:text-slate-600 mr-1"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div className="relative">
                                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs">
                                            {selectedUser.name ? selectedUser.name.slice(0, 2).toUpperCase() : "U"}
                                        </div>
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-slate-900 leading-tight">{selectedUser.name}</p>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm uppercase tracking-wider ${
                                                getContactCategory(selectedUser) === "TEACHER" ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60" :
                                                getContactCategory(selectedUser) === "STUDENT" ? "bg-sky-50 text-sky-700 border border-sky-200/60" :
                                                getContactCategory(selectedUser) === "PARENT" ? "bg-amber-50 text-amber-700 border border-amber-200/60" :
                                                "bg-blue-50 text-blue-700 border border-blue-200/60"
                                            }`}>
                                                {getContactCategory(selectedUser)}
                                            </span>
                                        </div>
                                        {/* Real-time Activity status line */}
                                        <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                                            {isPartnerTyping ? (
                                                <span className="text-blue-600 font-semibold flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                                                    typing...
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Active now {selectedUser.detail ? `• ${selectedUser.detail}` : ""}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => openConversation(selectedUser)}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        title="Refresh messages"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Thread Messages: Telegram / WhatsApp Clean Wallpaper Background */}
                            <div
                                ref={chatScrollRef}
                                className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f8fafc] max-h-[55vh]"
                            >
                                {conversation.length === 0 ? (
                                    <div className="text-center py-12 text-xs text-slate-400">
                                        <p className="font-semibold text-slate-600">No message history yet</p>
                                        <p className="text-[11px] text-slate-400 mt-1">Start your conversation with {selectedUser.name} below.</p>
                                    </div>
                                ) : (
                                    conversation.map(msg => {
                                        const isMe = currentUserId ? msg.sender.id === currentUserId : msg.sender.id !== selectedUser.id;
                                        const isEditing = editingId === msg.id;
                                        const isDeleted = msg.content === "[This message was deleted]";
                                        const isEdited = !isDeleted && Boolean(msg.attachmentType && msg.attachmentType.includes("edited"));
                                        const cleanAttachmentType = (msg.attachmentType || "").replace(";edited", "").replace("edited", "");

                                        // Check if message has reply quote prefix
                                        let replyQuoteSnippet: { author: string; text: string } | null = null;
                                        let cleanBody = msg.content;
                                        if (msg.content.startsWith("> In reply to ")) {
                                            const match = msg.content.match(/^> In reply to ([^:]+): "([^"]+)"\n\n([\s\S]*)$/);
                                            if (match) {
                                                replyQuoteSnippet = { author: match[1], text: match[2] };
                                                cleanBody = match[3];
                                            }
                                        }

                                        return (
                                            <div
                                                key={msg.id}
                                                onContextMenu={e => handleOpenMenu(e, msg)}
                                                className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-1 group relative`}
                                            >
                                                {/* Clean Telegram / WhatsApp Message Bubble */}
                                                <div
                                                    className={`relative max-w-[84%] sm:max-w-md px-3.5 py-2 text-xs shadow-2xs space-y-1 transition-all ${
                                                        isDeleted
                                                            ? "bg-slate-100 border border-slate-200 text-slate-400 italic rounded-2xl"
                                                            : isMe
                                                            ? "bg-blue-600 text-white rounded-2xl rounded-tr-xs"
                                                            : "bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-xs"
                                                    }`}
                                                >
                                                    {/* Hover Action Trigger (WhatsApp/Telegram Chevron) */}
                                                    {!isDeleted && (
                                                        <button
                                                            type="button"
                                                            onClick={e => handleOpenMenu(e, msg)}
                                                            className={`absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer ${
                                                                isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-100 text-slate-500"
                                                            }`}
                                                            title="Message options"
                                                        >
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Reply quote banner if present */}
                                                    {replyQuoteSnippet && !isDeleted && (
                                                        <div className={`border-l-2 rounded px-2 py-1 text-[11px] mb-1 ${
                                                            isMe ? "bg-black/15 border-white/80 text-blue-50" : "bg-blue-50 border-blue-600 text-blue-950"
                                                        }`}>
                                                            <span className="font-bold block text-[10px] opacity-90">{replyQuoteSnippet.author}</span>
                                                            <span className="line-clamp-1 opacity-80">{replyQuoteSnippet.text}</span>
                                                        </div>
                                                    )}

                                                    {/* Inline Editing */}
                                                    {isEditing ? (
                                                        <div className="space-y-1.5 pt-1">
                                                            <textarea
                                                                value={editContent}
                                                                onChange={e => setEditContent(e.target.value)}
                                                                className={`w-full p-2 text-xs rounded-lg border resize-none focus:outline-hidden ${
                                                                    isMe
                                                                        ? "bg-blue-700 text-white border-blue-400"
                                                                        : "bg-white text-slate-800 border-slate-300"
                                                                }`}
                                                                rows={2}
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancelEdit}
                                                                    className="px-2 py-0.5 text-[10px] rounded hover:bg-black/10 transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveEdit(msg.id)}
                                                                    disabled={savingEdit || !editContent.trim()}
                                                                    className="px-2.5 py-0.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded text-[10px] font-bold disabled:opacity-50 transition-colors"
                                                                >
                                                                    {savingEdit ? "Saving..." : "Save"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1 pr-3">
                                                            {/* Text content */}
                                                            {isDeleted ? (
                                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    <span>This message was deleted</span>
                                                                </div>
                                                            ) : (
                                                                <p className="whitespace-pre-wrap break-words leading-relaxed">{cleanBody}</p>
                                                            )}

                                                            {/* Attachment Display */}
                                                            {!isDeleted && msg.attachmentUrl && (
                                                                <div className="pt-1">
                                                                    {(cleanAttachmentType.startsWith("image/") || msg.attachmentUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)) ? (
                                                                        <div className="rounded-lg overflow-hidden border border-current/20 bg-black/10 max-w-xs mt-1">
                                                                            <a
                                                                                href={msg.attachmentUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="block relative group/img"
                                                                            >
                                                                                <img
                                                                                    src={msg.attachmentUrl}
                                                                                    alt={msg.attachmentName || "Attached Image"}
                                                                                    className="max-h-40 w-auto rounded object-contain mx-auto"
                                                                                />
                                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1">
                                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                                    <span>View Full Image</span>
                                                                                </div>
                                                                            </a>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={`p-2 rounded-lg border flex items-center justify-between gap-2.5 text-xs mt-1 ${
                                                                            isMe ? "bg-white/10 border-white/20 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
                                                                        }`}>
                                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                                                <FileText className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                                                                <span className="truncate font-medium text-[11px]">{msg.attachmentName || "Attached Document"}</span>
                                                                            </div>
                                                                            <a
                                                                                href={msg.attachmentUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                download={msg.attachmentName || true}
                                                                                className="px-2 py-0.5 rounded bg-white text-slate-900 font-bold text-[10px] hover:bg-slate-100 flex items-center gap-1 shrink-0 shadow-2xs transition-colors"
                                                                            >
                                                                                <Download className="w-3 h-3 text-blue-600" />
                                                                                <span>Download</span>
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Corner Metadata: Time and WhatsApp/Telegram Read Checkmarks */}
                                                    {!isDeleted && (
                                                        <div className={`flex items-center justify-end gap-1 text-[10px] pt-0.5 select-none ${
                                                            isMe ? "text-blue-100/90" : "text-slate-400"
                                                        }`}>
                                                            {isEdited && <span className="text-[9px] opacity-75">(edited)</span>}
                                                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                                            {isMe && (
                                                                <span title={msg.isRead ? "Read by recipient" : "Delivered"}>
                                                                    {msg.isRead ? (
                                                                        <CheckCheck className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                                                                    ) : (
                                                                        <Check className="w-3.5 h-3.5 text-blue-200/70 shrink-0" />
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {/* Animated Partner Typing Bubble */}
                                {isPartnerTyping && (
                                    <div className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs w-fit shadow-2xs animate-in fade-in">
                                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                                        <span className="text-[11px] text-slate-500 ml-1 font-medium">{selectedUser.name} is typing...</span>
                                    </div>
                                )}
                            </div>

                            {/* Replying Banner (WhatsApp / Telegram style) */}
                            {replyingTo && (
                                <div className="px-3.5 py-1.5 bg-blue-50 border-t border-blue-200 flex items-center justify-between text-xs text-blue-900">
                                    <div className="flex items-center gap-2 overflow-hidden border-l-3 border-blue-600 pl-2">
                                        <div className="truncate">
                                            <span className="font-bold text-[11px] text-blue-700 block">Replying to {replyingTo.senderName}</span>
                                            <span className="text-slate-600 truncate text-[11px]">{replyingTo.content.slice(0, 60)}</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReplyingTo(null)}
                                        className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Attached File Preview */}
                            {attachedFile && (
                                <div className="px-3.5 py-1.5 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Paperclip className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        <div className="truncate">
                                            <span className="font-bold truncate">{attachedFile.name} </span>
                                            <span className="text-[10px] text-slate-500">({(attachedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveAttachment}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleSelectAttachment}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                            />

                            {/* Message Input Box: Clean WhatsApp/Telegram Bar */}
                            <div className="p-2.5 border-t border-slate-200 flex items-center gap-2 bg-white">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={sending || uploadingAttachment}
                                    className={`p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer ${
                                        attachedFile ? "bg-amber-100 text-amber-900" : "hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                                    }`}
                                    title="Attach document or photo"
                                >
                                    <Paperclip className="w-4 h-4" />
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                                    placeholder={replyingTo ? `Replying to ${replyingTo.senderName}...` : "Type a message..."}
                                    className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-slate-50/50 focus:bg-white"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!newMessage.trim() && !attachedFile) || sending || uploadingAttachment}
                                    className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0"
                                    title="Send message"
                                >
                                    <Send className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Empty State */
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-2 bg-slate-50/40">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-1">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">Select a conversation or start a new message</p>
                            <p className="text-xs text-slate-400 text-center max-w-xs">
                                Click on any teacher, student, or parent on the left to start direct communication.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* WhatsApp / Telegram Styled Action Popover Menu */}
            {activeMenu.visible && activeMenu.message && (
                <div
                    style={{ top: `${activeMenu.y}px`, left: `${activeMenu.x}px` }}
                    className="fixed z-50 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-xs text-slate-800 divide-y divide-slate-100 animate-in fade-in zoom-in-95"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="py-1">
                        <button
                            type="button"
                            onClick={() => {
                                handleStartReply(activeMenu.message!);
                                setActiveMenu(prev => ({ ...prev, visible: false }));
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                            <Reply className="w-3.5 h-3.5 text-blue-600" />
                            <span>Reply</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                handleCopy(activeMenu.message!.content);
                                setActiveMenu(prev => ({ ...prev, visible: false }));
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Text</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setForwardingMsg(activeMenu.message!);
                                setActiveMenu(prev => ({ ...prev, visible: false }));
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                        >
                            <Share2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Forward</span>
                        </button>
                    </div>

                    {/* Sender's Own message actions */}
                    {activeMenu.message.sender.id === currentUserId && activeMenu.message.content !== "[This message was deleted]" && (
                        <div className="py-1">
                            <button
                                type="button"
                                onClick={() => {
                                    handleStartEdit(activeMenu.message!);
                                    setActiveMenu(prev => ({ ...prev, visible: false }));
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit Message</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleDeleteMessage(activeMenu.message!.id);
                                    setActiveMenu(prev => ({ ...prev, visible: false }));
                                }}
                                className="w-full px-3 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Message</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Forward Message Modal */}
            {forwardingMsg && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Share2 className="w-4 h-4 text-blue-600" />
                                Forward Message
                            </h3>
                            <button onClick={() => setForwardingMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Message Preview */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                            <p className="font-semibold text-slate-600 text-[11px]">Original Message:</p>
                            <p className="text-slate-800 line-clamp-3">{forwardingMsg.content}</p>
                            {forwardingMsg.attachmentName && (
                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Paperclip className="w-3 h-3" />
                                    <span>Attachment: {forwardingMsg.attachmentName}</span>
                                </p>
                            )}
                        </div>

                        {/* Recipient select */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Forward To</label>
                            <select
                                value={forwardRecipientId}
                                onChange={e => setForwardRecipientId(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-blue-600 bg-white text-slate-800"
                            >
                                <option value="" disabled>Choose a recipient...</option>
                                <optgroup label="Faculty & Teachers">
                                    {users.filter(u => getContactCategory(u) === "TEACHER").map(u => (
                                        <option key={u.id} value={u.id}>{u.name} — {u.detail || u.email}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Enrolled Students">
                                    {users.filter(u => getContactCategory(u) === "STUDENT").map(u => (
                                        <option key={u.id} value={u.id}>{u.name} — {u.detail || u.email}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Parents & Guardians">
                                    {users.filter(u => getContactCategory(u) === "PARENT").map(u => (
                                        <option key={u.id} value={u.id}>{u.name} — {u.detail || u.email}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button
                                variant="outline"
                                onClick={() => setForwardingMsg(null)}
                                className="text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleForwardSend}
                                isLoading={forwarding}
                                disabled={!forwardRecipientId}
                                className="bg-blue-600 hover:bg-blue-700 text-xs text-white"
                            >
                                Forward Now
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
