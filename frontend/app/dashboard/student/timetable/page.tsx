"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Filter,
  GraduationCap,
  Layers,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  MessageSquare,
  Printer,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "../../../../lib/api";

type StudentDashboardData = {
  student: { studentId: string; name: string };
  enrollment: {
    academicYear: { id: string; name: string };
    schoolGrade: { grade: { name: string } };
    section: { id: string; name: string } | null;
  };
  weeklyClasses: TimetableEntry[];
  subjects?: Array<{
    id: string;
    subject: { name: string; code?: string };
    teacher: { firstName: string; lastName: string; email?: string; phoneNumber?: string };
  }>;
};

export type TimetableEntry = {
  id: string;
  dayOfWeek: number;
  classPeriod: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
  teachingAssignment: {
    subject: { name: string; code?: string };
    teacher: { firstName: string; lastName: string; email?: string; phoneNumber?: string };
    section: { name: string } | null;
  };
  room: { name: string; description: string | null; status: string } | null;
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const schoolDayNumbers = [1, 2, 3, 4, 5]; // Mon - Fri
const schoolDayLabels = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function parseTimeToMinutes(value: string) {
  if (!value) return 0;
  const parts = value.split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

function formatPeriodDuration(startTime: string, endTime: string) {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const diff = end - start;
  if (diff <= 0) return "45m";
  return `${diff} mins`;
}

function getPeriodStatus(entry: TimetableEntry) {
  const now = new Date();
  const currentDay = now.getDay();
  const isToday = entry.dayOfWeek === currentDay;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTimeToMinutes(entry.classPeriod.startTime);
  const endMinutes = parseTimeToMinutes(entry.classPeriod.endTime);

  if (isToday && nowMinutes >= startMinutes && nowMinutes <= endMinutes) {
    return "In Progress";
  }

  if (isToday && nowMinutes > endMinutes) {
    return "Completed";
  }

  if (isToday && nowMinutes < startMinutes) {
    return "Upcoming";
  }

  return "Scheduled";
}

function formatTeacherName(firstName?: string, lastName?: string) {
  const parts = [firstName, lastName].filter(Boolean);
  if (!parts.length) return "Assigned Teacher";
  return parts
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ""))
    .join(" ");
}

