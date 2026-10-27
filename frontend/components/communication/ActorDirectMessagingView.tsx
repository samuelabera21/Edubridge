"use client";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
    MessageSquare, Send, X, ChevronLeft, Trash2, Copy, Check,
    Reply, Edit3, Paperclip, Download, ExternalLink, FileText,
    CheckCheck, Lock, RefreshCw, ChevronDown, Clock, Search,
    UserCheck, Users, Eye
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export interface ContactUser {
    id: string;
    name: string;
    email: string;
    category?: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
    role?: { name: string; description?: string };
    detail?: string;
    lastMessage?: string;
    lastMessageTime?: string;
}

export interface DirectMessage {
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

interface ActorDirectMessagingViewProps {
    actorRole: "TEACHER" | "STUDENT" | "PARENT";
    portalTitle: string;
    portalDescription: string;
    toggleKey: "allowTeacherDM" | "allowStudentDM" | "allowParentDM";
}

export default function ActorDirectMessagingView({
    actorRole,
    portalTitle,
    portalDescription,
    toggleKey,
}: ActorDirectMessagingViewProps) {
    const { authData } = useAuth();
    const currentUserId = authData?.user?.id;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Permission state
    const [isMessagingAllowed, setIsMessagingAllowed] = useState(true);

    // Contacts and active conversation
    const [users, setUsers] = useState<ContactUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<ContactUser | null>(null);
    const [conversation, setConversation] = useState<DirectMessage[]>([]);

    // Search and category tab filter
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<string>("ALL");

    // Composer state
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);

