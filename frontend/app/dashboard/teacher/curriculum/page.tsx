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
    Award,
    Search,
    Filter,
    ChevronDown,
    ChevronUp,
    Target,
    Compass,
    ExternalLink,
    Layers,
    BookMarked,
    Eye
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

    // View Curriculum Tab state
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_PROGRESS" | "COMPLETED" | "UPCOMING">("ALL");
    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
    const [selectedTopicModal, setSelectedTopicModal] = useState<any | null>(null);
    const [loadingCurriculum, setLoadingCurriculum] = useState(false);
    const [showCompetencies, setShowCompetencies] = useState(true);

    // Topic Coverage Modal State (SRS 4.4.8)
    const [showCoverTopicModal, setShowCoverTopicModal] = useState(false);
    const [coverUnitNumber, setCoverUnitNumber] = useState<number>(1);
    const [coverUnitTitle, setCoverUnitTitle] = useState("");
    const [coverTopicNumber, setCoverTopicNumber] = useState("");
    const [coverTopicTitle, setCoverTopicTitle] = useState("");
    const [coverStatus, setCoverStatus] = useState<"COMPLETED" | "IN_PROGRESS" | "PENDING">("COMPLETED");
    const [coverDate, setCoverDate] = useState(new Date().toISOString().split("T")[0]);
    const [coverDelayReason, setCoverDelayReason] = useState("");
    const [coverNotes, setCoverNotes] = useState("");
    const [progressStatusFilter, setProgressStatusFilter] = useState<"ALL" | "COMPLETED" | "IN_PROGRESS" | "PENDING">("ALL");

    // Form modal state (SRS 4.4.7)
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
    const [unitName, setUnitName] = useState("");
    const [topicName, setTopicName] = useState("");
    const [lessonDate, setLessonDate] = useState(new Date().toISOString().split("T")[0]);
    const [periodNumber, setPeriodNumber] = useState(1);
    const [studentsAttending, setStudentsAttending] = useState(40);
    const [lessonDeliveryStatus, setLessonDeliveryStatus] = useState<"COMPLETED" | "PARTIALLY_COMPLETED" | "INTERRUPTED" | "CANCELLED">("COMPLETED");
    const [interruptionReason, setInterruptionReason] = useState("");
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
                    const firstId = list[0].assignment?.id || list[0].id;
                    setSelectedAssignmentId(firstId);
                }
            }

            if (currRes.ok) {
                const cData = await currRes.json();
                setCurriculumData(cData);
                if (cData?.lessonLogs && Array.isArray(cData.lessonLogs)) {
                    setLessonLogs(cData.lessonLogs);
                }
                // Expand all units initially
                if (cData?.units && Array.isArray(cData.units)) {
                    const expanded: Record<string, boolean> = {};
                    cData.units.forEach((u: any, idx: number) => { 
                        expanded[u.id || u.unitNumber || idx] = true; 
                    });
                    setExpandedUnits(expanded);
                }
            }

            setDifficulties([]);
            setNotes([]);

        } catch (err) {
            console.error("Failed to load curriculum workspace:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSwitchAssignment(assignmentId: string) {
        setSelectedAssignmentId(assignmentId);
        try {
            setLoadingCurriculum(true);
            const res = await fetchApi(`/teacher/curriculum?assignmentId=${encodeURIComponent(assignmentId)}`);
            if (res.ok) {
                const data = await res.json();
                setCurriculumData(data);
                if (data?.lessonLogs && Array.isArray(data.lessonLogs)) {
                    setLessonLogs(data.lessonLogs);
                }
                if (data?.units && Array.isArray(data.units)) {
                    const expanded: Record<string, boolean> = {};
                    data.units.forEach((u: any, idx: number) => { 
                        expanded[u.id || u.unitNumber || idx] = true; 
                    });
                    setExpandedUnits(expanded);
                }
            }
        } catch (err) {
            console.error("Failed to switch assignment curriculum:", err);
        } finally {
            setLoadingCurriculum(false);
        }
    }

    function toggleUnit(unitId: string) {
        setExpandedUnits(prev => ({
            ...prev,
            [unitId]: !prev[unitId]
        }));
    }

    function toggleAllUnits(expand: boolean) {
        if (!curriculumData?.units) return;
        const updated: Record<string, boolean> = {};
        curriculumData.units.forEach((u: any) => {
            updated[u.id] = expand;
        });
        setExpandedUnits(updated);
    }

    function handleOpenQuickLog(unit: any, topic: any) {
        setUnitName(unit.title);
        setTopicName(typeof topic === "string" ? topic : topic.title);
        setShowLogModal(true);
    }

    function handleOpenDifficulty(topic: any) {
        setDiffTopic(typeof topic === "string" ? topic : topic.title);
        setActiveTab("difficulties");
        setShowDiffModal(true);
    }

    function handleOpenCoverModal(unit: any, topic: any) {
        const isObj = typeof topic === "object" && topic !== null;
        setCoverUnitNumber(unit?.unitNumber || 1);
        setCoverUnitTitle(unit?.title || `Unit ${unit?.unitNumber || 1}`);
        setCoverTopicNumber(isObj ? (topic.topicNumber || "") : "");
        setCoverTopicTitle(isObj ? (topic.title || "") : topic);
        setCoverStatus(isObj && topic.status ? topic.status : "COMPLETED");
        setCoverDate(isObj && topic.completedAt ? topic.completedAt.split("T")[0] : new Date().toISOString().split("T")[0]);
        setCoverDelayReason(isObj && topic.delayReason ? topic.delayReason : "");
        setCoverNotes(isObj && topic.notes ? topic.notes : "");
        setShowCoverTopicModal(true);
    }

    async function handleSaveTopicCoverage(e: React.FormEvent) {
        e.preventDefault();
        if (!coverTopicTitle || !selectedAssignmentId) {
            setMsg({ type: "error", text: "Please select an assigned class and enter the topic title." });
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetchApi("/teacher/curriculum/topic-coverage", {
                method: "POST",
                body: JSON.stringify({
                    assignmentId: selectedAssignmentId,
                    unitNumber: Number(coverUnitNumber) || 1,
                    unitTitle: coverUnitTitle,
                    topicNumber: coverTopicNumber,
                    topicTitle: coverTopicTitle,
                    status: coverStatus,
                    completionDate: coverStatus === "COMPLETED" ? coverDate : undefined,
                    delayReason: coverDelayReason || undefined,
                    notes: coverNotes || undefined
                })
            });

            if (res.ok) {
                setShowCoverTopicModal(false);
                setMsg({ type: "success", text: `Topic "${coverTopicTitle}" marked as ${coverStatus} successfully!` });
                await handleSwitchAssignment(selectedAssignmentId);
            } else {
                const errData = await res.json();
                setMsg({ type: "error", text: errData.error || "Failed to record topic coverage." });
            }
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to record topic coverage." });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSaveLessonLog(e: React.FormEvent) {
        e.preventDefault();
        if (!topicName || !selectedAssignmentId) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/teacher/curriculum/lesson-log", {
                method: "POST",
                body: JSON.stringify({
                    assignmentId: selectedAssignmentId,
                    topicTitle: topicName,
                    lessonDate: lessonDate,
                    periodNumber: Number(periodNumber) || 1,
                    studentsAttending: Number(studentsAttending) || 0,
                    status: lessonDeliveryStatus,
                    interruptionReason: lessonDeliveryStatus === "INTERRUPTED" ? interruptionReason : undefined,
                    teachingNotes: logNote || undefined
                })
            });

            if (res.ok) {
                setShowLogModal(false);
                setTopicName("");
                setLogNote("");
                setInterruptionReason("");
                setMsg({ type: "success", text: "Lesson progress and topic coverage saved successfully!" });
                await handleSwitchAssignment(selectedAssignmentId);
            } else {
                const errData = await res.json();
                setMsg({ type: "error", text: errData.error || "Failed to record lesson log." });
            }
        } catch (err: any) {
            setMsg({ type: "error", text: err.message || "Failed to record lesson log." });
        } finally {
            setSubmitting(false);
        }
    }

    function handleSaveDifficulty(e: React.FormEvent) {
        e.preventDefault();
        if (!diffTopic || !diffDesc) return;
        const newDiff = {
            id: `diff-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            topic: diffTopic,
            unit: unitName || (curriculumData?.units?.[0]?.title || "Current Unit"),
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
    const overallProgress = curriculumData?.overallProgressPercent ?? 0;
    const subjectInfo = curriculumData?.subject;

    // Filter units and topics based on Search & Status Filter
    const filteredUnits = units.filter((u: any) => {
        if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const matchesUnit = u.title.toLowerCase().includes(q) || u.unitNumber.toLowerCase().includes(q);
        const matchesTopics = (u.topics || []).some((t: any) => {
            const title = typeof t === "string" ? t : t.title;
            const concepts = typeof t === "object" && t.keyConcepts ? t.keyConcepts : "";
            return title.toLowerCase().includes(q) || concepts.toLowerCase().includes(q);
        });
        return matchesUnit || matchesTopics;
    });

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-900 pb-16">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Lesson & Curriculum Management</h1>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                        View official curriculum, record lesson progress, track syllabus completion, and log learning difficulties.
                    </p>
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
                    {/* 1. Class & Subject Switcher & Metadata Card */}
                    <Card className="bg-white border border-gray-200 shadow-2xs rounded-2xl overflow-hidden">
                        <div className="bg-white text-gray-900 p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-3 py-1 bg-blue-50 rounded-full text-[11px] font-bold tracking-wide uppercase text-[#4085b3] border border-blue-200/60">
                                            National Curriculum Syllabus
                                        </span>
                                        {subjectInfo?.academicYear && (
                                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[11px] font-bold">
                                                Academic Year {subjectInfo.academicYear}
                                            </span>
                                        )}
                                        {subjectInfo?.weeklyPeriods != null && (
                                            <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[11px] font-bold">
                                                {subjectInfo.weeklyPeriods} Periods / Week
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                                        <span>{subjectInfo?.name || (classes.length > 0 ? "Select an assigned class" : "No Class Assigned")}</span>
                                        {subjectInfo?.gradeLevel && (
                                            <span className="text-gray-500 text-lg font-medium">
                                                ({subjectInfo.gradeLevel}{subjectInfo.section ? ` - Section ${subjectInfo.section}` : ""})
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
                                        Official Ministry of Education curriculum outline, competency standards, unit breakdowns, and recommended teaching resources.
                                    </p>
                                </div>

                                {/* Class Assignment Switcher */}
                                {classes.length > 0 && (
                                    <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-2 lg:min-w-[290px] shadow-2xs">
                                        <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                                            Select Teaching Assignment:
                                        </label>
                                        <select
                                            value={selectedAssignmentId}
                                            onChange={(e) => handleSwitchAssignment(e.target.value)}
                                            className="w-full bg-white text-gray-900 border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#4085b3] transition-all cursor-pointer shadow-2xs"
                                        >
                                            {classes.map((c, i) => {
                                                const a = c.assignment || c;
                                                return (
                                                    <option key={a.id || i} value={a.id} className="bg-white text-gray-900">
                                                        Grade {a.schoolGrade?.grade?.level || a.schoolGrade?.grade?.name || ""}{a.section?.name ? `-${a.section.name}` : ""} • {a.subject?.name || "Subject"}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        <p className="text-[10px] text-gray-400 font-medium">
                                            Switch between your assigned classes to view their respective syllabus.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Curriculum Key Metrics Bar */}
                            <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 shadow-2xs space-y-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Units</span>
                                    <span className="text-lg font-black text-gray-900">{curriculumData?.totalUnitsCount ?? units.length} Units</span>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 shadow-2xs space-y-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Topics Syllabus</span>
                                    <span className="text-lg font-black text-gray-900">
                                        {curriculumData?.topicsCompletedCount ?? 0} / {curriculumData?.totalTopicsCount ?? 0} Covered
                                    </span>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 shadow-2xs space-y-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Planned Hours</span>
                                    <span className="text-lg font-black text-gray-900">{curriculumData?.totalPlannedHours ?? 0} Periods</span>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 shadow-2xs space-y-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Overall Progress</span>
                                    <span className="text-lg font-black text-[#4085b3]">{overallProgress}% Completed</span>
                                </div>
                            </div>
                        </div>

                        {/* Subject General Competencies (Collapsible) */}
                        {subjectInfo?.generalCompetencies && subjectInfo.generalCompetencies.length > 0 && (
                            <div className="bg-blue-50/60 border-t border-blue-100 p-4">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setShowCompetencies(!showCompetencies)}
                                        className="flex items-center space-x-2 text-xs font-bold text-blue-900 hover:text-blue-700 transition-colors"
                                    >
                                        <Compass className="w-4 h-4 text-[#4085b3]" />
                                        <span>Subject National Competency Standards & Expected Outcomes</span>
                                        {showCompetencies ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
                                    </button>
                                    <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                                        MoE Secondary Education Framework
                                    </span>
                                </div>

                                {showCompetencies && (
                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                        {subjectInfo.generalCompetencies.map((comp: string, i: number) => (
                                            <div key={i} className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs flex items-start space-x-2">
                                                <Target className="w-4 h-4 text-[#4085b3] shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-gray-700 leading-snug">{comp}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* 2. Search, Status Filter & Controls Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Search Input */}
                        <div className="relative w-full md:w-80">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search units, topics, or concepts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3] transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto">
                            {(["ALL", "IN_PROGRESS", "COMPLETED", "UPCOMING"] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                        statusFilter === status
                                            ? "bg-[#4085b3] text-white shadow-2xs"
                                            : "text-gray-600 hover:bg-gray-100 bg-gray-50 border border-gray-100"
                                    }`}
                                >
                                    {status === "ALL" && "All Statuses"}
                                    {status === "IN_PROGRESS" && "In Progress"}
                                    {status === "COMPLETED" && "Completed"}
                                    {status === "UPCOMING" && "Upcoming"}
                                </button>
                            ))}
                        </div>

                        {/* Expand / Collapse All */}
                        <div className="flex items-center space-x-2 shrink-0">
                            <button
                                onClick={() => toggleAllUnits(true)}
                                className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[11px] font-bold border border-gray-200 transition-colors"
                            >
                                Expand All
                            </button>
                            <button
                                onClick={() => toggleAllUnits(false)}
                                className="px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[11px] font-bold border border-gray-200 transition-colors"
                            >
                                Collapse All
                            </button>
                        </div>
                    </div>

                    {/* 3. Detailed Curriculum Units & Topics Accordion List */}
                    {loadingCurriculum ? (
                        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 space-y-3">
                            <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#4085b3]" />
                            <p className="text-xs font-semibold text-gray-600">Loading syllabus for selected class...</p>
                        </div>
                    ) : filteredUnits.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100 space-y-3">
                            <BookOpen className="w-10 h-10 mx-auto text-gray-300" />
                            <p className="text-sm font-bold text-gray-700">
                                {units.length === 0 ? "No curriculum units uploaded yet" : "No curriculum units match your criteria"}
                            </p>
                            <p className="text-xs text-gray-500">
                                {units.length === 0
                                    ? "No syllabus breakdown or units have been configured for this subject yet."
                                    : "Try adjusting your search terms or filter selection."}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredUnits.map((unit: any) => {
                                const isExpanded = !!expandedUnits[unit.id];
                                const topicsList = unit.topics || [];
                                const resourcesList = unit.resources || [];
                                const objectivesList = unit.objectives || [];

                                return (
                                    <div
                                        key={unit.id}
                                        className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden transition-all duration-200 hover:border-gray-300"
                                    >
                                        {/* Unit Header Bar (Clickable) */}
                                        <div
                                            onClick={() => toggleUnit(unit.id)}
                                            className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/60 transition-colors select-none"
                                        >
                                            <div className="flex items-start space-x-3.5">
                                                <div className="p-2.5 rounded-xl bg-blue-50 text-[#4085b3] mt-0.5">
                                                    <BookOpen className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-extrabold text-xs text-[#4085b3] uppercase tracking-wide">
                                                            {unit.unitNumber}
                                                        </span>
                                                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                                                            unit.status === "COMPLETED"
                                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                                : unit.status === "IN_PROGRESS"
                                                                ? "bg-blue-100 text-[#4085b3] border border-blue-200"
                                                                : "bg-gray-100 text-gray-600 border border-gray-200"
                                                        }`}>
                                                            {unit.status.replace("_", " ")}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                                                        {unit.title}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 font-medium">
                                                        <span>
                                                            Topics: <strong className="text-gray-900">{unit.completedTopicsCount || 0} / {unit.topicsCount || topicsList.length}</strong>
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            Planned: <strong className="text-gray-900">{unit.plannedHours || 0} hrs</strong>
                                                        </span>
                                                        <span>•</span>
                                                        <span>
                                                            Delivered: <strong className="text-gray-900">{unit.actualHours || 0} hrs</strong>
                                                        </span>
                                                        {resourcesList.length > 0 && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-[#4085b3] font-semibold flex items-center gap-1">
                                                                    <BookMarked className="w-3 h-3" /> {resourcesList.length} Resources
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress bar & Toggle */}
                                            <div className="flex items-center space-x-6 md:self-center">
                                                <div className="w-36 text-right space-y-1.5 hidden sm:block">
                                                    <div className="flex justify-between text-xs font-bold">
                                                        <span className="text-gray-500 text-[10px] uppercase">Unit Progress</span>
                                                        <span className="text-[#4085b3]">{unit.progressPercent}%</span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                unit.progressPercent === 100 ? "bg-emerald-500" : "bg-[#4085b3]"
                                                            }`}
                                                            style={{ width: `${unit.progressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="p-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Unit Content */}
                                        {isExpanded && (
                                            <div className="border-t border-gray-100 p-5 bg-gray-50/40 space-y-6">
                                                
                                                {/* Unit Learning Objectives */}
                                                {objectivesList.length > 0 && (
                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-2.5">
                                                        <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                                                            <Target className="w-4 h-4 text-[#4085b3]" />
                                                            <span>Unit Learning Objectives & Target Competencies</span>
                                                        </h4>
                                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                                                            {objectivesList.map((obj: string, oIdx: number) => (
                                                                <li key={oIdx} className="flex items-start space-x-2 bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#4085b3] mt-1.5 shrink-0" />
                                                                    <span className="text-[11px] leading-relaxed">{obj}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Detailed Topics List */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                                                            <Layers className="w-4 h-4 text-[#4085b3]" />
                                                            <span>Curriculum Topics & Sequence Breakdown ({topicsList.length})</span>
                                                        </h4>
                                                        <span className="text-[11px] text-gray-400 font-medium">
                                                            Click a topic to view details or log progress
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {topicsList.map((topicItem: any, tIdx: number) => {
                                                            const isObj = typeof topicItem === "object" && topicItem !== null;
                                                            const topicTitle = isObj ? (topicItem.title || "") : topicItem;
                                                            const topicNum = isObj && topicItem.topicNumber ? topicItem.topicNumber : `${tIdx + 1}`;
                                                            const topicStatus = isObj && topicItem.status ? topicItem.status : (tIdx < (unit.completedTopicsCount || 0) ? "COMPLETED" : "PENDING");
                                                            const plannedHrs = isObj && topicItem.plannedHours != null ? topicItem.plannedHours : 0;
                                                            const keyConcepts = isObj ? (topicItem.keyConcepts || "") : "";

                                                            return (
                                                                <div
                                                                    key={tIdx}
                                                                    className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:border-blue-200 transition-all"
                                                                >
                                                                    <div className="flex items-start space-x-3">
                                                                        <div className="mt-0.5">
                                                                            {topicStatus === "COMPLETED" ? (
                                                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                                            ) : topicStatus === "IN_PROGRESS" ? (
                                                                                <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                                                                            ) : (
                                                                                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-0.5">
                                                                            <div className="flex items-center space-x-2">
                                                                                <span className="text-[11px] font-bold text-gray-500">
                                                                                    {topicNum}
                                                                                </span>
                                                                                <span className={`text-xs font-bold ${
                                                                                    topicStatus === "COMPLETED" ? "text-gray-900" : "text-gray-800"
                                                                                }`}>
                                                                                    {topicTitle}
                                                                                </span>
                                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                                                                    topicStatus === "COMPLETED"
                                                                                        ? "bg-emerald-50 text-emerald-700"
                                                                                        : topicStatus === "IN_PROGRESS"
                                                                                        ? "bg-blue-50 text-blue-700"
                                                                                        : "bg-gray-100 text-gray-500"
                                                                                }`}>
                                                                                    {topicStatus}
                                                                                </span>
                                                                            </div>
                                                                            {keyConcepts && (
                                                                                <p className="text-[11px] text-gray-500 line-clamp-1">
                                                                                    <strong>Core:</strong> {keyConcepts}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Topic Actions & Hours */}
                                                                    <div className="flex items-center space-x-3 self-end lg:self-center shrink-0">
                                                                        <span className="text-[11px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                                                            {plannedHrs} hrs
                                                                        </span>

                                                                        <button
                                                                            onClick={() => setSelectedTopicModal({ ...topicItem, unitTitle: unit.title, unitNumber: unit.unitNumber })}
                                                                            className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-[11px] font-bold border border-gray-200 flex items-center space-x-1 transition-colors"
                                                                            title="View full topic breakdown"
                                                                        >
                                                                            <Eye className="w-3 h-3 text-[#4085b3]" />
                                                                            <span>Details</span>
                                                                        </button>

                                                                        <button
                                                                            onClick={() => handleOpenCoverModal(unit, topicItem)}
                                                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center space-x-1 transition-colors ${
                                                                                topicStatus === "COMPLETED"
                                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                                                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                                                            }`}
                                                                            title="Mark topic as covered (SRS 4.4.8)"
                                                                        >
                                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                            <span>{topicStatus === "COMPLETED" ? "Covered ✓" : "Mark Covered"}</span>
                                                                        </button>

                                                                        <button
                                                                            onClick={() => handleOpenQuickLog(unit, topicItem)}
                                                                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#4085b3] rounded-lg text-[11px] font-bold border border-blue-200 flex items-center space-x-1 transition-colors"
                                                                            title="Log lesson progress for this topic"
                                                                        >
                                                                            <Plus className="w-3 h-3" />
                                                                            <span>Log Lesson</span>
                                                                        </button>

                                                                        <button
                                                                            onClick={() => handleOpenDifficulty(topicItem)}
                                                                            className="px-2 py-1 text-amber-700 hover:bg-amber-50 rounded-lg text-[11px] font-bold transition-colors"
                                                                            title="Log student difficulty on this topic"
                                                                        >
                                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Attached Curriculum Resources (FR-RESOURCE-001 - 007) */}
                                                {resourcesList.length > 0 && (
                                                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs space-y-2.5">
                                                        <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center space-x-2">
                                                            <BookMarked className="w-4 h-4 text-emerald-600" />
                                                            <span>Official Curriculum Resources & Reference Materials</span>
                                                        </h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                            {resourcesList.map((res: any, rIdx: number) => (
                                                                <div
                                                                    key={res.id || rIdx}
                                                                    className="p-3 bg-gray-50/70 hover:bg-blue-50/40 rounded-xl border border-gray-200 transition-colors flex flex-col justify-between space-y-2"
                                                                >
                                                                    <div className="space-y-1">
                                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#4085b3]">
                                                                            {res.type?.replace("_", " ") || "REFERENCE"}
                                                                        </span>
                                                                        <h5 className="font-extrabold text-gray-900 text-xs leading-snug">
                                                                            {res.title}
                                                                        </h5>
                                                                        <p className="text-[11px] text-gray-600">
                                                                            {res.reference}
                                                                        </p>
                                                                    </div>
                                                                    <div className="pt-2 border-t border-gray-200/60 flex justify-between items-center text-[10px] font-bold text-gray-500">
                                                                        <span>MoE Approved</span>
                                                                        <a
                                                                            href={res.url || "#"}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-[#4085b3] hover:underline flex items-center gap-1 font-bold"
                                                                        >
                                                                            <span>Open</span>
                                                                            <ExternalLink className="w-2.5 h-2.5" />
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
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
                                    <span className="px-3 py-1 bg-blue-100 text-[#4085b3] rounded-full font-bold text-xs">
                                        {overallProgress >= 70 ? "AHEAD OF SCHEDULE" : overallProgress >= 40 ? "ON SCHEDULE" : "PACING IN PROGRESS"}
                                    </span>
                                    <h2 className="text-3xl font-black text-blue-950">{overallProgress}% Term Syllabus Completed</h2>
                                    <p className="text-xs text-blue-800">
                                        {curriculumData?.topicsCompletedCount ?? 0} out of {curriculumData?.totalTopicsCount ?? 0} core curriculum topics delivered across assigned sections.
                                    </p>
                                </div>
                                <div className="w-24 h-24 rounded-full border-8 border-[#4085b3] flex items-center justify-center font-black text-xl text-[#4085b3] bg-white shadow-2xs">
                                    {overallProgress}%
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                    <p className="text-gray-400 font-bold uppercase text-[10px]">Units Completed</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {curriculumData?.unitsCompletedCount ?? 0} / {curriculumData?.totalUnitsCount ?? units.length} Units
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                    <p className="text-gray-400 font-bold uppercase text-[10px]">Teaching Hours Delivered</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {curriculumData?.totalDeliveredHours ?? 0} / {curriculumData?.totalPlannedHours ?? 0} Hours
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                    <p className="text-gray-400 font-bold uppercase text-[10px]">Pace Indicator</p>
                                    <p className="text-xl font-bold text-emerald-700">
                                        {overallProgress >= 70 ? "Ahead of Planned Pace" : overallProgress >= 40 ? "On Target Pace" : "Pacing in Progress"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Topics Coverage Management List (SRS 4.4.8) */}
                    <Card>
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                                    <Layers className="w-5 h-5 text-[#4085b3]" />
                                    <span>Curriculum Topics Coverage Status</span>
                                </CardTitle>
                                <p className="text-xs text-gray-500 mt-1">
                                    Mark topics as covered, record teaching progress, and log reasons for any schedule delays (SRS 4.4.8).
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setCoverUnitNumber(1);
                                    setCoverUnitTitle("");
                                    setCoverTopicNumber("");
                                    setCoverTopicTitle("");
                                    setCoverStatus("COMPLETED");
                                    setCoverDelayReason("");
                                    setCoverNotes("");
                                    setShowCoverTopicModal(true);
                                }}
                                className="px-3.5 py-2 bg-[#4085b3] hover:bg-[#356e94] text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors self-start sm:self-auto shrink-0 shadow-2xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Record Covered Topic</span>
                            </button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Filter Tabs: ALL | COMPLETED | IN_PROGRESS | PENDING */}
                            <div className="flex items-center space-x-2 border-b border-gray-100 pb-3 overflow-x-auto text-xs">
                                {(["ALL", "COMPLETED", "IN_PROGRESS", "PENDING"] as const).map((st) => (
                                    <button
                                        key={st}
                                        onClick={() => setProgressStatusFilter(st)}
                                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap ${
                                            progressStatusFilter === st
                                                ? "bg-[#4085b3] text-white"
                                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                    >
                                        {st === "ALL" ? "All Topics" : st.replace("_", " ")}
                                    </button>
                                ))}
                            </div>

                            {/* Flat or grouped topic coverage list */}
                            {(() => {
                                const allTopics: any[] = [];
                                (curriculumData?.units || []).forEach((u: any) => {
                                    (u.topics || []).forEach((t: any, idx: number) => {
                                        const isObj = typeof t === "object" && t !== null;
                                        allTopics.push({
                                            unitNumber: u.unitNumber || 1,
                                            unitTitle: u.title || `Unit ${u.unitNumber || 1}`,
                                            topicNumber: isObj ? (t.topicNumber || `${u.unitNumber}.${idx + 1}`) : `${u.unitNumber}.${idx + 1}`,
                                            title: isObj ? (t.title || "") : t,
                                            status: isObj && t.status ? t.status : "PENDING",
                                            completedAt: isObj ? t.completedAt : null,
                                            delayReason: isObj ? t.delayReason : null,
                                            notes: isObj ? t.notes : null,
                                            rawTopic: t,
                                            unit: u
                                        });
                                    });
                                });

                                const filteredTopics = allTopics.filter(t => {
                                    if (progressStatusFilter === "ALL") return true;
                                    return t.status === progressStatusFilter;
                                });

                                if (filteredTopics.length === 0) {
                                    return (
                                        <div className="py-12 text-center text-gray-400 space-y-3">
                                            <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                                            <p className="text-sm font-semibold text-gray-700">No topics match this status filter</p>
                                            <p className="text-xs text-gray-400 max-w-md mx-auto">
                                                Click "Record Covered Topic" above to manually log completed syllabus topics for this class.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    setCoverUnitNumber(1);
                                                    setCoverUnitTitle("");
                                                    setCoverTopicNumber("");
                                                    setCoverTopicTitle("");
                                                    setCoverStatus("COMPLETED");
                                                    setShowCoverTopicModal(true);
                                                }}
                                                className="px-4 py-2 bg-blue-50 text-[#4085b3] border border-blue-200 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors inline-flex items-center space-x-1"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span>Record Covered Topic</span>
                                            </button>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-2.5">
                                        {filteredTopics.map((topicItem, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-2xs hover:border-blue-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <div className="mt-0.5 shrink-0">
                                                        {topicItem.status === "COMPLETED" ? (
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                        ) : topicItem.status === "IN_PROGRESS" ? (
                                                            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                                                        ) : (
                                                            <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                                                        )}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                                Unit {topicItem.unitNumber} • {topicItem.topicNumber}
                                                            </span>
                                                            <h4 className="font-extrabold text-gray-900 text-xs">{topicItem.title}</h4>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                                                topicItem.status === "COMPLETED"
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : topicItem.status === "IN_PROGRESS"
                                                                    ? "bg-blue-50 text-blue-700"
                                                                    : "bg-gray-100 text-gray-500"
                                                            }`}>
                                                                {topicItem.status}
                                                            </span>
                                                        </div>

                                                        {topicItem.completedAt && (
                                                            <p className="text-[11px] text-emerald-700 font-semibold flex items-center space-x-1">
                                                                <span>Completed on:</span>
                                                                <span>{new Date(topicItem.completedAt).toLocaleDateString()}</span>
                                                            </p>
                                                        )}

                                                        {topicItem.delayReason && (
                                                            <p className="text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200/60 inline-flex items-center gap-1.5 mt-0.5">
                                                                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                                                <span><strong>Delay Reason (SRS 4.4.8):</strong> {topicItem.delayReason}</span>
                                                            </p>
                                                        )}

                                                        {topicItem.notes && (
                                                            <p className="text-[11px] text-gray-600 italic">
                                                                "{topicItem.notes}"
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                                                    <button
                                                        onClick={() => handleOpenCoverModal(topicItem.unit, topicItem.rawTopic)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center space-x-1 transition-colors ${
                                                            topicItem.status === "COMPLETED"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                                        }`}
                                                        title="Update Topic Coverage status (SRS 4.4.8)"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>{topicItem.status === "COMPLETED" ? "Update Coverage" : "Mark as Covered"}</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenQuickLog(topicItem.unit, topicItem.rawTopic)}
                                                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#4085b3] rounded-lg text-xs font-bold border border-blue-200 flex items-center space-x-1 transition-colors"
                                                        title="Log conducted lesson for this topic"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Log Lesson</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 3: RECORD LESSON LOGS & TOPICS COVERED */}
            {activeTab === "log" && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold text-gray-900 flex items-center space-x-2">
                                <FileText className="w-5 h-5 text-[#4085b3]" />
                                <span>Delivered Lesson Logs & Teaching Records</span>
                            </CardTitle>
                            <p className="text-xs text-gray-500 mt-1">
                                Record conducted classroom lessons, student attendance count, delivery status, and notes (SRS 4.4.7).
                            </p>
                        </div>
                        <button
                            onClick={() => setShowLogModal(true)}
                            className="px-3.5 py-1.5 bg-[#4085b3] text-white rounded-lg font-bold text-xs hover:bg-[#356e94] transition-colors flex items-center space-x-1 shadow-2xs"
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
                                {lessonLogs.map((log: any) => {
                                    const logTopic = log.topicTitle || log.topic;
                                    const logDate = log.lessonDate ? new Date(log.lessonDate).toLocaleDateString() : (log.date || "");
                                    const logUnit = log.unitNumber ? `Unit ${log.unitNumber}` : (log.unit || "Lesson");
                                    const logStatus = log.status || "COMPLETED";

                                    return (
                                        <div key={log.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-blue-100 text-[#4085b3] rounded font-bold text-[10px] uppercase">
                                                        {logUnit}
                                                    </span>
                                                    {log.periodNumber && (
                                                        <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">
                                                            Period {log.periodNumber}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-extrabold text-gray-900 text-sm">{logTopic}</h4>
                                                <p className="text-[10px] text-gray-500">
                                                    Date: <strong>{logDate}</strong>
                                                    {log.studentsAttending ? <> • Attending: <strong>{log.studentsAttending} Students</strong></> : null}
                                                </p>
                                                {(log.teachingNotes || log.note) && (
                                                    <p className="text-[11px] text-gray-600 italic mt-1">"{log.teachingNotes || log.note}"</p>
                                                )}
                                                {log.interruptionReason && (
                                                    <p className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold inline-block">
                                                        Interruption: {log.interruptionReason}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`px-3 py-1 rounded-full font-bold text-[11px] flex items-center space-x-1 shrink-0 ${
                                                logStatus === "COMPLETED"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : logStatus === "INTERRUPTED"
                                                    ? "bg-rose-100 text-rose-800"
                                                    : "bg-amber-100 text-amber-800"
                                            }`}>
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                <span>{logStatus.replace("_", " ")}</span>
                                            </span>
                                        </div>
                                    );
                                })}
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

            {/* MODAL 0: RECORD TOPIC COVERAGE (SRS 4.4.8) */}
            {showCoverTopicModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="font-extrabold text-gray-900 text-base flex items-center space-x-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                <span>Record Topic Coverage</span>
                            </h3>
                            <button onClick={() => setShowCoverTopicModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTopicCoverage} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Assigned Class / Section</label>
                                <select
                                    value={selectedAssignmentId}
                                    onChange={(e) => {
                                        setSelectedAssignmentId(e.target.value);
                                        handleSwitchAssignment(e.target.value);
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                >
                                    {classes.map((c, i) => {
                                        const a = c.assignment || c;
                                        return (
                                            <option key={a.id || i} value={a.id}>
                                                Grade {a.schoolGrade?.grade?.level}{a.section?.name ? `-${a.section.name}` : ""} • {a.subject?.name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Unit Number</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={coverUnitNumber}
                                        onChange={(e) => setCoverUnitNumber(Number(e.target.value))}
                                        required
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Unit Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Unit 1: Functions"
                                        value={coverUnitTitle}
                                        onChange={(e) => setCoverUnitTitle(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Topic Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1.2"
                                        value={coverTopicNumber}
                                        onChange={(e) => setCoverTopicNumber(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block font-bold text-gray-700 mb-1">Topic Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Solving Quadratic Equations"
                                        value={coverTopicTitle}
                                        onChange={(e) => setCoverTopicTitle(e.target.value)}
                                        required
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Coverage Status</label>
                                    <select
                                        value={coverStatus}
                                        onChange={(e) => setCoverStatus(e.target.value as any)}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] font-bold"
                                    >
                                        <option value="COMPLETED">COMPLETED (Covered)</option>
                                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                                        <option value="PENDING">PENDING (Upcoming)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Completion Date</label>
                                    <input
                                        type="date"
                                        value={coverDate}
                                        onChange={(e) => setCoverDate(e.target.value)}
                                        disabled={coverStatus !== "COMPLETED"}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                                    <span>Reason for Delay (Optional - SRS 4.4.8)</span>
                                    <span className="text-[10px] text-gray-400 font-normal">If topic fell behind schedule</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Schedule delays due to national exams, holidays, or remedial review..."
                                    value={coverDelayReason}
                                    onChange={(e) => setCoverDelayReason(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Teaching Remarks & Coverage Notes</label>
                                <textarea
                                    rows={2}
                                    placeholder="Key concepts mastered, student practice exercises, or follow-up notes..."
                                    value={coverNotes}
                                    onChange={(e) => setCoverNotes(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCoverTopicModal(false)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-[#4085b3] hover:bg-[#356e94] text-white font-bold rounded-xl flex items-center space-x-1"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span>Save Topic Coverage</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 1: LOG LESSON PROGRESS (SRS 4.4.7) */}
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
                                    onChange={(e) => {
                                        setSelectedAssignmentId(e.target.value);
                                        handleSwitchAssignment(e.target.value);
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                >
                                    {classes.map((c, i) => {
                                        const a = c.assignment || c;
                                        return (
                                            <option key={a.id || i} value={a.id}>
                                                Grade {a.schoolGrade?.grade?.level}{a.section?.name ? `-${a.section.name}` : ""} • {a.subject?.name}
                                            </option>
                                        );
                                    })}
                                </select>
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

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Lesson Date</label>
                                    <input
                                        type="date"
                                        value={lessonDate}
                                        onChange={(e) => setLessonDate(e.target.value)}
                                        required
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Period #</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={periodNumber}
                                        onChange={(e) => setPeriodNumber(Number(e.target.value))}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Attending #</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={studentsAttending}
                                        onChange={(e) => setStudentsAttending(Number(e.target.value))}
                                        className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Lesson Delivery Status</label>
                                <select
                                    value={lessonDeliveryStatus}
                                    onChange={(e) => setLessonDeliveryStatus(e.target.value as any)}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] font-bold"
                                >
                                    <option value="COMPLETED">COMPLETED (Delivered Fully)</option>
                                    <option value="PARTIALLY_COMPLETED">PARTIALLY COMPLETED</option>
                                    <option value="INTERRUPTED">INTERRUPTED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                </select>
                            </div>

                            {lessonDeliveryStatus === "INTERRUPTED" && (
                                <div>
                                    <label className="block font-bold text-rose-700 mb-1">Interruption Reason</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. School assembly, emergency drill, or power outage..."
                                        value={interruptionReason}
                                        onChange={(e) => setInterruptionReason(e.target.value)}
                                        required
                                        className="w-full bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-rose-400"
                                    />
                                </div>
                            )}

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
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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

            {/* MODAL 4: TOPIC DETAILS BREAKDOWN */}
            {selectedTopicModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100">
                        <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                            <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                    <span className="text-[11px] font-extrabold text-[#4085b3] bg-blue-50 px-2 py-0.5 rounded uppercase">
                                        Topic {selectedTopicModal.topicNumber || "Syllabus"}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                        selectedTopicModal.status === "COMPLETED"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : selectedTopicModal.status === "IN_PROGRESS"
                                            ? "bg-blue-100 text-[#4085b3]"
                                            : "bg-gray-100 text-gray-600"
                                    }`}>
                                        {selectedTopicModal.status || "PENDING"}
                                    </span>
                                </div>
                                <h3 className="font-extrabold text-gray-900 text-base leading-snug">
                                    {selectedTopicModal.title}
                                </h3>
                                <p className="text-[11px] text-gray-500 font-medium">
                                    {selectedTopicModal.unitNumber ? `${selectedTopicModal.unitNumber}: ` : ""}{selectedTopicModal.unitTitle || ""}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedTopicModal(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-xs">
                            {/* Key Concepts */}
                            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                                <h4 className="font-extrabold text-gray-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-[#4085b3]" />
                                    <span>Core Pedagogical Concepts to Cover:</span>
                                </h4>
                                <p className="text-gray-700 leading-relaxed text-[11px]">
                                    {selectedTopicModal.keyConcepts || "No pedagogical concept notes provided."}
                                </p>
                            </div>

                            {/* Competencies */}
                            {selectedTopicModal.competencies && (
                                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
                                    <h4 className="font-extrabold text-blue-900 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                        <Target className="w-3.5 h-3.5 text-[#4085b3]" />
                                        <span>Target Student Learning Competency:</span>
                                    </h4>
                                    <p className="text-blue-950 leading-relaxed text-[11px]">
                                        {selectedTopicModal.competencies}
                                    </p>
                                </div>
                            )}

                            {/* Pacing Info */}
                            <div className="grid grid-cols-2 gap-3 text-center">
                                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Planned Time</span>
                                    <span className="text-xs font-black text-gray-900">{selectedTopicModal.plannedHours ?? 0} Periods</span>
                                </div>
                                <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Delivery Status</span>
                                    <span className="text-xs font-black text-gray-900">
                                        {selectedTopicModal.completedDate ? `Delivered on ${selectedTopicModal.completedDate}` : "Not yet delivered"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    const t = selectedTopicModal;
                                    setSelectedTopicModal(null);
                                    handleOpenDifficulty(t);
                                }}
                                className="w-full sm:w-auto px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl text-xs border border-amber-200 flex items-center justify-center space-x-1 transition-colors"
                            >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Report Difficulty</span>
                            </button>

                            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTopicModal(null)}
                                    className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const t = selectedTopicModal;
                                        setSelectedTopicModal(null);
                                        setUnitName(t.unitTitle || "");
                                        setTopicName(t.title);
                                        setShowLogModal(true);
                                    }}
                                    className="px-4 py-2 bg-[#4085b3] hover:bg-[#356e94] text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Log Lesson for this Topic</span>
                                </button>
                            </div>
                        </div>
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
