"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Megaphone,
  Search,
  Tag,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import CommunicationHeader from "../CommunicationHeader";

type Announcement = {
  id: string;
  title: string;
  content: string;
  target: string;
  expiresAt?: string | null;
  createdAt: string;
  author?: { name?: string | null } | null;
};

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  async function loadAnnouncements(isSilent = false) {
    if (!isSilent) setSyncing(true);
    try {
      const response = await fetchApi("/student/communication/announcements");
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  useEffect(() => {
    void loadAnnouncements();

    const socket = getSocket();
    if (socket) {
      const onConnect = () => setSocketConnected(true);
      const onDisconnect = () => setSocketConnected(false);
      const onNewAnnouncement = (newAnn: Announcement) => {
        if (!newAnn) return;
        setAnnouncements((prev) => {
          if (prev.some((a) => a.id === newAnn.id)) return prev;
          return [newAnn, ...prev];
        });
      };

      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("new_announcement", onNewAnnouncement);

      if (socket.connected) setSocketConnected(true);

      return () => {
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("new_announcement", onNewAnnouncement);
      };
    }
  }, []);

  useEffect(() => {
    const pollInterval = socketConnected ? 15000 : 8000;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadAnnouncements(true);
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [socketConnected]);

  const filtered = useMemo(() => {
    return announcements.filter((announcement) => {
      const matchesQuery = `${announcement.title} ${announcement.content}`
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesCategory =
        category === "ALL" ||
        (category === "SCHOOL_WIDE"
          ? announcement.target === "ALL"
          : announcement.target === category);
      return matchesQuery && matchesCategory;
    });
  }, [announcements, category, query]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      {/* ─── Page Header with Unified Sub-Nav ──────────────────────────── */}
      <CommunicationHeader
        title="School Announcements"
        subtitle="Official updates, bulletins, and notices from school administration, grade leadership, and faculty."
        isLive={true}
        onRefresh={() => void loadAnnouncements(false)}
        refreshing={syncing}
      />

      {/* ─── Search & Category Filter ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search announcements by keywords or content..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9.5 pr-3 text-xs outline-none focus:border-[#184973] focus:bg-white focus:ring-1 focus:ring-[#184973] transition"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 shrink-0">Audience:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#184973] transition"
            >
              <option value="ALL">All Notices ({announcements.length})</option>
              <option value="SCHOOL_WIDE">School-wide Broadcasts</option>
              <option value="STUDENTS">Students Specific</option>
              <option value="SPECIFIC_GRADE">Grade Level Notices</option>
              <option value="SPECIFIC_SECTION">Section Bulletins</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Announcement Feed ─── */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-xs">
          <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[#184973]" />
          Loading school announcements...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-xs">
          <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-800">No announcements found</p>
          <p className="mt-1 text-xs text-slate-500">
            {query ? "Try adjusting your search terms or filters." : "New school announcements and circulars will be delivered here live."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((announcement) => (
            <article
              key={announcement.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-[#184973] border border-blue-200">
                  <Tag className="h-3 w-3" />
                  {announcement.target.replaceAll("_", " ")}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {new Date(announcement.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              <h2 className="mt-3 text-base font-bold text-slate-900">
                {announcement.title}
              </h2>

              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">
                {announcement.content}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                  Published by {announcement.author?.name || "School Administration"}
                </span>
                {announcement.expiresAt && (
                  <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Expires: {new Date(announcement.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
