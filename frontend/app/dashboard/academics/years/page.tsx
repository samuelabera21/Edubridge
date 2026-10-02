"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { 
    Plus, Search, RotateCcw, ChevronLeft, ChevronRight, 
    Calendar, CheckCircle2, Clock, Layers 
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";
import { AddAcademicYearModal } from "./components/AddAcademicYearModal";

export default function AcademicYearsPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Filter states
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc">("newest");

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const hasCreatePermission = authData?.access.some(acc => 
        ["ADMIN", "SCHOOL_ADMIN"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => p.permission?.name === "ACADEMIC:CREATE")
    );

    const loadYears = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/academic/years");
            if (!res.ok) throw new Error("Failed to load academic years");
            const data = await res.json();
            setYears(data || []);
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred while loading academic years");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadYears();
    }, []);

    // Filtered and Sorted years
    const filteredYears = useMemo(() => {
        const result = years.filter((y) => {
            if (statusFilter !== "ALL" && y.status !== statusFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                if (!y.name.toLowerCase().includes(q)) {
                    return false;
                }
            }
            return true;
        });

        result.sort((a, b) => {
            if (sortBy === "newest") {
                return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
            }
            if (sortBy === "oldest") {
                return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            }
            if (sortBy === "name_asc") {
                return a.name.localeCompare(b.name);
            }
            if (sortBy === "name_desc") {
                return b.name.localeCompare(a.name);
            }
            return 0;
        });

        return result;
    }, [years, statusFilter, searchQuery, sortBy]);

    // Reset pagination when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, sortBy, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredYears.length / pageSize));
    const paginatedYears = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredYears.slice(start, start + pageSize);
    }, [filteredYears, currentPage, pageSize]);

    const hasActiveFilters = searchQuery !== "" || statusFilter !== "ALL" || sortBy !== "newest";

    const handleClearFilters = () => {
        setSearchQuery("");
        setStatusFilter("ALL");
        setSortBy("newest");
    };

    // Calculate session statistics
    const activeYear = years.find(y => y.status === "ACTIVE");
    const plannedCount = years.filter(y => y.status === "PLANNED").length;
    const historicalCount = years.filter(y => ["COMPLETED", "ARCHIVED"].includes(y.status)).length;

    if (loading && years.length === 0) {
        return <LoadingState message="Loading academic years..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadYears} />;
    }

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans text-gray-900">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/academics/years" className="hover:text-gray-900">Academics</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">Academic Years</span>
            </div>

            {/* Header: Clean, direct on page background */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                        Academic Years
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Manage school calendar sessions and operating terms.
                    </p>
                </div>

                {hasCreatePermission && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-lg transition-colors shadow-xs cursor-pointer flex-shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Academic Year</span>
                    </button>
                )}
            </div>

            {/* Clean Data Stats on Normal Background (No Cards) */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 px-1 py-1 text-xs">
                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Total Sessions:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">{years.length}</span>
                </div>

                <span className="text-gray-300 select-none hidden sm:inline">|</span>

                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Active Session:</span>
                    <span className="font-bold text-[#4085b3] text-sm font-mono">{activeYear ? activeYear.name : "None"}</span>
                </div>

                <span className="text-gray-300 select-none hidden sm:inline">|</span>

                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Planned:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">{plannedCount}</span>
                </div>

                <span className="text-gray-300 select-none hidden sm:inline">|</span>

                <div className="flex items-baseline space-x-2">
                    <span className="text-gray-500 font-medium text-xs">Archived:</span>
                    <span className="font-bold text-gray-900 text-sm font-mono">{historicalCount}</span>
                </div>
            </div>

            {/* Academic Years Data Table with Integrated Toolbar */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                <div className="p-3.5 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center space-x-2.5 flex-1 max-w-md">
                        <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search academic year..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                            />
                        </div>
                        <span className="text-xs text-gray-500 font-mono hidden sm:inline flex-shrink-0">
                            {filteredYears.length} {filteredYears.length === 1 ? "session" : "sessions"}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:ring-1 focus:ring-[#4085b3] outline-none cursor-pointer"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="PLANNED">Planned</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="ARCHIVED">Archived</option>
                        </select>

                        {/* Sort Dropdown */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:ring-1 focus:ring-[#4085b3] outline-none cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="name_asc">Name (A - Z)</option>
                            <option value="name_desc">Name (Z - A)</option>
                        </select>

                        {/* Clear Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-xs text-gray-600 transition-colors cursor-pointer"
                                title="Reset filters"
                            >
                                <RotateCcw className="w-3 h-3 text-gray-400" />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>
                </div>

                {filteredYears.length === 0 ? (
                    <div className="py-16 text-center text-xs text-gray-500 space-y-2">
                        <p>{hasActiveFilters ? "No academic years match your filter criteria." : "No academic years configured yet."}</p>
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
                                        <th className="px-5 py-3 w-72">Academic Year</th>
                                        <th className="px-5 py-3 w-44">Start Date</th>
                                        <th className="px-5 py-3 w-44">End Date</th>
                                        <th className="px-5 py-3 w-36 text-center">Status</th>
                                        <th className="px-5 py-3 w-32 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedYears.map((year, idx) => {
                                        const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                                        return (
                                            <tr key={year.id} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="px-4 py-3.5 text-center text-gray-400 font-mono text-[11px]">
                                                    {globalIndex}
                                                </td>
                                                <td className="px-5 py-3.5 font-bold text-gray-900">
                                                    {year.name}
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-600 font-mono">
                                                    {new Date(year.startDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-600 font-mono">
                                                    {new Date(year.endDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-5 py-3.5 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                        year.status === "ACTIVE" 
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                                            : year.status === "PLANNED"
                                                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                            : year.status === "COMPLETED"
                                                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                                                            : "bg-gray-50 text-gray-700 border border-gray-200"
                                                    }`}>
                                                        {year.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <Link href={`/dashboard/academics/years/${year.id}`}>
                                                        <button className="px-3 py-1 text-xs text-[#4085b3] hover:text-[#2b6a94] hover:bg-sky-50 rounded-lg border border-[#4085b3]/30 font-semibold transition-colors cursor-pointer">
                                                            Manage
                                                        </button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-3 border-t border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
                                <span>
                                    Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                                    <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, filteredYears.length)}</span> of{" "}
                                    <span className="font-semibold text-gray-900">{filteredYears.length}</span> sessions
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

            <AddAcademicYearModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={loadYears}
            />
        </div>
    );
}
