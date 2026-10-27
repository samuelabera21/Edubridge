"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  Info,
  Calendar,
  Send,
  UserCheck,
} from "lucide-react";
import AttendanceHeader from "../AttendanceHeader";
import { fetchApi } from "../../../../../lib/api";
import { AttendanceRecord } from "../AttendanceHistoryCard";

export default function StudentAbsencePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  // Filter tab
  const [absenceFilter, setAbsenceFilter] = useState<"all" | "unexcused" | "excused">("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadAbsences() {
    try {
      setRefreshing(true);
      const res = await fetchApi("/student/attendance");
      if (!res.ok) throw new Error("Attendance request failed");
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter only absence or excused entries
        setRecords(data);
      }
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
    loadAbsences();
  }, []);

  // Compute metrics
  const totalDays = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const unexcusedAbsences = records.filter((r) => r.status === "ABSENT");
  const excusedAbsences = records.filter((r) => r.status === "EXCUSED");
  const attendanceRate = totalDays > 0 ? Math.round(((presentCount + lateCount + excusedAbsences.length) / totalDays) * 100) : null;

  // Maximum allowed unexcused absences before mandatory intervention
  const MAX_ALLOWED_UNEXCUSED = 5;
  const remainingAllowance = Math.max(0, MAX_ALLOWED_UNEXCUSED - unexcusedAbsences.length);

  // Filtered absence list
  const filteredAbsences = useMemo(() => {
    let list = records.filter((r) => r.status === "ABSENT" || r.status === "EXCUSED");

    if (absenceFilter === "unexcused") {
      list = list.filter((r) => r.status === "ABSENT");
    } else if (absenceFilter === "excused") {
      list = list.filter((r) => r.status === "EXCUSED");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const dateStr = new Date(r.date).toLocaleDateString().toLowerCase();
        const remarks = (r.remarks || "").toLowerCase();
        const period = (r.classPeriod?.name || "").toLowerCase();
        return dateStr.includes(q) || remarks.includes(q) || period.includes(q);
      });
    }

    return list;
  }, [records, absenceFilter, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      <AttendanceHeader
        title="Absence Records & Incident Resolution"
        subtitle="Review recorded absences, verify school policy compliance, and submit excuses for unresolved dates."
        attendanceRate={attendanceRate}
        totalRecords={totalDays}
        unexcusedCount={unexcusedAbsences.length}
      />

      {/* 1. Policy Standing & Warning Status Banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`rounded-xl p-3 ${
                unexcusedAbsences.length >= 3
                  ? "bg-rose-100 text-rose-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Institutional Policy Standing
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    unexcusedAbsences.length === 0
                      ? "bg-emerald-100 text-emerald-800"
                      : unexcusedAbsences.length < 3
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {unexcusedAbsences.length === 0
                    ? "Exemplary Compliance"
                    : unexcusedAbsences.length < 3
                    ? "Normal Standing"
                    : "Action Required"}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">
                {unexcusedAbsences.length} Unexcused{" "}
                {unexcusedAbsences.length === 1 ? "Absence" : "Absences"} Recorded
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                School regulations require formal written documentation for any missed instructional
                days. Submitting an approved doctor&apos;s slip or parent letter converts an unexcused
                absence to an excused standing.
              </p>
            </div>
          </div>

          {/* Policy Gauge Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 min-w-[240px]">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Unexcused Allowance</span>
              <span>
                {unexcusedAbsences.length} / {MAX_ALLOWED_UNEXCUSED} days
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full transition-all duration-500 ${
                  unexcusedAbsences.length >= 3 ? "bg-rose-500" : "bg-amber-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (unexcusedAbsences.length / MAX_ALLOWED_UNEXCUSED) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {remainingAllowance > 0
                ? `${remainingAllowance} days remaining before dean review.`
                : "Allowance threshold reached. Please submit excuses immediately."}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Priority Action Required Queue */}
      {unexcusedAbsences.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/50 via-white to-amber-50/30 p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Action Required: Unresolved Absences Needing Explanation ({unexcusedAbsences.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Click &quot;Submit Written Excuse&quot; to clear each absence with your teacher.
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unexcusedAbsences.map((rec) => {
              const recDate = new Date(rec.date);
              const formattedDate = recDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={`pending-${rec.id}`}
                  className="flex flex-col justify-between rounded-xl border border-rose-200/90 bg-white p-4 shadow-sm hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-700">
                        Unexcused
                      </span>
                      <span className="text-xs text-slate-400">
                        {rec.classPeriod?.name || "Full Day"}
                      </span>
                    </div>

                    <h3 className="mt-2 font-bold text-slate-900">{formattedDate}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {rec.remarks ? rec.remarks : "Unreported absence recorded by school."}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <Link
                      href={`/dashboard/student/attendance/explanation?date=${rec.date.split("T")[0]}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#184973] py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#123655] transition"
                    >
                      <FileText className="h-3.5 w-3.5 text-indigo-300" />
                      <span>Submit Written Excuse</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Comprehensive Absence History Ledger */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Historical Absence Records</h2>
              <p className="text-xs text-slate-500">
                Detailed audit log of all missed class periods and approved excused submissions.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAbsences}
              disabled={refreshing}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
              Refresh Feed
            </button>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: "all", label: "All Missed Days", count: unexcusedAbsences.length + excusedAbsences.length },
                { key: "unexcused", label: "Unexcused", count: unexcusedAbsences.length },
                { key: "excused", label: "Excused & Verified", count: excusedAbsences.length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAbsenceFilter(tab.key as any)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    absenceFilter === tab.key
                      ? "bg-[#184973] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      absenceFilter === tab.key ? "bg-white/20 text-white" : "bg-white text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search absence records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Absence Table */}
        <div className="mt-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-600" />
              Loading absence records...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-rose-600">
              Could not load absence records. Please refresh the page.
            </div>
          ) : filteredAbsences.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-slate-700">No absence records found</p>
              <p className="text-xs text-slate-500 mt-1">
                You have perfect attendance matching this filter! Keep up the good work.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Period</th>
                    <th className="py-3 px-3">Classification</th>
                    <th className="py-3 px-3">Recorded Reason / Notes</th>
                    <th className="py-3 px-3">Recorded By</th>
                    <th className="py-3 px-3 text-right">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAbsences.map((rec) => {
                    const recDate = new Date(rec.date);
                    const formattedDate = recDate.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const isExcused = rec.status === "EXCUSED";

                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <p className="font-bold text-slate-900">{formattedDate}</p>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-medium text-slate-700">
                            {rec.classPeriod?.name || "Homeroom Session"}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {isExcused ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[11px] font-bold text-sky-800">
                              <ShieldCheck className="h-3 w-3 text-sky-600" />
                              Excused Absence
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                              <AlertCircle className="h-3 w-3 text-rose-600" />
                              Unexcused
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 max-w-sm">
                          <p className="text-slate-700">
                            {rec.remarks ? rec.remarks : "Unreported absence."}
                          </p>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-600">
                            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                            <span>{rec.recordedBy?.name || "School Registrar"}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {isExcused ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Formal Note On File
                            </span>
                          ) : (
                            <Link
                              href={`/dashboard/student/attendance/explanation?date=${rec.date.split("T")[0]}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#184973] bg-[#184973] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#123655] transition"
                            >
                              <span>Provide Excuse</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
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