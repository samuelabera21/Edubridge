"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, CheckCircle2, Clock3, AlertCircle, BookOpen, Filter, CalendarDays, UserRound, ArrowUpRight } from "lucide-react";
import { fetchApi } from "@/lib/api";
import LearningHeader from "../LearningHeader";

type SubmissionRecord = {
  id: string;
  status: string;
  submittedAt: string | null;
  grade: string | null;
  feedback: string | null;
  contentUrl?: string | null;
  activity: {
    id: string;
    title: string;
    dueDate: string | null;
    type: string;
    description?: string | null;
    teachingAssignment: {
      subject: { name: string };
      teacher: { firstName: string; lastName: string };
      section: { name: string } | null;
    };
  };
};

const statusStyles: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  LATE: "bg-amber-100 text-amber-800 border border-amber-200",
  GRADED: "bg-blue-100 text-[#184973] border border-blue-200 font-bold",
};

export default function StudentLearningSubmissionsPage() {
  const [items, setItems] = useState<SubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetchApi("/student/learning/submissions");
        if (!response.ok) throw new Error("Submitted work request failed");
        const data = await response.json();
        setItems(Array.isArray(data) ? data : []);
        setSelectedId(data[0]?.id ?? null);
      } catch {
        setError("Unable to load submitted work right now.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const summary = useMemo(() => ({
    total: items.length,
    graded: items.filter((item) => item.status === "GRADED").length,
    submitted: items.filter((item) => item.status === "SUBMITTED" || item.status === "LATE").length,
  }), [items]);

  const subjects = useMemo(() => ["ALL", ...Array.from(new Set(items.map((item) => item.activity.teachingAssignment.subject.name)))], [items]);
  const filteredItems = selectedSubject === "ALL" ? items : items.filter((item) => item.activity.teachingAssignment.subject.name === selectedSubject);
  const activeItem = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;

  if (loading) {
    return <div className="mx-auto max-w-6xl animate-pulse rounded-xl bg-white p-6 text-gray-500 shadow-sm">Loading submitted work...</div>;
  }

  if (error) {
    return <div className="mx-auto max-w-6xl rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      <LearningHeader
        title="Submitted Work"
        subtitle="Track submitted assignments, teacher evaluations, grades, and written feedback."
        totalActivities={summary.total}
        submittedCount={summary.submitted}
      />

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
          <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
              Total Submissions
            </span>
            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
              {summary.total}
            </span>
            <p className="text-[11px] text-slate-400 group-hover:text-blue-100 transition-colors duration-300 mt-0.5">
              Activities recorded
            </p>
          </div>
          <FileText className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
        </div>

        <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
          <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
              Awaiting Feedback
            </span>
            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
              {summary.submitted}
            </span>
            <p className="text-[11px] text-slate-400 group-hover:text-blue-100 transition-colors duration-300 mt-0.5">
              Submitted to teacher
            </p>
          </div>
          <Clock3 className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
        </div>

        <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
          <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
              Graded & Reviewed
            </span>
            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
              {summary.graded}
            </span>
            <p className="text-[11px] text-slate-400 group-hover:text-blue-100 transition-colors duration-300 mt-0.5">
              With final feedback
            </p>
          </div>
          <CheckCircle2 className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Submission History</h2>
          <span className="text-xs font-medium text-slate-500">Official Database Records</span>
        </div>

        {/* Subject Filter Pills */}
        <div className="mb-4 flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => setSelectedSubject(subject)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedSubject === subject
                  ? "border-[#184973] bg-[#184973] text-white shadow-xs"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No submitted work found in this subject.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                    activeItem?.id === item.id
                      ? "border-[#184973] bg-blue-50/50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-[#4085b3] hover:shadow-2xs"
                  }`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#184973]" />
                        <p className="font-bold text-slate-900">{item.activity.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">
                        {item.activity.teachingAssignment.subject.name} · {item.activity.teachingAssignment.teacher.firstName} {item.activity.teachingAssignment.teacher.lastName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.grade && (
                        <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-black text-[#184973]">
                          Grade: {item.grade}
                        </span>
                      )}
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[item.status] || "bg-slate-100 text-slate-700"}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      Submitted: {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "Not submitted"}
                    </span>
                    {item.activity.teachingAssignment.section?.name && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                        Section {item.activity.teachingAssignment.section.name}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {activeItem && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[#184973]">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Submission Details</span>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[activeItem.status] || "bg-slate-100 text-slate-700"}`}>
                    {activeItem.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{activeItem.activity.title}</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  {activeItem.activity.description || "Curriculum activity submitted for teacher review."}
                </p>

                <div className="mt-4 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-500">Subject:</span> {activeItem.activity.teachingAssignment.subject.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-500">Instructor:</span> {activeItem.activity.teachingAssignment.teacher.firstName} {activeItem.activity.teachingAssignment.teacher.lastName}
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-500">Submitted:</span> {activeItem.submittedAt ? new Date(activeItem.submittedAt).toLocaleString() : "Not recorded"}
                  </div>
                </div>

                {activeItem.contentUrl && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Submission Content / Note</p>
                    <p className="mt-1 text-xs text-slate-800 break-words">{activeItem.contentUrl}</p>
                  </div>
                )}

                {activeItem.grade ? (
                  <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#184973]">Evaluated Score</span>
                      <span className="rounded-lg bg-[#184973] px-2.5 py-1 text-xs font-black text-white">
                        {activeItem.grade}
                      </span>
                    </div>
                    {activeItem.feedback && (
                      <div className="mt-3 border-t border-blue-200/60 pt-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900">Teacher Feedback</p>
                        <p className="mt-1 text-xs text-slate-700 italic">“{activeItem.feedback}”</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Submitted and waiting for instructor evaluation.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
