"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowLeft, BrainCircuit, CheckCircle2, FileText, NotebookPen } from "lucide-react";

interface LearningHeaderProps {
  title?: string;
  subtitle?: string;
  totalActivities?: number;
  submittedCount?: number;
}

export default function LearningHeader({
  title = "My Learning Activities",
  subtitle = "Complete curriculum homework, self-paced practice drills, and track teacher evaluations.",
  totalActivities,
  submittedCount,
}: LearningHeaderProps) {
  const pathname = usePathname();

  const navTabs = [
    {
      label: "Assignments",
      href: "/dashboard/student/learning/assignments",
      icon: NotebookPen,
      badge: totalActivities !== undefined ? `${totalActivities} tasks` : null,
      active: pathname === "/dashboard/student/learning/assignments" || pathname === "/dashboard/student/learning",
    },
    {
      label: "Practice & Quizzes",
      href: "/dashboard/student/learning/practice",
      icon: BrainCircuit,
      active: pathname === "/dashboard/student/learning/practice",
    },
    {
      label: "Submitted Work",
      href: "/dashboard/student/learning/submissions",
      icon: FileText,
      badge: submittedCount !== undefined && submittedCount > 0 ? `${submittedCount} submitted` : null,
      active: pathname === "/dashboard/student/learning/submissions",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Page Header (Unified My Class Pattern) ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-[#184973] to-[#2563eb] p-3 text-white shadow-md shadow-blue-500/20">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Course Activities
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Active Curriculum
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </header>

        <div className="flex items-center gap-2">
          {totalActivities !== undefined && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-xs text-slate-700">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Work</p>
                <p className="text-sm font-black text-slate-900 leading-none">{totalActivities} Items</p>
              </div>
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

      {/* Modern Sub-Navigation Tabs */}
      <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3" aria-label="Learning sub-navigation">
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
                    tab.active ? "bg-white/20 text-white" : "bg-blue-50 text-[#184973] border border-blue-200"
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
