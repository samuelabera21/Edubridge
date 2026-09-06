"use client";

import { useEffect, useState, Suspense } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { 
    ClipboardCheck, 
    ArrowLeft, 
    Plus, 
    Save, 
    CheckCircle2, 
    FileText, 
    Calendar, 
    Clock, 
    Check, 
    X, 
    MessageSquare, 
    Inbox, 
    Loader2,
    BookOpen,
    Send,
    Filter,
    Award
} from "lucide-react";

function LearningContent() {
    const searchParams = useSearchParams();
    const typeParam = searchParams.get("type");
    const tabParam = searchParams.get("tab");

    const [activeTab, setActiveTab] = useState<"activities" | "create" | "submissions">(
        (tabParam as any) || "activities"
    );

    const [classes, setClasses] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<any>(null);
    const [submissions, setSubmissions] = useState<any[]>([]);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [activityType, setActivityType] = useState<string>(typeParam || "HOMEWORK");
    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
    const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]);

    // Submission grading state map
    const [gradeMap, setGradeMap] = useState<Record<string, { grade: string; feedback: string; status: string }>>({});

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (typeParam) {
            setActivityType(typeParam);
            setActiveTab("create");
        }
        if (tabParam && ["activities", "create", "submissions"].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [typeParam, tabParam]);

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            setLoading(true);
            const [classesRes, actRes] = await Promise.all([
                fetchApi("/teacher/my-classes"),
                fetchApi("/teacher/learning/activities")
            ]);

            const classData = classesRes.ok ? await classesRes.json() : [];
            const actData = actRes.ok ? await actRes.json() : [];

            const classList = Array.isArray(classData) ? classData : [];
            const actList = Array.isArray(actData) ? actData : [];

            setClasses(classList);
            setActivities(actList);

            if (classList.length > 0) {
                setSelectedAssignmentId(classList[0].assignment?.id || classList[0].id || "");
            }
            if (actList.length > 0) {
                selectActivity(actList[0]);
            }
        } catch (err) {
            console.error("Failed to load learning activities:", err);
        } finally {
            setLoading(false);
        }
    }

    async function selectActivity(act: any) {
        setSelectedActivity(act);
        try {
            const res = await fetchApi(`/teacher/learning/activities/${act.id}/submissions`);
            if (res.ok) {
                const subData = await res.json();
                const list = Array.isArray(subData) ? subData : [];
                setSubmissions(list);

                const map: Record<string, { grade: string; feedback: string; status: string }> = {};
                list.forEach((sub: any) => {
                    map[sub.id] = {
                        grade: sub.grade || "A",
                        feedback: sub.feedback || "",
                        status: sub.status || "GRADED"
                    };
                });
                setGradeMap(map);
            }
        } catch (err) {
            console.error("Failed to load submissions for activity:", err);
        }
    }

    async function handleCreateActivity(e: React.FormEvent) {
        e.preventDefault();
        if (!title || !selectedAssignmentId) return;

        setSubmitting(true);
        setMsg(null);

        try {
            const selectedClass = classes.find((c: any) => (c.assignment?.id || c.id) === selectedAssignmentId);
            const academicYearId = selectedClass?.assignment?.academicYearId || "active-year";

            const res = await fetchApi("/teacher/learning/activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId,
                    teachingAssignmentId: selectedAssignmentId,
                    title,
                    description,
                    type: activityType,
                    dueDate
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to create activity");
            }

            const created = await res.json();
            setActivities([created, ...activities]);
            setTitle("");
            setDescription("");
            setActiveTab("activities");
            selectActivity(created);
            setMsg({ type: "success", text: `Activity "${created.title}" created with deadline set to ${dueDate}!` });
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to create activity" });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleGradeSubmission(submissionId: string) {
        const item = gradeMap[submissionId];
        if (!item) return;

        try {
            const res = await fetchApi(`/teacher/submissions/${submissionId}/grade`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: item.status,
                    grade: item.grade,
                    feedback: item.feedback
                })
            });

            if (res.ok) {
                setMsg({ type: "success", text: "Submission marked complete, graded, and feedback saved!" });
            } else {
                throw new Error("Failed to save grade");
            }
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to update submission" });
        }
    }

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600 font-sans">Loading learning activities workspace...</p>
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
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Learning Activities Workspace</h1>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Create assignments, quizzes, class activities; set deadlines, review submissions, mark completion, and give feedback.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setActiveTab("create")}
                        className="px-4 py-2.5 bg-[#4085b3] hover:bg-[#356e94] text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-2xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Activity & Set Deadline</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs for Domain 7 */}
            <div className="flex border-b border-gray-200 space-x-3 text-xs font-bold bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs overflow-x-auto">
                <button
                    onClick={() => setActiveTab("activities")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "activities" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>1. Active Coursework ({activities.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("create")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "create" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <Plus className="w-4 h-4" />
                    <span>2. Create Assignment / Quiz / Activity</span>
                </button>

                <button
                    onClick={() => setActiveTab("submissions")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "submissions" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>3. Review Submissions & Give Feedback ({submissions.length})</span>
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

            {/* TAB 1: ACTIVE COURSEWORK ACTIVITIES LIST */}
            {activeTab === "activities" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activities.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-gray-400 space-y-2 bg-white rounded-2xl border border-gray-100 p-6">
                                <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                                <p className="text-sm font-semibold text-gray-600">No learning activities created yet</p>
                                <p className="text-xs text-gray-400">Click "Create Activity" to assign coursework and set deadlines.</p>
                            </div>
                        ) : (
                            activities.map((act: any) => (
                                <Card key={act.id} className="hover:border-[#4085b3] transition-colors flex flex-col justify-between">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="px-2.5 py-0.5 bg-blue-100 text-[#4085b3] font-bold rounded text-[10px] uppercase">
                                                {act.type}
                                            </span>
                                            <span className="text-[10px] text-gray-500 font-medium flex items-center space-x-1">
                                                <Calendar className="w-3 h-3 text-gray-400" />
                                                <span>Deadline: {act.dueDate ? new Date(act.dueDate).toLocaleDateString() : "No deadline"}</span>
                                            </span>
                                        </div>
                                        <CardTitle className="text-base font-extrabold text-gray-900">{act.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-xs">
                                        <p className="text-gray-600 line-clamp-2">{act.description || "Class activity assignment for enrolled students."}</p>
                                        <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                                            <button
                                                onClick={() => {
                                                    selectActivity(act);
                                                    setActiveTab("submissions");
                                                }}
                                                className="px-3.5 py-1.5 bg-[#4085b3] text-white font-bold rounded-lg hover:bg-[#356e94] transition-colors shadow-2xs text-[11px] flex items-center space-x-1"
                                            >
                                                <ClipboardCheck className="w-3.5 h-3.5" />
                                                <span>Review Submissions</span>
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: CREATE ASSIGNMENT / QUIZ / CLASS ACTIVITY & SET DEADLINE */}
            {activeTab === "create" && (
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                            <Plus className="w-5 h-5 text-[#4085b3]" />
                            <span>Create Learning Activity & Set Submission Deadline</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Activity Category</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { key: "HOMEWORK", label: "Assignment" },
                                        { key: "QUIZ", label: "Quiz" },
                                        { key: "CLASS_WORK", label: "Class Activity" }
                                    ].map(item => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => setActivityType(item.key)}
                                            className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                                                activityType === item.key ? "bg-[#4085b3] text-white border-[#4085b3] shadow-2xs" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Target Class & Subject</label>
                                <select
                                    value={selectedAssignmentId}
                                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
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
                                <label className="block font-bold text-gray-700 mb-1">Activity Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Chapter 3 Matrix Algebra Exercises"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Submission Deadline (Due Date)</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        required
                                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                    <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Instructions & Guidelines</label>
                                <textarea
                                    rows={4}
                                    placeholder="Provide clear submission instructions for students..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-3 bg-[#4085b3] hover:bg-[#356e94] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                <span>Publish Activity & Set Deadline</span>
                            </button>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* TAB 3: REVIEW SUBMISSIONS, MARK COMPLETION & GIVE FEEDBACK */}
            {activeTab === "submissions" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                            <ClipboardCheck className="w-5 h-5 text-[#4085b3]" />
                            <span>Review Student Submissions ({selectedActivity?.title || "Select Activity"})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {submissions.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 space-y-2">
                                <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                                <p className="text-sm font-semibold text-gray-600">No student submissions received for this activity yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4 text-xs">
                                {submissions.map((sub: any) => {
                                    const st = sub.enrollment?.student || sub.student || {};
                                    const item = gradeMap[sub.id] || { grade: "A", feedback: "", status: "GRADED" };
                                    return (
                                        <div key={sub.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 pb-2">
                                                <div>
                                                    <h4 className="font-extrabold text-gray-900 text-sm">
                                                        {st.firstName} {st.lastName} {st.fatherName || ''}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400 font-mono">ID: {st.studentId || "N/A"} • Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</p>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <select
                                                        value={item.status}
                                                        onChange={(e) => setGradeMap({
                                                            ...gradeMap,
                                                            [sub.id]: { ...item, status: e.target.value }
                                                        })}
                                                        className="bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold outline-none focus:ring-2 focus:ring-[#4085b3]"
                                                    >
                                                        <option value="SUBMITTED">SUBMITTED</option>
                                                        <option value="GRADED">GRADED (COMPLETED)</option>
                                                        <option value="RESUBMITTED">RESUBMITTED</option>
                                                    </select>

                                                    <input
                                                        type="text"
                                                        placeholder="Grade (e.g. A, 95%)"
                                                        value={item.grade}
                                                        onChange={(e) => setGradeMap({
                                                            ...gradeMap,
                                                            [sub.id]: { ...item, grade: e.target.value }
                                                        })}
                                                        className="w-28 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#4085b3]"
                                                    />

                                                    <button
                                                        onClick={() => handleGradeSubmission(sub.id)}
                                                        className="px-3 py-1 bg-[#4085b3] text-white rounded-lg font-bold text-xs hover:bg-[#356e94] transition-colors flex items-center space-x-1 shadow-2xs"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>Save Grade</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block font-bold text-gray-700 mb-1">Teacher Feedback & Written Remarks</label>
                                                <textarea
                                                    rows={2}
                                                    placeholder="Enter feedback for student..."
                                                    value={item.feedback}
                                                    onChange={(e) => setGradeMap({
                                                        ...gradeMap,
                                                        [sub.id]: { ...item, feedback: e.target.value }
                                                    })}
                                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

        </div>
    );
}

export default function LearningPage() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600 font-sans">Loading learning activities workspace...</p>
            </div>
        }>
            <LearningContent />
        </Suspense>
    );
}
