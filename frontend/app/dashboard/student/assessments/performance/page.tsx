"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  Target,
  BarChart2,
  Flame,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import AssessmentHeader from "../AssessmentHeader";
import { AssessmentItem } from "../page";

export default function StudentAssessmentPerformancePage() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");

  async function loadData(isSilent = false) {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetchApi("/student/assessments");
      if (!res.ok) throw new Error("Unable to load performance metrics");
      const data = await res.json();
      setAssessments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load performance metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Filter only assessments with recorded/graded results
  const evaluatedAssessments = useMemo(() => {
    return assessments
      .filter((a) => a.results && a.results.length > 0 && a.results[0].status === "GRADED" && a.results[0].score !== undefined && a.results[0].score !== null)
      .sort((a, b) => {
        const dateA = new Date(a.results?.[0]?.submittedAt || a.dueDate || a.scheduledDate || "").getTime();
        const dateB = new Date(b.results?.[0]?.submittedAt || b.dueDate || b.scheduledDate || "").getTime();
        return dateA - dateB;
      });
  }, [assessments]);

  // Subject list
  const subjects = useMemo(() => {
    const list = Array.from(
      new Set(
        evaluatedAssessments
          .map((a) => a.teachingAssignment?.subject?.name)
          .filter(Boolean) as string[]
      )
    );
    return list.sort();
  }, [evaluatedAssessments]);

  // Filtered timeline based on subject selection
  const visibleAssessments = useMemo(() => {
    if (selectedSubject === "ALL") return evaluatedAssessments;
    return evaluatedAssessments.filter(
      (a) => a.teachingAssignment?.subject?.name === selectedSubject
    );
  }, [evaluatedAssessments, selectedSubject]);

  // Calculations for metrics
  const percentages = useMemo(() => {
    return visibleAssessments.map((a) => {
      const score = a.results![0].score;
      const max = a.maxScore || 100;
      return Math.round((score / max) * 100);
    });
  }, [visibleAssessments]);

  const averageScore = useMemo(() => {
    if (percentages.length === 0) return 0;
    const sum = percentages.reduce((total, p) => total + p, 0);
    return Math.round(sum / percentages.length);
  }, [percentages]);

  const firstScore = percentages[0] ?? 0;
  const latestScore = percentages[percentages.length - 1] ?? 0;
  const growthChange = latestScore - firstScore;

  const highestScore = useMemo(() => {
    if (percentages.length === 0) return 0;
    return Math.max(...percentages);
  }, [percentages]);

  const lowestScore = useMemo(() => {
    if (percentages.length === 0) return 0;
    return Math.min(...percentages);
  }, [percentages]);

  // Performance by Subject breakdown
  const subjectAnalytics = useMemo(() => {
    const map = new Map<
      string,
      {
        subjectName: string;
        teacherName: string;
        assessments: AssessmentItem[];
        totalPoints: number;
        maxPoints: number;
        avgPercentage: number;
        highestPercentage: number;
      }
    >();

    evaluatedAssessments.forEach((item) => {
      const subjectName = item.teachingAssignment?.subject?.name || "General";
      const teacherName = item.teachingAssignment?.teacher
        ? `${item.teachingAssignment.teacher.firstName} ${item.teachingAssignment.teacher.lastName}`
        : "Instructor";
      const score = item.results![0].score;
      const max = item.maxScore;
      const pct = Math.round((score / max) * 100);

      const existing = map.get(subjectName);
      if (!existing) {
        map.set(subjectName, {
          subjectName,
          teacherName,
          assessments: [item],
          totalPoints: score,
          maxPoints: max,
          avgPercentage: pct,
          highestPercentage: pct,
        });
      } else {
        existing.assessments.push(item);
        existing.totalPoints += score;
        existing.maxPoints += max;
        existing.avgPercentage = Math.round(
          (existing.totalPoints / existing.maxPoints) * 100
        );
        if (pct > existing.highestPercentage) {
          existing.highestPercentage = pct;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.avgPercentage - a.avgPercentage);
  }, [evaluatedAssessments]);

  // Performance by Assessment Type breakdown
  const typeAnalytics = useMemo(() => {
    const map = new Map<
      string,
      { type: string; count: number; totalScore: number; maxScore: number }
    >();

    evaluatedAssessments.forEach((item) => {
      const type = item.type;
      const score = item.results![0].score;
      const max = item.maxScore;
      const existing = map.get(type);
      if (!existing) {
        map.set(type, { type, count: 1, totalScore: score, maxScore: max });
      } else {
        existing.count += 1;
        existing.totalScore += score;
        existing.maxScore += max;
      }
    });

    return Array.from(map.values()).map((t) => ({
      ...t,
      percentage: Math.round((t.totalScore / t.maxScore) * 100),
    }));
  }, [evaluatedAssessments]);

  // Mastery tier categorization
  const masteryTiers = useMemo(() => {
    let advanced = 0; // >= 90
    let proficient = 0; // 80 - 89
    let developing = 0; // 70 - 79
    let emerging = 0; // < 70

    percentages.forEach((p) => {
      if (p >= 90) advanced++;
      else if (p >= 80) proficient++;
      else if (p >= 70) developing++;
      else emerging++;
    });

    return { advanced, proficient, developing, emerging, total: percentages.length };
  }, [percentages]);

  const typeNames: Record<string, string> = {
    EXAM: "Tests & Midterms",
    QUIZ: "Weekly Quizzes",
    ASSIGNMENT: "Homework & Essays",
    PROJECT: "Projects & Lab Work",
    OTHER: "Continuous Assessments",
  };

  const getScoreBadge = (pct: number) => {
    if (pct >= 90) return { letter: "A", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (pct >= 80) return { letter: "B", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (pct >= 70) return { letter: "C", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (pct >= 60) return { letter: "D", color: "text-orange-700 bg-orange-50 border-orange-200" };
    return { letter: "F", color: "text-rose-700 bg-rose-50 border-rose-200" };
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      {/* ─── Header ─── */}
      <AssessmentHeader
        title="Performance Trends"
        subtitle="Subject comparative analytics, growth tracking, and historical mastery progression."
        averageScore={averageScore}
        totalAssessments={assessments.length}
        gradedCount={evaluatedAssessments.length}
        onRefresh={() => void loadData(false)}
        refreshing={refreshing}
      />

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#184973] border-r-transparent mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading performance trends...</p>
          <p className="text-xs text-slate-400 mt-1">Calculating subject mastery and growth curves</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          <p className="font-bold">Error loading trends</p>
          <p className="text-xs text-rose-600 mt-1">{error}</p>
          <button
            onClick={() => void loadData(false)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            Retry Sync
          </button>
        </div>
      ) : evaluatedAssessments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <BarChart2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Evaluated Assessments Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            As soon as your teachers evaluate and grade your tests and assignments, your historical performance trends and mastery indicators will appear here.
          </p>
          <Link
            href="/dashboard/student/assessments"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#184973] px-4 py-2 text-xs font-bold text-white hover:bg-blue-900 transition"
          >
            Go to Tests & Quizzes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <>
          {/* ─── Metric Highlights ─── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Average Performance */}
            <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
              <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                  Selected Average
                </span>
                <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                  {averageScore}%
                </span>
                <p className="text-[11px] text-slate-400 group-hover:text-blue-100 transition-colors duration-300 mt-0.5">
                  Range: {lowestScore}% to {highestScore}%
                </p>
              </div>
              <Target className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
            </div>

            {/* Growth Change */}
            <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
              <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                  Academic Trajectory
                </span>
                <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                  {growthChange >= 0 ? `+${growthChange}%` : `${growthChange}%`}
                </span>
                <p className="text-[11px] text-slate-400 group-hover:text-blue-100 transition-colors duration-300 mt-0.5">
                  {growthChange >= 0 ? "Improving mastery" : "Needs review"}
                </p>
              </div>
              <TrendingUp className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
            </div>

            {/* Highest Mark */}
            <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
              <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                  Peak Evaluation
                </span>
                <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                  {highestScore}%
                </span>
                <p className="text-[11px] text-slate-400 group-hover:text-blue-100 transition-colors duration-300 mt-0.5">
                  Personal best
                </p>
              </div>
              <Flame className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
            </div>

            {/* Mastery Level */}
            <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
              <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                  Advanced Mastery
                </span>
                <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                  {masteryTiers.advanced + masteryTiers.proficient}
                </span>
                <p className="text-[11px] text-slate-400 group-hover:text-blue-100 transition-colors duration-300 mt-0.5">
                  of {masteryTiers.total} tests (&ge;80%)
                </p>
              </div>
              <Award className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
            </div>
          </div>

          {/* ─── Subject Filter Pills ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Filter Subject:
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedSubject("ALL")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  selectedSubject === "ALL"
                    ? "bg-[#184973] text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Subjects ({evaluatedAssessments.length})
              </button>
              {subjects.map((sub) => {
                const count = evaluatedAssessments.filter(
                  (a) => a.teachingAssignment?.subject?.name === sub
                ).length;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      selectedSubject === sub
                        ? "bg-[#184973] text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {sub} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Subject Comparison & Mastery Distribution ─── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Subject Comparison Section (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#184973]" />
                    <span>Subject Performance Comparison</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cumulative average breakdown across active subjects
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {subjectAnalytics.length} Subjects Active
                </span>
              </div>

              <div className="space-y-4">
                {subjectAnalytics.map((item) => {
                  const badge = getScoreBadge(item.avgPercentage);
                  return (
                    <div
                      key={item.subjectName}
                      className="rounded-xl border border-slate-100 p-3.5 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center justify-between gap-3 text-xs mb-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">
                            {item.subjectName}
                          </span>
                          <span className="text-slate-400 ml-2">
                            · Instructor: {item.teacherName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-xs border ${badge.color}`}>
                            Grade {badge.letter}
                          </span>
                          <span className="font-black text-slate-900 text-sm">
                            {item.avgPercentage}%
                          </span>
                        </div>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#184973] to-[#2563eb] transition-all duration-500"
                          style={{ width: `${item.avgPercentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                        <span>
                          {item.assessments.length} assessment{item.assessments.length !== 1 ? "s" : ""} completed
                        </span>
                        <span>
                          Earned {item.totalPoints} / {item.maxPoints} pts · Peak: {item.highestPercentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assessment Type Breakdown & Mastery Tiers (1 col) */}
            <div className="space-y-6">
              {/* By Type Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-4 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#184973]" />
                    <span>Average by Assessment Format</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Exam vs. Quiz vs. Homework performance
                  </p>
                </div>

                <div className="space-y-3">
                  {typeAnalytics.map((t) => {
                    const badge = getScoreBadge(t.percentage);
                    return (
                      <div key={t.type} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">
                            {typeNames[t.type] || t.type}
                          </span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                            x{t.count}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#184973] rounded-full"
                              style={{ width: `${t.percentage}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-900 w-8 text-right">
                            {t.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mastery Distribution Tiers */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-4 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#184973]" />
                    <span>Mastery Distribution</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluated test performance tiers
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-emerald-900">Advanced (90-100%)</p>
                        <p className="text-[10px] text-emerald-700">Grade A</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-900">
                      {masteryTiers.advanced} tests
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-blue-50/60 border border-blue-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-xs font-bold text-blue-900">Proficient (80-89%)</p>
                        <p className="text-[10px] text-blue-700">Grade B</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-blue-900">
                      {masteryTiers.proficient} tests
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/60 border border-amber-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <div>
                        <p className="text-xs font-bold text-amber-900">Developing (70-79%)</p>
                        <p className="text-[10px] text-amber-700">Grade C</p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-900">
                      {masteryTiers.developing} tests
                    </span>
                  </div>

                  {masteryTiers.emerging > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50/60 border border-rose-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <div>
                          <p className="text-xs font-bold text-rose-900">Support Needed (&lt;70%)</p>
                          <p className="text-[10px] text-rose-700">Grade D / F</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-900">
                        {masteryTiers.emerging} tests
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Chronological Performance Progression Timeline ─── */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-[#184973]">
                  Chronological Progression
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-0.5">
                  Academic Timeline & Score Trajectory
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing score progression from earliest to latest evaluated assessment {selectedSubject !== "ALL" ? `for ${selectedSubject}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>{visibleAssessments.length} Completed Milestones</span>
                </span>
              </div>
            </div>

            <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-2">
              {visibleAssessments.map((item, idx) => {
                const score = item.results![0].score;
                const max = item.maxScore;
                const pct = Math.round((score / max) * 100);
                const badge = getScoreBadge(pct);
                const isLatest = idx === visibleAssessments.length - 1;
                const subDate = item.results?.[0]?.submittedAt || item.dueDate || item.scheduledDate;

                return (
                  <div key={item.id} className="relative group">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-2 border-white transition-transform group-hover:scale-125 ${
                        isLatest
                          ? "bg-[#184973] ring-4 ring-blue-100"
                          : pct >= 80
                          ? "bg-emerald-500"
                          : pct >= 70
                          ? "bg-amber-500"
                          : "bg-rose-500"
                      }`}
                    />

                    {/* Timeline Card */}
                    <div
                      className={`rounded-xl border p-4 transition-all ${
                        isLatest
                          ? "border-[#184973]/30 bg-blue-50/20 shadow-xs"
                          : "border-slate-200/90 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-[#184973] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {item.teachingAssignment?.subject?.name || "Subject"}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {typeNames[item.type] || item.type}
                            </span>
                            {isLatest && (
                              <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                                Most Recent
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {subDate ? new Date(subDate).toLocaleDateString() : "Completed"}
                            </span>
                            <span>·</span>
                            <span>Max: {max} pts</span>
                            {item.results?.[0]?.gradedBy && (
                              <>
                                <span>·</span>
                                <span>Graded by: {item.results[0].gradedBy.name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Score Indicator */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                              Grade {badge.letter}
                            </span>
                            <span className="text-lg font-black text-slate-900">
                              {score} / {max}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-[#184973]">
                            {pct}% achieved
                          </span>
                        </div>
                      </div>

                      {/* Progress visual bar */}
                      <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLatest
                              ? "bg-[#184973]"
                              : pct >= 80
                              ? "bg-emerald-500"
                              : pct >= 70
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Instructor feedback note snippet if present */}
                      {item.results?.[0]?.feedback && (
                        <p className="mt-2.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                          <span className="font-semibold text-slate-700 not-italic">Instructor Note: </span>
                          &ldquo;{item.results[0].feedback}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}