"use client";

import { useEffect, useState, Suspense } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { 
    BookOpen, 
    CheckCircle2, 
    Clock, 
    Plus, 
    ArrowLeft, 
    FileText, 
    TrendingUp, 
    AlertCircle, 
    HelpCircle, 
    Save, 
    Inbox, 
    ChevronRight, 
    Sparkles, 
    Loader2,
    Calendar,
    X,
    MessageSquare,
    Award
} from "lucide-react";

function CurriculumContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");

    const [activeTab, setActiveTab] = useState<"view" | "progress" | "log" | "difficulties" | "notes">(
        (tabParam as any) || "view"
    );

    const [classes, setClasses] = useState<any[]>([]);
    const [curriculumData, setCurriculumData] = useState<any>(null);
    const [lessonLogs, setLessonLogs] = useState<any[]>([]);
    const [difficulties, setDifficulties] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);

    // Form modal state
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
    const [unitName, setUnitName] = useState("");
    const [topicName, setTopicName] = useState("");
    const [durationMinutes, setDurationMinutes] = useState(45);
    const [logNote, setLogNote] = useState("");

    // Learning Difficulty Form State
    const [diffTopic, setDiffTopic] = useState("");
    const [diffDesc, setDiffDesc] = useState("");
    const [remedialPlan, setRemedialPlan] = useState("");
    const [showDiffModal, setShowDiffModal] = useState(false);

    // Reflection Note Form State
    const [noteTitle, setNoteTitle] = useState("");
    const [noteContent, setNoteContent] = useState("");
    const [showNoteModal, setShowNoteModal] = useState(false);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        if (tabParam && ["view", "progress", "log", "difficulties", "notes"].includes(tabParam)) {
            setActiveTab(tabParam as any);
        }
    }, [tabParam]);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            setLoading(true);
            const [classesRes, currRes] = await Promise.all([
                fetchApi("/teacher/my-classes"),
                fetchApi("/teacher/curriculum")
            ]);

            if (classesRes.ok) {
                const cData = await classesRes.json();
                const list = Array.isArray(cData) ? cData : [];
                setClasses(list);
                if (list.length > 0) {
                    setSelectedAssignmentId(list[0].assignment?.id || list[0].id);
                }
            }

            if (currRes.ok) {
                const cData = await currRes.json();
                setCurriculumData(cData);
            }

            // Mock initial lesson logs for demonstrate
            setLessonLogs([
                {
                    id: "log-1",
                    date: new Date().toISOString().split('T')[0],
                    unit: "Unit 2: Geometry & Analytical Trigonometry",
                    topic: "Trigonometric Ratios & Right Triangles",
                    section: "Grade 9 - A",
                    duration: 45,
                    note: "Completed initial right triangle ratio exercises."
                },
                {
                    id: "log-2",
                    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
                    unit: "Unit 1: Fundamentals of Functions & Algebra",
                    topic: "Functions & Domain/Range Mapping",
                    section: "Grade 9 - A",
                    duration: 45,
                    note: "Reviewed vertical line test and piecewise functions."
                }
            ]);

            setDifficulties([
                {
                    id: "diff-1",
                    date: new Date().toISOString().split('T')[0],
                    topic: "Matrix Inverses & Cramer's Rule",
                    unit: "Unit 3",
                    description: "Students found 3x3 determinant calculations confusing during timed practice.",
                    remedial: "Schedule extra tutorial session on Tuesday and provide step-by-step worksheet."
                }
            ]);

            setNotes([
                {
                    id: "note-1",
                    date: new Date().toISOString().split('T')[0],
                    title: "Classroom Visual Aids Reflection",
                    content: "Using color-coded graphs for quadratic functions significantly improved student engagement."
                }
            ]);

        } catch (err) {
            console.error("Failed to load curriculum workspace:", err);
        } finally {
            setLoading(false);
        }
    }

    function handleSaveLessonLog(e: React.FormEvent) {
        e.preventDefault();
        if (!topicName) return;
        setSubmitting(true);
        const newLog = {
            id: `log-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            unit: unitName || "Unit 2: Geometry & Analytical Trigonometry",
            topic: topicName,
            section: "Assigned Section",
            duration: durationMinutes,
            note: logNote
        };
        setLessonLogs([newLog, ...lessonLogs]);
        setUnitName("");
        setTopicName("");
        setLogNote("");
        setShowLogModal(false);
        setSubmitting(false);
        setMsg({ type: "success", text: "Lesson progress and topics covered recorded successfully!" });
    }

    function handleSaveDifficulty(e: React.FormEvent) {
        e.preventDefault();
        if (!diffTopic || !diffDesc) return;
        const newDiff = {
            id: `diff-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            topic: diffTopic,
            unit: "Current Unit",
            description: diffDesc,
            remedial: remedialPlan || "No remedial plan logged"
        };
        setDifficulties([newDiff, ...difficulties]);
        setDiffTopic("");
        setDiffDesc("");
        setRemedialPlan("");
        setShowDiffModal(false);
        setMsg({ type: "success", text: "Learning difficulty recorded and saved!" });
    }

    function handleSaveReflectionNote(e: React.FormEvent) {
        e.preventDefault();
        if (!noteTitle || !noteContent) return;
        const newNote = {
            id: `note-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            title: noteTitle,
            content: noteContent
        };
        setNotes([newNote, ...notes]);
        setNoteTitle("");
        setNoteContent("");
        setShowNoteModal(false);
        setMsg({ type: "success", text: "Teaching note saved to your private journal." });
    }

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading curriculum progress workspace...</p>
            </div>
        );
    }

    const units = curriculumData?.units || [];
    const overallProgress = curriculumData?.overallProgressPercent || 62;

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-900 pb-16">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Lesson & Curriculum Management</h1>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            View official curriculum, record lesson progress, track syllabus completion, and log learning difficulties.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowLogModal(true)}
                        className="px-4 py-2.5 bg-[#4085b3] hover:bg-[#356e94] text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-2 shadow-2xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Log Lesson Progress</span>
                    </button>
                </div>
            </div>

            {/* Navigation Tabs for Domain 5 */}
            <div className="flex border-b border-gray-200 space-x-2 text-xs font-bold bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs overflow-x-auto">
                <button
                    onClick={() => setActiveTab("view")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "view" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>1. View Curriculum Syllabus</span>
                </button>

                <button
                    onClick={() => setActiveTab("progress")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "progress" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    <span>2. Track Curriculum Progress ({overallProgress}%)</span>
                </button>

                <button
                    onClick={() => setActiveTab("log")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "log" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    <span>3. Record Lesson Logs ({lessonLogs.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("difficulties")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "difficulties" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <AlertCircle className="w-4 h-4 text-amber-300" />
                    <span>4. Learning Difficulties ({difficulties.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab("notes")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 whitespace-nowrap ${
                        activeTab === "notes" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>5. Teaching Notes ({notes.length})</span>
                </button>
            </div>

            {msg && (
                <div className={`p-4 rounded-xl border text-sm font-medium flex items-center space-x-2 ${
                    msg.type === "success" 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                        : "bg-red-50 border-red-200 text-red-800"
                }`}>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{msg.text}</span>
                </div>
            )}

            {/* TAB 1: VIEW CURRICULUM SYLLABUS & UNITS */}
            {activeTab === "view" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {units.map((unit: any) => (
                            <Card key={unit.id} className="hover:border-[#4085b3] transition-colors">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-1">
                                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                            unit.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" :
                                            unit.status === "IN_PROGRESS" ? "bg-blue-100 text-[#4085b3]" : "bg-gray-100 text-gray-600"
                                        }`}>
                                            {unit.status.replace("_", " ")}
                                        </span>
                                        <CardTitle className="text-base font-bold text-gray-900">{unit.unitNumber}: {unit.title}</CardTitle>
                                    </div>
                                    <span className="text-sm font-black text-[#4085b3]">{unit.progressPercent}%</span>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs">
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-[#4085b3] h-full rounded-full transition-all duration-500" style={{ width: `${unit.progressPercent}%` }} />
                                    </div>

                                    <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                                        <span>Topics Completed: <strong className="text-gray-900">{unit.completedTopicsCount} / {unit.topicsCount}</strong></span>
                                        <span>Planned Hours: <strong className="text-gray-900">{unit.plannedHours} hrs</strong></span>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100">
                                        <p className="font-bold text-gray-700 mb-1.5 uppercase text-[10px] tracking-wider">Syllabus Topics Covered:</p>
                                        <ul className="space-y-1 text-gray-600">
                                            {unit.topics.map((t: string, idx: number) => (
                                                <li key={idx} className="flex items-center space-x-2">
                                                    <CheckCircle2 className={`w-3.5 h-3.5 ${idx < unit.completedTopicsCount ? "text-emerald-600" : "text-gray-300"}`} />
                                                    <span className={idx < unit.completedTopicsCount ? "line-through text-gray-400" : "font-medium"}>{t}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: TRACK CURRICULUM PROGRESS */}
            {activeTab === "progress" && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                                <TrendingUp className="w-5 h-5 text-[#4085b3]" />
                                <span>Academic Year Curriculum Progress Summary</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 text-xs">
                            <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-2 text-center md:text-left">
                                    <span className="px-3 py-1 bg-blue-100 text-[#4085b3] rounded-full font-bold text-xs">ON SCHEDULE</span>
                                    <h2 className="text-3xl font-black text-blue-950">{overallProgress}% Term Syllabus Completed</h2>
                                    <p className="text-xs text-blue-800">
                                        10 out of 20 core curriculum topics delivered across assigned sections.
                                    </p>
                                </div>
                                <div className="w-24 h-24 rounded-full border-8 border-[#4085b3] flex items-center justify-center font-black text-xl text-[#4085b3] bg-white shadow-2xs">
                                    {overallProgress}%
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                    <p className="text-gray-400 font-bold uppercase text-[10px]">Units Completed</p>
                                    <p className="text-xl font-bold text-gray-900">1 / 4 Units</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                    <p className="text-gray-400 font-bold uppercase text-[10px]">Teaching Hours Delivered</p>
                                    <p className="text-xl font-bold text-gray-900">28 / 60 Hours</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                    <p className="text-gray-400 font-bold uppercase text-[10px]">Pace Indicator</p>
                                    <p className="text-xl font-bold text-emerald-700">+2 Days Ahead of Target</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 3: RECORD LESSON LOGS & TOPICS COVERED */}
            {activeTab === "log" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-[#4085b3]" />
                            <span>Delivered Lesson Logs & Topics Covered</span>
                        </CardTitle>
                        <button
                            onClick={() => setShowLogModal(true)}
                            className="px-3.5 py-1.5 bg-[#4085b3] text-white rounded-lg font-bold text-xs hover:bg-[#356e94] transition-colors flex items-center space-x-1"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Log New Lesson</span>
                        </button>
                    </CardHeader>
                    <CardContent>
                        {lessonLogs.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 space-y-2">
                                <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                                <p className="text-sm font-semibold text-gray-600">No lesson logs recorded yet</p>
                                <p className="text-xs text-gray-400">Click "Log New Lesson" above to record completed topics and teaching progress.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 text-xs">
                                {lessonLogs.map((log: any) => (
                                    <div key={log.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className="px-2 py-0.5 bg-blue-100 text-[#4085b3] rounded font-bold text-[10px] uppercase">{log.unit}</span>
                                            <h4 className="font-extrabold text-gray-900 text-sm">{log.topic}</h4>
                                            <p className="text-[10px] text-gray-500">
                                                Logged Date: <strong>{log.date}</strong> • Duration: <strong>{log.duration} mins</strong> • Section: <strong>{log.section}</strong>
                                            </p>
                                            {log.note && <p className="text-[11px] text-gray-600 italic mt-1">"{log.note}"</p>}
                                        </div>
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] flex items-center space-x-1 shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Completed
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 4: RECORD LEARNING DIFFICULTIES */}
            {activeTab === "difficulties" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            <span>Record Student Learning Difficulties & Remedial Plans</span>
                        </CardTitle>
                        <button
                            onClick={() => setShowDiffModal(true)}
                            className="px-3.5 py-1.5 bg-amber-600 text-white rounded-lg font-bold text-xs hover:bg-amber-700 transition-colors flex items-center space-x-1"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Log Learning Difficulty</span>
                        </button>
                    </CardHeader>
                    <CardContent>
                        {difficulties.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No student learning difficulties logged yet.</p>
                        ) : (
                            <div className="space-y-3 text-xs">
                                {difficulties.map((diff: any) => (
                                    <div key={diff.id} className="p-4 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="font-extrabold text-gray-900 text-sm">{diff.topic}</span>
                                            <span className="text-[10px] text-amber-800 font-bold">{diff.date}</span>
                                        </div>
                                        <p className="text-amber-900 text-xs"><strong>Student Challenge:</strong> {diff.description}</p>
                                        <div className="p-2.5 bg-white rounded-lg border border-amber-100 text-emerald-900 space-y-0.5">
                                            <p className="font-bold text-[10px] text-emerald-700 uppercase">Remedial Action Plan:</p>
                                            <p className="text-xs">{diff.remedial}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* TAB 5: RECORD TEACHING NOTES & REFLECTION */}
            {activeTab === "notes" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                            <MessageSquare className="w-5 h-5 text-[#4085b3]" />
                            <span>Teaching Notes & Journal Reflections</span>
                        </CardTitle>
                        <button
                            onClick={() => setShowNoteModal(true)}
                            className="px-3.5 py-1.5 bg-[#4085b3] text-white rounded-lg font-bold text-xs hover:bg-[#356e94] transition-colors flex items-center space-x-1"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Reflection Note</span>
                        </button>
                    </CardHeader>
                    <CardContent>
                        {notes.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No teaching notes logged yet.</p>
                        ) : (
                            <div className="space-y-3 text-xs">
                                {notes.map((n: any) => (
                                    <div key={n.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-extrabold text-gray-900 text-sm">{n.title}</h4>
                                            <span className="text-[10px] text-gray-400 font-medium">{n.date}</span>
                                        </div>
                                        <p className="text-gray-700 leading-relaxed">{n.content}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* MODAL 1: LOG LESSON PROGRESS */}
            {showLogModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-extrabold text-gray-900 text-base flex items-center space-x-2">
                                <FileText className="w-5 h-5 text-[#4085b3]" />
                                <span>Record Conducted Lesson</span>
                            </h3>
                            <button onClick={() => setShowLogModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLessonLog} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Assigned Class / Section</label>
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
                                <label className="block font-bold text-gray-700 mb-1">Syllabus Unit</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Unit 2: Geometry & Analytical Trigonometry"
                                    value={unitName}
                                    onChange={(e) => setUnitName(e.target.value)}
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Topic Covered</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Right Triangle Trigonometric Ratios"
                                    value={topicName}
                                    onChange={(e) => setTopicName(e.target.value)}
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Teaching Notes / Reflection</label>
                                <textarea
                                    rows={2}
                                    placeholder="Classroom notes, homework assigned, or student engagement..."
                                    value={logNote}
                                    onChange={(e) => setLogNote(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowLogModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-[#4085b3] hover:bg-[#356e94] text-white font-bold rounded-xl flex items-center space-x-1"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Save Lesson Log</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: LOG LEARNING DIFFICULTY */}
            {showDiffModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-extrabold text-gray-900 text-base flex items-center space-x-2">
                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                <span>Record Learning Difficulty</span>
                            </h3>
                            <button onClick={() => setShowDiffModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveDifficulty} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Challenging Topic</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Matrix Inverses & Determinants"
                                    value={diffTopic}
                                    onChange={(e) => setDiffTopic(e.target.value)}
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Description of Student Difficulty</label>
                                <textarea
                                    rows={3}
                                    placeholder="Describe specific conceptual confusion or calculation hurdles..."
                                    value={diffDesc}
                                    onChange={(e) => setDiffDesc(e.target.value)}
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Remedial Action Plan</label>
                                <textarea
                                    rows={2}
                                    placeholder="Planned extra tutorial, peer practice, or review worksheet..."
                                    value={remedialPlan}
                                    onChange={(e) => setRemedialPlan(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDiffModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl flex items-center space-x-1"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Save Difficulty Record</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: LOG TEACHING NOTE */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-extrabold text-gray-900 text-base flex items-center space-x-2">
                                <MessageSquare className="w-5 h-5 text-[#4085b3]" />
                                <span>Add Teaching Reflection Note</span>
                            </h3>
                            <button onClick={() => setShowNoteModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveReflectionNote} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Reflection Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Visual Aids Effectiveness in Algebra"
                                    value={noteTitle}
                                    onChange={(e) => setNoteTitle(e.target.value)}
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Teaching Note & Journal Entry</label>
                                <textarea
                                    rows={4}
                                    placeholder="Write your pedagogical thoughts, observations, or ideas for next class..."
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    required
                                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNoteModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-[#4085b3] hover:bg-[#356e94] text-white font-bold rounded-xl flex items-center space-x-1"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Save Note</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function CurriculumPage() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4085b3] mb-4"></div>
                <p className="text-sm font-semibold text-gray-600 font-sans">Loading curriculum workspace...</p>
            </div>
        }>
            <CurriculumContent />
        </Suspense>
    );
}
