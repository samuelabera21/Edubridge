"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    GraduationCap, 
    Plus, 
    Search, 
    Sparkles, 
    User, 
    Calendar, 
    X,
    FileText,
    Trash2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function StudentCommunicationPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        title: "",
        content: "",
        target: "STUDENTS"
    });

    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/communication/announcements?target=STUDENTS");
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(Array.isArray(data) ? data : []);
            } else {
                setAnnouncements([]);
            }
        } catch (err: any) {
            console.error(err);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnnouncements();
    }, []);

    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/communication/announcements", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({ title: "", content: "", target: "STUDENTS" });
                loadAnnouncements();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm("Are you sure you want to delete this broadcast?")) return;
        try {
            const res = await fetchApi(`/communication/announcements/${id}`, { method: "DELETE" });
            if (res.ok) {
                setAnnouncements(prev => prev.filter(a => a.id !== id));
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete broadcast");
            }
        } catch (_) {
            alert("Failed to delete broadcast");
        }
    };

    if (loading) return <LoadingState message="Loading broadcasts..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <GraduationCap className="w-5 h-5 text-blue-600" />
                        <span>Student Broadcasts</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Announcements and notices for enrolled students.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#006b3f] hover:bg-[#005432] text-xs h-9">
                    New Broadcast
                </Button>
            </div>

            {/* Announcements List */}
            <div className="space-y-3">
                {announcements.length === 0 ? (
                    <Card className="shadow-sm">
                        <CardContent className="p-8 text-center text-gray-500">
                            <GraduationCap className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm font-medium text-gray-700">No student broadcasts</p>
                            <p className="text-xs text-gray-400 mt-1">Announcements targeted to students will appear here.</p>
                        </CardContent>
                    </Card>
                ) : (
                    announcements.map((item) => (
                        <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="py-3.5 border-b border-gray-100 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800">
                                            STUDENTS
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <CardTitle className="text-base font-bold text-gray-900">{item.title}</CardTitle>
                                </div>
                                <button
                                    onClick={() => handleDeleteAnnouncement(item.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded ml-2 flex-shrink-0"
                                    title="Delete broadcast"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </CardHeader>
                            <CardContent className="py-3.5 text-xs text-gray-700">
                                <p className="whitespace-pre-line leading-relaxed">{item.content}</p>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="text-lg font-bold text-gray-900">Post Student Notice</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notice Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Mid-Term Examination Room Conduct Rules"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notice Details *</label>
                                <textarea
                                    required
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    placeholder="Write details for students here..."
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f]"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432]">Publish Notice</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
