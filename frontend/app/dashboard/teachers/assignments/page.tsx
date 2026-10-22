"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Plus, Search, Clock, CheckCircle2, ShieldCheck, Check, X, RefreshCw, 
    BookOpen, BarChart3, Calendar, AlertCircle, Ban, ArrowRight, RotateCcw,
    GraduationCap, Layers, ChevronRight, UserCheck
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AcademicYear } from "@/types/api";

export default function TeachingAssignmentsPage() {
    const router = useRouter();
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [activeTab, setActiveTab] = useState<"overview" | "matrix" | "workload" | "approvals">("overview");

    const [demandData, setDemandData] = useState<any | null>(null);
    const [coverageData, setCoverageData] = useState<any | null>(null);
    const [workloadData, setWorkloadData] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [allTeachers, setAllTeachers] = useState<any[]>([]);

    // Overview Tab Filters
    const [overviewSearch, setOverviewSearch] = useState<string>("");
    const [overviewGradeFilter, setOverviewGradeFilter] = useState<string>("ALL");
    const [overviewStatusFilter, setOverviewStatusFilter] = useState<string>("ALL");

    // Section Coverage Tab Filters
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [gradeFilter, setGradeFilter] = useState<string>("ALL");
    const [sectionFilter, setSectionFilter] = useState<string>("ALL");
    const [subjectFilter, setSubjectFilter] = useState<string>("ALL");

    // Teacher Workload Tab Filters
    const [workloadFilter, setWorkloadFilter] = useState<string>("ALL");
    const [teacherFilter, setTeacherFilter] = useState<string>("ALL");

    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

    // Homeroom assignment modal state
    const [homeroomModal, setHomeroomModal] = useState<{
        open: boolean;
        sectionId: string;
        sectionName: string;
        gradeName: string;
        currentTeacherId: string | null;
        selectedTeacherId: string;
    }>({
        open: false,
        sectionId: "",
        sectionName: "",
        gradeName: "",
        currentTeacherId: null,
        selectedTeacherId: ""
    });

    const hasCreatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => ["ADMIN", "SCHOOL_ADMIN", "ACADEMIC:MANAGE", "TEACHER:ASSIGN", "ACADEMIC:CREATE"].includes(p.permission.name))
    );

    const isPrincipalOrAdmin = authData?.access.some(acc => 
        ["PRINCIPAL", "ADMIN", "SCHOOL_ADMIN"].includes(acc.role.name)
    );

    const loadStaffingData = async (yearId: string) => {
        try {
            setError(null);

            const [demandRes, coverageRes, workloadRes, assignRes, teachersRes] = await Promise.all([
                fetchApi(`/teacher/staffing/demand?academicYearId=${yearId}`),
                fetchApi(`/teacher/staffing/coverage?academicYearId=${yearId}`),
                fetchApi(`/teacher/staffing/workload?academicYearId=${yearId}`),
                fetchApi(`/teacher/assignments?academicYearId=${yearId}`),
                fetchApi("/teacher")
            ]);

            if (demandRes.ok) setDemandData(await demandRes.json());
            if (coverageRes.ok) setCoverageData(await coverageRes.json());
            if (workloadRes.ok) setWorkloadData(await workloadRes.json());
            if (assignRes.ok) setAssignments(await assignRes.json());
            if (teachersRes.ok) setAllTeachers(await teachersRes.json());

        } catch (err: any) {
            setError(err.message || "Failed to load staffing data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initYears = async () => {
            try {
                const yearsRes = await fetchApi("/academic/years");
                if (!yearsRes.ok) throw new Error("Failed to load academic years");
                const yearsData: AcademicYear[] = await yearsRes.json();
                setYears(yearsData);

                const active = yearsData.find(y => y.status === "ACTIVE") || yearsData.find(y => y.status === "PLANNED") || yearsData[0];
                if (active) {
                    setSelectedYearId(active.id);
                    loadStaffingData(active.id);
                } else {
                    setLoading(false);
                }
            } catch (err: any) {
                setError(err.message || "Failed to load academic years");
                setLoading(false);
            }
        };
        initYears();
    }, []);

    const handleYearChange = (yearId: string) => {
        setSelectedYearId(yearId);
        clearOverviewFilters();
        clearCoverageFilters();
        clearWorkloadFilters();
        loadStaffingData(yearId);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setError(null);
        try {
            const yearsRes = await fetchApi("/academic/years");
            if (yearsRes.ok) {
                const yearsData: AcademicYear[] = await yearsRes.json();
                setYears(yearsData);
            }
            const activeYear = selectedYearId || years[0]?.id;
            if (activeYear) {
                await loadStaffingData(activeYear);
            }
            setSuccessMessage("Data refreshed.");
            setTimeout(() => setSuccessMessage(null), 2500);
        } catch (err: any) {
            setError(err.message || "Failed to refresh data");
        } finally {
            setIsRefreshing(false);
        }
    };

    // Filter Clear Handlers
    const clearOverviewFilters = () => {
        setOverviewSearch("");
        setOverviewGradeFilter("ALL");
        setOverviewStatusFilter("ALL");
    };

    const clearCoverageFilters = () => {
        setSearchQuery("");
        setGradeFilter("ALL");
        setSectionFilter("ALL");
        setSubjectFilter("ALL");
    };

    const clearWorkloadFilters = () => {
        setSearchQuery("");
        setWorkloadFilter("ALL");
        setTeacherFilter("ALL");
    };

    const isOverviewFilterActive = overviewSearch !== "" || overviewGradeFilter !== "ALL" || overviewStatusFilter !== "ALL";
    const isCoverageFilterActive = searchQuery !== "" || gradeFilter !== "ALL" || sectionFilter !== "ALL" || subjectFilter !== "ALL";
    const isWorkloadFilterActive = searchQuery !== "" || workloadFilter !== "ALL" || teacherFilter !== "ALL";

    const selectedYear = useMemo(() => {
        return years.find(y => y.id === selectedYearId) || null;
    }, [years, selectedYearId]);

    const isYearLocked = useMemo(() => {
        return selectedYear?.status === "ARCHIVED" || selectedYear?.status === "COMPLETED";
    }, [selectedYear]);

    // Handle Approvals
    const handleApprove = async (assignmentId: string) => {
        try {
            setActionLoading(true);
            const res = await fetchApi(`/teacher/assignments/${assignmentId}/approve`, { method: "POST" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Approval failed");
            }
            setSuccessMessage("Assignment approved.");
            if (selectedYearId) loadStaffingData(selectedYearId);
        } catch (err: any) {
            setError(err.message || "Approval failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async (assignmentId: string) => {
        const reason = prompt("Enter reason for proposal rejection (optional):") || "Returned by Principal for revision";
        try {
            setActionLoading(true);
            const res = await fetchApi(`/teacher/assignments/${assignmentId}/reject`, {
                method: "POST",
                body: JSON.stringify({ rejectionReason: reason })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Rejection failed");
            }
            setSuccessMessage("Proposal rejected.");
            if (selectedYearId) loadStaffingData(selectedYearId);
        } catch (err: any) {
            setError(err.message || "Rejection failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkApprove = async () => {
        const proposed = assignments.filter(a => a.status === "PROPOSED").map(a => a.id);
        if (proposed.length === 0) return;
        if (!confirm(`Approve all ${proposed.length} pending proposals?`)) return;

        try {
            setActionLoading(true);
            const res = await fetchApi("/teacher/assignments/bulk-approve", {
                method: "POST",
                body: JSON.stringify({ assignmentIds: proposed })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Bulk approval failed");
            }
            setSuccessMessage(`Approved ${proposed.length} assignments.`);
            if (selectedYearId) loadStaffingData(selectedYearId);
        } catch (err: any) {
            setError(err.message || "Bulk approval failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEndAssignment = async (assignmentId: string) => {
        if (!confirm("End this teaching assignment? Historical records remain preserved.")) return;

        try {
            setActionLoading(true);
            const res = await fetchApi(`/teacher/assignments/${assignmentId}/end`, { method: "POST" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to end assignment");
            }
            setSuccessMessage("Assignment ended.");
            if (selectedYearId) loadStaffingData(selectedYearId);
        } catch (err: any) {
            setError(err.message || "Failed to end assignment");
        } finally {
            setActionLoading(false);
        }
    };

    // Homeroom assignment handler
    const handleSaveHomeroom = async () => {
        try {
            setActionLoading(true);
            const res = await fetchApi(`/teacher/sections/${homeroomModal.sectionId}/homeroom`, {
                method: "POST",
                body: JSON.stringify({
                    homeroomTeacherId: homeroomModal.selectedTeacherId || null
                })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to update homeroom teacher");
            }
            setSuccessMessage("Homeroom teacher updated.");
            setHomeroomModal(prev => ({ ...prev, open: false }));
            if (selectedYearId) loadStaffingData(selectedYearId);
        } catch (err: any) {
            setError(err.message || "Failed to update homeroom teacher");
        } finally {
            setActionLoading(false);
        }
    };

    const pendingProposals = useMemo(() => {
        return assignments.filter(a => a.status === "PROPOSED");
    }, [assignments]);

    const overloadedTeachersCount = useMemo(() => {
        return workloadData.filter(w => w.status === "OVERLOADED").length;
    }, [workloadData]);

    // Filtered Overview Grades
    const filteredOverviewGrades = useMemo(() => {
        if (!demandData?.grades) return [];
        return demandData.grades.filter((g: any) => {
            if (overviewGradeFilter !== "ALL" && g.schoolGradeId !== overviewGradeFilter) return false;
            if (overviewStatusFilter === "STAFFED" && g.coveragePercentage < 100) return false;
            if (overviewStatusFilter === "NEEDS_STAFFING" && g.coveragePercentage >= 100) return false;
            if (overviewSearch) {
                const q = overviewSearch.toLowerCase();
                const matchGrade = g.gradeName?.toLowerCase().includes(q);
                const matchSubject = g.subjects?.some((s: any) => s.subjectName?.toLowerCase().includes(q));
                return matchGrade || matchSubject;
            }
            return true;
        });
    }, [demandData, overviewGradeFilter, overviewStatusFilter, overviewSearch]);

    // Available sections for the section filter dropdown
    const availableSectionsForFilter = useMemo(() => {
        if (!coverageData?.sections) return [];
        if (gradeFilter === "ALL") {
            return coverageData.sections;
        }
        return coverageData.sections.filter((sec: any) => sec.schoolGradeId === gradeFilter);
    }, [coverageData, gradeFilter]);

    // Available subjects for the subject filter dropdown
    const availableSubjectsForFilter = useMemo(() => {
        if (!coverageData?.sections) return [];
        const map = new Map<string, string>();
        coverageData.sections.forEach((sec: any) => {
            if (gradeFilter !== "ALL" && sec.schoolGradeId !== gradeFilter) return;
            if (sectionFilter !== "ALL" && sec.sectionId !== sectionFilter) return;
            sec.subjectAllocations?.forEach((sa: any) => {
                if (sa.subjectId && sa.subjectName) {
                    map.set(sa.subjectId, sa.subjectName);
                }
            });
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [coverageData, gradeFilter, sectionFilter]);

    // Filtered matrix sections
    const filteredSections = useMemo(() => {
        if (!coverageData?.sections) return [];
        return coverageData.sections
            .filter((sec: any) => {
                if (gradeFilter !== "ALL" && sec.schoolGradeId !== gradeFilter) return false;
                if (sectionFilter !== "ALL" && sec.sectionId !== sectionFilter) return false;
                if (subjectFilter !== "ALL") {
                    const hasSubject = sec.subjectAllocations?.some((sa: any) => sa.subjectId === subjectFilter);
                    if (!hasSubject) return false;
                }
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    const matchSec = sec.sectionName.toLowerCase().includes(q) || sec.gradeName.toLowerCase().includes(q);
                    const matchHomeroom = sec.homeroomTeacher?.name?.toLowerCase().includes(q);
                    const matchSubject = sec.subjectAllocations?.some((sa: any) => 
                        sa.subjectName.toLowerCase().includes(q) || sa.teacher?.name?.toLowerCase().includes(q)
                    );
                    return matchSec || matchHomeroom || matchSubject;
                }
                return true;
            })
            .map((sec: any) => {
                if (subjectFilter === "ALL") return sec;
                return {
                    ...sec,
                    subjectAllocations: sec.subjectAllocations?.filter((sa: any) => sa.subjectId === subjectFilter) || []
                };
            });
    }, [coverageData, gradeFilter, sectionFilter, subjectFilter, searchQuery]);

    // Available Teachers for Workload Filter
    const availableTeachersForFilter = useMemo(() => {
        if (!allTeachers || allTeachers.length === 0) return [];
        return [...allTeachers].sort((a, b) => {
            const nameA = `${a.firstName || ""} ${a.lastName || ""}`;
            const nameB = `${b.firstName || ""} ${b.lastName || ""}`;
            return nameA.localeCompare(nameB);
        });
    }, [allTeachers]);

    // Filtered faculty workload
    const filteredWorkload = useMemo(() => {
        return workloadData.filter((w: any) => {
            if (workloadFilter !== "ALL" && w.status !== workloadFilter) return false;
            if (teacherFilter !== "ALL" && w.teacherId !== teacherFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchName = w.name?.toLowerCase().includes(q);
                const matchId = w.employeeId?.toLowerCase().includes(q);
                const matchSub = w.assignments?.some((a: any) => a.subjectName?.toLowerCase().includes(q));
                return matchName || matchId || matchSub;
            }
            return true;
        });
    }, [workloadData, workloadFilter, teacherFilter, searchQuery]);

    if (loading && !demandData && !coverageData) {
        return (
            <div className="py-20 text-center text-sm text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#4085b3]" />
                <span>Loading staffing data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans text-slate-900">
            {/* Header: Clean, direct on page background */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">Teaching Assignments</h1>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                    <Link href="/dashboard/teachers">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="hover:border-[#4085b3] hover:text-[#4085b3] hover:bg-[#4085b3]/5 transition-all duration-200 shadow-2xs"
                        >
                            Teaching Faculty
                        </Button>
                    </Link>

                    {/* Academic Year Selector */}
                    <div className="flex items-center space-x-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-2xs text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-medium text-slate-500">Session:</span>
                        <select
                            value={selectedYearId}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="text-xs font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.status === "ACTIVE" ? "(Active)" : y.status === "PLANNED" ? "(Planned)" : `(${y.status})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="hover:border-[#4085b3] hover:text-[#4085b3] hover:bg-[#4085b3]/5 transition-all duration-200 shadow-2xs"
                        leftIcon={<RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? "animate-spin text-[#4085b3]" : ""}`} />}
                    >
                        <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
                    </Button>

                    {hasCreatePermission && !isYearLocked && (
                        <Link href={`/dashboard/teachers/assignments/manage?yearId=${selectedYearId}`}>
                            <Button 
                                size="sm"
                                className="bg-[#4085b3] hover:bg-[#2b6a94] text-white font-medium shadow-2xs"
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                Assign Faculty
                            </Button>
                        </Link>
                    )}
                </div>
            </div>

            {/* Notification Messages */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {isYearLocked && (
                <div className="bg-gray-50 border border-gray-200 text-gray-700 text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2">
                    <Ban className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span>
                        <strong>Archived:</strong> Academic year {selectedYear?.name} is {selectedYear?.status?.toLowerCase()}. Allocations are read-only.
                    </span>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 space-x-6 text-sm">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`pb-3 font-medium transition-colors relative cursor-pointer ${
                        activeTab === "overview"
                            ? "text-[#4085b3] font-semibold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <span className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>Staffing Overview</span>
                    </span>
                    {activeTab === "overview" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4085b3]" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("matrix")}
                    className={`pb-3 font-medium transition-colors relative cursor-pointer ${
                        activeTab === "matrix"
                            ? "text-[#4085b3] font-semibold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <span className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4" />
                        <span>Section Coverage</span>
                    </span>
                    {activeTab === "matrix" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4085b3]" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("workload")}
                    className={`pb-3 font-medium transition-colors relative cursor-pointer ${
                        activeTab === "workload"
                            ? "text-[#4085b3] font-semibold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <span className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Teacher Workloads</span>
                    </span>
                    {activeTab === "workload" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4085b3]" />
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("approvals")}
                    className={`pb-3 font-medium transition-colors relative cursor-pointer ${
                        activeTab === "approvals"
                            ? "text-[#4085b3] font-semibold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <span className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Pending Proposals</span>
                        {pendingProposals.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-sky-100 text-[#4085b3]">
                                {pendingProposals.length}
                            </span>
                        )}
                    </span>
                    {activeTab === "approvals" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4085b3]" />
                    )}
                </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
                <div className="space-y-4">
                    {/* 5 KPI Metric Cards: Left-to-right clean blue hover fill */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {/* 1. Required Demand */}
                        <div 
                            onClick={() => {
                                clearCoverageFilters();
                                setActiveTab("matrix");
                            }}
                            className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300"
                            title="View all section assignments"
                        >
                            <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                                    Required Demand
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                        {demandData?.totalDemandPeriods || 0}
                                    </span>
                                    <span className="text-xs font-normal text-slate-400 group-hover:text-blue-100 transition-colors duration-300">
                                        p/wk
                                    </span>
                                </div>
                            </div>
                            <BookOpen className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                        </div>

                        {/* 2. Allocated */}
                        <div 
                            onClick={() => {
                                clearCoverageFilters();
                                setActiveTab("matrix");
                            }}
                            className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300"
                            title="View assigned classes"
                        >
                            <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                                    Allocated
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                        {demandData?.totalAssignedPeriods || 0}
                                    </span>
                                    <span className="text-xs font-normal text-slate-400 group-hover:text-blue-100 transition-colors duration-300">
                                        p/wk
                                    </span>
                                </div>
                            </div>
                            <UserCheck className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                        </div>

                        {/* 3. Vacancies */}
                        <div 
                            onClick={() => {
                                clearCoverageFilters();
                                setActiveTab("matrix");
                            }}
                            className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300"
                            title="View vacant subjects"
                        >
                            <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                                    Vacancies
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                        {demandData?.totalUnassignedPeriods || 0}
                                    </span>
                                    <span className="text-xs font-normal text-slate-400 group-hover:text-blue-100 transition-colors duration-300">
                                        p/wk
                                    </span>
                                </div>
                            </div>
                            <AlertCircle className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                        </div>

                        {/* 4. Staffing Rate */}
                        <div 
                            onClick={() => {
                                clearCoverageFilters();
                                setActiveTab("matrix");
                            }}
                            className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300"
                            title="View coverage matrix"
                        >
                            <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                                    Staffing Rate
                                </span>
                                <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                    {demandData?.coveragePercentage || 0}%
                                </span>
                            </div>
                            <BarChart3 className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                        </div>

                        {/* 5. Overloaded */}
                        <div 
                            onClick={() => {
                                clearWorkloadFilters();
                                setWorkloadFilter("OVERLOADED");
                                setActiveTab("workload");
                            }}
                            className="relative overflow-hidden border border-slate-200 bg-white rounded-lg p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300"
                            title="View overloaded faculty members"
                        >
                            <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                                    Overloaded
                                </span>
                                <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                    {overloadedTeachersCount}
                                </span>
                            </div>
                            <Clock className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300 shrink-0" />
                        </div>
                    </div>

                    {/* Grade-by-Grade Curriculum Demand Breakdown with Filter */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
                        {/* Filters Bar for Overview Grades */}
                        <div className="px-5 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 whitespace-nowrap">
                                Curriculum Demand by Grade
                            </h2>

                            <div className="flex flex-wrap items-center gap-2">
                                {/* Clear Filters Option */}
                                {isOverviewFilterActive && (
                                    <button
                                        onClick={clearOverviewFilters}
                                        className="inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-md cursor-pointer transition-colors"
                                        title="Clear all filters"
                                    >
                                        <RotateCcw className="w-3 h-3 text-slate-400" />
                                        <span>Clear</span>
                                    </button>
                                )}

                                <div className="relative w-full sm:w-44">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search grade/subject..."
                                        value={overviewSearch}
                                        onChange={(e) => setOverviewSearch(e.target.value)}
                                        className="w-full pl-8 pr-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-700 focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none"
                                    />
                                </div>

                                <select
                                    value={overviewGradeFilter}
                                    onChange={(e) => setOverviewGradeFilter(e.target.value)}
                                    className="text-xs border border-slate-200 rounded-md px-2.5 py-1 bg-white text-slate-700 focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none cursor-pointer"
                                >
                                    <option value="ALL">All Grades</option>
                                    {demandData?.grades?.map((g: any) => {
                                        const name = g.gradeName && g.gradeName.trim() !== "Grade" ? g.gradeName : (g.level ? `Grade ${g.level}` : (g.gradeName || "Grade"));
                                        return <option key={g.schoolGradeId} value={g.schoolGradeId}>{name}</option>;
                                    })}
                                </select>

                                <select
                                    value={overviewStatusFilter}
                                    onChange={(e) => setOverviewStatusFilter(e.target.value)}
                                    className="text-xs border border-slate-200 rounded-md px-2.5 py-1 bg-white text-slate-700 focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none cursor-pointer"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="STAFFED">100% Staffed</option>
                                    <option value="NEEDS_STAFFING">Needs Staffing</option>
                                </select>
                            </div>
                        </div>

                        {!filteredOverviewGrades || filteredOverviewGrades.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs">
                                No grade levels match the filter criteria.
                            </div>
                        ) : (
                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-50/40">
                                {filteredOverviewGrades.map((g: any) => {
                                    const isFullyStaffed = g.coveragePercentage >= 100;
                                    const displayName = g.gradeName && g.gradeName.trim() !== "Grade"
                                        ? g.gradeName
                                        : (g.level ? `Grade ${g.level}` : (g.gradeName || "Grade"));

                                    return (
                                        <div 
                                            key={g.schoolGradeId} 
                                            onClick={() => {
                                                setGradeFilter(g.schoolGradeId);
                                                setSectionFilter("ALL");
                                                setSubjectFilter("ALL");
                                                setActiveTab("matrix");
                                            }}
                                            className="relative overflow-hidden bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-[#4085b3] transition-all duration-300 flex flex-col justify-between h-full cursor-pointer group"
                                            title="Click to view sections in coverage matrix"
                                        >
                                            {/* Left-to-right signature blue fill hover animation */}
                                            <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />

                                            <div className="relative z-10">
                                                {/* Top Row: Icon Badge & Staffing Status */}
                                                <div className="flex items-start justify-between">
                                                    <div className="w-10 h-10 rounded-lg bg-sky-50 text-[#4085b3] group-hover:bg-white group-hover:text-[#4085b3] flex items-center justify-center transition-all duration-300 shadow-2xs">
                                                        <GraduationCap className="w-5 h-5 stroke-[1.8]" />
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all duration-300 ${
                                                            isFullyStaffed 
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30" 
                                                                : "bg-amber-50 text-amber-700 border-amber-200 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30"
                                                        }`}>
                                                            {g.coveragePercentage}% Staffed
                                                        </span>

                                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
                                                    </div>
                                                </div>

                                                {/* Title & Summary */}
                                                <div className="mt-4">
                                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-white transition-colors duration-300">
                                                        {displayName}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 group-hover:text-blue-100 transition-colors duration-300 mt-1 leading-relaxed">
                                                        {g.sectionCount} {g.sectionCount === 1 ? "Section" : "Sections"} &bull; {g.subjects?.length || 0} {g.subjects?.length === 1 ? "Subject" : "Subjects"} &bull; {g.assignedPeriods}/{g.demandPeriods} Periods/wk
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Bottom Details Line */}
                                            <div className="relative z-10 mt-5 pt-3 border-t border-slate-100 group-hover:border-white/20 flex items-center justify-between text-xs transition-colors duration-300">
                                                <span className="font-semibold text-slate-600 group-hover:text-white font-mono text-[11px] transition-colors duration-300">
                                                    {isFullyStaffed ? "Fully Allocated" : `${g.demandPeriods - g.assignedPeriods} Vacant Periods`}
                                                </span>
                                                <span className="text-[#4085b3] group-hover:text-white font-medium inline-flex items-center space-x-1 transition-colors duration-300">
                                                    <span>View Coverage</span>
                                                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 2: SECTION COVERAGE MATRIX */}
            {activeTab === "matrix" && (
                <div className="space-y-4">
                    {/* Filters Bar: Clear Filter + Search + Grade + Section + Subject */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                            {/* Clear Filter Option */}
                            {isCoverageFilterActive && (
                                <button
                                    onClick={clearCoverageFilters}
                                    className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                                    title="Reset all filters"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Clear Filters</span>
                                </button>
                            )}

                            <div className="relative w-full sm:w-48">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search subjects or teachers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none text-slate-700"
                                />
                            </div>

                            {/* Grade Filter */}
                            <select
                                value={gradeFilter}
                                onChange={(e) => {
                                    setGradeFilter(e.target.value);
                                    setSectionFilter("ALL");
                                    setSubjectFilter("ALL");
                                }}
                                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none cursor-pointer"
                            >
                                <option value="ALL">All Grades</option>
                                {demandData?.grades?.map((g: any) => {
                                    const name = g.gradeName && g.gradeName.trim() !== "Grade" ? g.gradeName : (g.level ? `Grade ${g.level}` : (g.gradeName || "Grade"));
                                    return <option key={g.schoolGradeId} value={g.schoolGradeId}>{name}</option>;
                                })}
                            </select>

                            {/* Section Filter */}
                            <select
                                value={sectionFilter}
                                onChange={(e) => {
                                    setSectionFilter(e.target.value);
                                    setSubjectFilter("ALL");
                                }}
                                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none cursor-pointer"
                            >
                                <option value="ALL">All Sections</option>
                                {availableSectionsForFilter.map((sec: any) => (
                                    <option key={sec.sectionId} value={sec.sectionId}>
                                        {gradeFilter === "ALL" ? `${sec.gradeName} - Sec ${sec.sectionName}` : `Section ${sec.sectionName}`}
                                    </option>
                                ))}
                            </select>

                            {/* Subject Filter */}
                            <select
                                value={subjectFilter}
                                onChange={(e) => setSubjectFilter(e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none cursor-pointer"
                            >
                                <option value="ALL">All Subjects</option>
                                {availableSubjectsForFilter.map((sub) => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                            {filteredSections.length} {filteredSections.length === 1 ? "Section" : "Sections"}
                        </div>
                    </div>

                    {/* Section Tables */}
                    {filteredSections.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-400 shadow-2xs">
                            No sections match your filter criteria.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredSections.map((sec: any) => {
                                const gradeDisplayName = sec.gradeName && sec.gradeName.trim() !== "Grade"
                                    ? sec.gradeName
                                    : (sec.gradeLevel ? `Grade ${sec.gradeLevel}` : (sec.gradeName || "Grade"));

                                return (
                                    <div key={sec.sectionId} className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                                        {/* Clean Minimal Section Header */}
                                        <div className="bg-slate-50/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                                            <h3 className="font-semibold text-slate-900">
                                                {gradeDisplayName} &mdash; Section {sec.sectionName}
                                            </h3>

                                            {/* Homeroom Assignment */}
                                            <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                                                <span>Homeroom:</span>
                                                {sec.homeroomTeacher ? (
                                                    <span className="font-medium text-slate-800">{sec.homeroomTeacher.name}</span>
                                                ) : (
                                                    <span className="text-slate-400">Unassigned</span>
                                                )}
                                                {hasCreatePermission && !isYearLocked && (
                                                    <button
                                                        onClick={() => setHomeroomModal({
                                                            open: true,
                                                            sectionId: sec.sectionId,
                                                            sectionName: sec.sectionName,
                                                            gradeName: gradeDisplayName,
                                                            currentTeacherId: sec.homeroomTeacher?.id || null,
                                                            selectedTeacherId: sec.homeroomTeacher?.id || ""
                                                        })}
                                                        className="text-[#4085b3] hover:underline font-medium ml-1 cursor-pointer"
                                                    >
                                                        {sec.homeroomTeacher ? "Edit" : "Assign"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Clean Subject Table */}
                                        {sec.subjectAllocations.length === 0 ? (
                                            <div className="px-4 py-3 text-xs text-slate-400">
                                                No curriculum subjects configured for this grade.
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="text-[11px] font-semibold text-slate-500 uppercase bg-white border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-4 py-2 font-medium">Subject</th>
                                                            <th className="px-4 py-2 font-medium w-28">Periods</th>
                                                            <th className="px-4 py-2 font-medium">Teacher</th>
                                                            <th className="px-4 py-2 font-medium text-right w-36">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {sec.subjectAllocations.map((sa: any) => (
                                                            <tr key={sa.subjectId} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-4 py-2.5 font-medium text-slate-900">
                                                                    {sa.subjectName}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-slate-600 font-mono">
                                                                    {sa.weeklyPeriodsRequired} p/wk
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    {sa.teacher ? (
                                                                        <span className="text-slate-800 font-medium">{sa.teacher.name}</span>
                                                                    ) : (
                                                                        <span className="text-slate-300 font-mono">—</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-right">
                                                                    {sa.status === "VACANT" && hasCreatePermission && !isYearLocked && (
                                                                        <button
                                                                            onClick={() => router.push(`/dashboard/teachers/assignments/manage?yearId=${selectedYearId}&schoolGradeId=${sec.schoolGradeId}&sectionId=${sec.sectionId}&subjectId=${sa.subjectId}`)}
                                                                            className="text-xs text-[#4085b3] hover:underline font-medium cursor-pointer"
                                                                        >
                                                                            + Assign
                                                                        </button>
                                                                    )}

                                                                    {sa.status === "PROPOSED" && isPrincipalOrAdmin && !isYearLocked && sa.assignmentId && (
                                                                        <button
                                                                            onClick={() => handleApprove(sa.assignmentId)}
                                                                            disabled={actionLoading}
                                                                            className="text-xs text-emerald-700 hover:underline font-medium cursor-pointer"
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                    )}

                                                                    {sa.status === "STAFFED" && sa.assignmentId && hasCreatePermission && !isYearLocked && (
                                                                        <div className="flex items-center justify-end space-x-2">
                                                                            <button
                                                                                onClick={() => router.push(`/dashboard/teachers/assignments/manage?yearId=${selectedYearId}&schoolGradeId=${sec.schoolGradeId}&sectionId=${sec.sectionId}&subjectId=${sa.subjectId}&oldAssignmentId=${sa.assignmentId}`)}
                                                                                className="text-xs text-slate-600 hover:text-[#4085b3] hover:underline cursor-pointer"
                                                                            >
                                                                                Reassign
                                                                            </button>
                                                                            <span className="text-slate-300">&bull;</span>
                                                                            <button
                                                                                onClick={() => handleEndAssignment(sa.assignmentId)}
                                                                                disabled={actionLoading}
                                                                                className="text-xs text-slate-400 hover:text-rose-600 hover:underline cursor-pointer"
                                                                            >
                                                                                End
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: TEACHER WORKLOADS */}
            {activeTab === "workload" && (
                <div className="space-y-4">
                    {/* Filters Bar: Clear Filter + Search + Workload Filter + Teacher Filter */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                            {/* Clear Filter Option */}
                            {isWorkloadFilterActive && (
                                <button
                                    onClick={clearWorkloadFilters}
                                    className="inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                                    title="Reset all filters"
                                >
                                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Clear Filters</span>
                                </button>
                            )}

                            <div className="relative w-full sm:w-48">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search faculty..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] outline-none text-slate-700"
                                />
                            </div>

                            {/* Workload Status Filter */}
                            <select
                                value={workloadFilter}
                                onChange={(e) => setWorkloadFilter(e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer outline-none focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3]"
                            >
                                <option value="ALL">All Workloads</option>
                                <option value="TARGET">On Target (18–24 p/wk)</option>
                                <option value="UNDERLOADED">Underloaded (&lt;18 p/wk)</option>
                                <option value="OVERLOADED">Overloaded (&gt;28 p/wk)</option>
                                <option value="UNASSIGNED">Unassigned (0 p/wk)</option>
                            </select>

                            {/* Teacher Filter */}
                            <select
                                value={teacherFilter}
                                onChange={(e) => setTeacherFilter(e.target.value)}
                                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer outline-none focus:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3]"
                            >
                                <option value="ALL">All Faculty</option>
                                {availableTeachersForFilter.map((t: any) => (
                                    <option key={t.id} value={t.id}>
                                        {t.firstName} {t.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                            {filteredWorkload.length} {filteredWorkload.length === 1 ? "Faculty Member" : "Faculty Members"}
                        </div>
                    </div>

                    {filteredWorkload.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-400 shadow-2xs">
                            No teachers match the filter.
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                            <table className="w-full text-xs text-left">
                                <thead className="text-[11px] font-semibold text-slate-500 uppercase bg-white border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Teacher</th>
                                        <th className="px-4 py-2 font-medium w-32">Weekly Load</th>
                                        <th className="px-4 py-2 font-medium w-28">Status</th>
                                        <th className="px-4 py-2 font-medium">Assigned Subjects</th>
                                        <th className="px-4 py-2 font-medium text-right w-36">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredWorkload.map((w: any) => {
                                        const isExpanded = expandedTeacherId === w.teacherId;

                                        // Group assignments by subject for clean summary
                                        const subjectCounts: Record<string, { count: number; periods: number }> = {};
                                        w.assignments?.forEach((a: any) => {
                                            if (!subjectCounts[a.subjectName]) {
                                                subjectCounts[a.subjectName] = { count: 0, periods: 0 };
                                            }
                                            subjectCounts[a.subjectName].count += 1;
                                            subjectCounts[a.subjectName].periods += a.periodsPerWeek;
                                        });

                                        const hasAssignments = w.assignments && w.assignments.length > 0;

                                        return (
                                            <tr key={w.teacherId} className="hover:bg-slate-50/50 transition-colors align-top">
                                                <td className="px-4 py-2.5">
                                                    <div className="font-medium text-slate-900">{w.name}</div>
                                                    {w.homeroomSection && (
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            Homeroom: {w.homeroomSection.gradeName} {w.homeroomSection.name}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-4 py-2.5 font-mono text-slate-700">
                                                    <span className="font-medium">{w.totalPeriods}</span>
                                                    <span className="text-slate-400"> / {w.targetWorkload || 22} p/wk</span>
                                                </td>

                                                <td className="px-4 py-2.5 text-xs">
                                                    {w.status === "TARGET" || w.status === "NEAR_CAPACITY" ? (
                                                        <span className="text-emerald-700 font-medium">On Target</span>
                                                    ) : w.status === "OVERLOADED" ? (
                                                        <span className="text-rose-600 font-medium">Overloaded</span>
                                                    ) : w.status === "UNDERLOADED" ? (
                                                        <span className="text-slate-600 font-medium">Underloaded</span>
                                                    ) : (
                                                        <span className="text-slate-400">Unassigned</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-2.5">
                                                    {hasAssignments ? (
                                                        <div>
                                                            <div className="text-slate-800">
                                                                {Object.entries(subjectCounts).map(([sub, data], idx) => (
                                                                    <span key={sub}>
                                                                        {idx > 0 && <span className="text-slate-300 mx-1.5">&bull;</span>}
                                                                        <span className="font-medium">{sub}</span>
                                                                        <span className="text-slate-400 ml-1 font-mono text-[11px]">({data.periods}p)</span>
                                                                    </span>
                                                                ))}
                                                            </div>

                                                            {isExpanded && (
                                                                <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 bg-slate-50/60 p-2 rounded text-[11px] text-slate-600">
                                                                    {w.assignments.map((a: any) => (
                                                                        <div key={a.assignmentId} className="flex justify-between">
                                                                            <span>{a.subjectName} &mdash; {a.gradeName} (Sec {a.sectionName})</span>
                                                                            <span className="font-mono text-slate-500">{a.periodsPerWeek} p/wk</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 font-mono">—</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-2.5 text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        {hasAssignments && (
                                                            <>
                                                                <button
                                                                    onClick={() => setExpandedTeacherId(isExpanded ? null : w.teacherId)}
                                                                    className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                                                                >
                                                                    {isExpanded ? "Hide" : "Details"}
                                                                </button>
                                                                <span className="text-slate-300">&bull;</span>
                                                            </>
                                                        )}
                                                        {hasCreatePermission && !isYearLocked && (
                                                            <button
                                                                onClick={() => router.push(`/dashboard/teachers/assignments/manage?yearId=${selectedYearId}&teacherId=${w.teacherId}`)}
                                                                className="text-xs text-[#4085b3] hover:underline font-medium cursor-pointer"
                                                            >
                                                                + Assign
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
                </div>
            )}

            {/* TAB 4: PENDING PROPOSALS */}
            {activeTab === "approvals" && (
                <div className="space-y-4">
                    {pendingProposals.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-xs text-slate-400 shadow-2xs">
                            <p className="text-sm font-semibold text-slate-800">No Pending Proposals</p>
                            <p className="mt-1 text-slate-400">All instructional allocations for this academic year are confirmed.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 text-xs">
                                <span className="font-semibold text-slate-800">
                                    {pendingProposals.length} Pending {pendingProposals.length === 1 ? "Proposal" : "Proposals"}
                                </span>
                                {isPrincipalOrAdmin && !isYearLocked && (
                                    <button
                                        onClick={handleBulkApprove}
                                        disabled={actionLoading}
                                        className="bg-[#4085b3] hover:bg-[#2b6a94] text-white text-xs font-medium py-1 px-3 rounded shadow-2xs transition-colors cursor-pointer"
                                    >
                                        Approve All
                                    </button>
                                )}
                            </div>

                            <table className="w-full text-xs text-left">
                                <thead className="text-[11px] font-semibold text-slate-500 uppercase bg-white border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2 font-medium">Teacher</th>
                                        <th className="px-4 py-2 font-medium">Subject</th>
                                        <th className="px-4 py-2 font-medium">Grade & Section</th>
                                        <th className="px-4 py-2 font-medium w-28">Periods</th>
                                        <th className="px-4 py-2 font-medium text-right w-36">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pendingProposals.map((prop: any) => {
                                        const gradeName = prop.schoolGrade?.grade?.name && prop.schoolGrade?.grade?.name.trim() !== "Grade"
                                            ? prop.schoolGrade?.grade?.name
                                            : (prop.schoolGrade?.grade?.level ? `Grade ${prop.schoolGrade?.grade?.level}` : (prop.schoolGrade?.grade?.name || "Grade"));

                                        return (
                                            <tr key={prop.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-900">
                                                    {prop.teacher?.firstName} {prop.teacher?.lastName}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-800">
                                                    {prop.subject?.name}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-600">
                                                    {gradeName} {prop.section ? `\u2014 Section ${prop.section.name}` : "(All Sections)"}
                                                </td>
                                                <td className="px-4 py-2.5 font-mono text-slate-600">
                                                    {prop.periodsPerWeek} p/wk
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    {isPrincipalOrAdmin && !isYearLocked && (
                                                        <div className="flex items-center justify-end space-x-2">
                                                            <button
                                                                onClick={() => handleApprove(prop.id)}
                                                                disabled={actionLoading}
                                                                className="text-xs text-emerald-700 hover:underline font-medium cursor-pointer"
                                                            >
                                                                Approve
                                                            </button>
                                                            <span className="text-slate-300">&bull;</span>
                                                            <button
                                                                onClick={() => handleReject(prop.id)}
                                                                disabled={actionLoading}
                                                                className="text-xs text-slate-400 hover:text-rose-600 hover:underline cursor-pointer"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Homeroom Assignment Modal */}
            <Modal
                isOpen={homeroomModal.open}
                onClose={() => setHomeroomModal(prev => ({ ...prev, open: false }))}
                title={`Assign Homeroom Teacher — ${homeroomModal.gradeName} (${homeroomModal.sectionName})`}
            >
                <div className="space-y-4">
                    <p className="text-xs text-gray-500">
                        Designate the faculty member who supervises this section and coordinates attendance.
                    </p>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Homeroom Faculty Member
                        </label>
                        <select
                            value={homeroomModal.selectedTeacherId}
                            onChange={(e) => setHomeroomModal(prev => ({ ...prev, selectedTeacherId: e.target.value }))}
                            className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-[#4085b3] outline-none"
                        >
                            <option value="">-- No Homeroom Teacher (Vacant) --</option>
                            {allTeachers.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                    {t.firstName} {t.lastName} ({t.employeeId || t.staffIdCode || "Staff"})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end space-x-2 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setHomeroomModal(prev => ({ ...prev, open: false }))}
                            className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveHomeroom}
                            disabled={actionLoading}
                            className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-lg transition-colors shadow-xs cursor-pointer"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
