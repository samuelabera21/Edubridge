"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Briefcase, 
    Plus, 
    Search, 
    Calendar, 
    User,
    X,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function StaffCommunicationPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const [form, setForm] = useState({
        title: "",
        content: "",
        target: "STAFF"
    });

    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/communication/announcements?target=STAFF");
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

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            return !searchQuery.trim() ||
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.content?.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [announcements, searchQuery]);

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
                setForm({ title: "", content: "", target: "STAFF" });
                loadAnnouncements();
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm("Are you sure you want to delete this circular?")) return;
        try {
            const res = await fetchApi(`/communication/announcements/${id}`, { method: "DELETE" });
            if (res.ok) {
                setAnnouncements(prev => prev.filter(a => a.id !== id));
            } else {
                const data = await res.json();
                alert(data.error || "Failed to delete circular");
            }
        } catch (_) {
            alert("Failed to delete circular");
        }
    };

    if (loading) return <LoadingState message="Loading circulars..." />;

    return (
        <div className="space-y-5 text-gray-900">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-gray-200">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-slate-700" />
                        <span>Staff Circulars & Memos</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Administrative and facility notices for operational and support staff.</p>
                </div>
                <Button 
                    onClick={() => setIsModalOpen(true)} 
                    leftIcon={<Plus className="w-4 h-4" />} 
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-9 px-4 font-medium shadow-sm"
                >
                    New Memo
                </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search staff memos..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-700"
                />
            </div>

            {/* Circulars List */}
            <div className="space-y-3">
                {filteredAnnouncements.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
                        <Briefcase className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-800">No staff circulars found</p>
                        <p className="text-xs text-gray-400 mt-1">Announcements targeted to support staff will appear here.</p>
                    </div>
                ) : (
                    filteredAnnouncements.map((item) => (
                        <div 
                            key={item.id} 
                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:border-gray-300 transition-all space-y-3"
                        >
                            {/* Card Top */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                            STAFF
                                        </span>
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                        </span>
                                    </div>
                                    <h2 className="text-base font-bold text-gray-900 leading-snug">{item.title}</h2>
                                </div>

                                <button
                                    onClick={() => handleDeleteAnnouncement(item.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-all shadow-2xs flex-shrink-0"
                                    title="Delete memo"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="text-xs text-gray-700 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                                <p className="whitespace-pre-line">{item.content}</p>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center text-[11px] text-gray-400 pt-1">
                                <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span>Issued by:</span>
                                    <span className="font-semibold text-gray-700">{item.author?.name || "Operations & Administration"}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-slate-700" />
                                Post Staff Memo
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAnnouncement} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Memo Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Campus Facility Security & Maintenance Schedule"
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-700 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Memo Details *</label>
                                <textarea
                                    required
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    placeholder="Write memo details for administrative staff..."
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-slate-700 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                                <Button type="button" variant="outline" className="text-xs h-8" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting} className="bg-slate-800 hover:bg-slate-900 text-white text-xs h-8 px-4">
                                    Publish Memo
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

