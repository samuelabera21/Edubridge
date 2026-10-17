"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Award, ChevronRight } from "lucide-react";
import { fetchApi } from "../../../../lib/api";

type Assessment = {
  id: string;
  title: string;
  type: "EXAM" | "QUIZ" | "ASSIGNMENT" | "PROJECT" | "OTHER";
  dueDate: string | null;
  score: number;
  maxScore: number;
  feedback: string | null;
  teachingAssignment: { subject: { name: string } };
  results: Array<{ score: number; feedback: string | null; createdAt: string }>;
};

export default function ResultsCard() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchApi("/student/assessments")
      .then(async (response) => {
        if (!response.ok) throw new Error("Results request failed");
        const data = await response.json();
        setAssessments(Array.isArray(data) ? data.filter((item) => Array.isArray(item.results) && item.results.length > 0) : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const groupedResults = assessments.reduce<Record<string, Assessment[]>>((groups, assessment) => {
    const subject = assessment.teachingAssignment.subject.name;
    groups[subject] = groups[subject] || [];
    groups[subject].push(assessment);
    return groups;
  }, {});

  const subjects = Object.entries(groupedResults).sort(([left], [right]) => left.localeCompare(right));
  const selectedResults = selectedSubject ? groupedResults[selectedSubject] || [] : [];
  const selectedTotal = selectedResults.reduce((total, assessment) => total + assessment.results[0].score, 0);
  const selectedMaximum = selectedResults.reduce((total, assessment) => total + assessment.maxScore, 0);
  const assessmentTypeLabel = (type: Assessment["type"]) => ({
    EXAM: "Test",
    QUIZ: "Quiz",
    ASSIGNMENT: "Assignment",
    PROJECT: "Presentation / Project",
    OTHER: "Continuous Assessment",
  }[type]);

  if (loading) {
    return <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="mb-4 text-lg font-semibold text-gray-900">Results and Feedback</h2><p className="text-sm text-gray-500">Loading your subject results...</p></section>;
  }

  if (error) {
    return <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="mb-4 text-lg font-semibold text-gray-900">Results and Feedback</h2><p className="text-sm text-red-600">Could not load your results.</p></section>;
  }

  if (selectedSubject) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <button type="button" onClick={() => setSelectedSubject(null)} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"><ArrowLeft className="h-4 w-4" /> All subjects</button>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Subject results</p><h2 className="mt-1 text-2xl font-bold text-gray-900">{selectedSubject}</h2></div>
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-right"><p className="text-xs text-emerald-700">Subject total</p><p className="text-lg font-bold text-emerald-800">{selectedTotal}/{selectedMaximum}</p></div>
        </div>
        <div className="space-y-3">
          {selectedResults.map((assessment) => {
            const result = assessment.results[0];
            const percentage = Math.round((result.score / assessment.maxScore) * 100);
            return <div key={assessment.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-gray-900">{assessment.title}</p><p className="mt-1 text-xs text-gray-500">{assessmentTypeLabel(assessment.type)}{assessment.dueDate ? ` · ${new Date(assessment.dueDate).toLocaleDateString()}` : ""}</p></div><p className="text-lg font-bold text-emerald-700">{result.score}/{assessment.maxScore} <span className="text-xs font-medium">({percentage}%)</span></p></div>{result.feedback && <p className="mt-2 text-sm text-gray-600">Feedback: {result.feedback}</p>}</div>;
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Choose a subject</p><h2 className="mt-1 text-xl font-bold text-gray-900">Results and Feedback</h2><p className="mt-1 text-sm text-gray-500">Open a subject to see tests, quizzes, assignments, presentations, and continuous assessment marks.</p></div>
      {subjects.length === 0 ? <p className="text-sm text-gray-500">No published results yet.</p> : <div className="grid gap-4 sm:grid-cols-2">{subjects.map(([subject, subjectAssessments]) => { const score = subjectAssessments.reduce((total, assessment) => total + assessment.results[0].score, 0); const maximum = subjectAssessments.reduce((total, assessment) => total + assessment.maxScore, 0); return <button type="button" key={subject} onClick={() => setSelectedSubject(subject)} className="group rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-emerald-50/60 p-5 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><Award className="h-5 w-5" /></div><ChevronRight className="h-5 w-5 text-gray-400 transition group-hover:translate-x-1 group-hover:text-emerald-700" /></div><h3 className="mt-4 text-lg font-bold text-gray-900">{subject}</h3><p className="mt-1 text-sm text-gray-500">{subjectAssessments.length} graded assessment{subjectAssessments.length === 1 ? "" : "s"}</p><div className="mt-4 flex items-end justify-between"><span className="text-sm font-semibold text-emerald-700">{score}/{maximum}</span><span className="text-xs text-gray-500">{Math.round((score / maximum) * 100)}% overall</span></div></button>; })}</div>}
    </section>
  );
}
