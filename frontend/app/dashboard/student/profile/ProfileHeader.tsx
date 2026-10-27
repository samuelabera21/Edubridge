"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, GraduationCap, School, User, FileText } from "lucide-react";

interface ProfileHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function ProfileHeader({
  title = "My Profile",
  subtitle = "View and verify your registered academic identity, section enrollment, and school details.",
}: ProfileHeaderProps) {
  const pathname = usePathname();

  const navTabs = [
    {
      label: "Student Information",
      href: "/dashboard/student/profile/information",
      icon: User,
      active: pathname === "/dashboard/student/profile/information" || pathname === "/dashboard/student/profile",
    },
    {
      label: "School & Enrollment",
      href: "/dashboard/student/profile/enrollment",
      icon: School,
      active: pathname === "/dashboard/student/profile/enrollment",
    },
    {
      label: "Enrollment Documents",
      href: "/dashboard/student/profile/documents",
      icon: FileText,
      active: pathname === "/dashboard/student/profile/documents",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Page Header (Unified My Class Pattern) ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-[#184973] to-[#2563eb] p-3 text-white shadow-md shadow-blue-500/20">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Official Student Record
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Verified Identity
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
      <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3" aria-label="Profile sub-navigation">
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
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
