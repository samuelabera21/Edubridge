"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    AlertTriangle, 
    Plus, 
    Search, 
    ShieldAlert, 
    X,
    Calendar,
    User,
    Trash2,
    Edit2,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImportantNoticesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [notices, setNotices] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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

    const filteredNotices = useMemo(() => {
        return notices.filter(item => {
            const matchesType = typeFilter === "ALL" || item.noticeType === typeFilter;
            const matchesSearch = !searchQuery.trim() ||
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.content?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesType && matchesSearch;
        });
    }, [notices, typeFilter, searchQuery]);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, typeFilter, pageSize]);

    const totalCount = filteredNotices.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const paginatedNotices = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredNotices.slice(start, start + pageSize);
    }, [filteredNotices, currentPage, pageSize]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setForm({ title: "", content: "", noticeType: "EMERGENCY" });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        setEditingId(item.id);
        setForm({
            title: item.title,
            content: item.content,
            noticeType: item.noticeType || "EMERGENCY"
        });
        setIsModalOpen(true);
    };

    const handleSubmitNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) return;

        try {
            setSubmitting(true);
            const url = editingId ? `/communication/notices/${editingId}` : "/communication/notices";
            const method = editingId ? "PUT" : "POST";

            const res = await fetchApi(url, {
                method,
                body: JSON.stringify(form)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingId(null);
                setForm({ title: "", content: "", noticeType: "EMERGENCY" });
                loadNotices();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to save notice");
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to save notice");
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

    const getTypeBadge = (noticeType: string) => {
        switch (noticeType) {
            case "EMERGENCY":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">🚨 Emergency Alert</span>;
            case "SAFETY":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">⚠️ Safety Warning</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">📋 Ministry Directive</span>;
        }
    };

    if (loading) return <LoadingState message="Loading notices..." />;

    return (
        <div className="space-y-4 text-gray-900">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span>Important Notices & Directives</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">High-priority compliance notices, emergency warnings, and institutional directives.</p>
                </div>
                <Button 
                    onClick={handleOpenCreate} 
                    leftIcon={<Plus className="w-4 h-4" />} 
                    className="bg-red-700 hover:bg-red-800 text-white text-xs h-9 px-4 font-semibold shadow-xs"
                >
                    New Notice
                </Button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                    {/* Search Input */}
                    <div className="relative md:col-span-6">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search notices by title or content..."
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/50 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-600 focus:bg-white"
                        />
                    </div>

                    {/* Scope Selector */}
                    <div className="md:col-span-6 flex items-center gap-1.5 overflow-x-auto text-xs justify-start md:justify-end">
                        {[
                            { id: "ALL", label: "All Notices" },
                            { id: "EMERGENCY", label: "Emergency" },
                            { id: "SAFETY", label: "Safety" },
                            { id: "COMPLIANCE", label: "Compliance" }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setTypeFilter(tab.id)}
                                className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap text-xs ${
                                    typeFilter === tab.id
                                        ? "bg-red-700 text-white shadow-2xs"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Notices Ledger View (Institutional) */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                {paginatedNotices.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 space-y-2">
                        <ShieldAlert className="w-8 h-8 mx-auto text-gray-300" />
                        <p className="font-semibold text-gray-800 text-sm">No active notices found</p>
                        <p className="text-xs text-gray-400">High-priority directives and safety alerts will be highlighted here.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {paginatedNotices.map((item) => (
                            <div 
                                key={item.id} 
                                className="p-4 border-l-4 border-l-red-600 hover:bg-gray-50/70 transition-colors space-y-2"
                            >
                                {/* Top metadata */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {getTypeBadge(item.noticeType)}
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                        </span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <User className="w-3.5 h-3.5 text-gray-400" />
                                            {item.author?.name || "Administration"}
                                        </span>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                        <button
                                            onClick={() => handleOpenEdit(item)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100 hover:text-blue-600 transition-colors shadow-2xs"
                                            title="Edit notice"
                                        >
                                            <Edit2 className="w-3 h-3 text-gray-500" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteNotice(item.id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 hover:border-red-300 transition-colors shadow-2xs"
                                            title="Delete notice"
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
                                Showing <strong className="text-gray-900">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-gray-900">{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong className="text-gray-900">{totalCount}</strong> notices
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
                                            ? "bg-red-700 text-white border-red-700 font-bold"
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

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                {editingId ? "Edit Notice / Directive" : "Publish Pinned Notice / Directive"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitNotice} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Notice Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. Ministry Directive: Inclement Weather School Schedule"
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-red-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Notice Category</label>
                                <select
                                    value={form.noticeType}
                                    onChange={(e) => setForm({ ...form, noticeType: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-red-600 bg-white"
                                >
                                    <option value="EMERGENCY">Emergency Alert</option>
                                    <option value="COMPLIANCE">Ministry Compliance Directive</option>
                                    <option value="SAFETY">Safety Warning</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Notice Details *</label>
                                <textarea
                                    required
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    placeholder="Write mandatory compliance or safety notice details..."
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-red-600 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                                <Button type="button" variant="outline" className="text-xs h-8" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting} className="bg-red-700 hover:bg-red-800 text-white text-xs h-8 px-4 font-semibold">
                                    {editingId ? "Save Changes" : "Publish Directive"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
