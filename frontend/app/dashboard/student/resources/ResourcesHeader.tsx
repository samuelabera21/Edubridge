"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Sparkles,
  School,
  ExternalLink,
  ArrowLeft,
  FileCheck2,
  FolderGit2,
} from "lucide-react";

interface ResourcesHeaderProps {
  totalCount?: number;
  recommendedCount?: number;
}

export default function ResourcesHeader({ totalCount = 0, recommendedCount = 0 }: ResourcesHeaderProps) {
  const pathname = usePathname();

  const subNavs = [
    {
      label: "Recommended Resources",
      href: "/dashboard/student/resources/recommended",
      icon: Sparkles,
      badge: recommendedCount > 0 ? `${recommendedCount} for you` : null,
      active: pathname === "/dashboard/student/resources/recommended" || pathname === "/dashboard/student/resources",
    },
    {
      label: "School & Curriculum",
      href: "/dashboard/student/resources/school",
      icon: School,
      active: pathname === "/dashboard/student/resources/school",
    },
    {
      label: "Approved External Links",
      href: "/dashboard/student/resources/links",
      icon: ExternalLink,
      active: pathname === "/dashboard/student/resources/links",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Page Header (My Class pattern) ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-[#184973] to-[#2563eb] p-3 text-white shadow-md shadow-blue-500/20">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Academic Curriculum
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Curriculum Library
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Learning Resources
            </h1>
          </div>
        </header>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-xs text-slate-700">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Repository</p>
              <p className="text-sm font-black text-slate-900 leading-none">{totalCount} Materials</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-1.5 text-[#184973]">
              <FolderGit2 className="h-4 w-4" />
            </div>
          </div>

          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3" aria-label="Learning Resource sub-navigation">
        {subNavs.map((nav) => {
          const Icon = nav.icon;
          return (
            <Link
              key={nav.href}
              href={nav.href}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                nav.active
                  ? "bg-[#184973] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${nav.active ? "text-amber-300" : "text-slate-400"}`} />
              <span>{nav.label}</span>
              {nav.badge && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    nav.active ? "bg-white/20 text-white" : "bg-blue-50 text-[#184973] border border-blue-200"
                  }`}
                >
                  {nav.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
