"use client";

import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchApi } from "../../../../../lib/api";

type Assessment = {
  id: string;
  title: string;
  type: "EXAM" | "QUIZ" | "ASSIGNMENT" | "PROJECT" | "OTHER";
  createdAt: string;
  maxScore: number;
  teachingAssignment: { subject: { name: string } };
  results: Array<{ score: number; feedback: string | null; createdAt: string }>;
};

const typeLabels: Record<Assessment["type"], string> = {
  EXAM: "Test",
  QUIZ: "Quiz",
  ASSIGNMENT: "Assignment",
  PROJECT: "Presentation / Project",
  OTHER: "Continuous Assessment",
};

export default function StudentAssessmentPerformancePage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subject, setSubject] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi("/student/assessments")
      .then(async (response) => {
        if (!response.ok) throw new Error("Performance request failed");
        const data = await response.json();
        setAssessments(Array.isArray(data) ? data.filter((item) => item.results?.length) : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const subjects = useMemo(() => Array.from(new Set(assessments.map((item) => item.teachingAssignment.subject.name))).sort(), [assessments]);
  const visible = useMemo(() => assessments.filter((item) => subject === "ALL" || item.teachingAssignment.subject.name === subject).sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()), [assessments, subject]);
  const percentages = visible.map((item) => Math.round((item.results[0].score / item.maxScore) * 100));
  const average = percentages.length ? Math.round(percentages.reduce((total, value) => total + value, 0) / percentages.length) : 0;
  const first = percentages[0] ?? 0;
  const latest = percentages[percentages.length - 1] ?? 0;
  const change = latest - first;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-2">
      <header className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">My assessments</p><h1 className="mt-1 text-2xl font-bold text-gray-900">Performance Trends</h1><p className="mt-1 text-sm text-gray-500">Track how your marks change across subjects and assessment types.</p></div>
        <Link href="/dashboard/student/assessments" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><ArrowLeft className="h-4 w-4" /> Back</Link>
      </header>

      {loading ? <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">Loading performance trends...</div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Could not load your performance trends.</div> : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="text-xs font-bold uppercase tracking-wide text-gray-500">Subject<select value={subject} onChange={(event) => setSubject(event.target.value)} className="ml-3 rounded-lg border border-gray-200 bg-white p-2 text-sm font-normal normal-case tracking-normal text-gray-700"><option value="ALL">All subjects</option>{subjects.map((item) => <option key={item} value={item}>{item}</option>)}</select></label></div>
          {visible.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">No graded assessments are available for this subject yet.</div> : <>
            <div className="grid gap-4 sm:grid-cols-3"><Metric label="Average" value={`${average}%`} /><Metric label="Latest mark" value={`${latest}%`} /><Metric label="Change over time" value={`${change >= 0 ? "+" : ""}${change}%`} positive={change >= 0} /></div>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">Chronological progress</p><h2 className="mt-1 text-xl font-bold text-gray-900">Assessment performance</h2></div>{change >= 0 ? <TrendingUp className="h-6 w-6 text-emerald-600" /> : <TrendingDown className="h-6 w-6 text-red-500" />}</div><div className="space-y-4">{visible.map((item, index) => { const percentage = Math.round((item.results[0].score / item.maxScore) * 100); return <div key={item.id}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><div><span className="font-semibold text-gray-900">{item.teachingAssignment.subject.name}</span><span className="ml-2 text-xs text-gray-500">{item.title} · {typeLabels[item.type]}</span></div><span className="font-bold text-violet-700">{percentage}%</span></div><div className="h-3 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${index === visible.length - 1 ? "bg-violet-600" : "bg-violet-300"}`} style={{ width: `${percentage}%` }} /></div><p className="mt-1 text-xs text-gray-400">{new Date(item.results[0].createdAt || item.createdAt).toLocaleDateString()} · {item.results[0].score}/{item.maxScore}</p></div>; })}</div></section>
          </>}
        </>
      )}
    </div>
  );
}

function Metric({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p><p className={`mt-2 text-2xl font-bold ${positive === undefined ? "text-gray-900" : positive ? "text-emerald-700" : "text-red-600"}`}>{value}</p></div>;
}