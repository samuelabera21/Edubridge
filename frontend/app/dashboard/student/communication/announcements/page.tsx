"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Megaphone, Search, Tag } from "lucide-react";
import { fetchApi } from "@/lib/api";

type Announcement = { id: string; title: string; content: string; target: string; expiresAt?: string | null; createdAt: string; author?: { name?: string | null } | null };

export default function StudentAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnnouncements() {
      const response = await fetchApi("/student/communication/announcements");
      if (response.ok) setAnnouncements(await response.json());
      setLoading(false);
    }
    void loadAnnouncements();
  }, []);

  const filtered = useMemo(() => announcements.filter((announcement) => {
    const matchesQuery = `${announcement.title} ${announcement.content}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "ALL" || (category === "SCHOOL_WIDE" ? announcement.target === "ALL" : announcement.target === category);
    return matchesQuery && matchesCategory;
  }), [announcements, category, query]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <header className="flex items-start gap-3 border-b border-gray-200 pb-5"><div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-800"><Megaphone className="h-5 w-5" /></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Communication · School news</p><h1 className="mt-1 text-2xl font-bold text-gray-900">School Announcements</h1><p className="mt-1 text-sm text-gray-600">Official notices relevant to your school, grade, and section.</p></div></header>
      <div className="flex flex-col gap-3 border-y border-gray-200 py-3 md:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search announcements" className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm" /></label><select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm"><option value="ALL">All notices</option><option value="SCHOOL_WIDE">School-wide</option><option value="STUDENTS">Students</option><option value="SPECIFIC_GRADE">Grade notices</option><option value="SPECIFIC_SECTION">Section notices</option></select></div>
      {loading ? <div className="rounded-lg bg-white p-6 text-sm text-gray-500">Loading school announcements...</div> : filtered.length === 0 ? <div className="border-y border-dashed border-gray-300 py-12 text-center"><Megaphone className="mx-auto h-8 w-8 text-gray-400" /><p className="mt-3 font-semibold text-gray-900">No announcements found</p><p className="mt-1 text-sm text-gray-500">New official notices for you will appear here.</p></div> : <div className="space-y-3">{filtered.map((announcement) => <article key={announcement.id} className="rounded-lg border border-gray-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><Tag className="h-3 w-3" /> {announcement.target.replaceAll("_", " ")}</span><span className="inline-flex items-center gap-1 text-xs text-gray-500"><CalendarDays className="h-3.5 w-3.5" /> {new Date(announcement.createdAt).toLocaleDateString()}</span></div><h2 className="mt-3 text-lg font-bold text-gray-900">{announcement.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{announcement.content}</p><p className="mt-4 text-xs text-gray-500">Published by {announcement.author?.name || "School administration"}</p></article>)}</div>}
    </div>
  );
}
