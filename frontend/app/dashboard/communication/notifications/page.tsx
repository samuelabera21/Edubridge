"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface Notification {
    id: string;
    title: string;
    content: string;
    isRead: boolean;
    link?: string;
    createdAt: string;
}

export default function NotificationsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchApi("/communication/notifications");
            if (!res.ok) throw new Error("Failed to load notifications");
            const data = await res.json();
            setNotifications(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.message || "Failed to load notifications");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const handleMarkRead = async (id: string) => {
        try {
            const res = await fetchApi(`/communication/notifications/${id}/read`, { method: "PATCH" });
            if (res.ok) {
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, isRead: true } : n)
                );
            }
        } catch (_) {}
    };

    const handleMarkAllRead = async () => {
        const unread = notifications.filter(n => !n.isRead);
        for (const n of unread) {
            await handleMarkRead(n.id);
        }
    };

    if (loading) return <LoadingState message="Loading notifications..." />;

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-600 text-sm">{error}</p>
                <Button onClick={loadNotifications} className="mt-4">Retry</Button>
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="space-y-4 text-black">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#006b3f]" />
                    Notifications
                    {unreadCount > 0 && (
                        <span className="bg-[#006b3f] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </h1>
                {unreadCount > 0 && (
                    <Button
                        variant="outline"
                        onClick={handleMarkAllRead}
                        className="text-sm"
                    >
                        <CheckCheck className="w-4 h-4 mr-1.5" />
                        Mark all read
                    </Button>
                )}
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                {notifications.length === 0 ? (
                    <div className="py-16 text-center">
                        <Bell className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">No notifications.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {notifications.map(notif => (
                            <li
                                key={notif.id}
                                className={`px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${!notif.isRead ? "bg-emerald-50/40" : ""}`}
                            >
                                <div className="mt-0.5 flex-shrink-0">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 ${notif.isRead ? "bg-transparent" : "bg-[#006b3f]"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${notif.isRead ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                                        {notif.title}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">{notif.content}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(notif.createdAt).toLocaleString()}
                                    </p>
                                </div>
                                {!notif.isRead && (
                                    <button
                                        onClick={() => handleMarkRead(notif.id)}
                                        className="text-xs text-[#006b3f] hover:underline flex-shrink-0 mt-1"
                                    >
                                        Mark read
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
