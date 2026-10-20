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
  ExternalLink,
  GraduationCap,
  Layers,
  LayoutGrid,
  List,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Sparkles,
  UserCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { fetchApi } from "../../../../../lib/api";
import ClassesHeader from "../ClassesHeader";

export type SubjectItem = {
  id: string;
  subject: {
    id?: string;
    name: string;
    code?: string;
  };
  teacher: {
    id?: string;
    firstName: string;
    lastName: string;
    fatherName?: string;
    email?: string;
    phoneNumber?: string;
  };
  periodsPerWeek?: number;
  section?: { id: string; name: string } | null;
};

export type GroupedTeacher = {
  id: string;
  firstName: string;
  lastName: string;
  fatherName?: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  subjects: Array<{
    name: string;
    code?: string;
    periodsPerWeek?: number;
    sectionName?: string;
  }>;
  totalPeriods: number;
};

type FilterTab = "all" | "teachers" | "subjects";
type SortOption = "name-asc" | "name-desc" | "periods-desc" | "teacher-asc";
type ViewMode = "grid" | "list";

function formatTeacherName(firstName?: string, lastName?: string, fatherName?: string) {
  const parts = [firstName, lastName, fatherName].filter(Boolean);
  if (!parts.length) return "Assigned Teacher";
  return parts
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ""))
    .join(" ");
}

