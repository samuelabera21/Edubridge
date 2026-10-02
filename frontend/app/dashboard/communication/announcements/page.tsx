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
    ChevronLeft,
    ChevronRight,
    Filter,
    GraduationCap,
    School
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

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [targetFilter, setTargetFilter] = useState("ALL");
    const [selectedGradeFilter, setSelectedGradeFilter] = useState("");
    const [selectedSectionFilter, setSelectedSectionFilter] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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
            gradeId: g.id,
            gradeName: g.grade?.name || "Grade",
            name: `${g.grade?.name || "Grade"} - ${s.name}`
        }))
    ), [schoolGrades]);

    // Map ID to human-readable target name
    const getTargetDisplayName = (target: string, targetId?: string) => {
        if (!targetId) return null;
        if (target === "SPECIFIC_GRADE") {
            const sg = schoolGrades.find(g => g.id === targetId);
            return sg?.grade?.name || `Grade (${targetId})`;
        }
        if (target === "SPECIFIC_SECTION") {
            const sec = allSections.find(s => s.id === targetId);
            return sec?.name || `Section (${targetId})`;
        }
        return targetId;
    };

    const filteredAnnouncements = useMemo(() => {
        return announcements.filter(item => {
            // Scope match
            let matchesScope = true;
            if (targetFilter !== "ALL") {
                matchesScope = item.target === targetFilter;
            }

            // Grade hierarchy match
            let matchesGrade = true;
            if (selectedGradeFilter) {
                matchesGrade = item.target === "SPECIFIC_GRADE" && item.targetId === selectedGradeFilter;
            }

            // Section hierarchy match
            let matchesSection = true;
            if (selectedSectionFilter) {
                matchesSection = item.target === "SPECIFIC_SECTION" && item.targetId === selectedSectionFilter;
            }

            // Text search match
            const matchesSearch = !searchQuery.trim() || 
                item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.content?.toLowerCase().includes(searchQuery.toLowerCase());

            return matchesScope && matchesGrade && matchesSection && matchesSearch;
        });
    }, [announcements, targetFilter, selectedGradeFilter, selectedSectionFilter, searchQuery]);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, targetFilter, selectedGradeFilter, selectedSectionFilter, pageSize]);

    // Paginated list
    const totalCount = filteredAnnouncements.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const paginatedAnnouncements = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAnnouncements.slice(start, start + pageSize);
    }, [filteredAnnouncements, currentPage, pageSize]);

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

    const renderTargetBadge = (target: string, targetId?: string) => {
        const detailName = getTargetDisplayName(target, targetId);
        switch (target) {
            case "TEACHERS":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Faculty</span>;
            case "STUDENTS":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">Students</span>;
            case "PARENTS":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Parents</span>;
            case "STAFF":
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">Staff</span>;
            case "SPECIFIC_GRADE":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <GraduationCap className="w-3 h-3" />
                        {detailName || "Grade Specific"}
                    </span>
                );
            case "SPECIFIC_SECTION":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <School className="w-3 h-3" />
                        {detailName || "Class Section"}
                    </span>
                );
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">All School</span>;
        }
    };

    if (loading) return <LoadingState message="Loading announcements..." />;

    return (
        <div className="space-y-4 text-gray-900">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-blue-600" />
                        <span>School Announcements</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Publish and manage official school-wide broadcasts, grade bulletins, and circulars.</p>
                </div>
                <Button 
                    onClick={handleOpenCreate} 
                    leftIcon={<Plus className="w-4 h-4" />} 
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 px-4 font-semibold shadow-xs"
                >
                    New Announcement
                </Button>
            </div>

            {/* Hierarchical Filter & Search Bar */}
            <div className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-xs space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
                    {/* Search Input */}
                    <div className="relative md:col-span-4">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by title or text..."
                            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50/50 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white"
                        />
                    </div>

                    {/* Scope Filter Dropdown */}
                    <div className="md:col-span-3">
                        <select
                            value={targetFilter}
                            onChange={(e) => {
                                setTargetFilter(e.target.value);
                                if (e.target.value !== "SPECIFIC_GRADE") setSelectedGradeFilter("");
                                if (e.target.value !== "SPECIFIC_SECTION") setSelectedSectionFilter("");
                            }}
                            className="w-full py-1.5 px-2.5 text-xs bg-gray-50/50 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white font-medium text-gray-700"
                        >
                            <option value="ALL">All Audiences</option>
                            <option value="TEACHERS">Faculty Only</option>
                            <option value="STUDENTS">Students Only</option>
                            <option value="PARENTS">Parents Only</option>
                            <option value="STAFF">Staff Only</option>
                            <option value="SPECIFIC_GRADE">Specific Grade Level</option>
                            <option value="SPECIFIC_SECTION">Specific Class Section</option>
                        </select>
                    </div>

                    {/* Dynamic Grade Selector (Hierarchy) */}
                    {targetFilter === "SPECIFIC_GRADE" && (
                        <div className="md:col-span-3">
                            <select
                                value={selectedGradeFilter}
                                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                                className="w-full py-1.5 px-2.5 text-xs bg-indigo-50/50 border border-indigo-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-600 font-medium text-indigo-900"
                            >
                                <option value="">-- All Grade Levels --</option>
                                {schoolGrades.map(sg => (
                                    <option key={sg.id} value={sg.id}>
                                        {sg.grade?.name || `Grade ${sg.id}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Dynamic Section Selector (Hierarchy) */}
                    {targetFilter === "SPECIFIC_SECTION" && (
                        <div className="md:col-span-3">
                            <select
                                value={selectedSectionFilter}
                                onChange={(e) => setSelectedSectionFilter(e.target.value)}
                                className="w-full py-1.5 px-2.5 text-xs bg-blue-50/50 border border-blue-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-blue-900"
                            >
                                <option value="">-- All Class Sections --</option>
                                {allSections.map(sec => (
                                    <option key={sec.id} value={sec.id}>
                                        {sec.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Quick Reset Button if filtered */}
                    {(targetFilter !== "ALL" || selectedGradeFilter || selectedSectionFilter || searchQuery) && (
                        <div className="md:col-span-2 flex items-center">
                            <button
                                onClick={() => {
                                    setTargetFilter("ALL");
                                    setSelectedGradeFilter("");
                                    setSelectedSectionFilter("");
                                    setSearchQuery("");
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                            >
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>

                {/* Audience Tab Pills */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100 overflow-x-auto text-xs">
                    {[
                        { id: "ALL", label: "All" },
                        { id: "TEACHERS", label: "Faculty" },
                        { id: "STUDENTS", label: "Students" },
                        { id: "PARENTS", label: "Parents" },
                        { id: "STAFF", label: "Staff" },
                        { id: "SPECIFIC_GRADE", label: "By Grade" },
                        { id: "SPECIFIC_SECTION", label: "By Section" }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setTargetFilter(tab.id);
                                if (tab.id !== "SPECIFIC_GRADE") setSelectedGradeFilter("");
                                if (tab.id !== "SPECIFIC_SECTION") setSelectedSectionFilter("");
                            }}
                            className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap text-xs ${
                                targetFilter === tab.id
                                    ? "bg-blue-600 text-white shadow-2xs"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Announcements Ledger View (Institutional & Clean) */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                {paginatedAnnouncements.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 space-y-2">
                        <Megaphone className="w-8 h-8 mx-auto text-gray-300" />
                        <p className="font-semibold text-gray-800 text-sm">No announcements found</p>
                        <p className="text-xs text-gray-400">Try adjusting your filters or publish a new announcement.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {paginatedAnnouncements.map((item) => (
                            <div 
                                key={item.id} 
                                className="p-4 hover:bg-gray-50/70 transition-colors space-y-2"
                            >
                                {/* Top metadata bar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {renderTargetBadge(item.target, item.targetId)}
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
                                            title="Edit announcement"
                                        >
                                            <Edit2 className="w-3 h-3 text-gray-500" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAnnouncement(item.id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 hover:border-red-300 transition-colors shadow-2xs"
                                            title="Delete announcement"
                                        >
                                            <Trash2 className="w-3 h-3 text-red-500" />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Announcement Title */}
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
                        {/* Status count & Page size */}
                        <div className="flex items-center gap-3">
                            <span>
                                Showing <strong className="text-gray-900">{(currentPage - 1) * pageSize + 1}</strong> to <strong className="text-gray-900">{Math.min(currentPage * pageSize, totalCount)}</strong> of <strong className="text-gray-900">{totalCount}</strong> announcements
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

                        {/* Page navigation */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-2.5 py-1 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                                Previous
                            </button>

                            {/* Page numbers */}
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

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 space-y-4 border border-gray-100">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Megaphone className="w-4 h-4 text-blue-600" />
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
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Target Audience</label>
                                <select
                                    value={form.target}
                                    onChange={(e) => setForm({ ...form, target: e.target.value, targetId: "" })}
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 bg-white"
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
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 bg-white"
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
                                        className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 bg-white"
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
                                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                                <Button type="button" variant="outline" className="text-xs h-8" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" isLoading={submitting} className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8 px-4 font-semibold">
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

