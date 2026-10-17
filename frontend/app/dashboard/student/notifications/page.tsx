"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Notification = { id: string; title: string; content: string; isRead: boolean; link?: string | null; createdAt: string };

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    const response = await fetchApi("/student/notifications");
    if (response.ok) setNotifications(await response.json());
    setLoading(false);
  }

  useEffect(() => { void Promise.resolve().then(loadNotifications); }, []);

  async function markRead(id: string) {
    const response = await fetchApi(`/communication/notification/${id}/read`, { method: "PATCH" });
    if (response.ok) setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, isRead: true } : notification));
  }

  async function markAllRead() {
    await Promise.all(notifications.filter((notification) => !notification.isRead).map((notification) => markRead(notification.id)));
  }

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-5"><div className="flex items-start gap-3"><div className="rounded-lg bg-amber-100 p-2.5 text-amber-800"><Bell className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">My alerts</p><h1 className="mt-1 text-2xl font-bold text-gray-900">Notifications</h1><p className="mt-1 text-sm text-gray-600">Important updates about your learning and school activity.</p></div></div><button type="button" onClick={markAllRead} disabled={!unreadCount} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"><CheckCheck className="h-4 w-4" /> Mark all read</button></header>
      {loading ? <div className="rounded-lg bg-white p-6 text-sm text-gray-500">Loading your notifications...</div> : notifications.length === 0 ? <div className="border-y border-dashed border-gray-300 py-12 text-center"><Bell className="mx-auto h-8 w-8 text-gray-400" /><p className="mt-3 font-semibold text-gray-900">You are all caught up</p><p className="mt-1 text-sm text-gray-500">New alerts will appear here.</p></div> : <div className="space-y-2">{notifications.map((notification) => <article key={notification.id} className={`rounded-lg border p-4 ${notification.isRead ? "border-gray-200 bg-white" : "border-amber-200 bg-amber-50"}`}><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="font-semibold text-gray-900">{notification.title}</h2>{!notification.isRead && <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">New</span>}</div><p className="mt-1 text-sm leading-6 text-gray-700">{notification.content}</p><p className="mt-2 text-xs text-gray-500">{new Date(notification.createdAt).toLocaleString()}</p></div><div className="flex shrink-0 items-center gap-2">{notification.link && <Link href={notification.link} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800">Open <ExternalLink className="h-3.5 w-3.5" /></Link>}{!notification.isRead && <button type="button" onClick={() => markRead(notification.id)} className="text-xs font-semibold text-gray-600 hover:underline">Read</button>}</div></div></article>)}</div>}
    </div>
  );
}
