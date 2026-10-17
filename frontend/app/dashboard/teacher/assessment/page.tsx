"use client";

import { useEffect, useState, Suspense } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { 
    GraduationCap, 
    Plus, 
    Save, 
    CheckCircle2, 
    Award, 
    Calendar, 
    BarChart2, 
    MessageSquare, 
    Check, 
    X, 
    Play, 
    Loader2,
    Inbox,
    Filter,
    Trash2,
    BookOpen,
    Users,
    Clock,
    FileSpreadsheet,
    HelpCircle,
    FileText,
    Sparkles,
    AlertCircle,
    Lock,
    Unlock,
    RefreshCw,
    Square,
    Radio
} from "lucide-react";

interface AssessmentItem {
    id: string;
    title: string;
    description?: string | null;
    type: string;
    status?: "SCHEDULED" | "RELEASED" | "CLOSED";
    durationMinutes?: number | null;
    scheduledDate?: string | null;
    releasedAt?: string | null;
    closedAt?: string | null;
    maxScore: number;
    passingScore?: number | null;
    dueDate?: string | null;
    academicYearId?: string;
    teachingAssignmentId: string;
    teachingAssignment?: {
        subject?: { name: string; code?: string };
        schoolGrade?: { grade?: { level: number; name: string } };
        section?: { name: string };
    };
    results?: Array<{
        id: string;
        enrollmentId: string;
        score: number;
        feedback?: string;
    }>;
    createdAt?: string;
}

