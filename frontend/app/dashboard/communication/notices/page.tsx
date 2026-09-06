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

    if (loading) return <LoadingState message="Loading high-priority notices & emergency directives from database..." />;

    return (
        <div className="space-y-6 text-black">
            {/* SRS Context Banner */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                    <span className="font-bold text-sm text-red-900 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1.5 text-red-700" />
                        SRS Domain 11.6: Pinned High-Priority Notices & Compliance Directives
                    </span>
                    <p className="text-red-800">
                        <strong>Who Uses This:</strong> School Principal & Regional Education Compliance Officers.
                        <br />
                        <strong>Data Source:</strong> Database table `important_notice` queried via REST API (`/api/communication/notices`).
                        <br />
                        <strong>SRS Purpose:</strong> Emergency weather/health closures, Ministry of Education policy compliance directives, and mandatory safety announcements.
                    </p>
                </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <AlertTriangle className="w-7 h-7 text-red-600" />
                        <span>6. Important Notices & Directives</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Pinned emergency warnings, safety alerts, and Ministry directives.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="bg-red-700 hover:bg-red-800 text-white">
                    Publish Pinned Notice
                </Button>
            </div>

            {/* Notices List */}
            <div className="space-y-4">
                {notices.length === 0 ? (
                    <Card className="shadow-sm border-red-100 bg-red-50/20">
                        <CardContent className="p-12 text-center text-gray-500">
                            <ShieldAlert className="w-12 h-12 mx-auto text-red-300 mb-2" />
                            <p className="font-semibold text-gray-800">No active high-priority notices in database</p>
                            <p className="text-xs text-gray-400 mt-1">Click "Publish Pinned Notice" above to issue an urgent emergency announcement.</p>
                        </CardContent>
                    </Card>
                ) : (
                    notices.map((item) => (
                        <Card key={item.id} className="shadow-sm border-l-4 border-l-red-600 hover:shadow-md transition-shadow">
                            <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center">
                                            <Pin className="w-3 h-3 mr-1" /> PINNED DIRECTIVE ({item.noticeType})
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-gray-900">{item.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="py-4 text-sm text-gray-700">
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
