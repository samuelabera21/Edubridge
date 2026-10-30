"use client";

import Link from "next/link";
import { ArrowLeft, Bot, BrainCircuit, CalendarCheck, Sparkles } from "lucide-react";

interface AssistantHeaderProps {
  activeMode?: "explain" | "practice" | "plan";
  onSelectMode?: (mode: "explain" | "practice" | "plan") => void;
  subjectsCount?: number;
}

export default function AssistantHeader({
  activeMode = "explain",
  onSelectMode,
  subjectsCount = 0,
}: AssistantHeaderProps) {
  const tabs = [
    {
      key: "explain" as const,
      label: "AI Tutor Chatbot",
      icon: Bot,
    },
    {
      key: "practice" as const,
      label: "Guided Practice",
      icon: BrainCircuit,
    },
    {
      key: "plan" as const,
      label: "Study Planning",
      icon: CalendarCheck,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Page Header (Unified My Class Pattern) ─── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-tr from-[#184973] to-[#2563eb] p-3 text-white shadow-md shadow-blue-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#184973] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                EduBridge AI
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Curriculum Aligned
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              EduBridge AI Study Assistant
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized concept explanations, curriculum-aligned practice questions, and structured revision plans.
            </p>
          </div>
        </header>

        <div className="flex items-center gap-2">
          {subjectsCount > 0 && (
            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-xs text-slate-700">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Context</p>
                <p className="text-sm font-black text-slate-900 leading-none">{subjectsCount} Subjects</p>
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
      <nav className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3" aria-label="AI Assistant sub-navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMode === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectMode?.(tab.key)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#184973] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-amber-300" : "text-slate-400"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
