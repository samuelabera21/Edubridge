"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  ArrowLeft,
  RefreshCw,
  Award,
  Sparkles,
} from "lucide-react";

interface AssessmentHeaderProps {
  title: string;
  subtitle: string;
  averageScore?: number | null;
  totalAssessments?: number;
  gradedCount?: number;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function AssessmentHeader({
  title,
  subtitle,
  averageScore,
  totalAssessments,
  gradedCount,
  onRefresh,
  refreshing = false,
}: AssessmentHeaderProps) {
  const pathname = usePathname();

  const navTabs = [
    {
      label: "Tests & Quizzes",
      href: "/dashboard/student/assessments",
      icon: BarChart3,
      badge: totalAssessments !== undefined ? `${totalAssessments} Total` : null,
      active: pathname === "/dashboard/student/assessments",
    },
    {
      label: "Results & Feedback",
      href: "/dashboard/student/assessments/results",
      icon: CheckCircle2,
      badge: gradedCount !== undefined ? `${gradedCount} Graded` : null,
      active: pathname === "/dashboard/student/assessments/results",
    },
    {
      label: "Performance Trends",
      href: "/dashboard/student/assessments/performance",
      icon: TrendingUp,
      badge: averageScore ? `${averageScore}% Avg` : null,
      active: pathname === "/dashboard/student/assessments/performance",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Top "My Class" Styled Header ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-[#184973] to-[#2563eb] p-3 text-white shadow-md shadow-blue-500/20 shrink-0">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Digital Gradebook
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Curriculum Verified
              </span>
              {averageScore !== undefined && averageScore !== null && (
                <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                  <Award className="h-3 w-3 text-amber-600" />
                  <span>Cumulative: {averageScore}%</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl mt-0.5">
              {title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {subtitle}
            </p>
          </div>
        </header>

        <div className="flex items-center gap-2 flex-wrap">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh Assessment Data"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#184973]" : "text-slate-500"}`} />
              <span>Sync</span>
            </button>
          )}

          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* ─── Horizontal Sub-Nav Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 ${
                tab.active
                  ? "bg-[#184973] text-white shadow-xs shadow-blue-900/10"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${tab.active ? "text-white" : "text-slate-500"}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    tab.active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
