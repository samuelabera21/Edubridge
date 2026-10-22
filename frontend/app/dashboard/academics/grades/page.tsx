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
    const [showFilters, setShowFilters] = useState(false);

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

            {/* 4 KPI Metric Cards: Left-to-right clean blue hover fill */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Offered Grades */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Offered Grades
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {schoolGrades.length}
                        </span>
                    </div>
                    <GraduationCap className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Total Sections */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Class Sections
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {totalSections}
                        </span>
                    </div>
                    <Layers className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Total Capacity */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Total Capacity
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {totalCapacity}
                        </span>
                    </div>
                    <Users className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Avg Capacity / Sec */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Avg / Section
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {avgCapacityPerSection}
                        </span>
                    </div>
                    <ShieldCheck className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
            </div>

            {/* Direct Data Workspace: No outer container card */}
            <div className="space-y-4 pt-1">
                {/* Search & Filter & View Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search grade or section..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors"
                            />
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-600 transition-colors cursor-pointer flex-shrink-0"
                                title="Reset search and filters"
                            >
                                <RotateCcw className="w-3 h-3 text-slate-400" />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>

                    {/* Right Side: Filters toggle button & View switch */}
                    <div className="flex items-center gap-2">
                        {/* Filters Toggle Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-medium transition-all cursor-pointer ${
                                showFilters || hasActiveFilters
                                    ? "bg-[#4085b3] text-white border-[#4085b3] shadow-2xs"
                                    : "bg-white border-slate-300 text-slate-700 hover:border-[#4085b3] hover:text-[#4085b3]"
                            }`}
                            title="Toggle filters"
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Filters</span>
                            {hasActiveFilters && (
                                <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 animate-pulse" />
                            )}
                        </button>

                        {/* View Switch: Cards / Table */}
                        <div className="inline-flex items-center p-0.5 bg-white border border-slate-300 rounded">
                            <button
                                onClick={() => setViewMode("cards")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                                    viewMode === "cards" 
                                        ? "bg-[#4085b3] text-white font-semibold shadow-2xs" 
                                        : "text-slate-500 hover:text-[#4085b3] hover:bg-slate-50"
                                }`}
                                title="Cards View"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>Cards</span>
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                                    viewMode === "table" 
                                        ? "bg-[#4085b3] text-white font-semibold shadow-2xs" 
                                        : "text-slate-500 hover:text-[#4085b3] hover:bg-slate-50"
                                }`}
                                title="Table View"
                            >
                                <List className="w-3.5 h-3.5" />
                                <span>Table</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Collapsible Filter Bar */}
                {showFilters && (
                    <div className="flex flex-wrap items-center gap-2.5 p-3 bg-white border border-slate-200 rounded shadow-2xs animate-in fade-in duration-200">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Filter:</span>
                        
                        {/* Grade Filter */}
                        <select
                            value={selectedGradeFilter}
                            onChange={(e) => setSelectedGradeFilter(e.target.value)}
                            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 hover:border-[#4085b3] focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] cursor-pointer transition-colors"
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
                            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 hover:border-[#4085b3] focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] cursor-pointer transition-colors"
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
                            className="text-xs border border-slate-300 rounded px-2.5 py-1.5 bg-white text-slate-700 hover:border-[#4085b3] focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] cursor-pointer transition-colors"
                        >
                            <option value="LEVEL_ASC">Level: Low to High</option>
                            <option value="LEVEL_DESC">Level: High to Low</option>
                            <option value="NAME_ASC">Name (A &rarr; Z)</option>
                            <option value="SECTIONS_DESC">Most Sections</option>
                            <option value="CAPACITY_DESC">Highest Capacity</option>
                        </select>

                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-auto"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset filters</span>
                            </button>
                        )}
                    </div>
                )}

                {gradesLoading ? (
                    <div className="p-12 text-center text-xs text-gray-500 bg-white border border-slate-200 rounded">
                        <LoadingState message="Updating grade offerings..." />
                    </div>
                ) : filteredGrades.length === 0 ? (
                    <div className="py-16 text-center text-xs text-gray-500 space-y-2 bg-white border border-slate-200 rounded">
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
                        {/* VIEW 1: CARDS VIEW (Clean blue fill from left to right on hover) */}
                        {viewMode === "cards" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                                            <div className="relative overflow-hidden bg-white border border-slate-200 rounded p-5 shadow-2xs hover:border-[#4085b3] hover:shadow-md transition-all duration-300 flex flex-col justify-between h-full cursor-pointer">
                                                {/* Clean Blue Fill Layer from Left to Right */}
                                                <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />

                                                <div className="relative z-10">
                                                    {/* Top Row: Grade Title + Level Badge & Status */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <h3 className="text-base font-bold text-slate-900 group-hover:text-white transition-colors duration-300">
                                                                {sg.grade?.name || "Unknown Grade"}
                                                            </h3>
                                                            <span className="inline-block text-[11px] font-semibold text-slate-500 group-hover:text-blue-100 transition-colors duration-300 mt-0.5">
                                                                Level {gradeLevel}
                                                            </span>
                                                        </div>

                                                        {/* Status Pill Button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setStatusModalState({ isOpen: true, schoolGrade: sg });
                                                            }}
                                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                                                                sg.status === "ARCHIVED"
                                                                    ? "bg-purple-50 text-purple-700 border-purple-200 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/40"
                                                                    : sg.status === "SUSPENDED"
                                                                    ? "bg-amber-50 text-amber-700 border-amber-200 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/40"
                                                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/40"
                                                            }`}
                                                            title="Change offering status"
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                                sg.status === "ARCHIVED" ? "bg-purple-500 group-hover:bg-white" :
                                                                sg.status === "SUSPENDED" ? "bg-amber-500 group-hover:bg-white" :
                                                                "bg-emerald-500 group-hover:bg-white"
                                                            }`} />
                                                            <span>{sg.status === "ARCHIVED" ? "Archived" : sg.status === "SUSPENDED" ? "Suspended" : "Active"}</span>
                                                            <ChevronDown className="w-3 h-3 opacity-60" />
                                                        </button>
                                                    </div>

                                                    {/* Metric Stat Blocks */}
                                                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 group-hover:border-white/20 transition-colors duration-300">
                                                        <div className="text-center p-2 rounded bg-slate-50 group-hover:bg-white/10 transition-colors duration-300">
                                                            <span className="block text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-100 transition-colors duration-300">
                                                                Sections
                                                            </span>
                                                            <span className="text-sm font-bold text-slate-900 group-hover:text-white transition-colors duration-300 font-mono">
                                                                {sectionCount}
                                                            </span>
                                                        </div>
                                                        <div className="text-center p-2 rounded bg-slate-50 group-hover:bg-white/10 transition-colors duration-300">
                                                            <span className="block text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-100 transition-colors duration-300">
                                                                Subjects
                                                            </span>
                                                            <span className="text-sm font-bold text-slate-900 group-hover:text-white transition-colors duration-300 font-mono">
                                                                {subjectCount}
                                                            </span>
                                                        </div>
                                                        <div className="text-center p-2 rounded bg-slate-50 group-hover:bg-white/10 transition-colors duration-300">
                                                            <span className="block text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-100 transition-colors duration-300">
                                                                Capacity
                                                            </span>
                                                            <span className="text-sm font-bold text-slate-900 group-hover:text-white transition-colors duration-300 font-mono">
                                                                {gradeCapacity}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bottom Details Line */}
                                                <div className="relative z-10 mt-4 pt-3 border-t border-slate-100 group-hover:border-white/20 flex items-center justify-between text-xs transition-colors duration-300">
                                                    <span className="text-slate-400 group-hover:text-blue-100 text-[11px] transition-colors duration-300">
                                                        Offering Details
                                                    </span>
                                                    <span className="text-[#4085b3] group-hover:text-white font-medium inline-flex items-center gap-1 transition-colors duration-300">
                                                        <span>Manage</span>
                                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            /* VIEW 2: COMPACT ADMINISTRATIVE TABLE VIEW (Clean border directly on canvas) */
                            <div className="border border-slate-200 bg-white rounded overflow-hidden shadow-2xs">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs text-gray-700">
                                        <thead className="bg-gray-50/75 border-b border-gray-200 text-gray-500 uppercase font-semibold text-[11px] tracking-wider">
                                            <tr>
                                                <th className="px-5 py-3.5">Grade Level</th>
                                                <th className="px-4 py-3.5">Status</th>
                                                <th className="px-5 py-3.5">Sections & Capacity</th>
                                                <th className="px-4 py-3.5 text-center">Curriculum Subjects</th>
                                                <th className="px-5 py-3.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedGrades.map((sg) => {
                                                const gradeCapacity = (sg.sections || []).reduce((acc: number, s: any) => acc + (s.capacity || 0), 0);
                                                const sectionCount = sg.sections?.length || 0;

                                                return (
                                                    <tr key={sg.id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-5 py-4">
                                                            <div className="font-bold text-gray-900 text-sm">
                                                                {sg.grade?.name || "Unknown"}
                                                            </div>
                                                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                                Level {sg.grade?.level ?? 0}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-4">
                                                            {sg.status === "ARCHIVED" ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                                    Archived
                                                                </span>
                                                            ) : sg.status === "SUSPENDED" ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                    Suspended
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                    Active
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4">
                                                            {sg.sections && sg.sections.length > 0 ? (
                                                                <div className="space-y-1.5">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        {sg.sections.map((sec: any) => (
                                                                            <div 
                                                                                key={sec.id} 
                                                                                className="group/sec inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-800 text-xs hover:border-[#4085b3] transition-colors"
                                                                            >
                                                                                <span className="font-semibold text-gray-900">Sec {sec.name}</span>
                                                                                <span className="text-[11px] text-gray-400 font-mono">
                                                                                    {sec.capacity || 50} max
                                                                                </span>
                                                                                {hasManagePermission && (
                                                                                    <div className="hidden group-hover/sec:inline-flex items-center gap-1 pl-1 border-l border-gray-200">
                                                                                        <button
                                                                                            onClick={() => setEditSectionModalState({
                                                                                                isOpen: true,
                                                                                                section: sec,
                                                                                                gradeName: sg.grade?.name
                                                                                            })}
                                                                                            className="text-gray-400 hover:text-[#4085b3] p-0.5 transition-colors cursor-pointer"
                                                                                            title="Edit Section Capacity"
                                                                                        >
                                                                                            <Edit2 className="w-2.5 h-2.5" />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => handleDeleteSection(sec.id, sec.name)}
                                                                                            className="text-gray-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                                                                                            title="Delete Section"
                                                                                        >
                                                                                            <Trash2 className="w-2.5 h-2.5" />
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-400">
                                                                        {sectionCount} {sectionCount === 1 ? "section" : "sections"} &bull; {gradeCapacity} seats total
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 italic">No sections created</span>
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-4 text-center">
                                                            {sg.gradeSubjects && sg.gradeSubjects.length > 0 ? (
                                                                <Link href={`/dashboard/academics/subjects?gradeId=${sg.id}&yearId=${selectedYearId}`}>
                                                                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#4085b3] bg-sky-50/70 hover:bg-[#4085b3] hover:text-white border border-sky-100 transition-colors cursor-pointer">
                                                                        <BookOpen className="w-3 h-3" />
                                                                        <span>{sg.gradeSubjects.length} Subjects</span>
                                                                    </span>
                                                                </Link>
                                                            ) : (
                                                                <Link href={`/dashboard/academics/subjects?gradeId=${sg.id}&yearId=${selectedYearId}`}>
                                                                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium text-[#4085b3] hover:text-white bg-sky-50/60 hover:bg-[#4085b3] border border-dashed border-[#4085b3]/40 transition-colors cursor-pointer" title="Assign curriculum subjects and weekly periods">
                                                                        <Plus className="w-3 h-3" />
                                                                        <span>Assign Subjects</span>
                                                                    </span>
                                                                </Link>
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-4 text-right">
                                                            <div className="inline-flex items-center justify-end space-x-2">
                                                                {hasManagePermission && (
                                                                    <button
                                                                        onClick={() => setAddSectionModalState({
                                                                            isOpen: true,
                                                                            schoolGradeId: sg.id,
                                                                            gradeName: sg.grade?.name
                                                                        })}
                                                                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-md border border-gray-300 font-medium transition-colors cursor-pointer"
                                                                        title="Add a new section"
                                                                    >
                                                                        <Plus className="w-3 h-3 text-gray-500" />
                                                                        <span>Section</span>
                                                                    </button>
                                                                )}
                                                                <Link href={`/dashboard/academics/grades/${sg.id}`}>
                                                                    <button className="inline-flex items-center space-x-1 px-3 py-1 text-xs text-[#4085b3] hover:text-white hover:bg-[#4085b3] rounded-md border border-[#4085b3] font-semibold transition-colors cursor-pointer">
                                                                        <span>Details</span>
                                                                        <ChevronRight className="w-3 h-3" />
                                                                    </button>
                                                                </Link>
                                                                {hasManagePermission && (
                                                                    <button
                                                                        onClick={() => setStatusModalState({ isOpen: true, schoolGrade: sg })}
                                                                        className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-md transition-colors cursor-pointer"
                                                                        title="Change Status / Archive"
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
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 pt-2">
                                <span>
                                    Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                                    <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, filteredGrades.length)}</span> of{" "}
                                    <span className="font-semibold text-slate-900">{filteredGrades.length}</span> grades
                                </span>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer"
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
                                                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer"
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
