"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Megaphone, 
    Plus, 
    Calendar, 
    User, 
    X,
    Trash2,
    Edit2,
    Search,
    Filter,
    Layers
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

export default function SchoolAnnouncementsPage() {
    const { authData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [targetFilter, setTargetFilter] = useState("ALL");

    const [form, setForm] = useState({
        title: "",
        content: "",
        target: "ALL",
        targetId: ""
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const [annRes, yearsRes] = await Promise.all([
                fetchApi("/communication/announcements"),
                fetchApi("/academic/years")
            ]);

            if (annRes.ok) {
                const data = await annRes.json();
                setAnnouncements(Array.isArray(data) ? data : []);
            } else {
                setAnnouncements([]);
            }

            if (yearsRes.ok) {
                const years = await yearsRes.json();
                const activeYear = Array.isArray(years) ? years.find((y: any) => y.status === "ACTIVE") || years[0] : null;
                if (activeYear) {
                    const gradesRes = await fetchApi(`/academic/years/${activeYear.id}/grades`);
                    if (gradesRes.ok) {
                        const gradesData = await gradesRes.json();
                        setSchoolGrades(Array.isArray(gradesData) ? gradesData : []);
                    }
                }
            }
        } catch (err: any) {
            console.error(err);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const allSections = useMemo(() => schoolGrades.flatMap(g => 
        (g.sections || []).map((s: any) => ({
            id: s.id,
            name: `${g.grade?.name || "Grade"} - ${s.name}`
        }))
    ), [schoolGrades]);

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            const matchesTarget = targetFilter === "ALL" || item.target === targetFilter;
            const matchesSearch = !searchQuery.trim() || 
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.content?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTarget && matchesSearch;
        });
    }, [announcements, targetFilter, searchQuery]);

    const handleOpenCreate = () => {
        setEditingId(null);
        setForm({ title: "", content: "", target: "ALL", targetId: "" });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        setEditingId(item.id);
        setForm({
            title: item.title,
            content: item.content,
            target: item.target || "ALL",
            targetId: item.targetId || ""
        });
        setIsModalOpen(true);
    };

    const handleSubmitAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim() || !form.content.trim()) return;

        try {
            setSubmitting(true);
            const payload = {
                title: form.title,
                content: form.content,
                target: form.target,
                targetId: (form.target === "SPECIFIC_GRADE" || form.target === "SPECIFIC_SECTION") ? form.targetId : undefined
            };

            const url = editingId ? `/communication/announcements/${editingId}` : "/communication/announcements";
            const method = editingId ? "PUT" : "POST";

            const res = await fetchApi(url, {
                method,
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingId(null);
                setForm({ title: "", content: "", target: "ALL", targetId: "" });
                loadData();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to save announcement");
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to save announcement");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        try {
            const res = await fetchApi(`/communication/announcements/${id}`, { method: "DELETE" });
            if (res.ok) {
                setAnnouncements(prev => prev.filter(a => a.id !== id));
            } else {
                const data = await res.json();
                alert(data.error || "Delete failed");
            }
        } catch (_) {
            alert("Delete failed");
        }
    };

    const getTargetBadge = (target: string) => {
        switch (target) {
            case "TEACHERS":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Faculty</span>;
            case "STUDENTS":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Students</span>;
            case "PARENTS":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Parents</span>;
            case "STAFF":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">Staff</span>;
            case "SPECIFIC_GRADE":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">Specific Grade</span>;
            case "SPECIFIC_SECTION":
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Class Section</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">All School</span>;
        }
    };

    if (loading) return <LoadingState message="Loading announcements..." />;

    return (
        <div className="space-y-5 text-gray-900">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-gray-200">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-[#006b3f]" />
                        <span>School Announcements</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Manage and broadcast school-wide bulletins, circulars, and grade-targeted notices.</p>
                </div>
                <Button 
                    onClick={handleOpenCreate} 
                    leftIcon={<Plus className="w-4 h-4" />} 
                    className="bg-[#006b3f] hover:bg-[#005432] text-xs h-9 px-4 font-medium shadow-sm"
                >
                    New Announcement
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
                        placeholder="Search announcements by title or content..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#006b3f]"
                    />
                </div>

                {/* Audience Filter Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                    {[
                        { id: "ALL", label: "All" },
                        { id: "TEACHERS", label: "Faculty" },
                        { id: "STUDENTS", label: "Students" },
                        { id: "PARENTS", label: "Parents" },
                        { id: "STAFF", label: "Staff" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTargetFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
                                targetFilter === tab.id
                                    ? "bg-[#006b3f] text-white shadow-xs"
                                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Announcements List */}
            <div className="space-y-3">
                {filteredAnnouncements.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
                        <Megaphone className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm font-semibold text-gray-800">No announcements found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your search filter or publish a new announcement.</p>
                    </div>
                ) : (
                    filteredAnnouncements.map((item) => (
                        <div 
                            key={item.id} 
                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs hover:border-gray-300 transition-all space-y-3"
                        >
                            {/* Card Top Row */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        {getTargetBadge(item.target)}
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(item.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                        </span>
                                    </div>
                                    <h2 className="text-base font-bold text-gray-900 leading-snug">{item.title}</h2>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <button
                                        onClick={() => handleOpenEdit(item)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-2xs"
                                        title="Edit announcement"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAnnouncement(item.id)}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-all shadow-2xs"
                                        title="Delete announcement"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                    </button>
                                </div>
                            </div>

                            {/* Content Body */}
                            <div className="text-xs text-gray-700 leading-relaxed bg-gray-50/60 p-3 rounded-lg border border-gray-100">
                                <p className="whitespace-pre-line">{item.content}</p>
                            </div>

                            {/* Card Footer */}
                            <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                                <div className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span>Author:</span>
                                    <span className="font-semibold text-gray-700">{item.author?.name || "Administration"}</span>
                                </div>
                                {item.targetId && (
                                    <span className="text-gray-500 font-mono text-[10px]">
                                        Target ID: {item.targetId}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-[#006b3f]" />
                                {editingId ? "Edit Announcement" : "New Announcement"}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitAnnouncement} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                                    placeholder="e.g. End of Semester Examination Schedule"
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#006b3f] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Audience</label>
                                <select
                                    value={form.target}
                                    onChange={(e) => setForm({ ...form, target: e.target.value, targetId: "" })}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#006b3f] bg-white"
                                >
                                    <option value="ALL">Entire School Community (All)</option>
                                    <option value="TEACHERS">Teaching Faculty</option>
                                    <option value="STUDENTS">Students</option>
                                    <option value="PARENTS">Parents & Guardians</option>
                                    <option value="STAFF">Support & Administrative Staff</option>
                                    <option value="SPECIFIC_GRADE">Specific Grade Level</option>
                                    <option value="SPECIFIC_SECTION">Specific Section / Classroom</option>
                                </select>
                            </div>

                            {/* Grade Selector */}
                            {form.target === "SPECIFIC_GRADE" && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Grade *</label>
                                    <select
                                        required
                                        value={form.targetId}
                                        onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="">-- Choose Grade --</option>
                                        {schoolGrades.map((sg) => (
                                            <option key={sg.id} value={sg.id}>
                                                {sg.grade?.name || `Grade ${sg.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Section Selector */}
                            {form.target === "SPECIFIC_SECTION" && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Section *</label>
                                    <select
                                        required
                                        value={form.targetId}
                                        onChange={(e) => setForm({ ...form, targetId: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#006b3f] bg-white"
                                    >
                                        <option value="">-- Choose Section --</option>
                                        {allSections.map((sec) => (
                                            <option key={sec.id} value={sec.id}>
                                                {sec.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Message Content *</label>
                                <textarea
                                    required
                                    value={form.content}
                                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                                    placeholder="Write announcement details here..."
                                    rows={4}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-[#006b3f] focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                                <Button type="button" variant="outline" className="text-xs h-8" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting} className="bg-[#006b3f] hover:bg-[#005432] text-xs h-8 px-4">
                                    {editingId ? "Save Changes" : "Publish"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

