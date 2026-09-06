"use client";

import { useEffect, useState, Suspense } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { 
    GraduationCap, 
    ArrowLeft, 
    Plus, 
    Save, 
    CheckCircle2, 
    ClipboardList, 
    Award, 
    FileText, 
    Calendar, 
    BarChart2, 
    MessageSquare, 
    Check, 
    X, 
    Play, 
    Loader2,
    Inbox,
    Filter
} from "lucide-react";

function AssessmentContent() {
    const searchParams = useSearchParams();
    const typeParam = searchParams.get("type");
    const tabParam = searchParams.get("tab");

    const [activeTab, setActiveTab] = useState<"conduct" | "grade" | "feedback">(
        (tabParam as any) || "conduct"
    );

    const [assessments, setAssessments] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [resultsMap, setResultsMap] = useState<Record<string, { score: number; feedback: string }>>({});
    
    // Creation Modal & Type Filters
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState<string>(typeParam && typeParam !== "ALL" ? typeParam : "QUIZ");
    const [newMaxScore, setNewMaxScore] = useState<number>(100);
    const [newAssignmentId, setNewAssignmentId] = useState<string>("");
    const [newDueDate, setNewDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>(typeParam || "ALL");

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (typeParam && typeParam !== "ALL") {
            setNewType(typeParam);
            setShowCreateModal(true);
        }
        if (tabParam && ["conduct", "grade", "feedback"].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [typeParam, tabParam]);

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            setLoading(true);
            const [assRes, classRes] = await Promise.all([
                fetchApi("/assessment"),
                fetchApi("/teacher/my-classes")
            ]);

            const assData = assRes.ok ? await assRes.json() : [];
            const classData = classRes.ok ? await classRes.json() : [];

            const assList = Array.isArray(assData) ? assData : [];
            const classList = Array.isArray(classData) ? classData : [];

            setAssessments(assList);
            setClasses(classList);

            if (classList.length > 0) {
                setNewAssignmentId(classList[0].assignment?.id || classList[0].id || "");
            }
            if (assList.length > 0) {
                selectAssessment(assList[0], classList);
            }
        } catch (err) {
            console.error("Failed to load assessments:", err);
        } finally {
            setLoading(false);
        }
    }

    const selectAssessment = (ass: any, classList: any[] = classes) => {
        setSelectedAssessment(ass);
        const matchedClass = classList.find((c: any) => (c.assignment?.id || c.id) === ass.teachingAssignmentId);
        const stList = matchedClass?.students || matchedClass?.assignment?.section?.studentEnrollments || [];
        setStudents(stList);

        const map: Record<string, { score: number; feedback: string }> = {};
        stList.forEach((st: any) => {
            const existingResult = ass.results?.find((r: any) => r.enrollmentId === st.id);
            map[st.id] = {
                score: existingResult?.score || 0,
                feedback: existingResult?.feedback || ""
            };
        });
        setResultsMap(map);
    };

    const handleCreateAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !newAssignmentId) return;

        try {
            setSaving(true);
            const selectedClass = classes.find((c: any) => (c.assignment?.id || c.id) === newAssignmentId);
            const academicYearId = selectedClass?.assignment?.academicYearId || "active-year";

            const res = await fetchApi("/assessment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId,
                    teachingAssignmentId: newAssignmentId,
                    title: newTitle,
                    type: newType,
                    maxScore: Number(newMaxScore),
                    dueDate: newDueDate
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to create assessment");
            }

            const created = await res.json();
            setAssessments([created, ...assessments]);
            setShowCreateModal(false);
            setNewTitle("");
            selectAssessment(created, classes);
            setMsg({ type: "success", text: `${newType} "${created.title}" created successfully!` });
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to create assessment" });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveResults = async () => {
        if (!selectedAssessment) return;
        setSaving(true);
        setMsg(null);

        try {
            await Promise.all(
                Object.entries(resultsMap).map(async ([enrollmentId, res]) => {
                    const apiRes = await fetchApi("/assessment/result", {
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
            setMsg({ type: "success", text: "Assessment scores, grades, and student feedback saved successfully!" });
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to save results" });
        } finally {
            setSaving(false);
        }
    };

    // Calculate Letter Grade helper
    const getLetterGrade = (score: number, maxScore: number) => {
        const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
        if (pct >= 90) return { grade: "A", color: "bg-emerald-100 text-emerald-800" };
        if (pct >= 80) return { grade: "B", color: "bg-blue-100 text-blue-800" };
        if (pct >= 70) return { grade: "C", color: "bg-amber-100 text-amber-800" };
        if (pct >= 60) return { grade: "D", color: "bg-orange-100 text-orange-800" };
        return { grade: "F", color: "bg-rose-100 text-rose-800" };
    };

    // Filter assessments by selected type
    const filteredAssessments = assessments.filter(a => 
        selectedTypeFilter === "ALL" || a.type === selectedTypeFilter
    );

    // Summary calculations for selected assessment
    const maxScore = selectedAssessment?.maxScore || 100;
    const scores = Object.values(resultsMap).map(r => Number(r.score || 0));
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const passCount = scores.filter(s => (s / maxScore) >= 0.6).length;
    const passPercent = scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600 font-sans">Loading assessment management workspace...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-900 pb-16">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Assessments & Grade Command Center</h1>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Create quizzes, tests, exams, assignments, projects; conduct evaluations, grade students, and provide feedback.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2.5 bg-[#4085b3] hover:bg-[#356e94] text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-2xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create New Assessment</span>
                    </button>

                    {selectedAssessment && (
                        <button
                            onClick={handleSaveResults}
                            disabled={saving}
                            className="px-4 py-2.5 bg-[#4a6b82] hover:bg-[#3d596d] text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-2xs disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>Save Scores & Feedback</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs for Domain 6 */}
            <div className="flex border-b border-gray-200 space-x-3 text-xs font-bold bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs overflow-x-auto">
                <button
                    onClick={() => setActiveTab("conduct")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "conduct" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <Play className="w-4 h-4" />
                    <span>1. Conduct & Schedule Assessments ({filteredAssessments.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("grade")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "grade" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <Award className="w-4 h-4" />
                    <span>2. Record Results & Grade Students ({students.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("feedback")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "feedback" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>3. Provide Student Feedback</span>
                </button>
            </div>

            {msg && (
                <div className={`p-4 rounded-xl border text-sm font-medium flex items-center space-x-2 ${
                    msg.type === "success" 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-red-50 border-red-200 text-red-800"
                }`}>
                    {msg.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <X className="w-5 h-5 text-red-600" />}
                    <span>{msg.text}</span>
                </div>
            )}

            {/* MAIN TWO-COLUMN WORKSPACE */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left Column: Assessment Selector & Type Filters */}
                <div className="space-y-4 lg:col-span-1">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Filter By Type</span>
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1.5 text-xs">
                            {["ALL", "QUIZ", "TEST", "EXAM", "ASSIGNMENT", "PROJECT"].map((typeKey) => (
                                <button
                                    key={typeKey}
                                    onClick={() => setSelectedTypeFilter(typeKey)}
                                    className={`w-full text-left px-3 py-2 rounded-lg font-bold transition-colors flex items-center justify-between ${
                                        selectedTypeFilter === typeKey ? "bg-blue-50 text-[#4085b3]" : "text-gray-600 hover:bg-gray-50"
                                    }`}
                                >
                                    <span>{typeKey === "ALL" ? "All Types" : typeKey}</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 font-semibold">
                                        {typeKey === "ALL" ? assessments.length : assessments.filter(a => a.type === typeKey).length}
                                    </span>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Select Assessment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                            {filteredAssessments.length === 0 ? (
                                <p className="text-xs text-gray-400 p-3 italic">No assessments created for this type.</p>
                            ) : (
                                filteredAssessments.map((ass: any) => (
                                    <button
                                        key={ass.id}
                                        onClick={() => selectAssessment(ass)}
                                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                                            selectedAssessment?.id === ass.id
                                                ? "bg-blue-50 border-[#4085b3] font-bold text-gray-900 shadow-2xs"
                                                : "bg-white border-gray-100 hover:bg-gray-50 text-gray-700"
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="px-2 py-0.5 bg-blue-100 text-[#4085b3] rounded font-bold text-[9px] uppercase">
                                                {ass.type}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono font-bold">Max: {ass.maxScore} pts</span>
                                        </div>
                                        <h4 className="font-extrabold text-gray-900 text-xs truncate">{ass.title}</h4>
                                    </button>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Active Tab Content Workspace */}
                <div className="space-y-6 lg:col-span-3">
                    
                    {/* Selected Assessment KPI Summary Bar */}
                    {selectedAssessment && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 bg-[#4085b3] text-white rounded-xl shadow-2xs">
                                <p className="text-[10px] uppercase font-bold text-blue-100">Class Average</p>
                                <p className="text-xl font-black">{avgScore} / {maxScore}</p>
                            </div>
                            <div className="p-3 bg-slate-800 text-white rounded-xl shadow-2xs">
                                <p className="text-[10px] uppercase font-bold text-slate-300">Highest Score</p>
                                <p className="text-xl font-black">{highestScore} / {maxScore}</p>
                            </div>
                            <div className="p-3 bg-emerald-700 text-white rounded-xl shadow-2xs">
                                <p className="text-[10px] uppercase font-bold text-emerald-100">Pass Rate</p>
                                <p className="text-xl font-black">{passPercent}% Passed</p>
                            </div>
                            <div className="p-3 bg-gray-900 text-white rounded-xl shadow-2xs">
                                <p className="text-[10px] uppercase font-bold text-gray-300">Total Enrolled</p>
                                <p className="text-xl font-black">{students.length} Students</p>
                            </div>
                        </div>
                    )}

                    {/* TAB 1: CONDUCT & SCHEDULE ASSESSMENTS */}
                    {activeTab === "conduct" && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                                    <Play className="w-5 h-5 text-[#4085b3]" />
                                    <span>Conduct Assessment Lifecycle & Details</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs">
                                {!selectedAssessment ? (
                                    <p className="text-gray-400 italic">Select an assessment from the left panel to manage its lifecycle.</p>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="px-2.5 py-1 bg-blue-100 text-[#4085b3] font-bold rounded text-xs uppercase">
                                                    {selectedAssessment.type} Evaluation
                                                </span>
                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs flex items-center space-x-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active Session
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900">{selectedAssessment.title}</h3>
                                            <p className="text-gray-600">
                                                Maximum Points: <strong>{selectedAssessment.maxScore}</strong> • Target Academic Year: <strong>{selectedAssessment.academicYearId || "Active Term"}</strong>
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                onClick={() => setActiveTab("grade")}
                                                className="px-4 py-2 bg-[#4085b3] text-white font-bold rounded-xl hover:bg-[#356e94] transition-colors flex items-center space-x-1.5 shadow-2xs"
                                            >
                                                <Award className="w-4 h-4" />
                                                <span>Enter Student Marks & Grades</span>
                                            </button>
                                            <button
                                                onClick={() => setActiveTab("feedback")}
                                                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors flex items-center space-x-1.5 shadow-2xs"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                <span>Provide Written Feedback</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* TAB 2: RECORD RESULTS & GRADE STUDENTS */}
                    {activeTab === "grade" && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                                    <Award className="w-5 h-5 text-[#4085b3]" />
                                    <span>Grade Student Rosters ({selectedAssessment?.title || "No Assessment Selected"})</span>
                                </CardTitle>
                                {selectedAssessment && (
                                    <button
                                        onClick={handleSaveResults}
                                        disabled={saving}
                                        className="px-4 py-2 bg-[#4085b3] text-white font-bold rounded-xl text-xs hover:bg-[#356e94] transition-colors shadow-2xs flex items-center space-x-1 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span>Save Grades</span>
                                    </button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {students.length === 0 ? (
                                    <div className="py-12 text-center text-gray-400 space-y-2">
                                        <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                                        <p className="text-sm font-semibold text-gray-600">No students enrolled in this assessment section</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase">
                                                    <th className="py-3 px-4">Student Name</th>
                                                    <th className="py-3 px-4">Student ID</th>
                                                    <th className="py-3 px-4">Score (Out of {maxScore})</th>
                                                    <th className="py-3 px-4">Letter Grade</th>
                                                    <th className="py-3 px-4">Percentage</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {students.map((st: any) => {
                                                    const s = st.student || st;
                                                    const resData = resultsMap[st.id] || { score: 0, feedback: "" };
                                                    const letterInfo = getLetterGrade(Number(resData.score), maxScore);
                                                    const pct = maxScore > 0 ? Math.round((Number(resData.score) / maxScore) * 100) : 0;
                                                    return (
                                                        <tr key={st.id} className="hover:bg-gray-50/80">
                                                            <td className="py-3.5 px-4 font-bold text-gray-900">
                                                                {s.firstName} {s.lastName} {s.fatherName || ''}
                                                            </td>
                                                            <td className="py-3.5 px-4 font-mono font-medium text-gray-600">{s.studentId || "N/A"}</td>
                                                            <td className="py-3.5 px-4">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max={maxScore}
                                                                    value={resData.score}
                                                                    onChange={(e) => setResultsMap({
                                                                        ...resultsMap,
                                                                        [st.id]: { ...resData, score: Number(e.target.value) }
                                                                    })}
                                                                    className="w-24 bg-white border border-gray-200 rounded-lg px-3 py-1.5 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#4085b3]"
                                                                />
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <span className={`px-2.5 py-1 rounded-md font-black text-xs ${letterInfo.color}`}>
                                                                    {letterInfo.grade}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4 font-extrabold text-[#4085b3]">
                                                                {pct}%
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
                    )}

                    {/* TAB 3: PROVIDE STUDENT FEEDBACK */}
                    {activeTab === "feedback" && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                                    <MessageSquare className="w-5 h-5 text-[#4085b3]" />
                                    <span>Provide Student Assessment Feedback & Written Remarks</span>
                                </CardTitle>
                                {selectedAssessment && (
                                    <button
                                        onClick={handleSaveResults}
                                        disabled={saving}
                                        className="px-4 py-2 bg-[#4085b3] text-white font-bold rounded-xl text-xs hover:bg-[#356e94] transition-colors shadow-2xs flex items-center space-x-1 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span>Save Feedback</span>
                                    </button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {students.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic">No students selected for feedback.</p>
                                ) : (
                                    <div className="space-y-4 text-xs">
                                        {students.map((st: any) => {
                                            const s = st.student || st;
                                            const resData = resultsMap[st.id] || { score: 0, feedback: "" };
                                            return (
                                                <div key={st.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-extrabold text-gray-900 text-sm">
                                                            {s.firstName} {s.lastName} {s.fatherName || ''}
                                                        </h4>
                                                        <span className="font-bold text-[#4085b3]">Score: {resData.score} / {maxScore}</span>
                                                    </div>
                                                    <textarea
                                                        rows={2}
                                                        placeholder="Enter personalized feedback, strengths, and areas for improvement..."
                                                        value={resData.feedback}
                                                        onChange={(e) => setResultsMap({
                                                            ...resultsMap,
                                                            [st.id]: { ...resData, feedback: e.target.value }
                                                        })}
                                                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                </div>
            </div>

            {/* CREATE ASSESSMENT MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-extrabold text-gray-900 text-base flex items-center space-x-2">
                                <GraduationCap className="w-5 h-5 text-[#4085b3]" />
                                <span>Create New Assessment</span>
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAssessment} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Assessment Type</label>
                                <select
                                    value={newType}
                                    onChange={(e) => setNewType(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#4085b3]"
                                >
                                    <option value="QUIZ">QUIZ - Short Check-in Quiz</option>
                                    <option value="TEST">TEST - Mid-term / Chapter Test</option>
                                    <option value="EXAM">EXAM - Final Exam</option>
                                    <option value="ASSIGNMENT">ASSIGNMENT - Homework Task</option>
                                    <option value="PROJECT">PROJECT - Group / Practical Project</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Target Class & Subject</label>
                                <select
                                    value={newAssignmentId}
                                    onChange={(e) => setNewAssignmentId(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                >
                                    {classes.map((c, i) => {
                                        const a = c.assignment || c;
                                        return (
                                            <option key={a.id || i} value={a.id}>
                                                Grade {a.schoolGrade?.grade?.level}{a.section?.name} - {a.subject?.name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Assessment Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Chapter 2 Trigonometry Quiz"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Max Points / Score</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="500"
                                        value={newMaxScore}
                                        onChange={(e) => setNewMaxScore(Number(e.target.value))}
                                        required
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Due / Conduct Date</label>
                                    <input
                                        type="date"
                                        value={newDueDate}
                                        onChange={(e) => setNewDueDate(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-[#4085b3] hover:bg-[#356e94] text-white font-bold rounded-xl flex items-center space-x-1 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600 font-sans">Loading assessment workspace...</p>
            </div>
        }>
            <AssessmentContent />
        </Suspense>
    );
}
