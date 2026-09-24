"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    MessageSquare, 
    Send, 
    Sparkles, 
    Search, 
    User, 
    CheckCheck,
    AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ParentCommunicationPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [parents, setParents] = useState<any[]>([]);
    const [selectedParentId, setSelectedParentId] = useState("");
    const [messageText, setMessageText] = useState("");

    const loadParents = async () => {
        try {
            setLoading(true);
            const pRes = await fetchApi("/parent");
            if (pRes.ok) {
                const pData = await pRes.json();
                const list = Array.isArray(pData) ? pData : [];
                setParents(list);
                if (list.length > 0) setSelectedParentId(list[0].id);
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadParents();
    }, []);

    const selectedParent = parents.find(p => p.id === selectedParentId);

    const loadMessages = async () => {
        if (!selectedParent?.userId) {
            setMessages([]);
            return;
        }
        try {
            const res = await fetchApi(`/communication/messages?otherUserId=${selectedParent.userId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        loadMessages();
    }, [selectedParentId]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedParent?.userId) return;

        try {
            setSending(true);
            const res = await fetchApi("/communication/messages", {
                method: "POST",
                body: JSON.stringify({
                    receiverId: selectedParent.userId,
                    content: messageText
                })
            });

            if (res.ok) {
                setMessageText("");
                loadMessages();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to send message");
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    if (loading) return <LoadingState message="Loading parent communication channels..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Context Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-blue-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-blue-700" />
                        Parent Communication & Direct Channel
                    </span>
                    <p className="text-blue-800">
                        Direct messaging with registered parents regarding student progress, behavior updates, and school inquiries.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                    <MessageSquare className="w-7 h-7 text-blue-600" />
                    <span>Parent Communication Channel</span>
                </h1>
                <p className="text-sm text-gray-500 mt-1">Direct messaging channel between school staff and registered parents.</p>
            </div>

            {/* Communication Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Parent Contact List */}
                <Card className="shadow-sm md:col-span-1">
                    <CardHeader className="py-3 border-b border-gray-100">
                        <CardTitle className="text-xs font-bold uppercase text-gray-500">Parent Directory</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1 max-h-[500px] overflow-y-auto">
                        {parents.length === 0 ? (
                            <p className="p-4 text-xs text-gray-400 text-center">No parents available</p>
                        ) : (
                            parents.map((p) => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedParentId(p.id)}
                                    className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${
                                        selectedParentId === p.id ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
                                    }`}
                                >
                                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                                        {p.firstName[0]}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold text-gray-900 truncate">{p.firstName} {p.lastName}</p>
                                        <p className="text-xs text-gray-500">{p.phoneNumber || "No phone registered"}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Chat Panel */}
                <Card className="shadow-sm md:col-span-2 flex flex-col h-[500px]">
                    <CardHeader className="py-3.5 border-b border-gray-100 bg-gray-50/50 flex flex-row items-center justify-between">
                        {selectedParent ? (
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">{selectedParent.firstName} {selectedParent.lastName}</h3>
                                <p className="text-xs text-gray-500">Primary Contact Phone: {selectedParent.phoneNumber || "N/A"}</p>
                            </div>
                        ) : (
                            <h3 className="text-sm font-bold text-gray-400">Select a parent to start messaging</h3>
                        )}
                    </CardHeader>

                    <CardContent className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/30">
                        {!selectedParent?.userId ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                                <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                                <p className="font-semibold text-gray-700">No User Account Linked</p>
                                <p className="text-gray-400 mt-1">This parent has not been linked to a login account yet.</p>
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                                <MessageSquare className="w-10 h-10 text-blue-200 mb-2" />
                                <p>No message history with this parent yet.</p>
                                <p className="text-gray-400">Type a message below to initiate contact.</p>
                            </div>
                        ) : (
                            messages.map((m) => {
                                const isMine = m.senderId === authData?.user?.id;
                                return (
                                    <div key={m.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                                        <div className={`text-xs rounded-xl px-4 py-2.5 max-w-xs shadow-sm ${
                                            isMine ? "bg-[#006b3f] text-white rounded-tr-none" : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                                        }`}>
                                            {m.content}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-1 flex items-center">
                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>

                    <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 flex items-center space-x-2 bg-white">
                        <input
                            type="text"
                            placeholder="Type direct message to parent..."
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            disabled={!selectedParent?.userId || sending}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#006b3f] disabled:bg-gray-100"
                        />
                        <Button type="submit" isLoading={sending} disabled={!selectedParent?.userId} leftIcon={<Send className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432]">
                            Send
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
}
