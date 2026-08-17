"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { ArrowLeft, Plus, Save, CheckCircle2, ClipboardList } from "lucide-react";

export default function TeacherAssessmentPage() {
    const [assessments, setAssessments] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [resultsMap, setResultsMap] = useState<Record<string, { score: number; feedback: string }>>({});
    const [showModal, setShowModal] = useState(false);
    
    // New assessment form
    const [newTitle, setNewTitle] = useState("");
    const [newType, setNewType] = useState("EXAM");
    const [newMaxScore, setNewMaxScore] = useState(100);
    const [newAssignmentId, setNewAssignmentId] = useState("");
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        async function loadInitialData() {
            try {
                const [assRes, classRes] = await Promise.all([
                    fetchApi("/assessment"),
                    fetchApi("/teacher/my-classes")
                ]);

                const assData = assRes.ok ? await assRes.json() : [];
                const classData = classRes.ok ? await classRes.json() : [];

                setAssessments(Array.isArray(assData) ? assData : []);
                setClasses(Array.isArray(classData) ? classData : []);

                if (Array.isArray(classData) && classData.length > 0) {
                    setNewAssignmentId(classData[0].assignment?.id || "");
                }
                if (Array.isArray(assData) && assData.length > 0) {
                    selectAssessment(assData[0], Array.isArray(classData) ? classData : []);
                }
            } catch (err) {
                console.error("Failed to load assessments:", err);
            } finally {
                setLoading(false);
            }
        }
        loadInitialData();
    }, []);

    const selectAssessment = (ass: any, classList: any[] = classes) => {
        setSelectedAssessment(ass);
        const matchedClass = classList.find((c: any) => c.assignment?.id === ass.teachingAssignmentId);
        if (matchedClass) {
            setStudents(matchedClass.students || []);
            const map: Record<string, { score: number; feedback: string }> = {};
            (matchedClass.students || []).forEach((st: any) => {
                const existingResult = ass.results?.find((r: any) => r.enrollmentId === st.id);
                map[st.id] = {
                    score: existingResult?.score || 0,
                    feedback: existingResult?.feedback || ""
                };
            });
            setResultsMap(map);
        } else {
            setStudents([]);
            setResultsMap({});
        }
    };

    const handleCreateAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle || !newAssignmentId) return;

        try {
            const selectedAssignment = classes.find((c: any) => c.assignment?.id === newAssignmentId);
            const res = await fetchApi("/assessment", {
                method: "POST",
                body: JSON.stringify({
                    academicYearId: selectedAssignment?.assignment?.academicYearId,
                    teachingAssignmentId: newAssignmentId,
                    title: newTitle,
                    type: newType,
                    maxScore: Number(newMaxScore)
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to create assessment");
            }

            const created = await res.json();
            setAssessments([created, ...assessments]);
            setShowModal(false);
            setNewTitle("");
            selectAssessment(created, classes);
        } catch (err: any) {
            alert(err.message || "Failed to create assessment");
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
            setMsg("Assessment results saved successfully!");
        } catch (err: any) {
            alert(err.message || "Failed to save results");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full max-w-6xl mx-auto p-12 text-center text-gray-500">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                Loading assessment management...
            </div>
        );
    }

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Link href="/dashboard/teacher" className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Assessments & Grade Entry</h1>
                        <p className="text-sm text-gray-500">Create quizzes, exams, and enter student test scores with remarks.</p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 flex items-center space-x-2 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Assessment</span>
                    </button>
                    {selectedAssessment && (
                        <button
                            onClick={handleSaveResults}
                            disabled={saving}
                            className="px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center space-x-2 shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            <span>{saving ? "Saving..." : "Save Scores"}</span>
                        </button>
                    )}
                </div>
            </div>

            {msg && (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center space-x-2 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>{msg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Assessment Sidebar List */}
                <div className="space-y-3">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Created Assessments</h2>
                    <div className="space-y-2">
                        {assessments.length === 0 ? (
                            <p className="text-xs text-gray-400 p-3 bg-white rounded-xl border border-gray-100">No assessments created yet.</p>
                        ) : (
                            assessments.map((ass) => (
                                <button
                                    key={ass.id}
                                    onClick={() => selectAssessment(ass)}
                                    className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all ${
                                        selectedAssessment?.id === ass.id
                                            ? "bg-purple-50 border-purple-500 font-semibold text-purple-900 shadow-sm"
                                            : "bg-white border-gray-100 hover:bg-gray-50 text-gray-800"
                                    }`}
                                >
                                    <p className="font-bold">{ass.title}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Type: {ass.type} • Max Score: {ass.maxScore}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Grade Entry Table */}
                <div className="lg:col-span-3 space-y-4">
                    {selectedAssessment ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{selectedAssessment.title}</h3>
                                    <p className="text-xs text-gray-500">
                                        Subject: {selectedAssessment.teachingAssignment?.subject?.name || "Assigned Subject"} • Max Score: {selectedAssessment.maxScore}
                                    </p>
                                </div>
                                <span className="text-xs font-medium px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                                    {students.length} Students Listed
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-600">
                                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-3">Student Name</th>
                                            <th className="px-6 py-3">Score / {selectedAssessment.maxScore}</th>
                                            <th className="px-6 py-3">Teacher Remarks & Feedback</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {students.length > 0 ? (
                                            students.map((st: any) => {
                                                const res = resultsMap[st.id] || { score: 0, feedback: "" };
                                                return (
                                                    <tr key={st.id} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 font-medium text-gray-900">
                                                            {st.student?.firstName} {st.student?.lastName}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="number"
                                                                max={selectedAssessment.maxScore}
                                                                min={0}
                                                                value={res.score}
                                                                onChange={(e) =>
                                                                    setResultsMap({
                                                                        ...resultsMap,
                                                                        [st.id]: { ...res, score: Number(e.target.value) }
                                                                    })
                                                                }
                                                                className="w-24 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500 font-bold"
                                                            />
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <input
                                                                type="text"
                                                                placeholder="Add feedback..."
                                                                value={res.feedback}
                                                                onChange={(e) =>
                                                                    setResultsMap({
                                                                        ...resultsMap,
                                                                        [st.id]: { ...res, feedback: e.target.value }
                                                                    })
                                                                }
                                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                                                    No students found for this assessment's section roster.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-gray-100">
                            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p>Select or create an assessment to begin entering grades.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Assessment Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900">Create New Assessment</h3>
                        <form onSubmit={handleCreateAssessment} className="space-y-4 text-sm">
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Target Class / Subject</label>
                                <select
                                    value={newAssignmentId}
                                    onChange={(e) => setNewAssignmentId(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg"
                                >
                                    {classes.map((cls: any) => (
                                        <option key={cls.assignment?.id} value={cls.assignment?.id}>
                                            {cls.assignment?.subject?.name} - Grade {cls.assignment?.schoolGrade?.grade?.name} ({cls.assignment?.section?.name || 'Section'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Assessment Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mid-Term Quiz 1"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    required
                                    className="w-full p-2.5 border rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value)}
                                        className="w-full p-2.5 border rounded-lg"
                                    >
                                        <option value="EXAM">EXAM</option>
                                        <option value="QUIZ">QUIZ</option>
                                        <option value="ASSIGNMENT">ASSIGNMENT</option>
                                        <option value="PROJECT">PROJECT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-medium text-gray-700 mb-1">Max Score</label>
                                    <input
                                        type="number"
                                        value={newMaxScore}
                                        onChange={(e) => setNewMaxScore(Number(e.target.value))}
                                        required
                                        className="w-full p-2.5 border rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                >
                                    Save & Proceed
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
