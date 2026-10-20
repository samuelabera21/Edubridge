"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  LayoutGrid,
  List,
  Search,
  Sparkles,
  Tag,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { fetchApi } from "../../../../../lib/api";
import ClassesHeader from "../ClassesHeader";

export type DigitalResourceItem = {
  id: string;
  title: string;
  description?: string | null;
  subjectName?: string | null;
  gradeName?: string | null;
  resourceType: "TEXTBOOK" | "DOCUMENT" | "WORKSHEET" | "VIDEO" | "LINK" | string;
  fileUrl?: string | null;
  externalUrl?: string | null;
  source?: string | null;
  createdAt: string;
  authorName?: string;
};

type ResourceTab = "all" | "textbooks" | "documents" | "worksheets" | "links";
type SortOption = "newest" | "title-asc" | "subject-asc";
type ViewMode = "grid" | "list";



export default function StudentResourcesPage() {
  const [resources, setResources] = useState<DigitalResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<ResourceTab>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Interactive details modal
  const [selectedResource, setSelectedResource] = useState<DigitalResourceItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (url: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const [refreshing, setRefreshing] = useState(false);

  async function loadResources() {
    try {
      setRefreshing(true);
      const [resResponse, dashResponse, actResponse] = await Promise.all([
        fetchApi("/student/resources").catch(() => null),
        fetchApi("/student/dashboard").catch(() => null),
        fetchApi("/student/learning/activities").catch(() => null),
      ]);

      let combined: DigitalResourceItem[] = [];

      // 1. Digital Resources from DB (Admin & Teacher uploads)
      if (resResponse && resResponse.ok) {
        const apiResources = await resResponse.json();
        if (Array.isArray(apiResources) && apiResources.length > 0) {
          apiResources.forEach((r: any) => {
            combined.push({
              id: r.id,
              title: r.title,
              description: r.description,
              subjectName: r.subjectName || "General",
              gradeName: r.gradeName,
              resourceType: r.resourceType || "DOCUMENT",
              fileUrl: r.fileUrl,
              externalUrl: r.externalUrl || r.fileUrl,
              source: r.source || "School Digital Repository",
              createdAt: r.createdAt || new Date().toISOString(),
              authorName: r.createdBy?.name || "School Administrator",
            });
          });
        }
      }

      // 2. Learning Activities from DB (Teacher assignments, reading, labs, worksheets)
      if (actResponse && actResponse.ok) {
        const activities = await actResponse.json();
        if (Array.isArray(activities) && activities.length > 0) {
          activities.forEach((act: any) => {
            const teacherName = act.teachingAssignment?.teacher
              ? [act.teachingAssignment.teacher.firstName, act.teachingAssignment.teacher.lastName].filter(Boolean).join(" ")
              : "Course Faculty";
            const subName = act.teachingAssignment?.subject?.name || "General Subject";
            const actType = act.type === "LAB" ? "DOCUMENT" : act.type === "READING" ? "DOCUMENT" : "WORKSHEET";

            combined.push({
              id: `act_${act.id}`,
              title: act.title,
              description: act.description || `Teacher assignment for ${subName}. Due: ${act.dueDate ? new Date(act.dueDate).toLocaleDateString() : "No deadline specified"}`,
              subjectName: subName,
              gradeName: act.teachingAssignment?.schoolGrade?.grade?.name || "Grade",
              resourceType: actType,
              fileUrl: null,
              externalUrl: `/dashboard/student/learning/assignments`,
              source: `Assigned by ${teacherName}`,
              createdAt: act.createdAt || new Date().toISOString(),
              authorName: teacherName,
            });
          });
        }
      }

      // 3. Fallback to upcoming activities from dashboard if not already added
      if (dashResponse && dashResponse.ok && combined.length === 0) {
        const dashData = await dashResponse.json();
        if (Array.isArray(dashData.upcomingActivities)) {
          dashData.upcomingActivities.forEach((act: any) => {
            if (act.title) {
              combined.push({
                id: `dash_act_${act.id}`,
                title: act.title,
                description: act.description || `Curriculum activity for ${act.teachingAssignment?.subject?.name || "class"}.`,
                subjectName: act.teachingAssignment?.subject?.name || "General",
                gradeName: dashData.enrollment?.schoolGrade?.grade?.name || "Grade",
                resourceType: "WORKSHEET",
                fileUrl: null,
                externalUrl: `/dashboard/student/learning/assignments`,
                source: "Course Instructor",
                createdAt: act.createdAt || new Date().toISOString(),
                authorName: "Course Faculty",
              });
            }
          });
        }
      }

      // Set resources exclusively from real-world data fetched from database & curriculum API
      const unique = Array.from(new Map(combined.map((m) => [m.id, m])).values());
      setResources(unique);
      setError(false);
    } catch (err) {
      console.error("Failed to load learning resources from API", err);
      setError(true);
      setResources([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadResources();
  }, []);

  // Distinct subjects
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => {
      if (r.subjectName) set.add(r.subjectName);
    });
    return Array.from(set).sort();
  }, [resources]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: resources.length,
      textbooks: resources.filter((r) => r.resourceType.toUpperCase() === "TEXTBOOK").length,
      documents: resources.filter((r) => ["DOCUMENT", "NOTE", "SLIDES"].includes(r.resourceType.toUpperCase())).length,
      worksheets: resources.filter((r) => ["WORKSHEET", "PRACTICE", "ACTIVITY"].includes(r.resourceType.toUpperCase())).length,
      links: resources.filter((r) => ["LINK", "VIDEO", "EXTERNAL"].includes(r.resourceType.toUpperCase())).length,
    };
  }, [resources]);

  // Filtered & Sorted Resources
  const filteredResources = useMemo(() => {
    let result = resources.filter((r) => {
      // Tab filter
      const type = (r.resourceType || "").toUpperCase();
      if (activeTab === "textbooks" && type !== "TEXTBOOK") return false;
      if (activeTab === "documents" && !["DOCUMENT", "NOTE", "SLIDES"].includes(type)) return false;
      if (activeTab === "worksheets" && !["WORKSHEET", "PRACTICE", "ACTIVITY"].includes(type)) return false;
      if (activeTab === "links" && !["LINK", "VIDEO", "EXTERNAL"].includes(type)) return false;

      // Subject filter
      if (selectedSubject !== "all" && r.subjectName !== selectedSubject) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (r.title || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const sub = (r.subjectName || "").toLowerCase();
        const author = (r.authorName || "").toLowerCase();
        const source = (r.source || "").toLowerCase();

        return title.includes(q) || desc.includes(q) || sub.includes(q) || author.includes(q) || source.includes(q);
      }

      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "title-asc") return a.title.localeCompare(b.title);
      if (sortBy === "subject-asc") return (a.subjectName || "").localeCompare(b.subjectName || "");
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    return result;
  }, [resources, activeTab, selectedSubject, searchQuery, sortBy]);

  const getResourceTypeBadge = (type: string) => {
    const t = type.toUpperCase();
    if (t === "TEXTBOOK") {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
          <BookOpen className="h-3 w-3 text-amber-600" />
          Textbook
        </span>
      );
    }
    if (t === "WORKSHEET") {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
          <FileCheck2 className="h-3 w-3 text-emerald-600" />
          Worksheet
        </span>
      );
    }
    if (t === "LINK" || t === "VIDEO") {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200/80 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
          <ExternalLink className="h-3 w-3 text-purple-600" />
          {t === "VIDEO" ? "Video Lecture" : "Digital Link"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200/80 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider">
        <FileText className="h-3 w-3 text-blue-600" />
        Document
      </span>
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      {/* ─── Header with Unified Sub-Nav ────────────────────────── */}
      <ClassesHeader
        title="Learning Resources"
        subtitle="Instructional library of course materials, digital textbooks, and faculty worksheets."
        totalSubjects={distinctSubjects.length}
        totalPeriods={resources.length}
      />

      {/* ─── Metric Overview Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Materials</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{resources.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Study files &amp; guides</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Textbooks</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{tabCounts.textbooks}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Curriculum e-books</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Subjects Covered</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{distinctSubjects.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Academic disciplines</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Practice Sheets</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <FileCheck2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{tabCounts.worksheets}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Review worksheets</p>
        </div>
      </div>

      {/* ─── Interactive Filter & Search Bar (Before Box List) ──────── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-4">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === "all"
                ? "bg-[#184973] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All Materials</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {tabCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("textbooks")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === "textbooks"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Textbooks &amp; E-Books</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "textbooks" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {tabCounts.textbooks}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === "documents"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Lecture Notes &amp; Handouts</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "documents" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {tabCounts.documents}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("worksheets")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === "worksheets"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Worksheets &amp; Practice</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "worksheets" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {tabCounts.worksheets}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === "links"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Links &amp; Media</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === "links" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {tabCounts.links}
            </span>
          </button>
        </div>

        {/* Search, Subject Filter & Sorting */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search resources, titles, subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Subject Filter Dropdown */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden cursor-pointer"
            >
              <option value="all">All Disciplines ({distinctSubjects.length})</option>
              {distinctSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden cursor-pointer"
            >
              <option value="newest">Sort: Latest Added</option>
              <option value="title-asc">Sort: Title (A-Z)</option>
              <option value="subject-asc">Sort: By Subject</option>
            </select>
          </div>

          {/* View Mode Toggle (Grid / List) */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-white self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List View"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Breadcrumbs */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2.5">
          <div className="flex items-center gap-2">
            <span>Showing:</span>
            <span className="font-bold text-slate-800">
              {filteredResources.length} materials
            </span>
            {selectedSubject !== "all" && (
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold text-[11px] border border-blue-200">
                Subject: {selectedSubject}
              </span>
            )}
            {searchQuery && (
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                &quot;{searchQuery}&quot;
              </span>
            )}
          </div>

          {(searchQuery || selectedSubject !== "all" || activeTab !== "all" || sortBy !== "newest") && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setSelectedSubject("all");
                setSearchQuery("");
                setSortBy("newest");
              }}
              className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ─── Resource Box List ──────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-sm font-medium">Loading learning resources...</p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No resources found</p>
          <p className="text-xs text-slate-500">
            No materials matched your filter criteria &quot;{searchQuery || selectedSubject}&quot;.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab("all");
              setSelectedSubject("all");
              setSearchQuery("");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid gap-5 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredResources.map((item) => {
            const openUrl = item.externalUrl || item.fileUrl || "#";
            const isExternal = Boolean(item.externalUrl && !item.externalUrl.startsWith("/"));

            return (
              <article
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#184973] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200/70">
                      <Tag className="h-3 w-3 text-blue-600" />
                      {item.subjectName || "Curriculum"}
                    </span>
                    {getResourceTypeBadge(item.resourceType)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 mt-1">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate">{item.source || "School Curriculum"}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(openUrl, item.id)}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
                      title="Copy Resource Link"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedResource(item)}
                      className="rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 text-xs font-semibold transition"
                    >
                      Details
                    </button>
                  </div>

                  <a
                    href={openUrl}
                    target={isExternal ? "_blank" : undefined}
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#184973] hover:bg-[#123654] text-white px-3.5 py-1.5 text-xs font-bold transition shadow-2xs"
                  >
                    <span>Open</span>
                    {isExternal ? (
                      <ExternalLink className="h-3.5 w-3.5" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ─── Interactive Resource Detail Modal ────────────────────── */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setSelectedResource(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {selectedResource.subjectName || "Curriculum"}
                  </span>
                  {getResourceTypeBadge(selectedResource.resourceType)}
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {selectedResource.title}
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3.5 text-xs">
              {selectedResource.description && (
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-slate-400 block mb-1 font-semibold uppercase text-[10px]">
                    Description &amp; Syllabus Context
                  </span>
                  <p className="text-slate-700 text-xs leading-relaxed">
                    {selectedResource.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Source / Authority</span>
                  <span className="font-bold text-slate-800 text-xs block">
                    {selectedResource.source || "Ministry Curriculum"}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Added On</span>
                  <span className="font-bold text-slate-800 text-xs block">
                    {new Date(selectedResource.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {selectedResource.authorName && (
                <div className="rounded-xl border border-slate-200/80 p-3 bg-white flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Uploaded by</span>
                    <p className="font-bold text-xs text-slate-800">{selectedResource.authorName}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedResource(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Close
              </button>

              <a
                href={selectedResource.externalUrl || selectedResource.fileUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#184973] hover:bg-[#123654] text-white px-4 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <span>Access Resource</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}