function AssessmentContent() {
    const searchParams = useSearchParams();
    const typeParam = searchParams.get("type");
    const tabParam = searchParams.get("tab");

    // Active navigation tab
    const [activeTab, setActiveTab] = useState<"create" | "conduct" | "grade" | "feedback">(
        (tabParam as any) || (typeParam ? "create" : "create")
    );

    const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState<AssessmentItem | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [resultsMap, setResultsMap] = useState<Record<string, { score: number; feedback: string }>>({});
    
    // Create Assessment Form State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState<string>("QUIZ");
    const [newMaxScore, setNewMaxScore] = useState<number>(20);
    const [newPassingScore, setNewPassingScore] = useState<number>(10);
    const [newAssignmentId, setNewAssignmentId] = useState<string>("");
    const [newDueDate, setNewDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [newScheduledDate, setNewScheduledDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [newScheduledTime, setNewScheduledTime] = useState<string>("09:00");
    const [newDurationMinutes, setNewDurationMinutes] = useState<number>(60);
    const [newDescription, setNewDescription] = useState<string>("");

    // Filters
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
    const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Live Session Monitor State
    const [sessionRoster, setSessionRoster] = useState<any[]>([]);
    const [sessionStats, setSessionStats] = useState<{ totalEnrolled: number; notStarted: number; inProgress: number; submitted: number } | null>(null);
    const [loadingSession, setLoadingSession] = useState(false);
    const [statusModal, setStatusModal] = useState<"RELEASE" | "CLOSE" | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Sync from URL parameters
    useEffect(() => {
        if (typeParam) {
            if (typeParam !== "ALL") {
                setNewType(typeParam);
                applyTypeDefaults(typeParam);
                setShowCreateModal(true);
            }
            setSelectedTypeFilter(typeParam);
            setActiveTab("create");
        }
        if (tabParam && ["create", "conduct", "grade", "feedback"].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [typeParam, tabParam]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const applyTypeDefaults = (type: string) => {
        switch (type.toUpperCase()) {
            case "QUIZ":
                setNewMaxScore(10);
                setNewPassingScore(5);
                setNewDurationMinutes(15);
                break;
            case "TEST":
                setNewMaxScore(40);
                setNewPassingScore(20);
                setNewDurationMinutes(45);
                break;
            case "EXAM":
                setNewMaxScore(100);
                setNewPassingScore(50);
                setNewDurationMinutes(60);
                break;
            case "ASSIGNMENT":
                setNewMaxScore(20);
                setNewPassingScore(10);
                setNewDurationMinutes(60);
                break;
            case "PROJECT":
                setNewMaxScore(50);
                setNewPassingScore(25);
                setNewDurationMinutes(120);
                break;
            default:
                setNewMaxScore(20);
                setNewPassingScore(10);
                setNewDurationMinutes(60);
        }
    };

    const handleTypeSelect = (type: string) => {
        setNewType(type);
        applyTypeDefaults(type);
    };

    async function loadInitialData() {
        try {
            setLoading(true);
            const [assRes, classRes] = await Promise.all([
                fetchApi("/teacher/assessment"),
                fetchApi("/teacher/my-classes")
            ]);

            const assData = assRes.ok ? await assRes.json() : [];
            const classData = classRes.ok ? await classRes.json() : [];

            const assList: AssessmentItem[] = Array.isArray(assData) ? assData : [];
            const classList = Array.isArray(classData) ? classData : [];

            setAssessments(assList);
            setClasses(classList);

            if (classList.length > 0) {
                const firstAssignmentId = classList[0].assignment?.id || classList[0].id || "";
                setNewAssignmentId(firstAssignmentId);
            }
            if (assList.length > 0) {
                selectAssessment(assList[0], classList);
            }
        } catch (err) {
            console.error("Failed to load assessments:", err);
            setMsg({ type: "error", text: "Failed to load initial assessments." });
        } finally {
            setLoading(false);
        }
    }

    const selectAssessment = (ass: AssessmentItem, classList: any[] = classes) => {
        setSelectedAssessment(ass);
        const matchedClass = classList.find((c: any) => (c.assignment?.id || c.id) === ass.teachingAssignmentId);
        const stList = matchedClass?.students || matchedClass?.assignment?.section?.studentEnrollments || [];
        setStudents(stList);

        const map: Record<string, { score: number; feedback: string }> = {};
        stList.forEach((st: any) => {
            const existingResult = ass.results?.find((r: any) => r.enrollmentId === st.id);
            map[st.id] = {
                score: existingResult?.score !== undefined ? existingResult.score : 0,
                feedback: existingResult?.feedback || ""
            };
        });
        setResultsMap(map);
        loadSessionData(ass.id);
    };

    const loadSessionData = async (assessmentId: string) => {
        if (!assessmentId) return;
        try {
            setLoadingSession(true);
            const res = await fetchApi(`/teacher/assessment/${assessmentId}/session`);
            if (res.ok) {
                const data = await res.json();
                setSessionRoster(data.roster || []);
                setSessionStats(data.stats || null);
                if (data.assessment) {
                    setSelectedAssessment(prev => prev ? { 
                        ...prev, 
                        status: data.assessment.status, 
                        releasedAt: data.assessment.releasedAt, 
                        closedAt: data.assessment.closedAt 
                    } : null);
                    setAssessments(prev => prev.map(a => a.id === assessmentId ? { 
                        ...a, 
                        status: data.assessment.status, 
                        releasedAt: data.assessment.releasedAt, 
                        closedAt: data.assessment.closedAt 
                    } : a));
                }
            }
        } catch (e) {
            console.error("Failed to load session monitor data:", e);
        } finally {
            setLoadingSession(false);
        }
    };

    const handleStatusTransition = async (newStatus: "RELEASED" | "CLOSED" | "SCHEDULED") => {
        if (!selectedAssessment) return;
        try {
            setUpdatingStatus(true);
            const res = await fetchApi(`/teacher/assessment/${selectedAssessment.id}/status`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to update assessment status");
            }

            const updated = await res.json();
            setSelectedAssessment(prev => prev ? { 
                ...prev, 
                status: newStatus, 
                releasedAt: updated.releasedAt, 
                closedAt: updated.closedAt 
            } : null);
            setAssessments(prev => prev.map(a => a.id === selectedAssessment.id ? { 
                ...a, 
                status: newStatus, 
                releasedAt: updated.releasedAt, 
                closedAt: updated.closedAt 
            } : a));
            setStatusModal(null);

            setMsg({
                type: "success",
                text: newStatus === "RELEASED" 
                    ? `🚀 Exam "${selectedAssessment.title}" released to all students! Students can now start their timed session.`
                    : newStatus === "CLOSED"
                    ? `🏁 Exam session for "${selectedAssessment.title}" has been closed.`
                    : `🔒 Exam returned to scheduled / locked state.`
            });

            await loadSessionData(selectedAssessment.id);
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to update status" });
        } finally {
            setUpdatingStatus(false);
        }
    };

    // Auto-poll session monitor every 12 seconds when in conduct tab
    useEffect(() => {
        if (activeTab === "conduct" && selectedAssessment?.id) {
            loadSessionData(selectedAssessment.id);
            const timer = setInterval(() => {
                loadSessionData(selectedAssessment.id);
            }, 12000);
            return () => clearInterval(timer);
        }
    }, [activeTab, selectedAssessment?.id]);

    const handleCreateAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !newAssignmentId) {
            setMsg({ type: "error", text: "Please enter a valid title and select a class." });
            return;
        }

        try {
            setSaving(true);
            setMsg(null);
            const selectedClass = classes.find((c: any) => (c.assignment?.id || c.id) === newAssignmentId);
            const academicYearId = selectedClass?.assignment?.academicYearId || "active-year";
            const combinedScheduledAt = newScheduledDate ? `${newScheduledDate}T${newScheduledTime || "09:00"}:00` : undefined;

            const res = await fetchApi("/teacher/assessment/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId,
                    teachingAssignmentId: newAssignmentId,
                    title: newTitle.trim(),
                    description: newDescription.trim() || undefined,
                    type: newType,
                    status: "SCHEDULED",
                    durationMinutes: Number(newDurationMinutes),
                    scheduledDate: combinedScheduledAt,
                    maxScore: Number(newMaxScore),
                    passingScore: Number(newPassingScore),
                    dueDate: newDueDate
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || `Failed to create assessment (Status: ${res.status})`);
            }

            const created: AssessmentItem = await res.json();
            
            // Enrich with teaching assignment details if not populated
            if (!created.teachingAssignment && selectedClass) {
                created.teachingAssignment = selectedClass.assignment || selectedClass;
            }

            const updatedList = [created, ...assessments];
            setAssessments(updatedList);
            setShowCreateModal(false);
            setNewTitle("");
            setNewDescription("");
            selectAssessment(created, classes);

            setMsg({ 
                type: "success", 
                text: `${newType} "${created.title}" (${newDurationMinutes} mins) created successfully! 🔒 Status: Locked / Scheduled. Students cannot access it until you release it in "Conduct & Session Monitor".` 
            });
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to create assessment" });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteAssessment = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!confirm("Are you sure you want to delete this assessment and its recorded scores?")) return;

        try {
            setDeletingId(id);
            const res = await fetchApi(`/teacher/assessment/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to delete assessment");
            }

            const remaining = assessments.filter(a => a.id !== id);
            setAssessments(remaining);
            if (selectedAssessment?.id === id) {
                if (remaining.length > 0) {
                    selectAssessment(remaining[0], classes);
                } else {
                    setSelectedAssessment(null);
                    setStudents([]);
                }
            }
            setMsg({ type: "success", text: "Assessment deleted successfully." });
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to delete assessment." });
        } finally {
            setDeletingId(null);
        }
    };

    const handleSaveResults = async () => {
        if (!selectedAssessment) return;
        setSaving(true);
        setMsg(null);

        try {
            await Promise.all(
                Object.entries(resultsMap).map(async ([enrollmentId, res]) => {
                    const apiRes = await fetchApi("/teacher/assessment/result", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            assessmentId: selectedAssessment.id,
                            enrollmentId,
                            score: Number(res.score),
                            feedback: res.feedback
                        })
                    });
                    return apiRes.json();
                })
            );

            // Refresh assessment results locally
            const updated = {
                ...selectedAssessment,
                results: Object.entries(resultsMap).map(([enrollmentId, r]) => ({
                    id: enrollmentId,
                    enrollmentId,
                    score: Number(r.score),
                    feedback: r.feedback
                }))
            };
            setSelectedAssessment(updated);
            setAssessments(assessments.map(a => a.id === updated.id ? updated : a));

            setMsg({ 
                type: "success", 
                text: "All student marks, letter grades, and feedback saved successfully! The results are now live in the School Admin Assessment & Exam Reports." 
            });
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to save results" });
        } finally {
            setSaving(false);
        }
    };

    // Calculate Letter Grade helper (SRS Ethiopian Standard)
    const getLetterGrade = (score: number, maxScore: number) => {
        const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
        if (pct >= 85) return { grade: "A", label: "Excellent", color: "bg-emerald-100 text-emerald-800 border-emerald-300" };
        if (pct >= 75) return { grade: "B", label: "Very Good", color: "bg-sky-100 text-sky-800 border-sky-300" };
        if (pct >= 60) return { grade: "C", label: "Good", color: "bg-amber-100 text-amber-800 border-amber-300" };
        if (pct >= 50) return { grade: "D", label: "Satisfactory", color: "bg-orange-100 text-orange-800 border-orange-300" };
        return { grade: "F", label: "Needs Support", color: "bg-rose-100 text-rose-800 border-rose-300" };
    };

    // Helper: getTypeBadgeStyle
    const getTypeBadgeStyle = (type: string) => {
        switch (type.toUpperCase()) {
            case "QUIZ":
                return "bg-purple-100 text-purple-800 border-purple-200";
            case "TEST":
                return "bg-indigo-100 text-indigo-800 border-indigo-200";
            case "EXAM":
                return "bg-rose-100 text-rose-800 border-rose-200";
            case "ASSIGNMENT":
                return "bg-emerald-100 text-emerald-800 border-emerald-200";
            case "PROJECT":
                return "bg-amber-100 text-amber-800 border-amber-200";
            default:
                return "bg-slate-100 text-slate-800 border-slate-200";
        }
    };

    // Filter assessments by type and section
    const filteredAssessments = assessments.filter(a => {
        const matchType = selectedTypeFilter === "ALL" || a.type === selectedTypeFilter;
        const matchClass = selectedClassFilter === "ALL" || a.teachingAssignmentId === selectedClassFilter;
        return matchType && matchClass;
    });

    // Summary calculations
    const maxScore = selectedAssessment?.maxScore || 20;
    const scores = Object.values(resultsMap).map(r => Number(r.score || 0));
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const passingThreshold = selectedAssessment?.passingScore || (maxScore * 0.5);
    const passCount = scores.filter(s => s >= passingThreshold).length;
    const passPercent = scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;
    const gradedCount = selectedAssessment?.results?.length || 0;

    // Quick score filler
    const handleQuickFill = (pct: number) => {
        const fillScore = Math.round((maxScore * pct) / 100);
        const updated: Record<string, { score: number; feedback: string }> = {};
        students.forEach(st => {
            updated[st.id] = {
                score: fillScore,
                feedback: resultsMap[st.id]?.feedback || ""
            };
        });
        setResultsMap(updated);
    };

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-slate-500 min-h-[450px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-slate-700">Loading Assessment Command Center...</p>
                <p className="text-xs text-slate-400 mt-1">Retrieving assigned classes, quizzes, tests, and student rosters...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-slate-900 pb-20">
            

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Total Assessments</p>
                        <p className="text-xl font-black text-slate-900">{assessments.length}</p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Quizzes & Tests</p>
                        <p className="text-xl font-black text-slate-900">
                            {assessments.filter(a => a.type === "QUIZ" || a.type === "TEST").length}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <Award className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Assignments & Projects</p>
                        <p className="text-xl font-black text-slate-900">
                            {assessments.filter(a => a.type === "ASSIGNMENT" || a.type === "PROJECT").length}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3">
                    <div className="p-3 bg-blue-50 text-[#4085b3] rounded-xl">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Assigned Classes</p>
                        <p className="text-xl font-black text-slate-900">{classes.length}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 space-x-2 text-xs font-bold bg-white p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
                <button
                    onClick={() => setActiveTab("create")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                        activeTab === "create" ? "bg-[#0c2454] text-white shadow-xs font-black" : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>1. Assessments Catalog & Creator ({filteredAssessments.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("conduct")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                        activeTab === "conduct" ? "bg-[#0c2454] text-white shadow-xs font-black" : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                    <Play className="w-4 h-4 text-emerald-400" />
                    <span>2. Conduct & Session Monitor</span>
                </button>

                <button
                    onClick={() => setActiveTab("grade")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                        activeTab === "grade" ? "bg-[#0c2454] text-white shadow-xs font-black" : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                    <Award className="w-4 h-4 text-sky-400" />
                    <span>3. Grade Students & Record Results ({students.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("feedback")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                        activeTab === "feedback" ? "bg-[#0c2454] text-white shadow-xs font-black" : "text-slate-600 hover:bg-slate-100"
                    }`}
                >
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    <span>4. Provide Student Feedback</span>
                </button>
            </div>

            {/* Notification Alerts */}
            {msg && (
                <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
                    msg.type === "success" 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                        : "bg-rose-50 border-rose-200 text-rose-900"
                }`}>
                    <div className="flex items-center space-x-2.5">
                        {msg.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
                        <span>{msg.text}</span>
                    </div>
                    <button onClick={() => setMsg(null)} className="p-1 hover:opacity-70">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* TAB 1: CREATE & MANAGE ASSESSMENTS CATALOG */}
            {activeTab === "create" && (
                <div className="space-y-6">
                    
                    {/* Filter & Action Strip */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase mr-1 flex items-center">
                                <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" /> Type:
                            </span>
                            {["ALL", "QUIZ", "TEST", "EXAM", "ASSIGNMENT", "PROJECT"].map((typeKey) => (
                                <button
                                    key={typeKey}
                                    onClick={() => setSelectedTypeFilter(typeKey)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                        selectedTypeFilter === typeKey 
                                            ? "bg-[#0c2454] text-white shadow-xs" 
                                            : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                    }`}
                                >
                                    {typeKey === "ALL" ? "All Types" : typeKey}
                                    <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                                        {typeKey === "ALL" ? assessments.length : assessments.filter(a => a.type === typeKey).length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center space-x-3">
                            <select
                                value={selectedClassFilter}
                                onChange={(e) => setSelectedClassFilter(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-[#4085b3]"
                            >
                                <option value="ALL">All Assigned Classes ({classes.length})</option>
                                {classes.map((c, i) => {
                                    const a = c.assignment || c;
                                    return (
                                        <option key={a.id || i} value={a.id}>
                                            Grade {a.schoolGrade?.grade?.level}{a.section?.name} - {a.subject?.name}
                                        </option>
                                    );
                                })}
                            </select>

                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-3.5 py-2 bg-[#4085b3] hover:bg-[#326a8f] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create</span>
                            </button>
                        </div>
                    </div>

                    {/* Assessments Grid */}
                    {filteredAssessments.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                                <Inbox className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">No assessments found for this filter</h3>
                                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                    Create a new quiz, chapter test, homework assignment, or term project for your students.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-5 py-2.5 bg-[#4085b3] text-white text-xs font-bold rounded-xl hover:bg-[#326a8f] transition-all inline-flex items-center space-x-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create First Assessment</span>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredAssessments.map((ass) => {
                                const ta = ass.teachingAssignment;
                                const isSelected = selectedAssessment?.id === ass.id;
                                const totalResults = ass.results?.length || 0;
                                const targetClass = classes.find(c => (c.assignment?.id || c.id) === ass.teachingAssignmentId);
                                const totalEnrolled = targetClass?.students?.length || targetClass?.assignment?.section?.studentEnrollments?.length || 10;
                                const progressPct = totalEnrolled > 0 ? Math.min(100, Math.round((totalResults / totalEnrolled) * 100)) : 0;

                                return (
                                    <div
                                        key={ass.id}
                                        onClick={() => selectAssessment(ass)}
                                        className={`bg-white rounded-2xl border p-5 space-y-4 transition-all relative group cursor-pointer ${
                                            isSelected 
                                                ? "border-[#4085b3] ring-2 ring-[#4085b3]/20 shadow-md bg-blue-50/20" 
                                                : "border-slate-200 hover:border-slate-300 hover:shadow-md"
                                        }`}
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getTypeBadgeStyle(ass.type)}`}>
                                                    {ass.type}
                                                </span>
                                                {ass.status === "RELEASED" ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                                        <Lock className="w-2.5 h-2.5 text-amber-600" /> Locked
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5 text-slate-400" /> {ass.durationMinutes || 60}m
                                                </span>
                                            </div>

                                            <button
                                                onClick={(e) => handleDeleteAssessment(ass.id, e)}
                                                disabled={deletingId === ass.id}
                                                title="Delete Assessment"
                                                className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                                            >
                                                {deletingId === ass.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>

                                        {/* Title & Subject */}
                                        <div>
                                            <h4 className="font-black text-slate-900 text-sm leading-snug line-clamp-1">{ass.title}</h4>
                                            <p className="text-xs font-semibold text-[#4085b3] mt-0.5 flex items-center">
                                                <BookOpen className="w-3.5 h-3.5 mr-1" />
                                                Grade {ta?.schoolGrade?.grade?.level || "12"}{ta?.section?.name ? `-${ta.section.name}` : ""} • {ta?.subject?.name || "Mathematics"}
                                            </p>
                                        </div>

                                        {/* Description snippet */}
                                        {ass.description && (
                                            <p className="text-xs text-slate-500 line-clamp-2 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                "{ass.description}"
                                            </p>
                                        )}

                                        {/* Points & Threshold */}
                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold">
                                            <div>
                                                <span className="text-slate-400 text-[10px] uppercase block">Max Points</span>
                                                <span className="text-slate-900 font-black">{ass.maxScore} pts</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-slate-400 text-[10px] uppercase block">Passing Mark</span>
                                                <span className="text-emerald-700 font-black">{ass.passingScore || (ass.maxScore * 0.5)} pts</span>
                                            </div>
                                        </div>

                                        {/* Grading Completion Progress Bar */}
                                        <div className="space-y-1 pt-1">
                                            <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-slate-500">Grading Progress:</span>
                                                <span className={progressPct === 100 ? "text-emerald-600" : "text-amber-600"}>
                                                    {totalResults} / {totalEnrolled} Graded ({progressPct}%)
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-500 ${progressPct === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                                                    style={{ width: `${progressPct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Quick Action Button */}
                                        <div className="pt-2 flex items-center space-x-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    selectAssessment(ass);
                                                    setActiveTab("grade");
                                                }}
                                                className="flex-1 py-2 bg-[#0c2454] hover:bg-[#163878] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                                            >
                                                <Award className="w-3.5 h-3.5 text-amber-400" />
                                                <span>Grade Roster</span>
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    selectAssessment(ass);
                                                    setActiveTab("conduct");
                                                }}
                                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                                                title="View Details"
                                            >
                                                <Play className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: CONDUCT & SESSION MONITOR */}
            {activeTab === "conduct" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                            <div>
                                <CardTitle className="text-base font-black text-slate-900 flex items-center space-x-2">
                                    <Play className="w-5 h-5 text-emerald-600" />
                                    <span>2. Conduct & Session Monitor (የፈተና መቆጣጠሪያ እና ክትትል)</span>
                                </CardTitle>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Release scheduled exams to students simultaneously, track individual countdown timers in real time, and end sessions.
                                </p>
                            </div>

                            {/* Assessment Selector dropdown if multiple */}
                            {assessments.length > 1 && (
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold text-slate-600">Select Exam:</span>
                                    <select
                                        value={selectedAssessment?.id || ""}
                                        onChange={(e) => {
                                            const found = assessments.find(a => a.id === e.target.value);
                                            if (found) selectAssessment(found);
                                        }}
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    >
                                        {assessments.map(a => (
                                            <option key={a.id} value={a.id}>
                                                [{a.type}] {a.title} ({a.status === "RELEASED" ? "🟢 Live" : a.status === "CLOSED" ? "🏁 Closed" : "🔒 Locked"})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-6 pt-5">
                            {!selectedAssessment ? (
                                <div className="p-12 text-center text-slate-400 space-y-2">
                                    <Inbox className="w-10 h-10 mx-auto text-slate-300" />
                                    <p className="font-semibold text-slate-600">Please select an assessment to monitor its conduct lifecycle.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    
                                    {/* Main Hero Card for Selected Assessment */}
                                    <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-5">
                                        <div className="flex flex-wrap justify-between items-center gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${getTypeBadgeStyle(selectedAssessment.type)}`}>
                                                    {selectedAssessment.type} Evaluation
                                                </span>

                                                {/* 1. STATUS BADGES */}
                                                {selectedAssessment.status === "RELEASED" ? (
                                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-black text-xs flex items-center shadow-xs">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1.5" />
                                                        🟢 Active / Released (ለተማሪዎች ተለቋል፤ ተማሪዎች መጀመር ይችላሉ)
                                                    </span>
                                                ) : selectedAssessment.status === "CLOSED" ? (
                                                    <span className="px-3 py-1 bg-slate-200 text-slate-800 border border-slate-300 rounded-full font-bold text-xs flex items-center">
                                                        🏁 Closed / Completed (ፈተናው ተጠናቋል/ተዘግቷል)
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full font-bold text-xs flex items-center shadow-xs">
                                                        <Lock className="w-3.5 h-3.5 mr-1 text-amber-700" />
                                                        🔒 Locked / Scheduled (ገና ለተማሪዎች አልተለቀቀም)
                                                    </span>
                                                )}

                                                <span className="px-3 py-1 bg-white border border-slate-200 text-slate-700 rounded-full font-bold text-xs flex items-center">
                                                    <Clock className="w-3.5 h-3.5 mr-1 text-[#4085b3]" />
                                                    ቆይታ፦ {selectedAssessment.durationMinutes || 60} ደቂቃ
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => loadSessionData(selectedAssessment.id)}
                                                    disabled={loadingSession}
                                                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                                                    title="Refresh Live Student Roster"
                                                >
                                                    <RefreshCw className={`w-3.5 h-3.5 ${loadingSession ? "animate-spin text-[#4085b3]" : "text-slate-500"}`} />
                                                    <span>Refresh Roster</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900">{selectedAssessment.title}</h3>
                                            <p className="text-xs text-slate-600 mt-1 font-medium">
                                                Class: <strong className="text-slate-900">Grade {selectedAssessment.teachingAssignment?.schoolGrade?.grade?.level || "12"}{selectedAssessment.teachingAssignment?.section?.name ? `-${selectedAssessment.teachingAssignment.section.name}` : ""}</strong> • 
                                                Subject: <strong className="text-slate-900">{selectedAssessment.teachingAssignment?.subject?.name || "Mathematics"}</strong> • 
                                                Due/Date: <strong className="text-slate-900">{selectedAssessment.dueDate ? new Date(selectedAssessment.dueDate).toLocaleDateString() : "Today"}</strong>
                                            </p>
                                        </div>

                                        {selectedAssessment.description && (
                                            <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-700">
                                                <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">Instructions & Topics:</span>
                                                {selectedAssessment.description}
                                            </div>
                                        )}

                                        {/* 2. ACTION CONTROLS (የመልቀቂያ እና መዝጊያ ቁልፎች) */}
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                                    <Radio className="w-4 h-4 text-emerald-600" />
                                                    <span>Exam Control Center (የፈተና መቆጣጠሪያ)</span>
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    {selectedAssessment.status === "RELEASED" 
                                                        ? "ፈተናው አሁን ክፍት ነው፤ ተማሪዎች Login አድርገው 'Start Exam' ሲጫኑ የየራሳቸው የግል ሰዓት መቁጠር ይጀምራል።"
                                                        : selectedAssessment.status === "CLOSED"
                                                        ? "የፈተና ክፍለ ጊዜው ተዘግቷል። ተማሪዎች ተጨማሪ ፈተና መውሰድ አይችሉም።"
                                                        : "ፈተናው ተቆልፏል። ሁሉም ተማሪዎች Login አድርገው በተዘጋጁበት ሰዓት 'Release Exam' የሚለውን በመጫን በአንድ ጊዜ ልቀቁ።"}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {selectedAssessment.status !== "RELEASED" && (
                                                    <button
                                                        onClick={() => setStatusModal("RELEASE")}
                                                        disabled={updatingStatus}
                                                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center space-x-2 transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                                                    >
                                                        <Play className="w-4 h-4 fill-white" />
                                                        <span>🚀 Release Exam to Students (ፈተናውን ልቀቅ)</span>
                                                    </button>
                                                )}

                                                {selectedAssessment.status === "RELEASED" && (
                                                    <>
                                                        <button
                                                            onClick={() => setStatusModal("CLOSE")}
                                                            disabled={updatingStatus}
                                                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center space-x-2 transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
                                                        >
                                                            <Square className="w-4 h-4 fill-white" />
                                                            <span>⏹️ End / Close Exam Session (ፈተናውን ዝጋ)</span>
                                                        </button>

                                                        <button
                                                            onClick={() => handleStatusTransition("SCHEDULED")}
                                                            disabled={updatingStatus}
                                                            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                                                            title="Re-lock exam if released by mistake"
                                                        >
                                                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                                                            <span>Re-Lock (መልሰህ ቆልፍ)</span>
                                                        </button>
                                                    </>
                                                )}

                                                {selectedAssessment.status === "CLOSED" && (
                                                    <button
                                                        onClick={() => setStatusModal("RELEASE")}
                                                        disabled={updatingStatus}
                                                        className="px-4 py-2 bg-[#0c2454] hover:bg-[#163878] text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                                                    >
                                                        <RefreshCw className="w-3.5 h-3.5" />
                                                        <span>Re-Open Session (እንደገና ክፈት)</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. METRICS / STATS OVERVIEW */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                                            <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Enrolled</span>
                                                <span className="text-xl font-black text-slate-900">
                                                    {sessionStats?.totalEnrolled || students.length} Students
                                                </span>
                                            </div>

                                            <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                                                <span className="text-[10px] uppercase font-bold text-slate-400 block">⚪ Not Started</span>
                                                <span className="text-xl font-black text-slate-600">
                                                    {sessionStats ? sessionStats.notStarted : students.length}
                                                </span>
                                                <span className="text-[10px] text-slate-400 block mt-0.5">ሰዓቱ አልቆጠረም</span>
                                            </div>

                                            <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                                                <span className="text-[10px] uppercase font-bold text-amber-600 block">🟡 In Progress</span>
                                                <span className="text-xl font-black text-amber-600">
                                                    {sessionStats?.inProgress || 0}
                                                </span>
                                                <span className="text-[10px] text-amber-500 block mt-0.5">እየሰሩ ያሉ (Timer Active)</span>
                                            </div>

                                            <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                                                <span className="text-[10px] uppercase font-bold text-emerald-600 block">🟢 Submitted</span>
                                                <span className="text-xl font-black text-emerald-700">
                                                    {sessionStats?.submitted || (selectedAssessment.results?.length || 0)}
                                                </span>
                                                <span className="text-[10px] text-emerald-600 block mt-0.5">ጨርሰው ያስረከቡ</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. LIVE STUDENT SESSION MONITOR TABLE */}
                                    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                                        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-[#4085b3]" />
                                                    <span>Live Student Session Monitor (የተማሪዎች የቀጥታ መከታተያ ሠንጠረዥ)</span>
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    Tracks individual student status and remaining exam timer in real time.
                                                </p>
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => setActiveTab("grade")}
                                                    className="px-4 py-2 bg-[#0c2454] hover:bg-[#163878] text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                                                >
                                                    <Award className="w-3.5 h-3.5 text-amber-400" />
                                                    <span>Open Full Gradebook</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                                                        <th className="p-3 w-12 text-center">#</th>
                                                        <th className="p-3">Student / የተማሪው ስም</th>
                                                        <th className="p-3">Student ID</th>
                                                        <th className="p-3 text-center">Exam Session Status / ሁኔታ</th>
                                                        <th className="p-3 text-center">Started At / መጀመሪያ</th>
                                                        <th className="p-3 text-center">Score / ውጤት</th>
                                                        <th className="p-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {loadingSession && sessionRoster.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="p-10 text-center text-slate-400">
                                                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#4085b3] mb-2" />
                                                                <span>Loading live student session roster...</span>
                                                            </td>
                                                        </tr>
                                                    ) : sessionRoster.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="p-10 text-center text-slate-400">
                                                                <Inbox className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                                                <p className="font-semibold text-slate-600">No active students enrolled in this section.</p>
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        sessionRoster.map((st, idx) => {
                                                            return (
                                                                <tr key={st.enrollmentId || idx} className="hover:bg-slate-50/80 transition-colors">
                                                                    <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                                                    <td className="p-3">
                                                                        <div className="flex items-center space-x-2.5">
                                                                            <div className="w-8 h-8 rounded-full bg-slate-200 text-[#0c2454] font-black text-xs flex items-center justify-center border border-slate-300">
                                                                                {st.name?.charAt(0) || "S"}
                                                                            </div>
                                                                            <div>
                                                                                <p className="font-bold text-slate-900 leading-snug">{st.name}</p>
                                                                                <p className="text-[10px] text-slate-400 font-medium">{st.gender || "Student"}</p>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 font-mono font-bold text-slate-600 text-xs">
                                                                        {st.studentId || "--"}
                                                                    </td>

                                                                    {/* Session Status Column */}
                                                                    <td className="p-3 text-center">
                                                                        {st.sessionStatus === "SUBMITTED" ? (
                                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                                                🟢 Submitted (አስረክቧል)
                                                                            </span>
                                                                        ) : st.sessionStatus === "IN_PROGRESS" ? (
                                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                                                                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping mr-1.5" />
                                                                                🟡 In Progress ({st.remainingMinutes} ደቂቃ ቀርቶታል)
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                                                ⚪ Not Started (ገና አልጀመረም)
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    {/* Started At Timestamp */}
                                                                    <td className="p-3 text-center text-slate-500 text-[11px] font-medium">
                                                                        {st.startedAt ? new Date(st.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--"}
                                                                    </td>

                                                                    {/* Score */}
                                                                    <td className="p-3 text-center font-black text-slate-900">
                                                                        {st.score !== null && st.score !== undefined ? (
                                                                            <span className="text-emerald-700 font-bold">{st.score} / {selectedAssessment.maxScore}</span>
                                                                        ) : (
                                                                            <span className="text-slate-300 font-normal">--</span>
                                                                        )}
                                                                    </td>

                                                                    {/* Action */}
                                                                    <td className="p-3 text-right">
                                                                        <button
                                                                            onClick={() => {
                                                                                setActiveTab("grade");
                                                                            }}
                                                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors"
                                                                        >
                                                                            Grade
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* CONFIRMATION POPUP MODAL (Release / Close) */}
                    {statusModal && selectedAssessment && (
                        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-3 rounded-2xl ${statusModal === "RELEASE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                        {statusModal === "RELEASE" ? <Play className="w-6 h-6 fill-current" /> : <Square className="w-6 h-6 fill-current" />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">
                                            {statusModal === "RELEASE" 
                                                ? "ፈተናውን ለተማሪዎች መልቀቅ ይፈልጋሉ?" 
                                                : "የፈተና ክፍለ ጊዜውን መዝጋት ይፈልጋሉ?"}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {selectedAssessment.title} ({selectedAssessment.durationMinutes || 60} ደቂቃ)
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                                    {statusModal === "RELEASE" ? (
                                        <p>
                                            እርግጠኛ ነዎት ፈተናውን አሁን መልቀቅ ይፈልጋሉ? <strong>ፈተናው ለክፍሉ ተማሪዎች በሙሉ በአንድ ጊዜ ክፍት ይሆናል</strong>። እያንዳንዱ ተማሪ <strong>"Start Exam"</strong> ሲጫን ብቻ የየራሱ <strong>{selectedAssessment.durationMinutes || 60} ደቂቃ</strong> የግል ሰዓት መቁጠር ይጀምራል።
                                        </p>
                                    ) : (
                                        <p>
                                            እርግጠኛ ነዎት ፈተናውን አሁን መዝጋት ይፈልጋሉ? <strong>ከዚህ በኋላ ማናቸውም ተማሪዎች አዲስ ፈተና መጀመር አይችሉም</strong>። ያልጨረሱ ተማሪዎች ውጤት በወቅቱ በሰሩት መጠን ተጠናቆ ይቀመጣል።
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-end space-x-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStatusModal(null)}
                                        disabled={updatingStatus}
                                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                                    >
                                        ይቅር (Cancel)
                                    </button>

                                    {statusModal === "RELEASE" ? (
                                        <button
                                            type="button"
                                            onClick={() => handleStatusTransition("RELEASED")}
                                            disabled={updatingStatus}
                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                                        >
                                            {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                                            <span>አዎ፣ ፈተናውን ልቀቅ (Release Now)</span>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleStatusTransition("CLOSED")}
                                            disabled={updatingStatus}
                                            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                                        >
                                            {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-white" />}
                                            <span>አዎ፣ ፈተናውን ዝጋ (End Session)</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: RECORD RESULTS & GRADE STUDENTS */}
            {activeTab === "grade" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                            <div>
                                <CardTitle className="text-base font-black text-slate-900 flex items-center space-x-2">
                                    <Award className="w-5 h-5 text-amber-500" />
                                    <span>Gradebook: {selectedAssessment?.title || "No Assessment Selected"}</span>
                                </CardTitle>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Enter marks for enrolled students in Section {selectedAssessment?.teachingAssignment?.section?.name || "12-A"}. Maximum score is <strong className="text-slate-800">{maxScore} points</strong>.
                                </p>
                            </div>

                            <div className="flex items-center space-x-2">
                                {selectedAssessment && (
                                    <>
                                        <button
                                            onClick={() => handleQuickFill(100)}
                                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors"
                                            title="Fill all students with 100%"
                                        >
                                            Fill 100%
                                        </button>
                                        <button
                                            onClick={() => handleQuickFill(80)}
                                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] transition-colors"
                                            title="Fill all students with 80%"
                                        >
                                            Fill 80%
                                        </button>
                                        <button
                                            onClick={handleSaveResults}
                                            disabled={saving}
                                            className="px-4 py-2 bg-[#0c2454] hover:bg-[#163878] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                                        >
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                                            <span>Save Scores</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="pt-4">
                            {students.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 space-y-2">
                                    <Inbox className="w-10 h-10 mx-auto text-slate-300" />
                                    <p className="text-sm font-semibold text-slate-600">No students found in this class section.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                                                <th className="py-3 px-4">#</th>
                                                <th className="py-3 px-4">Student Name</th>
                                                <th className="py-3 px-4">Student ID</th>
                                                <th className="py-3 px-4">Score (Out of {maxScore})</th>
                                                <th className="py-3 px-4">Letter Grade</th>
                                                <th className="py-3 px-4">Percentage</th>
                                                <th className="py-3 px-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {students.map((st: any, idx: number) => {
                                                const s = st.student || st;
                                                const resData = resultsMap[st.id] || { score: 0, feedback: "" };
                                                const letterInfo = getLetterGrade(Number(resData.score), maxScore);
                                                const pct = maxScore > 0 ? Math.round((Number(resData.score) / maxScore) * 100) : 0;
                                                const isPassing = Number(resData.score) >= passingThreshold;

                                                return (
                                                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                                                        <td className="py-3.5 px-4 font-bold text-slate-900">
                                                            {s.firstName} {s.lastName || s.fatherName} {s.grandfatherName || ''}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{s.studentId || "N/A"}</td>
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center space-x-1.5">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={maxScore}
                                                                    value={resData.score}
                                                                    onChange={(e) => {
                                                                        const val = Math.max(0, Math.min(maxScore, Number(e.target.value)));
                                                                        setResultsMap({
                                                                            ...resultsMap,
                                                                            [st.id]: { ...resData, score: val }
                                                                        });
                                                                    }}
                                                                    className="w-20 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#4085b3]"
                                                                />
                                                                <span className="text-slate-400 text-[11px] font-bold">/ {maxScore}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className={`px-2.5 py-1 rounded-md font-black text-xs border ${letterInfo.color}`}>
                                                                {letterInfo.grade}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 font-black text-slate-800">
                                                            {pct}%
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            {isPassing ? (
                                                                <span className="text-emerald-700 font-bold flex items-center text-[11px]">
                                                                    <Check className="w-3.5 h-3.5 mr-1" /> Passed
                                                                </span>
                                                            ) : (
                                                                <span className="text-rose-600 font-bold flex items-center text-[11px]">
                                                                    <X className="w-3.5 h-3.5 mr-1" /> Below Passing
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 4: PROVIDE STUDENT FEEDBACK */}
            {activeTab === "feedback" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                            <div>
                                <CardTitle className="text-base font-black text-slate-900 flex items-center space-x-2">
                                    <MessageSquare className="w-5 h-5 text-amber-500" />
                                    <span>Provide Qualitative Feedback ({selectedAssessment?.title || "No Assessment Selected"})</span>
                                </CardTitle>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Write constructive feedback and learning encouragement for each student. This will be visible on student progress reports.
                                </p>
                            </div>

                            {selectedAssessment && (
                                <button
                                    onClick={handleSaveResults}
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#0c2454] hover:bg-[#163878] text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                                    <span>Save Feedback</span>
                                </button>
                            )}
                        </CardHeader>

                        <CardContent className="pt-4">
                            {students.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No students selected for feedback.</p>
                            ) : (
                                <div className="space-y-4">
                                    {students.map((st: any, idx: number) => {
                                        const s = st.student || st;
                                        const resData = resultsMap[st.id] || { score: 0, feedback: "" };
                                        const letterInfo = getLetterGrade(Number(resData.score), maxScore);

                                        return (
                                            <div key={st.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 hover:border-slate-300 transition-colors">
                                                <div className="flex flex-wrap justify-between items-center gap-2">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                                                            {idx + 1}
                                                        </span>
                                                        <h4 className="font-bold text-slate-900 text-sm">
                                                            {s.firstName} {s.lastName || s.fatherName} {s.grandfatherName || ''}
                                                        </h4>
                                                        <span className="text-slate-400 text-xs">({s.studentId})</span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <span className="font-bold text-slate-700 text-xs">Score: {resData.score} / {maxScore}</span>
                                                        <span className={`px-2 py-0.5 rounded text-[11px] font-black border ${letterInfo.color}`}>
                                                            {letterInfo.grade}
                                                        </span>
                                                    </div>
                                                </div>

                                                <textarea
                                                    rows={2}
                                                    placeholder={`Feedback for ${s.firstName} (e.g. Excellent conceptual understanding of chapter topics, keep practicing multi-step problem solving)...`}
                                                    value={resData.feedback}
                                                    onChange={(e) => setResultsMap({
                                                        ...resultsMap,
                                                        [st.id]: { ...resData, feedback: e.target.value }
                                                    })}
                                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] text-slate-800"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* CREATE ASSESSMENT MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
                        
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <div className="flex items-center space-x-2.5">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-base">Create New Assessment</h3>
                                    <p className="text-[11px] text-slate-500">Define parameters, instructions, and target student roster</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowCreateModal(false)} 
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAssessment} className="space-y-4 text-xs">
                            
                            {/* 1. Assessment Type Selector (Dropdown) */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">1. Select Assessment Type</label>
                                <select
                                    value={newType}
                                    onChange={(e) => handleTypeSelect(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#4085b3]"
                                >
                                    <option value="QUIZ">⚡ Quiz — Short Evaluation (Default: 10 pts)</option>
                                    <option value="TEST">📝 Test — Chapter / Unit Test (Default: 40 pts)</option>
                                    <option value="EXAM">🎓 Exam — Midterm / Final Examination (Default: 100 pts)</option>
                                    <option value="ASSIGNMENT">📋 Assignment — Homework / Problem Set (Default: 20 pts)</option>
                                    <option value="PROJECT">🔬 Project — Practical / Term Project (Default: 50 pts)</option>
                                </select>
                            </div>

                            {/* 2. Target Class & Subject */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">2. Target Class & Assigned Subject</label>
                                <select
                                    value={newAssignmentId}
                                    onChange={(e) => setNewAssignmentId(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#4085b3]"
                                >
                                    {classes.map((c, i) => {
                                        const a = c.assignment || c;
                                        const studentCount = c.students?.length || a.section?.studentEnrollments?.length || 10;
                                        return (
                                            <option key={a.id || i} value={a.id}>
                                                Grade {a.schoolGrade?.grade?.level}{a.section?.name ? `-${a.section.name}` : ""} • {a.subject?.name} ({studentCount} Students)
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* 3. Title */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">3. Assessment Title</label>
                                <input
                                    type="text"
                                    placeholder={
                                        newType === "QUIZ" ? "e.g. Pop Quiz 1: Limits & Continuity" :
                                        newType === "TEST" ? "e.g. Unit 2 Trigonometry Test" :
                                        newType === "ASSIGNMENT" ? "e.g. Calculus Practice Problem Set" :
                                        newType === "PROJECT" ? "e.g. Term Project: Applied Physics Model" :
                                        "e.g. Midterm Examination Semester 1"
                                    }
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] font-medium"
                                />
                            </div>

                            {/* 4. Score Presets & Inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="font-bold text-slate-700">Max Points</label>
                                        <div className="flex space-x-1">
                                            {[10, 20, 40, 100].map(pt => (
                                                <button
                                                    key={pt}
                                                    type="button"
                                                    onClick={() => {
                                                        setNewMaxScore(pt);
                                                        setNewPassingScore(Math.round(pt * 0.5));
                                                    }}
                                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[9px] font-bold text-slate-600"
                                                >
                                                    {pt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        max="500"
                                        value={newMaxScore}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            setNewMaxScore(v);
                                            setNewPassingScore(Math.round(v * 0.5));
                                        }}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">Passing Mark</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={newMaxScore}
                                        value={newPassingScore}
                                        onChange={(e) => setNewPassingScore(Number(e.target.value))}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>
                            </div>

                            {/* 5. Exam Duration & Student Timer */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="font-bold text-slate-800 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-[#4085b3]" />
                                        <span>5. Exam Duration / የፈተና ቆይታ (ደቂቃ)</span>
                                    </label>
                                    <div className="flex space-x-1">
                                        {[15, 30, 45, 60, 90, 120].map(mins => (
                                            <button
                                                key={mins}
                                                type="button"
                                                onClick={() => setNewDurationMinutes(mins)}
                                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                                    newDurationMinutes === mins
                                                        ? "bg-[#0c2454] text-white"
                                                        : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
                                                }`}
                                            >
                                                {mins}m
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="5"
                                        max="360"
                                        value={newDurationMinutes}
                                        onChange={(e) => setNewDurationMinutes(Math.max(1, Number(e.target.value)))}
                                        required
                                        className="w-28 bg-white border border-slate-200 rounded-xl p-2 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                    <span className="text-[11px] text-slate-500 font-medium">
                                        ደቂቃ (እያንዳንዱ ተማሪ "Start Exam" ሲል የራሱ የግል ቆጣሪ የሚቆጥረው ሰዓት)
                                    </span>
                                </div>
                            </div>

                            {/* 6. Scheduled Exam Date & Start Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        <span>6. Scheduled Exam Date</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={newScheduledDate}
                                        onChange={(e) => {
                                            setNewScheduledDate(e.target.value);
                                            setNewDueDate(e.target.value);
                                        }}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Exam Start Time / መጀመሪያ ሰዓት</span>
                                    </label>
                                    <input
                                        type="time"
                                        value={newScheduledTime}
                                        onChange={(e) => setNewScheduledTime(e.target.value)}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] font-bold"
                                    />
                                </div>
                            </div>

                            {/* 7. Instructions / Description */}
                            <div>
                                <label className="block font-bold text-slate-700 mb-1">7. Instructions & Topics Covered (Optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Enter guidelines, covered curriculum chapters, or instructions..."
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            {/* Default Status Banner (Locked / Scheduled) */}
                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-2.5">
                                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <div className="text-[11px] text-amber-900 leading-relaxed">
                                    <p className="font-black text-amber-950 flex items-center gap-1">
                                        <span>🔒 የመነሻ ሁኔታ፦ ተቆልፎ ይቆያል (Default: Locked / Scheduled)</span>
                                    </p>
                                    <p className="text-amber-800 mt-0.5">
                                        ይህ ፈተና ሲፈጠር ለተማሪዎች ወዲያውኑ አይታይም። የፈተናው ቀን እና ሰዓት ሲደርስ አስተማሪው <strong>"Conduct & Session Monitor"</strong> ክፍል ውስጥ <strong>"Release Exam"</strong> ሲጫን ብቻ ይለቀቃል።
                                    </p>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2.5 bg-[#0c2454] hover:bg-[#163878] text-white font-bold rounded-xl flex items-center space-x-1.5 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-amber-400" />}
                                    <span>Create {newType}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function TeacherAssessmentPage() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-slate-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-slate-600 font-sans">Loading assessment workspace...</p>
            </div>
        }>
            <AssessmentContent />
        </Suspense>
    );
}