    // Simulated real-time typing indicator
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);

    // Attachment & Document Preview state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachedFile, setAttachedFile] = useState<{ file: File; name: string; size: number; type: string } | null>(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type?: string } | null>(null);

    // Toast notification
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Right-Click Context Menu State
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        message: DirectMessage | null;
    }>({ visible: false, x: 0, y: 0, message: null });

    const chatScrollRef = useRef<HTMLDivElement>(null);

    // Dismiss context menu on global click or scroll
    useEffect(() => {
        const handleClickOutside = () => {
            if (contextMenu.visible) {
                setContextMenu(prev => ({ ...prev, visible: false }));
            }
        };
        window.addEventListener("click", handleClickOutside);
        return () => window.removeEventListener("click", handleClickOutside);
    }, [contextMenu.visible]);

    // Scroll to bottom on conversation change
    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [conversation, isPartnerTyping]);

    const openConversationWith = useCallback(async (contact: ContactUser, silent = false) => {
        if (!silent) setSelectedUser(contact);
        try {
            const res = await fetchApi(`/communication/messages?otherUserId=${contact.id}`);
            if (res.ok) {
                const data: DirectMessage[] = await res.json();
                setConversation(Array.isArray(data) ? data : []);
            }
        } catch (_) {
            if (!silent) setConversation([]);
        }
    }, []);

    const loadInitial = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const [usersRes, settingsRes] = await Promise.all([
                fetchApi("/communication/users"),
                fetchApi("/communication/messaging-settings")
            ]);

            if (!usersRes.ok) throw new Error("Failed to load contacts for messaging");
            const usersData: ContactUser[] = await usersRes.json();
            const contactList = Array.isArray(usersData) ? usersData : [];
            setUsers(contactList);

            if (settingsRes.ok) {
                const settings = await settingsRes.json();
                setIsMessagingAllowed(Boolean(settings[toggleKey]));
            }

            // Auto-select first contact
            if (contactList.length > 0) {
                setSelectedUser(contactList[0]);
                await openConversationWith(contactList[0]);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load messages");
        } finally {
            setLoading(false);
        }
    }, [openConversationWith, toggleKey]);

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    // Live auto-polling synchronization every 4 seconds
    useEffect(() => {
        if (!selectedUser) return;
        const interval = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
                openConversationWith(selectedUser, true);
            }
        }, 4000);
        return () => clearInterval(interval);
    }, [selectedUser, openConversationWith]);

    // Read tab query parameter from URL if provided
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get("tab")?.toUpperCase();
            if (tabParam) {
                if (tabParam === "TEACHERS" || tabParam === "TEACHER") setActiveTab("TEACHER");
                else if (tabParam === "STUDENTS" || tabParam === "STUDENT" || tabParam === "CHILDREN") setActiveTab("STUDENT");
                else if (tabParam === "PARENTS" || tabParam === "PARENT") setActiveTab("PARENT");
                else if (tabParam === "ADMIN" || tabParam === "ADMINS" || tabParam === "SCHOOL_ADMIN") setActiveTab("ADMIN");
            }
        }
    }, []);

    // Dynamic tabs based on current actor matching School Messaging tab layout
    const categoryTabs = useMemo(() => {
        if (actorRole === "PARENT") {
            return [
                { id: "ALL", label: "All" },
                { id: "TEACHER", label: "Teachers" },
                { id: "STUDENT", label: "Children" },
                { id: "ADMIN", label: "Admin" }
            ];
        } else if (actorRole === "STUDENT") {
            return [
                { id: "ALL", label: "All" },
                { id: "TEACHER", label: "Teachers" },
                { id: "PARENT", label: "Parents" },
                { id: "ADMIN", label: "Admin" }
            ];
        } else {
            return [
                { id: "ALL", label: "All" },
                { id: "STUDENT", label: "Students" },
                { id: "PARENT", label: "Parents" },
                { id: "ADMIN", label: "Admin" }
            ];
        }
    }, [actorRole]);

    // Filter contacts by active category tab and search query
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesCategory = activeTab === "ALL" || (u.category || "ADMIN") === activeTab;
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q ||
                u.name.toLowerCase().includes(q) ||
                (u.detail && u.detail.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q));
            return matchesCategory && matchesSearch;
        });
    }, [users, activeTab, searchQuery]);

    const getCountForTab = (tabId: string) => {
        if (tabId === "ALL") return users.length;
        return users.filter(u => (u.category || "ADMIN") === tabId).length;
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
        if (!isMessagingAllowed) {
            showToast("Messaging is currently disabled by your school administration.");
            return;
        }
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
                setNewMessage("");
                setReplyingTo(null);
                handleRemoveAttachment();
                showToast("Message delivered");
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

    const handleContextMenu = (e: React.MouseEvent, msg: DirectMessage) => {
        e.preventDefault();
        e.stopPropagation();

        const x = Math.min(e.clientX, window.innerWidth - 180);
        const y = Math.min(e.clientY, window.innerHeight - 200);

        setContextMenu({
            visible: true,
            x,
            y,
            message: msg
        });
    };

    const handleCopy = async (text: string) => {
        try {
            const clean = text.replace(/^> In reply to [^\n]+\n\n/, "");
            await navigator.clipboard.writeText(clean);
            showToast("Copied to clipboard");
        } catch (_) {
            showToast("Failed to copy");
        }
    };

    const handleStartReply = (msg: DirectMessage) => {
        const isMe = currentUserId ? msg.sender.id === currentUserId : false;
        const clean = msg.content.replace(/^> In reply to [^\n]+\n\n/, "");
        setReplyingTo({
            id: msg.id,
            senderName: isMe ? "You" : msg.sender.name,
            content: clean
        });
    };

    const handleStartEdit = (msg: DirectMessage) => {
        const clean = msg.content.replace(/^> In reply to [^\n]+\n\n/, "");
        setEditingId(msg.id);
        setEditContent(clean);
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
                setConversation(prev => prev.map(m => m.id === msgId ? {
                    ...m,
                    content: updated.content || editContent.trim(),
                    attachmentType: (m.attachmentType || "") + ";edited"
                } : m));
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
                setConversation(prev => prev.map(m => m.id === msgId ? {
                    ...m,
                    content: "[This message was deleted]",
                    attachmentUrl: null,
                    attachmentName: null
                } : m));
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

    const getRoleBadgeStyle = (category?: string) => {
        switch (category) {
            case "TEACHER":
                return "bg-indigo-50 text-indigo-700 border-indigo-200/60";
            case "STUDENT":
                return "bg-sky-50 text-sky-700 border-sky-200/60";
            case "PARENT":
                return "bg-amber-50 text-amber-700 border-amber-200/60";
            default:
                return "bg-blue-50 text-blue-700 border-blue-200/60";
        }
    };

    if (loading) return <LoadingState message="Loading messaging center..." />;

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-rose-600 text-xs sm:text-sm font-semibold">{error}</p>
                <Button onClick={loadInitial} className="mt-4 text-xs bg-[#4085b3] hover:bg-[#32698e] text-white">Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-3 text-slate-800 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#4085b3]/15 text-[#4085b3] border border-[#4085b3]/30 flex items-center justify-center">
                            <MessageSquare className="w-4 h-4" />
                        </div>
                        {portalTitle}
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        {portalDescription}
                    </p>
                </div>
            </div>

            {/* Read-Only Status Banner if disabled by school admin */}
            {!isMessagingAllowed && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5 animate-in fade-in">
                    <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Direct messaging is currently restricted by school administration. You can view all past messages below.</span>
                </div>
            )}

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Master-Detail Telegram / WhatsApp Messaging Interface */}
            <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12" style={{ height: "72vh" }}>
                
                {/* ─── LEFT PANEL: Contacts & Channels (4 cols) ─── */}
                <div className={`md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col bg-white ${selectedUser ? "hidden md:flex" : "flex"}`}>
                    
                    {/* Role Filter Tabs (identical to School Admin messaging page) */}
                    <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600 shrink-0">
                        {categoryTabs.map(tab => {
                            const count = getCountForTab(tab.id);
                            const isCurrent = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-2 text-center border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                                        isCurrent ? "border-[#4085b3] text-[#4085b3] bg-white font-bold" : "border-transparent hover:text-slate-900"
                                    }`}
                                >
                                    <span className="truncate">{tab.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isCurrent ? "bg-[#4085b3]/15 text-[#4085b3]" : "bg-slate-200 text-slate-600"}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-100 bg-white shrink-0">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] bg-slate-50/50"
                            />
                        </div>
                    </div>

                    {/* Contacts List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                <p className="font-semibold text-slate-600">No contacts found</p>
                                <p className="text-[11px] mt-0.5">Try searching with a different term or tab.</p>
                            </div>
                        ) : (
                            filteredUsers.map(u => {
                                const isSelected = selectedUser?.id === u.id;
                                const category = u.category || "ADMIN";
                                return (
                                    <button
                                        key={u.id}
                                        type="button"
                                        onClick={() => openConversationWith(u)}
                                        className={`w-full px-3 py-2.5 text-left transition-colors flex items-start gap-2.5 cursor-pointer ${
                                            isSelected
                                                ? "bg-[#4085b3]/10 border-l-4 border-l-[#4085b3]"
                                                : "hover:bg-slate-50"
                                        }`}
                                    >
                                        {/* Avatar with status indicator */}
                                        <div className="relative shrink-0 mt-0.5">
                                            <div className="w-9 h-9 rounded-full bg-[#4085b3]/15 text-[#4085b3] border border-[#4085b3]/30 flex items-center justify-center font-bold text-xs">
                                                {u.name ? u.name.slice(0, 2).toUpperCase() : "U"}
                                            </div>
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className="text-xs font-semibold text-slate-900 truncate">{u.name}</p>
                                                {u.lastMessageTime ? (
                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                        {u.lastMessageTime}
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] text-[#4085b3] font-medium shrink-0 bg-[#4085b3]/10 px-1.5 py-0.2 rounded-sm border border-[#4085b3]/25">
                                                        New
                                                    </span>
                                                )}
                                            </div>

                                            {/* Role badge and subtitle */}
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm uppercase tracking-wider shrink-0 border ${getRoleBadgeStyle(category)}`}>
                                                    {category === "ADMIN" ? "ADMIN" : category}
                                                </span>
                                                {u.detail && (
                                                    <span className="text-[10px] text-slate-500 truncate">{u.detail}</span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ─── RIGHT PANEL: Active Conversation Canvas ─── */}
                <div className={`md:col-span-7 lg:col-span-8 flex flex-col bg-[#f8fafc] ${!selectedUser ? "hidden md:flex" : "flex"}`}>
                    {selectedUser ? (
                        <>
                            {/* Modern Contact Topbar */}
                            <div className="px-4 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedUser(null)}
                                        className="md:hidden p-1 -ml-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                                        title="Back to contacts"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <div className="relative shrink-0">
                                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shadow-2xs">
                                            {selectedUser.name ? selectedUser.name.slice(0, 2).toUpperCase() : "U"}
                                        </div>
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-slate-900 truncate leading-tight">{selectedUser.name}</p>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm uppercase tracking-wider shrink-0 border ${getRoleBadgeStyle(selectedUser.category)}`}>
                                                {selectedUser.category || "ADMIN"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                            {isPartnerTyping ? (
                                                <span className="text-blue-600 font-semibold flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                                                    typing...
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-slate-500 truncate">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                                    Active now {selectedUser.detail ? `• ${selectedUser.detail}` : ""}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRefreshing(true);
                                            openConversationWith(selectedUser, true).finally(() => setRefreshing(false));
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                        title="Refresh conversation"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : ""}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Stream */}
                            <div
                                ref={chatScrollRef}
                                className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f8fafc]"
                            >
                                {conversation.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                                        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                                            <MessageSquare className="w-6 h-6" />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700">No message history yet</p>
                                        <p className="text-[11px] text-slate-400 max-w-sm mt-1">
                                            Send a message to {selectedUser.name} using the composer below.
                                        </p>
                                    </div>
                                ) : (
                                    conversation.map(msg => {
                                        const isMe = currentUserId ? msg.sender.id === currentUserId : false;
                                        const isEditing = editingId === msg.id;
                                        const isDeleted = msg.content === "[This message was deleted]";
                                        const isEdited = !isDeleted && Boolean(msg.attachmentType && msg.attachmentType.includes("edited"));
                                        const cleanAttachmentType = (msg.attachmentType || "").replace(";edited", "").replace("edited", "");

                                        // Parse reply quote snippet if present
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
                                                onContextMenu={e => handleContextMenu(e, msg)}
                                                className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-1 group relative`}
                                            >
                                                {/* Telegram / WhatsApp Bubble */}
                                                <div
                                                    className={`relative max-w-[84%] sm:max-w-md px-3.5 py-2 text-xs shadow-2xs space-y-1 transition-all ${
                                                        isDeleted
                                                            ? "bg-slate-100 border border-slate-200 text-slate-400 italic rounded-2xl"
                                                            : isMe
                                                            ? "bg-blue-600 text-white rounded-2xl rounded-tr-xs"
                                                            : "bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-xs"
                                                    }`}
                                                >
                                                    {/* Hover Action Trigger (WhatsApp/Telegram Chevron Dropdown) */}
                                                    {!isDeleted && (
                                                        <button
                                                            type="button"
                                                            onClick={e => handleContextMenu(e, msg)}
                                                            className={`absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer ${
                                                                isMe ? "hover:bg-white/20 text-white" : "hover:bg-slate-100 text-slate-500"
                                                            }`}
                                                            title="Message options"
                                                        >
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    {/* Reply Quote Banner */}
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

                                                            {/* Attachment */}
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
                                                                                    className="max-h-48 w-auto rounded object-contain mx-auto"
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

                                                    {/* Metadata: Time and WhatsApp/Telegram Read Checkmarks */}
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
                            </div>

                            {/* Reply Banner */}
                            {replyingTo && (
                                <div className="px-4 py-2 bg-blue-50/90 border-t border-blue-200 flex items-center justify-between text-xs text-blue-900 shrink-0">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Reply className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                        <div className="truncate">
                                            <span className="font-bold">Replying to {replyingTo.senderName}: </span>
                                            <span className="text-slate-600 truncate">{replyingTo.content.slice(0, 70)}...</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReplyingTo(null)}
                                        className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Attached File Preview */}
                            {attachedFile && (
                                <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900 shrink-0">
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

                            {/* Hidden File Input */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleSelectAttachment}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                            />

                            {/* Pill Composer */}
                            {isMessagingAllowed ? (
                                <div className="p-2.5 border-t border-slate-200 flex items-center gap-2 bg-white shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={sending || uploadingAttachment}
                                        className={`p-2 rounded-full transition-colors flex items-center justify-center cursor-pointer ${
                                            attachedFile ? "bg-amber-100 text-amber-900" : "text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                                        }`}
                                        title="Attach Document or Image"
                                    >
                                        <Paperclip className="w-4 h-4" />
                                    </button>
                                    <div className="flex-1 relative">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                                            placeholder={replyingTo ? `Replying to ${replyingTo.senderName}...` : `Message ${selectedUser.name}...`}
                                            className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-blue-400 rounded-full px-4 py-2 text-xs focus:outline-hidden transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSend}
                                        disabled={(!newMessage.trim() && !attachedFile) || sending || uploadingAttachment}
                                        className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-40 transition-colors shadow-xs cursor-pointer shrink-0"
                                        title="Send Message"
                                    >
                                        <Send className="w-3.5 h-3.5 translate-x-px" />
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500 flex items-center justify-center gap-2 shrink-0">
                                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Sending messages is currently locked by school administration.</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">No Contact Selected</h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm">
                                Choose an administrator, teacher, or child from the list on the left to start direct messaging.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Popover Menu */}
            {contextMenu.visible && contextMenu.message && (
                <div
                    style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
                    className="fixed z-50 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-xs text-slate-800 divide-y divide-slate-100 animate-in fade-in zoom-in-95"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="py-1">
                        <button
                            type="button"
                            onClick={() => {
                                handleCopy(contextMenu.message!.content);
                                setContextMenu(prev => ({ ...prev, visible: false }));
                            }}
                            className="w-full px-3.5 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700"
                        >
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy Text</span>
                        </button>
                        {isMessagingAllowed && (
                            <button
                                type="button"
                                onClick={() => {
                                    handleStartReply(contextMenu.message!);
                                    setContextMenu(prev => ({ ...prev, visible: false }));
                                }}
                                className="w-full px-3.5 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700"
                            >
                                <Reply className="w-3.5 h-3.5 text-slate-400" />
                                <span>Reply</span>
                            </button>
                        )}
                    </div>

                    {/* Own message actions */}
                    {contextMenu.message.sender.id === currentUserId && contextMenu.message.content !== "[This message was deleted]" && (
                        <div className="py-1">
                            <button
                                type="button"
                                onClick={() => {
                                    handleStartEdit(contextMenu.message!);
                                    setContextMenu(prev => ({ ...prev, visible: false }));
                                }}
                                className="w-full px-3.5 py-1.5 text-left hover:bg-slate-50 flex items-center gap-2 cursor-pointer text-slate-700"
                            >
                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                <span>Edit Message</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleDeleteMessage(contextMenu.message!.id);
                                    setContextMenu(prev => ({ ...prev, visible: false }));
                                }}
                                className="w-full px-3.5 py-1.5 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Message</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
