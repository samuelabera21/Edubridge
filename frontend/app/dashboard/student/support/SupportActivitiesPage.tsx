"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  HeartHandshake,
  Send,
  Sparkles,
  X,
  Compass,
  Zap,
  TrendingUp,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import SupportHeader from "./SupportHeader";

type SupportCategory = "RECOMMENDATION" | "REMEDIAL" | "ENRICHMENT";
type SupportActivity = {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  supportCategory: SupportCategory;
  dueDate?: string | null;
  createdAt: string;
  teachingAssignment: {
    subject: { name: string };
    teacher: { firstName: string; lastName: string };
  };
  submission: {
    status: string;
    submittedAt?: string | null;
    grade?: string | null;
    feedback?: string | null;
  } | null;
};

type SupportView = "RECOMMENDATION" | "REMEDIAL" | "ENRICHMENT" | "PROGRESS";
type InterventionPlan = { id: string; targetScore: string; counselorName: string | null; reviewDate: string | null; status: string; createdAt: string };
type InterventionMonitoring = { id: string; programName: string; attendanceRate: number; status: string; lastCheckInDate: string };
type InterventionOutcome = { id: string; initialScore: number; postScore: number; gain: number; status: string; createdAt: string };

const viewContent: Record<SupportView, { title: string; description: string; iconLabel: string }> = {
  RECOMMENDATION: {
    title: "Recommendations",
    description: "Guidance, approved study suggestions, and focus topics your instructors have selected for you.",
    iconLabel: "Teacher guidance",
  },
  REMEDIAL: {
    title: "Remedial Activities",
    description: "Targeted skill reinforcement and step-by-step extra practice assigned to solidify core topics.",
    iconLabel: "Skill Reinforcement",
  },
  ENRICHMENT: {
    title: "Enrichment Activities",
    description: "Advanced challenge concepts, research investigations, and extension projects for deeper mastery.",
    iconLabel: "Advanced Challenges",
  },
  PROGRESS: {
    title: "Intervention & Progress",
    description: "Comprehensive history of assigned academic support, attendance monitoring, and evaluated outcomes.",
    iconLabel: "Student Growth",
  },
};

const statusStyles: Record<string, string> = {
  ASSIGNED: "bg-blue-50 text-[#184973] border border-blue-200",
  PENDING: "bg-slate-100 text-slate-700 border border-slate-200",
  SUBMITTED: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  GRADED: "bg-blue-100 text-[#184973] border border-blue-200 font-bold",
};

