"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { 
    Bell, 
    CheckCheck, 
    MessageSquare, 
    ClipboardList, 
    Award, 
    FileText, 
    UserCheck, 
    GraduationCap, 
    ArrowRight 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { 
    resolveNotificationRoute, 
    dispatchNotificationEvents, 
    NotificationItem 
} from "@/lib/notificationRouter";

interface Notification extends NotificationItem {
    id: string;
    title: string;
    content: string;
    isRead: boolean;
    link?: string;
    createdAt: string;
}

export default function NotificationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [userContext, setUserContext] = useState<{ roleName?: string; scopeType?: string }>({});

    useEffect(() => {
        try {
            const rawUser = localStorage.getItem("user");
            if (rawUser) {
                const parsed = JSON.parse(rawUser);
                setUserContext({
                    roleName: parsed.role,
                    scopeType: parsed.scopeType || parsed.scope,
                });
            }
        } catch {}
    }, []);

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

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.isRead) {
            handleMarkRead(notif.id);
        }

        const routeInfo = resolveNotificationRoute(notif, {
            roleName: userContext.roleName,
            scopeType: userContext.scopeType,
        });

        dispatchNotificationEvents(routeInfo);
        router.push(routeInfo.url);
    };

    const renderTypeIcon = (type: string) => {
        switch (type) {
            case "message":
                return <MessageSquare className="w-4 h-4 text-sky-600" />;
            case "data-request":
                return <ClipboardList className="w-4 h-4 text-emerald-600" />;
            case "program":
                return <Award className="w-4 h-4 text-indigo-600" />;
            case "directive":
                return <FileText className="w-4 h-4 text-amber-600" />;
            case "attendance":
                return <UserCheck className="w-4 h-4 text-rose-600" />;
            case "assessment":
                return <GraduationCap className="w-4 h-4 text-purple-600" />;
            default:
                return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    const renderTypeBadge = (type: string) => {
        switch (type) {
            case "message":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100">Message</span>;
            case "data-request":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Data Request</span>;
            case "program":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">Program</span>;
            case "directive":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">Directive</span>;
            case "attendance":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">Attendance</span>;
            case "assessment":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">Academic</span>;
            default:
                return null;
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
        <div className="space-y-4 text-black max-w-5xl mx-auto">
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
                        className="text-sm cursor-pointer"
                    >
                        <CheckCheck className="w-4 h-4 mr-1.5" />
                        Mark all read
                    </Button>
                )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {notifications.length === 0 ? (
                    <div className="py-16 text-center">
                        <Bell className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">No notifications.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {notifications.map(notif => {
                            const routeInfo = resolveNotificationRoute(notif, {
                                roleName: userContext.roleName,
                                scopeType: userContext.scopeType,
                            });

                            return (
                                <li
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`px-5 py-4 flex items-start gap-3.5 hover:bg-gray-50/80 transition-colors cursor-pointer group ${
                                        !notif.isRead ? "bg-emerald-50/30" : ""
                                    }`}
                                >
                                    <div className="mt-0.5 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 group-hover:bg-white transition-colors">
                                        {renderTypeIcon(routeInfo.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <p className={`text-sm ${notif.isRead ? "text-gray-700" : "font-bold text-gray-900"}`}>
                                                {notif.title}
                                            </p>
                                            {renderTypeBadge(routeInfo.type)}
                                            {!notif.isRead && (
                                                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{notif.content}</p>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className="text-[11px] text-gray-400">
                                                {new Date(notif.createdAt).toLocaleString()}
                                            </span>
                                            <span className="text-[11px] font-medium text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                                Go to {routeInfo.type === "message" ? "Conversation" : routeInfo.type === "data-request" ? "Data Request" : "Details"}
                                                <ArrowRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </div>
                                    {!notif.isRead && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkRead(notif.id);
                                            }}
                                            className="text-xs text-gray-400 hover:text-emerald-700 flex-shrink-0 mt-1 cursor-pointer"
                                            title="Mark as read"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
