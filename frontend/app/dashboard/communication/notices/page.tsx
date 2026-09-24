"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    AlertTriangle, 
    Plus, 
    Search, 
    Sparkles, 
    Pin, 
    ShieldAlert, 
    X,
    FileText
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImportantNoticesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [notices, setNotices] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [form, setForm] = useState({
        title: "",
        content: "",
        noticeType: "EMERGENCY"
    });

    const loadNotices = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/communication/notices");
            if (res.ok) {
                const data = await res.json();
                setNotices(Array.isArray(data) ? data : []);
            } else {
                setNotices([]);
            }
        } catch (err: any) {
            console.error(err);
            setNotices([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotices();
    }, []);

    const handleCreateNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) return;

        try {
            setSubmitting(true);
            const res = await fetchApi("/communication/notices", {
                method: "POST",
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setForm({ title: "", content: "", noticeType: "EMERGENCY" });
                loadNotices();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteNotice = async (id: string) => {
        if (!confirm("Are you sure you want to delete this notice?")) return;
        try {
            const res = await fetchApi(`/communication/notices/${id}`, { method: "DELETE" });
            if (res.ok) {
                setNotices(prev => prev.filter(n => n.id !== id));
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete notice");
            }
        } catch (_) {
            alert("Failed to delete notice");
        }
    };

    if (loading) return <LoadingState message="Loading notices..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span>Important Notices</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Urgent directives, emergency warnings, and official safety alerts.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-red-700 hover:bg-red-800 text-white text-xs h-9">
                    New Notice
                </Button>
            </div>

            {/* Notices List */}
            <div className="space-y-3">
                {notices.length === 0 ? (
                    <Card className="shadow-sm">
                        <CardContent className="p-8 text-center text-gray-500">
                            <ShieldAlert className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                            <p className="text-sm font-medium text-gray-700">No active notices</p>
                            <p className="text-xs text-gray-400 mt-1">High-priority and emergency announcements will appear here.</p>
                        </CardContent>
                    </Card>
                ) : (
                    notices.map((item) => (
                        <Card key={item.id} className="shadow-sm border-l-4 border-l-red-600 hover:shadow-md transition-shadow">
                            <CardHeader className="py-3.5 border-b border-gray-100 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 flex items-center">
                                            <Pin className="w-3 h-3 mr-1" /> {item.noticeType}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <CardTitle className="text-base font-bold text-gray-900">{item.title}</CardTitle>
                                </div>
                                <button
                                    onClick={() => handleDeleteNotice(item.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded ml-2 flex-shrink-0"
                                    title="Delete notice"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </CardHeader>
                            <CardContent className="py-3.5 text-xs text-gray-700">
                                <p className="whitespace-pre-line leading-relaxed">{item.content}</p>
                                <p className="text-[11px] text-gray-400 mt-2">
                                    Published by {item.author?.name || "Administration"} &middot; {new Date(item.createdAt).toLocaleDateString()}
                                </p>
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
                            <h3 className="text-lg font-bold text-red-900">Publish Pinned Notice / Directive</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleCreateNotice} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notice Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Ministry Directive: Heavy Rain School Closure Warning"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notice Category</label>
                                <select
                                    value={form.noticeType}
                                    onChange={(e) => setForm({ ...form, noticeType: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600 bg-white"
                                >
                                    <option value="EMERGENCY">Emergency Alert</option>
                                    <option value="COMPLIANCE">Ministry Compliance Directive</option>
                                    <option value="SAFETY">Safety Warning</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notice Details *</label>
                                <textarea
                                    required
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    placeholder="Write mandatory compliance or safety notice details..."
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-600"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-3 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button type="submit" isLoading={submitting} className="bg-red-700 hover:bg-red-800 text-white">Publish Directive</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
