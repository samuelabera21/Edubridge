"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { 
    Users, 
    Plus, 
    Search, 
    UserCheck, 
    Edit, 
    Trash2, 
    X, 
    ShieldCheck, 
    ShieldAlert, 
    Phone, 
    Mail, 
    GraduationCap, 
    Eye, 
    ChevronLeft, 
    ChevronRight, 
    Link as LinkIcon,
    AlertCircle,
    Check,
    RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

interface LinkedChild {
    id: string;
    studentId: string;
    studentCode: string;
    studentName: string;
    grade: string;
    gradeId?: string;
    section: string;
    sectionId?: string;
    relationship: string;
    isPrimary: boolean;
    canPickup: boolean;
}

interface Guardian {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phoneNumber: string | null;
    email: string | null;
    childrenCount: number;
    children: LinkedChild[];
    hasPrimaryRole: boolean;
    canPickupAny: boolean;
    createdAt: string;
}

export default function ParentManagementPage() {
    const [activeTab, setActiveTab] = useState<"directory" | "relationships">("directory");

    // Directory State
    const [guardians, setGuardians] = useState<Guardian[]>([]);
    const [directoryLoading, setDirectoryLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalGuardians, setTotalGuardians] = useState(0);

    // Filter Metadata
    const [filterOptions, setFilterOptions] = useState<{ grades: any[]; sections: any[] }>({ grades: [], sections: [] });
    const [selectedGradeId, setSelectedGradeId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [relationshipSearch, setRelationshipSearch] = useState("");

    // Modal States
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editGuardianModalOpen, setEditGuardianModalOpen] = useState(false);
    const [selectedGuardian, setSelectedGuardian] = useState<Guardian | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [editRelModalOpen, setEditRelModalOpen] = useState(false);
    const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
    const [targetRelationship, setTargetRelationship] = useState<{ parentId: string; parentName: string; studentId: string; studentName: string; relationship: string; isPrimary: boolean; canPickup: boolean } | null>(null);

    // Form States
    const [guardianForm, setGuardianForm] = useState({
        firstName: "",
        lastName: "",
        phoneNumber: "",
        email: ""
    });

    const [linkForm, setLinkForm] = useState({
        parentId: "",
        studentId: "",
        relationship: "Mother",
        isPrimary: true,
        canPickup: true
    });

    const [studentsForLinking, setStudentsForLinking] = useState<any[]>([]);
    const [studentSearchInput, setStudentSearchInput] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    // Support query parameter on load
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const q = params.get("search");
            if (q) {
                setSearchQuery(q);
                setRelationshipSearch(q);
            }
        }
    }, []);

    // Load filter metadata
    useEffect(() => {
        async function loadFilters() {
            try {
                const res = await fetchApi("/parent/admin/filters");
                if (res.ok) {
                    const data = await res.json();
                    setFilterOptions(data);
                }
            } catch (err) {
                console.error("Failed to load filter metadata:", err);
            }
        }
        loadFilters();
    }, []);

    // Load Guardians List (Server-side search, grade/section filtering & pagination)
    const loadGuardians = async () => {
        try {
            setDirectoryLoading(true);
            const params = new URLSearchParams();
            if (searchQuery.trim()) params.set("search", searchQuery.trim());
            if (selectedGradeId) params.set("schoolGradeId", selectedGradeId);
            if (selectedSectionId) params.set("sectionId", selectedSectionId);
            params.set("page", String(page));
            params.set("limit", "15");

            const res = await fetchApi(`/parent/admin/guardians?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setGuardians(data.guardians || []);
                setTotalPages(data.pagination?.totalPages || 1);
                setTotalGuardians(data.pagination?.total || 0);
            } else {
                setGuardians([]);
                setTotalPages(1);
                setTotalGuardians(0);
            }
        } catch (err) {
            console.error("Failed to load guardians:", err);
            setGuardians([]);
        } finally {
            setDirectoryLoading(false);
        }
    };

    useEffect(() => {
        loadGuardians();
    }, [page, selectedGradeId, selectedSectionId]);

    // Debounced search for guardians
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) {
                loadGuardians();
            } else {
                setPage(1);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load students for linking search
    useEffect(() => {
        if (!linkModalOpen) return;
        async function searchStudents() {
            try {
                const params = new URLSearchParams();
                if (studentSearchInput.trim()) params.set("search", studentSearchInput.trim());
                if (selectedGradeId) params.set("schoolGradeId", selectedGradeId);
                if (selectedSectionId) params.set("sectionId", selectedSectionId);

                const res = await fetchApi(`/parent/admin/students?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setStudentsForLinking(data || []);
                }
            } catch (err) {
                console.error("Failed to search students:", err);
            }
        }
        const timer = setTimeout(searchStudents, 250);
        return () => clearTimeout(timer);
    }, [studentSearchInput, selectedGradeId, selectedSectionId, linkModalOpen]);

    // Flatten family relationships for Tab 2 with strict filtering
    const allRelationships = useMemo(() => {
        const list: Array<{
            id: string;
            parentId: string;
            parentName: string;
            parentPhone: string;
            parentEmail: string;
            studentId: string;
            studentCode: string;
            studentName: string;
            grade: string;
            gradeId?: string;
            section: string;
            sectionId?: string;
            relationship: string;
            isPrimary: boolean;
            canPickup: boolean;
        }> = [];

        guardians.forEach(p => {
            (p.children || []).forEach(c => {
                list.push({
                    id: c.id,
                    parentId: p.id,
                    parentName: p.fullName,
                    parentPhone: p.phoneNumber || "—",
                    parentEmail: p.email || "—",
                    studentId: c.studentId,
                    studentCode: c.studentCode,
                    studentName: c.studentName,
                    grade: c.grade,
                    gradeId: c.gradeId,
                    section: c.section,
                    sectionId: c.sectionId,
                    relationship: c.relationship,
                    isPrimary: c.isPrimary,
                    canPickup: c.canPickup
                });
            });
        });

        return list.filter(r => {
            if (relationshipSearch.trim()) {
                const q = relationshipSearch.toLowerCase();
                const matchParent = r.parentName.toLowerCase().includes(q) || r.parentPhone.includes(q);
                const matchStudent = r.studentName.toLowerCase().includes(q) || r.studentCode.toLowerCase().includes(q);
                if (!matchParent && !matchStudent) return false;
            }
            if (selectedGradeId && r.gradeId && r.gradeId !== selectedGradeId) return false;
            if (selectedSectionId && r.sectionId && r.sectionId !== selectedSectionId) return false;
            return true;
        });
    }, [guardians, relationshipSearch, selectedGradeId, selectedSectionId]);

    // Open Guardian Details modal
    const handleViewGuardian = async (parentId: string) => {
        const local = guardians.find(g => g.id === parentId);
        if (local) {
            setSelectedGuardian(local);
            setDetailModalOpen(true);
            return;
        }

        try {
            const res = await fetchApi(`/parent/admin/guardians/${parentId}`);
            if (res.ok) {
                const data = await res.json();
                setSelectedGuardian(data);
                setDetailModalOpen(true);
            }
        } catch (err) {
            console.error("Failed to load guardian detail:", err);
        }
    };

    // Reset filters
    const handleResetFilters = () => {
        setSelectedGradeId("");
        setSelectedSectionId("");
        setSearchQuery("");
        setRelationshipSearch("");
    };

    const hasActiveFilters = Boolean(searchQuery || relationshipSearch || selectedGradeId || selectedSectionId);

    // Notification toast helper
    const showNotification = (successMsg?: string, errorMsg?: string) => {
        if (successMsg) {
            setActionSuccess(successMsg);
            setTimeout(() => setActionSuccess(null), 3500);
        }
        if (errorMsg) {
            setActionError(errorMsg);
            setTimeout(() => setActionError(null), 4000);
        }
    };

    // Handler: Create Guardian
    const handleCreateGuardian = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guardianForm.firstName.trim() || !guardianForm.lastName.trim()) {
            showNotification(undefined, "First name and last name are required");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetchApi("/parent/admin/guardians", {
                method: "POST",
                body: JSON.stringify(guardianForm)
            });

            if (res.ok) {
                setCreateModalOpen(false);
                setGuardianForm({ firstName: "", lastName: "", phoneNumber: "", email: "" });
                showNotification("Guardian record created successfully");
                loadGuardians();
            } else {
                const err = await res.json();
                showNotification(undefined, err.error || "Failed to create guardian");
            }
        } catch (err: any) {
            showNotification(undefined, err.message || "An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // Handler: Update Guardian
    const handleUpdateGuardian = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGuardian) return;

        try {
            setSubmitting(true);
            const res = await fetchApi(`/parent/admin/guardians/${selectedGuardian.id}`, {
                method: "PUT",
                body: JSON.stringify(guardianForm)
            });

            if (res.ok) {
                setEditGuardianModalOpen(false);
                setSelectedGuardian(null);
                showNotification("Guardian information updated successfully");
                loadGuardians();
            } else {
                const err = await res.json();
                showNotification(undefined, err.error || "Failed to update guardian");
            }
        } catch (err: any) {
            showNotification(undefined, err.message || "An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // Handler: Link Guardian to Student
    const handleLinkGuardian = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkForm.parentId || !linkForm.studentId || !linkForm.relationship) {
            showNotification(undefined, "Please select both a guardian and a student");
            return;
        }

        try {
            setSubmitting(true);
            const res = await fetchApi("/parent/admin/link", {
                method: "POST",
                body: JSON.stringify(linkForm)
            });

            if (res.ok) {
                setLinkModalOpen(false);
                setLinkForm({ parentId: "", studentId: "", relationship: "Mother", isPrimary: true, canPickup: true });
                setStudentSearchInput("");
                showNotification("Student successfully linked to guardian");
                loadGuardians();
            } else {
                const err = await res.json();
                showNotification(undefined, err.error || "Failed to link student");
            }
        } catch (err: any) {
            showNotification(undefined, err.message || "An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // Handler: Edit Relationship
    const handleUpdateRelationship = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetRelationship) return;

        try {
            setSubmitting(true);
            const res = await fetchApi(`/parent/admin/link/${targetRelationship.parentId}/${targetRelationship.studentId}`, {
                method: "PUT",
                body: JSON.stringify({
                    relationship: targetRelationship.relationship,
                    isPrimary: targetRelationship.isPrimary,
                    canPickup: targetRelationship.canPickup
                })
            });

            if (res.ok) {
                setEditRelModalOpen(false);
                setTargetRelationship(null);
                showNotification("Relationship updated successfully");
                loadGuardians();
            } else {
                const err = await res.json();
                showNotification(undefined, err.error || "Failed to update relationship");
            }
        } catch (err: any) {
            showNotification(undefined, err.message || "An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    // Handler: Unlink Guardian
    const handleUnlink = async () => {
        if (!targetRelationship) return;

        try {
            setSubmitting(true);
            const res = await fetchApi(`/parent/admin/link/${targetRelationship.parentId}/${targetRelationship.studentId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                setUnlinkModalOpen(false);
                setTargetRelationship(null);
                showNotification("Relationship unlinked successfully (guardian record preserved)");
                loadGuardians();
            } else {
                const err = await res.json();
                showNotification(undefined, err.error || "Failed to unlink relationship");
            }
        } catch (err: any) {
            showNotification(undefined, err.message || "An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-800">
            {/* Action Feedback Notifications */}
            {actionSuccess && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <Check className="w-4 h-4" />
                    <span>{actionSuccess}</span>
                </div>
            )}
            {actionError && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-rose-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionError}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-[#0c2454]" />
                        <span>Parent & Guardian Management</span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        School-wide legal guardian directory and student relationship mapping.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        size="sm" 
                        onClick={() => {
                            setGuardianForm({ firstName: "", lastName: "", phoneNumber: "", email: "" });
                            setCreateModalOpen(true);
                        }} 
                        className="bg-[#0c2454] hover:bg-[#081838] text-white text-xs"
                        leftIcon={<Plus className="w-4 h-4" />}
                    >
                        Add Guardian
                    </Button>
                    <Button 
                        size="sm" 
                        onClick={() => {
                            setLinkForm({ parentId: "", studentId: "", relationship: "Mother", isPrimary: true, canPickup: true });
                            setLinkModalOpen(true);
                        }} 
                        className="bg-[#006b3f] hover:bg-[#005432] text-white text-xs"
                        leftIcon={<LinkIcon className="w-4 h-4" />}
                    >
                        Link to Student
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
                <button
                    onClick={() => setActiveTab("directory")}
                    className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                        activeTab === "directory" 
                            ? "border-[#0c2454] text-[#0c2454] font-bold" 
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Guardian Directory</span>
                    <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-semibold">
                        {totalGuardians}
                    </span>
                </button>

                <button
                    onClick={() => setActiveTab("relationships")}
                    className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                        activeTab === "relationships" 
                            ? "border-[#0c2454] text-[#0c2454] font-bold" 
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <LinkIcon className="w-4 h-4" />
                    <span>Family Relationships</span>
                    <span className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-semibold">
                        {allRelationships.length}
                    </span>
                </button>
            </div>

            {/* TAB 1: GUARDIAN DIRECTORY */}
            {activeTab === "directory" && (
                <div className="space-y-4">
                    {/* Search & Filter Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative sm:col-span-6">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by guardian name, phone, email, or student..."
                                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c2454] bg-slate-50/50"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <select
                                value={selectedGradeId}
                                onChange={(e) => {
                                    setSelectedGradeId(e.target.value);
                                    setSelectedSectionId("");
                                }}
                                className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c2454] bg-slate-50/50"
                            >
                                <option value="">All School Grades</option>
                                {filterOptions.grades.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-3 flex items-center gap-2">
                            <select
                                value={selectedSectionId}
                                onChange={(e) => setSelectedSectionId(e.target.value)}
                                className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c2454] bg-slate-50/50"
                            >
                                <option value="">All Class Sections</option>
                                {filterOptions.sections
                                    .filter(s => !selectedGradeId || s.schoolGradeId === selectedGradeId)
                                    .map(s => (
                                        <option key={s.id} value={s.id}>{s.gradeName} - Section {s.name}</option>
                                    ))}
                            </select>

                            {hasActiveFilters && (
                                <button
                                    onClick={handleResetFilters}
                                    title="Reset Filters"
                                    className="p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Directory Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        {directoryLoading ? (
                            <div className="p-12">
                                <LoadingState message="Loading guardians directory..." />
                            </div>
                        ) : guardians.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 space-y-2">
                                <Users className="w-10 h-10 mx-auto text-slate-300" />
                                <p className="font-semibold text-slate-800 text-sm">No guardians found</p>
                                <p className="text-xs text-slate-400">
                                    {hasActiveFilters ? "No guardian records match your active filter criteria." : "No guardians registered for this school yet."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3.5">Guardian Name</th>
                                            <th className="px-5 py-3.5">Phone Contact</th>
                                            <th className="px-5 py-3.5">Email Address</th>
                                            <th className="px-5 py-3.5">Linked Children</th>
                                            <th className="px-5 py-3.5">Primary Role</th>
                                            <th className="px-5 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {guardians.map((g) => (
                                            <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedGuardian(g);
                                                            setDetailModalOpen(true);
                                                        }}
                                                        className="font-bold text-slate-900 hover:text-[#0c2454] hover:underline text-left"
                                                    >
                                                        {g.fullName}
                                                    </button>
                                                </td>
                                                <td className="px-5 py-3.5 font-mono text-slate-700">
                                                    {g.phoneNumber || "—"}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600">
                                                    {g.email || "—"}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {g.children.length === 0 ? (
                                                        <span className="text-slate-400 italic">No active links</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {g.children.map((c) => (
                                                                <Link 
                                                                    key={c.id} 
                                                                    href={`/dashboard/students/${c.studentId}`}
                                                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-blue-50 text-[#0c2454] hover:bg-blue-100 border border-blue-100 font-medium transition-colors"
                                                                >
                                                                    {c.studentName} ({c.grade}-{c.section})
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {g.hasPrimaryRole ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            PRIMARY
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px]">Secondary</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedGuardian(g);
                                                                setDetailModalOpen(true);
                                                            }}
                                                            title="View Family Dossier"
                                                            className="p-1.5 text-slate-600 hover:text-[#0c2454] hover:bg-slate-100 rounded-md transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedGuardian(g);
                                                                setGuardianForm({
                                                                    firstName: g.firstName,
                                                                    lastName: g.lastName,
                                                                    phoneNumber: g.phoneNumber || "",
                                                                    email: g.email || ""
                                                                });
                                                                setEditGuardianModalOpen(true);
                                                            }}
                                                            title="Edit Guardian Contact"
                                                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-md transition-colors"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination Footer */}
                        {totalPages > 1 && (
                            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                                <span>Page {page} of {totalPages} ({totalGuardians} total guardians)</span>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={page <= 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        className="h-7 text-xs px-2.5"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        className="h-7 text-xs px-2.5"
                                    >
                                        Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: FAMILY RELATIONSHIPS */}
            {activeTab === "relationships" && (
                <div className="space-y-4">
                    {/* Search & Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="relative sm:col-span-6">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                value={relationshipSearch}
                                onChange={(e) => setRelationshipSearch(e.target.value)}
                                placeholder="Search by student or guardian..."
                                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c2454] bg-slate-50/50"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <select
                                value={selectedGradeId}
                                onChange={(e) => {
                                    setSelectedGradeId(e.target.value);
                                    setSelectedSectionId("");
                                }}
                                className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c2454] bg-slate-50/50"
                            >
                                <option value="">All School Grades</option>
                                {filterOptions.grades.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="sm:col-span-3 flex items-center gap-2">
                            <select
                                value={selectedSectionId}
                                onChange={(e) => setSelectedSectionId(e.target.value)}
                                className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0c2454] bg-slate-50/50"
                            >
                                <option value="">All Class Sections</option>
                                {filterOptions.sections
                                    .filter(s => !selectedGradeId || s.schoolGradeId === selectedGradeId)
                                    .map(s => (
                                        <option key={s.id} value={s.id}>{s.gradeName} - Section {s.name}</option>
                                    ))}
                            </select>

                            {hasActiveFilters && (
                                <button
                                    onClick={handleResetFilters}
                                    title="Reset Filters"
                                    className="p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shrink-0"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Relationships Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        {allRelationships.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 space-y-2">
                                <LinkIcon className="w-10 h-10 mx-auto text-slate-300" />
                                <p className="font-semibold text-slate-800 text-sm">No family relationships found</p>
                                <p className="text-xs text-slate-400">
                                    {hasActiveFilters ? "No records match the active filters." : "Click 'Link to Student' above to establish student-guardian relationship mappings."}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-5 py-3.5">Student Name & ID</th>
                                            <th className="px-5 py-3.5">Grade / Section</th>
                                            <th className="px-5 py-3.5">Guardian Name</th>
                                            <th className="px-5 py-3.5">Relationship</th>
                                            <th className="px-5 py-3.5">Primary Contact</th>
                                            <th className="px-5 py-3.5">Pickup Permission</th>
                                            <th className="px-5 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {allRelationships.map((r) => (
                                            <tr key={`${r.parentId}-${r.studentId}`} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-5 py-3.5">
                                                    <Link 
                                                        href={`/dashboard/students/${r.studentId}`}
                                                        className="font-bold text-slate-900 hover:text-[#0c2454] hover:underline block"
                                                    >
                                                        {r.studentName}
                                                    </Link>
                                                    <span className="text-[11px] font-mono text-slate-400">{r.studentCode}</span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="font-medium text-slate-800">{r.grade}</span>
                                                    <span className="text-slate-400 text-[11px] block">Section {r.section}</span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <button 
                                                        onClick={() => handleViewGuardian(r.parentId)}
                                                        className="font-semibold text-[#0c2454] hover:underline text-left block"
                                                        title="Click to view Guardian Details"
                                                    >
                                                        {r.parentName}
                                                    </button>
                                                    <span className="text-[11px] text-slate-500 font-mono">{r.parentPhone}</span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                        {r.relationship}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {r.isPrimary ? (
                                                        <span className="inline-flex items-center text-emerald-700 font-bold text-[11px]">
                                                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Yes (Primary)
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 text-[11px]">No</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {r.canPickup ? (
                                                        <span className="inline-flex items-center text-emerald-700 font-medium text-[11px]">
                                                            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Authorized
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-slate-400 text-[11px]">
                                                            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-slate-400" /> Unauthorized
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button 
                                                            onClick={() => handleViewGuardian(r.parentId)}
                                                            title="View Guardian Details"
                                                            className="p-1.5 text-slate-600 hover:text-[#0c2454] hover:bg-slate-100 rounded-md transition-colors"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setTargetRelationship({
                                                                    parentId: r.parentId,
                                                                    parentName: r.parentName,
                                                                    studentId: r.studentId,
                                                                    studentName: r.studentName,
                                                                    relationship: r.relationship,
                                                                    isPrimary: r.isPrimary,
                                                                    canPickup: r.canPickup
                                                                });
                                                                setEditRelModalOpen(true);
                                                            }}
                                                            title="Edit Relationship"
                                                            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-md transition-colors"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setTargetRelationship({
                                                                    parentId: r.parentId,
                                                                    parentName: r.parentName,
                                                                    studentId: r.studentId,
                                                                    studentName: r.studentName,
                                                                    relationship: r.relationship,
                                                                    isPrimary: r.isPrimary,
                                                                    canPickup: r.canPickup
                                                                });
                                                                setUnlinkModalOpen(true);
                                                            }}
                                                            title="Unlink Relationship"
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL 1: CREATE GUARDIAN */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Add Parent / Guardian</h3>
                            <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateGuardian} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={guardianForm.firstName}
                                        onChange={(e) => setGuardianForm({ ...guardianForm, firstName: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454]"
                                        placeholder="e.g. Hana"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={guardianForm.lastName}
                                        onChange={(e) => setGuardianForm({ ...guardianForm, lastName: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454]"
                                        placeholder="e.g. Tesfaye"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                                <input 
                                    type="text"
                                    value={guardianForm.phoneNumber}
                                    onChange={(e) => setGuardianForm({ ...guardianForm, phoneNumber: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454]"
                                    placeholder="e.g. +251911223344"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                                <input 
                                    type="email"
                                    value={guardianForm.email}
                                    onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454]"
                                    placeholder="e.g. hana@example.com"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="outline" size="sm" onClick={() => setCreateModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={submitting} className="bg-[#0c2454] text-white">
                                    {submitting ? "Saving..." : "Save Guardian"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: EDIT GUARDIAN */}
            {editGuardianModalOpen && selectedGuardian && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Edit Guardian Contact</h3>
                            <button onClick={() => setEditGuardianModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateGuardian} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={guardianForm.firstName}
                                        onChange={(e) => setGuardianForm({ ...guardianForm, firstName: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454]"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={guardianForm.lastName}
                                        onChange={(e) => setGuardianForm({ ...guardianForm, lastName: e.target.value })}
                                        className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                                <input 
                                    type="text"
                                    value={guardianForm.phoneNumber}
                                    onChange={(e) => setGuardianForm({ ...guardianForm, phoneNumber: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454]"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                                <input 
                                    type="email"
                                    value={guardianForm.email}
                                    onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454]"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditGuardianModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={submitting} className="bg-[#0c2454] text-white">
                                    {submitting ? "Updating..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: GUARDIAN DETAIL DOSSIER */}
            {detailModalOpen && selectedGuardian && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#0c2454]" />
                                <span>{selectedGuardian.fullName}</span>
                            </h3>
                            <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <div>
                                    <span className="text-slate-500 block">Phone Number</span>
                                    <span className="font-semibold text-slate-900 font-mono mt-0.5 block">{selectedGuardian.phoneNumber || "None"}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Email Address</span>
                                    <span className="font-semibold text-slate-900 mt-0.5 block">{selectedGuardian.email || "None"}</span>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px] flex items-center justify-between">
                                    <span>Enrolled Children ({selectedGuardian.children.length})</span>
                                </h4>

                                {selectedGuardian.children.length === 0 ? (
                                    <p className="text-slate-400 italic p-4 text-center border border-dashed border-slate-200 rounded-lg">
                                        No students currently linked to this guardian.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {selectedGuardian.children.map((c) => (
                                            <div key={c.id} className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <Link 
                                                        href={`/dashboard/students/${c.studentId}`}
                                                        className="font-bold text-slate-900 hover:text-[#0c2454] hover:underline"
                                                    >
                                                        {c.studentName}
                                                    </Link>
                                                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                        {c.relationship}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                                                    <span>Grade: <strong className="text-slate-700">{c.grade} - Section {c.section}</strong></span>
                                                    <span>• ID: <strong className="font-mono text-slate-700">{c.studentCode}</strong></span>
                                                </div>
                                                <div className="flex items-center gap-3 pt-1 text-[11px]">
                                                    <span className={c.isPrimary ? "text-emerald-700 font-semibold" : "text-slate-400"}>
                                                        {c.isPrimary ? "✓ Primary Guardian" : "Secondary"}
                                                    </span>
                                                    <span>•</span>
                                                    <span className={c.canPickup ? "text-emerald-700 font-medium" : "text-slate-400"}>
                                                        {c.canPickup ? "✓ Campus Pickup Authorized" : "Pickup Unauthorized"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t border-slate-100">
                            <Button size="sm" variant="outline" onClick={() => setDetailModalOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 4: LINK GUARDIAN TO STUDENT */}
            {linkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Link Guardian to Student</h3>
                            <button onClick={() => setLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleLinkGuardian} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Select Guardian *</label>
                                <select
                                    required
                                    value={linkForm.parentId}
                                    onChange={(e) => setLinkForm({ ...linkForm, parentId: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454] bg-white"
                                >
                                    <option value="">-- Choose Guardian --</option>
                                    {guardians.map(p => (
                                        <option key={p.id} value={p.id}>{p.fullName} ({p.phoneNumber || "No Phone"})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Search & Select Student *</label>
                                <input 
                                    type="text"
                                    value={studentSearchInput}
                                    onChange={(e) => setStudentSearchInput(e.target.value)}
                                    placeholder="Type student name or ID..."
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454] mb-1.5"
                                />

                                <select
                                    required
                                    value={linkForm.studentId}
                                    onChange={(e) => setLinkForm({ ...linkForm, studentId: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454] bg-white max-h-32"
                                >
                                    <option value="">-- Select Enrolled Student --</option>
                                    {studentsForLinking.map(s => (
                                        <option key={s.id} value={s.studentId}>
                                            {s.fullName} ({s.studentCode}) — {s.gradeName} / {s.sectionName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Relationship Type *</label>
                                <select
                                    required
                                    value={linkForm.relationship}
                                    onChange={(e) => setLinkForm({ ...linkForm, relationship: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454] bg-white"
                                >
                                    <option value="Mother">Mother</option>
                                    <option value="Father">Father</option>
                                    <option value="Guardian">Guardian</option>
                                    <option value="Grandmother">Grandmother</option>
                                    <option value="Grandfather">Grandfather</option>
                                    <option value="Uncle">Uncle</option>
                                    <option value="Aunt">Aunt</option>
                                    <option value="Sibling">Older Sibling</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={linkForm.isPrimary}
                                        onChange={(e) => setLinkForm({ ...linkForm, isPrimary: e.target.checked })}
                                        className="rounded border-slate-300 text-[#0c2454] focus:ring-[#0c2454]"
                                    />
                                    <span className="text-slate-800 font-medium">Designate as Primary Contact</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={linkForm.canPickup}
                                        onChange={(e) => setLinkForm({ ...linkForm, canPickup: e.target.checked })}
                                        className="rounded border-slate-300 text-[#0c2454] focus:ring-[#0c2454]"
                                    />
                                    <span className="text-slate-800 font-medium">Authorized for Campus Pickup</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="outline" size="sm" onClick={() => setLinkModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={submitting} className="bg-[#0c2454] text-white">
                                    {submitting ? "Linking..." : "Establish Link"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 5: EDIT RELATIONSHIP */}
            {editRelModalOpen && targetRelationship && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-900">Edit Relationship</h3>
                            <button onClick={() => setEditRelModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateRelationship} className="space-y-3.5 text-xs">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                                <p className="text-slate-600">Guardian: <strong className="text-slate-900">{targetRelationship.parentName}</strong></p>
                                <p className="text-slate-600">Student: <strong className="text-slate-900">{targetRelationship.studentName}</strong></p>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 mb-1">Relationship Type *</label>
                                <select
                                    required
                                    value={targetRelationship.relationship}
                                    onChange={(e) => setTargetRelationship({ ...targetRelationship, relationship: e.target.value })}
                                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#0c2454] bg-white"
                                >
                                    <option value="Mother">Mother</option>
                                    <option value="Father">Father</option>
                                    <option value="Guardian">Guardian</option>
                                    <option value="Grandmother">Grandmother</option>
                                    <option value="Grandfather">Grandfather</option>
                                    <option value="Uncle">Uncle</option>
                                    <option value="Aunt">Aunt</option>
                                    <option value="Sibling">Older Sibling</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={targetRelationship.isPrimary}
                                        onChange={(e) => setTargetRelationship({ ...targetRelationship, isPrimary: e.target.checked })}
                                        className="rounded border-slate-300 text-[#0c2454] focus:ring-[#0c2454]"
                                    />
                                    <span className="text-slate-800 font-medium">Designate as Primary Contact</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={targetRelationship.canPickup}
                                        onChange={(e) => setTargetRelationship({ ...targetRelationship, canPickup: e.target.checked })}
                                        className="rounded border-slate-300 text-[#0c2454] focus:ring-[#0c2454]"
                                    />
                                    <span className="text-slate-800 font-medium">Authorized for Campus Pickup</span>
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditRelModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={submitting} className="bg-[#0c2454] text-white">
                                    {submitting ? "Saving..." : "Update Relationship"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 6: UNLINK CONFIRMATION */}
            {unlinkModalOpen && targetRelationship && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center gap-3 text-rose-600">
                            <AlertCircle className="w-6 h-6 shrink-0" />
                            <h3 className="text-base font-bold text-slate-900">Remove Relationship</h3>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            Are you sure you want to unlink <strong>{targetRelationship.parentName}</strong> from <strong>{targetRelationship.studentName}</strong>?
                        </p>

                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-[11px] text-amber-800">
                            <strong>Note:</strong> The guardian record and any other sibling links will remain intact.
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button type="button" variant="outline" size="sm" onClick={() => setUnlinkModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" size="sm" disabled={submitting} onClick={handleUnlink} className="bg-rose-600 hover:bg-rose-700 text-white">
                                {submitting ? "Removing..." : "Remove Link"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
