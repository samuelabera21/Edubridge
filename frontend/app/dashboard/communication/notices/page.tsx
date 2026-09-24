"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    AlertTriangle, 
    Plus, 
    Search, 
    Pin, 
    ShieldAlert, 
    X,
    Calendar,
    User,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ImportantNoticesPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [notices, setNotices] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");

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

    const getTypeBadge = (noticeType: string) => {
        switch (noticeType) {
            case "EMERGENCY":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">🚨 Emergency Alert</span>;
            case "SAFETY":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">⚠️ Safety Warning</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">📋 Ministry Directive</span>;
        }
    };

    if (loading) return <LoadingState message="Loading notices..." />;

    return (
        <div className="space-y-5 text-gray-900">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-gray-200">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span>Important Notices & Directives</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">High-priority compliance notices, emergency warnings, and institutional directives.</p>
                </div>
                <Button 
                    onClick={() => setIsModalOpen(true)} 
                    leftIcon={<Plus className="w-4 h-4" />} 
                    className="bg-red-700 hover:bg-red-800 text-white text-xs h-9 px-4 font-medium shadow-sm"
                >
                    New Notice
                </Button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search notices..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                    {[
                        { id: "ALL", label: "All Notices" },
                        { id: "EMERGENCY", label: "Emergency" },
                        { id: "SAFETY", label: "Safety" },
                        { id: "COMPLIANCE", label: "Compliance" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTypeFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                                typeFilter === tab.id
                                    ? "bg-red-700 text-white shadow-xs"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notices List */}
            <div className="space-y-3">
                {filteredNotices.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
                        <ShieldAlert className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-800">No active notices found</p>
                        <p className="text-xs text-gray-400 mt-1">High-priority directives and safety alerts will be highlighted here.</p>
                    </div>
                ) : (
                    filteredNotices.map((item) => (
                        <div 
                            key={item.id} 
                            className="bg-white border-l-4 border-l-red-600 border-y border-r border-gray-200 rounded-xl p-4 shadow-xs hover:border-gray-300 transition-all space-y-3"
                        >
                            {/* Card Top */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        {getTypeBadge(item.noticeType)}
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                        </span>
                                    </div>
                                    <h2 className="text-base font-bold text-gray-900 leading-snug">{item.title}</h2>
                                </div>

                                <button
                                    onClick={() => handleDeleteNotice(item.id)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-all shadow-2xs flex-shrink-0"
                                    title="Delete notice"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="text-xs text-gray-700 leading-relaxed bg-red-50/30 p-3 rounded-lg border border-red-100">
                                <p className="whitespace-pre-line">{item.content}</p>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center text-[11px] text-gray-400 pt-1">
                                <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span>Published by:</span>
                                    <span className="font-semibold text-gray-700">{item.author?.name || "Administration"}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                Publish Pinned Notice / Directive
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateNotice} className="space-y-3.5">
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
                                <Button type="submit" isLoading={submitting} className="bg-red-700 hover:bg-red-800 text-white text-xs h-8 px-4">
                                    Publish Directive
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

