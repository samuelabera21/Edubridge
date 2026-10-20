"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
  Megaphone,
  Layers,
  ArrowLeft,
  RefreshCw,
  Mail,
  X,
  Sparkles,
} from "lucide-react";
import { fetchApi } from "../../../../lib/api";

export type StudentNotification = {
  id: string;
  title: string;
  content: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
  type?: string;
};

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Filter states
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Selected Item
  const [selectedNotification, setSelectedNotification] = useState<StudentNotification | null>(null);

  async function loadNotifications() {
    try {
      setRefreshing(true);
      const res = await fetchApi("/student/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
        setError(false);
      } else {
        throw new Error("Failed to fetch notifications");
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  // Mark single notification read
  async function markRead(id: string) {
    try {
      const res = await fetchApi(`/communication/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((current) =>
          current.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  }

  // Mark all read
  async function markAllRead() {
    try {
      const res = await fetchApi("/communication/notifications/read-all", { method: "PATCH" });
      if (res.ok) {
        setNotifications((current) => current.map((n) => ({ ...n, isRead: true })));
      } else {
        // Fallback: individual PATCH calls
        const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
        await Promise.all(unreadIds.map((id) => markRead(id)));
      }
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  }

  // Categorize notification heuristically
  const getCategory = (n: StudentNotification): "academic" | "attendance" | "resource" | "announcement" | "general" => {
    const text = `${n.title} ${n.content}`.toLowerCase();
    if (text.includes("attendance") || text.includes("absent") || text.includes("late") || text.includes("excuse")) {
      return "attendance";
    }
    if (text.includes("assignment") || text.includes("quiz") || text.includes("test") || text.includes("exam") || text.includes("homework")) {
      return "academic";
    }
    if (text.includes("textbook") || text.includes("resource") || text.includes("document") || text.includes("lab")) {
      return "resource";
    }
    if (text.includes("announcement") || text.includes("notice") || text.includes("schedule")) {
      return "announcement";
    }
    return "general";
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "attendance":
        return {
          label: "Attendance Alert",
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          icon: AlertTriangle,
          iconColor: "text-rose-600",
        };
      case "academic":
        return {
          label: "Assignment & Tasks",
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: BookOpen,
          iconColor: "text-emerald-600",
        };
      case "resource":
        return {
          label: "Learning Resource",
          bg: "bg-purple-50 text-purple-800 border-purple-200",
          icon: Layers,
          iconColor: "text-purple-600",
        };
      case "announcement":
        return {
          label: "School Notice",
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          icon: Megaphone,
          iconColor: "text-blue-600",
        };
      default:
        return {
          label: "System Alert",
          bg: "bg-slate-50 text-slate-800 border-slate-200",
          icon: Bell,
          iconColor: "text-slate-600",
        };
    }
  };

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Read state filter
      if (readFilter === "unread" && n.isRead) return false;
      if (readFilter === "read" && !n.isRead) return false;

      // Category filter
      if (categoryFilter !== "all" && getCategory(n) !== categoryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (n.title || "").toLowerCase();
        const content = (n.content || "").toLowerCase();
        return title.includes(q) || content.includes(q);
      }

      return true;
    });
  }, [notifications, readFilter, categoryFilter, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      {/* ─── Page Header (My Class pattern) ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-[#184973] to-[#2563eb] p-3 text-white shadow-md shadow-blue-500/20">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Action Center &amp; Alerts
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Feed
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Notifications
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Stay updated on homework assignments, attendance notices, and school announcements.
            </p>
          </div>
        </header>

        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800 shadow-xs">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 opacity-75">Unread</p>
                <p className="text-sm font-black leading-none text-amber-900">{unreadCount} New</p>
              </div>
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
          )}

          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            <CheckCheck className="h-4 w-4 text-emerald-600" />
            <span>Mark All Read</span>
          </button>

          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* 2. Interactive Filter & Search Controls */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "all", label: "All Alerts", count: notifications.length },
                { key: "unread", label: "Unread", count: unreadCount },
                { key: "read", label: "Archived Read", count: notifications.length - unreadCount },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setReadFilter(tab.key as any)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    readFilter === tab.key
                      ? "bg-[#184973] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      readFilter === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadNotifications}
              disabled={refreshing}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#184973]" : ""}`} />
              Refresh Alerts
            </button>
          </div>

          {/* Category Pills & Search Bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "all", label: "All Categories" },
                { key: "academic", label: "Assignments & Tasks" },
                { key: "attendance", label: "Attendance Notices" },
                { key: "resource", label: "Learning Resources" },
                { key: "announcement", label: "Announcements" },
              ].map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    categoryFilter === cat.key
                      ? "bg-[#184973] text-white font-bold shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 3. Notification List Display */}
        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[#184973]" />
              Loading your verified notifications...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-rose-600">
              Could not load notifications from the database. Please try again.
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-700">You are all caught up!</p>
              <p className="text-xs text-slate-500 mt-1">
                {readFilter === "unread"
                  ? "No unread alerts. All notifications have been reviewed."
                  : "No notifications match your active search or category filters."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const cat = getCategory(n);
              const meta = getCategoryBadge(cat);
              const Icon = meta.icon;
              const formattedDate = new Date(n.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={n.id}
                  onClick={() => setSelectedNotification(n)}
                  className={`group relative flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between transition cursor-pointer ${
                    !n.isRead
                      ? "border-amber-300/80 bg-gradient-to-r from-amber-50/60 via-white to-amber-50/30 shadow-xs hover:border-amber-400"
                      : "border-slate-200/80 bg-white hover:border-blue-200 hover:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`rounded-xl p-2.5 mt-0.5 border ${meta.bg}`}
                      title={meta.label}
                    >
                      <Icon className={`h-4 w-4 ${meta.iconColor}`} />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 group-hover:text-[#184973] transition text-sm">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="rounded-full bg-amber-500 px-2 py-0.2 text-[10px] font-black uppercase tracking-wider text-white">
                            New
                          </span>
                        )}
                        <span
                          className={`rounded-md border px-2 py-0.2 text-[10px] font-bold ${meta.bg}`}
                        >
                          {meta.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {n.content}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex shrink-0 items-center gap-2 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                      >
                        Mark Read
                      </button>
                    )}

                    {n.link && (
                      <Link
                        href={n.link}
                        onClick={() => {
                          if (!n.isRead) markRead(n.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#184973] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#123655] transition"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3 w-3 text-blue-200" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 4. Interactive Details Modal */}
      {selectedNotification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedNotification(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-100 p-1 text-[#184973]">
                  <Bell className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Alert Details
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <h3 className="text-base font-bold text-slate-900">{selectedNotification.title}</h3>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-700 leading-relaxed">
                {selectedNotification.content}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Received: {new Date(selectedNotification.createdAt).toLocaleString()}</span>
                <span>Status: {selectedNotification.isRead ? "Read" : "Unread"}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
              {!selectedNotification.isRead ? (
                <button
                  type="button"
                  onClick={() => {
                    markRead(selectedNotification.id);
                    setSelectedNotification((prev) => (prev ? { ...prev, isRead: true } : null));
                  }}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Mark as Read
                </button>
              ) : (
                <span className="text-xs text-emerald-700 font-semibold">✓ Verified read</span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>

                {selectedNotification.link && (
                  <Link
                    href={selectedNotification.link}
                    onClick={() => {
                      if (!selectedNotification.isRead) markRead(selectedNotification.id);
                      setSelectedNotification(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#184973] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#123655] transition"
                  >
                    <span>Open Associated Item</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
