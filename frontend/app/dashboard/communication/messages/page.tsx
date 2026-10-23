"use client";

import { useEffect, useState, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Send, X, ChevronLeft, Trash2, Copy, Check, Reply, Edit3, Paperclip, Download, ExternalLink, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface User {
    id: string;
    name: string;
    email: string;
}

interface Message {
    id: string;
    content: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
    isRead: boolean;
    createdAt: string;
    sender: User;
    receiver: User;
}

export default function MessagesPage() {
    const { authData } = useAuth();
    const currentUserId = authData?.user?.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);

    // Attachment states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachedFile, setAttachedFile] = useState<{ file: File; name: string; size: number; type: string } | null>(null);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);

    useEffect(() => {
        loadInitial();
    }, []);

    const loadInitial = async () => {
        try {
            setLoading(true);
            setError(null);

            const [msgRes, usersRes] = await Promise.all([
                fetchApi("/communication/messages"),
                fetchApi("/communication/users")
            ]);

            if (!msgRes.ok) throw new Error("Failed to load messages");
            if (!usersRes.ok) throw new Error("Failed to load contacts");

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

    const openConversation = async (user: User) => {
        setSelectedUser(user);
        setShowCompose(false);
        try {
            const res = await fetchApi(`/communication/messages?otherUserId=${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setConversation(Array.isArray(data) ? data : []);
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
                    alert(uploadErr.message || "Failed to upload attached file. Message was not sent.");
                    setUploadingAttachment(false);
                    setSending(false);
                    return;
                } finally {
                    setUploadingAttachment(false);
                }
            }

            const baseText = newMessage.trim() || (uploadedAttachmentName ? `Sent an attachment: ${uploadedAttachmentName}` : "");
            const outgoingContent = baseText;

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
            } else {
                const data = await res.json();
                alert(data.error || "Failed to send message");
            }
        } catch (_) {
            alert("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleCopyMessage = async (content: string, id: string) => {
        try {
            await navigator.clipboard.writeText(content);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleStartReply = (msg: Message) => {
        const isMe = currentUserId ? msg.sender.id === currentUserId : msg.sender.id !== selectedUser?.id;
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
                setConversation(prev => prev.map(m => m.id === msgId ? { ...m, content: updated.content || editContent.trim() } : m));
                setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: updated.content || editContent.trim() } : m));
                setEditingId(null);
                setEditContent("");
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Failed to update message");
            }
        } catch (_) {
            alert("Failed to update message");
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        setDeletingId(msgId);
        try {
            const res = await fetchApi(`/communication/messages/${msgId}`, { method: "DELETE" });
            if (res.ok) {
                setConversation(prev => prev.filter(m => m.id !== msgId));
                setMessages(prev => prev.filter(m => m.id !== msgId));
                if (replyingTo?.id === msgId) setReplyingTo(null);
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete message");
            }
        } catch (_) {
            alert("Failed to delete message");
        } finally {
            setDeletingId(null);
        }
    };

    // Build list of conversation partners from message history
    const conversationPartners = (() => {
        const map = new Map<string, { user: User; lastMessage: Message }>();
        for (const msg of messages) {
            if (!msg?.sender || !msg?.receiver) continue;
            const partner = (currentUserId ? msg.sender.id === currentUserId : false) ? msg.receiver : msg.sender;
            if (!partner?.id) continue;
            const existing = map.get(partner.id);
            if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
                map.set(partner.id, { user: partner, lastMessage: msg });
            }
        }
        return Array.from(map.values()).sort(
            (a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
        );
    })();

    if (loading) return <LoadingState message="Loading messages..." />;

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 text-sm">{error}</p>
                <Button onClick={loadInitial} className="mt-4">Retry</Button>
            </div>
        );
    }

    return (
        <div className="space-y-4 text-black">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-[#006b3f]" />
                        Direct Messages
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Secure, internal communications with faculty, staff, and guardians.</p>
                </div>
                <Button
                    onClick={() => { setShowCompose(true); setSelectedUser(null); }}
                    className="bg-[#006b3f] hover:bg-[#005432] text-sm"
                >
                    New Message
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: "60vh" }}>
                {/* Conversation list */}
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Conversations</p>
                    </div>
                    {conversationPartners.length === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-400">
                            No messages yet.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {conversationPartners.map(({ user, lastMessage }) => (
                                <li
                                    key={user.id}
                                    onClick={() => openConversation(user)}
                                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedUser?.id === user.id ? "bg-emerald-50" : ""}`}
                                >
                                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">{lastMessage.content}</p>
                                    <p className="text-xs text-gray-300 mt-0.5">
                                        {new Date(lastMessage.createdAt).toLocaleDateString()}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Message thread / compose */}
                <div className="md:col-span-2 border border-gray-200 rounded-lg bg-white flex flex-col">
                    {showCompose ? (
                        <div className="p-4 flex-1 space-y-3">
                            <div className="flex items-center justify-between border-b pb-3">
                                <p className="text-sm font-semibold text-gray-900">New Message</p>
                                <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">To</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#006b3f] bg-white"
                                    onChange={e => {
                                        const u = users.find(u => u.id === e.target.value);
                                        if (u) { setSelectedUser(u); setConversation([]); setShowCompose(false); }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select a recipient</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Message</label>
                                <textarea
                                    rows={4}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                    placeholder="Write your message..."
                                />
                            </div>
                            <Button
                                onClick={handleSend}
                                isLoading={sending}
                                disabled={!selectedUser || !newMessage.trim()}
                                className="bg-[#006b3f] hover:bg-[#005432]"
                            >
                                Send
                            </Button>
                        </div>
                    ) : selectedUser ? (
                        <>
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="md:hidden text-gray-400 hover:text-gray-600 mr-1"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{selectedUser.name}</p>
                                        <p className="text-xs text-gray-500">{selectedUser.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "50vh" }}>
                                {conversation.length === 0 ? (
                                    <p className="text-center text-sm text-gray-400 py-8">No messages in this conversation yet.</p>
                                ) : (
                                    conversation.map(msg => {
                                        const isMe = currentUserId ? msg.sender.id === currentUserId : msg.sender.id !== selectedUser.id;
                                        const isEditing = editingId === msg.id;
                                        const isCopied = copiedId === msg.id;

                                        return (
                                            <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-2`}>
                                                <div className={`max-w-sm rounded-xl px-3 py-2 text-sm shadow-2xs space-y-1.5 ${
                                                    isMe ? "bg-[#006b3f] text-white" : "bg-gray-100 text-gray-900 border border-gray-200"
                                                }`}>
                                                    <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 border-b pb-1 border-current/15">
                                                        <span className="font-semibold">{isMe ? "You" : msg.sender.name}</span>
                                                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                                    </div>

                                                    {isEditing ? (
                                                        <div className="space-y-1.5 pt-1">
                                                            <textarea
                                                                value={editContent}
                                                                onChange={e => setEditContent(e.target.value)}
                                                                className={`w-full p-2 text-xs rounded-lg border resize-none focus:outline-hidden ${
                                                                    isMe
                                                                        ? "bg-[#005432] text-white border-emerald-400"
                                                                        : "bg-white text-gray-800 border-gray-300"
                                                                }`}
                                                                rows={2}
                                                                autoFocus
                                                            />
                                                            <div className="flex justify-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancelEdit}
                                                                    className="px-2 py-0.5 text-[11px] rounded hover:bg-black/10 transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSaveEdit(msg.id)}
                                                                    disabled={savingEdit || !editContent.trim()}
                                                                    className="px-2.5 py-0.5 bg-amber-400 hover:bg-amber-500 text-slate-900 rounded text-[11px] font-bold disabled:opacity-50 transition-colors"
                                                                >
                                                                    {savingEdit ? "Saving..." : "Save"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1.5">
                                                            {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content.replace(/^\[[^\]]+\]\s*/, "").replace(/^>\s*In reply to\s*[^:\n]+:\s*"[^"]*"\s*\n*/i, "").replace(/^>\s*In reply to\s*[^\n]+\n*/i, "").trim()}</p>}

                                                            {/* Attached File Display */}
                                                            {msg.attachmentUrl && (
                                                                <div className="pt-1">
                                                                    {(msg.attachmentType?.startsWith("image/") || msg.attachmentUrl.match(/\.(jpeg|jpg|png|webp|gif|svg)$/i)) ? (
                                                                        <div className="rounded-lg overflow-hidden border border-current/20 bg-black/10 max-w-xs mt-1">
                                                                            <a
                                                                                href={msg.attachmentUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="block relative group"
                                                                            >
                                                                                <img
                                                                                    src={msg.attachmentUrl}
                                                                                    alt={msg.attachmentName || "Attached Image"}
                                                                                    className="max-h-44 w-auto rounded object-contain mx-auto"
                                                                                />
                                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold gap-1">
                                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                                    <span>View Full Image</span>
                                                                                </div>
                                                                            </a>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={`p-2 rounded-lg border flex items-center justify-between gap-2.5 text-xs mt-1 ${
                                                                            isMe ? "bg-white/10 border-white/20 text-white" : "bg-white border-gray-200 text-gray-800"
                                                                        }`}>
                                                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                                                <FileText className="w-4 h-4 shrink-0 text-amber-400" />
                                                                                <span className="truncate font-medium text-[11px]">{msg.attachmentName || "Document"}</span>
                                                                            </div>
                                                                            <a
                                                                                href={msg.attachmentUrl}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                download={msg.attachmentName || true}
                                                                                className="px-2 py-0.5 rounded bg-white text-gray-900 font-bold text-[10px] hover:bg-gray-100 flex items-center gap-1 shrink-0 shadow-2xs transition-colors"
                                                                            >
                                                                                <Download className="w-3 h-3 text-[#006b3f]" />
                                                                                <span>Download</span>
                                                                            </a>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Actions: Copy, Reply, Edit, Delete */}
                                                    {!isEditing && (
                                                        <div className={`flex items-center gap-2 pt-1 border-t text-[10px] ${
                                                            isMe ? "border-white/15" : "border-gray-200"
                                                        }`}>
                                                            {/* Copy */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyMessage(msg.content, msg.id)}
                                                                className={`flex items-center gap-1 hover:underline cursor-pointer ${
                                                                    isMe ? "text-emerald-100" : "text-gray-500"
                                                                }`}
                                                                title="Copy message"
                                                            >
                                                                {isCopied ? (
                                                                    <>
                                                                        <Check className="w-3 h-3 text-emerald-300" />
                                                                        <span className="font-bold">Copied</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="w-3 h-3" />
                                                                        <span>Copy</span>
                                                                    </>
                                                                )}
                                                            </button>

                                                            {/* Reply */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStartReply(msg)}
                                                                className={`flex items-center gap-1 hover:underline cursor-pointer ${
                                                                    isMe ? "text-emerald-100" : "text-gray-500"
                                                                }`}
                                                                title="Reply to message"
                                                            >
                                                                <Reply className="w-3 h-3" />
                                                                <span>Reply</span>
                                                            </button>

                                                            {/* Edit (only if isMe) */}
                                                            {isMe && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleStartEdit(msg)}
                                                                    className={`flex items-center gap-1 hover:underline cursor-pointer ${
                                                                        isMe ? "text-emerald-100" : "text-gray-500"
                                                                    }`}
                                                                    title="Edit message"
                                                                >
                                                                    <Edit3 className="w-3 h-3" />
                                                                    <span>Edit</span>
                                                                </button>
                                                            )}

                                                            {/* Delete */}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteMessage(msg.id)}
                                                                disabled={deletingId === msg.id}
                                                                className="flex items-center gap-1 text-red-300 hover:text-red-100 hover:underline cursor-pointer"
                                                                title="Delete message"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                                <span>{deletingId === msg.id ? "Deleting..." : "Delete"}</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Replying banner */}
                            {replyingTo && (
                                <div className="px-3 py-1.5 bg-emerald-50 border-t border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                        <Reply className="w-3.5 h-3.5 text-[#006b3f] shrink-0" />
                                        <div className="truncate">
                                            <span className="font-bold">Replying to {replyingTo.senderName}: </span>
                                            <span className="text-gray-600 truncate">{replyingTo.content.slice(0, 60)}...</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setReplyingTo(null)}
                                        className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Attached File Preview Badge */}
                            {attachedFile && (
                                <div className="px-3 py-1.5 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Paperclip className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                        <div className="truncate">
                                            <span className="font-bold truncate">{attachedFile.name} </span>
                                            <span className="text-[10px] text-gray-500">({(attachedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveAttachment}
                                        className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
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

                            <div className="p-3 border-t border-gray-100 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={sending || uploadingAttachment}
                                    className={`p-2 rounded-lg border transition-colors flex items-center justify-center cursor-pointer ${
                                        attachedFile ? "bg-amber-100 border-amber-300 text-amber-900" : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-600"
                                    }`}
                                    title="Attach File (Image, PDF, Word)"
                                >
                                    <Paperclip className="w-4 h-4" />
                                </button>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                                    placeholder={replyingTo ? `Replying to ${replyingTo.senderName}...` : "Type a message..."}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={(!newMessage.trim() && !attachedFile) || sending || uploadingAttachment}
                                    className="bg-[#006b3f] text-white rounded-lg px-3.5 py-2 hover:bg-[#005432] disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                                >
                                    <Send className="w-4 h-4" />
                                    <span>{uploadingAttachment ? "Uploading..." : sending ? "Sending..." : "Send"}</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                            Select a conversation or start a new message.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
