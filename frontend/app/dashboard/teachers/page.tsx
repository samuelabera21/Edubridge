"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, RotateCcw, ChevronLeft, ChevronRight, User } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
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

    // Filter logic
    const filteredTeachers = useMemo(() => {
        return teachers.filter((teacher) => {
            // Status filter
            const empStatus = teacher.employmentStatus || teacher.status || "ACTIVE";
            if (statusFilter !== "ALL" && empStatus !== statusFilter) {
                return false;
            }

            // Employment Type filter
            if (employmentTypeFilter !== "ALL" && teacher.employmentType !== employmentTypeFilter) {
                return false;
            }

            // Search query (Name, Staff ID, Job title, Qualification)
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
        <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans text-gray-900">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">Teachers Directory</span>
            </div>

            {/* Clean Government Header Bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                        Teachers Directory
                    </h1>
                </div>

                <Link href="/dashboard/teachers/register">
                    <button className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors shadow-xs cursor-pointer">
                        <Plus className="w-4 h-4" />
                        <span>Add Teacher</span>
                    </button>
                </Link>
            </div>

            {/* Filter Bar with Clear Filter Button in Front */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    {/* Clear Filter Button */}
                    <button
                        onClick={handleClearFilters}
                        disabled={!hasActiveFilters}
                        className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-colors cursor-pointer flex-shrink-0 ${
                            hasActiveFilters 
                                ? "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200" 
                                : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                        }`}
                        title="Reset all filters"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear Filters</span>
                    </button>

                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by teacher name, staff ID, or qualification..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-600 flex-shrink-0">Status:</span>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#4085b3] outline-none cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="ON_LEAVE">On Leave</option>
                            <option value="TRANSFERRED">Transferred</option>
                            <option value="RESIGNED">Resigned</option>
                            <option value="RETIRED">Retired</option>
                        </select>
                    </div>

                    {/* Employment Type Filter */}
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-600 flex-shrink-0">Type:</span>
                        <select
                            value={employmentTypeFilter}
                            onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                            className="bg-white border border-gray-300 text-gray-900 rounded-md px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#4085b3] outline-none cursor-pointer"
                        >
                            <option value="ALL">All Types</option>
                            <option value="PERMANENT">Permanent</option>
                            <option value="CONTRACT">Contract</option>
                            <option value="PART_TIME">Part-Time</option>
                            <option value="TRANSFER_IN">Transferred In</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Teachers Data Table */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-sm font-bold text-gray-900">
                        Faculty Members
                    </h2>
                    <span className="text-xs text-gray-500 font-mono">
                        {filteredTeachers.length} {filteredTeachers.length === 1 ? "teacher" : "teachers"} registered
                    </span>
                </div>

                {filteredTeachers.length === 0 ? (
                    <div className="py-16 text-center text-xs text-gray-500 space-y-2">
                        <p>{hasActiveFilters ? "No teachers match your search or filter criteria." : "There are no teachers registered in the directory yet."}</p>
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="text-xs text-[#4085b3] font-medium hover:underline cursor-pointer"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs text-gray-700">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold text-[11px]">
                                    <tr>
                                        <th className="px-4 py-3 w-12 text-center">#</th>
                                        <th className="px-5 py-3">Teacher Name</th>
                                        <th className="px-5 py-3">Staff ID</th>
                                        <th className="px-5 py-3">Qualifications</th>
                                        <th className="px-5 py-3">Employment</th>
                                        <th className="px-5 py-3 text-center">Status</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedTeachers.map((teacher, idx) => {
                                        const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                                        const primaryQual = teacher.qualifications?.[0];
                                        const qualSummary = primaryQual 
                                            ? `${primaryQual.qualificationLevel} - ${primaryQual.qualificationTitle || primaryQual.fieldOfStudy}`
                                            : teacher.qualification || "Unspecified";
                                        const empStatus = teacher.employmentStatus || teacher.status || "ACTIVE";

                                        return (
                                            <tr key={teacher.id} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="px-4 py-3 text-center text-gray-400 font-mono text-[11px]">
                                                    {globalIndex}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-gray-700 text-xs flex-shrink-0">
                                                            {teacher.firstName ? teacher.firstName[0].toUpperCase() : "T"}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {teacher.firstName} {teacher.fatherName} {teacher.lastName}
                                                            </p>
                                                            <p className="text-[11px] text-gray-500">
                                                                {teacher.jobTitle || "Teacher"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 font-mono text-gray-700">
                                                    {teacher.staffIdCode || teacher.employeeId || "—"}
                                                </td>
                                                <td className="px-5 py-3 text-gray-700">
                                                    <span className="font-medium text-gray-900">{qualSummary}</span>
                                                    {teacher.qualifications?.length > 1 && (
                                                        <span className="text-[11px] text-gray-400 ml-1.5">
                                                            (+{teacher.qualifications.length - 1} more)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">
                                                    {teacher.employmentType?.replace("_", " ") || "Permanent"}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                        empStatus === "ACTIVE" 
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                                            : empStatus === "ON_LEAVE"
                                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                            : "bg-gray-50 text-gray-700 border border-gray-200"
                                                    }`}>
                                                        {empStatus}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <Link href={`/dashboard/teachers/${teacher.id}`}>
                                                            <button className="px-2.5 py-1 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded border border-gray-300 transition-colors cursor-pointer">
                                                                View Profile
                                                            </button>
                                                        </Link>
                                                        <Link href={`/dashboard/teachers/assignments/manage?teacherId=${teacher.id}`}>
                                                            <button className="px-2.5 py-1 text-xs text-[#4085b3] hover:text-[#2b6a94] hover:bg-sky-50 rounded border border-[#4085b3]/30 font-medium transition-colors cursor-pointer">
                                                                Assign
                                                            </button>
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
                        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
                            <div className="flex items-center space-x-3">
                                <span>
                                    Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                                    <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, filteredTeachers.length)}</span> of{" "}
                                    <span className="font-semibold text-gray-900">{filteredTeachers.length}</span> teachers
                                </span>
                                <div className="flex items-center space-x-1.5 pl-3 border-l border-gray-300">
                                    <span className="text-gray-500">Per page:</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                        className="bg-white border border-gray-300 rounded px-2 py-0.5 text-xs font-medium text-gray-800 focus:outline-none cursor-pointer"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>
                            </div>

                            {totalPages > 1 && (
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
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
