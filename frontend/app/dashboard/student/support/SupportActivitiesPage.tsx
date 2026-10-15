"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, ArrowUpRight, BookOpen, CheckCircle2, Clock3, FileText, HeartHandshake } from "lucide-react";
import { fetchApi } from "@/lib/api";

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
    description: "Guidance and next steps your teacher has selected for you.",
    iconLabel: "Teacher guidance",
  },
  REMEDIAL: {
    title: "Remedial Activities",
    description: "Extra practice assigned specifically to you to help strengthen a skill or topic.",
    iconLabel: "Assigned support",
  },
  ENRICHMENT: {
    title: "Enrichment Activities",
    description: "Extension activities assigned to help you explore a subject further.",
    iconLabel: "Extension work",
  },
  PROGRESS: {
    title: "Intervention & Progress",
    description: "Your assigned support activities, completion status, and teacher feedback.",
    iconLabel: "Your progress",
  },
};

const statusStyles: Record<string, string> = {
  ASSIGNED: "bg-teal-100 text-teal-800",
  PENDING: "bg-amber-100 text-amber-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  LATE: "bg-orange-100 text-orange-800",
  GRADED: "bg-emerald-100 text-emerald-800",
};

export default function SupportActivitiesPage({ view }: { view: SupportView }) {
  const [activities, setActivities] = useState<SupportActivity[]>([]);
  const [interventionPlans, setInterventionPlans] = useState<InterventionPlan[]>([]);
  const [interventionMonitoring, setInterventionMonitoring] = useState<InterventionMonitoring[]>([]);
  const [interventionOutcomes, setInterventionOutcomes] = useState<InterventionOutcome[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function loadSupport() {
      try {
        const response = await fetchApi("/student/support");
        if (!response.ok) throw new Error("Support activities request failed");
        const data = await response.json();
        const supportData = data as {
          activities?: SupportActivity[];
          interventionPlans?: InterventionPlan[];
          interventionMonitoring?: InterventionMonitoring[];
          interventionOutcomes?: InterventionOutcome[];
        };
        const assigned = Array.isArray(supportData.activities) ? supportData.activities : [];
        setActivities(assigned);
        setInterventionPlans(supportData.interventionPlans || []);
        setInterventionMonitoring(supportData.interventionMonitoring || []);
        setInterventionOutcomes(supportData.interventionOutcomes || []);
        setSelectedId(assigned[0]?.id ?? null);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    }

    loadSupport();
  }, []);

  const content = viewContent[view];
  const visibleActivities = useMemo(() => view === "PROGRESS"
    ? activities
    : activities.filter((activity) => activity.supportCategory === view), [activities, view]);
  const selectedActivity = visibleActivities.find((activity) => activity.id === selectedId) ?? visibleActivities[0] ?? null;
  const completeCount = visibleActivities.filter((activity) => activity.submission?.status === "GRADED").length;
  const pendingCount = visibleActivities.filter((activity) => !activity.submission || activity.submission.status === "PENDING").length;
  const inReviewCount = visibleActivities.filter((activity) => activity.submission?.status === "SUBMITTED").length;
  const hasProgressRecords = visibleActivities.length > 0 || interventionPlans.length > 0 || interventionMonitoring.length > 0 || interventionOutcomes.length > 0;

  if (loading) {
    return <div className="mx-auto max-w-6xl animate-pulse rounded-xl bg-white p-6 text-sm text-gray-500">Loading your support activities...</div>;
  }

  if (failed) {
    return <div className="mx-auto max-w-6xl rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">We could not load your support information right now. Please try again later.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <header className="flex items-start gap-3 border-b border-gray-200 pb-5">
        <div className="rounded-lg bg-emerald-100 p-2.5 text-emerald-800"><HeartHandshake className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">My Support · {content.iconLabel}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{content.title}</h1>
          <p className="mt-1 text-sm text-gray-600">{content.description}</p>
        </div>
      </header>

      {view === "PROGRESS" ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <Summary label="Assigned activities" value={visibleActivities.length} icon={<FileText className="h-4 w-4" />} />
          <Summary label="Not started" value={pendingCount} icon={<Clock3 className="h-4 w-4" />} />
          <Summary label="Awaiting review" value={inReviewCount} icon={<AlertCircle className="h-4 w-4" />} />
          <Summary label="Reviewed" value={completeCount} icon={<CheckCircle2 className="h-4 w-4" />} />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 border-y border-gray-200 py-3">
          <p className="text-sm text-gray-600">{view === "RECOMMENDATION" ? "Guidance selected for your learning" : view === "REMEDIAL" ? "Extra support assigned to you" : "Challenge work selected for you"}</p>
          <p className="shrink-0 text-sm font-semibold text-gray-900">{visibleActivities.length} {visibleActivities.length === 1 ? "item" : "items"}</p>
        </div>
      )}

      {visibleActivities.length === 0 && (view !== "PROGRESS" || !hasProgressRecords) ? (
        <div className="border-y border-dashed border-gray-300 py-12 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-gray-400" />
          <h2 className="mt-3 text-base font-semibold text-gray-900">Nothing assigned here yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">When a teacher assigns support or enrichment work to you, it will appear on this page.</p>
        </div>
      ) : view === "PROGRESS" ? (
        <div className="space-y-8">
          {visibleActivities.length > 0 && <section className="space-y-4">
            {(["ASSIGNED", "PENDING", "SUBMITTED", "GRADED"] as const).map((status) => {
            const group = visibleActivities.filter((activity) => (activity.submission?.status || "PENDING") === status);
            if (group.length === 0) return null;
            const groupLabels: Record<typeof status, string> = {
              ASSIGNED: "Program assigned",
              PENDING: "Ready to begin",
              SUBMITTED: "Waiting for teacher review",
              GRADED: "Reviewed and completed",
            };
            return (
              <div key={status} className="border-t border-gray-200 pt-4">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="font-semibold text-gray-900">{groupLabels[status]}</h2>
                  <span className="text-xs text-gray-500">{group.length}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.map((activity) => (
                    <button key={activity.id} type="button" onClick={() => setSelectedId(activity.id)} className={`rounded-lg border p-4 text-left ${selectedActivity?.id === activity.id ? "border-emerald-700 bg-emerald-50" : "border-gray-200 bg-white hover:border-gray-400"}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{activity.supportCategory.replaceAll("_", " ")}</p>
                      <p className="mt-1 font-semibold text-gray-900">{activity.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{activity.teachingAssignment.subject.name} · {activity.teachingAssignment.teacher.firstName} {activity.teachingAssignment.teacher.lastName}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          </section>}

          {interventionPlans.length > 0 && (
            <section>
              <div className="mb-3 border-b border-gray-200 pb-2">
                <h2 className="font-semibold text-gray-900">Your support plans</h2>
                <p className="mt-1 text-sm text-gray-600">School support targets and review dates shared with you.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {interventionPlans.map((plan) => (
                  <article key={plan.id} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Learning target</p>
                        <p className="mt-1 text-xl font-bold text-gray-900">{plan.targetScore}</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-900">{plan.status.replaceAll("_", " ")}</span>
                    </div>
                    <p className="mt-3 text-sm text-gray-700">Review date: {plan.reviewDate ? new Date(plan.reviewDate).toLocaleDateString() : "To be arranged"}</p>
                    {plan.counselorName && <p className="mt-1 text-sm text-gray-600">Support contact: {plan.counselorName}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {interventionMonitoring.length > 0 && (
            <section>
              <div className="mb-3 border-b border-gray-200 pb-2">
                <h2 className="font-semibold text-gray-900">Support check-ins</h2>
                <p className="mt-1 text-sm text-gray-600">Latest program progress shared by your school.</p>
              </div>
              <div className="space-y-2">
                {interventionMonitoring.map((record) => (
                  <article key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{record.programName}</p>
                      <p className="mt-1 text-sm text-gray-600">Last check-in: {new Date(record.lastCheckInDate).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-800">{Math.round(record.attendanceRate)}%</p>
                      <p className="text-xs text-gray-600">Recorded attendance · {record.status.replaceAll("_", " ")}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {interventionOutcomes.length > 0 && (
            <section>
              <div className="mb-3 border-b border-gray-200 pb-2">
                <h2 className="font-semibold text-gray-900">Recorded outcomes</h2>
                <p className="mt-1 text-sm text-gray-600">Before-and-after results recorded by your school.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {interventionOutcomes.map((outcome) => (
                  <article key={outcome.id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">{outcome.status.replaceAll("_", " ")}</p>
                    <p className="mt-2 text-sm text-gray-700">{outcome.initialScore}% <span aria-hidden="true">→</span> {outcome.postScore}%</p>
                    <p className="mt-1 text-lg font-bold text-emerald-900">{outcome.gain > 0 ? "+" : ""}{outcome.gain}% change</p>
                    <p className="mt-1 text-xs text-gray-600">Recorded {new Date(outcome.createdAt).toLocaleDateString()}</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : view === "RECOMMENDATION" ? (
        <section className="grid gap-4 md:grid-cols-2">
          {visibleActivities.map((activity) => (
            <article key={activity.id} className="flex flex-col rounded-lg border border-emerald-200 bg-emerald-50/60 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">For {activity.teachingAssignment.subject.name}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[activity.submission?.status || "PENDING"] || "bg-gray-100 text-gray-700"}`}>{(activity.submission?.status || "PENDING").replaceAll("_", " ")}</span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-gray-900">{activity.title}</h2>
              <p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">{activity.description || "Your teacher has recommended this as a useful next step."}</p>
              <div className="mt-5 flex items-center justify-between border-t border-emerald-200 pt-3 text-sm">
                <span className="text-gray-600">Suggested by {activity.teachingAssignment.teacher.firstName} {activity.teachingAssignment.teacher.lastName}</span>
                <button type="button" onClick={() => setSelectedId(activity.id)} className="font-semibold text-emerald-800 hover:underline">View details</button>
              </div>
              {selectedActivity?.id === activity.id && <p className="mt-3 rounded-md bg-white/80 p-3 text-sm text-gray-700">Next step: {activity.description || "Talk with your teacher about how to get started."}</p>}
            </article>
          ))}
        </section>
      ) : view === "REMEDIAL" ? (
        <section className="space-y-3">
          {visibleActivities.map((activity) => {
            const isProgram = activity.type === "REMEDIAL_PROGRAM";
            return (
              <article key={activity.id} className="grid gap-4 rounded-lg border border-orange-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-orange-100 p-2 text-orange-800"><BookOpen className="h-4 w-4" /></div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange-800">{isProgram ? "Scheduled remedial program" : `${activity.teachingAssignment.subject.name} · ${activity.type.replaceAll("_", " ")}`}</p>
                    <h2 className="mt-1 font-semibold text-gray-900">{activity.title}</h2>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{activity.description || "Extra practice assigned to help you strengthen this topic."}</p>
                    <p className="mt-2 text-xs text-gray-500">Teacher: {activity.teachingAssignment.teacher.firstName} {activity.teachingAssignment.teacher.lastName}</p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[activity.submission?.status || "PENDING"] || "bg-gray-100 text-gray-700"}`}>{(activity.submission?.status || "PENDING").replaceAll("_", " ")}</span>
                  <p className="mt-2 text-xs text-gray-500">{isProgram ? "Assigned program schedule is included above" : activity.dueDate ? `Due ${new Date(activity.dueDate).toLocaleDateString()}` : "Work at the pace agreed with your teacher"}</p>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {visibleActivities.map((activity) => (
            <article key={activity.id} className="relative overflow-hidden rounded-lg border border-sky-200 bg-sky-50/50 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-sky-900">{activity.teachingAssignment.subject.name}</span>
                <span className="text-xs font-medium text-sky-800">Extension activity</span>
              </div>
              <h2 className="mt-4 text-lg font-bold text-gray-900">{activity.title}</h2>
              <p className="mt-2 min-h-12 whitespace-pre-wrap text-sm leading-6 text-gray-700">{activity.description || "An opportunity to explore this subject beyond the regular class task."}</p>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sky-200 pt-3">
                <span className="text-xs text-gray-600">With {activity.teachingAssignment.teacher.firstName} {activity.teachingAssignment.teacher.lastName}</span>
                <button type="button" onClick={() => setSelectedId(activity.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-sky-900 hover:underline">See activity <ArrowUpRight className="h-4 w-4" /></button>
              </div>
              {selectedActivity?.id === activity.id && <p className="mt-3 rounded-md border border-sky-200 bg-white p-3 text-sm text-gray-700">{activity.description || "Ask your teacher for any extra materials or guidance for this challenge."}</p>}
            </article>
          ))}
        </section>
      )}

      {view === "PROGRESS" && selectedActivity && (
        <aside className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Selected support details</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[selectedActivity.submission?.status || "PENDING"] || "bg-gray-100 text-gray-700"}`}>{(selectedActivity.submission?.status || "PENDING").replaceAll("_", " ")}</span>
          </div>
          <h2 className="mt-3 text-lg font-bold text-gray-900">{selectedActivity.title}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{selectedActivity.description || "No additional activity information."}</p>
          {selectedActivity.submission?.feedback && <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900"><strong>Teacher feedback:</strong> {selectedActivity.submission.feedback}</p>}
          <p className="mt-3 text-sm text-gray-600">{selectedActivity.submission?.submittedAt ? `Submitted ${new Date(selectedActivity.submission.submittedAt).toLocaleDateString()}` : "No submission recorded"}</p>
        </aside>
      )}
    </div>
  );
}

function Summary({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-gray-200 py-3">
      <div className="rounded-md bg-gray-100 p-2 text-emerald-800">{icon}</div>
      <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold text-gray-900">{value}</p></div>
    </div>
  );
}

