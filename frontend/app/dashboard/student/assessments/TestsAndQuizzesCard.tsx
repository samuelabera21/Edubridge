"use client";

import { Fragment, useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";

type Assessment = {
  id: string;
  title: string;
  type: "EXAM" | "QUIZ" | "ASSIGNMENT" | "PROJECT" | "OTHER";
  dueDate: string | null;
  maxScore: number;
  description: string | null;
  teachingAssignment: { subject: { name: string } };
};

export default function TestsAndQuizzesCard() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "EXAM" | "QUIZ">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchApi("/student/assessments")
      .then(async (response) => {
        if (!response.ok) throw new Error("Assessment request failed");
        const data = await response.json();
        setAssessments(Array.isArray(data) ? data.filter((item) => item.type === "EXAM" || item.type === "QUIZ") : []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const subjects = Array.from(new Set(assessments.map((assessment) => assessment.teachingAssignment.subject.name))).sort();
  const visibleAssessments = assessments
    .filter((assessment) => subjectFilter === "ALL" || assessment.teachingAssignment.subject.name === subjectFilter)
    .filter((assessment) => typeFilter === "ALL" || assessment.type === typeFilter)
    .sort((left, right) => {
      if (!left.dueDate) return 1;
      if (!right.dueDate) return -1;
      return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
    });

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Test and Quiz Schedule</h2>
        <Filter className="h-4 w-4 text-gray-400" />
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Subject
          <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm font-normal normal-case tracking-normal text-gray-700">
            <option value="ALL">All subjects</option>
            {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Assessment type
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as "ALL" | "EXAM" | "QUIZ")} className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm font-normal normal-case tracking-normal text-gray-700">
            <option value="ALL">Tests and quizzes</option>
            <option value="EXAM">Tests only</option>
            <option value="QUIZ">Quizzes only</option>
          </select>
        </label>
      </div>
      {loading ? <p className="text-sm text-gray-500">Loading assessment schedule...</p> : error ? <p className="text-sm text-red-600">Could not load the assessment schedule.</p> : visibleAssessments.length === 0 ? <p className="text-sm text-gray-500">No assessments match the selected filters.</p> : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Scheduled date</th><th className="px-4 py-3">Score</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleAssessments.map((assessment) => {
                const expanded = expandedId === assessment.id;
                const isQuiz = assessment.type === "QUIZ";
                return (
                  <Fragment key={assessment.id}>
                    <tr className="cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expanded ? null : assessment.id)}>
                      <td className="px-4 py-3 font-medium text-gray-900"><span className="mr-2 inline-block align-middle">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>{assessment.title}</td>
                      <td className="px-4 py-3 text-gray-600">{assessment.teachingAssignment.subject.name}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${isQuiz ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>{isQuiz ? "Quiz" : "Test"}</span></td>
                      <td className="px-4 py-3 font-medium text-gray-700">{assessment.dueDate ? new Date(assessment.dueDate).toLocaleDateString() : "Date not announced"}</td>
                      <td className="px-4 py-3 text-gray-600">{assessment.maxScore} pts</td>
                    </tr>
                    {expanded && <tr><td colSpan={5} className="bg-gray-50 px-4 py-3 text-sm text-gray-600">{assessment.description || "No additional instructions have been published."}</td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
