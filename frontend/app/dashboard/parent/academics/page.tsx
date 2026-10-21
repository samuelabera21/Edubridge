"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    GraduationCap,
    BookOpen,
    TrendingUp,
    TrendingDown,
    Award,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Users,
    FileText,
    MessageSquare,
    ChevronDown,
    ChevronUp,
    User,
    Info,
    ShieldAlert,
    BarChart3
} from "lucide-react";

function getLetterGrade(percentage: number): { grade: string; color: string; label: string } {
    if (percentage >= 90) return { grade: "A", color: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Excellent" };
    if (percentage >= 80) return { grade: "B", color: "text-blue-700 bg-blue-50 border-blue-200", label: "Very Good" };
    if (percentage >= 70) return { grade: "C", color: "text-cyan-700 bg-cyan-50 border-cyan-200", label: "Good" };
    if (percentage >= 50) return { grade: "D", color: "text-amber-700 bg-amber-50 border-amber-200", label: "Satisfactory" };
    return { grade: "F", color: "text-rose-700 bg-rose-50 border-rose-200", label: "Needs Improvement" };
}

function AcademicResultsContent() {
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab") || "subjects";

    const [profile, setProfile] = useState<any>(null);
    const [selectedChildIndex, setSelectedChildIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [academicData, setAcademicData] = useState<any>(null);
    const [academicLoading, setAcademicLoading] = useState(false);
    const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
    const [earlyWarningFlags, setEarlyWarningFlags] = useState<any[]>([]);

    useEffect(() => {
        async function fetchParentProfile() {
            try {
                setLoading(true);
                const res = await fetch("/api/parent/me");
                if (res.ok) {
                    const data = await res.json();
                    setProfile(data);
                }

                // Fetch early warning data for risk indicators
                try {
                    const ewRes = await fetch("/api/support/early-warning/assessment");
                    if (ewRes.ok) {
                        const ewData = await ewRes.json();
                        setEarlyWarningFlags(ewData || []);
                    }
                } catch {
                    // non-fatal
                }
            } catch (err) {
                console.error("Failed to load parent profile", err);
            } finally {
                setLoading(false);
            }
        }
        fetchParentProfile();
    }, []);

    const children = profile?.children || [];
    const hasChildren = children.length > 0;
    const currentStudent = hasChildren ? children[selectedChildIndex]?.student : null;

    useEffect(() => {
        async function fetchAcademicData() {
            if (!currentStudent?.id) return;
            try {
                setAcademicLoading(true);
                const res = await fetch(`/api/parent/children/${currentStudent.id}/academics`);
                if (res.ok) {
                    const data = await res.json();
                    setAcademicData(data);
                } else {
                    setAcademicData(null);
                }
            } catch (err) {
                console.error("Failed to load academic data", err);
                setAcademicData(null);
            } finally {
                setAcademicLoading(false);
            }
        }
        fetchAcademicData();
    }, [currentStudent?.id]);

    const setTab = (tabName: string) => {
        const url = new URL(window.location.href);
        if (tabName === "subjects") {
            url.searchParams.delete("tab");
        } else {
            url.searchParams.set("tab", tabName);
        }
        window.history.pushState({}, "", url.toString());
    };

    const toggleSubjectExpand = (subjectId: string) => {
        setExpandedSubjects(prev => ({
            ...prev,
            [subjectId]: !prev[subjectId]
        }));
    };

    if (loading) {
        return (
            <div className="w-full max-w-6xl mx-auto space-y-6 animate-pulse">
                <div className="h-32 bg-gray-100 rounded-2xl" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="h-24 bg-gray-100 rounded-xl" />
                    <div className="h-24 bg-gray-100 rounded-xl" />
                    <div className="h-24 bg-gray-100 rounded-xl" />
                    <div className="h-24 bg-gray-100 rounded-xl" />
                </div>
                <div className="h-64 bg-gray-100 rounded-2xl" />
            </div>
        );
    }

    if (!currentStudent) {
        return (
            <div className="w-full max-w-5xl mx-auto p-8 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-center space-y-3">
                <Users className="w-12 h-12 mx-auto text-amber-600 opacity-60" />
                <h3 className="font-bold text-base">No Linked Student Found</h3>
                <p className="text-xs text-amber-700 max-w-md mx-auto">
                    There is currently no student linked to your account. Please contact the school administration to link your student profile.
                </p>
            </div>
        );
    }

    const studentFullName = `${currentStudent.firstName} ${currentStudent.lastName}`;
    const subjects = academicData?.subjects || [];
    const summary = academicData?.summary || {
        totalAssessments: 0,
        overallPercentage: 0,
        passCount: 0,
        failCount: 0,
        status: "NO_RESULTS"
    };

    const overallScore = summary.overallPercentage || 0;
    const overallGradeInfo = getLetterGrade(overallScore);

    // Filter feedback from all assessments
    const allFeedbackList: Array<{
        subjectName: string;
        teacherName: string;
        assessmentTitle: string;
        type: string;
        score: number;
        maxScore: number;
        feedback: string;
        date: string | null;
    }> = [];

    subjects.forEach((subj: any) => {
        (subj.assessments || []).forEach((ass: any) => {
            if (ass.feedback && ass.feedback.trim().length > 0) {
                allFeedbackList.push({
                    subjectName: subj.subjectName,
                    teacherName: subj.teacherName,
                    assessmentTitle: ass.title,
                    type: ass.type,
                    score: ass.score,
                    maxScore: ass.maxScore,
                    feedback: ass.feedback,
                    date: ass.date
                });
            }
        });
    });

    // Identify strengths and growth areas
    const strengthSubjects = subjects.filter((s: any) => s.averagePercentage >= 75);
    const needsPracticeSubjects = subjects.filter((s: any) => s.averagePercentage > 0 && s.averagePercentage < 60);

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            {/* Header Panel - Clean White Background */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                                Academic Portal
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                                Official Record
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1.5 text-gray-900">
                            Academic Results & Performance
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                            Approved subject scores, assessment breakdowns, and teacher feedback for <strong className="text-gray-900">{studentFullName}</strong>.
                        </p>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 px-5 py-3 rounded-xl text-center shrink-0">
                        <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider block">Overall Average</span>
                        <span className={`text-2xl sm:text-3xl font-extrabold ${overallScore >= 50 ? "text-emerald-600" : "text-amber-600"}`}>
                            {overallScore}%
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold inline-block mt-0.5 border ${overallGradeInfo.color}`}>
                            Grade {overallGradeInfo.grade} • {overallGradeInfo.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Child Switcher (if multiple children) */}
            {children.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>Select Child:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {children.map((rel: any, idx: number) => {
                            const isSelected = idx === selectedChildIndex;
                            const ch = rel.student;
                            return (
                                <button
                                    key={ch.id || idx}
                                    onClick={() => setSelectedChildIndex(idx)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                        isSelected
                                            ? "bg-[#184973] text-white shadow-sm"
                                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                    }`}
                                >
                                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                                        {ch.firstName?.[0] || "S"}
                                    </div>
                                    <span>{ch.firstName} {ch.lastName}</span>
                                    <span className="text-[10px] opacity-75 font-mono">({ch.studentId})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Quick KPI Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider block">Current Average</span>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-gray-900">{overallScore}%</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${overallGradeInfo.color}`}>
                            {overallGradeInfo.grade}
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider block">Total Assessments</span>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalAssessments}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-emerald-700 text-[11px] font-semibold uppercase tracking-wider block">Passing Assessments</span>
                    <div className="flex items-baseline gap-1.5">
                        <p className="text-2xl font-bold text-emerald-800">{summary.passCount}</p>
                        <span className="text-xs text-gray-500">/ {summary.totalAssessments}</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-1">
                    <span className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider block">Academic Standing</span>
                    <p className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${
                        overallScore >= 50 ? "text-emerald-700" : "text-rose-700"
                    }`}>
                        {overallScore >= 50 ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Good Standing
                            </>
                        ) : (
                            <>
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" /> Needs Support
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <button
                    onClick={() => setTab("subjects")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "subjects"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>Subject Results ({subjects.length})</span>
                </button>

                <button
                    onClick={() => setTab("trends")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "trends"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    <span>Performance Trends</span>
                </button>

                <button
                    onClick={() => setTab("feedback")}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === "feedback"
                            ? "bg-[#184973] text-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>Teacher Feedback ({allFeedbackList.length})</span>
                </button>
            </div>

            {/* TAB 1: SUBJECT RESULTS */}
            {currentTab === "subjects" && (
                <div className="space-y-4">
                    {academicLoading ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-xs text-gray-500 animate-pulse">
                            Loading student academic results...
                        </div>
                    ) : subjects.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
                            <GraduationCap className="w-12 h-12 text-gray-300 mx-auto" />
                            <h3 className="font-bold text-sm text-gray-900">No Assessment Results Released Yet</h3>
                            <p className="text-xs text-gray-500 max-w-md mx-auto">
                                The student is actively enrolled. Teachers will publish approved assessment marks, quizzes, and midterm grades as they become official.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subjects.map((subj: any) => {
                                const isExpanded = !!expandedSubjects[subj.subjectId];
                                const gradeInfo = getLetterGrade(subj.averagePercentage);
                                const assessments = subj.assessments || [];

                                return (
                                    <div 
                                        key={subj.subjectId}
                                        className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3 hover:border-gray-300 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                                        {subj.subjectCode || "SUBJ"}
                                                    </span>
                                                    <h3 className="font-bold text-base text-gray-900">{subj.subjectName}</h3>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>Teacher: {subj.teacherName}</span>
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-xl font-extrabold text-gray-900 block">
                                                    {subj.averagePercentage}%
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${gradeInfo.color}`}>
                                                    Grade {gradeInfo.grade}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-1">
                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        subj.averagePercentage >= 80 ? "bg-emerald-500" :
                                                        subj.averagePercentage >= 50 ? "bg-blue-500" : "bg-rose-500"
                                                    }`}
                                                    style={{ width: `${Math.min(100, Math.max(0, subj.averagePercentage))}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-gray-400">
                                                <span>Passing: 50%</span>
                                                <span>{subj.assessmentsCount} assessment(s)</span>
                                            </div>
                                        </div>

                                        {/* Expandable Individual Assessment Results */}
                                        {assessments.length > 0 && (
                                            <div>
                                                <button
                                                    onClick={() => toggleSubjectExpand(subj.subjectId)}
                                                    className="w-full flex items-center justify-between text-xs font-semibold text-blue-700 hover:text-blue-900 pt-2 border-t border-gray-100 cursor-pointer"
                                                >
                                                    <span>{isExpanded ? "Hide Individual Marks" : `View ${assessments.length} Assessment Marks`}</span>
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </button>

                                                {isExpanded && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                                                        {assessments.map((ass: any, aIdx: number) => {
                                                            const isAssPass = ass.score >= (ass.maxScore * 0.5);
                                                            return (
                                                                <div 
                                                                    key={ass.id || aIdx}
                                                                    className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-xs space-y-1"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                                                                                {ass.type}
                                                                            </span>
                                                                            <span className="font-bold text-gray-900">{ass.title}</span>
                                                                        </div>
                                                                        <div className="font-mono font-bold text-gray-900">
                                                                            <span className={isAssPass ? "text-emerald-700" : "text-rose-700"}>
                                                                                {ass.score}
                                                                            </span>
                                                                            <span className="text-gray-400"> / {ass.maxScore} ({ass.percentage}%)</span>
                                                                        </div>
                                                                    </div>
                                                                    {ass.feedback && (
                                                                        <p className="text-[11px] text-gray-600 italic bg-white p-2 rounded-lg border border-gray-200 mt-1.5">
                                                                            💬 Teacher Remark: "{ass.feedback}"
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: PERFORMANCE TRENDS */}
            {currentTab === "trends" && (
                <div className="space-y-6">
                    {/* Strengths & Practice Areas Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Areas of Strength */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                                <h3 className="font-bold text-sm text-gray-900">Academic Strengths</h3>
                            </div>

                            {strengthSubjects.length === 0 ? (
                                <p className="text-xs text-gray-400 py-4 text-center">
                                    No subjects currently above 75%. Keep studying to achieve strong mastery!
                                </p>
                            ) : (
                                <div className="space-y-2.5">
                                    {strengthSubjects.map((s: any) => (
                                        <div key={s.subjectId} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs">
                                            <div>
                                                <p className="font-bold text-gray-900">{s.subjectName}</p>
                                                <p className="text-[11px] text-gray-500">Teacher: {s.teacherName}</p>
                                            </div>
                                            <span className="text-sm font-extrabold text-emerald-700">
                                                {s.averagePercentage}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Focus & Growth Areas */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                                <TrendingDown className="w-5 h-5 text-amber-600" />
                                <h3 className="font-bold text-sm text-gray-900">Areas for Focused Practice</h3>
                            </div>

                            {needsPracticeSubjects.length === 0 ? (
                                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>All recorded subjects are meeting or exceeding standard passing grades.</span>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {needsPracticeSubjects.map((s: any) => (
                                        <div key={s.subjectId} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100 text-xs">
                                            <div>
                                                <p className="font-bold text-gray-900">{s.subjectName}</p>
                                                <p className="text-[11px] text-gray-500">Teacher: {s.teacherName}</p>
                                            </div>
                                            <span className="text-sm font-extrabold text-amber-700">
                                                {s.averagePercentage}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ministry of Education Grading Framework */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-[#184973]" />
                                <span>Ethiopian Ministry of Education Secondary Grading Standard</span>
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-emerald-800 text-sm">Grade A</span>
                                    <span className="text-[10px] font-bold text-emerald-700">90% – 100%</span>
                                </div>
                                <p className="text-emerald-900 text-[11px]">Excellent mastery of subject competencies.</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-blue-800 text-sm">Grade B</span>
                                    <span className="text-[10px] font-bold text-blue-700">80% – 89%</span>
                                </div>
                                <p className="text-blue-900 text-[11px]">Very good comprehension and consistent output.</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200 space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-cyan-800 text-sm">Grade C</span>
                                    <span className="text-[10px] font-bold text-cyan-700">70% – 79%</span>
                                </div>
                                <p className="text-cyan-900 text-[11px]">Good understanding with scope for advancement.</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-amber-800 text-sm">Grade D</span>
                                    <span className="text-[10px] font-bold text-amber-700">50% – 69%</span>
                                </div>
                                <p className="text-amber-900 text-[11px]">Satisfactory; meets minimum passing standard.</p>
                            </div>

                            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-extrabold text-rose-800 text-sm">Grade F</span>
                                    <span className="text-[10px] font-bold text-rose-700">&lt; 50%</span>
                                </div>
                                <p className="text-rose-900 text-[11px]">Below passing threshold; requires remedial support.</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-gray-600 leading-relaxed flex items-start gap-2.5">
                            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>
                                <strong>Secondary School Academic Promotion Policy:</strong> To qualify for semester progression and national examinations, students must maintain an overall average score of at least 50% across all subjects, with no more than two failing subjects. Regular home revision and active teacher communication are encouraged.
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: TEACHER FEEDBACK */}
            {currentTab === "feedback" && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-[#184973]" />
                                <span>Subject Teacher Remarks & Guidance</span>
                            </h3>
                            <span className="text-xs text-gray-500">{allFeedbackList.length} feedback item(s)</span>
                        </div>

                        {allFeedbackList.length === 0 ? (
                            <div className="py-12 text-center space-y-2">
                                <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                                <h4 className="font-bold text-sm text-gray-900">No Direct Feedback Recorded Yet</h4>
                                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                    As teachers complete grading for midterm tests, projects, and lab activities, their qualitative feedback and suggestions will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {allFeedbackList.map((item, idx) => (
                                    <div key={idx} className="py-4 space-y-2 text-xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 text-sm">{item.subjectName}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                                    {item.assessmentTitle}
                                                </span>
                                            </div>
                                            <div className="text-gray-500 text-[11px] flex items-center gap-2">
                                                <span>Teacher: <strong className="text-gray-800">{item.teacherName}</strong></span>
                                                {item.date && <span>• {new Date(item.date).toLocaleDateString()}</span>}
                                            </div>
                                        </div>

                                        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-gray-800 text-xs leading-relaxed">
                                            "{item.feedback}"
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                                            <span>Assessment Score: <strong className="text-gray-800">{item.score} / {item.maxScore}</strong></span>
                                            <span className="text-blue-700 font-medium">Home study suggestion available in AI Assistant</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AcademicResultsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-gray-500 text-xs font-medium animate-pulse">
                    Loading academic performance data...
                </div>
            </div>
        }>
            <AcademicResultsContent />
        </Suspense>
    );
}
