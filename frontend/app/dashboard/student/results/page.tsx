"use client";

import { useEffect, useState, useMemo } from "react";
import {
  FileSpreadsheet,
  Award,
  CheckCircle2,
  BookOpen,
  Printer,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Calendar,
  Clock,
  User,
  GraduationCap,
  Sparkles,
  X,
  Check,
  BarChart3,
  Layers,
} from "lucide-react";
import { fetchApi } from "@/lib/api";

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
  teachingAssignment?: {
    subject?: { id: string; name: string; code?: string };
    teacher?: { id: string; firstName: string; lastName: string };
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

export type AssignedSubjectMeta = {
  id?: string;
  name: string;
  code?: string;
  teacherName?: string;
};

export default function StudentResultsPage() {
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Check URL query parameter on mount (e.g. ?subject=Mathematics)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const subParam = params.get("subject");
      if (subParam) {
        setSelectedSubject(subParam);
      }
    }
  }, []);

  async function loadResults(isSilent = false) {
    if (!isSilent) setRefreshing(true);
    try {
      const [assessRes, dashRes] = await Promise.allSettled([
        fetchApi("/student/assessments"),
        fetchApi("/student/dashboard")
      ]);

      if (assessRes.status === "fulfilled") {
        const res = assessRes.value;
        if (res.status === 404) {
          setAssessments([]);
        } else if (res.ok) {
          const data = await res.json();
          setAssessments(Array.isArray(data) ? data : []);
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load results (${res.status})`);
        }
      }

      if (dashRes.status === "fulfilled") {
        const res = dashRes.value;
        if (res.ok) {
          const dashData = await res.json();
          if (Array.isArray(dashData.subjects)) {
            const list: AssignedSubjectMeta[] = dashData.subjects.map((s: any) => ({
              id: s.id,
              name: s.subject?.name || "General Studies",
              code: s.subject?.code,
              teacherName: s.teacher
                ? `${s.teacher.firstName || ""} ${s.teacher.lastName || ""}`.trim()
                : "Faculty Instructor"
            }));
            setAssignedSubjects(list);
          }
        }
      }

      setError(null);
    } catch (err: any) {
      console.error("Student results loading error:", err);
      setError(err?.message || "Failed to load academic results");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadResults();
  }, []);

  // Filter only assessments that have a recorded student score
  const gradedList = useMemo(() => {
    return assessments.filter(
      (a) => a && a.results && a.results.length > 0 && a.results[0] && typeof a.results[0].score === "number"
    );
  }, [assessments]);

  // Group assessments by Subject name
  const subjectGroups = useMemo(() => {
    const map = new Map<string, AssessmentItem[]>();
    gradedList.forEach((item) => {
      const name = item.teachingAssignment?.subject?.name || "General Studies";
      const list = map.get(name) || [];
      list.push(item);
      map.set(name, list);
    });
    return map;
  }, [gradedList]);

  // Combined master list of ALL assigned subjects + any evaluated subjects
  const allSubjectNames = useMemo(() => {
    const set = new Set<string>();
    assignedSubjects.forEach((s) => {
      if (s.name) set.add(s.name);
    });
    gradedList.forEach((item) => {
      const name = item.teachingAssignment?.subject?.name;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [assignedSubjects, gradedList]);

  // Expand all subjects by default
  useEffect(() => {
    if (allSubjectNames.length > 0) {
      const initExpanded: Record<string, boolean> = {};
      allSubjectNames.forEach((sub) => {
        initExpanded[sub] = true;
      });
      setExpandedSubjects(initExpanded);
    }
  }, [allSubjectNames]);

  const toggleSubject = (sub: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [sub]: !prev[sub],
    }));
  };

  const getTeacherForSubject = (subName: string) => {
    const assigned = assignedSubjects.find((s) => s.name.toLowerCase() === subName.toLowerCase());
    if (assigned?.teacherName) return assigned.teacherName;
    const items = subjectGroups.get(subName);
    if (items && items[0]?.teachingAssignment?.teacher) {
      return `${items[0].teachingAssignment.teacher.firstName || ""} ${items[0].teachingAssignment.teacher.lastName || ""}`.trim();
    }
    return "Faculty Instructor";
  };

  // Compute Overall Metrics safely
  const totalGradedPoints = useMemo(
    () => gradedList.reduce((acc, a) => acc + (a.results?.[0]?.score ?? 0), 0),
    [gradedList]
  );
  const totalPossiblePoints = useMemo(
    () => gradedList.reduce((acc, a) => acc + (a.maxScore || 100), 0),
    [gradedList]
  );

  const overallAverage = useMemo(() => {
    if (totalPossiblePoints === 0) return 0;
    return Math.round((totalGradedPoints / totalPossiblePoints) * 100);
  }, [totalGradedPoints, totalPossiblePoints]);

  const passedCount = useMemo(() => {
    return gradedList.filter((a) => {
      const score = a.results?.[0]?.score ?? 0;
      const pass = a.passingScore ?? (a.maxScore ? a.maxScore * 0.5 : 50);
      return score >= pass;
    }).length;
  }, [gradedList]);

  // Ethiopian Letter Grade System
  const getGradeInfo = (percentage: number, count?: number) => {
    if (count !== undefined && count === 0) {
      return { letter: "—", label: "No Grades Yet", bg: "bg-slate-100 text-slate-700 border-slate-200" };
    }
    if (percentage >= 90) return { letter: "A", label: "Excellent", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    if (percentage >= 80) return { letter: "B", label: "Very Good", bg: "bg-blue-50 text-blue-800 border-blue-200" };
    if (percentage >= 70) return { letter: "C", label: "Good", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    if (percentage >= 60) return { letter: "D", label: "Satisfactory", bg: "bg-orange-50 text-orange-800 border-orange-200" };
    return { letter: "F", label: "Needs Support", bg: "bg-rose-50 text-rose-800 border-rose-200" };
  };

  const overallGrade = getGradeInfo(overallAverage, gradedList.length);

  // Available Assessment Types in current data
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    gradedList.forEach((a) => {
      if (a.type) types.add(a.type);
    });
    return Array.from(types);
  }, [gradedList]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "EXAM":
        return "Test / Exam";
      case "QUIZ":
        return "Quiz";
      case "ASSIGNMENT":
        return "Assignment";
      case "PROJECT":
        return "Project";
      case "OTHER":
        return "Assessment";
      default:
        return type;
    }
  };

  // Filtered List based on Selected Subject, Selected Type & Search Query
  const filteredGraded = useMemo(() => {
    let list = gradedList;

    // Filter by Subject
    if (selectedSubject !== "ALL") {
      list = subjectGroups.get(selectedSubject) || [];
    }

    // Filter by Assessment Type
    if (selectedType !== "ALL") {
      list = list.filter((item) => item.type === selectedType);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const titleMatch = (item.title || "").toLowerCase().includes(q);
        const subMatch = (item.teachingAssignment?.subject?.name || "").toLowerCase().includes(q);
        const teacherMatch = `${item.teachingAssignment?.teacher?.firstName || ""} ${item.teachingAssignment?.teacher?.lastName || ""}`.toLowerCase().includes(q);
        const typeMatch = getTypeLabel(item.type).toLowerCase().includes(q);
        return titleMatch || subMatch || teacherMatch || typeMatch;
      });
    }

    return list;
  }, [gradedList, selectedSubject, selectedType, subjectGroups, searchQuery]);

  // Group filtered results by subject for the Cards view
  const filteredSubjectGroups = useMemo(() => {
    const map = new Map<string, AssessmentItem[]>();
    filteredGraded.forEach((item) => {
      const name = item.teachingAssignment?.subject?.name || "General Studies";
      const list = map.get(name) || [];
      list.push(item);
      map.set(name, list);
    });
    return map;
  }, [filteredGraded]);

  const filteredSubjectList = useMemo(() => {
    if (selectedSubject !== "ALL") {
      return [selectedSubject];
    }
    return Array.from(filteredSubjectGroups.keys()).sort();
  }, [filteredSubjectGroups, selectedSubject]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 sm:space-y-6 p-2 sm:p-4 font-sans text-slate-800">
      
      {/* ─── MASTHEAD HEADER (Clean, Mobile Compatible) ─── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Academic Results</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                Official Marks
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 sm:line-clamp-none">
              Official report card, evaluated tests, quizzes, subject marks, and verified term grades.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => void loadResults(false)}
            disabled={refreshing}
            className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh results"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Print Official Statement of Results"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ─── TOP METRIC CARDS (Clean White Style, No Blue Hover Fill) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Cumulative Grade Card */}
        <div className="border border-slate-200 bg-white rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all duration-200">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Cumulative Avg
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {overallAverage}%
            </span>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
              Grade {overallGrade.letter} · {overallGrade.label}
            </p>
          </div>
        </div>

        {/* Passed Assessments */}
        <div className="border border-slate-200 bg-white rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all duration-200">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Passed Tests
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {passedCount} <span className="text-xs text-slate-400 font-normal">/ {gradedList.length}</span>
            </span>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
              {gradedList.length ? Math.round((passedCount / gradedList.length) * 100) : 0}% Pass Rate
            </p>
          </div>
        </div>

        {/* Enrolled Subjects */}
        <div className="border border-slate-200 bg-white rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all duration-200">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Assigned Subjects
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {allSubjectNames.length}
            </span>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
              {subjectGroups.size} graded · {allSubjectNames.length - subjectGroups.size} pending
            </p>
          </div>
        </div>

        {/* Total Points */}
        <div className="border border-slate-200 bg-white rounded-xl p-3 sm:p-4 flex flex-col justify-between shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all duration-200">
          <div className="flex items-start justify-between gap-2">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Total Points
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
              {totalGradedPoints} <span className="text-xs text-slate-400 font-normal">/ {totalPossiblePoints}</span>
            </span>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate">
              Official EMIS Marks
            </p>
          </div>
        </div>
      </div>

      {/* ─── ALL ASSIGNED SUBJECTS OVERVIEW CARDS (Clean Card Styling, No Blue Fills) ─── */}
      {allSubjectNames.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Assigned Subjects ({allSubjectNames.length}) <span className="text-slate-400 font-normal normal-case text-[11px] hidden sm:inline">• Click any subject card to filter results</span>
            </span>
            {selectedSubject !== "ALL" && (
              <button
                type="button"
                onClick={() => setSelectedSubject("ALL")}
                className="text-xs text-slate-800 hover:text-slate-950 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Reset to All Subjects</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
            {allSubjectNames.map((subName) => {
              const items = subjectGroups.get(subName) || [];
              const hasEvaluations = items.length > 0;
              const subTotal = items.reduce((acc, a) => acc + (a.results?.[0]?.score ?? 0), 0);
              const subMax = items.reduce((acc, a) => acc + (a.maxScore || 100), 0);
              const subPercent = subMax > 0 ? Math.round((subTotal / subMax) * 100) : 0;
              const subGrade = getGradeInfo(subPercent, items.length);
              const isSelected = selectedSubject === subName;
              const teacherName = getTeacherForSubject(subName);

              return (
                <div
                  key={subName}
                  onClick={() => setSelectedSubject(isSelected ? "ALL" : subName)}
                  className={`rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between cursor-pointer transition-all duration-200 select-none ${
                    isSelected
                      ? "border-slate-900 bg-slate-50/90 ring-1 ring-slate-900 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs active:bg-slate-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {subName}
                        </h4>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-800 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {teacherName}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                      hasEvaluations ? subGrade.bg : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {hasEvaluations ? subGrade.letter : "—"}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {hasEvaluations ? `${subPercent}%` : "No Marks"}
                      </span>
                      <span className="text-slate-400 text-[10px]">
                        {hasEvaluations ? `${items.length} ${items.length === 1 ? "test" : "tests"}` : "Pending"}
                      </span>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          hasEvaluations ? "bg-slate-800" : "bg-slate-200"
                        }`}
                        style={{ width: `${hasEvaluations ? Math.min(100, subPercent) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── CONTROLS: Subject Filter, Type Filter & Search (Responsive) ─── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        
        {/* Top Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by test title, subject, instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-800 focus:border-slate-800 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end sm:self-auto w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center ${
                viewMode === "cards"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Subject Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center ${
                viewMode === "table"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Marksheet Table
            </button>
          </div>
        </div>

        {/* Assessment Type Filter Pills (Touch-scrollable on mobile) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" /> Filter:
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 -mx-1 px-1">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                selectedType === "ALL"
                  ? "bg-slate-900 text-white font-bold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Types ({gradedList.length})
            </button>
            {["EXAM", "QUIZ", "ASSIGNMENT", "PROJECT", "OTHER"].map((type) => {
              const count = gradedList.filter((a) => a.type === type).length;
              if (count === 0 && !availableTypes.includes(type)) return null;
              const isSelected = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(isSelected ? "ALL" : type)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 text-white font-bold shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{getTypeLabel(type)}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(selectedSubject !== "ALL" || selectedType !== "ALL" || searchQuery) && (
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-600 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400">Active filters:</span>
            {selectedSubject !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 font-bold text-[11px] border border-slate-200">
                Subject: {selectedSubject}
                <button type="button" onClick={() => setSelectedSubject("ALL")} className="hover:text-slate-900 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedType !== "ALL" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-900 font-bold text-[11px] border border-slate-200">
                Type: {getTypeLabel(selectedType)}
                <button type="button" onClick={() => setSelectedType("ALL")} className="hover:text-slate-900 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                Search: "{searchQuery}"
                <button type="button" onClick={() => setSearchQuery("")} className="hover:text-slate-900 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedSubject("ALL");
                setSelectedType("ALL");
                setSearchQuery("");
              }}
              className="text-[11px] text-slate-700 hover:underline font-bold ml-auto cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* ─── MAIN RESULTS CONTENT ─── */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 sm:p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-7 h-7 sm:w-8 sm:h-8 animate-spin mx-auto text-slate-700" />
          <p className="text-xs font-semibold text-slate-700">Loading academic results...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-6 text-rose-800 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">Error loading results</p>
              <p className="text-rose-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadResults(false)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer self-start sm:self-auto"
          >
            Retry
          </button>
        </div>
      ) : filteredGraded.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center text-slate-400 space-y-3">
          <FileSpreadsheet className="w-9 h-9 sm:w-10 sm:h-10 mx-auto text-slate-300" />
          {selectedSubject !== "ALL" ? (
            <>
              <p className="text-sm font-bold text-slate-800">
                No Evaluated Results for {selectedSubject}
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Your instructor <span className="font-semibold text-slate-700">{getTeacherForSubject(selectedSubject)}</span> has not posted any graded assessments or tests for this term yet. Evaluated marks will appear here automatically once entered.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubject("ALL");
                  setSelectedType("ALL");
                  setSearchQuery("");
                }}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer transition-colors shadow-xs"
              >
                <span>Show All Subjects</span>
              </button>
            </>
          ) : selectedType !== "ALL" || searchQuery ? (
            <>
              <p className="text-sm font-bold text-slate-800">No Matching Assessments</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No evaluations match your search or type filter. Try adjusting or clearing your active filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedType("ALL");
                  setSearchQuery("");
                }}
                className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer transition-colors shadow-xs"
              >
                <span>Reset Filters</span>
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-800">No Evaluated Marks Found</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your evaluated marks will appear here once teachers record and publish grades for this semester.
              </p>
            </>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* ─── MARKSHEET SPREADSHEET TABLE VIEW (Mobile Responsive) ─── */
        <div className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden">
          <p className="sm:hidden text-[10px] text-slate-400 italic px-3 py-1 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span>Marksheet Spreadsheet</span>
            <span>Scroll horizontally →</span>
          </p>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Assessment Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Percentage</th>
                  <th className="py-3 px-4 text-center">Grade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Instructor Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGraded.map((a) => {
                  const result = a.results?.[0];
                  if (!result) return null;

                  const score = result.score ?? 0;
                  const maxScore = a.maxScore || 100;
                  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                  const grade = getGradeInfo(percentage);
                  const isPass = score >= (a.passingScore ?? maxScore * 0.5);

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {a.teachingAssignment?.subject?.name || "General Studies"}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {a.title || "Untitled Assessment"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600 uppercase tracking-wider">
                          {getTypeLabel(a.type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 tabular-nums text-[11px]">
                        {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 tabular-nums">
                        {score} <span className="text-slate-400 font-normal">/ {maxScore}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold tabular-nums">
                        {percentage}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${grade.bg}`}>
                          {grade.letter}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isPass ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPass ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {isPass ? "Passed" : "Needs Retest"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                        {result.feedback || <span className="italic text-slate-400">No notes recorded</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── SUBJECT PERFORMANCE CARDS VIEW (Clean, Mobile Friendly) ─── */
        <div className="space-y-3 sm:space-y-4">
          {filteredSubjectList.map((subName) => {
            const items = filteredSubjectGroups.get(subName) || [];
            if (items.length === 0) return null;

            const subTotal = items.reduce((acc, a) => acc + (a.results?.[0]?.score ?? 0), 0);
            const subMax = items.reduce((acc, a) => acc + (a.maxScore || 100), 0);
            const subPercent = subMax > 0 ? Math.round((subTotal / subMax) * 100) : 0;
            const subGrade = getGradeInfo(subPercent, items.length);
            const isExpanded = !!expandedSubjects[subName];
            const teacherName = getTeacherForSubject(subName);

            return (
              <div
                key={subName}
                className="bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-xs overflow-hidden transition-all"
              >
                {/* Subject Accordion Header */}
                <div
                  onClick={() => toggleSubject(subName)}
                  className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0 font-bold text-sm">
                      {subGrade.letter}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{subName}</h3>
                        <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold">
                          {items.length} {items.length === 1 ? "Assessment" : "Assessments"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">Instructor: {teacherName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    {/* Score Bar & Average */}
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                        {subPercent}%
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 ml-1.5 font-normal">
                        ({subTotal}/{subMax} pts)
                      </span>
                      <div className="w-20 sm:w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 ml-auto">
                        <div
                          className="h-full bg-slate-800 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, subPercent)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Subject Items Breakdown */}
                {isExpanded && (
                  <div className="border-t border-slate-100 divide-y divide-slate-100 bg-slate-50/30">
                    {items.map((item) => {
                      const res = item.results?.[0];
                      if (!res) return null;

                      const score = res.score ?? 0;
                      const maxScore = item.maxScore || 100;
                      const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
                      const gr = getGradeInfo(pct);
                      const isPass = score >= (item.passingScore ?? maxScore * 0.5);

                      return (
                        <div
                          key={item.id}
                          className="p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-white transition-colors"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-800">{item.title}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 uppercase">
                                {getTypeLabel(item.type)}
                              </span>
                              {item.dueDate && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {new Date(item.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            {res.feedback && (
                              <p className="text-[11px] text-slate-600 italic bg-white border border-slate-200/80 rounded px-2 py-0.5 inline-block">
                                Note: {res.feedback}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-900 tabular-nums">
                                {score} <span className="text-slate-400 font-normal">/ {maxScore}</span>
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500 ml-1.5">
                                ({pct}%)
                              </span>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${gr.bg}`}>
                              {gr.letter}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isPass ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {isPass ? "Passed" : "Retest"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── PRINTABLE OFFICIAL REPORT CARD BANNER (Hidden on screen, rendered on Print) ─── */}
      <div className="hidden print:block p-8 space-y-6">
        <div className="text-center border-b-2 border-slate-800 pb-4">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">Official Student Report Card</h1>
          <p className="text-xs text-slate-600 mt-1">EMIS Student Information System • Academic Record</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p><span className="font-bold">Cumulative Average:</span> {overallAverage}%</p>
            <p><span className="font-bold">Letter Grade:</span> {overallGrade.letter} ({overallGrade.label})</p>
          </div>
          <div className="text-right">
            <p><span className="font-bold">Evaluated Tests:</span> {gradedList.length}</p>
            <p><span className="font-bold">Pass Rate:</span> {gradedList.length ? Math.round((passedCount / gradedList.length) * 100) : 0}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
