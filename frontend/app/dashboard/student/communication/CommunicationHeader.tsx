"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, MessageSquare, Megaphone, Inbox, RefreshCw } from "lucide-react";

interface CommunicationHeaderProps {
  title?: string;
  subtitle?: string;
  isLive?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function CommunicationHeader({
  title = "Communication Hub",
  subtitle = "Live two-way messaging with assigned subject teachers and official school announcements.",
  isLive = true,
  onRefresh,
  refreshing = false,
}: CommunicationHeaderProps) {
  const pathname = usePathname();

  const navTabs = [
    {
      label: "Teacher Messages",
      href: "/dashboard/student/communication/messages",
      icon: MessageSquare,
      active: pathname === "/dashboard/student/communication/messages",
    },
    {
      label: "School Announcements",
      href: "/dashboard/student/communication/announcements",
      icon: Megaphone,
      active: pathname === "/dashboard/student/communication/announcements",
    },
    {
      label: "Communication Overview",
      href: "/dashboard/student/communication",
      icon: Inbox,
      active: pathname === "/dashboard/student/communication",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Page Header (Unified My Class Pattern) ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-[#184973] to-[#2563eb] p-3 text-white shadow-md shadow-blue-500/20">
            <MessageSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Direct Communication
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Channels
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

        <div className="flex items-center gap-2 flex-wrap">
          {isLive && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>Live Sync</span>
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-[#184973]" : "text-slate-500"}`} />
              <span>Refresh</span>
            </button>
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
      <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3" aria-label="Communication sub-navigation">
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
