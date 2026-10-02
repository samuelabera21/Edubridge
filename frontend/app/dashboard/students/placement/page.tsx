"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { 
    Users, 
    Layers, 
    CheckCircle2, 
    AlertCircle, 
    Search, 
    ArrowRight, 
    ArrowLeftRight, 
    RotateCcw, 
    UserPlus, 
    ChevronRight, 
    Printer, 
    Clock, 
    ShieldCheck, 
    Lock,
    UserCheck,
    Check,
    X,
    FileSpreadsheet,
    HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

interface AcademicYearItem {
    id: string;
    name: string;
    status: string;
    startDate?: string;
    endDate?: string;
}

interface SchoolGradeItem {
    id: string;
    academicYearId: string;
    grade?: {
        id: string;
        name: string;
        level: number;
        code?: string;
    };
    sections?: {
        id: string;
        name: string;
        capacity?: number | null;
        status: string;
    }[];
}

interface StudentItem {
    id: string;
    studentId: string;
    firstName: string;
    fatherName: string;
    grandfatherName?: string;
    gender?: string;
    dateOfBirth?: string;
}

interface UnplacedStudent {
    enrollmentId: string;
    enrollmentType: string;
    enrollmentDate?: string;
    status: string;
    student: StudentItem;
}

interface SectionItem {
    id: string;
    name: string;
    status: string;
    capacity: number | null;
    occupancy: number;
    remainingCapacity: number | null;
    isFull: boolean;
    homeroomTeacher: {
        id: string;
        firstName: string;
        fatherName: string;
        email: string;
    } | null;
}

interface WorkspaceData {
    academicYear: AcademicYearItem;
    schoolGrade: {
        id: string;
        grade?: {
            id: string;
            name: string;
            code?: string;
            stage?: string;
        };
    } | null;
    summary: {
        totalEnrolled: number;
        totalPlaced: number;
        totalUnplaced: number;
        totalSections: number;
        totalCapacity: number | null;
        totalOccupancy: number;
        remainingCapacity: number | null;
        fullSectionsCount: number;
    };
    unplacedStudents: UnplacedStudent[];
    sections: SectionItem[];
}

interface RosterStudent {
    rollNumber: number;
    enrollmentId: string;
    enrollmentType: string;
    status: string;
    student: StudentItem;
}

interface RosterResponse {
    section: {
        id: string;
        name: string;
        status: string;
        capacity: number | null;
        schoolGrade: {
            id: string;
            grade: {
                id: string;
                name: string;
                code?: string;
            };
            academicYear: {
                id: string;
                name: string;
                status: string;
            };
        };
        homeroomTeacher?: {
            id: string;
            firstName: string;
            fatherName: string;
            email: string;
        } | null;
    };
    stats: {
        totalStudents: number;
        capacity: number | null;
        remainingCapacity: number | null;
        maleStudents: number;
        femaleStudents: number;
    };
    roster: RosterStudent[];
}

function PlacementWorkspaceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Context selectors
    const [years, setYears] = useState<AcademicYearItem[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [grades, setGrades] = useState<SchoolGradeItem[]>([]);
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");

    // Workspace main data
    const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [workspaceLoading, setWorkspaceLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter and search states
    const [searchQuery, setSearchQuery] = useState("");
    const [genderFilter, setGenderFilter] = useState<"ALL" | "MALE" | "FEMALE">("ALL");

    // Selection for bulk action
    const [selectedEnrollmentIds, setSelectedEnrollmentIds] = useState<string[]>([]);
    const [bulkTargetSectionId, setBulkTargetSectionId] = useState<string>("");

    // Action feedback
    const [actionLoading, setActionLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Roster modal
    const [rosterModalSectionId, setRosterModalSectionId] = useState<string | null>(null);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [rosterData, setRosterData] = useState<RosterResponse | null>(null);

    // Reassignment modal
    const [reassignModalOpen, setReassignModalOpen] = useState(false);
    const [reassignTarget, setReassignTarget] = useState<{
        enrollmentId: string;
        studentName: string;
        studentId: string;
        currentSectionName: string;
        currentSectionId: string;
    } | null>(null);
    const [reassignTargetSectionId, setReassignTargetSectionId] = useState<string>("");
    const [reassignReason, setReassignReason] = useState<string>("");

    // History modal
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyEnrollment, setHistoryEnrollment] = useState<{
        studentName: string;
        studentId: string;
        records: any[];
    } | null>(null);

    // 1. Initial Load: Academic Years
    useEffect(() => {
        async function initYears() {
            try {
                setLoading(true);
                const res = await fetchApi("/academic/years");
                if (!res.ok) throw new Error("Failed to load academic years");
                const yearsData: AcademicYearItem[] = await res.json();
                setYears(yearsData);

                const paramYearId = searchParams.get("yearId");
                const initialYear = (paramYearId && yearsData.some(y => y.id === paramYearId))
                    ? paramYearId
                    : (yearsData.find(y => y.status === "ACTIVE")?.id || yearsData[0]?.id || "");

                setSelectedYearId(initialYear);
            } catch (err: any) {
                setError(err.message || "Failed to initialize placement workspace");
            } finally {
                setLoading(false);
            }
        }
        initYears();
    }, [searchParams]);

    // 2. When Academic Year changes, load Grades
    useEffect(() => {
        if (!selectedYearId) return;

        async function loadGradesForYear() {
            try {
                setWorkspaceLoading(true);
                setWorkspace(null);
                const res = await fetchApi(`/academic/years/${selectedYearId}/grades`);
                if (!res.ok) throw new Error("Failed to load grades for academic year");
                const gradesData: SchoolGradeItem[] = await res.json();
                setGrades(gradesData);

                const paramGradeId = searchParams.get("gradeId");
                const initialGrade = (paramGradeId && gradesData.some(g => g.id === paramGradeId))
                    ? paramGradeId
                    : (gradesData[0]?.id || "");

                setSelectedGradeId(initialGrade);
            } catch (err: any) {
                setErrorMessage(err.message || "Failed to load grades");
                setGrades([]);
                setSelectedGradeId("");
            } finally {
                setWorkspaceLoading(false);
            }
        }
        loadGradesForYear();
    }, [selectedYearId, searchParams]);

    // 3. When Grade changes, load Workspace
    const loadWorkspace = async () => {
        if (!selectedYearId || !selectedGradeId) {
            setWorkspace(null);
            return;
        }

        try {
            setWorkspaceLoading(true);
            const res = await fetchApi(`/student/placement/workspace?academicYearId=${selectedYearId}&schoolGradeId=${selectedGradeId}`);
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to load placement workspace");
            }
            const data: WorkspaceData = await res.json();
            setWorkspace(data);
            setSelectedEnrollmentIds([]);
            setBulkTargetSectionId("");
        } catch (err: any) {
            setErrorMessage(err.message || "Could not retrieve placement workspace data");
            setWorkspace(null);
        } finally {
            setWorkspaceLoading(false);
        }
    };

    useEffect(() => {
        if (selectedYearId && selectedGradeId) {
            loadWorkspace();
        }
    }, [selectedYearId, selectedGradeId]);

    // Check if current academic year is locked
    const currentYear = years.find(y => y.id === selectedYearId);
    const isYearLocked = currentYear?.status === "COMPLETED" || currentYear?.status === "ARCHIVED";
    const currentGradeName = workspace?.schoolGrade?.grade?.name || grades.find(g => g.id === selectedGradeId)?.grade?.name || "Grade";

    // Filtered unplaced students
    const filteredUnplacedStudents = useMemo(() => {
        if (!workspace?.unplacedStudents) return [];
        const query = searchQuery.trim().toLowerCase();

        return workspace.unplacedStudents.filter(item => {
            const studentObj = item.student || (item as any);
            const firstName = studentObj?.firstName || (item as any).firstName || "";
            const fatherName = studentObj?.fatherName || (item as any).fatherName || "";
            const grandfatherName = studentObj?.grandfatherName || (item as any).grandfatherName || "";
            const fullName = `${firstName} ${fatherName} ${grandfatherName}`.trim().toLowerCase();
            const studentId = (studentObj?.studentId || (item as any).studentId || "").toLowerCase();
            const matchesQuery = !query || fullName.includes(query) || studentId.includes(query);

            // Gender filter
            const studentGender = (studentObj?.gender || (item as any).gender || "").toUpperCase();
            const matchesGender = genderFilter === "ALL" || studentGender === genderFilter;

            return matchesQuery && matchesGender;
        });
    }, [workspace?.unplacedStudents, searchQuery, genderFilter]);

    // Bulk selection handlers
    const isAllFilteredSelected = filteredUnplacedStudents.length > 0 && 
        filteredUnplacedStudents.every(s => selectedEnrollmentIds.includes(s.enrollmentId));

    const toggleSelectAll = () => {
        if (isAllFilteredSelected) {
            setSelectedEnrollmentIds([]);
        } else {
            setSelectedEnrollmentIds(filteredUnplacedStudents.map(s => s.enrollmentId));
        }
    };

    const toggleSelectStudent = (enrollmentId: string) => {
        setSelectedEnrollmentIds(prev => 
            prev.includes(enrollmentId) ? prev.filter(id => id !== enrollmentId) : [...prev, enrollmentId]
        );
    };

    // Placement Actions
    const handleAssignSingle = async (enrollmentId: string, sectionId: string) => {
        if (!sectionId) return;
        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            setActionLoading(true);
            const res = await fetchApi("/student/placement/assign", {
                method: "POST",
                body: JSON.stringify({ enrollmentId, sectionId })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Placement failed");

            setSuccessMessage(data.message || "Student placed successfully.");
            await loadWorkspace();
        } catch (err: any) {
            setErrorMessage(err.message || "Placement request failed");
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkAssign = async (targetSectionId?: string) => {
        const destSectionId = targetSectionId || bulkTargetSectionId;
        if (!destSectionId) {
            setErrorMessage("Please select a target section for bulk placement.");
            return;
        }
        if (selectedEnrollmentIds.length === 0) {
            setErrorMessage("Please select at least one student to place.");
            return;
        }

        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            setActionLoading(true);
            const res = await fetchApi("/student/placement/bulk-assign", {
                method: "POST",
                body: JSON.stringify({
                    enrollmentIds: selectedEnrollmentIds,
                    sectionId: destSectionId
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Bulk placement failed");

            setSuccessMessage(data.message || `Successfully placed ${data.placedCount} students.`);
            setSelectedEnrollmentIds([]);
            setBulkTargetSectionId("");
            await loadWorkspace();
        } catch (err: any) {
            setErrorMessage(err.message || "Bulk placement failed");
        } finally {
            setActionLoading(false);
        }
    };

    // Roster Loader
    const openRoster = async (sectionId: string) => {
        setRosterModalSectionId(sectionId);
        setRosterLoading(true);
        setRosterData(null);
        try {
            const res = await fetchApi(`/student/placement/sections/${sectionId}/roster`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to load section roster");
            }
            const data: RosterResponse = await res.json();
            setRosterData(data);
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to load section roster");
        } finally {
            setRosterLoading(false);
        }
    };

    // Reassignment Action
    const openReassignModal = (student: RosterStudent, currentSection: { id: string; name: string }) => {
        const studentName = `${student.student.firstName} ${student.student.fatherName} ${student.student.grandfatherName || ""}`.trim();
        setReassignTarget({
            enrollmentId: student.enrollmentId,
            studentName,
            studentId: student.student.studentId,
            currentSectionName: currentSection.name,
            currentSectionId: currentSection.id
        });
        setReassignTargetSectionId("");
        setReassignReason("");
        setReassignModalOpen(true);
    };

    const handleReassignSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reassignTarget || !reassignTargetSectionId) {
            setErrorMessage("Please choose a target section for reassignment.");
            return;
        }
        if (!reassignReason.trim()) {
            setErrorMessage("A valid reason is required for section reassignment.");
            return;
        }

        setErrorMessage(null);
        setSuccessMessage(null);
        try {
            setActionLoading(true);
            const res = await fetchApi("/student/placement/reassign", {
                method: "POST",
                body: JSON.stringify({
                    enrollmentId: reassignTarget.enrollmentId,
                    targetSectionId: reassignTargetSectionId,
                    reason: reassignReason.trim()
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Reassignment failed");

            setSuccessMessage(data.message || "Student section reassigned successfully.");
            setReassignModalOpen(false);
            setReassignTarget(null);

            // Refresh current roster and workspace
            if (rosterModalSectionId) {
                await openRoster(rosterModalSectionId);
            }
            await loadWorkspace();
        } catch (err: any) {
            setErrorMessage(err.message || "Reassignment failed");
        } finally {
            setActionLoading(false);
        }
    };

    // History Modal Loader
    const openPlacementHistory = async (enrollmentId: string, studentName: string, studentId: string) => {
        setHistoryLoading(true);
        setHistoryModalOpen(true);
        setHistoryEnrollment({ studentName, studentId, records: [] });
        try {
            const res = await fetchApi(`/student/placement/enrollments/${enrollmentId}/history`);
            if (res.ok) {
                const data = await res.json();
                const records = Array.isArray(data) ? data : (data.history || data.records || []);
                setHistoryEnrollment({ studentName, studentId, records });
            }
        } catch (err) {
            console.error("Failed to fetch placement history", err);
        } finally {
            setHistoryLoading(false);
        }
    };

    if (loading) {
        return <LoadingState message="Initializing student placement workspace..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={() => window.location.reload()} />;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#4085b3]/10 text-[#4085b3]">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Classroom Placement &amp; Roster Management</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Step 5: Assign enrolled students to sections, manage classroom occupancy, and maintain official rosters.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/students/enrollments">
                        <Button variant="outline" size="sm" className="text-slate-700 border-slate-300 hover:bg-slate-50">
                            Enrollment Ledger
                        </Button>
                    </Link>
                    <Link href="/dashboard/students">
                        <Button variant="outline" size="sm" className="text-slate-700 border-slate-300 hover:bg-slate-50">
                            Student Directory
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Notification Banners */}
            {successMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium">{successMessage}</span>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-800 p-1">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span className="font-medium">{errorMessage}</span>
                    </div>
                    <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-800 p-1">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {isYearLocked && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2.5 shadow-xs">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                        <span className="font-semibold">Academic Year is {currentYear?.status}:</span> Placement and reassignment mutations are strictly read-only for closed or archived sessions to preserve historical operational records.
                    </div>
                </div>
            )}

            {/* Cohort Context Bar: Year & Grade Selectors */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                        {/* Academic Year Selector */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                                Academic Year:
                            </label>
                            <select
                                value={selectedYearId}
                                onChange={(e) => setSelectedYearId(e.target.value)}
                                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3]"
                            >
                                {years.map((y) => (
                                    <option key={y.id} value={y.id}>
                                        {y.name} {y.status === "ACTIVE" ? "(Active)" : `(${y.status.toLowerCase()})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Grade Cohort Selector */}
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                                Grade Cohort:
                            </label>
                            <select
                                value={selectedGradeId}
                                onChange={(e) => setSelectedGradeId(e.target.value)}
                                disabled={grades.length === 0}
                                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:opacity-50"
                            >
                                {grades.length === 0 ? (
                                    <option value="">No grades configured</option>
                                ) : (
                                    grades.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.grade?.name || "Grade"}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={loadWorkspace} 
                            disabled={workspaceLoading || !selectedGradeId}
                            className="text-xs border-slate-300 hover:bg-slate-50"
                            leftIcon={<RotateCcw className={`w-3.5 h-3.5 ${workspaceLoading ? "animate-spin" : ""}`} />}
                        >
                            Refresh Workspace
                        </Button>
                    </div>
                </div>
            </div>

            {/* Placement KPI Summary Cards */}
            {workspace && workspace.schoolGrade && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    {/* Total Enrolled */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Total Enrolled</span>
                            <Users className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{workspace.summary.totalEnrolled}</span>
                            <span className="text-xs text-slate-500">students</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Total intake for {currentGradeName}</p>
                    </div>

                    {/* Placed in Sections */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Placed Cohort</span>
                            <UserCheck className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-emerald-700">{workspace.summary.totalPlaced}</span>
                            <span className="text-xs text-slate-500">placed</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {workspace.summary.totalEnrolled > 0 
                                ? `${Math.round((workspace.summary.totalPlaced / workspace.summary.totalEnrolled) * 100)}% placed` 
                                : "0%"}
                        </p>
                    </div>

                    {/* Unplaced Students */}
                    <div className={`border rounded-xl p-4 shadow-xs ${workspace.summary.totalUnplaced > 0 ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-200"}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Unplaced Pool</span>
                            <UserPlus className={`w-4 h-4 ${workspace.summary.totalUnplaced > 0 ? "text-amber-500" : "text-slate-400"}`} />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className={`text-2xl font-bold ${workspace.summary.totalUnplaced > 0 ? "text-amber-800" : "text-slate-900"}`}>
                                {workspace.summary.totalUnplaced}
                            </span>
                            <span className="text-xs text-slate-500">awaiting</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            {workspace.summary.totalUnplaced > 0 ? "Require section placement" : "All students placed"}
                        </p>
                    </div>

                    {/* Sections Count */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Active Sections</span>
                            <Layers className="w-4 h-4 text-[#4085b3]" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900">{workspace.summary.totalSections}</span>
                            <span className="text-xs text-slate-500">sections</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {workspace.summary.fullSectionsCount > 0 ? `${workspace.summary.fullSectionsCount} at full capacity` : "All have seats"}
                        </p>
                    </div>

                    {/* Capacity Utilization */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs col-span-2 sm:col-span-1">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">Capacity Utilization</span>
                            <ShieldCheck className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-900">{workspace.summary.totalOccupancy}</span>
                            <span className="text-xs text-slate-500">
                                / {workspace.summary.totalCapacity !== null ? workspace.summary.totalCapacity : "∞"}
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                            <div 
                                className={`h-1.5 rounded-full transition-all ${
                                    workspace.summary.totalCapacity && workspace.summary.totalOccupancy >= workspace.summary.totalCapacity
                                        ? "bg-rose-500"
                                        : workspace.summary.totalCapacity && (workspace.summary.totalOccupancy / workspace.summary.totalCapacity) > 0.85
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                }`}
                                style={{ 
                                    width: workspace.summary.totalCapacity 
                                        ? `${Math.min(100, (workspace.summary.totalOccupancy / workspace.summary.totalCapacity) * 100)}%` 
                                        : "50%" 
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Workspace Layout: Unplaced Cohort (Left) & Grade Sections (Right) */}
            {workspaceLoading ? (
                <LoadingState message="Loading placement cohort and section rosters..." />
            ) : !workspace || !workspace.schoolGrade ? (
                <EmptyState 
                    title="No Grade Selected" 
                    message="Please select an academic year and grade cohort to load the placement workspace." 
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT PANEL: Unplaced Student Cohort (Col 7 on large screens) */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                            {/* Panel Header */}
                            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-bold text-slate-900">Unplaced Students Pool</h2>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                            {workspace.unplacedStudents.length} awaiting
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Students officially enrolled in {workspace.schoolGrade?.grade?.name || currentGradeName} who have not yet been assigned to a classroom section.
                                    </p>
                                </div>
                            </div>

                            {/* Search & Filter Controls */}
                            <div className="p-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2.5">
                                <div className="relative flex-1 min-w-[200px]">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Search unplaced students by name or STU-ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4085b3]"
                                    />
                                    {searchQuery && (
                                        <button 
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Gender Filter */}
                                <div className="flex items-center gap-1 text-xs">
                                    <span className="text-slate-400 text-[11px] mr-1">Gender:</span>
                                    {(["ALL", "MALE", "FEMALE"] as const).map((g) => (
                                        <button
                                            key={g}
                                            onClick={() => setGenderFilter(g)}
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                                                genderFilter === g
                                                    ? "bg-slate-900 text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {g === "ALL" ? "All" : g === "MALE" ? "Male" : "Female"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bulk Action Toolbar (When 1 or more checked) */}
                            {selectedEnrollmentIds.length > 0 && (
                                <div className="p-3 bg-[#4085b3]/5 border-b border-[#4085b3]/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-[#4085b3]">
                                            {selectedEnrollmentIds.length} student{selectedEnrollmentIds.length > 1 ? "s" : ""} selected
                                        </span>
                                        <button 
                                            onClick={() => setSelectedEnrollmentIds([])}
                                            className="text-slate-500 hover:text-slate-700 underline text-[11px]"
                                        >
                                            Clear selection
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <select
                                            value={bulkTargetSectionId}
                                            onChange={(e) => setBulkTargetSectionId(e.target.value)}
                                            disabled={isYearLocked || actionLoading}
                                            className="text-xs bg-white border border-[#4085b3]/40 rounded-lg px-3 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#4085b3]"
                                        >
                                            <option value="">Choose Target Section...</option>
                                            {workspace.sections
                                                .filter(s => s.status === "ACTIVE" && (!s.isFull))
                                                .map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name} ({s.remainingCapacity !== null ? `${s.remainingCapacity} seats left` : "Open"})
                                                    </option>
                                                ))}
                                        </select>

                                        <Button
                                            size="sm"
                                            disabled={!bulkTargetSectionId || isYearLocked || actionLoading}
                                            onClick={() => handleBulkAssign()}
                                            className="bg-[#4085b3] hover:bg-[#32698e] text-white text-xs font-medium"
                                        >
                                            {actionLoading ? "Placing..." : `Place ${selectedEnrollmentIds.length} Selected`}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Unplaced Students List */}
                            {filteredUnplacedStudents.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        {workspace.unplacedStudents.length === 0 
                                            ? "All Students in this Grade are Placed!" 
                                            : "No students match your filter"}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                        {workspace.unplacedStudents.length === 0 
                                            ? `Every student enrolled in ${workspace.schoolGrade?.grade?.name || currentGradeName} is currently assigned to a section.` 
                                            : "Try adjusting your search query or gender filter."}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                                <th className="py-2.5 px-3 w-10 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAllFilteredSelected}
                                                        onChange={toggleSelectAll}
                                                        className="rounded border-slate-300 text-[#4085b3] focus:ring-[#4085b3]"
                                                        title="Select / Deselect all"
                                                    />
                                                </th>
                                                <th className="py-2.5 px-3">Student Name</th>
                                                <th className="py-2.5 px-3">Student ID</th>
                                                <th className="py-2.5 px-3">Gender</th>
                                                <th className="py-2.5 px-3">Intake Type</th>
                                                <th className="py-2.5 px-3 text-right">Placement Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredUnplacedStudents.map((item) => {
                                                const isSelected = selectedEnrollmentIds.includes(item.enrollmentId);
                                                const studentObj = item.student || (item as any);
                                                const firstName = studentObj?.firstName || (item as any).firstName || "";
                                                const fatherName = studentObj?.fatherName || (item as any).fatherName || "";
                                                const grandfatherName = studentObj?.grandfatherName || (item as any).grandfatherName || "";
                                                const fullName = (item as any).fullName || `${firstName} ${fatherName} ${grandfatherName}`.trim() || "Unnamed Student";
                                                const studentId = studentObj?.studentId || (item as any).studentId || "—";
                                                const gender = studentObj?.gender || (item as any).gender || "—";
                                                const dob = studentObj?.dateOfBirth || (item as any).dateOfBirth;

                                                return (
                                                    <tr 
                                                        key={item.enrollmentId} 
                                                        className={`hover:bg-slate-50/80 transition-colors ${isSelected ? "bg-[#4085b3]/5" : ""}`}
                                                    >
                                                        <td className="py-2.5 px-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectStudent(item.enrollmentId)}
                                                                className="rounded border-slate-300 text-[#4085b3] focus:ring-[#4085b3]"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <div className="font-semibold text-slate-900">{fullName}</div>
                                                            <span className="text-[11px] text-slate-400">
                                                                {dob ? `DOB: ${new Date(dob).toLocaleDateString()}` : "Active"}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 font-mono text-slate-600">
                                                            {studentId}
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                                gender === "FEMALE" 
                                                                    ? "bg-purple-50 text-purple-700 border border-purple-200" 
                                                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                                            }`}>
                                                                {gender}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3">
                                                            <span className="text-[11px] font-medium text-slate-600 px-2 py-0.5 rounded bg-slate-100">
                                                                {item.enrollmentType}
                                                            </span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right">
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <select
                                                                    id={`place-select-${item.enrollmentId}`}
                                                                    defaultValue=""
                                                                    disabled={isYearLocked || actionLoading}
                                                                    onChange={(e) => {
                                                                        if (e.target.value) {
                                                                            handleAssignSingle(item.enrollmentId, e.target.value);
                                                                            e.target.value = "";
                                                                        }
                                                                    }}
                                                                    className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 font-medium text-slate-700 focus:outline-none focus:border-[#4085b3] disabled:opacity-50"
                                                                >
                                                                    <option value="" disabled>Assign to...</option>
                                                                    {workspace.sections
                                                                        .filter(s => s.status === "ACTIVE" && (!s.isFull))
                                                                        .map(s => (
                                                                            <option key={s.id} value={s.id}>
                                                                                {s.name} ({s.remainingCapacity !== null ? `${s.remainingCapacity} seats` : "Open"})
                                                                            </option>
                                                                        ))}
                                                                </select>
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
                    </div>

                    {/* RIGHT PANEL: Grade Sections & Occupancy (Col 5 on large screens) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                            {/* Panel Header */}
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Configured Sections</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Real-time section occupancy and official rosters for {workspace.schoolGrade?.grade?.name || currentGradeName}.
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                                    {workspace.sections.length} sections
                                </span>
                            </div>

                            {/* Section Cards */}
                            {workspace.sections.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs font-semibold text-slate-700">No Sections Found</p>
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Configure sections for {workspace.schoolGrade?.grade?.name || currentGradeName} in School Configuration (Step 2).
                                    </p>
                                </div>
                            ) : (
                                <div className="p-4 space-y-3">
                                    {workspace.sections.map((section) => {
                                        const isInactive = section.status !== "ACTIVE";
                                        const hasCapacity = section.capacity !== null;
                                        const remaining = section.remainingCapacity;
                                        const percentUsed = hasCapacity && section.capacity! > 0 
                                            ? Math.min(100, Math.round((section.occupancy / section.capacity!) * 100))
                                            : null;

                                        return (
                                            <div 
                                                key={section.id} 
                                                className={`border rounded-xl p-4 transition-all ${
                                                    section.isFull 
                                                        ? "bg-slate-50/80 border-slate-200" 
                                                        : isInactive 
                                                        ? "bg-slate-100/50 border-slate-200 opacity-70"
                                                        : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="text-base font-bold text-slate-900">{section.name}</h3>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                                isInactive
                                                                    ? "bg-slate-200 text-slate-600"
                                                                    : section.isFull
                                                                    ? "bg-rose-100 text-rose-800"
                                                                    : "bg-emerald-100 text-emerald-800"
                                                            }`}>
                                                                {isInactive ? "Inactive" : section.isFull ? "Full" : "Available"}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                            <span>Homeroom:</span>
                                                            <strong className="text-slate-700 font-medium">
                                                                {section.homeroomTeacher 
                                                                    ? `${section.homeroomTeacher.firstName} ${section.homeroomTeacher.fatherName}` 
                                                                    : "Unassigned"}
                                                            </strong>
                                                        </p>
                                                    </div>

                                                    {/* Occupancy Badge */}
                                                    <div className="text-right">
                                                        <div className="text-sm font-bold text-slate-900">
                                                            {section.occupancy} 
                                                            <span className="text-xs text-slate-500 font-normal">
                                                                {hasCapacity ? ` / ${section.capacity}` : " enrolled"}
                                                            </span>
                                                        </div>
                                                        <span className={`text-[11px] font-medium ${
                                                            section.isFull 
                                                                ? "text-rose-600 font-semibold" 
                                                                : remaining !== null && remaining <= 3 
                                                                ? "text-amber-600 font-medium" 
                                                                : "text-emerald-700 font-medium"
                                                        }`}>
                                                            {section.isFull 
                                                                ? "No seats left" 
                                                                : remaining !== null 
                                                                ? `${remaining} seat${remaining === 1 ? "" : "s"} left` 
                                                                : "Open capacity"}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Visual Capacity Bar */}
                                                {hasCapacity && (
                                                    <div className="mt-3">
                                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all ${
                                                                    section.isFull 
                                                                        ? "bg-rose-500" 
                                                                        : (percentUsed || 0) >= 85 
                                                                        ? "bg-amber-500" 
                                                                        : "bg-[#4085b3]"
                                                                }`}
                                                                style={{ width: `${percentUsed}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openRoster(section.id)}
                                                        className="text-xs border-slate-300 hover:bg-slate-50 text-slate-700"
                                                        leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />}
                                                    >
                                                        View Roster ({section.occupancy})
                                                    </Button>

                                                    {/* Quick Place Selected Here */}
                                                    {selectedEnrollmentIds.length > 0 && !section.isFull && !isInactive && !isYearLocked && (
                                                        <Button
                                                            size="sm"
                                                            disabled={actionLoading || (remaining !== null && selectedEnrollmentIds.length > remaining)}
                                                            onClick={() => handleBulkAssign(section.id)}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium"
                                                        >
                                                            Place {selectedEnrollmentIds.length} Here
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            )}

            {/* MODAL 1: Section Roster Modal */}
            <Modal
                isOpen={Boolean(rosterModalSectionId)}
                onClose={() => {
                    setRosterModalSectionId(null);
                    setRosterData(null);
                }}
                title={rosterData ? `Classroom Roster — Section ${rosterData.section.name}` : "Classroom Roster"}
                maxWidth="xl"
            >
                {rosterLoading ? (
                    <LoadingState message="Generating official classroom roster..." />
                ) : !rosterData ? (
                    <EmptyState title="Roster Unavailable" message="Could not load classroom roster." />
                ) : (
                    (() => {
                        const sec = rosterData.section as any;
                        const sectionName = sec?.name || "";
                        const gradeName = sec?.gradeName || sec?.schoolGrade?.grade?.name || "Grade";
                        const yearName = sec?.academicYearName || sec?.schoolGrade?.academicYear?.name || "Academic Year";
                        const teacherName = sec?.homeroomTeacher?.name || (sec?.homeroomTeacher ? `${sec.homeroomTeacher.firstName || ""} ${sec.homeroomTeacher.fatherName || sec.homeroomTeacher.lastName || ""}`.trim() : "Unassigned");
                        const stats: any = rosterData.stats || (rosterData as any).statistics || {
                            totalStudents: 0,
                            maleStudents: 0,
                            femaleStudents: 0,
                            remainingCapacity: null
                        };
                        const rosterList: any[] = rosterData.roster || (rosterData as any).students || [];

                        return (
                            <div className="space-y-4 text-xs">
                                {/* Printable Header Info */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                                            <span>{gradeName} — Section {sectionName}</span>
                                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                                                {stats.totalStudents ?? stats.totalEnrolled ?? rosterList.length} Enrolled
                                            </span>
                                        </div>
                                        <p className="text-slate-500 mt-1">
                                            Academic Year: <strong className="text-slate-700">{yearName}</strong> • 
                                            Homeroom Teacher: <strong className="text-slate-700">{teacherName}</strong>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.print()}
                                            className="text-xs border-slate-300 hover:bg-slate-100"
                                            leftIcon={<Printer className="w-3.5 h-3.5" />}
                                        >
                                            Print Roster
                                        </Button>
                                    </div>
                                </div>

                                {/* Gender and Capacity breakdown stats */}
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    <div className="p-2.5 rounded-lg bg-slate-100 text-slate-800">
                                        <span className="block text-[10px] text-slate-500 uppercase font-bold">Total Roll</span>
                                        <span className="text-base font-bold">{stats.totalStudents ?? stats.totalEnrolled ?? rosterList.length}</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-100">
                                        <span className="block text-[10px] text-blue-600 uppercase font-bold">Male</span>
                                        <span className="text-base font-bold">{stats.maleStudents ?? stats.maleCount ?? 0}</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-100">
                                        <span className="block text-[10px] text-purple-600 uppercase font-bold">Female</span>
                                        <span className="text-base font-bold">{stats.femaleStudents ?? stats.femaleCount ?? 0}</span>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100">
                                        <span className="block text-[10px] text-emerald-600 uppercase font-bold">Seats Left</span>
                                        <span className="text-base font-bold">
                                            {(stats.remainingCapacity ?? stats.remainingSeats) !== null && (stats.remainingCapacity ?? stats.remainingSeats) !== undefined 
                                                ? (stats.remainingCapacity ?? stats.remainingSeats) 
                                                : "∞"}
                                        </span>
                                    </div>
                                </div>

                                {/* Roster Table */}
                                {rosterList.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        No students are currently placed in Section {sectionName}.
                                    </div>
                                ) : (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                                        <table className="w-full text-left border-collapse text-xs">
                                            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                                                <tr className="text-slate-600 font-semibold">
                                                    <th className="py-2 px-3 w-12 text-center">Roll</th>
                                                    <th className="py-2 px-3">Student Name</th>
                                                    <th className="py-2 px-3">Student ID</th>
                                                    <th className="py-2 px-3">Gender</th>
                                                    <th className="py-2 px-3">Intake</th>
                                                    <th className="py-2 px-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {rosterList.map((r, idx) => {
                                                    const studentObj = r.student || r;
                                                    const firstName = studentObj?.firstName || r.firstName || "";
                                                    const fatherName = studentObj?.fatherName || r.fatherName || "";
                                                    const grandfatherName = studentObj?.grandfatherName || r.grandfatherName || "";
                                                    const fullName = r.fullName || `${firstName} ${fatherName} ${grandfatherName}`.trim() || "Student";
                                                    const studentId = studentObj?.studentId || r.studentId || "—";
                                                    const gender = studentObj?.gender || r.gender || "—";

                                                    return (
                                                        <tr key={r.enrollmentId || idx} className="hover:bg-slate-50/60">
                                                            <td className="py-2 px-3 text-center font-bold text-slate-500">
                                                                {r.rollNumber || (idx + 1)}
                                                            </td>
                                                            <td className="py-2 px-3 font-semibold text-slate-900">
                                                                {fullName}
                                                            </td>
                                                            <td className="py-2 px-3 font-mono text-slate-600">
                                                                {studentId}
                                                            </td>
                                                            <td className="py-2 px-3">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                                                    gender === "FEMALE" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"
                                                                }`}>
                                                                    {gender}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-3 text-slate-500">
                                                                {r.enrollmentType}
                                                            </td>
                                                            <td className="py-2 px-3 text-right">
                                                                <div className="inline-flex items-center gap-1.5">
                                                                    <button
                                                                        onClick={() => openPlacementHistory(r.enrollmentId, fullName, studentId)}
                                                                        title="View placement history audit trail"
                                                                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                                                    >
                                                                        <Clock className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => openReassignModal(r, { id: sec.id, name: sectionName })}
                                                                        disabled={isYearLocked}
                                                                        title={isYearLocked ? "Academic year closed" : "Reassign to another section"}
                                                                        className="px-2 py-1 rounded text-[11px] font-medium text-[#4085b3] hover:bg-[#4085b3]/10 border border-[#4085b3]/30 disabled:opacity-50"
                                                                    >
                                                                        Reassign
                                                                    </button>
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
                        );
                    })()
                )}
            </Modal>

            {/* MODAL 2: Section Reassignment Modal */}
            <Modal
                isOpen={reassignModalOpen}
                onClose={() => {
                    setReassignModalOpen(false);
                    setReassignTarget(null);
                }}
                title="Intra-Grade Section Reassignment"
                maxWidth="md"
            >
                {reassignTarget && (
                    <form onSubmit={handleReassignSubmit} className="space-y-4 text-xs">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="block text-slate-500 text-[11px]">Student identity</span>
                            <div className="text-sm font-bold text-slate-900 mt-0.5">{reassignTarget.studentName}</div>
                            <div className="flex items-center gap-3 mt-1 text-slate-500">
                                <span>ID: <strong className="text-slate-700 font-mono">{reassignTarget.studentId}</strong></span>
                                <span>Current Section: <strong className="text-slate-800">{reassignTarget.currentSectionName}</strong></span>
                            </div>
                        </div>

                        {/* Target Section */}
                        <div className="space-y-1.5">
                            <label className="block font-semibold text-slate-700">
                                Target Section <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={reassignTargetSectionId}
                                onChange={(e) => setReassignTargetSectionId(e.target.value)}
                                required
                                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-[#4085b3]"
                            >
                                <option value="">Select target section in same grade...</option>
                                {workspace?.sections
                                    .filter(s => s.id !== reassignTarget.currentSectionId && s.status === "ACTIVE" && !s.isFull)
                                    .map(s => (
                                        <option key={s.id} value={s.id}>
                                            Section {s.name} ({s.remainingCapacity !== null ? `${s.remainingCapacity} seats left` : "Open capacity"})
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* Mandatory Reason */}
                        <div className="space-y-1.5">
                            <label className="block font-semibold text-slate-700">
                                Reason for Reassignment <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                value={reassignReason}
                                onChange={(e) => setReassignReason(e.target.value)}
                                placeholder="Explain why this student is moving sections (e.g., Parent request, classroom accommodation, administrative rebalancing)..."
                                required
                                rows={3}
                                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:border-[#4085b3] placeholder:text-slate-400"
                            />
                        </div>

                        {/* Architectural Preservation Note */}
                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-[11px] flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-[#4085b3] shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold">Historical Integrity Preserved:</span> Intra-grade section reassignment safely updates current placement in-place. All existing attendance records, assessments, and grade evaluations remain linked to the student&apos;s active enrollment ledger.
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setReassignModalOpen(false)}
                                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={actionLoading || !reassignTargetSectionId || !reassignReason.trim()}
                                className="bg-[#4085b3] hover:bg-[#32698e] text-white"
                            >
                                {actionLoading ? "Reassigning..." : "Confirm Reassignment"}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* MODAL 3: Placement History / Audit Trail Modal */}
            <Modal
                isOpen={historyModalOpen}
                onClose={() => {
                    setHistoryModalOpen(false);
                    setHistoryEnrollment(null);
                }}
                title="Placement Audit History"
                maxWidth="md"
            >
                {historyLoading ? (
                    <LoadingState message="Loading placement audit log..." />
                ) : !historyEnrollment ? (
                    <EmptyState title="No History" message="No placement history records found." />
                ) : (
                    <div className="space-y-4 text-xs">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                            <span className="block text-slate-500 text-[11px]">Student identity</span>
                            <div className="text-sm font-bold text-slate-900 mt-0.5">{historyEnrollment.studentName}</div>
                            <span className="font-mono text-slate-500 text-[11px]">{historyEnrollment.studentId}</span>
                        </div>

                        {historyEnrollment.records.length === 0 ? (
                            <p className="text-center text-slate-400 py-6">No placement mutations recorded for this enrollment yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {historyEnrollment.records.map((h, i) => {
                                    const isReassigned = h.action === "SECTION_REASSIGNED";
                                    const oldSec = (h.oldValue as any)?.sectionName || (h.oldValue as any)?.name;
                                    const newSec = (h.newValue as any)?.sectionName || (h.newValue as any)?.name;
                                    const reason = (h.newValue as any)?.reason || (h.details as any)?.reason;
                                    const operatorName = h.user?.name || h.user?.email || "School Administrator";

                                    return (
                                        <div key={h.id || i} className="p-3.5 border border-slate-200 rounded-lg space-y-2 bg-white shadow-xs">
                                            <div className="flex items-center justify-between">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    isReassigned 
                                                        ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                }`}>
                                                    {isReassigned ? "SECTION REASSIGNED" : "SECTION ASSIGNED"}
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    {new Date(h.createdAt).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-800">
                                                {isReassigned ? (
                                                    <div>
                                                        <div className="flex items-center gap-1.5 font-medium">
                                                            <span className="text-slate-400 line-through">Section {oldSec || "Previous"}</span>
                                                            <span className="text-slate-400">→</span>
                                                            <span className="font-bold text-slate-900">Section {newSec || "Target"}</span>
                                                        </div>
                                                        {reason && (
                                                            <p className="italic text-slate-600 mt-1.5 bg-slate-50 p-2 rounded border border-slate-100">
                                                                &quot;{reason}&quot;
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="font-medium">
                                                            Placed into <strong className="text-slate-900 font-bold">Section {newSec || "Assigned"}</strong>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-400 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                                                <span>Operator: <strong className="text-slate-600 font-medium">{operatorName}</strong></span>
                                                <span className="font-mono text-[10px]">
                                                    {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default function PlacementWorkspacePage() {
    return (
        <Suspense fallback={<LoadingState message="Loading placement workspace..." />}>
            <PlacementWorkspaceContent />
        </Suspense>
    );
}
