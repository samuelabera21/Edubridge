"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ClipboardCheck, ArrowLeft, Plus, Inbox } from "lucide-react";

type StudentEnrollment = {
    id: string;
    status: string;
    student: { firstName: string; lastName: string; studentId: string };
};

type TeacherClass = {
    id: string;
    assignment?: {
        id: string;
        academicYearId: string;
        schoolGrade?: { grade?: { level?: string | number } };
        section?: { name?: string } | null;
        subject?: { name?: string };
    };
    schoolGrade?: { grade?: { level?: string | number } };
    section?: { name?: string } | null;
    subject?: { name?: string };
    students?: StudentEnrollment[];
};

type LearningActivity = {
    id: string;
    title: string;
    description?: string | null;
    type: string;
    supportCategory?: string | null;
    dueDate?: string | null;
};

export default function ActivitiesPage() {
    const [activities, setActivities] = useState<LearningActivity[]>([]);
    const [classes, setClasses] = useState<TeacherClass[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [title, setTitle] = useState("");
    const [type, setType] = useState("HOMEWORK");
    const [supportCategory, setSupportCategory] = useState("");
    const [targetEnrollmentIds, setTargetEnrollmentIds] = useState<string[]>([]);
    const [dueDate, setDueDate] = useState("");
    const [assignmentId, setAssignmentId] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadInitialData() {
            try {
                const [actRes, classRes] = await Promise.all([
                    fetchApi("/teacher/learning/activity"),
                    fetchApi("/teacher/my-classes")
                ]);

                const actData = actRes.ok ? await actRes.json() : [];
                const classData = classRes.ok ? await classRes.json() : [];

                const activityList = Array.isArray(actData) ? actData as LearningActivity[] : [];
                const classList = Array.isArray(classData) ? classData as TeacherClass[] : [];
                setActivities(activityList);
                setClasses(classList);
                if (classList.length > 0) {
                    setAssignmentId(classList[0].assignment?.id || classList[0].id);
                }
            } catch (err) {
                console.error("Failed to load learning activities:", err);
            } finally {
                setLoading(false);
            }
        }
        loadInitialData();
    }, []);

    async function handleCreateActivity(e: React.FormEvent) {
        e.preventDefault();
        if (!title || !assignmentId) return;
        if (supportCategory && targetEnrollmentIds.length === 0) {
            alert("Select at least one student for this support activity.");
            return;
        }

        try {
            const selectedAssignment = classes.find((item) => (item.assignment?.id || item.id) === assignmentId);
            const res = await fetchApi("/teacher/learning/activity", {
                method: "POST",
                body: JSON.stringify({
                    academicYearId: selectedAssignment?.assignment?.academicYearId || "active-year",
                    teachingAssignmentId: assignmentId,
                    title,
                    type,
                    dueDate: dueDate || null,
                    supportCategory: supportCategory || null,
                    targetEnrollmentIds
                })
            });

            if (res.ok) {
                const created = await res.json();
                setActivities([created, ...activities]);
                setShowModal(false);
                setTitle("");
                setSupportCategory("");
                setTargetEnrollmentIds([]);
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to create activity");
        }
    }

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading learning activities...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Learning Activities & Assignments</h1>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Post homework, practice worksheets, and review student coursework submissions.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-2xs self-start md:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span>Create Learning Activity</span>
                </button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                        <ClipboardCheck className="w-5 h-5 text-blue-600" />
                        <span>Active Learning Activities</span>
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {activities.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 space-y-2">
                            <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                            <p className="text-sm font-semibold text-gray-600">No learning activities posted yet</p>
                            <p className="text-xs text-gray-400">Click &quot;Create Learning Activity&quot; above to post homework or practice assignments for your classes.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activities.map((act) => (
                                <div key={act.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-full text-[10px] uppercase">
                                            {act.type}
                                        </span>
                                        {act.dueDate && (
                                            <span className="text-[10px] text-gray-400 font-medium">Due: {new Date(act.dueDate).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-sm">{act.title}</h4>
                                    <p className="text-[11px] text-gray-500">{act.description || "Homework assignment for practice."}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Activity Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <h3 className="font-bold text-gray-900 text-sm">Post New Learning Activity</h3>
                        <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Target Class</label>
                                <select
                                    value={assignmentId}
                                    onChange={(e) => {
                                        setAssignmentId(e.target.value);
                                        setTargetEnrollmentIds([]);
                                    }}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
                                >
                                    {classes.map((item, i) => {
                                        const a = item.assignment || item;
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
                                    placeholder="e.g. Chapter 4 Practice Exercises"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Activity Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
                                >
                                    <option value="HOMEWORK">HOMEWORK</option>
                                    <option value="READING">READING</option>
                                    <option value="LAB">LAB</option>
                                    <option value="PRACTICE">PRACTICE</option>
                                </select>
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Support Purpose</label>
                                <select
                                    value={supportCategory}
                                    onChange={(event) => {
                                        setSupportCategory(event.target.value);
                                        setTargetEnrollmentIds([]);
                                    }}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
                                >
                                    <option value="">General class activity</option>
                                    <option value="RECOMMENDATION">Recommendation</option>
                                    <option value="REMEDIAL">Remedial support</option>
                                    <option value="ENRICHMENT">Enrichment</option>
                                </select>
                            </div>
                            {supportCategory && (() => {
                                const selectedClass = classes.find((item) => (item.assignment?.id || item.id) === assignmentId);
                                const roster = (selectedClass?.students || []).filter((enrollment) => ["ACTIVE", "ENROLLED"].includes(enrollment.status));
                                return (
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Assign to students</label>
                                        <select
                                            multiple
                                            value={targetEnrollmentIds}
                                            onChange={(event) => setTargetEnrollmentIds(Array.from(event.target.selectedOptions, (option) => option.value))}
                                            className="w-full min-h-32 p-2.5 rounded-lg border border-gray-200"
                                            required
                                        >
                                            {roster.map((enrollment) => (
                                                <option key={enrollment.id} value={enrollment.id}>
                                                    {enrollment.student.firstName} {enrollment.student.lastName} · {enrollment.student.studentId}
                                                </option>
                                            ))}
                                        </select>
                                        {roster.length === 0 && <p className="mt-1 text-xs text-amber-700">No currently enrolled students are available in this class.</p>}
                                    </div>
                                );
                            })()}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
                                />
                            </div>
                            <div className="flex space-x-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl">Post Activity</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
