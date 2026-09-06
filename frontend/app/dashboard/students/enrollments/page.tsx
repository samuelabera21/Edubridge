"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { 
    Plus, 
    Search, 
    ArrowRight, 
    ChevronLeft, 
    ChevronRight, 
    RotateCcw,
    Calendar,
    X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";
import Link from "next/link";

interface EnrollmentRecord {
    id: string;
    studentId: string;
    academicYearId: string;
    schoolGradeId: string;
    sectionId?: string | null;
    enrollmentType: string;
    enrollmentDate?: string;
    status: string;
    student?: {
        id: string;
        studentId: string;
        firstName: string;
        fatherName?: string;
        grandfatherName?: string;
        lastName?: string;
    };
    schoolGrade?: {
        id: string;
        grade?: {
            name: string;
        };
    };
    section?: {
        id: string;
        name: string;
    } | null;
    academicYear?: {
        id: string;
        name: string;
        status: string;
    };
}

export default function StudentEnrollmentsPage() {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
    
    // Filtering states
    const [searchQuery, setSearchQuery] = useState("");
    const [filterGrade, setFilterGrade] = useState("ALL");
    const [filterType, setFilterType] = useState("ALL");
    const [filterPlacement, setFilterPlacement] = useState("ALL");
    const [filterStatus, setFilterStatus] = useState("ALL");
    
    // Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch Academic Years
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData: AcademicYear[] = await yearsRes.json();
            setYears(yearsData);

            // Default to ACTIVE year or first year, but allow selecting ALL
            const active = yearsData.find(y => y.status === "ACTIVE") || yearsData[0];
            const activeId = active?.id || "ALL";
            setSelectedYearId(activeId);

            // 2. Fetch Enrollments
            const enrollRes = await fetchApi("/student/enrollments");
            if (!enrollRes.ok) throw new Error("Failed to load enrollment ledger");
            const enrollData: EnrollmentRecord[] = await enrollRes.json();
            setEnrollments(Array.isArray(enrollData) ? enrollData : []);
            
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred while loading enrollment records");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const activeYear = years.find(y => y.id === selectedYearId);
    
    // Filter by Selected Academic Year
    const yearEnrollments = useMemo(() => {
        if (!selectedYearId || selectedYearId === "ALL") {
            return enrollments;
        }
        return enrollments.filter(e => e.academicYearId === selectedYearId);
    }, [enrollments, selectedYearId]);

    // Available Grades for Filter
    const uniqueGrades = useMemo(() => {
        const gradesSet = new Set<string>();
        yearEnrollments.forEach(e => {
            const name = e.schoolGrade?.grade?.name;
            if (name) gradesSet.add(name);
        });
        return Array.from(gradesSet).sort();
    }, [yearEnrollments]);

    // Apply All Filter Criteria
    const filteredEnrollments = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        
        return yearEnrollments.filter(e => {
            // Search matching across multiple fields
            let matchesSearch = true;
            if (query) {
                const firstName = (e.student?.firstName || "").toLowerCase();
                const fatherName = (e.student?.fatherName || e.student?.lastName || "").toLowerCase();
                const grandfatherName = (e.student?.grandfatherName || "").toLowerCase();
                const full3Tier = `${firstName} ${fatherName} ${grandfatherName}`.trim();
                const studentId = (e.student?.studentId || "").toLowerCase();
                const gradeName = (e.schoolGrade?.grade?.name || "").toLowerCase();
                const sectionName = (e.section?.name || "").toLowerCase();

                matchesSearch = 
                    studentId.includes(query) ||
                    full3Tier.includes(query) ||
                    firstName.includes(query) ||
                    fatherName.includes(query) ||
                    grandfatherName.includes(query) ||
                    gradeName.includes(query) ||
                    sectionName.includes(query);
            }
            
            // Grade Filter
            const gradeName = e.schoolGrade?.grade?.name;
            const matchesGrade = filterGrade === "ALL" || gradeName === filterGrade;
            
            // Intake Type Filter
            const enrollType = (e.enrollmentType || "NEW").toUpperCase();
            const matchesType = filterType === "ALL" || enrollType === filterType.toUpperCase();
            
            // Placement Filter
            const matchesPlacement = 
                filterPlacement === "ALL" || 
                (filterPlacement === "UNPLACED" && !e.sectionId) ||
                (filterPlacement === "PLACED" && Boolean(e.sectionId));

            // Status Filter
            const status = (e.status || "").toUpperCase();
            const matchesStatus = filterStatus === "ALL" || status === filterStatus.toUpperCase();

            return matchesSearch && matchesGrade && matchesType && matchesPlacement && matchesStatus;
        });
    }, [yearEnrollments, searchQuery, filterGrade, filterType, filterPlacement, filterStatus]);

    // Pagination calculations
    const totalCount = filteredEnrollments.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const paginatedEnrollments = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredEnrollments.slice(start, start + limit);
    }, [filteredEnrollments, page, limit]);

    const handleResetFilters = () => {
        setSearchQuery("");
        setFilterGrade("ALL");
        setFilterType("ALL");
        setFilterPlacement("ALL");
        setFilterStatus("ALL");
        setPage(1);
    };

    const hasActiveFilters = searchQuery !== "" || filterGrade !== "ALL" || filterType !== "ALL" || filterPlacement !== "ALL" || filterStatus !== "ALL";
    const startRecord = totalCount === 0 ? 0 : (page - 1) * limit + 1;
    const endRecord = Math.min(page * limit, totalCount);

    if (loading && years.length === 0) {
        return <LoadingState message="Loading student enrollment records..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadData} />;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Clean Government Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-900">Student Enrollment Ledger</h1>
                        <span className="text-xs font-medium px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {yearEnrollments.length} Enrolled {selectedYearId === "ALL" ? "Total" : `in ${activeYear?.name || "Session"}`}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Academic-year cohort intake, grade assignments, and unplaced student enrollment records.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/students">
                        <Button variant="outline" size="sm" className="text-slate-700 border-slate-300 hover:bg-slate-50">
                            Student Directory
                        </Button>
                    </Link>
                    <Link href="/dashboard/students/register">
                        <Button size="sm" className="bg-[#4085b3] hover:bg-[#32698e] text-white font-medium" leftIcon={<Plus className="w-4 h-4" />}>
                            Enroll Student
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Modern Search & Filtering Control Panel */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
                {/* Full Width Modern Search Input */}
                <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Search className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        placeholder="Type to search by student name (3-tier), Student ID (STU-...), or grade cohort..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                        className="block w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50/70 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] text-slate-900 placeholder:text-slate-400 transition-colors"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => {
                                setSearchQuery("");
                                setPage(1);
                            }}
                            aria-label="Clear search"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                        >
                            <span className="p-1 rounded-full hover:bg-slate-200/60">
                                <X className="w-3.5 h-3.5" />
                            </span>
                        </button>
                    )}
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Academic Year Selector */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 text-[#4085b3] shrink-0" />
                            <select
                                value={selectedYearId}
                                onChange={(e) => {
                                    setSelectedYearId(e.target.value);
                                    setFilterGrade("ALL");
                                    setPage(1);
                                }}
                                className="text-xs bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer pr-1"
                            >
                                <option value="ALL">All Academic Years</option>
                                {years.map((y) => (
                                    <option key={y.id} value={y.id}>
                                        {y.name} ({y.status})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Grade Filter */}
                        <select
                            value={filterGrade}
                            onChange={(e) => {
                                setFilterGrade(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="ALL">All Grades</option>
                            {uniqueGrades.map(g => (
                                <option key={g} value={g}>
                                    {g}
                                </option>
                            ))}
                        </select>

                        {/* Intake Type Filter */}
                        <select
                            value={filterType}
                            onChange={(e) => {
                                setFilterType(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="ALL">All Intake Categories</option>
                            <option value="NEW">New Admission</option>
                            <option value="RETURNING">Returning</option>
                            <option value="TRANSFER_IN">Transfer-In</option>
                            <option value="RE_ENTRY">Re-Entry</option>
                        </select>

                        {/* Placement Filter */}
                        <select
                            value={filterPlacement}
                            onChange={(e) => {
                                setFilterPlacement(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="ALL">All Placements</option>
                            <option value="UNPLACED">Unplaced (Step 5)</option>
                            <option value="PLACED">Placed in Section</option>
                        </select>

                        {/* Status Filter */}
                        <select
                            value={filterStatus}
                            onChange={(e) => {
                                setFilterStatus(e.target.value);
                                setPage(1);
                            }}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700 shadow-sm focus:outline-none focus:border-[#4085b3]"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ENROLLED">Enrolled</option>
                            <option value="ACTIVE">Active</option>
                            <option value="TRANSFERRED">Transferred</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="GRADUATED">Graduated</option>
                            <option value="DROPPED_OUT">Dropped Out</option>
                        </select>

                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="inline-flex items-center text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100/80 rounded-md px-2.5 py-1.5 transition-colors font-medium"
                            >
                                <RotateCcw className="w-3 h-3 mr-1 text-slate-500" />
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

            {/* Table Layout */}
            {filteredEnrollments.length === 0 ? (
                <EmptyState 
                    title="No Enrollments Found" 
                    message={yearEnrollments.length === 0 ? `No students are enrolled for ${activeYear?.name || 'this academic year'}. Click Enroll Student to register.` : "No enrolled students matched your filter criteria."} 
                />
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                                    <th className="px-5 py-3">Student ID</th>
                                    <th className="px-5 py-3">Full Name (3-Tier)</th>
                                    <th className="px-5 py-3">Grade Cohort</th>
                                    <th className="px-5 py-3">Section Placement</th>
                                    <th className="px-5 py-3">Intake Category</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {paginatedEnrollments.map((enrollment) => {
                                    const fullName = `${enrollment.student?.firstName || ""} ${enrollment.student?.fatherName || enrollment.student?.lastName || ""} ${enrollment.student?.grandfatherName || ""}`.trim();
                                    
                                    return (
                                        <tr key={enrollment.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-5 py-3.5 font-mono font-medium text-slate-800 whitespace-nowrap">
                                                {enrollment.student?.studentId || "—"}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-semibold text-slate-900 capitalize text-xs">
                                                    {fullName}
                                                </div>
                                                {enrollment.enrollmentDate && (
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        Date: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-800 font-medium">
                                                {enrollment.schoolGrade?.grade?.name || "Unassigned"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700">
                                                {enrollment.section ? (
                                                    <span className="font-medium text-slate-900">
                                                        Section {enrollment.section.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 italic">
                                                        Unplaced (Step 5)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700 capitalize">
                                                {enrollment.enrollmentType ? enrollment.enrollmentType.replace("_", "-").toLowerCase() : "new"}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-700">
                                                <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                    {enrollment.status.toLowerCase()}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                <Link 
                                                    href={`/dashboard/students/${enrollment.studentId}`}
                                                    className="inline-flex items-center text-xs font-semibold text-[#4085b3] hover:text-[#32698e] hover:underline"
                                                >
                                                    View Dossier
                                                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                        <div>
                            Showing <strong className="text-slate-900">{startRecord}</strong> to{" "}
                            <strong className="text-slate-900">{endRecord}</strong> of{" "}
                            <strong className="text-slate-900">{totalCount}</strong> enrollments
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
