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
    X 
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

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [employmentTypeFilter, setEmploymentTypeFilter] = useState("ALL");

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

    // Summary statistics for KPI cards
    const stats = useMemo(() => {
        const total = teachers.length;
        const active = teachers.filter(t => (t.employmentStatus || t.status || "ACTIVE") === "ACTIVE").length;
        const permanent = teachers.filter(t => (t.employmentType || "PERMANENT") === "PERMANENT").length;
        const onLeave = teachers.filter(t => (t.employmentStatus || t.status) === "ON_LEAVE").length;
        return { total, active, permanent, onLeave };
    }, [teachers]);

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

            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const fullName = `${teacher.firstName || ""} ${teacher.fatherName || ""} ${teacher.lastName || ""}`.toLowerCase();
                const staffId = (teacher.staffIdCode || teacher.employeeId || "").toLowerCase();
                const job = (teacher.jobTitle || "").toLowerCase();
                const qual = teacher.qualifications?.map((q: any) => `${q.qualificationTitle} ${q.fieldOfStudy}`).join(" ").toLowerCase() || "";
                
                if (!fullName.includes(query) && !staffId.includes(query) && !job.includes(query) && !qual.includes(query)) {
                    return false;
                }
            }

            return true;
        });
    }, [teachers, statusFilter, employmentTypeFilter, searchQuery]);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, employmentTypeFilter, pageSize]);

    // Pagination calculations
    const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
    const paginatedTeachers = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredTeachers.slice(start, start + pageSize);
    }, [filteredTeachers, currentPage, pageSize]);

    const hasActiveFilters = searchQuery !== "" || statusFilter !== "ALL" || employmentTypeFilter !== "ALL";

    const handleClearFilters = () => {
        setSearchQuery("");
        setStatusFilter("ALL");
        setEmploymentTypeFilter("ALL");
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
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Teaching Faculty</h1>
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
                {/* 1. Total Faculty */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Total Faculty
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {stats.total}
                        </span>
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
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {stats.active}
                        </span>
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
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {stats.permanent}
                        </span>
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
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {stats.onLeave}
                        </span>
                    </div>
                    <GraduationCap className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                </div>
            </div>

            {/* Clean Inline Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 text-xs">
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search faculty or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4085b3] shadow-2xs transition-colors"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Status Dropdown */}
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-[#4085b3] hover:border-[#4085b3] transition-colors cursor-pointer shadow-2xs"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_LEAVE">On Leave</option>
                    <option value="TRANSFERRED">Transferred</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="RETIRED">Retired</option>
                </select>

                {/* Employment Type Dropdown */}
                <select
                    value={employmentTypeFilter}
                    onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                    className="w-full sm:w-auto text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-[#4085b3] hover:border-[#4085b3] transition-colors cursor-pointer shadow-2xs"
                >
                    <option value="ALL">All Types</option>
                    <option value="PERMANENT">Permanent</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="PART_TIME">Part-Time</option>
                    <option value="TRANSFER_IN">Transferred In</option>
                </select>

                {hasActiveFilters && (
                    <button
                        onClick={handleClearFilters}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-[#4085b3] hover:border-[#4085b3] hover:bg-[#4085b3]/5 bg-white border border-slate-300 rounded-lg transition-all cursor-pointer shadow-2xs"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset</span>
                    </button>
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
                                        <th className="px-4 py-3 w-12 text-center">#</th>
                                        <th className="px-5 py-3">Teacher</th>
                                        <th className="px-5 py-3">Staff ID</th>
                                        <th className="px-5 py-3">Qualifications</th>
                                        <th className="px-5 py-3">Employment</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedTeachers.map((teacher, idx) => {
                                        const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                                        const primaryQual = teacher.qualifications?.[0];
                                        const qualSummary = primaryQual 
                                            ? `${primaryQual.qualificationLevel} - ${primaryQual.qualificationTitle || primaryQual.fieldOfStudy}`
                                            : teacher.qualification || "—";
                                        const empStatus = teacher.employmentStatus || teacher.status || "ACTIVE";
                                        const specialJob = teacher.jobTitle && teacher.jobTitle.toLowerCase() !== "teacher" ? teacher.jobTitle : null;

                                        return (
                                            <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                                                    {globalIndex}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs flex-shrink-0">
                                                            {teacher.firstName ? teacher.firstName[0].toUpperCase() : "T"}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900">
                                                                {teacher.firstName} {teacher.fatherName} {teacher.lastName}
                                                            </p>
                                                            {specialJob && (
                                                                <p className="text-[11px] text-slate-500 font-medium">
                                                                    {specialJob}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 font-mono text-slate-700">
                                                    {teacher.staffIdCode || teacher.employeeId || "—"}
                                                </td>
                                                <td className="px-5 py-3 text-slate-700">
                                                    <span className="font-medium text-slate-900">{qualSummary}</span>
                                                    {teacher.qualifications?.length > 1 && (
                                                        <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                                                            (+{teacher.qualifications.length - 1})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-slate-600 capitalize">
                                                    {teacher.employmentType ? teacher.employmentType.replace(/_/g, " ").toLowerCase() : "Permanent"}
                                                </td>
                                                <td className="px-5 py-3 text-center">
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
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Link href={`/dashboard/teachers/${teacher.id}`}>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="px-2.5 py-1 text-xs h-auto hover:border-[#4085b3] hover:text-[#4085b3] hover:bg-[#4085b3]/5 transition-all duration-200 cursor-pointer"
                                                            >
                                                                View Profile
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/dashboard/teachers/assignments/manage?teacherId=${teacher.id}`}>
                                                            <Button
                                                                size="sm"
                                                                className="px-2.5 py-1 text-xs text-white bg-[#4085b3] hover:bg-[#2b6a94] h-auto font-medium transition-colors cursor-pointer shadow-2xs"
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
