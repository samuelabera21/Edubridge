"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Clock, Plus, Calendar, BookOpen, User, Home, Trash2, ShieldAlert, 
    Check, ClipboardList, GraduationCap, Settings, Building, AlertCircle, 
    CheckCircle2, RefreshCw, ChevronRight, Lock, Unlock, Users, Info, CalendarOff
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
            {/* Top Bar: Title & Year Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#4085b3]/10 text-[#4085b3] border border-[#4085b3]/20">
                            Step 6: Timetable & Scheduling
                        </span>
                        {isPublished ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Official Timetable Published
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3.5 h-3.5" /> Draft Mode (Unpublished)
                            </span>
                        )}
                        {isYearLocked && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                                <Lock className="w-3 h-3" /> Academic Year Locked
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
                        Instructional Timetable & Scheduling
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Configure weekly section lesson allocations, collision engine enforcement, and live student/teacher schedules.
                    </p>
                </div>

                {/* Academic Year Selector & Actions */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <select
                            value={selectedYearId}
                            onChange={(e) => setSelectedYearId(e.target.value)}
                            className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                        >
                            {academicYears.map((yr) => (
                                <option key={yr.id} value={yr.id}>
                                    {yr.name} {yr.status === "ACTIVE" ? "(Active)" : `(${yr.status})`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {!isYearLocked && (
                        <Button
                            variant={isPublished ? "outline" : "primary"}
                            onClick={() => setIsPublishModalOpen(true)}
                            className="flex items-center gap-2"
                        >
                            {isPublished ? (
                                <>
                                    <Unlock className="w-4 h-4 text-amber-600" />
                                    <span>Unpublish / Revert to Draft</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                    <span>Publish Official Timetable</span>
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-6 pt-2 rounded-xl shadow-xs gap-4 overflow-x-auto">
                <button
                    onClick={() => setActiveTab("workspace")}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "workspace"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <GraduationCap className="w-4 h-4" />
                    <span>Section Scheduling Workspace</span>
                </button>
                <button
                    onClick={() => setActiveTab("teacherView")}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "teacherView"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <User className="w-4 h-4" />
                    <span>Teacher Master Schedule</span>
                </button>
                <button
                    onClick={() => setActiveTab("periods")}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "periods"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>Class Periods & Recess</span>
                </button>
                <button
                    onClick={() => setActiveTab("rooms")}
                    className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "rooms"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <Building className="w-4 h-4" />
                    <span>Facility Rooms</span>
                </button>
            </div>

            {/* Notification Alerts */}
            {successMessage && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm animate-in fade-in duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <p className="font-medium">{successMessage}</p>
                </div>
            )}

            {conflictError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm animate-in fade-in duration-300">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold">Scheduling Conflict Rejection</h4>
                        <p className="mt-0.5 text-xs text-red-700 leading-relaxed">{conflictError}</p>
                    </div>
                </div>
            )}

            {/* Academic Calendar Closed Days Banner */}
            {closedDayEvents.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-xs leading-relaxed">
                    <CalendarOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <span className="font-semibold text-amber-950">Academic Calendar Closures & Holidays:</span>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                            {closedDayEvents.map((ev: any) => (
                                <span key={ev.id} className="inline-flex items-center gap-1 bg-amber-100/70 border border-amber-300/60 px-2 py-0.5 rounded-md text-[11px] font-medium text-amber-900">
                                    <span>{ev.title}</span>
                                    <span className="text-amber-700 text-[10px]">
                                        ({new Date(ev.startDate).toISOString().slice(0, 10)})
                                    </span>
                                </span>
                            ))}
                        </div>
                        <p className="text-[11px] text-amber-700 mt-1">
                            Instructional timetable slots represent weekly recurring lessons. On designated academic calendar closed days, standard school operations observe official closure.
                        </p>
                    </div>
                </div>
            )}

            {/* TAB 1: SECTION SCHEDULING WORKSPACE */}
            {activeTab === "workspace" && (
                <div className="space-y-6">
                    {/* Grade & Section Selector Header */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Grade Selector */}
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                    Grade Level
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {workspace?.schoolGrades?.map((sg: any) => (
                                        <button
                                            key={sg.id}
                                            onClick={() => handleGradeSelect(sg.id)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                selectedGradeId === sg.id
                                                    ? "bg-[#4085b3] text-white shadow-xs"
                                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            {sg.grade.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section Selector */}
                            {selectedGrade && (
                                <div className="border-l border-slate-200 pl-4">
                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                        Section Roster
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {workspace?.schoolGrades
                                            ?.find((g: any) => g.id === selectedGradeId)
                                            ?.sections?.map((sec: any) => (
                                                <button
                                                    key={sec.id}
                                                    onClick={() => handleSectionSelect(sec.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                        selectedSectionId === sec.id
                                                            ? "bg-slate-900 text-white shadow-xs"
                                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                    }`}
                                                >
                                                    Section {sec.name}
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Selected Section KPI Summary */}
                        {selectedSection && (
                            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5">
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 font-medium">Placed Students (Step 5)</div>
                                    <div className="text-base font-bold text-slate-900 flex items-center justify-end gap-1.5">
                                        <Users className="w-4 h-4 text-[#4085b3]" />
                                        <span>{selectedSection.enrolledStudentsCount || 0} students</span>
                                    </div>
                                </div>
                                <div className="w-px h-8 bg-slate-200" />
                                <div className="text-right">
                                    <div className="text-xs text-slate-500 font-medium">Coverage Progress</div>
                                    <div className="text-base font-bold text-slate-900">
                                        {workspace?.coverage?.coveragePercentage || 0}%
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section Instructional Demand KPIs */}
                    {selectedSection && workspace?.coverage && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-l-4 border-l-[#4085b3]">
                                <CardContent className="p-4">
                                    <span className="text-xs font-medium text-slate-500">Required Periods</span>
                                    <div className="text-2xl font-bold text-slate-900 mt-1">
                                        {workspace.coverage.totalRequired}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">Weekly curriculum demand</p>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-emerald-500">
                                <CardContent className="p-4">
                                    <span className="text-xs font-medium text-slate-500">Scheduled Periods</span>
                                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                                        {workspace.coverage.totalScheduled}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">Placed in weekly grid</p>
                                </CardContent>
                            </Card>
                            <Card className={`border-l-4 ${workspace.coverage.totalRemaining > 0 ? "border-l-amber-500" : "border-l-slate-300"}`}>
                                <CardContent className="p-4">
                                    <span className="text-xs font-medium text-slate-500">Remaining Deficit</span>
                                    <div className={`text-2xl font-bold mt-1 ${workspace.coverage.totalRemaining > 0 ? "text-amber-600" : "text-slate-400"}`}>
                                        {workspace.coverage.totalRemaining}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">Periods yet to be assigned</p>
                                </CardContent>
                            </Card>
                            <Card className="border-l-4 border-l-purple-500">
                                <CardContent className="p-4">
                                    <span className="text-xs font-medium text-slate-500">Publication Status</span>
                                    <div className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                                        {isPublished ? (
                                            <span className="text-emerald-600 flex items-center gap-1">
                                                <CheckCircle2 className="w-5 h-5" /> Published
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 flex items-center gap-1">
                                                <Clock className="w-5 h-5" /> Draft
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        {isPublished ? "Visible to Students & Teachers" : "Only Admins/VPs can view"}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

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
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            {/* LEFT PANEL: Teaching Assignment Pool (35% on lg) */}
                            <div className="lg:col-span-4 space-y-4">
                                <Card>
                                    <CardHeader className="py-4 px-5 border-b border-slate-100 flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-sm font-bold text-slate-900">
                                                Assigned Subjects & Staffing
                                            </CardTitle>
                                            <p className="text-xs text-slate-400">Step 3 Teaching Assignments</p>
                                        </div>
                                        <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                            {workspace.teachingAssignments?.length || 0} subjects
                                        </span>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-2.5 max-h-[620px] overflow-y-auto">
                                        {workspace.teachingAssignments?.length === 0 ? (
                                            <div className="p-6 text-center text-xs text-slate-400">
                                                No teaching assignments allocated for Section {selectedSection.name} in Step 3.
                                            </div>
                                        ) : (
                                            workspace.teachingAssignments?.map((ta: any) => {
                                                const isDone = ta.isComplete;
                                                return (
                                                    <div
                                                        key={ta.id}
                                                        className={`p-3.5 rounded-xl border transition-all ${
                                                            isDone
                                                                ? "bg-slate-50/80 border-slate-200"
                                                                : "bg-white border-slate-200 hover:border-[#4085b3] shadow-2xs"
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-xs font-bold text-slate-900">
                                                                        {ta.subject.name}
                                                                    </span>
                                                                    {ta.subject.code && (
                                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                                                                            {ta.subject.code}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                                                    <User className="w-3 h-3 text-slate-400" />
                                                                    <span>{ta.teacher.firstName} {ta.teacher.lastName}</span>
                                                                </p>
                                                            </div>

                                                            {/* Status Badge */}
                                                            {isDone ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    <Check className="w-3 h-3" /> Complete
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                                    {ta.remainingPeriods} left
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Progress bar */}
                                                        <div className="mt-3">
                                                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                                                <span>Allocated: <strong>{ta.scheduledPeriods}</strong> / {ta.requiredPeriods} periods</span>
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

                                                        {!isDone && !isYearLocked && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedTeachingAssignmentId(ta.id);
                                                                    setSelectedSlotTarget(null);
                                                                    setIsAssignModalOpen(true);
                                                                }}
                                                                className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-[#4085b3]/10 hover:bg-[#4085b3]/20 text-[#4085b3] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-[#4085b3]/20"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                <span>Place Lesson into Grid</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* RIGHT PANEL: Weekly Timetable Grid (65% on lg) */}
                            <div className="lg:col-span-8">
                                <Card>
                                    <CardHeader className="py-4 px-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <CardTitle className="text-sm font-bold text-slate-900">
                                                Section {selectedSection.name} Weekly Schedule
                                            </CardTitle>
                                            <p className="text-xs text-slate-400">
                                                Instructional grid for {selectedGrade?.grade?.name} Section {selectedSection.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {!isYearLocked && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setIsPeriodModalOpen(true)}
                                                        className="text-xs flex items-center gap-1 py-1.5 px-3 h-auto"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Add Period</span>
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setSelectedSlotTarget(null);
                                                            setIsAssignModalOpen(true);
                                                        }}
                                                        className="text-xs flex items-center gap-1 py-1.5 px-3 h-auto"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Schedule Lesson</span>
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="p-0 overflow-x-auto">
                                        <table className="w-full border-collapse text-left min-w-[700px]">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 w-28 border-r border-slate-200">
                                                        Period
                                                    </th>
                                                    {operatingDaysList.map((d) => (
                                                        <th key={d.value} className="py-3 px-3 text-xs font-bold text-slate-700 text-center border-r border-slate-200 last:border-r-0">
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
                                                                <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                                                                <h4 className="text-sm font-bold text-slate-800">No Class Periods Defined Yet</h4>
                                                                <p className="text-xs text-slate-500">
                                                                    To schedule lessons, this school needs class periods (e.g. Period 1, Period 2, Recess). Click below to generate the standard Ethiopian school period schedule instantly:
                                                                </p>
                                                                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                                                                    <Button
                                                                        onClick={handleGenerateDefaultPeriods}
                                                                        disabled={actionLoading}
                                                                        className="flex items-center gap-1.5 text-xs bg-[#4085b3] hover:bg-[#356f96]"
                                                                    >
                                                                        <span>⚡ Auto-Generate Standard Ethiopian Periods (1-7 + Recess)</span>
                                                                    </Button>
                                                                    <Button
                                                                        variant="outline"
                                                                        onClick={() => setIsPeriodModalOpen(true)}
                                                                        className="flex items-center gap-1.5 text-xs"
                                                                    >
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                        <span>Add Custom Period</span>
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    workspace.periods?.map((period: any) => {
                                                        const isBreak = period.isBreak;

                                                        if (isBreak) {
                                                            return (
                                                                <tr key={period.id} className="bg-amber-50/50 border-y border-amber-200/60">
                                                                    <td className="py-2 px-4 text-xs font-semibold text-amber-800 border-r border-amber-200/60 bg-amber-100/40">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                                            <span>{period.name}</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-amber-600 font-mono">
                                                                            {period.startTime} - {period.endTime}
                                                                        </div>
                                                                    </td>
                                                                    <td
                                                                        colSpan={operatingDaysList.length}
                                                                        className="py-2.5 text-center text-xs font-semibold text-amber-700 tracking-wider uppercase bg-amber-50/70"
                                                                    >
                                                                        ☕ {period.name} (Recess / Non-Instructional Break)
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }

                                                        return (
                                                            <tr key={period.id} className="hover:bg-slate-50/30 transition-colors">
                                                                {/* Period Label */}
                                                                <td className="py-3 px-4 text-xs font-semibold text-slate-800 border-r border-slate-200 bg-slate-50/60">
                                                                    <div className="font-bold text-slate-900">{period.name}</div>
                                                                    <div className="text-[11px] text-slate-400 font-mono">
                                                                        {period.startTime} - {period.endTime}
                                                                    </div>
                                                                </td>

                                                                {/* Day Cells */}
                                                                {operatingDaysList.map((day) => {
                                                                    const cellKey = `${day.value}-${period.id}`;
                                                                    const slot = timetableGridMap.get(cellKey);

                                                                    return (
                                                                        <td
                                                                            key={day.value}
                                                                            className="py-2 px-2 border-r border-slate-200 last:border-r-0 align-top h-24 min-w-[130px]"
                                                                        >
                                                                            {slot ? (
                                                                                <div className="relative group p-2.5 rounded-xl bg-slate-900 text-white shadow-xs border border-slate-800 flex flex-col justify-between h-full transition-all">
                                                                                    <div>
                                                                                        <div className="flex items-start justify-between gap-1">
                                                                                            <span className="text-xs font-bold leading-tight line-clamp-1">
                                                                                                {slot.teachingAssignment.subject.name}
                                                                                            </span>
                                                                                            {!isYearLocked && (
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setDeleteTargetId(slot.id);
                                                                                                        setIsDeleteModalOpen(true);
                                                                                                    }}
                                                                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-all"
                                                                                                    title="Remove slot"
                                                                                                >
                                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                                </button>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1 line-clamp-1">
                                                                                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                                                                                            <span>
                                                                                                {slot.teachingAssignment.teacher.firstName} {slot.teachingAssignment.teacher.lastName}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800 text-[10px]">
                                                                                        {slot.room ? (
                                                                                            <span className="text-slate-400 flex items-center gap-0.5">
                                                                                                <Building className="w-3 h-3 text-slate-400" />
                                                                                                <span>{slot.room.name}</span>
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-slate-500">Sec {selectedSection.name}</span>
                                                                                        )}

                                                                                        {!isYearLocked && (
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setReassignSlotTarget(slot);
                                                                                                    setReassignAssignmentId(slot.teachingAssignmentId);
                                                                                                    setIsReassignModalOpen(true);
                                                                                                }}
                                                                                                className="text-[10px] text-[#4085b3] hover:underline"
                                                                                            >
                                                                                                Switch
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                !isYearLocked && (
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            setSelectedSlotTarget({
                                                                                                dayOfWeek: day.value,
                                                                                                periodId: period.id,
                                                                                                periodName: period.name
                                                                                            });
                                                                                            setIsAssignModalOpen(true);
                                                                                        }}
                                                                                        className="w-full h-full rounded-xl border-2 border-dashed border-slate-200 hover:border-[#4085b3] hover:bg-[#4085b3]/5 transition-all flex flex-col items-center justify-center text-slate-400 hover:text-[#4085b3] group p-2"
                                                                                    >
                                                                                        <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                                                        <span className="text-[10px] mt-0.5 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                            Add
                                                                                        </span>
                                                                                    </button>
                                                                                )
                                                                            )}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: TEACHER MASTER SCHEDULE VIEW */}
            {activeTab === "teacherView" && (
                <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Teacher Consolidated Timetable</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Inspect a teacher&apos;s full instructional schedule across all grades and sections.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-600">Select Teacher:</label>
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => setSelectedTeacherId(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium bg-white text-slate-800 focus:ring-2 focus:ring-[#4085b3]"
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
                        <LoadingState message="Loading Teacher Schedule..." />
                    ) : (
                        <Card>
                            <CardHeader className="py-4 px-5 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold text-slate-900">
                                    Weekly Workload: {teachers.find(t => t.id === selectedTeacherId)?.firstName} {teachers.find(t => t.id === selectedTeacherId)?.lastName}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 overflow-x-auto">
                                <table className="w-full border-collapse text-left min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="py-3 px-4 text-xs font-bold uppercase text-slate-400 w-28 border-r border-slate-200">
                                                Period
                                            </th>
                                            {operatingDaysList.map((d) => (
                                                <th key={d.value} className="py-3 px-3 text-xs font-bold text-slate-700 text-center border-r border-slate-200 last:border-r-0">
                                                    {d.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {periods.map((period) => {
                                            if (period.isBreak) {
                                                return (
                                                    <tr key={period.id} className="bg-amber-50/50">
                                                        <td className="py-2 px-4 text-xs font-semibold text-amber-800 border-r border-amber-200/60">
                                                            {period.name}
                                                        </td>
                                                        <td colSpan={operatingDaysList.length} className="py-2 text-center text-xs font-semibold text-amber-700 uppercase">
                                                            {period.name}
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={period.id}>
                                                    <td className="py-3 px-4 text-xs font-bold text-slate-800 border-r border-slate-200 bg-slate-50/60">
                                                        {period.name}
                                                        <div className="text-[10px] text-slate-400 font-mono font-normal">
                                                            {period.startTime} - {period.endTime}
                                                        </div>
                                                    </td>
                                                    {operatingDaysList.map((day) => {
                                                        const slot = teacherTimetable.find(
                                                            (s: any) => s.dayOfWeek === day.value && s.classPeriodId === period.id
                                                        );

                                                        return (
                                                            <td key={day.value} className="py-2 px-2 border-r border-slate-200 last:border-r-0 h-20 min-w-[130px] align-top">
                                                                {slot ? (
                                                                    <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs flex flex-col justify-between h-full">
                                                                        <div className="font-bold line-clamp-1">
                                                                            {slot.teachingAssignment?.subject?.name}
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-300 mt-1">
                                                                            {slot.teachingAssignment?.schoolGrade?.grade?.name} - Sec {slot.teachingAssignment?.section?.name}
                                                                        </div>
                                                                        {slot.room && (
                                                                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                                                                <Building className="w-3 h-3" />
                                                                                <span>{slot.room.name}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-full h-full rounded-xl bg-slate-50/50 border border-slate-100 flex items-center justify-center text-[10px] text-slate-300">
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
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* TAB 3: CLASS PERIODS & RECESS */}
            {activeTab === "periods" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Class Periods & Recess Settings</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Define instructional periods and breaks observed across all section timetables.
                            </p>
                        </div>
                        {!isYearLocked && (
                            <Button onClick={() => setIsPeriodModalOpen(true)} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                <span>Add New Period</span>
                            </Button>
                        )}
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="py-3 px-4 font-bold text-slate-700">Period Name</th>
                                        <th className="py-3 px-4 font-bold text-slate-700">Start Time</th>
                                        <th className="py-3 px-4 font-bold text-slate-700">End Time</th>
                                        <th className="py-3 px-4 font-bold text-slate-700">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {periods.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50">
                                            <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                                            <td className="py-3 px-4 font-mono text-slate-700">{p.startTime}</td>
                                            <td className="py-3 px-4 font-mono text-slate-700">{p.endTime}</td>
                                            <td className="py-3 px-4">
                                                {p.isBreak ? (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                        Break / Recess
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                        Instructional Period
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 4: FACILITY ROOMS (OPTIONAL) */}
            {activeTab === "rooms" && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Facility Rooms & Specialized Labs</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Rooms are optional. Core Step 6 timetable scheduling is section-oriented (Section + Subject + Teacher).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rooms.length === 0 ? (
                            <div className="col-span-3 text-center py-12 text-slate-400 text-xs">
                                No physical rooms or labs configured yet.
                            </div>
                        ) : (
                            rooms.map((rm) => (
                                <Card key={rm.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm">{rm.name}</h4>
                                                <span className="text-[10px] uppercase font-semibold text-[#4085b3] tracking-wider">
                                                    {rm.type}
                                                </span>
                                            </div>
                                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                                                Cap: {rm.capacity || "N/A"}
                                            </span>
                                        </div>
                                        {rm.description && (
                                            <p className="text-xs text-slate-500 mt-2">{rm.description}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
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
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
                            {conflictError}
                        </div>
                    )}

                    {/* If opened via "Schedule Lesson" or "Place Lesson", pick Day & Period */}
                    {!selectedSlotTarget && (
                        <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Day of Week:
                                </label>
                                <select
                                    value={customDayOfWeek}
                                    onChange={(e) => setCustomDayOfWeek(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#4085b3]"
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
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:ring-2 focus:ring-[#4085b3]"
                                >
                                    <option value="">-- Choose Period --</option>
                                    {workspace?.periods?.filter((p: any) => !p.isBreak).map((p: any) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.startTime} - {p.endTime})
                                        </option>
                                    ))}
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
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#4085b3]"
                        >
                            <option value="">-- Choose Teaching Assignment --</option>
                            {workspace?.teachingAssignments?.map((ta: any) => (
                                <option key={ta.id} value={ta.id}>
                                    {ta.subject.name} — {ta.teacher.firstName} {ta.teacher.lastName} ({ta.scheduledPeriods}/{ta.requiredPeriods} periods scheduled)
                                </option>
                            ))}
                        </select>
                    </div>

                    {rooms.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Assigned Room / Lab (Optional):
                            </label>
                            <select
                                value={selectedRoomId}
                                onChange={(e) => setSelectedRoomId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#4085b3]"
                            >
                                <option value="">Standard Section Classroom</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name} ({r.type})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAssignModalOpen(false);
                                setSelectedSlotTarget(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAssignSlot}
                            disabled={!selectedTeachingAssignmentId || actionLoading}
                        >
                            {actionLoading ? "Verifying Invariants..." : "Assign Lesson"}
                        </Button>
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
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs">
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
                            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#4085b3]"
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

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsReassignModalOpen(false);
                                setReassignSlotTarget(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReassignSlot}
                            disabled={!reassignAssignmentId || actionLoading}
                        >
                            {actionLoading ? "Reassigning..." : "Confirm Reassignment"}
                        </Button>
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
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setDeleteTargetId(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteSlot}
                            disabled={actionLoading}
                        >
                            {actionLoading ? "Removing..." : "Yes, Remove Lesson"}
                        </Button>
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
                    <div className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
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

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant={isPublished ? "secondary" : "primary"}
                            onClick={handleTogglePublish}
                            disabled={actionLoading}
                        >
                            {actionLoading 
                                ? "Updating..." 
                                : isPublished ? "Revert to Draft" : "Confirm & Publish Timetable"
                            }
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* ==================================================== */}
            {/* MODAL: ADD CLASS PERIOD */}
            {/* ==================================================== */}
            <Modal
                isOpen={isPeriodModalOpen}
                onClose={() => setIsPeriodModalOpen(false)}
                title="Create Class Period"
                maxWidth="md"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Period Name</label>
                        <Input
                            placeholder="e.g. Period 5 or Afternoon Recess"
                            value={newPeriod.name}
                            onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time (24h)</label>
                            <Input
                                placeholder="08:00"
                                value={newPeriod.startTime}
                                onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">End Time (24h)</label>
                            <Input
                                placeholder="08:40"
                                value={newPeriod.endTime}
                                onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                            />
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
                        <label htmlFor="isBreakCheck" className="text-xs font-medium text-slate-700">
                            This is a Break / Recess period (lessons cannot be scheduled)
                        </label>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button variant="outline" onClick={() => setIsPeriodModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                try {
                                    const res = await fetchApi("/timetable/periods", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(newPeriod)
                                    });
                                    if (res.ok) {
                                        setIsPeriodModalOpen(false);
                                        setNewPeriod({ name: "", startTime: "", endTime: "", isBreak: false });
                                        await loadWorkspace(selectedYearId, selectedGradeId, selectedSectionId);
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                            disabled={!newPeriod.name || !newPeriod.startTime || !newPeriod.endTime}
                        >
                            Save Period
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