export default function SupportActivitiesPage({ view }: { view: SupportView }) {
  const [activities, setActivities] = useState<SupportActivity[]>([]);
  const [interventionPlans, setInterventionPlans] = useState<InterventionPlan[]>([]);
  const [interventionMonitoring, setInterventionMonitoring] = useState<InterventionMonitoring[]>([]);
  const [interventionOutcomes, setInterventionOutcomes] = useState<InterventionOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Submit Modal state
  const [submitModalItem, setSubmitModalItem] = useState<SupportActivity | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  async function loadSupportData() {
    try {
      const response = await fetchApi("/student/support");
      if (!response.ok) throw new Error("Support activities request failed");
      const data = await response.json();
      setActivities(data.activities ?? []);
      setInterventionPlans(data.interventionPlans ?? []);
      setInterventionMonitoring(data.interventionMonitoring ?? []);
      setInterventionOutcomes(data.interventionOutcomes ?? []);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupportData();
  }, []);

  const content = viewContent[view];
  const visibleActivities = useMemo(() => {
    if (view === "PROGRESS") return activities;
    return activities.filter((activity) => activity.supportCategory === view);
  }, [activities, view]);

  const selectedActivity = visibleActivities.find((activity) => activity.id === selectedId) ?? visibleActivities[0] ?? null;
  const completeCount = visibleActivities.filter((activity) => activity.submission?.status === "GRADED").length;
  const pendingCount = visibleActivities.filter((activity) => !activity.submission || activity.submission.status === "PENDING").length;
  const inReviewCount = visibleActivities.filter((activity) => activity.submission?.status === "SUBMITTED").length;
  const hasProgressRecords = visibleActivities.length > 0 || interventionPlans.length > 0 || interventionMonitoring.length > 0 || interventionOutcomes.length > 0;

  async function handleSubmitSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!submitModalItem) return;
    setSubmitting(true);
    try {
      const res = await fetchApi(`/student/learning/activities/${submitModalItem.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ notes: submissionNotes.trim() }),
      });
      if (res.ok) {
        setSubmitSuccess(true);
        await loadSupportData();
        setTimeout(() => {
          setSubmitModalItem(null);
          setSubmitSuccess(false);
          setSubmissionNotes("");
        }, 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to submit support task.");
      }
    } catch {
      alert("Network error submitting work.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl animate-pulse rounded-2xl bg-white p-8 text-sm text-slate-500 shadow-xs">Loading academic support resources...</div>;
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-6xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        We could not load your support information right now. Please verify your connection or try again later.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2 sm:p-4">
      {/* ─── Unified Support Header with Sub-Nav ─── */}
      <SupportHeader
        title={content.title}
        subtitle={content.description}
        totalActivities={visibleActivities.length}
      />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <SummaryCard label="Assigned Tasks" value={visibleActivities.length} icon={<FileText className="h-4 w-4" />} />
        <SummaryCard label="Not Started" value={pendingCount} icon={<Clock3 className="h-4 w-4" />} />
        <SummaryCard label="Awaiting Review" value={inReviewCount} icon={<AlertCircle className="h-4 w-4" />} />
        <SummaryCard label="Evaluated" value={completeCount} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <p className="text-xs font-semibold text-slate-500">
          {view === "RECOMMENDATION"
            ? "Recommended curriculum guidance from your instructors"
            : view === "REMEDIAL"
            ? "Reinforcement activities assigned to strengthen your skills"
            : view === "ENRICHMENT"
            ? "Advanced challenges to broaden your knowledge"
            : "Comprehensive history of assigned academic support and evaluated outcomes"}
        </p>
        <span className="rounded-full bg-blue-50 text-[#184973] border border-blue-200 px-2.5 py-0.5 text-xs font-bold">
          {visibleActivities.length} {visibleActivities.length === 1 ? "Program" : "Programs"}
        </span>
      </div>

      {visibleActivities.length === 0 && (view !== "PROGRESS" || !hasProgressRecords) ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-base font-bold text-slate-900">No support activities assigned yet</h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            When a teacher assigns targeted remedial drills, enrichment challenges, or recommended reading, they will appear here.
          </p>
        </div>
      ) : view === "PROGRESS" ? (
        <div className="space-y-6">
          {visibleActivities.length > 0 && (
            <section className="space-y-4">
              {(["ASSIGNED", "PENDING", "SUBMITTED", "GRADED"] as const).map((status) => {
                const group = visibleActivities.filter((activity) => (activity.submission?.status || "PENDING") === status);
                if (group.length === 0) return null;
                const groupLabels: Record<typeof status, string> = {
                  ASSIGNED: "Program Assigned",
                  PENDING: "Ready to Begin",
                  SUBMITTED: "Waiting for Faculty Review",
                  GRADED: "Evaluated & Completed",
                };
                return (
                  <div key={status} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                      <h2 className="font-bold text-slate-900">{groupLabels[status]}</h2>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-600">
                        {group.length}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.map((activity) => (
                        <button
                          key={activity.id}
                          type="button"
                          onClick={() => setSelectedId(activity.id)}
                          className={`rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                            selectedActivity?.id === activity.id
                              ? "border-[#184973] bg-blue-50/50 shadow-xs"
                              : "border-slate-200 bg-slate-50/50 hover:border-[#4085b3] hover:bg-white hover:shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#184973]">
                              {activity.supportCategory.replaceAll("_", " ")}
                            </span>
                            <span className={`inline-flex rounded-full px-2 py-0.2 text-[10px] font-bold ${statusStyles[activity.submission?.status || "PENDING"] || "bg-slate-100 text-slate-700"}`}>
                              {activity.submission?.status || "PENDING"}
                            </span>
                          </div>
                          <p className="mt-1 font-bold text-slate-900">{activity.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {activity.teachingAssignment.subject.name} · {activity.teachingAssignment.teacher.firstName} {activity.teachingAssignment.teacher.lastName}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Intervention Plans */}
          {interventionPlans.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 border-b border-slate-100 pb-2">
                <h2 className="font-bold text-slate-900">Your Support & Growth Targets</h2>
                <p className="text-xs text-slate-500">Personalized educational targets registered by school leadership.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {interventionPlans.map((plan) => (
                  <article key={plan.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-[#4085b3] hover:bg-white hover:shadow-2xs transition-all duration-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Goal</p>
                        <p className="mt-0.5 text-lg font-black text-slate-900">{plan.targetScore}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-[#184973] border border-blue-200">
                        {plan.status.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-600">Review Date: {plan.reviewDate ? new Date(plan.reviewDate).toLocaleDateString() : "Scheduled regularly"}</p>
                    {plan.counselorName && <p className="mt-0.5 text-xs text-slate-500">Counselor / Lead: {plan.counselorName}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Check-ins and Outcomes */}
          {interventionMonitoring.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 border-b border-slate-100 pb-2">
                <h2 className="font-bold text-slate-900">Program Check-ins & Attendance</h2>
                <p className="text-xs text-slate-500">Attendance and engagement tracking for support programs.</p>
              </div>
              <div className="space-y-2">
                {interventionMonitoring.map((record) => (
                  <article key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{record.programName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Last Check-in: {new Date(record.lastCheckInDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-black text-[#184973]">{Math.round(record.attendanceRate)}%</p>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{record.status.replaceAll("_", " ")}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {visibleActivities.map((activity) => {
            const submission = activity.submission;
            const status = submission?.status || "PENDING";
            return (
              <article key={activity.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#184973]">
                    {activity.teachingAssignment.subject.name}
                  </span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyles[status] || "bg-slate-100 text-slate-700"}`}>
                    {status.replaceAll("_", " ")}
                  </span>
                </div>

                <h2 className="mt-3 text-lg font-bold text-slate-900">{activity.title}</h2>
                <p className="mt-1 flex-1 text-xs text-slate-600 leading-relaxed">
                  {activity.description || "Faculty support instructions assigned to your section."}
                </p>

                {submission?.grade && (
                  <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                    <p className="text-xs font-bold text-[#184973]">Grade: {submission.grade}</p>
                    {submission.feedback && <p className="mt-0.5 text-xs text-slate-600 italic">“{submission.feedback}”</p>}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-500">
                    Tr. {activity.teachingAssignment.teacher.firstName} {activity.teachingAssignment.teacher.lastName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubmitModalItem(activity)}
                    className="inline-flex items-center gap-1 font-bold text-[#184973] hover:underline cursor-pointer"
                  >
                    <span>{status === "SUBMITTED" || status === "GRADED" ? "View Work" : "Complete Task"}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* ─── Interactive Support Work Submission Modal ─── */}
      {submitModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setSubmitModalItem(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-[#184973]">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-widest">{content.iconLabel} Submission</span>
            </div>

            <h3 className="mt-2 text-xl font-bold text-slate-900">{submitModalItem.title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {submitModalItem.teachingAssignment.subject.name} · Assigned by {submitModalItem.teachingAssignment.teacher.firstName} {submitModalItem.teachingAssignment.teacher.lastName}
            </p>

            {submitSuccess ? (
              <div className="my-8 rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 animate-bounce" />
                <h4 className="mt-3 text-lg font-bold text-emerald-900">Support Activity Submitted!</h4>
                <p className="mt-1 text-xs text-emerald-700">Your practice work has been sent to your instructor.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitSupport} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Your Response / Problem Solving Notes
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="Enter your answers or drill reflections..."
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#184973] focus:outline-hidden focus:ring-1 focus:ring-[#184973]"
                  />
                </div>

                <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSubmitModalItem(null)}
                    disabled={submitting}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !submissionNotes.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#184973] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#12385b] disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{submitting ? "Sending..." : "Submit Task"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
      <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
      <div className="relative z-10">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
          {label}
        </span>
        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
          {value}
        </span>
      </div>
      <div className="relative z-10 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0">
        {icon}
      </div>
    </div>
  );
}
