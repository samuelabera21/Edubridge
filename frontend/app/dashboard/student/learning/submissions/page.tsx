"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, CheckCircle2, Clock3, AlertCircle, BookOpen, Filter, CalendarDays, UserRound } from "lucide-react";
import { fetchApi } from "@/lib/api";

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
  SUBMITTED: "bg-emerald-100 text-emerald-700",
  LATE: "bg-amber-100 text-amber-700",
  GRADED: "bg-blue-100 text-blue-700",
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
        setItems(data);
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
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">My learning</p>
          <h1 className="text-2xl font-bold text-gray-900">Submitted Work</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total submissions" value={String(summary.total)} icon={<FileText className="h-5 w-5" />} />
        <SummaryCard label="Submitted" value={String(summary.submitted)} icon={<CheckCircle2 className="h-5 w-5" />} />
        <SummaryCard label="Graded" value={String(summary.graded)} icon={<Clock3 className="h-5 w-5" />} />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Submission history</h2>
          <span className="text-sm text-gray-500">Current academic year</span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {subjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => setSelectedSubject(subject)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedSubject === subject ? "border-[#006b3f] bg-[#006b3f] text-white" : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
            >
              {subject}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">No submitted work in this subject yet.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    activeItem?.id === item.id ? "border-[#006b3f] bg-emerald-50 shadow-sm" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#006b3f]" />
                        <p className="font-semibold text-gray-900">{item.activity.title}</p>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{item.activity.teachingAssignment.subject.name} · {item.activity.teachingAssignment.teacher.firstName} {item.activity.teachingAssignment.teacher.lastName}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status] || "bg-gray-100 text-gray-700"}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : "Not submitted"}</span>
                    <span>{item.activity.teachingAssignment.section?.name ? `Section ${item.activity.teachingAssignment.section.name}` : "Section not assigned"}</span>
                  </div>
                </button>
              ))}
            </div>

            {activeItem && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-violet-700">
                    <FileText className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">Detail</span>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusStyles[activeItem.status] || "bg-gray-100 text-gray-700"}`}>
                    {activeItem.status}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900">{activeItem.activity.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{activeItem.activity.description || "No description provided for this submission."}</p>

                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-gray-400" /> Subject: {activeItem.activity.teachingAssignment.subject.name}</div>
                  <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-gray-400" /> Teacher: {activeItem.activity.teachingAssignment.teacher.firstName} {activeItem.activity.teachingAssignment.teacher.lastName}</div>
                  <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gray-400" /> Submitted: {activeItem.submittedAt ? new Date(activeItem.submittedAt).toLocaleDateString() : "Not submitted"}</div>
                </div>

                {activeItem.contentUrl && (
                  <a href={activeItem.contentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#006b3f] hover:underline">
                    <FileText className="h-4 w-4" /> View file
                  </a>
                )}

                {activeItem.grade && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="font-semibold">Grade: {activeItem.grade}</p>
                    {activeItem.feedback && <p className="mt-1">{activeItem.feedback}</p>}
                  </div>
                )}

                {!activeItem.grade && activeItem.status === "SUBMITTED" && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertCircle className="h-4 w-4" />
                    Awaiting teacher feedback.
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

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-[#006b3f]">{icon}</div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
