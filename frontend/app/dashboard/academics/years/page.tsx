"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { 
    Plus, Search, RotateCcw, ChevronLeft, ChevronRight, 
    Calendar, CheckCircle2, Clock, Layers, ArrowRight 
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
        return (
            <div className="py-20">
                <LoadingState message="Loading academic years..." />
            </div>
        );
    }

    if (error && years.length === 0) {
        return (
            <div className="p-6">
                <ErrorState message={error} onRetry={loadYears} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 font-sans max-w-7xl">
            {/* Header: Clean & Direct on page background */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Academic Years
                    </h1>
                    <span className="text-xs text-slate-500 font-medium">
                        {years.length} {years.length === 1 ? "Session" : "Sessions"}
                    </span>
                </div>

                {hasCreatePermission && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-3.5 py-1.5 bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-semibold rounded transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Academic Year</span>
                    </button>
                )}
            </div>

            {/* Top 4 KPI Cards: Left-to-right clean blue hover fill */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Sessions */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Total Sessions
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {years.length}
                        </span>
                    </div>
                    <Calendar className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Active Session */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Active Session
                        </span>
                        <span className="text-xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 truncate max-w-[140px] block">
                            {activeYear ? activeYear.name : "None"}
                        </span>
                    </div>
                    <CheckCircle2 className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Planned Sessions */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Planned
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {plannedCount}
                        </span>
                    </div>
                    <Clock className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Archived Sessions */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Archived
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {historicalCount}
                        </span>
                    </div>
                    <Layers className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
            </div>

            {/* Direct Data Table Workspace: No outer container card */}
            <div className="space-y-3 pt-1">
                {/* Search & Filter Controls: Sitting directly on the real background */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search session..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-xs border border-slate-300 rounded px-2.5 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] cursor-pointer"
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
                            className="text-xs border border-slate-300 rounded px-2.5 py-2 bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] cursor-pointer"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="name_asc">Name (A – Z)</option>
                            <option value="name_desc">Name (Z – A)</option>
                        </select>

                        {/* Clear Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={handleClearFilters}
                                className="inline-flex items-center gap-1 px-2.5 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-xs text-slate-600 transition-colors cursor-pointer"
                                title="Reset filters"
                            >
                                <RotateCcw className="w-3 h-3 text-slate-400" />
                                <span>Clear</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Table: Clean border-collapse directly on canvas */}
                <div className="border border-slate-200 bg-white rounded overflow-hidden">
                    <table className="w-full table-fixed text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                            <tr>
                                <th className="py-3 px-4 w-[28%]">Academic Year</th>
                                <th className="py-3 px-4 w-[24%]">Start Date</th>
                                <th className="py-3 px-4 w-[24%]">End Date</th>
                                <th className="py-3 px-4 w-[14%] text-center">Status</th>
                                <th className="py-3 px-4 w-[10%] text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                            {filteredYears.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                                        {hasActiveFilters ? "No academic years match your filter criteria." : "No academic years configured yet."}
                                    </td>
                                </tr>
                            ) : (
                                paginatedYears.map((year) => (
                                    <tr key={year.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-3.5 px-4 font-semibold text-slate-900 truncate">
                                            {year.name}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-700 font-medium tabular-nums truncate">
                                            {new Date(year.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-700 font-medium tabular-nums truncate">
                                            {new Date(year.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                year.status === "ACTIVE" 
                                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                                                    : year.status === "PLANNED"
                                                    ? "bg-slate-100 text-slate-700 border border-slate-200"
                                                    : year.status === "COMPLETED"
                                                    ? "bg-blue-50 text-blue-800 border border-blue-200"
                                                    : "bg-slate-50 text-slate-600 border border-slate-200"
                                            }`}>
                                                {year.status}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <Link
                                                href={`/dashboard/academics/years/${year.id}`}
                                                className="text-xs font-semibold text-[#4085b3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                            >
                                                <span>Manage</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                            <span>
                                Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                                <span className="font-semibold text-slate-900">{Math.min(currentPage * pageSize, filteredYears.length)}</span> of{" "}
                                <span className="font-semibold text-slate-900">{filteredYears.length}</span> sessions
                            </span>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer inline-flex items-center gap-1"
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
                                                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium cursor-pointer inline-flex items-center gap-1"
                                >
                                    <span>Next</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AddAcademicYearModal 
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={loadYears}
            />
        </div>
    );
}
