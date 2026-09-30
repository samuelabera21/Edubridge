"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarDays, ArrowUpRight, Filter, NotebookPen, UserRound } from "lucide-react";
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
    section: { name: string } | null;
  };
  submissions: Array<{ status: string; submittedAt?: string | null }>;
};

const statusStyle: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  SUBMITTED: "bg-emerald-100 text-emerald-700",
  LATE: "bg-amber-100 text-amber-700",
  GRADED: "bg-blue-100 text-blue-700",
};

export default function AssignmentsCard() {
  const [items, setItems] = useState<LearningActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssignments() {
      try {
        const response = await fetchApi("/student/learning/activities");
        if (!response.ok) throw new Error("Learning activities request failed");
        const data = await response.json();
        const filtered = data.filter((item: LearningActivity) => item.type !== "PRACTICE" && item.type !== "READING" && item.type !== "LAB");
        setItems(filtered);
        setSelectedId(filtered[0]?.id ?? null);
      } catch {
        setItems([]);
        setSelectedId(null);
      } finally {
        setLoading(false);
      }
    }

    loadAssignments();
  }, []);

  const subjects = useMemo(() => ["ALL", ...Array.from(new Set(items.map((item) => item.teachingAssignment.subject.name)))], [items]);
  const filteredItems = selectedSubject === "ALL" ? items : items.filter((item) => item.teachingAssignment.subject.name === selectedSubject);
  const activeItem = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Assignments</h2>
          <p className="mt-1 text-xs text-gray-500">{items.length} active tasks</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#006b3f]">Live</span>
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

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">No assignments available in this subject.</div>
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
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    activeItem?.id === item.id ? "border-[#006b3f] bg-emerald-50 shadow-sm" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#006b3f]" />
                        <p className="font-semibold text-gray-900">{item.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{item.teachingAssignment.subject.name} · {item.teachingAssignment.teacher.firstName} {item.teachingAssignment.teacher.lastName}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${statusStyle[status] || "bg-gray-100 text-gray-700"}`}>
                      {status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "No due date"}</span>
                    <span>{item.teachingAssignment.section?.name ? `Section ${item.teachingAssignment.section.name}` : "Section not assigned"}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {activeItem && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#006b3f]">
                  <NotebookPen className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">Detail</span>
                </div>
                <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-orange-700">{activeItem.type}</span>
              </div>

              <h3 className="text-lg font-bold text-gray-900">{activeItem.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{activeItem.description || "No description provided for this assignment."}</p>

              <div className="mt-4 space-y-3 text-sm text-gray-700">
                <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-gray-400" /> Subject: {activeItem.teachingAssignment.subject.name}</div>
                <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-gray-400" /> Teacher: {activeItem.teachingAssignment.teacher.firstName} {activeItem.teachingAssignment.teacher.lastName}</div>
                <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gray-400" /> Due: {activeItem.dueDate ? new Date(activeItem.dueDate).toLocaleDateString() : "Not set"}</div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3">
                <span className="text-sm font-medium text-gray-700">Current status</span>
                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${statusStyle[activeItem.submissions[0]?.status || "PENDING"]}`}>
                  {activeItem.submissions[0]?.status || "PENDING"}
                </span>
              </div>

              <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#006b3f]">
                Open assignment <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
