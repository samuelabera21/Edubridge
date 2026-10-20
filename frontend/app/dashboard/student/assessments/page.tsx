"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BookOpen,
  ArrowRight,
  Send,
  X,
  Award,
  Layers,
  GraduationCap,
  RefreshCw,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import AssessmentHeader from "./AssessmentHeader";

export type AssessmentItem = {
  id: string;
  title: string;
  description: string | null;
  type: "EXAM" | "QUIZ" | "ASSIGNMENT" | "PROJECT" | "OTHER";
  status: "SCHEDULED" | "RELEASED" | "CLOSED";
  durationMinutes: number | null;
  scheduledDate: string | null;
  dueDate: string | null;
  maxScore: number;
  passingScore: number | null;
  teachingAssignment: {
    subject: { id: string; name: string };
    teacher: { id: string; firstName: string; lastName: string };
    schoolGrade?: { grade?: { level: number; name: string } };
    section?: { name: string };
  };
  results?: Array<{
    id: string;
    score: number;
    status: string;
    startedAt: string | null;
    submittedAt: string | null;
    feedback: string | null;
    gradedBy?: { id: string; name: string; email: string } | null;
  }>;
};

export default function StudentAssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedStatusTab, setSelectedStatusTab] = useState<"ALL" | "ACTIVE" | "UPCOMING" | "GRADED">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Take / Submit Test Modal
  const [activeModalAssessment, setActiveModalAssessment] = useState<AssessmentItem | null>(null);
  const [solutionNotes, setSolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  async function loadAssessments(isSilent = false) {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await fetchApi("/student/assessments");
      if (!res.ok) throw new Error("Unable to load assessments");
      const data = await res.json();
      setAssessments(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load assessments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAssessments();
  }, []);

  // Compute metrics
  const totalCount = assessments.length;
  const gradedAssessments = useMemo(
    () => assessments.filter((a) => a.results && a.results.length > 0 && a.results[0].status === "GRADED"),
    [assessments]
  );
  const activeAssessments = useMemo(
    () => assessments.filter((a) => a.status === "RELEASED" && (!a.results || a.results.length === 0 || a.results[0].status !== "GRADED")),
    [assessments]
  );
  const upcomingAssessments = useMemo(
    () => assessments.filter((a) => a.status === "SCHEDULED"),
    [assessments]
  );

  const averageScore = useMemo(() => {
    if (gradedAssessments.length === 0) return null;
    const totalPercentage = gradedAssessments.reduce((acc, a) => {
      const res = a.results![0];
      return acc + (res.score / a.maxScore) * 100;
    }, 0);
    return Math.round(totalPercentage / gradedAssessments.length);
  }, [gradedAssessments]);

  // Subjects dropdown list
  const subjects = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach((a) => {
      if (a.teachingAssignment?.subject?.name) {
        set.add(a.teachingAssignment.subject.name);
      }
    });
    return Array.from(set).sort();
  }, [assessments]);

  // Filtered assessments list
  const filteredAssessments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return assessments.filter((item) => {
      const subjectName = item.teachingAssignment?.subject?.name || "";
      const teacherName = `${item.teachingAssignment?.teacher?.firstName || ""} ${item.teachingAssignment?.teacher?.lastName || ""}`;
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        subjectName.toLowerCase().includes(q) ||
        teacherName.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));

      const matchesSubject = selectedSubject === "ALL" || subjectName === selectedSubject;
      const matchesType = selectedType === "ALL" || item.type === selectedType;

      let matchesStatus = true;
      const hasGraded = Boolean(item.results && item.results.length > 0 && item.results[0].status === "GRADED");
      if (selectedStatusTab === "ACTIVE") {
        matchesStatus = item.status === "RELEASED" && !hasGraded;
      } else if (selectedStatusTab === "UPCOMING") {
        matchesStatus = item.status === "SCHEDULED";
      } else if (selectedStatusTab === "GRADED") {
        matchesStatus = hasGraded;
      }

      return matchesSearch && matchesSubject && matchesType && matchesStatus;
    });
  }, [assessments, searchQuery, selectedSubject, selectedType, selectedStatusTab]);

  // Handle assessment submit
  async function handleSubmitAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeModalAssessment) return;

    setSubmitting(true);
    try {
      const res = await fetchApi(`/student/assessments/${activeModalAssessment.id}/submit`, {
        method: "POST",
        body: JSON.stringify({ solutionNotes }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setActiveModalAssessment(null);
          setSolutionNotes("");
          setSubmitSuccess(false);
          void loadAssessments(true);
        }, 1200);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData?.error || "Failed to submit assessment");
      }
    } catch (err) {
      console.error(err);
      alert("Network error submitting assessment");
    } finally {
      setSubmitting(false);
    }
  }

  // Format Ethiopian letter grade
  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: "A", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (percentage >= 80) return { grade: "B", color: "text-blue-700 bg-blue-50 border-blue-200" };
    if (percentage >= 70) return { grade: "C", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (percentage >= 60) return { grade: "D", color: "text-orange-700 bg-orange-50 border-orange-200" };
    return { grade: "F", color: "text-rose-700 bg-rose-50 border-rose-200" };
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-4">
      <AssessmentHeader
        title="Tests and Quizzes"
        subtitle="View upcoming tests, take active quizzes, and track your assessment schedule."
        averageScore={averageScore}
        totalAssessments={totalCount}
        gradedCount={gradedAssessments.length}
        onRefresh={() => void loadAssessments(false)}
        refreshing={refreshing}
      />

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Scheduled</span>
            <span className="rounded-lg bg-blue-50 p-2 text-[#184973]">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{totalCount}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Across all enrolled subjects</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active & Open</span>
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <Sparkles className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{activeAssessments.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Ready for online submission</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming</span>
            <span className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-700">{upcomingAssessments.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Scheduled on class calendar</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Graded Average</span>
            <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-800">
            {averageScore !== null ? `${averageScore}%` : "Pending"}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {gradedAssessments.length} assessment{gradedAssessments.length === 1 ? "" : "s"} evaluated
          </p>
        </div>
      </div>

      {/* ─── Interactive Search & Filter Controls ─── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search assessment title, topic, or teacher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs outline-none focus:border-[#184973] focus:bg-white focus:ring-1 focus:ring-[#184973] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Subject & Type Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#184973] transition cursor-pointer"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#184973] transition cursor-pointer"
            >
              <option value="ALL">All Assessment Types</option>
              <option value="EXAM">Tests & Exams</option>
              <option value="QUIZ">Quizzes</option>
              <option value="ASSIGNMENT">Assignments</option>
              <option value="PROJECT">Projects</option>
            </select>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            Status:
          </span>
          {(
            [
              { id: "ALL", label: `All (${totalCount})` },
              { id: "ACTIVE", label: `Active / Open (${activeAssessments.length})` },
              { id: "UPCOMING", label: `Upcoming (${upcomingAssessments.length})` },
              { id: "GRADED", label: `Graded (${gradedAssessments.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatusTab(tab.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition cursor-pointer shrink-0 ${
                selectedStatusTab === tab.id
                  ? "bg-[#184973] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Assessments List ─── */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-[#184973]" />
            Loading assessment schedule...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600">
            <AlertCircle className="mx-auto mb-2 h-6 w-6 text-rose-500" />
            {error}
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <BookOpen className="mx-auto mb-2 h-7 w-7 text-slate-300" />
            No assessments match your current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAssessments.map((assessment) => {
              const result = assessment.results?.[0];
              const isGraded = result && result.status === "GRADED";
              const isSubmitted = result && (result.status === "SUBMITTED" || result.status === "IN_PROGRESS") && !isGraded;
              const isOpen = assessment.status === "RELEASED" && !result;
              const isExpanded = expandedId === assessment.id;

              const percentage = isGraded ? Math.round((result.score / assessment.maxScore) * 100) : null;
              const letterGrade = percentage !== null ? getLetterGrade(percentage) : null;

              return (
                <div key={assessment.id} className="transition hover:bg-slate-50/60 p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-[#184973] border border-blue-200">
                          {assessment.teachingAssignment?.subject?.name || "General"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                          {assessment.type}
                        </span>
                        {isOpen && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 animate-pulse">
                            ● Active Now
                          </span>
                        )}
                        {assessment.status === "SCHEDULED" && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
                            Upcoming
                          </span>
                        )}
                        {isSubmitted && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            Submitted · Pending Review
                          </span>
                        )}
                        {isGraded && letterGrade && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${letterGrade.color}`}>
                            Grade {letterGrade.grade} ({percentage}%)
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                        {assessment.title}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                          Teacher {assessment.teachingAssignment?.teacher?.firstName} {assessment.teachingAssignment?.teacher?.lastName}
                        </span>
                        {assessment.durationMinutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {assessment.durationMinutes} mins
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {assessment.dueDate
                            ? `Due: ${new Date(assessment.dueDate).toLocaleDateString()}`
                            : assessment.scheduledDate
                            ? `Date: ${new Date(assessment.scheduledDate).toLocaleDateString()}`
                            : "Date TBA"}
                        </span>
                        <span className="font-semibold text-slate-700">
                          Max: {assessment.maxScore} pts
                        </span>
                        {assessment.passingScore && (
                          <span className="text-slate-400">
                            (Pass: {assessment.passingScore})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Action & Score */}
                    <div className="flex items-center gap-3 shrink-0">
                      {isGraded ? (
                        <div className="text-right">
                          <p className="text-base font-black text-emerald-700">
                            {result.score} / {assessment.maxScore}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400">
                            Evaluated
                          </p>
                        </div>
                      ) : isOpen ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveModalAssessment(assessment);
                            setSolutionNotes("");
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#184973] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#123655] transition cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          <span>Take / Submit</span>
                        </button>
                      ) : (
                        <div className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                          {assessment.status === "SCHEDULED" ? "Scheduled" : "Closed"}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                        title={isExpanded ? "Collapse Details" : "View Details"}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Accordion: Description & Feedback */}
                  {isExpanded && (
                    <div className="mt-3.5 pt-3.5 border-t border-slate-100 grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                          Assessment Instructions
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                          {assessment.description || "No special instructions provided by the instructor."}
                        </p>
                      </div>

                      <div className="rounded-xl bg-blue-50/70 p-3">
                        <p className="font-bold text-[#184973] uppercase tracking-wider text-[10px] mb-1">
                          Submission & Result Status
                        </p>
                        {isGraded ? (
                          <div className="space-y-1 text-slate-700">
                            <p className="font-semibold text-emerald-800">
                              Feedback from Teacher {assessment.teachingAssignment?.teacher?.firstName}:
                            </p>
                            <p className="italic text-slate-600">
                              "{result.feedback || "Good job on completing the assessment."}"
                            </p>
                            {result.submittedAt && (
                              <p className="text-[10px] text-slate-400 pt-1">
                                Submitted on {new Date(result.submittedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        ) : isSubmitted ? (
                          <div className="text-slate-600 space-y-1">
                            <p className="font-semibold text-amber-800">Your solution has been submitted.</p>
                            <p className="text-[11px]">Instructor is reviewing your responses.</p>
                          </div>
                        ) : (
                          <div className="text-slate-600 space-y-1">
                            <p>Not yet submitted.</p>
                            {isOpen && (
                              <p className="text-[#184973] font-semibold">
                                Click "Take / Submit" above to enter your solution notes.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Interactive Take / Submit Modal ─── */}
      {activeModalAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#184973] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {activeModalAssessment.teachingAssignment?.subject?.name} · {activeModalAssessment.type}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {activeModalAssessment.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalAssessment(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 animate-bounce" />
                <h4 className="text-base font-bold text-slate-900">Assessment Submitted Successfully!</h4>
                <p className="text-xs text-slate-500">
                  Your work has been forwarded to Teacher {activeModalAssessment.teachingAssignment?.teacher?.firstName} for grading.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitAssessment} className="space-y-4 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 text-slate-600 space-y-1">
                  <p className="font-bold text-slate-700">Instructions:</p>
                  <p className="leading-relaxed">
                    {activeModalAssessment.description || "Enter your solution work, proof steps, or essay responses below."}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                    <span>Duration: {activeModalAssessment.durationMinutes || 60} mins</span>
                    <span>Max Marks: {activeModalAssessment.maxScore} pts</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Your Response / Solution Notes:
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={solutionNotes}
                    onChange={(e) => setSolutionNotes(e.target.value)}
                    placeholder="Type your answers, formula derivations, code, or essay content here..."
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#184973] focus:ring-1 focus:ring-[#184973] transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveModalAssessment(null)}
                    disabled={submitting}
                    className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !solutionNotes.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#184973] px-4 py-2 font-bold text-white shadow-xs hover:bg-[#123655] transition disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Submit Work</span>
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
