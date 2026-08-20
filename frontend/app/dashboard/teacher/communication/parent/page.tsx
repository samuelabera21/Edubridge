"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Users, ArrowLeft, Send, CheckCircle2 } from "lucide-react";

export default function ParentCommunicationPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
    const [message, setMessage] = useState("");
    const [sentMessages, setSentMessages] = useState<any[]>([]);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStudents() {
            try {
                const res = await fetchApi("/teacher/my-students");
                if (res.ok) {
                    const data = await res.json();
                    const list = Array.isArray(data) ? data : [];
                    setStudents(list);
                    if (list.length > 0) {
                        setSelectedEnrollmentId(list[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to load students:", err);
            } finally {
                setLoading(false);
            }
        }
        loadStudents();
    }, []);

    async function handleSendMessage(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedEnrollmentId || !message) return;
        setSending(true);

        try {
            const res = await fetchApi("/teacher/parent-message", {
                method: "POST",
                body: JSON.stringify({
                    enrollmentId: selectedEnrollmentId,
                    message
                })
            });

            if (res.ok) {
                const selectedSt = students.find((s) => s.id === selectedEnrollmentId);
                const stName = selectedSt ? `${selectedSt.student?.firstName} ${selectedSt.student?.lastName}` : "Parent";
                setSentMessages([
                    { id: Date.now(), recipient: stName, message, sentAt: new Date().toLocaleTimeString() },
                    ...sentMessages
                ]);
                setMessage("");
            }
        } catch (err: any) {
            alert(err.message || "Failed to send message");
        } finally {
            setSending(false);
        }
    }

    if (loading) {
        return (
            <div className="w-full max-w-7xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-sm font-semibold text-gray-600">Loading parent contacts...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Parent Communication Portal</h1>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                        Send direct progress updates, attendance notifications, and messages to guardians.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Compose Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <Users className="w-5 h-5 text-blue-600" />
                            <span>Compose Message to Guardian</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendMessage} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Select Student / Guardian</label>
                                <select
                                    value={selectedEnrollmentId}
                                    onChange={(e) => setSelectedEnrollmentId(e.target.value)}
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
                                <label className="block font-bold text-gray-700 mb-1">Message Content</label>
                                <textarea
                                    placeholder="Write your note or update to the guardian..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full p-2.5 rounded-lg border border-gray-200 h-32"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={sending}
                                className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2 shadow-2xs"
                            >
                                <Send className="w-4 h-4" />
                                <span>{sending ? "Sending..." : "Send Message"}</span>
                            </button>
                        </form>
                    </CardContent>
                </Card>

                {/* Sent Messages Log */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2 text-base font-bold text-gray-900">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span>Sent Communication Log</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {sentMessages.length === 0 ? (
                            <div className="py-12 text-center text-gray-400 text-xs">
                                No messages sent in this session yet.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sentMessages.map((m) => (
                                    <div key={m.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1 text-xs">
                                        <div className="flex justify-between font-bold text-gray-900">
                                            <span>Guardian of {m.recipient}</span>
                                            <span className="text-[10px] text-gray-400">{m.sentAt}</span>
                                        </div>
                                        <p className="text-gray-600">{m.message}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
