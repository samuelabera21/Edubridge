"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Users, 
    Plus, 
    Search, 
    Calendar, 
    User,
    X,
    Trash2,
    Edit2,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ParentBroadcastCommunicationPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [form, setForm] = useState({
        title: "",
        content: "",
        target: "PARENTS"
    });

    const loadAnnouncements = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/communication/announcements?target=PARENTS");
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

    // Reset pagination to page 1 on search change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, pageSize]);

    const totalCount = filteredAnnouncements.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const paginatedAnnouncements = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAnnouncements.slice(start, start + pageSize);
    }, [filteredAnnouncements, currentPage, pageSize]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setForm({ title: "", content: "", target: "PARENTS" });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        setEditingId(item.id);
        setForm({
            title: item.title,
            content: item.content,
            target: "PARENTS"
        });
        setIsModalOpen(true);
    };

    const handleSubmitAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) return;

        try {
            setSubmitting(true);
            const url = editingId ? `/communication/announcements/${editingId}` : "/communication/announcements";
            const method = editingId ? "PUT" : "POST";

            const res = await fetchApi(url, {
                method,
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingId(null);
                setForm({ title: "", content: "", target: "PARENTS" });
                loadAnnouncements();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to save circular");
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to save circular");
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

    if (loading) return <LoadingState message="Loading parent broadcasts..." />;

    return (
        <div className="space-y-4 text-gray-900">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-600" />
                        <span>Parent & Guardian Broadcasts</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">School-to-home notices, PTA announcements, and guardian circulars.</p>
                </div>
                <Button 
                    onClick={handleOpenCreate} 
                    leftIcon={<Plus className="w-4 h-4" />} 
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 font-semibold shadow-xs"
                >
                    New Circular
                </Button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search parent broadcasts..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/50 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
                    />
                </div>
            </div>

            {/* Broadcasts Ledger View (Institutional) */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                {paginatedAnnouncements.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-gray-300" />
                        <p className="font-semibold text-gray-800 text-sm">No parent broadcasts found</p>
                        <p className="text-xs text-gray-400">Announcements targeted to parents will appear here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {paginatedAnnouncements.map((item) => (
                            <div 
                                key={item.id} 
                                className="p-4 hover:bg-gray-50/70 transition-colors space-y-2"
                            >
                                {/* Top metadata */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                            PARENTS
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                        </span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <User className="w-3.5 h-3.5 text-gray-400" />
                                            {item.author?.name || "School Administration"}
                                        </span>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                        <button
                                            onClick={() => handleOpenEdit(item)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 hover:text-blue-600 transition-colors shadow-2xs"
                                            title="Edit circular"
                                        >
                                            <Edit2 className="w-3 h-3 text-gray-500" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAnnouncement(item.id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 hover:border-red-300 transition-colors shadow-2xs"
                                            title="Delete broadcast"
                                        >
                                            <Trash2 className="w-3 h-3 text-red-500" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 className="text-sm md:text-base font-semibold text-gray-900">
                                    {item.title}
                                </h3>

                                {/* Content */}
                                <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                                    {item.content}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modern Pagination Footer */}
                {totalCount > 0 && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
                        <div className="flex items-center gap-3">
                            <span>
                                Showing <strong className="text-gray-900">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-gray-900">{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong className="text-gray-900">{totalCount}</strong> broadcasts
                            </span>
                            <div className="flex items-center gap-1 text-gray-500">
                                <span>Per page:</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    className="border border-gray-300 rounded px-1.5 py-0.5 bg-white text-xs text-gray-700 focus:outline-none"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Previous
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-7 h-7 rounded border font-medium text-xs ${
                                        currentPage === pageNum
                                            ? "bg-blue-600 text-white border-blue-600 font-bold"
                                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            ))}

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-2.5 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                Next
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Users className="w-4 h-4 text-amber-600" />
                                {editingId ? "Edit Parent Circular" : "Post Parent Circular"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitAnnouncement} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Circular Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Q1 Report Card Pick-up & PTA Meeting Schedule"
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Circular Message *</label>
                                <textarea
                                    required
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    placeholder="Write instructions for parents..."
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                                <Button type="button" variant="outline" className="text-xs h-8" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 font-semibold">
                                    {editingId ? "Save Changes" : "Publish Circular"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
