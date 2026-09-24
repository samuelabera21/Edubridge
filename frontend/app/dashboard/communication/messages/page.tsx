"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { MessageSquare, Send, X, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
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
    isRead: boolean;
    createdAt: string;
    sender: User;
    receiver: User;
}

export default function MessagesPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [conversation, setConversation] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [showCompose, setShowCompose] = useState(false);

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

    const handleSend = async () => {
        if (!selectedUser || !newMessage.trim()) return;
        setSending(true);
        try {
            const res = await fetchApi("/communication/messages", {
                method: "POST",
                body: JSON.stringify({ receiverId: selectedUser.id, content: newMessage.trim() })
            });
            if (res.ok) {
                const msg = await res.json();
                setConversation(prev => [...prev, msg]);
                setMessages(prev => [...prev, msg]);
                setNewMessage("");
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

    // Build list of conversation partners from message history
    const conversationPartners = (() => {
        const map = new Map<string, { user: User; lastMessage: Message }>();
        for (const msg of messages) {
            const partner = currentUser?.id === msg.sender.id ? msg.receiver : msg.sender;
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
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#006b3f]" />
                    Messages
                </h1>
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
                                        <option key={u.id} value={u.id}>{u.name}</option>
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
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="md:hidden text-gray-400 hover:text-gray-600 mr-1"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <p className="text-sm font-semibold text-gray-900">{selectedUser.name}</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "50vh" }}>
                                {conversation.length === 0 ? (
                                    <p className="text-center text-sm text-gray-400 py-8">No messages in this conversation yet.</p>
                                ) : (
                                    conversation.map(msg => {
                                        const isMe = msg.sender.id !== selectedUser.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-xs rounded-lg px-3 py-2 text-sm ${isMe ? "bg-[#006b3f] text-white" : "bg-gray-100 text-gray-900"}`}>
                                                    <p>{msg.content}</p>
                                                    <p className={`text-xs mt-1 ${isMe ? "text-emerald-200" : "text-gray-400"}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="p-3 border-t border-gray-100 flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                                    placeholder="Type a message..."
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim() || sending}
                                    className="bg-[#006b3f] text-white rounded-lg px-3 py-2 hover:bg-[#005432] disabled:opacity-50 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
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
