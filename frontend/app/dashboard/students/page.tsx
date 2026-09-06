"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api";
import { 
    Plus, 
    Search, 
    ArrowRight, 
    ChevronLeft, 
    ChevronRight, 
    Filter, 
    X,
    ArrowUpDown,
    RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

interface StudentRecord {
    id: string;
    studentId: string;
    firstName: string;
    fatherName?: string;
    grandfatherName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    city?: string;
    region?: string;
    nationalId?: string;
    enrollments?: any[];
    guardians?: any[];
}

export default function StudentsDirectoryPage() {
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [genderFilter, setGenderFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState<"createdAt" | "firstName" | "studentId">("createdAt");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                sortBy,
                sortOrder
            });

            if (searchQuery.trim()) params.append("search", searchQuery.trim());
            if (genderFilter !== "ALL") params.append("gender", genderFilter);
            if (statusFilter !== "ALL") params.append("status", statusFilter);

            const res = await fetchApi(`/student?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load student directory");
            
            const data = await res.json();
            
            if (data && data.meta) {
                setStudents(data.data || []);
                setTotalCount(data.meta.total || 0);
                setTotalPages(data.meta.totalPages || 1);
            } else if (Array.isArray(data)) {
                setStudents(data);
                setTotalCount(data.length);
                setTotalPages(Math.ceil(data.length / limit) || 1);
            } else {
                setStudents([]);
                setTotalCount(0);
                setTotalPages(1);
            }
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred while loading students");
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchQuery, genderFilter, statusFilter, sortBy, sortOrder]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            loadData();
        }, 200);
        return () => clearTimeout(timeoutId);
    }, [loadData]);

    const handleResetFilters = () => {
        setSearchQuery("");
        setGenderFilter("ALL");
        setStatusFilter("ALL");
        setSortBy("createdAt");
        setSortOrder("desc");
        setPage(1);
    };

    const hasActiveFilters = searchQuery !== "" || genderFilter !== "ALL" || statusFilter !== "ALL";

    const startRecord = totalCount === 0 ? 0 : (page - 1) * limit + 1;
    const endRecord = Math.min(page * limit, totalCount);

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Clean Government Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-900">Student Directory</h1>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {totalCount} Total Students
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Official student identity records, demographic profiles, and historical admissions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/students/enrollments">
                        <Button variant="outline" size="sm" className="text-slate-700 border-slate-300 hover:bg-slate-50">
                            Enrollment Ledger
                        </Button>
                    </Link>
                    <Link href="/dashboard/students/register">
                        <Button size="sm" className="bg-[#4085b3] hover:bg-[#32698e] text-white" leftIcon={<Plus className="w-4 h-4" />}>
                            Register Student
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Modern Search & Filtering Control Panel */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3.5">
                {/* Full Width Modern Search Input */}
                <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                        type="text"
                        placeholder="Search student directory by 3-tier name, Student ID (e.g. STU-2609-...), or National ID..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-10 pr-10 py-2 text-sm bg-slate-50/50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] text-slate-900 placeholder:text-slate-400"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Gender Filter */}
                        <select
                            value={genderFilter}
                            onChange={(e) => {
                                setGenderFilter(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="ALL">All Genders</option>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="ENROLLED">Enrolled</option>
                            <option value="TRANSFERRED">Transferred</option>
                            <option value="GRADUATED">Graduated</option>
                            <option value="DROPPED_OUT">Dropped Out</option>
                            <option value="SUSPENDED">Suspended</option>
                        </select>

                        {/* Sort Order */}
                        <select
                            value={`${sortBy}:${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split(":");
                                setSortBy(field as any);
                                setSortOrder(order as any);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="createdAt:desc">Newest First</option>
                            <option value="createdAt:asc">Oldest First</option>
                            <option value="firstName:asc">Name (A-Z)</option>
                            <option value="firstName:desc">Name (Z-A)</option>
                            <option value="studentId:asc">Student ID (Asc)</option>
                        </select>

                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="inline-flex items-center text-xs text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-md px-2.5 py-1.5 transition-colors"
                            >
                                <RotateCcw className="w-3 h-3 mr-1" />
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Rows Per Page */}
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Rows:</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {error && <ErrorState message={error} onRetry={loadData} />}

            {/* Table or Empty State */}
            {loading ? (
                <LoadingState message="Loading directory records..." />
            ) : students.length === 0 ? (
                <EmptyState 
                    title="No Students Found" 
                    message={hasActiveFilters ? "No students matched your search and filter criteria." : "There are no student identities registered in the platform yet."} 
                />
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="px-5 py-3">Student ID</th>
                                    <th className="px-5 py-3">Full Name (3-Tier)</th>
                                    <th className="px-5 py-3">Gender</th>
                                    <th className="px-5 py-3">Location</th>
                                    <th className="px-5 py-3">Primary Guardian</th>
                                    <th className="px-5 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {students.map((student) => {
                                    const primaryGuardian = student.guardians?.find((g: any) => g.isPrimary) || student.guardians?.[0];
                                    const fullName = `${student.firstName} ${student.fatherName || student.lastName || ""} ${student.grandfatherName || ""}`.trim();

                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5 font-mono font-medium text-slate-800 whitespace-nowrap">
                                                {student.studentId || "—"}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-slate-900 capitalize text-xs">
                                                    {fullName}
                                                </div>
                                                {student.dateOfBirth && (
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        DOB: {new Date(student.dateOfBirth).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700 capitalize">
                                                {student.gender ? student.gender.toLowerCase() : "—"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700">
                                                {student.city || student.region || "Addis Ababa"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700">
                                                {primaryGuardian ? (
                                                    <div>
                                                        <span className="font-medium text-slate-900">
                                                            {primaryGuardian.parent?.user?.name || "Guardian"}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500 block">
                                                            {primaryGuardian.relationship} {primaryGuardian.parent?.emergencyPhone ? `• ${primaryGuardian.parent.emergencyPhone}` : ""}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                <Link 
                                                    href={`/dashboard/students/${student.id}`}
                                                    className="inline-flex items-center text-xs font-semibold text-[#4085b3] hover:text-[#32698e] hover:underline"
                                                >
                                                    View Details
                                                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Clean Pagination Footer */}
                    <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                        <div>
                            Showing <strong className="text-slate-900">{startRecord}</strong> to{" "}
                            <strong className="text-slate-900">{endRecord}</strong> of{" "}
                            <strong className="text-slate-900">{totalCount}</strong> students
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                disabled={page <= 1}
                                className="px-2.5 py-1 text-xs border-slate-300 disabled:opacity-40"
                                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                            >
                                Prev
                            </Button>

                            <div className="px-2 font-medium text-slate-700">
                                Page {page} of {totalPages}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={page >= totalPages}
                                className="px-2.5 py-1 text-xs border-slate-300 disabled:opacity-40"
                            >
                                <span className="mr-1">Next</span>
                                <ChevronRight className="w-3.5 h-3.5 inline" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
