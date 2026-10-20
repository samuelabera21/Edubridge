"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Award,
  BookOpen,
  Calendar,
  Clock,
  Printer,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  GraduationCap,
  MessageSquare,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import AssessmentHeader from "../AssessmentHeader";
import { AssessmentItem } from "../page";

export default function StudentAssessmentResultsPage() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");

  async function loadResults(isSilent = false) {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetchApi("/student/assessments");
      if (!res.ok) throw new Error("Unable to load assessment results");
      const data = await res.json();
      setAssessments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load results");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadResults();
  }, []);

  // Filter only graded assessments
  const gradedList = useMemo(() => {
    return assessments.filter(
      (a) => a.results && a.results.length > 0 && a.results[0].status === "GRADED"
    );
  }, [assessments]);

  // Group by subject
  const subjectGroups = useMemo(() => {
    const map = new Map<string, AssessmentItem[]>();
    gradedList.forEach((item) => {
      const name = item.teachingAssignment?.subject?.name || "General";
      const list = map.get(name) || [];
      list.push(item);
      map.set(name, list);
    });
    return map;
  }, [gradedList]);

  const subjectList = useMemo(() => Array.from(subjectGroups.keys()).sort(), [subjectGroups]);

  // Filtered by selected subject
  const visibleGraded = useMemo(() => {
    if (selectedSubject === "ALL") return gradedList;
    return subjectGroups.get(selectedSubject) || [];
  }, [gradedList, subjectGroups, selectedSubject]);

  // Compute metrics
  const totalGradedPoints = useMemo(
    () => gradedList.reduce((acc, a) => acc + a.results![0].score, 0),
    [gradedList]
  );
  const totalPossiblePoints = useMemo(
    () => gradedList.reduce((acc, a) => acc + a.maxScore, 0),
    [gradedList]
  );

  const overallAverage = useMemo(() => {
    if (totalPossiblePoints === 0) return 0;
    return Math.round((totalGradedPoints / totalPossiblePoints) * 100);
  }, [totalGradedPoints, totalPossiblePoints]);

  const passedCount = useMemo(() => {
    return gradedList.filter((a) => {
      const score = a.results![0].score;
      const pass = a.passingScore ?? a.maxScore * 0.5;
      return score >= pass;
    }).length;
  }, [gradedList]);

  // Ethiopian Letter Grade System
  const getGradeInfo = (percentage: number, count?: number) => {
    if (count !== undefined && count === 0) {
      return { letter: "—", label: "No Grades Yet", bg: "bg-slate-50 text-slate-700 border-slate-200" };
    }
    if (percentage >= 90) return { letter: "A", label: "Excellent", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    if (percentage >= 80) return { letter: "B", label: "Very Good", bg: "bg-blue-50 text-blue-800 border-blue-200" };
    if (percentage >= 70) return { letter: "C", label: "Good", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    if (percentage >= 60) return { letter: "D", label: "Satisfactory", bg: "bg-orange-50 text-orange-800 border-orange-200" };
    return { letter: "F", label: "Needs Support", bg: "bg-rose-50 text-rose-800 border-rose-200" };
  };

  const overallGrade = getGradeInfo(overallAverage, gradedList.length);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      <AssessmentHeader
        title="Results and Feedback"
        subtitle="Evaluated tests, quizzes, instructor notes, and verified academic grades."
        averageScore={overallAverage}
        totalAssessments={assessments.length}
        gradedCount={gradedList.length}
        onRefresh={() => void loadResults(false)}
        refreshing={refreshing}
      />

      {/* ─── Overall Grade & Metric Cards ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cumulative Grade Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Cumulative Average
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900">{overallAverage}%</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${overallGrade.bg}`}>
                Grade {overallGrade.letter} · {overallGrade.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {totalGradedPoints} of {totalPossiblePoints} total points earned
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-600">
            <Award className="h-6 w-6" />
          </div>
        </div>

        {/* Passed Assessments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Assessments Passed
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-700">
                {passedCount} / {gradedList.length}
              </span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {gradedList.length ? Math.round((passedCount / gradedList.length) * 100) : 0}% Pass Rate
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Meeting curriculum benchmarks</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Total Evaluated */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Evaluated Tests
            </span>
            <p className="text-3xl font-black text-slate-900 mt-1">{gradedList.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {assessments.length - gradedList.length} upcoming or pending grading
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-3 text-[#184973]">
            <BookOpen className="h-6 w-6" />
          </div>
        </div>

        {/* Actions Card: Print & Trends */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gradebook Tools
            </span>
            <p className="text-xs text-slate-500 mt-1">Export official summary or view progression</p>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Card</span>
            </button>
            <Link
              href="/dashboard/student/assessments/performance"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#184973] px-3 py-2 text-xs font-bold text-white hover:bg-[#123655] transition"
            >
              <span>Trends</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Subject Breakdown Filter Cards ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Subject Performance Overview
          </h2>
          <span className="text-xs text-slate-500">
            Click a subject to filter detailed test results
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setSelectedSubject("ALL")}
            className={`rounded-2xl p-4 text-left transition cursor-pointer border ${
              selectedSubject === "ALL"
                ? "bg-blue-50/70 border-[#184973] shadow-xs"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">All Subjects Combined</span>
              <span className="text-xs font-black text-[#184973]">{overallAverage}%</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {gradedList.length} total evaluations across curriculum
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-[#184973] rounded-full transition-all duration-500"
                style={{ width: `${overallAverage}%` }}
              />
            </div>
          </button>

          {subjectList.map((subject) => {
            const items = subjectGroups.get(subject) || [];
            const subEarned = items.reduce((acc, a) => acc + a.results![0].score, 0);
            const subPossible = items.reduce((acc, a) => acc + a.maxScore, 0);
            const subAvg = subPossible ? Math.round((subEarned / subPossible) * 100) : 0;
            const subGrade = getGradeInfo(subAvg);

            return (
              <button
                key={subject}
                type="button"
                onClick={() => setSelectedSubject(subject)}
                className={`rounded-2xl p-4 text-left transition cursor-pointer border ${
                  selectedSubject === subject
                    ? "bg-blue-50/70 border-[#184973] shadow-xs"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{subject}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${subGrade.bg}`}>
                    Grade {subGrade.letter} ({subAvg}%)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {items.length} graded evaluation{items.length === 1 ? "" : "s"} · {subEarned}/{subPossible} pts
                </p>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${subAvg}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Detailed Graded Evaluations ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Evaluated Assessments
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-[#184973]">
              {visibleGraded.length} Records
            </span>
          </div>

          {selectedSubject !== "ALL" && (
            <button
              type="button"
              onClick={() => setSelectedSubject("ALL")}
              className="text-xs font-semibold text-[#184973] hover:underline cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Show All Subjects</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[#184973]" />
            Loading results and feedback...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">
            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-500" />
            {error}
          </div>
        ) : visibleGraded.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <Award className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            No graded assessments found for the selected subject.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleGraded.map((assessment) => {
              const result = assessment.results![0];
              const percentage = Math.round((result.score / assessment.maxScore) * 100);
              const grade = getGradeInfo(percentage);
              const teacher = assessment.teachingAssignment?.teacher;

              return (
                <div key={assessment.id} className="p-4 sm:p-5 transition hover:bg-slate-50/60 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#184973] border border-blue-200">
                          {assessment.teachingAssignment?.subject?.name}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                          {assessment.type}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${grade.bg}`}>
                          Grade {grade.letter} · {grade.label}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">
                        {assessment.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {assessment.description || "Curriculum unit evaluation"}
                      </p>
                    </div>

                    {/* Score badge */}
                    <div className="text-left sm:text-right shrink-0">
                      <div className="flex items-baseline sm:justify-end gap-1.5">
                        <span className="text-2xl font-black text-emerald-700">
                          {result.score}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          / {assessment.maxScore} pts
                        </span>
                        <span className="text-xs font-bold text-emerald-700 ml-1">
                          ({percentage}%)
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-slate-400">
                        {percentage >= (assessment.passingScore ? (assessment.passingScore / assessment.maxScore) * 100 : 50)
                          ? "✓ Passing Standard Achieved"
                          : "⚠️ Below Passing Benchmark"}
                      </p>
                    </div>
                  </div>

                  {/* Progress visual bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentage >= 80 ? "bg-emerald-500" : percentage >= 60 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Instructor Feedback Box */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-[#184973]">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Teacher Feedback · {teacher?.firstName} {teacher?.lastName}</span>
                      </div>
                      {result.submittedAt && (
                        <span className="text-[10px] text-slate-400">
                          Submitted {new Date(result.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs italic text-slate-700 leading-relaxed pl-5">
                      "{result.feedback || "Good effort. Review error points and consult instructor during office hours if needed."}"
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}