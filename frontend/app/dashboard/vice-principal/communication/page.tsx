"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { MessageSquare, Megaphone, Send } from "lucide-react";

export default function CommunicationPage() {
    const [overview, setOverview] = useState<any>({ announcements: [], recentMessages: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const res = await fetchApi("/vice-principal/communication");
                if (res.ok) {
                    const data = await res.json();
                    setOverview(data);
                }
            } catch (err) {
                console.error("Failed to load communication data:", err);
            } finally {
                setLoading(false);
            }
        }
        
        loadData();
    }, []);

    if (loading) {
        return <div className="animate-pulse">Loading communication dashboard...</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">School Communication</h1>
                    <p className="text-gray-500">Manage academic announcements and messages with teachers and parents.</p>
                </div>
                <button className="bg-[#006b3f] hover:bg-[#005a34] text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors">
                    <Send className="w-4 h-4" />
                    <span>New Announcement</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Announcements */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                        <Megaphone className="w-5 h-5 text-[#006b3f]" />
                        <h2 className="font-semibold text-gray-900">Academic Announcements</h2>
                    </div>
                    <div className="p-0">
                        {overview.announcements.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No recent announcements.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {overview.announcements.map((announcement: any) => (
                                    <li key={announcement.id} className="p-5 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-gray-900">{announcement.title}</h3>
                                            <span className={`text-xs font-medium px-2 py-1 rounded ${announcement.priority === 'HIGH' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {announcement.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">Target: {announcement.target} • Posted: {announcement.date}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center space-x-3 bg-gray-50">
                        <MessageSquare className="w-5 h-5 text-indigo-500" />
                        <h2 className="font-semibold text-gray-900">Recent Messages</h2>
                    </div>
                    <div className="p-0">
                        {overview.recentMessages.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">Inbox is empty.</div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {overview.recentMessages.map((msg: any) => (
                                    <li key={msg.id} className={`p-5 hover:bg-gray-50 transition-colors ${!msg.isRead ? 'bg-indigo-50/30' : ''}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <h3 className={`text-sm ${!msg.isRead ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {msg.from}
                                            </h3>
                                            <span className="text-xs text-gray-500">{msg.date}</span>
                                        </div>
                                        <p className={`text-sm ${!msg.isRead ? 'font-semibold text-indigo-900' : 'text-gray-500'}`}>
                                            {msg.subject}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
