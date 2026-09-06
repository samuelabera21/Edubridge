"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Plus, Users, Layers, LayoutGrid, Edit2, Trash2, CheckCircle2, 
    Clock, RotateCcw, Search, ChevronLeft, ChevronRight, BookOpen,
    List, ArrowUpDown, SlidersHorizontal, GraduationCap, ArrowRight,
    Archive, ShieldCheck, ChevronDown
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";
import Link from "next/link";
import { AddSectionModal } from "./components/AddSectionModal";
import { EditSectionModal } from "./components/EditSectionModal";
import { GradeStatusModal } from "./components/GradeStatusModal";

export default function GradesAndSectionsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [schoolGrades, setSchoolGrades] = useState<any[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [gradesLoading, setGradesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter & Search & Sort states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGradeFilter, setSelectedGradeFilter] = useState("ALL");
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED" | "ARCHIVED">("ALL");
    const [sortOrder, setSortOrder] = useState<"LEVEL_ASC" | "LEVEL_DESC" | "NAME_ASC" | "SECTIONS_DESC" | "CAPACITY_DESC">("LEVEL_ASC");
    const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    const [statusModalState, setStatusModalState] = useState<{
        isOpen: boolean;
        schoolGrade: any | null;
    }>({
        isOpen: false,
        schoolGrade: null
    });

    const [addSectionModalState, setAddSectionModalState] = useState<{ isOpen: boolean; schoolGradeId: string; gradeName: string }>({
        isOpen: false,
        schoolGradeId: "",
        gradeName: ""
    });

    const [editSectionModalState, setEditSectionModalState] = useState<{
        isOpen: boolean;
        section: { id: string; name: string; capacity?: number | null } | null;
        gradeName: string;
    }>({
        isOpen: false,
        section: null,
        gradeName: ""
    });

    const hasManagePermission = authData?.access.some(acc => 
        ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => ["ACADEMIC:CREATE", "ACADEMIC:UPDATE", "ACADEMIC:MANAGE"].includes(p.permission?.name))
    );

    const selectedYear = years.find(y => y.id === selectedYearId) || null;

    const loadYears = async () => {
        try {
            setLoading(true);
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            if (yearsData.length > 0) {
                const active = yearsData.find(y => y.status === "ACTIVE");
                const initialYear = active || yearsData[0];
                setSelectedYearId(initialYear.id);
            }
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred loading academic years");
        } finally {
            setLoading(false);
        }
    };

    const loadGradesForYear = async (yearId: string) => {
        if (!yearId) return;
        try {
            setGradesLoading(true);
            const gradesRes = await fetchApi(`/academic/years/${yearId}/grades`);
            if (gradesRes.ok) {
                const gradesData = await gradesRes.json();
                setSchoolGrades(gradesData);
            } else {
                setSchoolGrades([]);
            }
        } catch (err: any) {
            console.error("Failed to load school grades:", err);
            setSchoolGrades([]);
        } finally {
            setGradesLoading(false);
        }
    };

    useEffect(() => {
        loadYears();
    }, []);

    useEffect(() => {
        if (selectedYearId) {
            loadGradesForYear(selectedYearId);
        }
    }, [selectedYearId]);

    // Unique grade filter options for dropdown
    const gradeFilterOptions = useMemo(() => {
        const unique = new Map<string, { id: string; name: string; level: number }>();
        for (const sg of schoolGrades) {
            if (sg.grade && !unique.has(sg.grade.id)) {
                unique.set(sg.grade.id, {
                    id: sg.grade.id,
                    name: sg.grade.name,
                    level: sg.grade.level ?? 0
                });
            }
        }
        return Array.from(unique.values()).sort((a, b) => a.level - b.level);
    }, [schoolGrades]);

    // Filter & Sort school grades
    const filteredGrades = useMemo(() => {
        let list = schoolGrades.filter((sg) => {
            // Grade level filter
            if (selectedGradeFilter !== "ALL") {
                if (sg.gradeId !== selectedGradeFilter && sg.id !== selectedGradeFilter && sg.grade?.id !== selectedGradeFilter) {
                    return false;
                }
            }

            // Lifecycle Status filter (ACTIVE, SUSPENDED, ARCHIVED)
            if (selectedStatusFilter !== "ALL") {
                const status = sg.status || "ACTIVE";
                if (status !== selectedStatusFilter) {
                    return false;
                }
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const gradeName = (sg.grade?.name || "").toLowerCase();
                const sectionNames = (sg.sections || []).map((s: any) => s.name.toLowerCase()).join(" ");
                if (!gradeName.includes(q) && !sectionNames.includes(q)) {
                    return false;
                }
            }
            return true;
        });

        // Sorting
        return [...list].sort((a, b) => {
            const levelA = a.grade?.level ?? 0;
            const levelB = b.grade?.level ?? 0;
            const nameA = a.grade?.name ?? "";
            const nameB = b.grade?.name ?? "";
            const sectionsA = a.sections?.length ?? 0;
            const sectionsB = b.sections?.length ?? 0;
            const capA = (a.sections || []).reduce((acc: number, s: any) => acc + (s.capacity || 0), 0);
            const capB = (b.sections || []).reduce((acc: number, s: any) => acc + (s.capacity || 0), 0);

            switch (sortOrder) {
                case "LEVEL_ASC": // Top to bottom (lowest to highest)
                    return levelA - levelB;
                case "LEVEL_DESC": // Bottom to top (highest to lowest)
                    return levelB - levelA;
                case "NAME_ASC":
                    return nameA.localeCompare(nameB);
                case "SECTIONS_DESC":
                    return sectionsB - sectionsA;
                case "CAPACITY_DESC":
                    return capB - capA;
                default:
                    return levelA - levelB;
            }
        });
    }, [schoolGrades, selectedGradeFilter, selectedStatusFilter, searchQuery, sortOrder]);

    // Reset page when search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedGradeFilter, selectedStatusFilter, sortOrder, selectedYearId, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredGrades.length / pageSize));
    const paginatedGrades = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredGrades.slice(start, start + pageSize);
    }, [filteredGrades, currentPage, pageSize]);

    const hasActiveFilters = searchQuery !== "" || selectedGradeFilter !== "ALL" || selectedStatusFilter !== "ALL" || sortOrder !== "LEVEL_ASC";

    const handleClearFilters = () => {
        setSearchQuery("");
        setSelectedGradeFilter("ALL");
        setSelectedStatusFilter("ALL");
        setSortOrder("LEVEL_ASC");
    };

    const handleDeleteSection = async (sectionId: string, sectionName: string) => {
        if (!confirm(`Are you sure you want to delete Section "${sectionName}"?`)) return;
        try {
            const res = await fetchApi(`/academic/sections/${sectionId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete section");
            }
            await loadGradesForYear(selectedYearId);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDeleteSchoolGrade = async (schoolGradeId: string, gradeName: string) => {
        if (!confirm(`Are you sure you want to remove ${gradeName} from this academic year?`)) return;
        try {
            const res = await fetchApi(`/academic/grades/school-grades/${schoolGradeId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to remove grade offering");
            }
            await loadGradesForYear(selectedYearId);
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Calculate aggregated statistics
    const totalSections = useMemo(() => {
        return schoolGrades.reduce((acc, curr) => acc + (curr.sections?.length || 0), 0);
    }, [schoolGrades]);

    const totalCapacity = useMemo(() => {
        return schoolGrades.reduce((acc, curr) => {
            const secCap = curr.sections?.reduce((sAcc: number, s: any) => sAcc + (s.capacity || 0), 0) || 0;
            return acc + secCap;
        }, 0);
    }, [schoolGrades]);

    const avgCapacityPerSection = totalSections > 0 ? Math.round(totalCapacity / totalSections) : 0;

    if (loading && years.length === 0) {
        return <LoadingState message="Loading academic grades & sections..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadYears} />;
    }

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans text-gray-900">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/academics/years" className="hover:text-gray-900">Academics</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">Grades & Class Sections</span>
            </div>

            {/* Header: Clean, direct on page background */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                        Grades & Class Sections
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Configure academic levels, class sections, and student enrollment capacities.
                    </p>
                </div>

                <div className="flex items-center space-x-2.5">
                    {/* Session Dropdown */}
                    {selectedYear && (
                        <div className="flex items-center space-x-1.5 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs shadow-2xs">
                            <span className="text-gray-500 text-[11px] font-medium">Session:</span>
                            <select
                                value={selectedYearId}
                                onChange={(e) => setSelectedYearId(e.target.value)}
                                className="bg-transparent text-gray-900 font-semibold outline-none cursor-pointer"
                            >
                                {years.map(y => (
                                    <option key={y.id} value={y.id}>
                                        {y.name} ({y.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {hasManagePermission && selectedYear && (
                        <Link href={`/dashboard/academics/grades/create?yearId=${selectedYear.id}`}>
                            <button className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-lg transition-colors shadow-xs cursor-pointer flex-shrink-0">
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Grade Offering</span>
                            </button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Clean Data Stats on Normal Background (No Cards) */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 px-1 py-1 text-xs">
                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Offered Grades:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">{schoolGrades.length}</span>
                </div>

                <span className="text-gray-300 select-none hidden sm:inline">|</span>

                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Total Sections:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">{totalSections}</span>
                </div>

                <span className="text-gray-300 select-none hidden sm:inline">|</span>

                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Total Capacity:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">
                        {totalCapacity} <span className="text-xs font-normal text-gray-500">seats</span>
                    </span>
                </div>

                <span className="text-gray-300 select-none hidden sm:inline">|</span>

                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Avg Capacity / Sec:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">
                        {avgCapacityPerSection} <span className="text-xs font-normal text-gray-500">seats</span>
                    </span>
                </div>
            </div>

            {/* Main Content Area with Integrated Action Bar */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                {/* Integrated Action Toolbar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left Side: Search & Clear */}
                    <div className="flex items-center space-x-2 flex-1 max-w-md">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search grade or section..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none transition-all"
                            />
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 text-xs font-medium transition-colors cursor-pointer flex-shrink-0"
                                title="Reset search and filters"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>

                    {/* Right Side: Clean Dropdowns & View Switch */}
                    <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
                        {/* Grade Filter */}
                        <select
                            value={selectedGradeFilter}
                            onChange={(e) => setSelectedGradeFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#4085b3] outline-none cursor-pointer"
                        >
                            <option value="ALL">All Grades</option>
                            {gradeFilterOptions.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </select>

                        {/* Status Filter */}
                        <select
                            value={selectedStatusFilter}
                            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                            className="bg-white border border-gray-300 text-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#4085b3] outline-none cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="ARCHIVED">Archived</option>
                        </select>

                        {/* Sort Order */}
                        <select
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value as any)}
                            className="bg-white border border-gray-300 text-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:ring-2 focus:ring-[#4085b3] outline-none cursor-pointer"
                        >
                            <option value="LEVEL_ASC">Level: Low to High</option>
                            <option value="LEVEL_DESC">Level: High to Low</option>
                            <option value="NAME_ASC">Name (A &rarr; Z)</option>
                            <option value="SECTIONS_DESC">Most Sections</option>
                            <option value="CAPACITY_DESC">Highest Capacity</option>
                        </select>

                        <div className="h-4 w-px bg-gray-200 hidden sm:block" />

                        {/* View Switch: Cards / Table */}
                        <div className="flex items-center p-0.5 bg-white border border-gray-300 rounded-lg">
                            <button
                                onClick={() => setViewMode("cards")}
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                                    viewMode === "cards" 
                                        ? "bg-[#4085b3] text-white font-semibold shadow-2xs" 
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                                title="Cards View"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>Cards</span>
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                                    viewMode === "table" 
                                        ? "bg-[#4085b3] text-white font-semibold shadow-2xs" 
                                        : "text-gray-500 hover:text-gray-900"
                                }`}
                                title="Table View"
                            >
                                <List className="w-3.5 h-3.5" />
                                <span>Table</span>
                            </button>
                        </div>
                    </div>
                </div>

                {gradesLoading ? (
                    <div className="p-12 text-center text-xs text-gray-500">
                        <LoadingState message="Updating grade offerings..." />
                    </div>
                ) : filteredGrades.length === 0 ? (
                    <div className="py-16 text-center text-xs text-gray-500 space-y-2">
                        <p>
                            {hasActiveFilters 
                                ? "No grades match your search or filter criteria." 
                                : `There are no grades assigned to ${selectedYear?.name || "this academic year"}.`}
                        </p>
                        {hasActiveFilters ? (
                            <button
                                onClick={handleClearFilters}
                                className="text-xs text-[#4085b3] font-medium hover:underline cursor-pointer"
                            >
                                Clear search & filters
                            </button>
                        ) : hasManagePermission && selectedYear && (
                            <Link href={`/dashboard/academics/grades/create?yearId=${selectedYear.id}`}>
                                <button className="mt-2 inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors shadow-xs cursor-pointer">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add First Grade</span>
                                </button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <>
                        {/* VIEW 1: EAES STAFFING / STRUCTURE OVERVIEW CARDS (DEFAULT) */}
                        {viewMode === "cards" ? (
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {paginatedGrades.map((sg) => {
                                        const gradeCapacity = (sg.sections || []).reduce((acc: number, s: any) => acc + (s.capacity || 0), 0);
                                        const sectionCount = sg.sections?.length || 0;
                                        const subjectCount = sg.gradeSubjects?.length || 0;
                                        const gradeLevel = sg.grade?.level ?? 0;

                                        return (
                                            <Link 
                                                key={sg.id} 
                                                href={`/dashboard/academics/grades/${sg.id}`}
                                                className="block group"
                                            >
                                                <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[#4085b3] hover:shadow-md transition-all flex flex-col justify-between h-full relative cursor-pointer">
                                                    <div>
                                                        {/* Top Row: Icon Badge & Status/Chevron */}
                                                        <div className="flex items-start justify-between">
                                                            <div className="w-11 h-11 rounded-lg bg-sky-50 text-[#4085b3] group-hover:bg-[#4085b3] group-hover:text-white flex items-center justify-center transition-colors">
                                                                <GraduationCap className="w-5 h-5 stroke-[1.8]" />
                                                            </div>

                                                            <div className="flex items-center space-x-2">
                                                                {/* Status Pill Button */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setStatusModalState({ isOpen: true, schoolGrade: sg });
                                                                    }}
                                                                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                                                                        sg.status === "ARCHIVED"
                                                                            ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                                                                            : sg.status === "SUSPENDED"
                                                                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                                                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                                                    }`}
                                                                    title="Change grade offering status"
                                                                >
                                                                    <span>{sg.status === "ARCHIVED" ? "Archived" : sg.status === "SUSPENDED" ? "Suspended" : "Active"}</span>
                                                                    <ChevronDown className="w-3 h-3 opacity-60" />
                                                                </button>

                                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#4085b3] group-hover:translate-x-0.5 transition-all" />
                                                            </div>
                                                        </div>

                                                        {/* Title & Summary */}
                                                        <div className="mt-4">
                                                            <h3 className="text-base font-bold text-gray-900 group-hover:text-[#4085b3] transition-colors">
                                                                {sg.grade?.name || "Unknown Grade"}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                                                {sectionCount} {sectionCount === 1 ? "Section" : "Sections"} &bull; {subjectCount} {subjectCount === 1 ? "Curriculum Subject" : "Curriculum Subjects"} &bull; {gradeCapacity} Seats Total
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Bottom Details Line */}
                                                    <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                                        <span className="font-medium text-gray-600">Level {gradeLevel}</span>
                                                        <span className="text-[#4085b3] font-medium group-hover:underline inline-flex items-center space-x-1">
                                                            <span>View Coverage</span>
                                                            <ArrowRight className="w-3 h-3" />
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            /* VIEW 2: COMPACT ADMINISTRATIVE TABLE VIEW */
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-gray-700">
                                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                                        <tr>
                                            <th className="px-4 py-3 w-12 text-center">#</th>
                                            <th className="px-5 py-3 w-44">Grade Level</th>
                                            <th className="px-4 py-3 w-28 text-center">Status</th>
                                            <th className="px-5 py-3">Sections & Capacity</th>
                                            <th className="px-5 py-3 w-44 text-center">Curriculum Subjects</th>
                                            <th className="px-5 py-3 w-52 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paginatedGrades.map((sg, idx) => {
                                            const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                                            return (
                                                <tr key={sg.id} className="hover:bg-gray-50/70 transition-colors">
                                                    <td className="px-4 py-3.5 text-center text-gray-400 font-mono text-[11px]">
                                                        {globalIndex}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="font-bold text-gray-900 text-sm">
                                                            {sg.grade?.name || "Unknown"}
                                                        </div>
                                                        <div className="text-[11px] text-gray-400 font-mono">
                                                            Level {sg.grade?.level ?? 0}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3.5 text-center">
                                                        {sg.status === "ARCHIVED" ? (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                                                Archived
                                                            </span>
                                                        ) : sg.status === "SUSPENDED" ? (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                                                Suspended
                                                            </span>
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Active
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-3.5 text-gray-600">
                                                        {sg.sections && sg.sections.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2 items-center">
                                                                {sg.sections.map((sec: any) => (
                                                                    <div 
                                                                        key={sec.id} 
                                                                        className="inline-flex items-center space-x-2 px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-800 text-xs shadow-2xs hover:border-[#4085b3] transition-colors"
                                                                    >
                                                                        <span className="font-semibold text-gray-900">Sec {sec.name}</span>
                                                                        <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-mono text-[10px]">
                                                                            {sec.capacity || 50} max
                                                                        </span>
                                                                        {hasManagePermission && (
                                                                            <div className="inline-flex items-center space-x-1 border-l border-gray-200 pl-1.5 ml-0.5">
                                                                                <button
                                                                                    onClick={() => setEditSectionModalState({
                                                                                        isOpen: true,
                                                                                        section: sec,
                                                                                        gradeName: sg.grade?.name
                                                                                    })}
                                                                                    className="text-gray-400 hover:text-[#4085b3] transition-colors cursor-pointer p-0.5"
                                                                                    title="Edit Section"
                                                                                >
                                                                                    <Edit2 className="w-3 h-3" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteSection(sec.id, sec.name)}
                                                                                    className="text-gray-400 hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                                                                                    title="Delete Section"
                                                                                >
                                                                                    <Trash2 className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-[11px] text-gray-400 italic">No sections created</span>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-3.5 text-center">
                                                        {sg.gradeSubjects && sg.gradeSubjects.length > 0 ? (
                                                            <Link href={`/dashboard/academics/subjects?gradeId=${sg.id}&yearId=${selectedYearId}`}>
                                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium bg-sky-50 text-[#4085b3] border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer">
                                                                    <BookOpen className="w-3 h-3" />
                                                                    <span>{sg.gradeSubjects.length} Subjects</span>
                                                                </span>
                                                            </Link>
                                                        ) : (
                                                            <Link href={`/dashboard/academics/subjects?gradeId=${sg.id}&yearId=${selectedYearId}`}>
                                                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium text-[#4085b3] hover:text-white bg-sky-50/60 hover:bg-[#4085b3] border border-dashed border-[#4085b3]/50 transition-colors cursor-pointer" title="Assign curriculum subjects and weekly periods">
                                                                    <Plus className="w-3 h-3" />
                                                                    <span>+ Assign Subjects</span>
                                                                </span>
                                                            </Link>
                                                        )}
                                                    </td>

                                                    <td className="px-5 py-3.5 text-right">
                                                        <div className="inline-flex items-center space-x-2">
                                                            {hasManagePermission && (
                                                                <button
                                                                    onClick={() => setAddSectionModalState({
                                                                        isOpen: true,
                                                                        schoolGradeId: sg.id,
                                                                        gradeName: sg.grade?.name
                                                                    })}
                                                                    className="px-2.5 py-1 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded border border-gray-300 font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                    <span>Section</span>
                                                                </button>
                                                            )}
                                                            <Link href={`/dashboard/academics/grades/${sg.id}`}>
                                                                <button className="px-3 py-1 text-xs text-[#4085b3] hover:text-white hover:bg-[#4085b3] rounded border border-[#4085b3] font-medium transition-colors cursor-pointer">
                                                                    Details
                                                                </button>
                                                            </Link>
                                                            {hasManagePermission && (
                                                                <button
                                                                    onClick={() => setStatusModalState({ isOpen: true, schoolGrade: sg })}
                                                                    className="text-gray-400 hover:text-[#4085b3] hover:bg-sky-50 p-1.5 rounded transition-colors cursor-pointer"
                                                                    title="Manage Offering Status (Active / Suspend / Archive)"
                                                                >
                                                                    <Archive className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
                                <span>
                                    Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                                    <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, filteredGrades.length)}</span> of{" "}
                                    <span className="font-semibold text-gray-900">{filteredGrades.length}</span> grades
                                </span>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                        <span>Prev</span>
                                    </button>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => setCurrentPage(page)}
                                            className={`w-7 h-7 rounded border text-xs font-medium transition-colors cursor-pointer ${
                                                currentPage === page 
                                                    ? "bg-[#4085b3] text-white border-[#4085b3]" 
                                                    : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer"
                                    >
                                        <span>Next</span>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Add Section Modal */}
            <AddSectionModal 
                isOpen={addSectionModalState.isOpen}
                onClose={() => setAddSectionModalState({ isOpen: false, schoolGradeId: "", gradeName: "" })}
                onSuccess={() => loadGradesForYear(selectedYearId)}
                schoolGradeId={addSectionModalState.schoolGradeId}
                gradeName={addSectionModalState.gradeName}
            />

            {/* Edit Section Modal */}
            <EditSectionModal 
                isOpen={editSectionModalState.isOpen}
                onClose={() => setEditSectionModalState({ isOpen: false, section: null, gradeName: "" })}
                onSuccess={() => loadGradesForYear(selectedYearId)}
                section={editSectionModalState.section}
                gradeName={editSectionModalState.gradeName}
            />

            {/* Grade Offering Lifecycle / Archive Modal */}
            <GradeStatusModal
                isOpen={statusModalState.isOpen}
                onClose={() => setStatusModalState({ isOpen: false, schoolGrade: null })}
                onSuccess={() => loadGradesForYear(selectedYearId)}
                schoolGrade={statusModalState.schoolGrade}
                academicYearName={selectedYear?.name || "Current Session"}
            />
        </div>
    );
}
