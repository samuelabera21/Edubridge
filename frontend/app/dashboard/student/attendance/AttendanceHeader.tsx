"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  AlertTriangle,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ClipboardCheck,
} from "lucide-react";

interface AttendanceHeaderProps {
  title: string;
  subtitle: string;
  attendanceRate?: number | null;
  totalRecords?: number;
  unexcusedCount?: number;
}

export default function AttendanceHeader({
  title,
  subtitle,
  attendanceRate,
  totalRecords,
  unexcusedCount = 0,
}: AttendanceHeaderProps) {
  const pathname = usePathname();

  const navTabs = [
    {
      label: "Attendance History",
      href: "/dashboard/student/attendance",
      icon: CalendarDays,
      badge: totalRecords !== undefined ? `${totalRecords} days` : null,
      active: pathname === "/dashboard/student/attendance",
    },
    {
      label: "Absence Records",
      href: "/dashboard/student/attendance/absence",
      icon: AlertTriangle,
      badge: unexcusedCount > 0 ? `${unexcusedCount} unexcused` : "0 unexcused",
      badgeVariant: unexcusedCount > 0 ? "danger" : "neutral",
      active: pathname === "/dashboard/student/attendance/absence",
    },
    {
      label: "Submit Explanation",
      href: "/dashboard/student/attendance/explanation",
      icon: FileText,
      active: pathname === "/dashboard/student/attendance/explanation",
    },
  ];

  const rateColor =
    attendanceRate === null || attendanceRate === undefined
      ? "bg-slate-100 text-slate-700 border-slate-200"
      : attendanceRate >= 90
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : attendanceRate >= 80
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-rose-50 text-rose-800 border-rose-200";

  return (
    <div className="space-y-4">
      {/* ─── Page Header (My Class pattern) ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-[#184973] to-[#2563eb] p-3 text-white shadow-md shadow-blue-500/20">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Student Attendance Portal
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Official Records
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>
        </header>

        <div className="flex items-center gap-2">
          {attendanceRate !== undefined && attendanceRate !== null && (
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-xs ${rateColor}`}>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-inherit opacity-75">
                  Overall Rate
                </p>
                <p className="text-sm font-black leading-none text-inherit">{attendanceRate}%</p>
              </div>
              {attendanceRate >= 85 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
            </div>
          )}

          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Modern Attendance Sub-Navigation Tabs */}
      <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3" aria-label="Attendance tabs">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                tab.active
                  ? "bg-[#184973] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${tab.active ? "text-amber-300" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    tab.badgeVariant === "danger"
                      ? tab.active
                        ? "bg-rose-500 text-white"
                        : "bg-rose-100 text-rose-700 border border-rose-200"
                      : tab.active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