export default function StudentTimetablePage() {
  const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interactive controls
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | "all">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid");
  const [selectedEntry, setSelectedEntry] = useState<TimetableEntry | null>(null);

  useEffect(() => {
    async function loadTimetable() {
      try {
        const dashboardRes = await fetchApi("/student/dashboard");
        if (!dashboardRes.ok) throw new Error("Student dashboard request failed");

        const dashboardData: StudentDashboardData = await dashboardRes.json();
        setDashboard(dashboardData);
        setTimetable(Array.isArray(dashboardData.weeklyClasses) ? dashboardData.weeklyClasses : []);
      } catch (err) {
        console.error(err);
        setError("We could not load your timetable right now.");
      } finally {
        setLoading(false);
      }
    }

    loadTimetable();
  }, []);

  // Today identification
  const currentDayOfWeek = new Date().getDay();
  const isSchoolDayToday = schoolDayNumbers.includes(currentDayOfWeek);

  // Distinct subjects in timetable
  const distinctSubjects = useMemo(() => {
    const set = new Set<string>();
    timetable.forEach((entry) => {
      if (entry.teachingAssignment?.subject?.name) {
        set.add(entry.teachingAssignment.subject.name);
      }
    });
    return Array.from(set).sort();
  }, [timetable]);

  // Distinct period rows sorted chronologically
  const periodRows = useMemo(() => {
    return Array.from(
      new Map(
        timetable.map((entry) => [entry.classPeriod.id, entry.classPeriod])
      ).values()
    ).sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));
  }, [timetable]);

  // Filtered timetable entries
  const filteredEntries = useMemo(() => {
    return timetable.filter((entry) => {
      // Day filter
      if (selectedDayFilter !== "all" && entry.dayOfWeek !== selectedDayFilter) {
        return false;
      }
      // Subject filter
      if (
        subjectFilter !== "all" &&
        entry.teachingAssignment?.subject?.name !== subjectFilter
      ) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sub = (entry.teachingAssignment?.subject?.name || "").toLowerCase();
        const code = (entry.teachingAssignment?.subject?.code || "").toLowerCase();
        const teacher = formatTeacherName(
          entry.teachingAssignment?.teacher?.firstName,
          entry.teachingAssignment?.teacher?.lastName
        ).toLowerCase();
        const room = (entry.room?.name || "").toLowerCase();
        const period = (entry.classPeriod?.name || "").toLowerCase();
        const day = (dayNames[entry.dayOfWeek] || "").toLowerCase();

        return (
          sub.includes(q) ||
          code.includes(q) ||
          teacher.includes(q) ||
          room.includes(q) ||
          period.includes(q) ||
          day.includes(q)
        );
      }
      return true;
    });
  }, [timetable, selectedDayFilter, subjectFilter, searchQuery]);

  // Grid lookup map: day -> periodId -> TimetableEntry
  const gridByDay = useMemo(() => {
    const map = new Map<number, Map<string, TimetableEntry>>();
    schoolDayNumbers.forEach((d) => map.set(d, new Map()));

    filteredEntries.forEach((entry) => {
      if (!map.has(entry.dayOfWeek)) return;
      map.get(entry.dayOfWeek)?.set(entry.classPeriod.id, entry);
    });

    return map;
  }, [filteredEntries]);

  // Active or Next Upcoming period today
  const liveOrNextClass = useMemo(() => {
    if (!isSchoolDayToday) return null;
    const todayEntries = timetable.filter((e) => e.dayOfWeek === currentDayOfWeek);
    const inProgress = todayEntries.find((e) => getPeriodStatus(e) === "In Progress");
    if (inProgress) return { entry: inProgress, status: "In Progress" as const };
    const upcoming = todayEntries
      .filter((e) => getPeriodStatus(e) === "Upcoming")
      .sort((a, b) => parseTimeToMinutes(a.classPeriod.startTime) - parseTimeToMinutes(b.classPeriod.startTime))[0];
    if (upcoming) return { entry: upcoming, status: "Upcoming" as const };
    return null;
  }, [timetable, currentDayOfWeek, isSchoolDayToday]);

  const totalWeeklyClasses = timetable.length;
  const gradeName = dashboard?.enrollment?.schoolGrade?.grade?.name ?? "Academic Grade";
  const sectionName = dashboard?.enrollment?.section?.name ? `Section ${dashboard.enrollment.section.name}` : "Cohort";
  const academicYear = dashboard?.enrollment?.academicYear?.name || "Academic Year 2026";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4 print:p-0">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-[#184973] to-[#2563eb] p-3 text-white shadow-md shadow-blue-500/20">
            <CalendarDays className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Instructional Schedule
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {gradeName} &bull; {sectionName}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Class Schedule &amp; Timetable
            </h1>
          </div>
        </header>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
            title="Print Timetable"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Print Schedule</span>
          </button>

          <Link
            href="/dashboard/student/classes/subjects"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4 text-blue-600" />
            <span>Subjects</span>
          </Link>

          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* ─── Live Today's Class Focus Banner (if active) ────────────── */}
      {liveOrNextClass && (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#184973] to-[#1e3a5f] p-5 text-white shadow-md print:hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    liveOrNextClass.status === "In Progress"
                      ? "bg-emerald-500 text-white animate-pulse"
                      : "bg-blue-400 text-blue-950 font-bold"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {liveOrNextClass.status === "In Progress" ? "In Session Right Now" : "Next Upcoming Period"}
                </span>
                <span className="text-xs text-blue-200 font-medium">
                  {dayNames[currentDayOfWeek]} &bull; {liveOrNextClass.entry.classPeriod.name}
                </span>
              </div>
              <h2 className="text-xl font-black">
                {liveOrNextClass.entry.teachingAssignment.subject.name}
              </h2>
              <p className="text-xs text-blue-100 flex items-center gap-3">
                <span>Instructor: {formatTeacherName(liveOrNextClass.entry.teachingAssignment.teacher.firstName, liveOrNextClass.entry.teachingAssignment.teacher.lastName)}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-blue-300" />
                  {liveOrNextClass.entry.room?.name || "Main Classroom"}
                </span>
                <span>&bull;</span>
                <span>
                  {liveOrNextClass.entry.classPeriod.startTime} - {liveOrNextClass.entry.classPeriod.endTime}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedEntry(liveOrNextClass.entry)}
                className="rounded-xl bg-white/20 hover:bg-white/30 text-white px-3.5 py-2 text-xs font-bold transition backdrop-blur-xs cursor-pointer"
              >
                Inspect Period
              </button>
              <Link
                href="/dashboard/student/communication/messages"
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Message Teacher</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── Metric Overview Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Weekly Classes</span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <CalendarDays className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{totalWeeklyClasses}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Total scheduled periods</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Scheduled Subjects</span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{distinctSubjects.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Active curriculum courses</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Daily Periods</span>
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{periodRows.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Periods per academic day</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Current Day</span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-black text-slate-900 truncate">
            {dayNames[currentDayOfWeek]}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isSchoolDayToday ? "Instructional day" : "Weekend period"}
          </p>
        </div>
      </div>

      {/* ─── Interactive Controls (Day Tabs, Subject Filters, Search, View) ─── */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-4 print:hidden">
        {/* Day Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedDayFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              selectedDayFilter === "all"
                ? "bg-[#184973] text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Full Week (Mon - Fri)</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              selectedDayFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
            }`}>
              {timetable.length}
            </span>
          </button>

          {isSchoolDayToday && (
            <button
              type="button"
              onClick={() => setSelectedDayFilter(currentDayOfWeek)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                selectedDayFilter === currentDayOfWeek
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>Today ({dayNames[currentDayOfWeek]})</span>
              <span className="text-[10px] bg-emerald-700/40 text-white px-1.5 py-0.2 rounded-full font-bold">
                {timetable.filter((e) => e.dayOfWeek === currentDayOfWeek).length}
              </span>
            </button>
          )}

          {schoolDayNumbers.map((dayNum, idx) => {
            const isSelected = selectedDayFilter === dayNum;
            const dayClassCount = timetable.filter((e) => e.dayOfWeek === dayNum).length;

            return (
              <button
                key={dayNum}
                type="button"
                onClick={() => setSelectedDayFilter(dayNum)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? "bg-[#184973] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <span>{schoolDayLabels[idx]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                }`}>
                  {dayClassCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Subject Filter & View Mode */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, teacher, room..."
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

            {/* Subject Dropdown Filter */}
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden cursor-pointer"
            >
              <option value="all">All Subjects ({distinctSubjects.length})</option>
              {distinctSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle: Grid vs Agenda Timeline */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-white">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Timetable Matrix"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Matrix</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("agenda")}
                title="Agenda Timeline"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === "agenda" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Timeline</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(searchQuery || subjectFilter !== "all" || selectedDayFilter !== "all") && (
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Active Filters:</span>
              {selectedDayFilter !== "all" && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold text-[11px] border border-blue-200">
                  Day: {dayNames[selectedDayFilter]}
                </span>
              )}
              {subjectFilter !== "all" && (
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold text-[11px] border border-emerald-200">
                  Subject: {subjectFilter}
                </span>
              )}
              {searchQuery && (
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                  &quot;{searchQuery}&quot;
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedDayFilter("all");
                setSubjectFilter("all");
                setSearchQuery("");
              }}
              className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* ─── Main Timetable Display Area ────────────────────────────── */}
      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-sm font-medium">Loading schedule...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center text-rose-800 shadow-sm space-y-2">
          <p className="font-bold text-base">{error}</p>
          <p className="text-xs text-rose-600">Please refresh the page to retry.</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 shadow-sm space-y-3">
          <CalendarDays className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No scheduled classes found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {timetable.length === 0
              ? "Your academic timetable has not been published by your school administrator yet."
              : "No classes match your selected day or subject filter."}
          </p>
          {timetable.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedDayFilter("all");
                setSubjectFilter("all");
                setSearchQuery("");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === "agenda" || selectedDayFilter !== "all" ? (
        /* ─── Agenda Timeline View ─────────────────────────────────── */
        <div className="space-y-4">
          {(selectedDayFilter === "all" ? schoolDayNumbers : [selectedDayFilter]).map((dayNum) => {
            const dayClasses = filteredEntries
              .filter((e) => e.dayOfWeek === dayNum)
              .sort((a, b) => parseTimeToMinutes(a.classPeriod.startTime) - parseTimeToMinutes(b.classPeriod.startTime));

            if (dayClasses.length === 0) return null;

            const isToday = currentDayOfWeek === dayNum;

            return (
              <div
                key={dayNum}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-base text-slate-900">
                      {dayNames[dayNum]}
                    </span>
                    {isToday && (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-200">
                        Today
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {dayClasses.length} Scheduled Periods
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dayClasses.map((entry) => {
                    const status = getPeriodStatus(entry);
                    const isInProgress = status === "In Progress";
                    const isUpcoming = status === "Upcoming";

                    return (
                      <div
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                          isInProgress
                            ? "border-emerald-300 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-400/30"
                            : "border-slate-100 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-200"
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black text-xs ${
                              isInProgress
                                ? "bg-emerald-600 text-white"
                                : "bg-blue-100 text-[#184973]"
                            }`}
                          >
                            {entry.classPeriod.name.replace(/[^0-9]/g, "") || "P"}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition">
                                {entry.teachingAssignment.subject.name}
                              </h3>
                              {entry.teachingAssignment.subject.code && (
                                <span className="bg-white border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-bold text-slate-600">
                                  {entry.teachingAssignment.subject.code}
                                </span>
                              )}
                              {isInProgress && (
                                <span className="bg-emerald-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full animate-pulse">
                                  Now
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>Instructor: {formatTeacherName(entry.teachingAssignment.teacher.firstName, entry.teachingAssignment.teacher.lastName)}</span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {entry.room?.name || "Main Classroom"}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-bold text-slate-800 block">
                              {entry.classPeriod.startTime} - {entry.classPeriod.endTime}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatPeriodDuration(entry.classPeriod.startTime, entry.classPeriod.endTime)}
                            </span>
                          </div>

                          <button
                            type="button"
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── Full Weekly Matrix Grid View ──────────────────────────── */
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200">
                <th className="p-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 border-r border-slate-200 w-32">
                  Period / Time
                </th>
                {schoolDayNumbers.map((dayNum, idx) => {
                  const isToday = currentDayOfWeek === dayNum;
                  return (
                    <th
                      key={dayNum}
                      className={`p-3.5 text-center text-xs font-bold uppercase tracking-wider border-r border-slate-200 last:border-r-0 ${
                        isToday ? "bg-emerald-50 text-emerald-800" : "text-slate-700"
                      }`}
                    >
                      <div>{schoolDayLabels[idx]}</div>
                      {isToday && (
                        <div className="mt-0.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                          Today
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {periodRows.map((period) => (
                <tr key={period.id} className="border-b border-slate-100 last:border-b-0 align-top">
                  <th className="border-r border-slate-200 bg-slate-50/60 p-3.5 text-left font-normal align-top">
                    <div className="font-bold text-xs text-slate-900">{period.name}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {period.startTime} - {period.endTime}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {formatPeriodDuration(period.startTime, period.endTime)}
                    </div>
                  </th>

                  {schoolDayNumbers.map((dayNum) => {
                    const entry = gridByDay.get(dayNum)?.get(period.id) ?? null;
                    const isToday = currentDayOfWeek === dayNum;
                    const status = entry ? getPeriodStatus(entry) : null;
                    const isInProgress = status === "In Progress";

                    return (
                      <td
                        key={`${dayNum}-${period.id}`}
                        className={`p-2 border-r border-slate-200 last:border-r-0 align-top ${
                          isToday ? "bg-emerald-50/30" : "bg-white"
                        }`}
                      >
                        {entry ? (
                          <button
                            type="button"
                            onClick={() => setSelectedEntry(entry)}
                            className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                              isInProgress
                                ? "border-emerald-300 bg-emerald-50/90 shadow-xs ring-2 ring-emerald-400/40"
                                : "border-slate-200/80 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className="text-[11px] font-black text-[#184973] uppercase tracking-wide truncate">
                                {entry.teachingAssignment.subject.name}
                              </span>
                              {isInProgress && (
                                <span className="bg-emerald-600 text-white text-[8px] font-black uppercase px-1.5 py-0.2 rounded-full shrink-0 animate-pulse">
                                  Now
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {formatTeacherName(
                                entry.teachingAssignment.teacher.firstName,
                                entry.teachingAssignment.teacher.lastName
                              )}
                            </p>

                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-200/50 pt-1.5">
                              <span className="flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                {entry.room?.name || "Room TBD"}
                              </span>
                              <span>{entry.classPeriod.startTime}</span>
                            </div>
                          </button>
                        ) : (
                          <div className="min-h-[88px] flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-[10px] text-slate-400 font-medium">
                            Free Period
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Interactive Class Period Detail Modal ─────────────────── */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {dayNames[selectedEntry.dayOfWeek]} &bull; {selectedEntry.classPeriod.name}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {selectedEntry.teachingAssignment.subject.name}
                </h2>
                {selectedEntry.teachingAssignment.subject.code && (
                  <p className="text-xs font-semibold text-slate-500">
                    Code: {selectedEntry.teachingAssignment.subject.code}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Class Time</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {selectedEntry.classPeriod.startTime} - {selectedEntry.classPeriod.endTime}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Duration: {formatPeriodDuration(selectedEntry.classPeriod.startTime, selectedEntry.classPeriod.endTime)}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <span className="text-slate-400 block mb-0.5 font-medium">Class Location</span>
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    {selectedEntry.room?.name || "Assigned Classroom"}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Status: {getPeriodStatus(selectedEntry)}
                  </span>
                </div>
              </div>

              {/* Instructor Card */}
              <div className="rounded-xl border border-slate-200/80 p-3.5 bg-slate-50/50 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Course Faculty
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm">
                    {selectedEntry.teachingAssignment.teacher.firstName ? (
                      selectedEntry.teachingAssignment.teacher.firstName.charAt(0).toUpperCase()
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">
                      {formatTeacherName(
                        selectedEntry.teachingAssignment.teacher.firstName,
                        selectedEntry.teachingAssignment.teacher.lastName
                      )}
                    </p>
                    <p className="text-xs text-slate-500">Instructor</p>
                  </div>
                </div>

                {selectedEntry.teachingAssignment.teacher.email && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-2 text-slate-600 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{selectedEntry.teachingAssignment.teacher.email}</span>
                    </div>
                    <a
                      href={`mailto:${selectedEntry.teachingAssignment.teacher.email}`}
                      className="text-blue-600 hover:underline font-semibold shrink-0"
                    >
                      Email
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Link
                href="/dashboard/student/classes/subjects"
                onClick={() => setSelectedEntry(null)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Subject Details
              </Link>
              <Link
                href="/dashboard/student/communication/messages"
                onClick={() => setSelectedEntry(null)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow-xs flex items-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Message Teacher</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
