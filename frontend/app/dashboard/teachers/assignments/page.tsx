"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    GraduationCap, Plus, Search, ClipboardList, Settings2, Users, Clock, 
    AlertTriangle, CheckCircle2, ShieldCheck, Check, X, RefreshCw, Filter, 
    BookOpen, Layers, Award, ChevronRight, UserCheck, UserX, BarChart3, 
    Calendar, AlertCircle, CheckCircle, Ban
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
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

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [gradeFilter, setGradeFilter] = useState<string>("ALL");
    const [workloadFilter, setWorkloadFilter] = useState<string>("ALL");

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
            setLoading(true);
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

                // Prefer ACTIVE year, otherwise first PLANNED year, otherwise first available
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
        loadStaffingData(yearId);
    };

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
            setSuccessMessage("Teaching assignment approved & activated!");
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
            setSuccessMessage("Proposal rejected and returned for revision.");
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
        if (!confirm(`Approve and activate all ${proposed.length} pending teaching assignment proposals?`)) return;

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
            setSuccessMessage(`Successfully approved ${proposed.length} teaching assignments!`);
            if (selectedYearId) loadStaffingData(selectedYearId);
        } catch (err: any) {
            setError(err.message || "Bulk approval failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEndAssignment = async (assignmentId: string) => {
        if (!confirm("Are you sure you want to end this teaching assignment? Downstream student grades and historical attendance will remain safely preserved.")) return;

        try {
            setActionLoading(true);
            const res = await fetchApi(`/teacher/assignments/${assignmentId}/end`, { method: "POST" });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to end assignment");
            }
            setSuccessMessage("Teaching assignment safely ended.");
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
            setSuccessMessage("Homeroom teacher updated successfully!");
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

    const targetTeachersCount = useMemo(() => {
        return workloadData.filter(w => w.status === "TARGET" || w.status === "NEAR_CAPACITY").length;
    }, [workloadData]);

    // Filtered matrix sections
    const filteredSections = useMemo(() => {
        if (!coverageData?.sections) return [];
        return coverageData.sections.filter((sec: any) => {
            if (gradeFilter !== "ALL" && sec.schoolGradeId !== gradeFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchSec = sec.sectionName.toLowerCase().includes(q) || sec.gradeName.toLowerCase().includes(q);
                const matchHomeroom = sec.homeroomTeacher?.name?.toLowerCase().includes(q);
                const matchSubject = sec.subjectAllocations.some((sa: any) => 
                    sa.subjectName.toLowerCase().includes(q) || sa.teacher?.name?.toLowerCase().includes(q)
                );
                return matchSec || matchHomeroom || matchSubject;
            }
            return true;
        });
    }, [coverageData, gradeFilter, searchQuery]);

    // Filtered faculty workload
    const filteredWorkload = useMemo(() => {
        return workloadData.filter((w: any) => {
            if (workloadFilter !== "ALL" && w.status !== workloadFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchName = w.name?.toLowerCase().includes(q);
                const matchId = w.employeeId?.toLowerCase().includes(q);
                const matchSub = w.assignments?.some((a: any) => a.subjectName?.toLowerCase().includes(q));
                return matchName || matchId || matchSub;
            }
            return true;
        });
    }, [workloadData, workloadFilter, searchQuery]);

    if (loading && !demandData && !coverageData) {
        return <LoadingState message="Calculating staffing demand and faculty workloads..." />;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Top Navigation & Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <ClipboardList className="w-7 h-7 text-[#006b3f]" />
                        <span>Staffing & Instructional Allocation</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Curriculum period demand, section coverage matrix & faculty workload governance
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Academic Year Selector */}
                    <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-600">Academic Year:</span>
                        <select
                            value={selectedYearId}
                            onChange={(e) => handleYearChange(e.target.value)}
                            className="text-xs font-semibold text-gray-900 bg-transparent focus:outline-none cursor-pointer"
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.status === "ACTIVE" ? "(ACTIVE)" : y.status === "PLANNED" ? "(PLANNED)" : `(${y.status})`}
                                </option>
                            ))}
                        </select>
                        {selectedYear && (
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                selectedYear.status === "ACTIVE" 
                                    ? "bg-emerald-100 text-emerald-800"
                                    : selectedYear.status === "PLANNED"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-700"
                            }`}>
                                {selectedYear.status}
                            </span>
                        )}
                    </div>

                    <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => selectedYearId && loadStaffingData(selectedYearId)}
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    >
                        Refresh
                    </Button>

                    {hasCreatePermission && !isYearLocked && (
                        <Button 
                            onClick={() => router.push(`/dashboard/teachers/assignments/manage?yearId=${selectedYearId}`)}
                            leftIcon={<Plus className="w-4 h-4" />}
                            className="bg-[#006b3f] hover:bg-[#005432] text-white shadow-sm"
                        >
                            Assign Faculty
                        </Button>
                    )}
                </div>
            </div>

            {/* Notification Messages */}
            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {isYearLocked && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-4 py-2.5 rounded-lg flex items-center space-x-2">
                    <Ban className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>
                        <strong>Read-Only Archive:</strong> This academic year is marked as <strong>{selectedYear?.status}</strong>. Teaching assignments, homeroom allocations, and period loads are locked for historical preservation.
                    </span>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 space-x-4">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                        activeTab === "overview"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    <span>Staffing Overview</span>
                </button>

                <button
                    onClick={() => setActiveTab("matrix")}
                    className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                        activeTab === "matrix"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <BookOpen className="w-4 h-4" />
                    <span>Section Coverage Matrix</span>
                    {demandData && demandData.totalUnassignedPeriods > 0 && (
                        <span className="bg-red-100 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {demandData.totalUnassignedPeriods}p vacant
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("workload")}
                    className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                        activeTab === "workload"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Faculty Workload Engine</span>
                    {overloadedTeachersCount > 0 && (
                        <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {overloadedTeachersCount} overloaded
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("approvals")}
                    className={`pb-3 text-sm font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
                        activeTab === "approvals"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Pending Proposals</span>
                    {pendingProposals.length > 0 && (
                        <span className="bg-[#006b3f] text-white text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {pendingProposals.length}
                        </span>
                    )}
                </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* KPI Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <Card className="bg-emerald-50/60 border-emerald-100">
                            <CardContent className="p-4 flex items-center space-x-3">
                                <div className="p-2.5 bg-emerald-100 text-[#006b3f] rounded-lg">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Curriculum Demand</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {demandData?.totalDemandPeriods || 0} <span className="text-xs font-normal text-gray-500">p/wk</span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-blue-50/60 border-blue-100">
                            <CardContent className="p-4 flex items-center space-x-3">
                                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Allocated Periods</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {demandData?.totalAssignedPeriods || 0} <span className="text-xs font-normal text-gray-500">p/wk</span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={demandData?.totalUnassignedPeriods > 0 ? "bg-red-50/60 border-red-100" : "bg-gray-50 border-gray-200"}>
                            <CardContent className="p-4 flex items-center space-x-3">
                                <div className={`p-2.5 rounded-lg ${demandData?.totalUnassignedPeriods > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Vacant Periods</p>
                                    <p className={`text-xl font-bold ${demandData?.totalUnassignedPeriods > 0 ? "text-red-700" : "text-gray-900"}`}>
                                        {demandData?.totalUnassignedPeriods || 0} <span className="text-xs font-normal text-gray-500">p/wk</span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-purple-50/60 border-purple-100">
                            <CardContent className="p-4 flex items-center space-x-3">
                                <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Coverage %</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {demandData?.coveragePercentage || 0}%
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-amber-50/60 border-amber-100">
                            <CardContent className="p-4 flex items-center space-x-3">
                                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase">Faculty On Target</p>
                                    <p className="text-xl font-bold text-gray-900">
                                        {targetTeachersCount} <span className="text-xs font-normal text-gray-500">({overloadedTeachersCount} over)</span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Grade-by-Grade Curriculum Demand Breakdown */}
                    <Card className="shadow-sm">
                        <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-gray-900">Curriculum Demand & Coverage by Grade Level</CardTitle>
                                <p className="text-xs text-gray-500 mt-0.5">Calculated from Step 2: weekly subject periods multiplied by grade sections</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!demandData?.grades || demandData.grades.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No grade levels or curriculum subjects configured for {selectedYear?.name}. Configure Grade curriculum in Step 2 first.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {demandData.grades.map((g: any) => (
                                        <div key={g.schoolGradeId} className="p-5 hover:bg-gray-50/50 transition-colors">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                                <div className="flex items-center space-x-3">
                                                    <span className="w-8 h-8 rounded-full bg-emerald-100 text-[#006b3f] flex items-center justify-center font-bold text-xs">
                                                        G{g.level}
                                                    </span>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-900">{g.gradeName}</h3>
                                                        <p className="text-xs text-gray-500">
                                                            {g.sectionCount} {g.sectionCount === 1 ? "Section" : "Sections"} &bull; {g.subjects.length} Subjects Configured
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-4">
                                                    <div className="text-right">
                                                        <p className="text-xs font-semibold text-gray-500 uppercase">Coverage</p>
                                                        <p className="text-sm font-bold text-gray-900">{g.assignedPeriods} / {g.demandPeriods} periods</p>
                                                    </div>
                                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                                        g.coveragePercentage >= 100 
                                                            ? "bg-emerald-100 text-emerald-800" 
                                                            : g.coveragePercentage > 0 
                                                            ? "bg-amber-100 text-amber-800" 
                                                            : "bg-red-100 text-red-800"
                                                    }`}>
                                                        {g.coveragePercentage}% Staffed
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                                <div 
                                                    className={`h-2 rounded-full ${g.coveragePercentage >= 100 ? "bg-emerald-500" : g.coveragePercentage > 50 ? "bg-amber-500" : "bg-red-500"}`}
                                                    style={{ width: `${Math.min(100, g.coveragePercentage)}%` }}
                                                />
                                            </div>

                                            {/* Subjects Mini Tags */}
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {g.subjects.map((sub: any) => (
                                                    <span 
                                                        key={sub.subjectId}
                                                        className={`text-xs px-2.5 py-1 rounded-md border flex items-center space-x-1.5 ${
                                                            sub.status === "STAFFED"
                                                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                                : sub.status === "PARTIALLY_STAFFED"
                                                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                                                : "bg-red-50 text-red-800 border-red-200"
                                                        }`}
                                                    >
                                                        <span className="font-semibold">{sub.subjectName}</span>
                                                        <span className="text-[10px] opacity-75 font-mono">
                                                            ({sub.assignedPeriods}/{sub.demandPeriods}p)
                                                        </span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 2: SECTION COVERAGE MATRIX */}
            {activeTab === "matrix" && (
                <div className="space-y-4">
                    {/* Filters bar */}
                    <Card className="shadow-sm">
                        <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search section, subject, teacher..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>

                                <select
                                    value={gradeFilter}
                                    onChange={(e) => setGradeFilter(e.target.value)}
                                    className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700"
                                >
                                    <option value="ALL">All Grades</option>
                                    {demandData?.grades?.map((g: any) => (
                                        <option key={g.schoolGradeId} value={g.schoolGradeId}>{g.gradeName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-xs text-gray-500 font-medium">
                                Showing {filteredSections.length} Sections
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section Cards */}
                    {filteredSections.length === 0 ? (
                        <EmptyState
                            title="No Sections Found"
                            message="No sections match your filter criteria or no curriculum has been assigned."
                        />
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredSections.map((sec: any) => {
                                const vacantCount = sec.subjectAllocations.filter((sa: any) => sa.status === "VACANT").length;

                                return (
                                    <Card key={sec.sectionId} className="shadow-sm overflow-hidden border border-gray-200">
                                        <div className="bg-gray-50/80 px-5 py-3.5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-9 h-9 rounded-lg bg-[#006b3f] text-white flex items-center justify-center font-bold text-xs">
                                                    {sec.sectionName}
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900">
                                                        {sec.gradeName} &mdash; Section {sec.sectionName}
                                                    </h3>
                                                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
                                                        <span>{sec.subjectAllocations.length} Required Subjects</span>
                                                        {vacantCount > 0 ? (
                                                            <span className="text-red-700 font-semibold flex items-center space-x-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                <span>{vacantCount} Vacancies</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                                                                <CheckCircle2 className="w-3 h-3" />
                                                                <span>100% Fully Staffed</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Homeroom Teacher Row / Selector */}
                                            <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
                                                <UserCheck className="w-4 h-4 text-[#006b3f]" />
                                                <div className="text-xs">
                                                    <span className="text-gray-500">Homeroom: </span>
                                                    {sec.homeroomTeacher ? (
                                                        <span className="font-semibold text-gray-900">{sec.homeroomTeacher.name}</span>
                                                    ) : (
                                                        <span className="font-semibold text-amber-700">Unassigned</span>
                                                    )}
                                                </div>
                                                {hasCreatePermission && !isYearLocked && (
                                                    <button
                                                        onClick={() => setHomeroomModal({
                                                            open: true,
                                                            sectionId: sec.sectionId,
                                                            sectionName: sec.sectionName,
                                                            gradeName: sec.gradeName,
                                                            currentTeacherId: sec.homeroomTeacher?.id || null,
                                                            selectedTeacherId: sec.homeroomTeacher?.id || ""
                                                        })}
                                                        className="text-[11px] text-[#006b3f] hover:underline font-semibold ml-2"
                                                    >
                                                        {sec.homeroomTeacher ? "Change" : "Assign"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="text-[11px] text-gray-500 uppercase bg-white border-b border-gray-100">
                                                    <tr>
                                                        <th className="px-5 py-2.5 font-semibold">Subject</th>
                                                        <th className="px-5 py-2.5 font-semibold">Weekly Demand</th>
                                                        <th className="px-5 py-2.5 font-semibold">Assigned Teacher</th>
                                                        <th className="px-5 py-2.5 font-semibold">Status</th>
                                                        <th className="px-5 py-2.5 font-semibold text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {sec.subjectAllocations.map((sa: any) => (
                                                        <tr key={sa.subjectId} className="hover:bg-gray-50/50">
                                                            <td className="px-5 py-3 font-semibold text-gray-900">
                                                                {sa.subjectName}
                                                            </td>
                                                            <td className="px-5 py-3 text-gray-600">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-medium bg-gray-100 text-gray-800">
                                                                    {sa.weeklyPeriodsRequired} periods/wk
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3">
                                                                {sa.teacher ? (
                                                                    <div>
                                                                        <p className="font-semibold text-gray-900">{sa.teacher.name}</p>
                                                                        <p className="text-[10px] text-gray-500">{sa.teacher.employeeId || "Staff"}</p>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-red-600 font-semibold flex items-center space-x-1">
                                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                                        <span>Unstaffed</span>
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3">
                                                                {sa.status === "STAFFED" ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                        STAFFED
                                                                    </span>
                                                                ) : sa.status === "PROPOSED" ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                        PROPOSED
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                                                        VACANT
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-5 py-3 text-right space-x-2">
                                                                {sa.status === "VACANT" && hasCreatePermission && !isYearLocked && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-[#006b3f] hover:bg-emerald-50 text-xs py-1"
                                                                        onClick={() => router.push(`/dashboard/teachers/assignments/manage?yearId=${selectedYearId}&schoolGradeId=${sec.schoolGradeId}&sectionId=${sec.sectionId}&subjectId=${sa.subjectId}`)}
                                                                    >
                                                                        Assign Teacher
                                                                    </Button>
                                                                )}

                                                                {sa.status === "PROPOSED" && isPrincipalOrAdmin && !isYearLocked && sa.assignmentId && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-xs py-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                                                                        onClick={() => handleApprove(sa.assignmentId)}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        Approve
                                                                    </Button>
                                                                )}

                                                                {sa.status === "STAFFED" && sa.assignmentId && hasCreatePermission && !isYearLocked && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-xs py-1 text-gray-500 hover:text-red-700 hover:bg-red-50"
                                                                        onClick={() => handleEndAssignment(sa.assignmentId)}
                                                                        disabled={actionLoading}
                                                                    >
                                                                        End Load
                                                                    </Button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: FACULTY WORKLOAD ENGINE */}
            {activeTab === "workload" && (
                <div className="space-y-4">
                    {/* Filter bar */}
                    <Card className="shadow-sm">
                        <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search teacher name, ID, subject..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                    />
                                </div>

                                <select
                                    value={workloadFilter}
                                    onChange={(e) => setWorkloadFilter(e.target.value)}
                                    className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700"
                                >
                                    <option value="ALL">All Workloads</option>
                                    <option value="TARGET">On Target (18-24 p/wk)</option>
                                    <option value="UNDERLOADED">Underloaded (&lt;18 p/wk)</option>
                                    <option value="OVERLOADED">Overloaded (&gt;28 p/wk)</option>
                                    <option value="UNASSIGNED">Unassigned (0 p/wk)</option>
                                </select>
                            </div>

                            <div className="text-xs text-gray-500 font-medium">
                                Showing {filteredWorkload.length} Teachers
                            </div>
                        </CardContent>
                    </Card>

                    {filteredWorkload.length === 0 ? (
                        <EmptyState
                            title="No Faculty Found"
                            message="No teachers match the current filter selection."
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredWorkload.map((w: any) => {
                                const max = w.maxWorkload || 28;
                                const target = w.targetWorkload || 22;
                                const min = w.minWorkload || 18;
                                const pct = Math.min(100, Math.round((w.totalPeriods / max) * 100));

                                return (
                                    <Card key={w.teacherId} className="shadow-2xs border border-gray-200">
                                        <CardContent className="p-4 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-sm font-bold text-gray-900">{w.name}</h3>
                                                    <p className="text-xs text-gray-500">
                                                        {w.employeeId || "Staff"} &bull; {w.employmentType.replace("_", " ")}
                                                    </p>
                                                    {w.homeroomSection && (
                                                        <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                            Homeroom: {w.homeroomSection.gradeName} - {w.homeroomSection.name}
                                                        </span>
                                                    )}
                                                </div>

                                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                                                    w.status === "TARGET" || w.status === "NEAR_CAPACITY"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : w.status === "OVERLOADED"
                                                        ? "bg-red-100 text-red-800"
                                                        : w.status === "UNDERLOADED"
                                                        ? "bg-amber-100 text-amber-800"
                                                        : "bg-gray-100 text-gray-700"
                                                }`}>
                                                    {w.status.replace("_", " ")}
                                                </span>
                                            </div>

                                            {/* Specializations Badges */}
                                            {w.specializations && w.specializations.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {w.specializations.map((spec: any) => (
                                                        <span 
                                                            key={spec.subjectId}
                                                            className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 flex items-center space-x-1"
                                                        >
                                                            <Award className="w-2.5 h-2.5 text-blue-500" />
                                                            <span>{spec.subjectName}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Workload Progress Bar */}
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="font-semibold text-gray-700">
                                                        {w.totalPeriods} <span className="text-gray-500 font-normal">periods/week</span>
                                                    </span>
                                                    <span className="text-gray-500 text-[11px]">
                                                        Target: {target} (Min {min} - Max {max})
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div 
                                                        className={`h-2 rounded-full ${
                                                            w.status === "OVERLOADED" 
                                                                ? "bg-red-500" 
                                                                : w.status === "TARGET" || w.status === "NEAR_CAPACITY" 
                                                                ? "bg-emerald-500" 
                                                                : "bg-amber-500"
                                                        }`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Assigned Classes List */}
                                            {w.assignments && w.assignments.length > 0 ? (
                                                <div className="bg-gray-50 rounded-lg p-2.5 space-y-1 text-xs">
                                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Assigned Sections ({w.assignments.length}):</p>
                                                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                                        {w.assignments.map((asgn: any) => (
                                                            <div key={asgn.assignmentId} className="flex justify-between items-center text-gray-700">
                                                                <span>
                                                                    <strong>{asgn.subjectName}</strong> &mdash; {asgn.gradeName} {asgn.sectionName ? `(${asgn.sectionName})` : ""}
                                                                </span>
                                                                <span className="font-mono text-[11px] text-gray-500">
                                                                    {asgn.periodsPerWeek}p/wk
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">No instructional assignments allocated yet.</p>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: PENDING PROPOSALS (PRINCIPAL/ADMIN GOVERNANCE) */}
            {activeTab === "approvals" && (
                <div className="space-y-4">
                    <Card className="bg-blue-50/70 border-blue-200">
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-bold text-blue-950 flex items-center space-x-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                                    <span>Principal & Vice-Principal Governance Workflow</span>
                                </h3>
                                <p className="text-xs text-blue-800 mt-1">
                                    Vice Principals and Academic Coordinators submit teaching assignment proposals. 
                                    Reviewing and approving activates the schedule and locks in the period workload.
                                </p>
                            </div>

                            {pendingProposals.length > 0 && isPrincipalOrAdmin && !isYearLocked && (
                                <Button
                                    onClick={handleBulkApprove}
                                    disabled={actionLoading}
                                    className="bg-[#006b3f] hover:bg-[#005432] text-white text-xs font-semibold py-2 px-4 shadow-sm"
                                    leftIcon={<Check className="w-4 h-4" />}
                                >
                                    Bulk Approve All ({pendingProposals.length})
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {pendingProposals.length === 0 ? (
                        <EmptyState
                            title="No Pending Proposals"
                            message="All teaching assignments for this academic year are confirmed and active."
                        />
                    ) : (
                        <Card className="shadow-sm">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-[11px] text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold">Teacher</th>
                                                <th className="px-6 py-3 font-semibold">Subject</th>
                                                <th className="px-6 py-3 font-semibold">Grade & Section</th>
                                                <th className="px-6 py-3 font-semibold">Weekly Load</th>
                                                <th className="px-6 py-3 font-semibold">Status</th>
                                                <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {pendingProposals.map((prop: any) => (
                                                <tr key={prop.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-3.5">
                                                        <p className="font-semibold text-gray-900">
                                                            {prop.teacher?.firstName} {prop.teacher?.lastName}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">
                                                            {prop.teacher?.employeeId || prop.teacher?.staffIdCode || "Staff"}
                                                        </p>
                                                    </td>
                                                    <td className="px-6 py-3.5 font-medium text-gray-900">
                                                        {prop.subject?.name}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-gray-600">
                                                        {prop.schoolGrade?.grade?.name} {prop.section ? `\u2014 Sec ${prop.section.name}` : "(All Sections)"}
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-medium bg-emerald-50 text-emerald-800">
                                                            {prop.periodsPerWeek} p/wk
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3.5">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                                            PENDING APPROVAL
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3.5 text-right space-x-2">
                                                        {isPrincipalOrAdmin && !isYearLocked && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-[#006b3f] hover:bg-[#005432] text-white text-xs py-1"
                                                                    onClick={() => handleApprove(prop.id)}
                                                                    disabled={actionLoading}
                                                                >
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-red-700 border-red-300 hover:bg-red-50 text-xs py-1"
                                                                    onClick={() => handleReject(prop.id)}
                                                                    disabled={actionLoading}
                                                                >
                                                                    Reject
                                                                </Button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
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
                        In the Ethiopian school system, homeroom teachers supervise student conduct, monitor overall attendance, and coordinate parent communication for their designated section.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Designated Homeroom Teacher
                        </label>
                        <select
                            value={homeroomModal.selectedTeacherId}
                            onChange={(e) => setHomeroomModal(prev => ({ ...prev, selectedTeacherId: e.target.value }))}
                            className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                        >
                            <option value="">-- No Homeroom Teacher (Vacant) --</option>
                            {allTeachers.map((t: any) => (
                                <option key={t.id} value={t.id}>
                                    {t.firstName} {t.lastName} ({t.employeeId || t.staffIdCode || "Staff"})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHomeroomModal(prev => ({ ...prev, open: false }))}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-[#006b3f] hover:bg-[#005432] text-white"
                            onClick={handleSaveHomeroom}
                            disabled={actionLoading}
                        >
                            Save Homeroom
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
