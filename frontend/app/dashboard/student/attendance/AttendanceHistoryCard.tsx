"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  FileText,
  UserCheck,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { fetchApi } from "../../../../lib/api";

export type AttendanceRecord = {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks: string | null;
  classPeriod: {
    id?: string;
    name: string;
    startTime?: string;
    endTime?: string;
  } | null;
  recordedBy?: {
    id: string;
    name: string;
    email?: string;
  } | null;
};

const statusConfig: Record<
  AttendanceRecord["status"],
  { label: string; bg: string; text: string; border: string; dot: string; icon: any }
> = {
  PRESENT: {
    label: "Present",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
  },
  LATE: {
    label: "Late",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
    icon: Clock,
  },
  ABSENT: {
    label: "Absent (Unexcused)",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    dot: "bg-rose-500",
    icon: AlertCircle,
  },
  EXCUSED: {
    label: "Excused",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    dot: "bg-sky-500",
    icon: ShieldAlert,
  },
};

export default function AttendanceHistoryCard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Filters & State
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "this-month" | "last-30">("all");
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Calendar View month cursor
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);

  async function loadAttendance() {
    try {
      setRefreshing(true);
      const res = await fetchApi("/student/attendance");
      if (!res.ok) throw new Error("Attendance request failed");
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, []);

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = records.length;
    const present = records.filter((r) => r.status === "PRESENT").length;
    const late = records.filter((r) => r.status === "LATE").length;
    const absent = records.filter((r) => r.status === "ABSENT").length;
    const excused = records.filter((r) => r.status === "EXCUSED").length;

    // Standard school attendance formula: (Present + Late + Excused) / Total
    const effectiveAttended = present + late + excused;
    const rate = total > 0 ? Math.round((effectiveAttended / total) * 100) : null;

    return { total, present, late, absent, excused, rate };
  }, [records]);

  // Current calendar month view calculation
  const calendarDateContext = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + calendarMonthOffset);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthName = d.toLocaleString("default", { month: "long" });

    // Days in this month
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    // Map records by YYYY-MM-DD
    const recordsMap = new Map<string, AttendanceRecord[]>();
    records.forEach((r) => {
      const dateKey = r.date.split("T")[0];
      if (!recordsMap.has(dateKey)) recordsMap.set(dateKey, []);
      recordsMap.get(dateKey)!.push(r);
    });

    const days = [];
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const dayDate = new Date(year, month, dayNum);
      const dayOfWeek = dayDate.getDay(); // 0 is Sun, 6 is Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const yyyy = year.toString();
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(dayNum).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const dayRecords = recordsMap.get(dateStr) || [];
      // Prioritize primary status: ABSENT > LATE > EXCUSED > PRESENT
      let dayStatus: AttendanceRecord["status"] | null = null;
      if (dayRecords.some((r) => r.status === "ABSENT")) dayStatus = "ABSENT";
      else if (dayRecords.some((r) => r.status === "LATE")) dayStatus = "LATE";
      else if (dayRecords.some((r) => r.status === "EXCUSED")) dayStatus = "EXCUSED";
      else if (dayRecords.some((r) => r.status === "PRESENT")) dayStatus = "PRESENT";

      days.push({
        dayNum,
        dayOfWeek,
        dateStr,
        isWeekend,
        isToday: new Date().toISOString().split("T")[0] === dateStr,
        status: dayStatus,
        records: dayRecords,
      });
    }

    return { year, month, monthName, days };
  }, [calendarMonthOffset, records]);

  // Filtered Records for Ledger
  const filteredRecords = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return records.filter((record) => {
      const recDate = new Date(record.date);

      // Selected calendar date click
      if (selectedCalendarDate) {
        if (record.date.split("T")[0] !== selectedCalendarDate) return false;
      }

      // Status filter
      if (selectedStatus !== "all" && record.status !== selectedStatus) {
        return false;
      }

      // Date range filter
      if (dateFilter === "this-month" && recDate < startOfCurrentMonth) {
        return false;
      }
      if (dateFilter === "last-30" && recDate < thirtyDaysAgo) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const periodName = (record.classPeriod?.name || "").toLowerCase();
        const remarks = (record.remarks || "").toLowerCase();
        const teacherName = (record.recordedBy?.name || "").toLowerCase();
        const dateStr = new Date(record.date).toLocaleDateString().toLowerCase();

        return (
          periodName.includes(q) ||
          remarks.includes(q) ||
          teacherName.includes(q) ||
          dateStr.includes(q)
        );
      }

      return true;
    });
  }, [records, selectedStatus, dateFilter, selectedCalendarDate, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Attendance Metrics KPI Grid */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Attendance Rate */}
        <div className="col-span-2 sm:col-span-1 relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm group cursor-pointer hover:border-[#4085b3] transition-all duration-300">
          <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-100 transition-colors duration-300">
              Standing Rate
            </span>
            <Sparkles className="h-4 w-4 text-indigo-500 group-hover:text-white transition-colors duration-300" />
          </div>
          <div className="relative z-10 mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 group-hover:text-white transition-colors duration-300">
              {metrics.rate !== null ? `${metrics.rate}%` : "--"}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 group-hover:text-emerald-200 transition-colors duration-300">
              {metrics.rate !== null && metrics.rate >= 85 ? "Optimal" : "Attention"}
            </span>
          </div>
          <div className="relative z-10 mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 group-hover:bg-white/30 transition-colors duration-300">
            <div
              className={`h-full transition-all duration-500 ${
                metrics.rate && metrics.rate >= 85 ? "bg-emerald-500 group-hover:bg-emerald-300" : "bg-amber-500 group-hover:bg-amber-300"
              }`}
              style={{ width: `${metrics.rate || 0}%` }}
            />
          </div>
        </div>

        {/* Total Sessions */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm group cursor-pointer hover:border-[#4085b3] transition-all duration-300">
          <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
          <div className="relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-blue-100 transition-colors duration-300">
              School Days
            </span>
            <p className="mt-2 text-2xl font-black text-slate-900 group-hover:text-white transition-colors duration-300">{metrics.total}</p>
            <p className="text-[11px] text-slate-500 group-hover:text-blue-100 transition-colors duration-300 mt-1">Recorded sessions</p>
          </div>
        </div>

        {/* Present */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm group cursor-pointer hover:border-[#4085b3] transition-all duration-300">
          <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 group-hover:text-blue-100 transition-colors duration-300">
                Present
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-900 group-hover:text-white transition-colors duration-300">{metrics.present}</p>
            <p className="text-[11px] font-medium text-emerald-700 group-hover:text-blue-100 transition-colors duration-300 mt-1">
              {metrics.total > 0 ? Math.round((metrics.present / metrics.total) * 100) : 0}% attendance
            </p>
          </div>
        </div>

        {/* Late */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm group cursor-pointer hover:border-[#4085b3] transition-all duration-300">
          <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 group-hover:text-blue-100 transition-colors duration-300">
                Late
              </span>
              <Clock className="h-4 w-4 text-amber-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-900 group-hover:text-white transition-colors duration-300">{metrics.late}</p>
            <p className="text-[11px] font-medium text-amber-700 group-hover:text-blue-100 transition-colors duration-300 mt-1">Tardy incidents</p>
          </div>
        </div>

        {/* Unexcused Absences */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm group cursor-pointer hover:border-[#4085b3] transition-all duration-300">
          <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700 group-hover:text-blue-100 transition-colors duration-300">
                Unexcused
              </span>
              <AlertCircle className="h-4 w-4 text-rose-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <p className="mt-2 text-2xl font-black text-rose-900 group-hover:text-white transition-colors duration-300">{metrics.absent}</p>
            <p className="text-[11px] font-medium text-rose-700 group-hover:text-blue-100 transition-colors duration-300 mt-1">Requires excuse</p>
          </div>
        </div>

        {/* Excused Absences */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-sky-50/50 p-4 shadow-sm group cursor-pointer hover:border-[#4085b3] transition-all duration-300">
          <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 group-hover:text-blue-100 transition-colors duration-300">
                Excused
              </span>
              <ShieldAlert className="h-4 w-4 text-sky-600 group-hover:text-white transition-colors duration-300" />
            </div>
            <p className="mt-2 text-2xl font-black text-sky-900 group-hover:text-white transition-colors duration-300">{metrics.excused}</p>
            <p className="text-[11px] font-medium text-sky-700 group-hover:text-blue-100 transition-colors duration-300 mt-1">Approved notices</p>
          </div>
        </div>
      </section>

      {/* 2. Interactive Monthly Calendar View */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-indigo-600" />
              Monthly Attendance Heatmap
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any school day to filter and inspect detailed period attendance and teacher remarks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setCalendarMonthOffset((prev) => prev - 1)}
                className="rounded-lg p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title="Previous Month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800">
                {calendarDateContext.monthName} {calendarDateContext.year}
              </span>
              <button
                type="button"
                onClick={() => setCalendarMonthOffset((prev) => prev + 1)}
                className="rounded-lg p-1 text-slate-600 hover:bg-white hover:text-slate-900 transition"
                title="Next Month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {calendarMonthOffset !== 0 && (
              <button
                type="button"
                onClick={() => setCalendarMonthOffset(0)}
                className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Today
              </button>
            )}

            {selectedCalendarDate && (
              <button
                type="button"
                onClick={() => setSelectedCalendarDate(null)}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
              >
                Reset Day Filter
              </button>
            )}
          </div>
        </div>

        {/* Days of week header */}
        <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar days grid */}
        <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
          {/* Leading blank spacers */}
          {Array.from({ length: calendarDateContext.days[0]?.dayOfWeek || 0 }).map((_, idx) => (
            <div key={`blank-${idx}`} className="h-12 sm:h-14 rounded-xl bg-slate-50/40" />
          ))}

          {calendarDateContext.days.map((day) => {
            const isSelected = selectedCalendarDate === day.dateStr;
            let statusPill = null;
            if (day.status === "PRESENT") {
              statusPill = <span className="h-2 w-2 rounded-full bg-emerald-500" title="Present" />;
            } else if (day.status === "LATE") {
              statusPill = <span className="h-2 w-2 rounded-full bg-amber-500" title="Late" />;
            } else if (day.status === "ABSENT") {
              statusPill = <span className="h-2 w-2 rounded-full bg-rose-500" title="Absent" />;
            } else if (day.status === "EXCUSED") {
              statusPill = <span className="h-2 w-2 rounded-full bg-sky-500" title="Excused" />;
            }

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => {
                  if (day.records.length > 0) {
                    setSelectedCalendarDate(isSelected ? null : day.dateStr);
                  }
                }}
                disabled={day.records.length === 0}
                className={`relative flex h-12 sm:h-14 flex-col items-center justify-between rounded-xl border p-1.5 transition text-left ${
                  day.isWeekend
                    ? "border-transparent bg-slate-50/50 text-slate-300 cursor-default"
                    : isSelected
                    ? "border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/30"
                    : day.status === "ABSENT"
                    ? "border-rose-200 bg-rose-50/40 hover:bg-rose-50"
                    : day.status === "LATE"
                    ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50"
                    : day.status === "EXCUSED"
                    ? "border-sky-200 bg-sky-50/40 hover:bg-sky-50"
                    : day.records.length > 0
                    ? "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                    : "border-dashed border-slate-200 bg-slate-50/30 text-slate-400 cursor-default"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      day.isToday
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-[#184973] text-white font-bold"
                        : isSelected
                        ? "font-bold text-indigo-900"
                        : "text-slate-700"
                    }`}
                  >
                    {day.dayNum}
                  </span>
                  {statusPill}
                </div>

                {day.records.length > 0 && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-tight hidden sm:block ${
                      day.status === "ABSENT"
                        ? "text-rose-600"
                        : day.status === "LATE"
                        ? "text-amber-600"
                        : day.status === "EXCUSED"
                        ? "text-sky-600"
                        : "text-emerald-600"
                    }`}
                  >
                    {day.status === "PRESENT"
                      ? "Present"
                      : day.status === "LATE"
                      ? "Late"
                      : day.status === "ABSENT"
                      ? "Absent"
                      : "Excused"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Late Arrival
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Unexcused Absence
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> Approved Excuse
            </span>
          </div>

          {selectedCalendarDate && (
            <p className="text-xs font-medium text-indigo-700">
              Showing records for{" "}
              <strong>{new Date(selectedCalendarDate).toLocaleDateString()}</strong>
            </p>
          )}
        </div>
      </section>

      {/* 3. Interactive Attendance Ledger / Records Table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Controls Bar */}
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Attendance Log & Records</h2>
              <p className="text-xs text-slate-500">
                Official attendance records entered by subject teachers and homeroom supervisors.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAttendance}
              disabled={refreshing}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
              Refresh Feed
            </button>
          </div>

          {/* Status Tabs + Range & Search */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "all", label: "All Logs", count: records.length },
                { key: "PRESENT", label: "Present", count: metrics.present },
                { key: "LATE", label: "Late", count: metrics.late },
                { key: "ABSENT", label: "Absent", count: metrics.absent },
                { key: "EXCUSED", label: "Excused", count: metrics.excused },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    selectedStatus === tab.key
                      ? "bg-[#184973] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      selectedStatus === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick Date Range + Search */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
              >
                <option value="all">All Dates</option>
                <option value="this-month">This Month</option>
                <option value="last-30">Past 30 Days</option>
              </select>

              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search period, remarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Records Listing */}
        <div className="mt-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-600" />
              Loading your verified attendance records...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-rose-600">
              Could not load attendance history from the database. Please try again.
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarIcon className="mx-auto mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No attendance records found</p>
              <p className="text-xs text-slate-500 mt-1">
                {selectedCalendarDate
                  ? `No records on ${new Date(selectedCalendarDate).toLocaleDateString()}`
                  : "No attendance entries match your active filters."}
              </p>
              {selectedCalendarDate && (
                <button
                  type="button"
                  onClick={() => setSelectedCalendarDate(null)}
                  className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Clear calendar filter
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3">Date & Day</th>
                    <th className="py-3 px-3">Class Period</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Teacher Remarks</th>
                    <th className="py-3 px-3">Recorded By</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => {
                    const statusMeta = statusConfig[record.status] || statusConfig.PRESENT;
                    const StatusIcon = statusMeta.icon;
                    const recDate = new Date(record.date);
                    const formattedDate = recDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="font-bold text-slate-900">{formattedDate}</p>
                          <p className="text-[10px] text-slate-400">
                            {recDate.toLocaleDateString("en-US", { weekday: "long" })}
                          </p>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-700">
                            {record.classPeriod?.name || "Homeroom Session"}
                          </span>
                          {record.classPeriod?.startTime && (
                            <p className="text-[10px] text-slate-400">
                              {record.classPeriod.startTime} - {record.classPeriod.endTime}
                            </p>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusMeta.label}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          {record.remarks ? (
                            <span className="text-slate-700 font-medium">{record.remarks}</span>
                          ) : (
                            <span className="text-slate-400 italic">No notes entered</span>
                          )}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {record.recordedBy?.name ? (
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                              <span>{record.recordedBy.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Academic Faculty</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {record.status === "ABSENT" || record.status === "LATE" ? (
                            <Link
                              href={`/dashboard/student/attendance/explanation?date=${record.date.split("T")[0]}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Submit Excuse</span>
                            </Link>
                          ) : (
                            <span className="text-[11px] text-slate-400">Verified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