export default function StudentSubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Interactive Filter & Search states
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Interactive Modal state
  const [selectedSubject, setSelectedSubject] = useState<SubjectItem | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<GroupedTeacher | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  useEffect(() => {
    async function loadSubjects() {
      try {
        const dashboardResponse = await fetchApi("/student/dashboard");
        if (!dashboardResponse.ok) throw new Error("Dashboard request failed");
        const dashboard = await dashboardResponse.json();

        if (Array.isArray(dashboard.subjects) && dashboard.subjects.length > 0) {
          setSubjects(dashboard.subjects);
        } else if (Array.isArray(dashboard.weeklyClasses)) {
          const map = new Map<string, SubjectItem>();
          dashboard.weeklyClasses.forEach((entry: {
            id: string;
            teachingAssignment: {
              subject: { id?: string; name: string; code?: string };
              teacher: { id?: string; firstName: string; lastName: string; fatherName?: string; email?: string; phoneNumber?: string };
              periodsPerWeek?: number;
              section?: { id: string; name: string } | null;
            };
          }) => {
            const ta = entry.teachingAssignment;
            if (ta && ta.subject && !map.has(ta.subject.name)) {
              map.set(ta.subject.name, {
                id: entry.id,
                subject: ta.subject,
                teacher: ta.teacher,
                periodsPerWeek: ta.periodsPerWeek,
                section: ta.section,
              });
            }
          });
          setSubjects(Array.from(map.values()));
        } else {
          setSubjects([]);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadSubjects();
  }, []);

  // Compute unique grouped teachers
  const groupedTeachers = useMemo(() => {
    const map = new Map<string, GroupedTeacher>();
    for (const item of subjects) {
      const t = item.teacher;
      const key = t.id || `${t.firstName}_${t.lastName}`.toLowerCase();
      const fullName = formatTeacherName(t.firstName, t.lastName, t.fatherName);

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          firstName: t.firstName,
          lastName: t.lastName,
          fatherName: t.fatherName,
          fullName,
          email: t.email,
          phoneNumber: t.phoneNumber,
          subjects: [],
          totalPeriods: 0,
        });
      }

      const teacherObj = map.get(key)!;
      teacherObj.subjects.push({
        name: item.subject.name,
        code: item.subject.code,
        periodsPerWeek: item.periodsPerWeek,
        sectionName: item.section?.name,
      });
      teacherObj.totalPeriods += item.periodsPerWeek || 0;
    }
    return Array.from(map.values());
  }, [subjects]);

  // Overall Statistics
  const totalWeeklyPeriods = useMemo(() => {
    return subjects.reduce((sum, item) => sum + (item.periodsPerWeek || 0), 0);
  }, [subjects]);

  const activeSection = useMemo(() => {
    return subjects.find((s) => s.section?.name)?.section?.name || null;
  }, [subjects]);

  // Filtered & Sorted Subjects
  const filteredSubjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = subjects.filter((item) => {
      if (!query) return true;
      const teacherName = formatTeacherName(item.teacher.firstName, item.teacher.lastName, item.teacher.fatherName).toLowerCase();
      const subjectName = (item.subject.name || "").toLowerCase();
      const subjectCode = (item.subject.code || "").toLowerCase();
      const email = (item.teacher.email || "").toLowerCase();
      const sectionName = (item.section?.name || "").toLowerCase();

      return (
        subjectName.includes(query) ||
        subjectCode.includes(query) ||
        teacherName.includes(query) ||
        email.includes(query) ||
        sectionName.includes(query)
      );
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "name-asc") return a.subject.name.localeCompare(b.subject.name);
      if (sortBy === "name-desc") return b.subject.name.localeCompare(a.subject.name);
      if (sortBy === "periods-desc") return (b.periodsPerWeek || 0) - (a.periodsPerWeek || 0);
      if (sortBy === "teacher-asc") {
        const nameA = formatTeacherName(a.teacher.firstName, a.teacher.lastName);
        const nameB = formatTeacherName(b.teacher.firstName, b.teacher.lastName);
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return result;
  }, [subjects, searchQuery, sortBy]);

  // Filtered & Sorted Teachers
  const filteredTeachers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = groupedTeachers.filter((t) => {
      if (!query) return true;
      const teacherName = t.fullName.toLowerCase();
      const email = (t.email || "").toLowerCase();
      const phone = (t.phoneNumber || "").toLowerCase();
      const teaches = t.subjects.some(
        (s) => s.name.toLowerCase().includes(query) || (s.code || "").toLowerCase().includes(query)
      );

      return teacherName.includes(query) || email.includes(query) || phone.includes(query) || teaches;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "name-desc" || sortBy === "teacher-asc") return a.fullName.localeCompare(b.fullName);
      if (sortBy === "periods-desc") return b.totalPeriods - a.totalPeriods;
      return a.fullName.localeCompare(b.fullName);
    });

    return result;
  }, [groupedTeachers, searchQuery, sortBy]);

  const activeCount =
    filterTab === "all"
      ? filteredSubjects.length
      : filterTab === "teachers"
      ? filteredTeachers.length
      : filteredSubjects.length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      {/* ─── Page Header with Unified Sub-Nav ──────────────────────────── */}
      <ClassesHeader
        title="Subjects & Teachers"
        subtitle="Enrolled curriculum courses, assigned faculty, and weekly instructional period load."
        totalSubjects={subjects.length}
        totalTeachers={groupedTeachers.length}
        totalPeriods={totalWeeklyPeriods}
        sectionName={activeSection}
      />

      {/* ─── Metric Overview Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Subjects</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{subjects.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Enrolled courses</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Instructors</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{groupedTeachers.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Assigned teachers</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Weekly Periods</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{totalWeeklyPeriods}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Periods per week</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Assigned Section</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {activeSection || "Standard"}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Academic cohort</p>
        </div>
      </div>

      {/* ─── Interactive Filter & Search Bar (Before Box List) ──────── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Primary Filter Tabs: All, Teachers, Subjects */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === "all"
                  ? "bg-white text-[#184973] shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>All</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filterTab === "all" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                }`}
              >
                {subjects.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab("teachers")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === "teachers"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <UserRound className="h-4 w-4 text-emerald-600" />
              <span>Teachers</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filterTab === "teachers" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                }`}
              >
                {groupedTeachers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab("subjects")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterTab === "subjects"
                  ? "bg-white text-[#184973] shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>Subjects</span>
              <span
                className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  filterTab === "subjects" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                }`}
              >
                {subjects.length}
              </span>
            </button>
          </div>

          {/* Interactive Search Input & Sort Options */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  filterTab === "teachers"
                    ? "Search teacher name, email..."
                    : filterTab === "subjects"
                    ? "Search subject or code..."
                    : "Search subjects, teachers, codes..."
                }
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

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden cursor-pointer"
            >
              <option value="name-asc">Sort: Name (A-Z)</option>
              <option value="name-desc">Sort: Name (Z-A)</option>
              <option value="periods-desc">Sort: Most Periods</option>
              <option value="teacher-asc">Sort: By Teacher</option>
            </select>

            {/* View Mode Toggle (Grid / List) */}
            <div className="hidden sm:flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-white">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid View"
                className={`p-1.5 rounded-lg transition ${
                  viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List View"
                className={`p-1.5 rounded-lg transition ${
                  viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Breadcrumb / Active status indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2">
            <span>Showing:</span>
            <span className="font-bold text-slate-800">
              {activeCount} {filterTab === "teachers" ? "teachers" : "subjects"}
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
                Filter: &quot;{searchQuery}&quot;
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-blue-900 ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {(searchQuery || filterTab !== "all" || sortBy !== "name-asc") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterTab("all");
                setSortBy("name-asc");
              }}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* ─── Box List Content ───────────────────────────────────────── */}
      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-sm font-medium">Loading subjects and teachers...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center text-rose-800 shadow-sm space-y-2">
          <p className="font-bold text-base">Could not load subjects and teachers</p>
          <p className="text-xs text-rose-600">Please check your network connection and try again.</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No subjects assigned yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Your school administrator or academic director has not completed subject allocations for your section.
          </p>
        </div>
      ) : activeCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
          <Search className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No matching results found</p>
          <p className="text-xs text-slate-500">
            No items matched your search query &quot;{searchQuery}&quot;.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
          >
            Clear Search
          </button>
        </div>
      ) : filterTab === "teachers" ? (
        /* ─── Teachers Filter View ──────────────────────────────────── */
        <div
          className={
            viewMode === "grid"
              ? "grid gap-5 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredTeachers.map((teacher) => (
            <article
              key={teacher.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div>
                {/* Teacher Header */}
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 font-black text-base shadow-2xs border border-emerald-200/60">
                    {teacher.firstName ? (
                      teacher.firstName.charAt(0).toUpperCase()
                    ) : (
                      <UserRound className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                        {teacher.fullName}
                      </h3>
                      <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500">Subject Faculty Member</p>
                  </div>
                </div>

                {/* Courses Taught by Teacher */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Courses Taught ({teacher.subjects.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {teacher.subjects.map((sub, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                      >
                        <BookOpen className="h-3 w-3 text-emerald-600" />
                        <span>{sub.name}</span>
                        {sub.periodsPerWeek && (
                          <span className="text-[10px] text-emerald-600 bg-white/80 px-1 rounded">
                            {sub.periodsPerWeek}p
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contact Information & Copy */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{teacher.email || "No email on file"}</span>
                    </div>
                    {teacher.email && (
                      <button
                        type="button"
                        onClick={() => handleCopy(teacher.email!, `mail_${teacher.id}`)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                        title="Copy Email"
                      >
                        {copiedText === `mail_${teacher.id}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {teacher.phoneNumber && (
                    <div className="flex items-center justify-between gap-2 border-t border-slate-200/50 pt-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{teacher.phoneNumber}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(teacher.phoneNumber!, `phone_${teacher.id}`)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                        title="Copy Phone"
                      >
                        {copiedText === `phone_${teacher.id}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-500">
                  {teacher.totalPeriods} weekly periods
                </span>

                <div className="flex items-center gap-1.5">
                  <Link
                    href="/dashboard/student/communication/messages"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Message</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSelectedTeacher(teacher)}
                    className="rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 text-xs font-semibold transition"
                  >
                    Details
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : filterTab === "subjects" ? (
        /* ─── Subjects Filter View ──────────────────────────────────── */
        <div
          className={
            viewMode === "grid"
              ? "grid gap-5 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredSubjects.map((item) => (
            <article
              key={item.id || item.subject.name}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.subject.name}
                    </h3>
                    {item.section?.name && (
                      <p className="mt-0.5 text-xs text-slate-500">Section {item.section.name}</p>
                    )}
                  </div>

                  {item.subject.code ? (
                    <span className="rounded-lg bg-blue-50 border border-blue-200/80 px-2.5 py-1 text-xs font-black text-blue-700">
                      {item.subject.code}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      General
                    </span>
                  )}
                </div>

                {/* Period intensity badge */}
                <div className="mt-4 flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    <span className="font-semibold">{item.periodsPerWeek || 0} periods/wk</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">Standard load</span>
                </div>

                {/* Assigned Teacher Mini-Card */}
                <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-800 font-bold text-xs">
                    {item.teacher.firstName ? (
                      item.teacher.firstName.charAt(0).toUpperCase()
                    ) : (
                      <UserRound className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {formatTeacherName(item.teacher.firstName, item.teacher.lastName, item.teacher.fatherName)}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.teacher.email || "Faculty Teacher"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                <Link
                  href="/dashboard/student/classes/schedule"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Timetable</span>
                </Link>

                <div className="flex items-center gap-1.5">
                  <Link
                    href="/dashboard/student/classes/resources"
                    className="rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 text-xs font-semibold transition"
                  >
                    Resources
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedSubject(item)}
                    className="rounded-lg bg-[#184973] hover:bg-[#123654] text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs"
                  >
                    Details
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* ─── "All" Combined Interactive Grid ──────────────────────── */
        <div
          className={
            viewMode === "grid"
              ? "grid gap-5 md:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {filteredSubjects.map((item) => (
            <article
              key={item.id || item.subject.name}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.subject.name}
                    </h3>
                    {item.section?.name && (
                      <p className="mt-0.5 text-xs text-slate-500">Section {item.section.name}</p>
                    )}
                  </div>
                  {item.subject.code && (
                    <span className="rounded-lg bg-blue-50 border border-blue-200/80 px-2.5 py-1 text-xs font-black text-blue-700">
                      {item.subject.code}
                    </span>
                  )}
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-800 font-black text-sm border border-blue-200/60 shadow-2xs">
                      {item.teacher.firstName ? (
                        item.teacher.firstName.charAt(0).toUpperCase()
                      ) : (
                        <UserRound className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-900 truncate">
                        {formatTeacherName(item.teacher.firstName, item.teacher.lastName, item.teacher.fatherName)}
                      </p>
                      <p className="text-[11px] text-slate-500">Instructor</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    {item.periodsPerWeek ? (
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium">{item.periodsPerWeek} periods per week</span>
                      </div>
                    ) : null}
                    {item.teacher.email && (
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span className="truncate">{item.teacher.email}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.teacher.email!, `sub_mail_${item.id}`)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Copy Email"
                        >
                          {copiedText === `sub_mail_${item.id}` ? (
                            <Check className="h-3 w-3 text-emerald-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    )}
                    {item.teacher.phoneNumber && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.teacher.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
                <Link
                  href="/dashboard/student/communication/messages"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Contact</span>
                </Link>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSubject(item)}
                    className="rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 text-xs font-semibold transition"
                  >
                    Quick View
                  </button>
                  <Link
                    href="/dashboard/student/classes/schedule"
                    className="rounded-lg bg-[#184973] hover:bg-[#123654] text-white px-3 py-1.5 text-xs font-bold transition shadow-2xs"
                  >
                    Schedule
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ─── Interactive Subject Detail Modal ──────────────────────── */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setSelectedSubject(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Subject Overview
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {selectedSubject.subject.name}
                </h2>
                {selectedSubject.subject.code && (
                  <p className="text-xs font-semibold text-slate-500">
                    Code: {selectedSubject.subject.code}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Weekly Schedule</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedSubject.periodsPerWeek || 0} Periods / Week
                  </span>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Assigned Section</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedSubject.section?.name ? `Section ${selectedSubject.section.name}` : "General"}
                  </span>
                </div>
              </div>

              {/* Teacher Info */}
              <div className="rounded-xl border border-slate-200/80 p-4 bg-slate-50/50 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned Instructor
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm">
                    {selectedSubject.teacher.firstName ? (
                      selectedSubject.teacher.firstName.charAt(0).toUpperCase()
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">
                      {formatTeacherName(
                        selectedSubject.teacher.firstName,
                        selectedSubject.teacher.lastName,
                        selectedSubject.teacher.fatherName
                      )}
                    </p>
                    <p className="text-xs text-slate-500">Class Faculty</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs text-slate-600">
                  {selectedSubject.teacher.email && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{selectedSubject.teacher.email}</span>
                      </div>
                      <a
                        href={`mailto:${selectedSubject.teacher.email}`}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Email
                      </a>
                    </div>
                  )}
                  {selectedSubject.teacher.phoneNumber && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{selectedSubject.teacher.phoneNumber}</span>
                      </div>
                      <a
                        href={`tel:${selectedSubject.teacher.phoneNumber}`}
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        Call
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Link
                href="/dashboard/student/classes/schedule"
                onClick={() => setSelectedSubject(null)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                View in Schedule
              </Link>
              <Link
                href="/dashboard/student/communication/messages"
                onClick={() => setSelectedSubject(null)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs flex items-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Message Teacher</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Interactive Teacher Detail Modal ──────────────────────── */}
      {selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setSelectedTeacher(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 font-black text-lg border border-emerald-200">
                {selectedTeacher.firstName ? (
                  selectedTeacher.firstName.charAt(0).toUpperCase()
                ) : (
                  <UserRound className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Faculty Profile
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {selectedTeacher.fullName}
                </h2>
                <p className="text-xs text-slate-500">Instructor &bull; {selectedTeacher.totalPeriods} weekly periods</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {/* Subjects taught */}
              <div className="rounded-xl border border-slate-200/80 p-4 bg-slate-50/50">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Allocated Subjects in Your Class
                </p>
                <div className="space-y-2">
                  {selectedTeacher.subjects.map((sub, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200/60 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-slate-800">{sub.name}</span>
                        {sub.code && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
                            {sub.code}
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {sub.periodsPerWeek || 0} periods/wk
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact card */}
              <div className="rounded-xl border border-slate-200/80 p-4 bg-white space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Direct Contact
                </p>
                <div className="space-y-2 text-xs">
                  {selectedTeacher.email ? (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{selectedTeacher.email}</span>
                      </div>
                      <a
                        href={`mailto:${selectedTeacher.email}`}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Send Email
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No email provided</p>
                  )}

                  {selectedTeacher.phoneNumber && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="font-medium text-slate-700">{selectedTeacher.phoneNumber}</span>
                      </div>
                      <a
                        href={`tel:${selectedTeacher.phoneNumber}`}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Call
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedTeacher(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <Link
                href="/dashboard/student/communication/messages"
                onClick={() => setSelectedTeacher(null)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs flex items-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Message Instructor</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}