"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Check,
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
  RefreshCw,
  Search,
  Sparkles,
  UserRound,
  Video,
  X,
  School,
  Tag,
} from "lucide-react";
import { fetchApi } from "../../../../lib/api";
import ResourcesHeader from "./ResourcesHeader";

export type ResourceItem = {
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
  isRecommended?: boolean;
  recommendationNote?: string | null;
  isTeacherMaterial?: boolean;
};

interface LearningResourcesWorkspaceProps {
  initialSubNav?: "teacher" | "recommended" | "school" | "links" | "all";
}

export default function LearningResourcesWorkspace({ initialSubNav = "all" }: LearningResourcesWorkspaceProps) {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Filters & Controls
  const [activeTab, setActiveTab] = useState<"all" | "textbooks" | "documents" | "worksheets" | "links">("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "title-asc" | "subject-asc">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Details Modal & Copy Link Feedback
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyLink = (url: string, id: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  async function loadResources() {
    try {
      setRefreshing(true);
      const [resResponse, dashResponse, actResponse] = await Promise.all([
        fetchApi("/student/resources").catch(() => null),
        fetchApi("/student/dashboard").catch(() => null),
        fetchApi("/student/learning/activities").catch(() => null),
      ]);

      let combined: ResourceItem[] = [];

      // 1. Digital Resources from DB (Admin & Teacher uploads)
      if (resResponse && resResponse.ok) {
        const apiResources = await resResponse.json();
        if (Array.isArray(apiResources) && apiResources.length > 0) {
          apiResources.forEach((r: any) => {
            const hasRec = Array.isArray(r.recommendations) && r.recommendations.length > 0;
            const recNote = hasRec ? r.recommendations[0]?.note : null;
            const isTeacher = Boolean(
              r.isTeacherMaterial ||
              (r.source && r.source.toLowerCase().includes("teacher")) ||
              (r.source && r.source.toLowerCase().includes("unit:")) ||
              (r.authorName && r.authorName.toLowerCase().includes("teacher"))
            );

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
              authorName: r.authorName || r.createdBy?.name || "School Administrator",
              isRecommended: hasRec || isTeacher,
              recommendationNote: recNote,
              isTeacherMaterial: isTeacher,
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
              description: act.description || `Teacher assignment for ${subName}. Due: ${act.dueDate ? new Date(act.dueDate).toLocaleDateString() : "No deadline"}`,
              subjectName: subName,
              gradeName: act.teachingAssignment?.schoolGrade?.grade?.name || "Grade",
              resourceType: actType,
              fileUrl: null,
              externalUrl: `/dashboard/student/learning/assignments`,
              source: `Assigned by ${teacherName}`,
              createdAt: act.createdAt || new Date().toISOString(),
              authorName: teacherName,
              isRecommended: true,
              recommendationNote: `Class activity assigned to your section by ${teacherName}.`,
              isTeacherMaterial: true,
            });
          });
        }
      }

      // 3. Fallback to upcoming activities from dashboard
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
                isRecommended: true,
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

  // Scope resources based on initialSubNav prop
  const scopedResources = useMemo(() => {
    if (initialSubNav === "teacher") {
      return resources.filter((r) => r.isTeacherMaterial);
    }
    if (initialSubNav === "recommended") {
      return resources.filter((r) => r.isRecommended);
    }
    if (initialSubNav === "school") {
      return resources.filter(
        (r) =>
          r.resourceType.toUpperCase() === "TEXTBOOK" ||
          ["DOCUMENT", "WORKSHEET"].includes(r.resourceType.toUpperCase())
      );
    }
    if (initialSubNav === "links") {
      return resources.filter((r) =>
        ["LINK", "VIDEO", "EXTERNAL"].includes(r.resourceType.toUpperCase())
      );
    }
    return resources;
  }, [resources, initialSubNav]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: scopedResources.length,
      textbooks: scopedResources.filter((r) => r.resourceType.toUpperCase() === "TEXTBOOK").length,
      documents: scopedResources.filter((r) => ["DOCUMENT", "NOTE", "SLIDES"].includes(r.resourceType.toUpperCase())).length,
      worksheets: scopedResources.filter((r) => ["WORKSHEET", "PRACTICE", "ACTIVITY"].includes(r.resourceType.toUpperCase())).length,
      links: scopedResources.filter((r) => ["LINK", "VIDEO", "EXTERNAL"].includes(r.resourceType.toUpperCase())).length,
    };
  }, [scopedResources]);

  // Filtered & Sorted Resources
  const filteredResources = useMemo(() => {
    let result = scopedResources.filter((r) => {
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
  }, [scopedResources, activeTab, selectedSubject, searchQuery, sortBy]);

  const getResourceTypeBadge = (type: string) => {
    const t = type.toUpperCase();
    if (t === "TEXTBOOK") {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
          <BookOpen className="h-3 w-3 text-amber-600" />
          Textbook
        </span>
      );
    }
    if (t === "WORKSHEET") {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
          <FileCheck2 className="h-3 w-3 text-emerald-600" />
          Worksheet
        </span>
      );
    }
    if (t === "LINK" || t === "VIDEO") {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
          <ExternalLink className="h-3 w-3 text-purple-600" />
          {t === "VIDEO" ? "Video Lecture" : "Digital Link"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
        <FileText className="h-3 w-3 text-blue-600" />
        Document
      </span>
    );
  };

  const recommendedCount = useMemo(() => resources.filter((r) => r.isRecommended).length, [resources]);
  const teacherCount = useMemo(() => resources.filter((r) => r.isTeacherMaterial).length, [resources]);

  return (
    <div className="space-y-6">
      <ResourcesHeader
        totalCount={resources.length}
        recommendedCount={recommendedCount}
        teacherCount={teacherCount}
      />

      {/* Sub-Nav Description Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {initialSubNav === "teacher" ? (
                  <>
                    <GraduationCap className="h-5 w-5 text-blue-600" />
                    Teacher Materials &amp; Video Tutorials
                  </>
                ) : initialSubNav === "recommended" ? (
                  <>
                    <Sparkles className="h-5 w-5 text-emerald-600" />
                    Teacher-Recommended Learning Materials
                  </>
                ) : initialSubNav === "school" ? (
                  <>
                    <School className="h-5 w-5 text-indigo-600" />
                    School Curriculum Textbooks &amp; Syllabi
                  </>
                ) : initialSubNav === "links" ? (
                  <>
                    <ExternalLink className="h-5 w-5 text-purple-600" />
                    Approved External Educational Links &amp; Labs
                  </>
                ) : (
                  <>
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    All Learning Resources
                  </>
                )}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {initialSubNav === "teacher"
                  ? "Lecture notes, Word/PDF/PowerPoint presentations, and video tutorials posted directly by your subject teachers."
                  : initialSubNav === "recommended"
                  ? "Materials tagged by your instructors specifically for your class section, remedial support, or enrichment."
                  : initialSubNav === "school"
                  ? "Standard curriculum textbooks, departmental guides, and practice problem packets."
                  : initialSubNav === "links"
                  ? "Verified partner links, interactive lab simulations, and video lecture series."
                  : "Explore textbooks, instructor worksheets, lab manuals, and approved digital links."}
              </p>
            </div>

            <button
              type="button"
              onClick={loadResources}
              disabled={refreshing}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
              Refresh Repository
            </button>
          </div>

          {/* Interactive Filters Bar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "all", label: "All Types", count: tabCounts.all },
                { key: "textbooks", label: "Textbooks", count: tabCounts.textbooks },
                { key: "documents", label: "Documents", count: tabCounts.documents },
                { key: "worksheets", label: "Worksheets", count: tabCounts.worksheets },
                { key: "links", label: "Links & Video", count: tabCounts.links },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === tab.key
                      ? "bg-[#184973] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      activeTab === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Subject Dropdown, Search & Sort */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="all">All Subjects</option>
                {distinctSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="newest">Newest First</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="subject-asc">Subject (A-Z)</option>
              </select>

              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* View Switcher */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg p-1 transition ${
                    viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg p-1 transition ${
                    viewMode === "list" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="List View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Cards Display */}
        <div className="mt-5">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-emerald-600" />
              Loading digital repository materials...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-rose-600">
              Could not load learning resources right now. Please refresh.
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No matching materials found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try selecting &quot;All Types&quot; or clearing your search keywords.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredResources.map((res) => (
                <div
                  key={res.id}
                  onClick={() => setSelectedResource(res)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      {getResourceTypeBadge(res.resourceType)}
                      {res.isRecommended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <Sparkles className="h-3 w-3 text-emerald-600" />
                          Recommended
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition line-clamp-2">
                      {res.title}
                    </h3>

                    {res.description && (
                      <p className="mt-1.5 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                        {res.description}
                      </p>
                    )}

                    {res.recommendationNote && (
                      <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/70 p-2 text-[11px] text-emerald-900">
                        <span className="font-bold">Instructor Note: </span>
                        {res.recommendationNote}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{res.subjectName || "General"}</span>
                      <span>{res.authorName || "Faculty"}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedResource(res);
                        }}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                        <span>Details</span>
                      </button>

                      {(res.externalUrl || res.fileUrl) && (
                        <a
                          href={res.externalUrl || res.fileUrl || "#"}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#184973] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#123655] transition"
                        >
                          <span>{res.resourceType === "VIDEO" ? "Watch" : res.fileUrl ? "Download" : "Open"}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3">Title & Summary</th>
                    <th className="py-3 px-3">Subject</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Source / Author</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResources.map((res) => (
                    <tr
                      key={res.id}
                      onClick={() => setSelectedResource(res)}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                    >
                      <td className="py-3 px-3 max-w-sm">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 hover:text-emerald-700 transition">
                            {res.title}
                          </p>
                          {res.isRecommended && (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                              Rec
                            </span>
                          )}
                        </div>
                        {res.description && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{res.description}</p>
                        )}
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-700">{res.subjectName || "General"}</span>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">{getResourceTypeBadge(res.resourceType)}</td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <p className="text-slate-700 font-medium">{res.authorName || "Faculty"}</p>
                        <p className="text-[10px] text-slate-400">{res.source || "School"}</p>
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedResource(res)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Details
                          </button>
                          {(res.externalUrl || res.fileUrl) && (
                            <a
                              href={res.externalUrl || res.fileUrl || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-[#184973] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#123655]"
                            >
                              {res.resourceType === "VIDEO" ? "Watch" : res.fileUrl ? "Download" : "Launch"}
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Resource Details Modal */}
      {selectedResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedResource(null)}
        >
          <div
            className="relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                {getResourceTypeBadge(selectedResource.resourceType)}
                {selectedResource.isRecommended && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    Teacher Recommended
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedResource(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedResource.title}</h3>
                <p className="text-xs font-semibold text-emerald-700 mt-1">
                  Subject: {selectedResource.subjectName || "General Academic"}
                </p>
              </div>

              {selectedResource.description && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs text-slate-700 leading-relaxed">
                  {selectedResource.description}
                </div>
              )}

              {selectedResource.recommendationNote && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    Teacher Recommendation Note:
                  </p>
                  <p className="mt-1 leading-relaxed">{selectedResource.recommendationNote}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Author / Creator</span>
                  <span className="font-medium text-slate-800">{selectedResource.authorName || "Faculty Department"}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-[10px] uppercase">Publishing Source</span>
                  <span className="font-medium text-slate-800">{selectedResource.source || "School Digital Library"}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              {selectedResource.externalUrl || selectedResource.fileUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    handleCopyLink(
                      selectedResource.externalUrl || selectedResource.fileUrl || "",
                      selectedResource.id
                    )
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {copiedId === selectedResource.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copy Resource Link</span>
                    </>
                  )}
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedResource(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>

                {(selectedResource.externalUrl || selectedResource.fileUrl) && (
                  <a
                    href={selectedResource.externalUrl || selectedResource.fileUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#184973] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#123655] transition"
                  >
                    <span>{selectedResource.resourceType === "VIDEO" ? "Watch Tutorial" : selectedResource.fileUrl ? "Open / Download" : "Launch Resource"}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
