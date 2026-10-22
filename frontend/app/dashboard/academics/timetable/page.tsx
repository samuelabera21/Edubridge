"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { 
    Clock, Plus, Calendar, BookOpen, User, Home, Trash2, ShieldAlert, 
    Check, ClipboardList, GraduationCap, Settings, Building, AlertCircle, 
    CheckCircle2, RefreshCw, ChevronRight, ChevronDown, Lock, Unlock, Users, Info, CalendarOff
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

interface DayDef {
    value: number;
    label: string;
    shortLabel: string;
}

const ALL_DAYS: DayDef[] = [
    { value: 1, label: "Monday", shortLabel: "Mon" },
    { value: 2, label: "Tuesday", shortLabel: "Tue" },
    { value: 3, label: "Wednesday", shortLabel: "Wed" },
    { value: 4, label: "Thursday", shortLabel: "Thu" },
    { value: 5, label: "Friday", shortLabel: "Fri" },
    { value: 6, label: "Saturday", shortLabel: "Sat" },
    { value: 7, label: "Sunday", shortLabel: "Sun" }
];

export default function TimetablePage() {
    const { authData } = useAuth();
    const [activeTab, setActiveTab] = useState<"workspace" | "teacherView" | "periods" | "config" | "rooms">("workspace");

    // Academic Years
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");

    // Workspace Data
    const [workspace, setWorkspace] = useState<any>(null);
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");

    // Loading & Action states
    const [loading, setLoading] = useState(true);
    const [workspaceLoading, setWorkspaceLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [conflictError, setConflictError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Modals
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedSlotTarget, setSelectedSlotTarget] = useState<{ dayOfWeek: number; periodId: string; periodName: string } | null>(null);
    const [selectedTeachingAssignmentId, setSelectedTeachingAssignmentId] = useState<string>("");
    const [selectedRoomId, setSelectedRoomId] = useState<string>("");
    const [customDayOfWeek, setCustomDayOfWeek] = useState<number>(1);
    const [customPeriodId, setCustomPeriodId] = useState<string>("");

    // Reassignment Modal
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignSlotTarget, setReassignSlotTarget] = useState<any>(null);
    const [reassignAssignmentId, setReassignAssignmentId] = useState<string>("");
    const [reassignReason, setReassignReason] = useState<string>("");

    // Deletion confirmation Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Publication Modal
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

    // Rooms list for optional allocation
    const [rooms, setRooms] = useState<any[]>([]);

    // Secondary Teacher View states
    const [teachers, setTeachers] = useState<any[]>([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
    const [teacherTimetable, setTeacherTimetable] = useState<any[]>([]);
    const [teacherLoading, setTeacherLoading] = useState(false);

    // Period Management Form states
    const [periods, setPeriods] = useState<any[]>([]);
    const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
    const [newPeriod, setNewPeriod] = useState({ name: "", startTime: "", endTime: "", isBreak: false });
    const [showHolidays, setShowHolidays] = useState(false);

    // Schedule Config states
    const [scheduleConfig, setScheduleConfig] = useState({
        operatingDays: [1, 2, 3, 4, 5],
        startTime: "08:00",
        periodDuration: 40,
        periodsPerDay: 6,
        breakDuration: 20,
        breakAfter: 2,
        lunchDuration: 50,
        lunchAfter: 4,
        shift: "FULL"
    });

    // 1. Initial Load: Academic Years & Secondary data
    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            setErrorMessage(null);

            // Academic Years
            const yearsRes = await fetchApi("/vice-principal/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData = await yearsRes.json();
            setAcademicYears(yearsData);

            const active = yearsData.find((y: any) => y.status === "ACTIVE") || yearsData[0];
            if (active) {
                setSelectedYearId(active.id);
            }

            // Rooms (optional)
            const roomsRes = await fetchApi("/vice-principal/academic/rooms");
            if (roomsRes.ok) {
                const roomsData = await roomsRes.json();
                setRooms(roomsData);
            }

            // Teachers (for master teacher timetable tab)
            const teachersRes = await fetchApi("/vice-principal/teachers");
            if (teachersRes.ok) {
                const teachersData = await teachersRes.json();
                setTeachers(teachersData);
                if (teachersData.length > 0) {
                    setSelectedTeacherId(teachersData[0].id);
                }
            }
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to initialize timetable workspace");
        } finally {
            setLoading(false);
        }
    };

    // 2. Load Workspace when Academic Year, Grade, or Section changes
    useEffect(() => {
        if (!selectedYearId) return;
        loadWorkspace(selectedYearId, selectedGradeId, selectedSectionId);
    }, [selectedYearId, selectedGradeId, selectedSectionId]);

    const loadWorkspace = async (yearId: string, gradeId?: string, sectionId?: string) => {
        try {
            setWorkspaceLoading(true);
            setConflictError(null);

            let url = `/timetable/workspace?academicYearId=${yearId}`;
            if (gradeId) url += `&schoolGradeId=${gradeId}`;
            if (sectionId) url += `&sectionId=${sectionId}`;

            const res = await fetchApi(url);
            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.error || "Failed to load timetable workspace");
            }

            const data = await res.json();
            setWorkspace(data);

            // Synchronize selections
            if (data.selectedGrade && data.selectedGrade.id !== selectedGradeId) {
                setSelectedGradeId(data.selectedGrade.id);
            }
            if (data.selectedSection && data.selectedSection.id !== selectedSectionId) {
                setSelectedSectionId(data.selectedSection.id);
            }

            // Also keep periods in state for other tabs
            if (data.periods) {
                setPeriods(data.periods);
            }
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message || "Error fetching section workspace");
        } finally {
            setWorkspaceLoading(false);
        }
    };

    // 3. Quick grade switch handler
    const handleGradeSelect = (gradeId: string) => {
        setSelectedGradeId(gradeId);
        // Find first section of this grade if present
        const gradeObj = workspace?.schoolGrades?.find((g: any) => g.id === gradeId);
        if (gradeObj && gradeObj.sections && gradeObj.sections.length > 0) {
            setSelectedSectionId(gradeObj.sections[0].id);
        } else {
            setSelectedSectionId("");
        }
    };

    // 4. Quick section switch handler
    const handleSectionSelect = (secId: string) => {
        setSelectedSectionId(secId);
    };

    // 5. Assign slot action
    const handleAssignSlot = async () => {
        if (!selectedTeachingAssignmentId || !selectedYearId) return;

        const dayOfWeek = selectedSlotTarget ? selectedSlotTarget.dayOfWeek : customDayOfWeek;
        const classPeriodId = selectedSlotTarget ? selectedSlotTarget.periodId : customPeriodId;

        if (!dayOfWeek || !classPeriodId) {
            setConflictError("Please select both a day and an instructional class period.");
            return;
        }

        try {
            setActionLoading(true);
            setConflictError(null);

            const payload: any = {
                academicYearId: selectedYearId,
                teachingAssignmentId: selectedTeachingAssignmentId,
                classPeriodId,
                dayOfWeek
            };
            if (selectedRoomId) {
                payload.roomId = selectedRoomId;
            }

            const res = await fetchApi("/timetable/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to schedule slot");
            }

            setIsAssignModalOpen(false);
            setSelectedSlotTarget(null);
            setSelectedTeachingAssignmentId("");
            setSelectedRoomId("");
            setSuccessMessage("Instructional period scheduled successfully.");
            setTimeout(() => setSuccessMessage(null), 4000);

            // Reload workspace to refresh grid and counts
            await loadWorkspace(selectedYearId, selectedGradeId, selectedSectionId);
        } catch (err: any) {
            setConflictError(err.message || "Conflict occurred while assigning period.");
        } finally {
            setActionLoading(false);
        }
    };

    // 5b. Auto-generate standard Ethiopian class periods
    const handleGenerateDefaultPeriods = async () => {
        try {
            setActionLoading(true);
            setConflictError(null);
            const res = await fetchApi("/timetable/periods/default", {
                method: "POST"
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to generate default periods");
            }
            setSuccessMessage("Standard Ethiopian class periods (Periods 1-7 + Breaks) generated successfully!");
            setTimeout(() => setSuccessMessage(null), 4000);
            await loadWorkspace(selectedYearId, selectedGradeId, selectedSectionId);
        } catch (err: any) {
            setConflictError(err.message || "Failed to generate class periods");
        } finally {
            setActionLoading(false);
        }
    };

    // 6. Delete slot action
    const handleDeleteSlot = async () => {
        if (!deleteTargetId) return;

        try {
            setActionLoading(true);
            setConflictError(null);

            const res = await fetchApi(`/timetable/slots/${deleteTargetId}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to remove slot");
            }

            setIsDeleteModalOpen(false);
            setDeleteTargetId(null);
            setSuccessMessage("Lesson removed from timetable.");
            setTimeout(() => setSuccessMessage(null), 4000);

            await loadWorkspace(selectedYearId, selectedGradeId, selectedSectionId);
        } catch (err: any) {
            setConflictError(err.message || "Failed to delete slot");
        } finally {
            setActionLoading(false);
        }
    };

    // 6b. Delete class period action
    const handleDeletePeriod = async (periodId: string, periodName: string) => {
        if (!confirm(`Are you sure you want to delete period "${periodName}"? This is only allowed if no lessons are scheduled in this period.`)) {
            return;
        }

        try {
            setActionLoading(true);
            setConflictError(null);
            const res = await fetchApi(`/timetable/periods/${periodId}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || data.message || "Failed to delete period");
            }
            setSuccessMessage(`Period "${periodName}" deleted successfully.`);
            setTimeout(() => setSuccessMessage(null), 3000);
            await loadWorkspace(selectedYearId, selectedGradeId, selectedSectionId);
        } catch (err: any) {
            setConflictError(err.message || "Failed to delete period");
        } finally {
            setActionLoading(false);
        }
    };

    // 7. Reassign slot action
    const handleReassignSlot = async () => {
        if (!reassignSlotTarget || !reassignAssignmentId) return;

        try {
            setActionLoading(true);
            setConflictError(null);

            const res = await fetchApi("/timetable/reassign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    timetableId: reassignSlotTarget.id,
                    newTeachingAssignmentId: reassignAssignmentId,
                    reason: reassignReason.trim() || undefined
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to reassign slot");
            }

            setIsReassignModalOpen(false);
            setReassignSlotTarget(null);
            setReassignAssignmentId("");
            setReassignReason("");
            setSuccessMessage("Timetable slot successfully reassigned.");
            setTimeout(() => setSuccessMessage(null), 4000);

            await loadWorkspace(selectedYearId, selectedGradeId, selectedSectionId);
        } catch (err: any) {
            setConflictError(err.message || "Conflict occurred during slot reassignment.");
        } finally {
            setActionLoading(false);
        }
    };

    // 8. Publish / Unpublish action
    const handleTogglePublish = async () => {
        if (!selectedYearId || !workspace) return;

        try {
            setActionLoading(true);
            const isCurrentlyPublished = workspace.status === "PUBLISHED";
            const endpoint = isCurrentlyPublished ? "/timetable/unpublish" : "/timetable/publish";

            const res = await fetchApi(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ academicYearId: selectedYearId })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to update publication status");
            }

            setIsPublishModalOpen(false);
            setSuccessMessage(
                isCurrentlyPublished 
                    ? "Timetable returned to Draft mode. Students and Teachers cannot view unfinalized drafts."
                    : "Timetable officially Published! Live schedules are now accessible to Students and Teachers."
            );
            setTimeout(() => setSuccessMessage(null), 5000);

            await loadWorkspace(selectedYearId, selectedGradeId, selectedSectionId);
        } catch (err: any) {
            setConflictError(err.message || "Failed to toggle publication status");
        } finally {
            setActionLoading(false);
        }
    };

    // 9. Load Teacher Timetable (for Teacher Master View tab)
    const loadTeacherTimetable = async (teacherId: string) => {
        if (!teacherId) return;
        try {
            setTeacherLoading(true);
            const res = await fetchApi(`/timetable/teacher/${teacherId}`);
            if (res.ok) {
                const data = await res.json();
                setTeacherTimetable(data);
            }
        } catch (err) {
            console.error("Failed to load teacher timetable", err);
        } finally {
            setTeacherLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "teacherView" && selectedTeacherId) {
            loadTeacherTimetable(selectedTeacherId);
        }
    }, [activeTab, selectedTeacherId]);

    // Active operating days filter
    const operatingDaysList: DayDef[] = useMemo(() => {
        const opDays: number[] = workspace?.operatingDays || [1, 2, 3, 4, 5];
        return ALL_DAYS.filter(d => opDays.includes(d.value));
    }, [workspace?.operatingDays]);

    // Fast timetable slot lookup: Map<"dayOfWeek-periodId", Entry>
    const timetableGridMap = useMemo(() => {
        const map = new Map<string, any>();
        if (!workspace?.sectionTimetable) return map;
        for (const entry of workspace.sectionTimetable) {
            map.set(`${entry.dayOfWeek}-${entry.classPeriodId}`, entry);
        }
        return map;
    }, [workspace?.sectionTimetable]);

    // Check if a day has academic calendar closed day notes
    const closedDayEvents = useMemo(() => {
        return workspace?.closedEvents || [];
    }, [workspace?.closedEvents]);

    // Filter available teaching assignments for scheduling modal
    const availableTeachingAssignments = useMemo(() => {
        if (!workspace?.teachingAssignments) return [];
        const targetDay = selectedSlotTarget ? selectedSlotTarget.dayOfWeek : customDayOfWeek;

        // Find subject IDs already scheduled on this target day for this section
        const scheduledSubjectIdsOnDay = new Set(
            workspace.sectionTimetable
                ?.filter((s: any) => s.dayOfWeek === targetDay)
                ?.map((s: any) => s.teachingAssignment?.subjectId || s.teachingAssignment?.subject?.id)
                ?.filter(Boolean) || []
        );

        return workspace.teachingAssignments.filter((ta: any) => {
            // 1. If required weekly periods are completely fulfilled, exclude from list
            if (ta.remainingPeriods <= 0 || ta.isComplete || (ta.scheduledPeriods !== undefined && ta.scheduledPeriods >= ta.requiredPeriods)) {
                return false;
            }

            // 2. If this subject is already scheduled on this day for this section, exclude from list
            const subId = ta.subjectId || ta.subject?.id;
            if (targetDay && subId && scheduledSubjectIdsOnDay.has(subId)) {
                return false;
            }

            return true;
        });
    }, [workspace?.teachingAssignments, workspace?.sectionTimetable, selectedSlotTarget, customDayOfWeek]);

    // Auto-reset selected assignment if it is no longer valid for the selected target day
    useEffect(() => {
        if (selectedTeachingAssignmentId) {
            const exists = availableTeachingAssignments.some((ta: any) => ta.id === selectedTeachingAssignmentId);
            if (!exists) {
                setSelectedTeachingAssignmentId("");
            }
        }
    }, [availableTeachingAssignments, selectedTeachingAssignmentId]);

    if (loading) {
        return <LoadingState message="Initializing Timetable & Scheduling Workspace..." />;
    }

    if (errorMessage && !workspace) {
        return <ErrorState message={errorMessage} onRetry={loadInitialData} />;
    }

    const isYearLocked = workspace?.isYearLocked;
    const isPublished = workspace?.status === "PUBLISHED";
    const selectedSection = workspace?.selectedSection;
    const selectedGrade = workspace?.selectedGrade;

    return (
        <div className="space-y-6 pb-12">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-2 text-xs text-slate-500">
                <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/academics/years" className="hover:text-slate-900 transition-colors">Academics</Link>
                <span>/</span>
                <span className="text-slate-900 font-medium">Timetable</span>
            </div>

            {/* Header: Clean Government Style */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            Instructional Timetable
                        </h1>
                        {isPublished ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Published
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3.5 h-3.5 text-amber-600" /> Draft
                            </span>
                        )}
                        {isYearLocked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <Lock className="w-3 h-3 text-slate-500" /> Year Locked
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Weekly classroom schedule, subject allocations, and teacher master timetable.
                    </p>
                </div>

                {/* Right controls: Academic Year selector & Publish button */}
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded px-3 py-1.5 shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-medium text-slate-500">Year:</span>
                        <select
                            value={selectedYearId}
                            onChange={(e) => setSelectedYearId(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-hidden cursor-pointer"
                        >
                            {academicYears.map((yr) => (
                                <option key={yr.id} value={yr.id}>
                                    {yr.name} {yr.status === "ACTIVE" ? "(Active)" : `(${yr.status})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {!isYearLocked && (
                        <button
                            onClick={() => setIsPublishModalOpen(true)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                                isPublished
                                    ? "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                                    : "bg-[#4085b3] text-white hover:bg-[#32698e]"
                            }`}
                        >
                            {isPublished ? (
                                <>
                                    <Unlock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Revert to Draft</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Publish Timetable</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* 4 KPI Metric Cards: Left-to-right clean blue hover fill */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Curriculum Demand */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Curriculum Demand
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {workspace?.coverage?.totalRequired ?? 0} <span className="text-xs font-normal text-slate-400 group-hover:text-blue-100">Periods</span>
                        </span>
                    </div>
                    <BookOpen className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* 2. Scheduled Lessons */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Scheduled Lessons
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {workspace?.coverage?.totalScheduled ?? 0} <span className="text-xs font-normal text-slate-400 group-hover:text-blue-100">Slots</span>
                        </span>
                    </div>
                    <Calendar className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* 3. Remaining Deficit */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Remaining Deficit
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {workspace?.coverage?.totalRemaining ?? 0} <span className="text-xs font-normal text-slate-400 group-hover:text-blue-100">Periods</span>
                        </span>
                    </div>
                    <Clock className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* 4. Schedule Coverage */}
                <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group cursor-pointer shadow-2xs hover:border-[#4085b3] transition-all duration-300">
                    <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />
                    <div className="relative z-10">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                            Schedule Coverage
                        </span>
                        <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                            {workspace?.coverage?.coveragePercentage ?? 0}%
                        </span>
                    </div>
                    <CheckCircle2 className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-6 text-xs font-medium">
                <button
                    onClick={() => setActiveTab("workspace")}
                    className={`pb-2.5 transition-colors flex items-center gap-1.5 border-b-2 -mb-px cursor-pointer ${
                        activeTab === "workspace"
                            ? "border-[#4085b3] text-[#4085b3] font-semibold"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <GraduationCap className="w-4 h-4" />
                    <span>Section Schedule</span>
                </button>
                <button
                    onClick={() => setActiveTab("teacherView")}
                    className={`pb-2.5 transition-colors flex items-center gap-1.5 border-b-2 -mb-px cursor-pointer ${
                        activeTab === "teacherView"
                            ? "border-[#4085b3] text-[#4085b3] font-semibold"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <User className="w-4 h-4" />
                    <span>Teacher Master Schedule</span>
                </button>
                <button
                    onClick={() => setActiveTab("periods")}
                    className={`pb-2.5 transition-colors flex items-center gap-1.5 border-b-2 -mb-px cursor-pointer ${
                        activeTab === "periods"
                            ? "border-[#4085b3] text-[#4085b3] font-semibold"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Class Periods & Recess</span>
                </button>
            </div>

            {/* Notification Alerts */}
            {successMessage && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="font-medium">{successMessage}</p>
                </div>
            )}

            {conflictError && (
                <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs animate-in fade-in duration-200">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-red-900">Scheduling Conflict Rejection</h4>
                        <p className="mt-0.5 text-red-700 leading-relaxed">{conflictError}</p>
                    </div>
                </div>
            )}

            {/* Academic Calendar Notice: Clean Collapsible Bar */}
            {closedDayEvents.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarOff className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>
                                <strong className="font-semibold text-slate-900">Academic Calendar:</strong>{" "}
                                {closedDayEvents.length} official school closures &amp; holidays registered for this academic year.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowHolidays(!showHolidays)}
                            className="text-[#4085b3] hover:text-[#356f96] font-medium flex items-center gap-1 cursor-pointer transition-colors ml-2"
                        >
                            <span>{showHolidays ? "Hide dates" : `View dates (${closedDayEvents.length})`}</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHolidays ? "rotate-180" : ""}`} />
                        </button>
                    </div>

                    {showHolidays && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {closedDayEvents.map((ev: any) => (
                                <div key={ev.id} className="flex items-center justify-between bg-white border border-slate-200 px-2.5 py-1.5 rounded text-slate-800 text-[11px]">
                                    <span className="font-medium truncate mr-2">{ev.title}</span>
                                    <span className="text-slate-500 font-mono text-[10px] shrink-0">
                                        {new Date(ev.startDate).toISOString().slice(0, 10)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 1: SECTION SCHEDULING WORKSPACE */}
            {activeTab === "workspace" && (
                <div className="space-y-4">
                    {/* Unified Grade & Section Toolbar Sitting Directly on Canvas */}
                    <div className="space-y-2.5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Grade:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {workspace?.schoolGrades?.map((sg: any) => (
                                        <button
                                            key={sg.id}
                                            onClick={() => handleGradeSelect(sg.id)}
                                            className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                                                selectedGradeId === sg.id
                                                    ? "bg-[#4085b3] text-white shadow-2xs"
                                                    : "bg-white border border-slate-200 text-slate-700 hover:border-[#4085b3] hover:text-[#4085b3]"
                                            }`}
                                        >
                                            {sg.grade.name}
                                        </button>
                                    ))}
                                </div>

                                {selectedGrade && (
                                    <>
                                        <span className="text-slate-300 text-xs hidden sm:inline">&bull;</span>
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            Section:
                                        </span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {workspace?.schoolGrades
                                                ?.find((g: any) => g.id === selectedGradeId)
                                                ?.sections?.map((sec: any) => (
                                                    <button
                                                        key={sec.id}
                                                        onClick={() => handleSectionSelect(sec.id)}
                                                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                                                            selectedSectionId === sec.id
                                                                ? "bg-[#4085b3] text-white shadow-2xs"
                                                                : "bg-white border border-slate-200 text-slate-700 hover:border-[#4085b3] hover:text-[#4085b3]"
                                                        }`}
                                                    >
                                                        Section {sec.name}
                                                    </button>
                                                ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Section Enrollment info */}
                            {selectedSection && (
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 sm:ml-auto shrink-0 bg-white border border-slate-200 px-3 py-1 rounded shadow-2xs">
                                    <Users className="w-3.5 h-3.5 text-[#4085b3]" />
                                    <span>
                                        Section {selectedSection.name}: <strong className="text-slate-900">{selectedSection.enrolledStudentsCount || 0}</strong> students
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Workspace Split Layout: Left Assignment Pool, Right Timetable Grid */}
                    {workspaceLoading ? (
                        <div className="py-16 text-center">
                            <LoadingState message="Loading Section Timetable Grid..." />
                        </div>
                    ) : !selectedSection ? (
                        <EmptyState
                            title="No Section Selected"
                            message="Select an active Grade and Section above to open its instructional scheduling workspace."
                        />
                    ) : (
                        <div className="space-y-4">
                            {/* TOP: Subject Allocations & Demand Pool */}
                            <div className="border border-slate-200 bg-white rounded overflow-hidden shadow-2xs">
                                <div className="py-2.5 px-4 bg-gray-50/75 border-b border-gray-200 flex flex-row items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                            Subject Allocations & Demand
                                        </h3>
                                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                                            &bull; Weekly instructional quota for Section {selectedSection.name}
                                        </span>
                                    </div>
                                    <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">
                                        {workspace.teachingAssignments?.length || 0} {workspace.teachingAssignments?.length === 1 ? "subject" : "subjects"}
                                    </span>
                                </div>
                                <div className="p-3">
                                    {workspace.teachingAssignments?.length === 0 ? (
                                        <div className="p-6 text-center text-xs text-slate-400">
                                            No teaching assignments allocated for Section {selectedSection.name}.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-2.5">
                                            {workspace.teachingAssignments?.map((ta: any) => {
                                                const isDone = ta.isComplete;
                                                return (
                                                    <div
                                                        key={ta.id}
                                                        className={`p-2.5 rounded border transition-all flex flex-col justify-between ${
                                                            isDone
                                                                ? "bg-slate-50/70 border-slate-200"
                                                                : "bg-white border-slate-200 hover:border-[#4085b3] shadow-2xs"
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="flex items-start justify-between gap-1">
                                                                <span className="text-xs font-bold text-slate-900 truncate" title={ta.subject.name}>
                                                                    {ta.subject.name}
                                                                </span>
                                                                {isDone ? (
                                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                                                        <Check className="w-2.5 h-2.5" /> Done
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                                                        {ta.remainingPeriods} left
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate" title={`${ta.teacher.firstName} ${ta.teacher.lastName}`}>
                                                                <User className="w-3 h-3 text-slate-400 shrink-0" />
                                                                <span className="truncate">{ta.teacher.firstName} {ta.teacher.lastName}</span>
                                                            </p>

                                                            {/* Progress bar */}
                                                            <div className="mt-2">
                                                                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                                                                    <span>Allocated: <strong>{ta.scheduledPeriods}</strong>/{ta.requiredPeriods}</span>
                                                                    <span>{Math.round((ta.scheduledPeriods / (ta.requiredPeriods || 1)) * 100)}%</span>
                                                                </div>
                                                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all rounded-full ${
                                                                            isDone ? "bg-emerald-500" : "bg-[#4085b3]"
                                                                        }`}
                                                                        style={{ width: `${Math.min(100, (ta.scheduledPeriods / (ta.requiredPeriods || 1)) * 100)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {!isDone && !isYearLocked && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedTeachingAssignmentId(ta.id);
                                                                    setSelectedSlotTarget(null);
                                                                    setIsAssignModalOpen(true);
                                                                }}
                                                                className="mt-2 w-full py-1 px-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 hover:text-[#4085b3] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors border border-slate-200 hover:border-[#4085b3] cursor-pointer shadow-2xs"
                                                            >
                                                                <Plus className="w-3 h-3 text-[#4085b3]" />
                                                                <span>Schedule</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BOTTOM: Full-Width Weekly Timetable Grid */}
                            <div className="border border-slate-200 bg-white rounded overflow-hidden shadow-2xs">
                                <div className="py-2.5 px-4 bg-gray-50/75 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                            Weekly Schedule: Section {selectedSection.name}
                                        </h3>
                                        <p className="text-[11px] text-slate-500">
                                            {selectedGrade?.grade?.name} timetable grid
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isYearLocked && (
                                            <>
                                                <button
                                                    onClick={() => setIsPeriodModalOpen(true)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Add Period</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedSlotTarget(null);
                                                        setSelectedTeachingAssignmentId("");
                                                        setConflictError(null);
                                                        setIsAssignModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#4085b3] hover:bg-[#32698e] text-white transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Schedule Lesson</span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full table-fixed border-collapse text-left text-xs">
                                        <thead>
                                            <tr className="bg-gray-50/75 border-b border-gray-200">
                                                <th className="py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-20 text-center border-r border-slate-200">
                                                    Period
                                                </th>
                                                {operatingDaysList.map((d) => (
                                                    <th key={d.value} className="py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 text-center border-r border-slate-200 last:border-r-0">
                                                        <div>{d.label}</div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {workspace.periods?.length === 0 ? (
                                                <tr>
                                                    <td colSpan={operatingDaysList.length + 1} className="py-12 px-6 text-center">
                                                        <div className="max-w-md mx-auto space-y-3">
                                                            <Calendar className="w-10 h-10 text-[#4085b3] mx-auto opacity-75" />
                                                            <h4 className="text-sm font-bold text-slate-800">No Instructional Periods Configured</h4>
                                                            <p className="text-xs text-slate-500 leading-relaxed">
                                                                This school has no periods configured yet. Start by adding periods (e.g. P1, P2, P3, Break) or seed the standard Ethiopian periods:
                                                            </p>
                                                            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                                                <button
                                                                    onClick={() => setIsPeriodModalOpen(true)}
                                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#4085b3] hover:bg-[#32698e] text-white transition-colors shadow-2xs cursor-pointer"
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                    <span>+ Add Period</span>
                                                                </button>
                                                                <button
                                                                    onClick={handleGenerateDefaultPeriods}
                                                                    disabled={actionLoading}
                                                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                                                                >
                                                                    <span>⚡ Standard Ethiopian Periods (P1–P7)</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                workspace.periods?.map((period: any) => {
                                                    const isBreak = period.isBreak;
                                                    const match = period.name.match(/\d+/);
                                                    const periodCode = match ? `P${match[0]}` : period.name;

                                                    if (isBreak) {
                                                        return (
                                                            <tr key={period.id} className="bg-amber-50/50 border-y border-amber-200/50">
                                                                <td className="py-2 px-2 text-center border-r border-amber-200/50 bg-amber-50 w-20">
                                                                    <div className="flex items-center justify-center gap-1 group/p">
                                                                        <span className="font-bold text-xs text-amber-900 font-mono">{periodCode || "Break"}</span>
                                                                        {!isYearLocked && (
                                                                            <button
                                                                                onClick={() => handleDeletePeriod(period.id, periodCode || "Break")}
                                                                                className="opacity-0 group-hover/p:opacity-100 p-0.5 text-amber-600 hover:text-red-500 rounded transition-all cursor-pointer"
                                                                                title="Delete break period"
                                                                            >
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td
                                                                    colSpan={operatingDaysList.length}
                                                                    className="py-2 text-center text-xs font-semibold text-amber-800 tracking-wider uppercase bg-amber-50/40"
                                                                >
                                                                    ☕ Recess / Non-Instructional Break
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return (
                                                        <tr key={period.id} className="hover:bg-slate-50/30 transition-colors">
                                                            {/* Period Label with Hover Delete */}
                                                            <td className="py-2.5 px-2 text-center border-r border-slate-200 bg-slate-50/60 w-20">
                                                                <div className="flex items-center justify-center gap-1 group/p">
                                                                    <span className="font-bold text-xs text-slate-800 font-mono">{periodCode}</span>
                                                                    {!isYearLocked && (
                                                                        <button
                                                                            onClick={() => handleDeletePeriod(period.id, periodCode)}
                                                                            className="opacity-0 group-hover/p:opacity-100 p-0.5 text-slate-400 hover:text-red-500 rounded transition-all cursor-pointer"
                                                                            title={`Delete period ${periodCode}`}
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Day Cells */}
                                                            {operatingDaysList.map((day) => {
                                                                const cellKey = `${day.value}-${period.id}`;
                                                                const slot = timetableGridMap.get(cellKey);

                                                                return (
                                                                    <td
                                                                        key={day.value}
                                                                        className="py-1.5 px-1.5 border-r border-slate-200 last:border-r-0 align-top h-20"
                                                                    >
                                                                        {slot ? (
                                                                            <div className="relative group p-2 rounded bg-white text-slate-900 shadow-2xs border border-slate-200 hover:border-[#4085b3] border-l-4 border-l-[#4085b3] flex flex-col justify-between h-full min-h-[72px] transition-all">
                                                                                <div>
                                                                                    <div className="flex items-start justify-between gap-1">
                                                                                        <span className="text-xs font-bold leading-tight line-clamp-1 text-slate-900" title={slot.teachingAssignment.subject.name}>
                                                                                            {slot.teachingAssignment.subject.name}
                                                                                        </span>
                                                                                        {!isYearLocked && (
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setDeleteTargetId(slot.id);
                                                                                                    setIsDeleteModalOpen(true);
                                                                                                }}
                                                                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-600 rounded transition-opacity shrink-0 cursor-pointer"
                                                                                                title="Remove lesson"
                                                                                            >
                                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1 line-clamp-1">
                                                                                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                                                                                        <span className="truncate">
                                                                                            {slot.teachingAssignment.teacher.firstName} {slot.teachingAssignment.teacher.lastName}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                {!isYearLocked && (
                                                                                    <div className="flex items-center justify-end mt-1 pt-1 border-t border-slate-100">
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setReassignSlotTarget(slot);
                                                                                                setReassignAssignmentId(slot.teachingAssignmentId);
                                                                                                setIsReassignModalOpen(true);
                                                                                            }}
                                                                                            className="text-[10px] text-[#4085b3] hover:underline font-medium cursor-pointer"
                                                                                        >
                                                                                            Switch
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            !isYearLocked && (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setSelectedSlotTarget({
                                                                                            dayOfWeek: day.value,
                                                                                            periodId: period.id,
                                                                                            periodName: periodCode
                                                                                        });
                                                                                        setSelectedTeachingAssignmentId("");
                                                                                        setConflictError(null);
                                                                                        setIsAssignModalOpen(true);
                                                                                    }}
                                                                                    className="w-full h-full min-h-[72px] rounded border border-dashed border-slate-200 hover:border-[#4085b3] hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-[#4085b3] group p-1.5 cursor-pointer"
                                                                                    title={`Schedule lesson on ${day.label} ${periodCode}`}
                                                                                >
                                                                                    <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-[#4085b3]" />
                                                                                    <span className="text-[10px] font-medium text-slate-400 group-hover:text-[#4085b3] mt-0.5">
                                                                                        Assign
                                                                                    </span>
                                                                                </button>
                                                                            )
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                }))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: TEACHER MASTER SCHEDULE VIEW */}
            {activeTab === "teacherView" && (
                <div className="space-y-4">
                    {/* Toolbar Directly on Canvas */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Teacher Consolidated Timetable
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Inspect a teacher&apos;s full instructional schedule across all grades and sections.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600">Select Teacher:</label>
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="px-3 py-1.5 rounded border border-slate-300 text-xs font-semibold bg-white text-slate-800 hover:border-[#4085b3] focus:ring-1 focus:ring-[#4085b3] focus:outline-hidden cursor-pointer shadow-2xs transition-colors"
                            >
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.firstName} {t.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {teacherLoading ? (
                        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded">
                            <LoadingState message="Loading Teacher Schedule..." />
                        </div>
                    ) : (
                        <div className="border border-slate-200 bg-white rounded overflow-hidden shadow-2xs">
                            <div className="py-2.5 px-4 bg-gray-50/75 border-b border-gray-200">
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                    Weekly Workload: {teachers.find(t => t.id === selectedTeacherId)?.firstName} {teachers.find(t => t.id === selectedTeacherId)?.lastName}
                                </h4>
                            </div>
                            <div className="p-0 overflow-x-auto">
                                <table className="w-full table-fixed border-collapse text-left text-xs">
                                    <thead>
                                        <tr className="bg-gray-50/75 border-b border-gray-200">
                                            <th className="py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-20 text-center border-r border-slate-200">
                                                Period
                                            </th>
                                            {operatingDaysList.map((d) => (
                                                <th key={d.value} className="py-2.5 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-700 text-center border-r border-slate-200 last:border-r-0">
                                                    {d.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {periods.map((period) => {
                                            if (period.isBreak) {
                                                return (
                                                    <tr key={period.id} className="bg-amber-50/50 border-y border-amber-200/50">
                                                        <td className="py-2 px-2 text-xs font-semibold text-center text-amber-900 font-mono border-r border-amber-200/60 w-20 bg-amber-50">
                                                            {period.name.match(/\d+/) ? `P${period.name.match(/\d+/)[0]}` : period.name}
                                                        </td>
                                                        <td colSpan={operatingDaysList.length} className="py-2 text-center text-xs font-semibold text-amber-800 uppercase tracking-wider bg-amber-50/40">
                                                            ☕ Recess / Non-Instructional Break
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={period.id} className="hover:bg-slate-50/30 transition-colors">
                                                    <td className="py-2.5 px-2 text-center font-bold text-xs text-slate-800 font-mono border-r border-slate-200 bg-slate-50/60 w-20">
                                                        {period.name.match(/\d+/) ? `P${period.name.match(/\d+/)[0]}` : period.name}
                                                    </td>
                                                    {operatingDaysList.map((day) => {
                                                        const slot = teacherTimetable.find(
                                                            (s: any) => s.dayOfWeek === day.value && s.classPeriodId === period.id
                                                        );

                                                        return (
                                                            <td key={day.value} className="py-1.5 px-1.5 border-r border-slate-200 last:border-r-0 h-20 align-top">
                                                                {slot ? (
                                                                    <div className="p-2 rounded bg-white border border-slate-200 border-l-4 border-l-[#4085b3] text-slate-900 text-xs flex flex-col justify-between h-full shadow-2xs">
                                                                        <div className="font-bold line-clamp-1" title={slot.teachingAssignment?.subject?.name}>
                                                                            {slot.teachingAssignment?.subject?.name}
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500 mt-1">
                                                                            {slot.teachingAssignment?.schoolGrade?.grade?.name} - Sec {slot.teachingAssignment?.section?.name}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-full rounded bg-slate-50/40 border border-dashed border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                                                        Free
                                                                    </div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: CLASS PERIODS & RECESS */}
            {activeTab === "periods" && (
                <div className="space-y-4">
                    {/* Toolbar Directly on Canvas */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Class Periods & Recess Settings
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Define instructional periods and breaks observed across all section timetables.
                            </p>
                        </div>
                        {!isYearLocked && (
                            <button
                                onClick={() => setIsPeriodModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-[#4085b3] hover:bg-[#32698e] text-white transition-colors cursor-pointer shadow-2xs"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add New Period</span>
                            </button>
                        )}
                    </div>

                    <div className="border border-slate-200 bg-white rounded overflow-hidden shadow-2xs">
                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-gray-50/75 border-b border-gray-200">
                                        <th className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Period Name
                                        </th>
                                        <th className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            Type
                                        </th>
                                        <th className="py-2.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {periods.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-12 text-center text-slate-400 text-xs">
                                                No class periods configured yet. Click &quot;Add New Period&quot; above to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        periods.map((p) => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 px-4 font-bold text-slate-900 font-mono">{p.name}</td>
                                                <td className="py-3 px-4">
                                                    {p.isBreak ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                            Break / Recess
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#4085b3]" />
                                                            Instructional Period
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {!isYearLocked && (
                                                        <button
                                                            onClick={() => handleDeletePeriod(p.id, p.name)}
                                                            className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                                            title={`Delete period ${p.name}`}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}


            {/* ==================================================== */}
            {/* MODAL: ASSIGN LESSON TO CELL */}
            {/* ==================================================== */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => {
                    setIsAssignModalOpen(false);
                    setSelectedSlotTarget(null);
                    setConflictError(null);
                }}
                title={
                    selectedSlotTarget 
                        ? `Schedule Lesson: ${ALL_DAYS.find(d => d.value === selectedSlotTarget.dayOfWeek)?.label} - ${selectedSlotTarget.periodName}`
                        : `Schedule Lesson for Section ${selectedSection?.name || ""}`
                }
                maxWidth="md"
            >
                <div className="space-y-4">
                    {conflictError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                            {conflictError}
                        </div>
                    )}

                    {/* If opened via "Schedule Lesson" or "Place Lesson", pick Day & Period */}
                    {!selectedSlotTarget && (
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border border-slate-200">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Day of Week:
                                </label>
                                <select
                                    value={customDayOfWeek}
                                    onChange={(e) => setCustomDayOfWeek(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] outline-hidden cursor-pointer"
                                >
                                    {operatingDaysList.map(d => (
                                        <option key={d.value} value={d.value}>{d.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Class Period:
                                </label>
                                <select
                                    value={customPeriodId}
                                    onChange={(e) => setCustomPeriodId(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] outline-hidden cursor-pointer"
                                >
                                    <option value="">-- Choose Period --</option>
                                    {workspace?.periods?.filter((p: any) => !p.isBreak).map((p: any) => {
                                        const match = p.name.match(/\d+/);
                                        const code = match ? `P${match[0]}` : p.name;
                                        return (
                                            <option key={p.id} value={p.id}>
                                                {code}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Select Subject & Teacher to Schedule:
                        </label>
                        <select
                            value={selectedTeachingAssignmentId}
                            onChange={(e) => setSelectedTeachingAssignmentId(e.target.value)}
                            disabled={availableTeachingAssignments.length === 0}
                            className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] outline-hidden disabled:bg-slate-100 disabled:text-slate-400 cursor-pointer"
                        >
                            <option value="">
                                {availableTeachingAssignments.length === 0
                                    ? "-- No eligible subjects remaining for this day / week --"
                                    : "-- Choose Teaching Assignment --"}
                            </option>
                            {availableTeachingAssignments.map((ta: any) => (
                                <option key={ta.id} value={ta.id}>
                                    {ta.subject.name} — {ta.teacher.firstName} {ta.teacher.lastName} ({ta.scheduledPeriods}/{ta.requiredPeriods} periods scheduled)
                                </option>
                            ))}
                        </select>
                        {availableTeachingAssignments.length === 0 && (
                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                                All weekly periods are fully scheduled, or remaining subjects are already scheduled on this day.
                            </p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAssignModalOpen(false);
                                setSelectedSlotTarget(null);
                            }}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleAssignSlot}
                            disabled={!selectedTeachingAssignmentId || actionLoading}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#32698e] rounded transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading ? "Verifying Invariants..." : "Assign Lesson"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ==================================================== */}
            {/* MODAL: REASSIGN SLOT */}
            {/* ==================================================== */}
            <Modal
                isOpen={isReassignModalOpen}
                onClose={() => {
                    setIsReassignModalOpen(false);
                    setReassignSlotTarget(null);
                    setConflictError(null);
                }}
                title="Reassign Timetable Slot"
                maxWidth="md"
            >
                <div className="space-y-4">
                    {conflictError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                            {conflictError}
                        </div>
                    )}

                    <p className="text-xs text-slate-500">
                        Switch the current instructional assignment for this slot to another valid teaching assignment in Section {selectedSection?.name}.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            New Teaching Assignment:
                        </label>
                        <select
                            value={reassignAssignmentId}
                            onChange={(e) => setReassignAssignmentId(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] outline-hidden cursor-pointer"
                        >
                            {workspace?.teachingAssignments?.map((ta: any) => (
                                <option key={ta.id} value={ta.id}>
                                    {ta.subject.name} — {ta.teacher.firstName} {ta.teacher.lastName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Reassignment Justification (Recorded in Audit Trail):
                        </label>
                        <Input
                            placeholder="e.g. Adjusted teacher workload / lab availability shift"
                            value={reassignReason}
                            onChange={(e) => setReassignReason(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => {
                                setIsReassignModalOpen(false);
                                setReassignSlotTarget(null);
                            }}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleReassignSlot}
                            disabled={!reassignAssignmentId || actionLoading}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#32698e] rounded transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading ? "Reassigning..." : "Confirm Reassignment"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ==================================================== */}
            {/* MODAL: DELETE SLOT CONFIRMATION */}
            {/* ==================================================== */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setDeleteTargetId(null);
                }}
                title="Remove Timetable Lesson"
                maxWidth="sm"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Are you sure you want to remove this instructional lesson from the timetable? This will restore 1 period to the subject&apos;s remaining requirement pool.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setDeleteTargetId(null);
                            }}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteSlot}
                            disabled={actionLoading}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading ? "Removing..." : "Yes, Remove Lesson"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ==================================================== */}
            {/* MODAL: PUBLISH / UNPUBLISH OFFICIAL TIMETABLE */}
            {/* ==================================================== */}
            <Modal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                title={isPublished ? "Revert Timetable to Draft?" : "Publish Official School Timetable?"}
                maxWidth="md"
            >
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 leading-relaxed">
                        <Info className="w-5 h-5 text-[#4085b3] shrink-0 mt-0.5" />
                        <div>
                            {isPublished ? (
                                <p>
                                    Reverting to Draft mode hides the timetable from Student and Teacher personal dashboards. Use this if major curriculum re-scheduling is underway.
                                </p>
                            ) : (
                                <p>
                                    Publishing makes the weekly instructional schedule officially visible on all Student and Teacher portals across this academic year.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsPublishModalOpen(false)}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleTogglePublish}
                            disabled={actionLoading}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#32698e] rounded transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading 
                                ? "Updating..." 
                                : isPublished ? "Revert to Draft" : "Confirm & Publish Timetable"
                            }
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ==================================================== */}
            {/* MODAL: ADD CLASS PERIOD */}
            {/* ==================================================== */}
            <Modal
                isOpen={isPeriodModalOpen}
                onClose={() => setIsPeriodModalOpen(false)}
                title="Add Class Period"
                maxWidth="md"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Period Name</label>
                        <Input
                            placeholder="e.g. P1, P2, Period 3, or Recess"
                            value={newPeriod.name}
                            onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                            autoFocus
                        />
                        {/* Quick Name Suggestions */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[11px] text-slate-400 mr-1">Quick pick:</span>
                            {["P1", "P2", "P3", "P4", "P5", "P6", "P7", "Recess"].map((pName) => (
                                <button
                                    key={pName}
                                    type="button"
                                    onClick={() => setNewPeriod({ 
                                        ...newPeriod, 
                                        name: pName,
                                        isBreak: pName.toLowerCase().includes("recess") || pName.toLowerCase().includes("break")
                                    })}
                                    className="px-2.5 py-1 rounded text-xs bg-slate-100 hover:bg-[#4085b3]/10 hover:text-[#4085b3] text-slate-700 font-semibold transition-colors cursor-pointer"
                                >
                                    {pName}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="isBreakCheck"
                            checked={newPeriod.isBreak}
                            onChange={(e) => setNewPeriod({ ...newPeriod, isBreak: e.target.checked })}
                            className="rounded border-slate-300 text-[#4085b3] focus:ring-[#4085b3]"
                        />
                        <label htmlFor="isBreakCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                            This is a Break / Recess period (lessons cannot be scheduled)
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setIsPeriodModalOpen(false)}
                            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    setActionLoading(true);
                                    setConflictError(null);
                                    const res = await fetchApi("/timetable/periods", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            name: newPeriod.name.trim(),
                                            isBreak: newPeriod.isBreak
                                        })
                                    });
                                    const data = await res.json();
                                    if (!res.ok) {
                                        throw new Error(data.error || "Failed to create period");
                                    }
                                    setIsPeriodModalOpen(false);
                                    setNewPeriod({ name: "", startTime: "", endTime: "", isBreak: false });
                                    setSuccessMessage(`Period "${data.name}" created successfully.`);
                                    setTimeout(() => setSuccessMessage(null), 3000);
                                    await loadWorkspace(selectedYearId, selectedGradeId, selectedSectionId);
                                } catch (e: any) {
                                    setConflictError(e.message || "Failed to create period");
                                } finally {
                                    setActionLoading(false);
                                }
                            }}
                            disabled={!newPeriod.name.trim() || actionLoading}
                            className="px-4 py-1.5 text-xs font-semibold text-white bg-[#4085b3] hover:bg-[#32698e] rounded transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading ? "Saving..." : "Save Period"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
