"use client";

import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, CirclePlay, Filter, CalendarDays, UserRound, ArrowUpRight, X, Send, CheckCircle2, Sparkles } from "lucide-react";
import { fetchApi } from "@/lib/api";

type LearningActivity = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  dueDate?: string | null;
  teachingAssignment: {
    subject: { name: string };
    teacher: { firstName: string; lastName: string };
  };
  submissions: Array<{ status: string; grade?: string | null; feedback?: string | null }>;
};

const statusStyle: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  LATE: "bg-amber-100 text-amber-800 border border-amber-200",
  GRADED: "bg-blue-100 text-[#184973] border border-blue-200 font-bold",
};

export default function PracticeAndQuizzesCard() {
  const [items, setItems] = useState<LearningActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Practice Submission Modal
  const [practiceModalItem, setPracticeModalItem] = useState<LearningActivity | null>(null);
  const [practiceNotes, setPracticeNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  async function loadPractice() {
    try {
      const response = await fetchApi("/student/learning/activities");
      if (!response.ok) throw new Error("Practice activities request failed");
      const data = await response.json();
      const filtered = data.filter((item: LearningActivity) => item.type === "PRACTICE" || item.type === "READING" || item.type === "LAB");
      setItems(filtered);
      setSelectedId(filtered[0]?.id ?? null);
    } catch {
      setItems([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPractice();
  }, []);

  const subjects = useMemo(() => ["ALL", ...Array.from(new Set(items.map((item) => item.teachingAssignment.subject.name)))], [items]);
  const filteredItems = selectedSubject === "ALL" ? items : items.filter((item) => item.teachingAssignment.subject.name === selectedSubject);
  const activeItem = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;

  async function handlePracticeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!practiceModalItem) return;
    setSubmitting(true);
    try {
      const response = await fetchApi(`/student/learning/activities/${practiceModalItem.id}/submit`, {
        method: "POST",
        body: JSON.stringify({
          notes: practiceNotes.trim() || undefined,
        }),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        await loadPractice();
        setTimeout(() => {
          setPracticeModalItem(null);
          setSubmitSuccess(false);
          setPracticeNotes("");
        }, 1200);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.error || "Failed to submit practice drill.");
      }
    } catch {
      alert("Network error submitting practice task.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Practice & Quizzes</h2>
          <p className="mt-0.5 text-xs text-slate-500">{items.length} interactive drills & lab reports</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#184973] border border-blue-200">
          Reinforcement
        </span>
      </div>

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

      {loading ? (
        <div className="space-y-3">
          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-14 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
          No practice activities currently available in this subject.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3 text-sm">
            {filteredItems.map((item) => {
              const submission = item.submissions[0];
              const status = submission?.status || "PENDING";

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition cursor-pointer ${
                    activeItem?.id === item.id
                      ? "border-[#184973] bg-blue-50/50 shadow-sm"
                      : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="h-4 w-4 text-[#184973]" />
                        <span className="font-bold text-slate-900">{item.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.teachingAssignment.subject.name} · {item.teachingAssignment.teacher.firstName} {item.teachingAssignment.teacher.lastName}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      {item.type}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {activeItem && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#184973]">
                  <CirclePlay className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">Activity Task</span>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#184973]">
                  {activeItem.type}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900">{activeItem.title}</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {activeItem.description || "Self-guided skill reinforcement practice."}
              </p>

              <div className="mt-4 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-500">Subject:</span> {activeItem.teachingAssignment.subject.name}
                </div>
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-500">Teacher:</span> {activeItem.teachingAssignment.teacher.firstName} {activeItem.teachingAssignment.teacher.lastName}
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-500">Due:</span> {activeItem.dueDate ? new Date(activeItem.dueDate).toLocaleDateString() : "Flexible Practice"}
                </div>
              </div>

              {/* Status banner */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Status</span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle[activeItem.submissions[0]?.status || "PENDING"]}`}>
                    {activeItem.submissions[0]?.status || "PENDING"}
                  </span>
                </div>
                {activeItem.submissions[0]?.grade && (
                  <p className="mt-1 text-xs font-bold text-[#184973]">Grade: {activeItem.submissions[0].grade}</p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPracticeModalItem(activeItem)}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#184973] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#12385b] cursor-pointer"
              >
                <span>{activeItem.submissions[0]?.status === "SUBMITTED" || activeItem.submissions[0]?.status === "GRADED" ? "View Completed Drill" : "Complete & Submit Drill"}</span>
                <CirclePlay className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Practice Submission Modal ─── */}
      {practiceModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setPracticeModalItem(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-[#184973]">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Self-Paced Practice & Lab Work</span>
            </div>

            <h3 className="mt-2 text-xl font-bold text-slate-900">{practiceModalItem.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {practiceModalItem.teachingAssignment.subject.name} · {practiceModalItem.type}
            </p>

            {submitSuccess ? (
              <div className="my-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 animate-bounce" />
                <h4 className="mt-3 text-lg font-bold text-emerald-900">Practice Drill Recorded!</h4>
                <p className="mt-1 text-xs text-emerald-700">Your practice results and notes have been saved to your student profile.</p>
              </div>
            ) : (
              <form onSubmit={handlePracticeSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Practice Solution / Observations / Answers
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={practiceNotes}
                    onChange={(e) => setPracticeNotes(e.target.value)}
                    placeholder="Enter your drill answers, steps, or lab observations..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#184973] focus:outline-hidden focus:ring-1 focus:ring-[#184973]"
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPracticeModalItem(null)}
                    disabled={submitting}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !practiceNotes.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#184973] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#12385b] disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{submitting ? "Saving..." : "Record Practice Work"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
