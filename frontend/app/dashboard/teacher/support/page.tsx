"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { HeartHandshake, ArrowLeft, Plus, CheckCircle2, AlertCircle, Inbox } from "lucide-react";

export default function StudentSupportPage() {
    const [supportFlags, setSupportFlags] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    
    const [enrollmentId, setEnrollmentId] = useState("");
    const [type, setType] = useState("ACADEMIC");
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSupportData() {
            try {
                const [flagsRes, stRes] = await Promise.all([
                    fetchApi("/teacher/learning/support"),
                    fetchApi("/teacher/my-students")
                ]);

                const flagsData = flagsRes.ok ? await flagsRes.json() : [];
                const stData = stRes.ok ? await stRes.json() : [];

                setSupportFlags(Array.isArray(flagsData) ? flagsData : []);
                setStudents(Array.isArray(stData) ? stData : []);
                if (Array.isArray(stData) && stData.length > 0) {
                    setEnrollmentId(stData[0].id);
                }
            } catch (err) {
                console.error("Failed to load support flags:", err);
            } finally {
                setLoading(false);
            }
        }
        loadSupportData();
    }, []);

    async function handleRaiseFlag(e: React.FormEvent) {
        e.preventDefault();
        if (!enrollmentId || !description) return;

        try {
            const res = await fetchApi("/teacher/support-flag", {
                method: "POST",
                body: JSON.stringify({
                    enrollmentId,
                    type,
                    description
                })
            });

            if (res.ok) {
                const created = await res.json();
                setSupportFlags([created, ...supportFlags]);
                setShowModal(false);
                setDescription("");
            }
        } catch (err: any) {
            alert(err.message || "Failed to raise support flag");
        }
    }

    async function handleResolveFlag(flagId: string) {
        try {
            const res = await fetchApi(`/teacher/support-flag/${flagId}/resolve`, {
                method: "POST",
                body: JSON.stringify({ resolution: "Teacher intervention completed" })
            });

            if (res.ok) {
                setSupportFlags(supportFlags.map((f) => f.id === flagId ? { ...f, resolvedAt: new Date().toISOString() } : f));
            }
        } catch (err: any) {
            alert(err.message || "Failed to resolve support flag");
        }
    }

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading student support & intervention flags...</p>
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
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Student Support & Interventions</h1>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">
                            Identify at-risk students, flag academic or attendance hurdles, and document support outcomes.
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center space-x-2 shadow-2xs self-start md:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span>Raise Support Flag</span>
                </button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                        <HeartHandshake className="w-5 h-5 text-blue-600" />
                        <span>Active & Resolved Support Flags</span>
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {supportFlags.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 space-y-2">
                            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                            <p className="text-sm font-semibold text-gray-700">No active student support flags</p>
                            <p className="text-xs text-gray-400">All students in your assigned sections are currently performing without intervention flags.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {supportFlags.map((flag) => {
                                const isResolved = Boolean(flag.resolvedAt);
                                return (
                                    <div key={flag.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                                        <div className="space-y-1">
                                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                                                isResolved ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                                            }`}>
                                                {flag.type} • {isResolved ? "RESOLVED" : "ACTIVE"}
                                            </span>
                                            <p className="font-bold text-gray-900 text-sm mt-1">{flag.description}</p>
                                            <p className="text-[10px] text-gray-400 font-medium">Logged: {new Date(flag.createdAt).toLocaleDateString()}</p>
                                        </div>

                                        {!isResolved && (
                                            <button
                                                onClick={() => handleResolveFlag(flag.id)}
                                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 transition-colors shadow-2xs"
                                            >
                                                Mark Resolved
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Raise Flag Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
                        <h3 className="font-bold text-gray-900 text-sm">Raise Student Support Flag</h3>
                        <form onSubmit={handleRaiseFlag} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Target Student</label>
                                <select
                                    value={enrollmentId}
                                    onChange={(e) => setEnrollmentId(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
                                >
                                    {students.map((s, i) => {
                                        const st = s.student || s;
                                        return (
                                            <option key={s.id || i} value={s.id}>
                                                {st.firstName} {st.lastName} (Grade {s.schoolGrade?.grade?.level}{s.section?.name})
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Flag Type</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200"
                                >
                                    <option value="ACADEMIC">ACADEMIC (Low Performance)</option>
                                    <option value="ATTENDANCE">ATTENDANCE (Frequent Absence)</option>
                                    <option value="BEHAVIORAL">BEHAVIORAL</option>
                                    <option value="MEDICAL">MEDICAL</option>
                                    <option value="OTHER">OTHER</option>
                                </select>
                            </div>
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Description & Reason</label>
                                <textarea
                                    placeholder="Explain observed difficulty or academic concern..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 h-20"
                                    required
                                />
                            </div>
                            <div className="flex space-x-2 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-xl">Raise Flag</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
