"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { FileText, ArrowLeft, Plus, CheckCircle2, Inbox } from "lucide-react";

export default function CurriculumPage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [lessons, setLessons] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [topic, setTopic] = useState("");
    const [unit, setUnit] = useState("");
    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadClasses() {
            try {
                const res = await fetchApi("/teacher/my-classes");
                if (res.ok) {
                    const data = await res.json();
                    const list = Array.isArray(data) ? data : [];
                    setClasses(list);
                    if (list.length > 0) {
                        setSelectedAssignmentId(list[0].assignment?.id || list[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to load classes:", err);
            } finally {
                setLoading(false);
            }
        }
        loadClasses();
    }, []);

    function handleAddLesson(e: React.FormEvent) {
        e.preventDefault();
        if (!topic) return;
        const newLesson = {
            id: `les-${Date.now()}`,
            topic,
            unit: unit || "Unit 1",
            date: new Date().toISOString().split('T')[0],
            assignmentId: selectedAssignmentId
        };
        setLessons([newLesson, ...lessons]);
        setTopic("");
        setUnit("");
        setShowModal(false);
    }

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading curriculum progress...</p>
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
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Lesson & Curriculum Progress</h1>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Record delivered lesson topics, syllabus units covered, and classroom teaching logs.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-2xs self-start md:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span>Log Lesson Progress</span>
                </button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span>Delivered Lesson Logs</span>
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {lessons.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 space-y-2">
                            <Inbox className="w-10 h-10 mx-auto text-gray-300" />
                            <p className="text-sm font-semibold text-gray-600">No lesson logs recorded yet</p>
                            <p className="text-xs text-gray-400">Click "Log Lesson Progress" above to record covered curriculum topics and lesson notes.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lessons.map((les) => (
                                <div key={les.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                                    <div className="space-y-1">
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px] uppercase">{les.unit}</span>
                                        <h4 className="font-bold text-gray-900 text-sm">{les.topic}</h4>
                                        <p className="text-[10px] text-gray-400 font-medium">Logged Date: {les.date}</p>
                                    </div>
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] flex items-center space-x-1">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <h3 className="font-bold text-gray-900 text-sm">Log Conducted Lesson</h3>
                        <form onSubmit={handleAddLesson} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Target Class / Section</label>
                                <select
                                    value={selectedAssignmentId}
                                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
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
                                    placeholder="e.g. Unit 3: Linear Algebra"
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Topic Covered</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Matrix Multiplication & Determinants"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
                                    required
                                />
                            </div>
                            <div className="flex space-x-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl">Save Log</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
