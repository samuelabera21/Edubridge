"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Plus, 
    Search, 
    RotateCcw, 
    ChevronLeft, 
    ChevronRight, 
    Users, 
    UserCheck, 
    Briefcase, 
    GraduationCap, 
    X,
    SlidersHorizontal,
    ChevronDown,
    ChevronUp,
    Filter,
    BookOpen
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function TeachersDirectoryPage() {
    const { authData } = useAuth();
    const [teachers, setTeachers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Toggle filter panel visibility (hidden by default)
    const [showFilters, setShowFilters] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [employmentTypeFilter, setEmploymentTypeFilter] = useState("ALL");
    const [assignmentFilter, setAssignmentFilter] = useState("ALL"); // ALL, ASSIGNED, UNASSIGNED
    const [gradeFilter, setGradeFilter] = useState("ALL");
    const [sectionFilter, setSectionFilter] = useState("ALL");
    const [subjectFilter, setSubjectFilter] = useState("ALL");
    const [educationFilter, setEducationFilter] = useState("ALL"); // ALL, DOCTORATE, MASTERS, BACHELORS, DIPLOMA, CERTIFICATE
    const [genderFilter, setGenderFilter] = useState("ALL"); // ALL, MALE, FEMALE

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/teacher");
            if (!res.ok) throw new Error("Failed to load teachers directory");
            const data = await res.json();
            setTeachers(data || []);
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred while loading teachers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);



    // Dynamically derive available filter options from the dataset
    const availableOptions = useMemo(() => {
        const gradesSet = new Set<string>();
        const sectionsSet = new Set<string>();
        const subjectsSet = new Set<string>();

        teachers.forEach((t) => {
            (t.assignments || []).forEach((asgn: any) => {
                if (asgn.schoolGrade?.grade?.name) gradesSet.add(asgn.schoolGrade.grade.name);
                if (asgn.section?.name) sectionsSet.add(asgn.section.name);
                if (asgn.subject?.name) subjectsSet.add(asgn.subject.name);
            });
            (t.specializations || []).forEach((s: any) => {
                if (s.subject?.name) subjectsSet.add(s.subject.name);
            });
        });

        return {
            grades: Array.from(gradesSet).sort(),
            sections: Array.from(sectionsSet).sort(),
            subjects: Array.from(subjectsSet).sort()
        };
    }, [teachers]);

    // Active filter count (excluding free-text search)
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (statusFilter !== "ALL") count++;
        if (employmentTypeFilter !== "ALL") count++;
        if (assignmentFilter !== "ALL") count++;
        if (gradeFilter !== "ALL") count++;
        if (sectionFilter !== "ALL") count++;
        if (subjectFilter !== "ALL") count++;
        if (educationFilter !== "ALL") count++;
        if (genderFilter !== "ALL") count++;
        return count;
    }, [statusFilter, employmentTypeFilter, assignmentFilter, gradeFilter, sectionFilter, subjectFilter, educationFilter, genderFilter]);

    // Filter logic
    const filteredTeachers = useMemo(() => {
        return teachers.filter((teacher) => {
            const empStatus = teacher.employmentStatus || teacher.status || "ACTIVE";
            if (statusFilter !== "ALL" && empStatus !== statusFilter) {
                return false;
            }

            if (employmentTypeFilter !== "ALL" && teacher.employmentType !== employmentTypeFilter) {
                return false;
            }

            if (genderFilter !== "ALL" && teacher.gender?.toUpperCase() !== genderFilter.toUpperCase()) {
                return false;
            }

            // Teaching Assignment Filter
            const assignmentCount = teacher.assignments?.length || 0;
            if (assignmentFilter === "ASSIGNED" && assignmentCount === 0) {
                return false;
            }
            if (assignmentFilter === "UNASSIGNED" && assignmentCount > 0) {
                return false;
            }

            // Grade Filter
            if (gradeFilter !== "ALL") {
                const teachesGrade = teacher.assignments?.some((a: any) => a.schoolGrade?.grade?.name === gradeFilter);
                if (!teachesGrade) return false;
            }

            // Section Filter
            if (sectionFilter !== "ALL") {
                const teachesSection = teacher.assignments?.some((a: any) => a.section?.name === sectionFilter);
                if (!teachesSection) return false;
            }

            // Subject Filter
            if (subjectFilter !== "ALL") {
                const teachesSubject = teacher.assignments?.some((a: any) => a.subject?.name === subjectFilter) ||
                    teacher.specializations?.some((s: any) => s.subject?.name === subjectFilter);
                if (!teachesSubject) return false;
            }

            // Education / Qualification level filter
            if (educationFilter !== "ALL") {
                const hasLevel = teacher.qualifications?.some((q: any) => 
                    q.qualificationLevel?.toUpperCase() === educationFilter.toUpperCase()
                ) || (typeof teacher.qualification === "string" && teacher.qualification.toUpperCase().includes(educationFilter.toUpperCase()));
                if (!hasLevel) return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const fullName = `${teacher.firstName || ""} ${teacher.fatherName || ""} ${teacher.lastName || ""}`.toLowerCase();
                const staffId = (teacher.staffIdCode || teacher.employeeId || "").toLowerCase();
                const job = (teacher.jobTitle || "").toLowerCase();
                const qual = teacher.qualifications?.map((q: any) => `${q.qualificationTitle} ${q.fieldOfStudy} ${q.qualificationLevel}`).join(" ").toLowerCase() || "";
                const subjects = [
                    ...(teacher.assignments?.map((a: any) => a.subject?.name) || []),
                    ...(teacher.specializations?.map((s: any) => s.subject?.name) || [])
                ].join(" ").toLowerCase();
                const grades = (teacher.assignments?.map((a: any) => a.schoolGrade?.grade?.name) || []).join(" ").toLowerCase();
                const sections = (teacher.assignments?.map((a: any) => a.section?.name) || []).join(" ").toLowerCase();

                if (!fullName.includes(query) && 
                    !staffId.includes(query) && 
                    !job.includes(query) && 
                    !qual.includes(query) &&
                    !subjects.includes(query) &&
                    !grades.includes(query) &&
                    !sections.includes(query)
                ) {
                    return false;
                }
            }

            return true;
        });
    }, [
        teachers, 
        statusFilter, 
        employmentTypeFilter, 
        genderFilter,
        assignmentFilter, 
        gradeFilter, 
        sectionFilter, 
        subjectFilter, 
        educationFilter, 
        searchQuery
    ]);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [
        searchQuery, 
        statusFilter, 
        employmentTypeFilter, 
        genderFilter,
        assignmentFilter, 
        gradeFilter, 
        sectionFilter, 
        subjectFilter, 
        educationFilter, 
        pageSize
    ]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
    const paginatedTeachers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredTeachers.slice(start, start + pageSize);
    }, [filteredTeachers, currentPage, pageSize]);

    const hasActiveFilters = searchQuery !== "" || activeFilterCount > 0;

    // Filter-aware statistics for KPI cards (dynamically updates when filters are active)
    const stats = useMemo(() => {
        const targetList = hasActiveFilters ? filteredTeachers : teachers;
        const total = targetList.length;
        const active = targetList.filter(t => (t.employmentStatus || t.status || "ACTIVE") === "ACTIVE").length;
        const permanent = targetList.filter(t => (t.employmentType || "PERMANENT") === "PERMANENT").length;
        const onLeave = targetList.filter(t => (t.employmentStatus || t.status) === "ON_LEAVE").length;
        return { total, active, permanent, onLeave };
    }, [teachers, filteredTeachers, hasActiveFilters]);

    const handleClearFilters = () => {
        setSearchQuery("");
        setStatusFilter("ALL");
        setEmploymentTypeFilter("ALL");
        setAssignmentFilter("ALL");
        setGradeFilter("ALL");
        setSectionFilter("ALL");
        setSubjectFilter("ALL");
        setEducationFilter("ALL");
        setGenderFilter("ALL");
    };

    if (loading && teachers.length === 0) {
        return <LoadingState message="Loading teacher directory..." />;
    }

    if (error && teachers.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans text-slate-900">
            {/* Header: Clean, direct on page background */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Teaching Faculty</h1>
                    {hasActiveFilters && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-[#4085b3] border border-sky-200">
                            Filtered: {filteredTeachers.length} of {teachers.length}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2.5">
                    <Link href="/dashboard/teachers/assignments">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="hover:border-[#4085b3] hover:text-[#4085b3] hover:bg-[#4085b3]/5 transition-all duration-200 shadow-2xs"
                        >
                            Teaching Assignments
                        </Button>
                    </Link>
                    <Link href="/dashboard/teachers/register">
                        <Button 
                            size="sm" 
                            className="bg-[#4085b3] hover:bg-[#2b6a94] text-white font-medium shadow-2xs" 
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            Add Teacher
                        </Button>
                    </Link>
                </div>
            </div>

            {/* 4 KPI Metric Cards: Left-to-right clean blue hover fill, minimal clean text */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total / Matching Faculty */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            {hasActiveFilters ? "Matching Faculty" : "Total Faculty"}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                {stats.total}
                            </span>
                            {hasActiveFilters && (
                                <span className="text-xs text-slate-400 group-hover:text-blue-100 font-medium">
                                    of {teachers.length} total
                                </span>
                            )}
                        </div>
                    </div>
                    <Users className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                </div>

                {/* 2. Active Teachers */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Active Faculty
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                {stats.active}
                            </span>
                            {hasActiveFilters && (
                                <span className="text-xs text-slate-400 group-hover:text-blue-100 font-medium">
                                    in filter
                                </span>
                            )}
                        </div>
                    </div>
                    <UserCheck className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                </div>

                {/* 3. Permanent Staff */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Permanent Staff
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                {stats.permanent}
                            </span>
                            {hasActiveFilters && (
                                <span className="text-xs text-slate-400 group-hover:text-blue-100 font-medium">
                                    in filter
                                </span>
                            )}
                        </div>
                    </div>
                    <Briefcase className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                </div>

                {/* 4. On Leave */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            On Leave
                        </span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                {stats.onLeave}
                            </span>
                            {hasActiveFilters && (
                                <span className="text-xs text-slate-400 group-hover:text-blue-100 font-medium">
                                    in filter
                                </span>
                            )}
                        </div>
                    </div>
                    <GraduationCap className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                </div>
            </div>

            {/* Search and Filters Toggle Bar */}
            <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row items-center gap-2.5 text-xs">
                    {/* Search Input */}
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search faculty by name, staff ID, subject, grade, qualification..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4085b3] shadow-2xs transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                title="Clear search"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(prev => !prev)}
                        className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                            showFilters || activeFilterCount > 0
                                ? "bg-[#4085b3] text-white border-[#4085b3] hover:bg-[#2b6a94]"
                                : "bg-white text-slate-700 border-slate-300 hover:border-[#4085b3] hover:text-[#4085b3]"
                        }`}
                        title="Toggle filter controls"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Filters</span>
                        {activeFilterCount > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                showFilters || activeFilterCount > 0 ? "bg-white text-[#4085b3]" : "bg-[#4085b3] text-white"
                            }`}>
                                {activeFilterCount}
                            </span>
                        )}
                        {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {hasActiveFilters && (
                        <button
                            onClick={handleClearFilters}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-[#4085b3] hover:border-[#4085b3] hover:bg-[#4085b3]/5 bg-white border border-slate-300 rounded-lg transition-all cursor-pointer shadow-2xs"
                            title="Reset all filters"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset All</span>
                        </button>
                    )}
                </div>

                {/* Collapsible Filter Panel */}
                {showFilters && (
                    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-4 text-xs transition-all animate-in fade-in duration-150">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div className="flex items-center space-x-2">
                                <Filter className="w-4 h-4 text-[#4085b3]" />
                                <span className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                                    Filter Faculty Directory
                                </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                                Showing <strong className="text-slate-800">{filteredTeachers.length}</strong> of {teachers.length} teachers
                            </span>
                        </div>

                        {/* 8 Essential Filter Dropdowns Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {/* 1. Grade Filter */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Grade Level
                                </label>
                                <select
                                    value={gradeFilter}
                                    onChange={(e) => setGradeFilter(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                >
                                    <option value="ALL">All Grades</option>
                                    {availableOptions.grades.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. Section Filter */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Section
                                </label>
                                <select
                                    value={sectionFilter}
                                    onChange={(e) => setSectionFilter(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                >
                                    <option value="ALL">All Sections</option>
                                    {availableOptions.sections.map(s => (
                                        <option key={s} value={s}>Section {s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 3. Subject Filter */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Subject Taught
                                </label>
                                <select
                                    value={subjectFilter}
                                    onChange={(e) => setSubjectFilter(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                >
                                    <option value="ALL">All Subjects</option>
                                    {availableOptions.subjects.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 4. Assignment / Allocation Status */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Teaching Assignment
                                </label>
                                <select
                                    value={assignmentFilter}
                                    onChange={(e) => setAssignmentFilter(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                >
                                    <option value="ALL">All Faculty</option>
                                    <option value="ASSIGNED">Assigned (Has Classes)</option>
                                    <option value="UNASSIGNED">Unassigned (0 Classes)</option>
                                </select>
                            </div>

                            {/* 5. Education / Qualification Level */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Qualification Level
                                </label>
                                <select
                                    value={educationFilter}
                                    onChange={(e) => setEducationFilter(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                >
                                    <option value="ALL">All Levels</option>
                                    <option value="DOCTORATE">Doctorate / PhD</option>
                                    <option value="MASTERS">Master's Degree</option>
                                    <option value="BACHELORS">Bachelor's Degree</option>
                                    <option value="DIPLOMA">Diploma</option>
                                    <option value="CERTIFICATE">Certificate</option>
                                </select>
                            </div>

                            {/* 6. Employment Status */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Employment Status
                                </label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="ON_LEAVE">On Leave</option>
                                    <option value="TRANSFERRED">Transferred</option>
                                    <option value="RESIGNED">Resigned</option>
                                    <option value="RETIRED">Retired</option>
                                </select>
                            </div>

                            {/* 7. Employment Type */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Employment Type
                                </label>
                                <select
                                    value={employmentTypeFilter}
                                    onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                >
                                    <option value="ALL">All Types</option>
                                    <option value="PERMANENT">Permanent</option>
                                    <option value="CONTRACT">Contract</option>
                                    <option value="PART_TIME">Part-Time</option>
                                    <option value="TRANSFER_IN">Transferred In</option>
                                </select>
                            </div>

                            {/* 8. Gender */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                    Gender
                                </label>
                                <select
                                    value={genderFilter}
                                    onChange={(e) => setGenderFilter(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                                >
                                    <option value="ALL">All Genders</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </div>
                        </div>

                        {/* Active Filter Pills Bar */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                                <span className="text-[11px] text-slate-500 mr-1">Active filters:</span>
                                {gradeFilter !== "ALL" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#4085b3] border border-sky-200 text-[11px] font-medium">
                                        Grade: {gradeFilter}
                                        <button onClick={() => setGradeFilter("ALL")} className="hover:text-sky-900 cursor-pointer">&times;</button>
                                    </span>
                                )}
                                {sectionFilter !== "ALL" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#4085b3] border border-sky-200 text-[11px] font-medium">
                                        Section: {sectionFilter}
                                        <button onClick={() => setSectionFilter("ALL")} className="hover:text-sky-900 cursor-pointer">&times;</button>
                                    </span>
                                )}
                                {subjectFilter !== "ALL" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#4085b3] border border-sky-200 text-[11px] font-medium">
                                        Subject: {subjectFilter}
                                        <button onClick={() => setSubjectFilter("ALL")} className="hover:text-sky-900 cursor-pointer">&times;</button>
                                    </span>
                                )}
                                {assignmentFilter !== "ALL" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#4085b3] border border-sky-200 text-[11px] font-medium">
                                        Allocation: {assignmentFilter}
                                        <button onClick={() => setAssignmentFilter("ALL")} className="hover:text-sky-900 cursor-pointer">&times;</button>
                                    </span>
                                )}
                                {educationFilter !== "ALL" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#4085b3] border border-sky-200 text-[11px] font-medium">
                                        Level: {educationFilter}
                                        <button onClick={() => setEducationFilter("ALL")} className="hover:text-sky-900 cursor-pointer">&times;</button>
                                    </span>
                                )}
                                {statusFilter !== "ALL" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#4085b3] border border-sky-200 text-[11px] font-medium">
                                        Status: {statusFilter}
                                        <button onClick={() => setStatusFilter("ALL")} className="hover:text-sky-900 cursor-pointer">&times;</button>
                                    </span>
                                )}
                                {employmentTypeFilter !== "ALL" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#4085b3] border border-sky-200 text-[11px] font-medium">
                                        Type: {employmentTypeFilter}
                                        <button onClick={() => setEmploymentTypeFilter("ALL")} className="hover:text-sky-900 cursor-pointer">&times;</button>
                                    </span>
                                )}
                                {genderFilter !== "ALL" && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-[#4085b3] border border-sky-200 text-[11px] font-medium">
                                        Gender: {genderFilter}
                                        <button onClick={() => setGenderFilter("ALL")} className="hover:text-sky-900 cursor-pointer">&times;</button>
                                    </span>
                                )}
                                <button
                                    onClick={handleClearFilters}
                                    className="text-[11px] text-slate-500 hover:text-rose-600 underline ml-2 cursor-pointer"
                                >
                                    Clear all
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Teachers Data Table */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                {filteredTeachers.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                        <p>{hasActiveFilters ? "No teachers match your search." : "No teachers registered yet."}</p>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="text-xs text-[#4085b3] font-medium hover:underline cursor-pointer"
                            >
                                Reset filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-slate-700">
                                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px]">
                                    <tr>
                                        <th className="px-3 py-3 w-10 text-center">#</th>
                                        <th className="px-4 py-3">Teacher</th>
                                        <th className="px-4 py-3 whitespace-nowrap">Teaching Load</th>
                                        <th className="px-4 py-3">Qualification</th>
                                        <th className="px-3 py-3 text-center">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTeachers.map((teacher, idx) => {
                                        const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                                        const primaryQual = teacher.qualifications?.[0];
                                        const formatLevel = (lvl?: string) => {
                                            if (!lvl) return "";
                                            const map: Record<string, string> = {
                                                DOCTORATE: "Doctorate / PhD",
                                                MASTERS: "Master's",
                                                BACHELORS: "Bachelor's",
                                                DIPLOMA: "Diploma",
                                                CERTIFICATE: "Certificate"
                                            };
                                            return map[lvl.toUpperCase()] || lvl;
                                        };
                                        const qualTitle = formatLevel(primaryQual?.qualificationLevel) || teacher.qualification || "—";
                                        const qualField = primaryQual?.fieldOfStudy || primaryQual?.qualificationTitle || "";
                                        const empType = teacher.employmentType ? teacher.employmentType.replace(/_/g, " ").toLowerCase() : "Permanent";
                                        const empStatus = teacher.employmentStatus || teacher.status || "ACTIVE";
                                        const assignmentCount = teacher.assignments?.length || 0;
                                        const staffId = teacher.staffIdCode || teacher.employeeId || null;

                                        return (
                                            <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-3 py-3 text-center text-slate-400 font-mono text-[11px]">
                                                    {globalIndex}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-full bg-[#4085b3]/10 text-[#4085b3] font-bold text-xs flex items-center justify-center shrink-0 border border-[#4085b3]/20">
                                                            {teacher.firstName ? teacher.firstName[0].toUpperCase() : "T"}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/dashboard/teachers/${teacher.id}`}
                                                                className="font-semibold text-slate-900 hover:text-[#4085b3] transition-colors block truncate"
                                                            >
                                                                {teacher.firstName} {teacher.fatherName} {teacher.lastName}
                                                            </Link>
                                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono leading-none mt-0.5">
                                                                {staffId && <span className="font-semibold text-slate-600">{staffId}</span>}
                                                                {teacher.gender && (
                                                                    <>
                                                                        {staffId && <span className="text-slate-300 font-sans">•</span>}
                                                                        <span className="capitalize font-sans text-slate-400">{teacher.gender.toLowerCase()}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center space-x-1.5">
                                                        {assignmentCount > 0 ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-[#4085b3] border border-sky-200">
                                                                {assignmentCount} {assignmentCount === 1 ? "Class" : "Classes"}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    <div className="leading-tight">
                                                        <div className="font-medium text-slate-900">{qualTitle}</div>
                                                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                                            {qualField && qualField !== qualTitle && (
                                                                <span>{qualField}</span>
                                                            )}
                                                            {qualField && qualField !== qualTitle && (
                                                                <span className="text-slate-300">•</span>
                                                            )}
                                                            <span className="capitalize text-slate-400">{empType}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${
                                                        empStatus === "ACTIVE" 
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                                            : empStatus === "ON_LEAVE"
                                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                            : "bg-slate-100 text-slate-700 border border-slate-200"
                                                    }`}>
                                                        {empStatus.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Link href={`/dashboard/teachers/${teacher.id}`}>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="px-2.5 py-1 text-xs h-7 hover:border-[#4085b3] hover:text-[#4085b3] hover:bg-[#4085b3]/5 transition-all duration-200 cursor-pointer shadow-2xs"
                                                            >
                                                                View Profile
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/dashboard/teachers/assignments/manage?teacherId=${teacher.id}`}>
                                                            <Button
                                                                size="sm"
                                                                className="px-2.5 py-1 text-xs text-white bg-[#4085b3] hover:bg-[#2b6a94] h-7 font-medium transition-colors cursor-pointer shadow-2xs"
                                                            >
                                                                Assign
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                            <div className="flex items-center space-x-3">
                                <span>
                                    Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span>–<span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, filteredTeachers.length)}</span> of{" "}
                                    <span className="font-semibold text-slate-900">{filteredTeachers.length}</span>
                                </span>
                                <div className="flex items-center space-x-1.5 pl-3 border-l border-slate-300">
                                    <span className="text-slate-500">Rows:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#4085b3] hover:border-[#4085b3] transition-colors cursor-pointer shadow-2xs"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center space-x-1.5">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="py-1 px-2.5 text-xs border-slate-300 hover:border-[#4085b3] hover:text-[#4085b3] hover:bg-[#4085b3]/5 disabled:opacity-40"
                                        leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                                    >
                                        Prev
                                    </Button>

                                    <div className="px-2 font-medium text-slate-700">
                                        {currentPage} / {totalPages}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="py-1 px-2.5 text-xs border-slate-300 hover:border-[#4085b3] hover:text-[#4085b3] hover:bg-[#4085b3]/5 disabled:opacity-40"
                                    >
                                        <span className="mr-1">Next</span>
                                        <ChevronRight className="w-3.5 h-3.5 inline" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
