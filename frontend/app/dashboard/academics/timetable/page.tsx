"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Plus, Filter, Calendar, BookOpen, User, Home, Trash2, ShieldAlert, Check, ClipboardList, GraduationCap, Settings, Building } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const DAYS = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" }
];

export default function TimetablePage() {
    const { authData } = useAuth();
    const [activeTab, setActiveTab] = useState<"grid" | "periods" | "requirements" | "availability" | "config" | "rooms">("grid");
    const [activeRoomSubTab, setActiveRoomSubTab] = useState<"list" | "availability">("list");
    
    // Core data
    const [periods, setPeriods] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [activeYear, setActiveYear] = useState<any>(null);

    // Filter selectors
    const [viewType, setViewType] = useState<"section" | "teacher" | "room">("section");
    const [selectedGradeId, setSelectedGradeId] = useState<string>("");
    const [selectedSectionId, setSelectedSectionId] = useState<string>("");
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
    const [selectedRoomId, setSelectedRoomId] = useState<string>("");

    // Timetable grid schedules
    const [timetableEntries, setTimetableEntries] = useState<any[]>([]);

    // Loading & Errors
    const [loading, setLoading] = useState(true);
    const [gridLoading, setGridLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modals
    const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [selectedCell, setSelectedCell] = useState<{ dayOfWeek: number; periodId: string } | null>(null);

    // Form inputs
    const [newPeriod, setNewPeriod] = useState({ name: "", startTime: "", endTime: "", isBreak: false });
    const [newAssignmentId, setNewAssignmentId] = useState("");
    const [newRoomId, setNewRoomId] = useState("");
    const [formError, setFormError] = useState<string | null>(null);

    // Rooms Form
    const [editingRoom, setEditingRoom] = useState<any>(null);
    const [roomForm, setRoomForm] = useState({ name: "", type: "CLASSROOM", capacity: "", status: "AVAILABLE", description: "" });

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

    // Requirements & Availability states
    const [editingRequirements, setEditingRequirements] = useState<{ [id: string]: number }>({});
    const [selectedAvailabilityTeacherId, setSelectedAvailabilityTeacherId] = useState<string>("");
    const [availabilityMap, setAvailabilityMap] = useState<{ [key: string]: boolean }>({});

    // Room Availability states
    const [selectedAvailabilityRoomId, setSelectedAvailabilityRoomId] = useState<string>("");
    const [roomAvailabilityMap, setRoomAvailabilityMap] = useState<{ [key: string]: boolean }>({});

    const hasCreatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => p.permission.name === "ACADEMIC:MANAGE")
    );

    const loadCoreData = async () => {
        try {
            setLoading(true);
            
            // 1. Academic Years to find active
            const yearsRes = await fetchApi("/academic/years");
            if (!yearsRes.ok) throw new Error("Failed to load academic years");
            const yearsData = await yearsRes.json();
            const active = yearsData.find((y: any) => y.status === "ACTIVE");
            setActiveYear(active || null);

            // 2. Class Periods
            const periodsRes = await fetchApi("/timetable/periods");
            if (!periodsRes.ok) throw new Error("Failed to load class periods");
            const periodsData = await periodsRes.json();
            setPeriods(periodsData);

            // 3. Teaching Assignments
            const assignmentsRes = await fetchApi("/teacher/assignments");
            if (!assignmentsRes.ok) throw new Error("Failed to load assignments");
            const assignmentsData = await assignmentsRes.json();
            setAssignments(assignmentsData);

            // Initialize editing requirements
            const reqs: any = {};
            assignmentsData.forEach((as: any) => {
                reqs[as.id] = as.periodsPerWeek || 0;
            });
            setEditingRequirements(reqs);

            // 4. Rooms (Operational Resource)
            const roomsRes = await fetchApi("/operational/resource");
            if (roomsRes.ok) {
                const roomsData = await roomsRes.json();
                setRooms(roomsData.filter((r: any) => r.type === "CLASSROOM" || r.type === "LAB" || r.type === "LIBRARY" || r.type === "SPORTS_FACILITY" || r.type === "OTHER"));
            }

            // 5. Teachers
            const teachersRes = await fetchApi("/teacher");
            if (teachersRes.ok) {
                const teachersData = await teachersRes.json();
                setTeachers(teachersData);
            }

            // 6. Grades (for section filter)
            if (active) {
                const gradesRes = await fetchApi(`/academic/years/${active.id}/grades`);
                if (gradesRes.ok) {
                    const gradesData = await gradesRes.json();
                    setGrades(gradesData);
                }

                // Load existing configuration
                const configRes = await fetchApi(`/timetable/config/${active.id}`);
                if (configRes.ok) {
                    const configData = await configRes.json();
                    if (configData) {
                        setScheduleConfig({
                            operatingDays: configData.operatingDays || [1, 2, 3, 4, 5],
                            startTime: configData.startTime || "08:00",
                            periodDuration: configData.periodDuration || 40,
                            periodsPerDay: configData.periodsPerDay || 6,
                            breakDuration: configData.breakDuration || 20,
                            breakAfter: configData.breakAfter || 2,
                            lunchDuration: configData.lunchDuration || 50,
                            lunchAfter: configData.lunchAfter || 4,
                            shift: configData.shift || "FULL"
                        });
                    }
                }
            }

            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCoreData();
    }, []);

    // Load sections when grade changes
    useEffect(() => {
        const loadSections = async () => {
            if (!selectedGradeId) {
                setSections([]);
                setSelectedSectionId("");
                return;
            }
            try {
                const res = await fetchApi(`/academic/grades/${selectedGradeId}/sections`);
                if (res.ok) {
                    const data = await res.json();
                    setSections(data);
                    if (data.length > 0) {
                        setSelectedSectionId(data[0].id);
                    } else {
                        setSelectedSectionId("");
                    }
                }
            } catch (err) {
                console.error("Failed to load sections", err);
            }
        };
        loadSections();
    }, [selectedGradeId]);

    // Load active timetable grid data based on selection
    const loadTimetableGrid = async () => {
        let endpoint = "";
        if (viewType === "section" && selectedSectionId) {
            endpoint = `/timetable/section/${selectedSectionId}`;
        } else if (viewType === "teacher" && selectedTeacherId) {
            endpoint = `/timetable/teacher/${selectedTeacherId}`;
        } else if (viewType === "room" && selectedRoomId) {
            endpoint = `/timetable/room/${selectedRoomId}`;
        }

        if (!endpoint) {
            setTimetableEntries([]);
            return;
        }

        try {
            setGridLoading(true);
            const res = await fetchApi(endpoint);
            if (res.ok) {
                const data = await res.json();
                setTimetableEntries(data);
            }
        } catch (err) {
            console.error("Failed to load timetable entries", err);
        } finally {
            setGridLoading(false);
        }
    };

    useEffect(() => {
        loadTimetableGrid();
    }, [viewType, selectedSectionId, selectedTeacherId, selectedRoomId]);

    // Fetch and Map teacher availability
    useEffect(() => {
        if (!selectedAvailabilityTeacherId) {
            setAvailabilityMap({});
            return;
        }
        const teacher = teachers.find(t => t.id === selectedAvailabilityTeacherId);
        if (teacher && teacher.availability) {
            const blocked = (teacher.availability as any).blockedSlots || [];
            const mapping: any = {};
            blocked.forEach((slot: any) => {
                mapping[`${slot.dayOfWeek}-${slot.classPeriodId}`] = true;
            });
            setAvailabilityMap(mapping);
        } else {
            setAvailabilityMap({});
        }
    }, [selectedAvailabilityTeacherId, teachers]);

    // Fetch and Map room availability
    useEffect(() => {
        if (!selectedAvailabilityRoomId) {
            setRoomAvailabilityMap({});
            return;
        }
        const room = rooms.find(r => r.id === selectedAvailabilityRoomId);
        if (room && room.availability) {
            const blocked = (room.availability as any).blockedSlots || [];
            const mapping: any = {};
            blocked.forEach((slot: any) => {
                mapping[`${slot.dayOfWeek}-${slot.classPeriodId}`] = true;
            });
            setRoomAvailabilityMap(mapping);
        } else {
            setRoomAvailabilityMap({});
        }
    }, [selectedAvailabilityRoomId, rooms]);

    const handleCreatePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        try {
            const res = await fetchApi("/timetable/periods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newPeriod)
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to create class period");
            }
            setIsPeriodModalOpen(false);
            setNewPeriod({ name: "", startTime: "", endTime: "", isBreak: false });
            loadCoreData();
        } catch (err: any) {
            setFormError(err.message);
        }
    };

    const handleAssignLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!selectedCell || !activeYear) return;

        try {
            const res = await fetchApi("/timetable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId: activeYear.id,
                    teachingAssignmentId: newAssignmentId,
                    classPeriodId: selectedCell.periodId,
                    dayOfWeek: selectedCell.dayOfWeek,
                    roomId: newRoomId || undefined
                })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to assign lesson");
            }
            setIsAssignModalOpen(false);
            setNewAssignmentId("");
            setNewRoomId("");
            loadTimetableGrid();
            
            // Reload assignments count for requirements view
            const assignmentsRes = await fetchApi("/teacher/assignments");
            if (assignmentsRes.ok) {
                const assignData = await assignmentsRes.json();
                setAssignments(assignData);
            }
        } catch (err: any) {
            setFormError(err.message);
        }
    };

    const handleDeleteLesson = async (id: string) => {
        if (!confirm("Are you sure you want to unassign this lesson?")) return;
        try {
            const res = await fetchApi(`/timetable/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete timetable entry");
            loadTimetableGrid();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleUpdateRequirement = async (assignmentId: string, val: number) => {
        try {
            const res = await fetchApi(`/teacher/assignments/${assignmentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ periodsPerWeek: Number(val) })
            });
            if (!res.ok) throw new Error("Failed to update weekly period requirement");
            
            setEditingRequirements(prev => ({ ...prev, [assignmentId]: val }));
            setAssignments(prev => prev.map(as => as.id === assignmentId ? { ...as, periodsPerWeek: val } : as));
        } catch (err: any) {
            alert(err.message);
        }
    };

    const toggleAvailabilitySlot = async (dayOfWeek: number, periodId: string) => {
        if (!selectedAvailabilityTeacherId) return;
        const key = `${dayOfWeek}-${periodId}`;
        const currentlyBlocked = !!availabilityMap[key];
        
        const newMap = { ...availabilityMap, [key]: !currentlyBlocked };
        const blockedSlots: any[] = [];
        Object.keys(newMap).forEach(k => {
            if (newMap[k]) {
                const [d, p] = k.split("-");
                blockedSlots.push({ dayOfWeek: Number(d), classPeriodId: p });
            }
        });

        try {
            const res = await fetchApi(`/timetable/teacher/${selectedAvailabilityTeacherId}/availability`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ availability: { blockedSlots } })
            });
            if (!res.ok) throw new Error("Failed to update availability");
            
            setAvailabilityMap(newMap);
            setTeachers(prev => prev.map(t => t.id === selectedAvailabilityTeacherId ? { ...t, availability: { blockedSlots } } : t));
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Toggle Room availability
    const toggleRoomAvailabilitySlot = async (dayOfWeek: number, periodId: string) => {
        if (!selectedAvailabilityRoomId) return;
        const key = `${dayOfWeek}-${periodId}`;
        const currentlyBlocked = !!roomAvailabilityMap[key];
        
        const newMap = { ...roomAvailabilityMap, [key]: !currentlyBlocked };
        const blockedSlots: any[] = [];
        Object.keys(newMap).forEach(k => {
            if (newMap[k]) {
                const [d, p] = k.split("-");
                blockedSlots.push({ dayOfWeek: Number(d), classPeriodId: p });
            }
        });

        try {
            const res = await fetchApi(`/timetable/room/${selectedAvailabilityRoomId}/availability`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ availability: { blockedSlots } })
            });
            if (!res.ok) throw new Error("Failed to update room availability");
            
            setRoomAvailabilityMap(newMap);
            setRooms(prev => prev.map(r => r.id === selectedAvailabilityRoomId ? { ...r, availability: { blockedSlots } } : r));
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Save Schedule Config & Auto-Generate Periods
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!activeYear) return;

        try {
            const res = await fetchApi("/timetable/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    academicYearId: activeYear.id,
                    ...scheduleConfig
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to save configuration");
            }

            alert("Timetable config saved. Class periods have been auto-generated successfully!");
            loadCoreData();
        } catch (err: any) {
            setFormError(err.message);
        }
    };

    // Add / Edit Room
    const handleSaveRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        try {
            const url = editingRoom ? `/operational/resource/${editingRoom.id}` : "/operational/resource";
            const method = editingRoom ? "PUT" : "POST";
            const res = await fetchApi(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: roomForm.name,
                    type: roomForm.type,
                    capacity: roomForm.capacity ? Number(roomForm.capacity) : null,
                    status: roomForm.status,
                    description: roomForm.description
                })
            });

            if (!res.ok) throw new Error("Failed to save room details");
            
            setIsRoomModalOpen(false);
            setEditingRoom(null);
            setRoomForm({ name: "", type: "CLASSROOM", capacity: "", status: "AVAILABLE", description: "" });
            loadCoreData();
        } catch (err: any) {
            setFormError(err.message);
        }
    };

    const handleDeleteRoom = async (id: string) => {
        if (!confirm("Are you sure you want to delete this room?")) return;
        try {
            const res = await fetchApi(`/operational/resource/${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete room");
            loadCoreData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Render cells helper for grid
    const getCellContent = (dayOfWeek: number, periodId: string) => {
        return timetableEntries.find(entry => entry.dayOfWeek === dayOfWeek && entry.classPeriodId === periodId);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center">
                        <Clock className="w-6 h-6 mr-2 text-[#006b3f]" />
                        Ethiopian MoE Curriculum Timetable & Scheduler
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure school hours, standard periods, classrooms, subject requirements, and build schedules.
                    </p>
                </div>
                {activeYear && (
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e6f3ed] text-[#006b3f] border border-[#c2e5d5]">
                        <Calendar className="w-3.5 h-3.5 mr-1" />
                        Active Calendar: {activeYear.name}
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap border-b border-gray-200 gap-1">
                <button 
                    onClick={() => setActiveTab("grid")}
                    className={`py-3 px-5 font-semibold text-sm border-b-2 transition-colors flex items-center ${activeTab === "grid" ? "border-[#006b3f] text-[#006b3f]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Master Timetable Grid
                </button>
                <button 
                    onClick={() => setActiveTab("config")}
                    className={`py-3 px-5 font-semibold text-sm border-b-2 transition-colors flex items-center ${activeTab === "config" ? "border-[#006b3f] text-[#006b3f]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    <Settings className="w-4 h-4 mr-2" />
                    Schedule Configuration
                </button>
                <button 
                    onClick={() => setActiveTab("rooms")}
                    className={`py-3 px-5 font-semibold text-sm border-b-2 transition-colors flex items-center ${activeTab === "rooms" ? "border-[#006b3f] text-[#006b3f]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    <Building className="w-4 h-4 mr-2" />
                    Rooms / Facilities
                </button>
                <button 
                    onClick={() => setActiveTab("periods")}
                    className={`py-3 px-5 font-semibold text-sm border-b-2 transition-colors flex items-center ${activeTab === "periods" ? "border-[#006b3f] text-[#006b3f]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    <Clock className="w-4 h-4 mr-2" />
                    Period Configurator
                </button>
                <button 
                    onClick={() => setActiveTab("requirements")}
                    className={`py-3 px-5 font-semibold text-sm border-b-2 transition-colors flex items-center ${activeTab === "requirements" ? "border-[#006b3f] text-[#006b3f]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Subject Requirements
                </button>
                <button 
                    onClick={() => setActiveTab("availability")}
                    className={`py-3 px-5 font-semibold text-sm border-b-2 transition-colors flex items-center ${activeTab === "availability" ? "border-[#006b3f] text-[#006b3f]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    <User className="w-4 h-4 mr-2" />
                    Teacher Availability
                </button>
            </div>

            {/* Tab 5: Schedule Configuration */}
            {activeTab === "config" && (
                <Card>
                    <CardHeader className="bg-gray-50/50 py-4 border-b border-gray-200">
                        <CardTitle className="text-gray-800 text-base font-semibold text-gray-900">Configure Weekly School Calendar</CardTitle>
                        <p className="text-xs text-gray-500 mt-1">Define school week timings. Saving will automatically calculate and generate class periods.</p>
                    </CardHeader>
                    <CardContent className="p-6">
                        <form onSubmit={handleSaveConfig} className="space-y-6 max-w-2xl">
                            {formError && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center">
                                    <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0" />
                                    {formError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">School Operating Days</label>
                                <div className="flex flex-wrap gap-4">
                                    {DAYS.map(day => (
                                        <label key={day.value} className="flex items-center space-x-2 text-sm font-medium text-gray-700 select-none">
                                            <input 
                                                type="checkbox"
                                                className="w-4 h-4 rounded text-[#006b3f] focus:ring-[#006b3f]"
                                                checked={scheduleConfig.operatingDays.includes(day.value)}
                                                onChange={(e) => {
                                                    const updated = e.target.checked
                                                        ? [...scheduleConfig.operatingDays, day.value]
                                                        : scheduleConfig.operatingDays.filter(d => d !== day.value);
                                                    setScheduleConfig({ ...scheduleConfig, operatingDays: updated.sort() });
                                                }}
                                            />
                                            <span>{day.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="School Start Time"
                                    type="time"
                                    required
                                    value={scheduleConfig.startTime}
                                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, startTime: e.target.value })}
                                />
                                <Select 
                                    label="School Shift Type"
                                    value={scheduleConfig.shift}
                                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, shift: e.target.value })}
                                    options={[
                                        { value: "FULL", label: "Full Day Shift" },
                                        { value: "MORNING", label: "Morning Only Shift" },
                                        { value: "AFTERNOON", label: "Afternoon Only Shift" }
                                    ]}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                    label="Instructional Period Duration (minutes)"
                                    type="number"
                                    required
                                    min="10"
                                    max="120"
                                    value={scheduleConfig.periodDuration}
                                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, periodDuration: Number(e.target.value) })}
                                />
                                <Input 
                                    label="Number of Periods per Day"
                                    type="number"
                                    required
                                    min="1"
                                    max="15"
                                    value={scheduleConfig.periodsPerDay}
                                    onChange={(e) => setScheduleConfig({ ...scheduleConfig, periodsPerDay: Number(e.target.value) })}
                                />
                            </div>

                            <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-200">
                                <h3 className="text-sm font-semibold text-gray-800">Recess & Break Recesses</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <Input 
                                        label="Short Break Duration (minutes)"
                                        type="number"
                                        value={scheduleConfig.breakDuration}
                                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, breakDuration: Number(e.target.value) })}
                                    />
                                    <Input 
                                        label="Short Break After Period"
                                        type="number"
                                        value={scheduleConfig.breakAfter}
                                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, breakAfter: Number(e.target.value) })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t pt-4 border-gray-200">
                                    <Input 
                                        label="Lunch Break Duration (minutes)"
                                        type="number"
                                        value={scheduleConfig.lunchDuration}
                                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, lunchDuration: Number(e.target.value) })}
                                    />
                                    <Input 
                                        label="Lunch Break After Period"
                                        type="number"
                                        value={scheduleConfig.lunchAfter}
                                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, lunchAfter: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {hasCreatePermission && (
                                <div className="flex justify-end pt-4">
                                    <Button type="submit">
                                        Save & Auto-Generate Periods
                                    </Button>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Tab 6: Rooms / Facilities */}
            {activeTab === "rooms" && (
                <div className="space-y-6">
                    {/* Room sub tabs */}
                    <div className="flex space-x-2 bg-gray-100 p-1.5 rounded-lg w-max shadow-inner">
                        <button 
                            onClick={() => setActiveRoomSubTab("list")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeRoomSubTab === "list" ? "bg-white text-gray-850 shadow" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Rooms List
                        </button>
                        <button 
                            onClick={() => setActiveRoomSubTab("availability")}
                            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeRoomSubTab === "availability" ? "bg-white text-gray-850 shadow" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Room Availability
                        </button>
                    </div>

                    {activeRoomSubTab === "list" && (
                        <Card>
                            <CardHeader className="bg-gray-50/50 py-4 flex flex-row items-center justify-between border-b border-gray-200">
                                <CardTitle className="text-gray-800 text-base font-semibold">School Classrooms & Labs</CardTitle>
                                {hasCreatePermission && (
                                    <Button 
                                        leftIcon={<Plus className="w-4 h-4" />} 
                                        onClick={() => {
                                            setEditingRoom(null);
                                            setRoomForm({ name: "", type: "CLASSROOM", capacity: "", status: "AVAILABLE", description: "" });
                                            setIsRoomModalOpen(true);
                                        }}
                                    >
                                        Add Classroom / Room
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="p-0">
                                {rooms.length === 0 ? (
                                    <div className="p-6 text-center">
                                        <EmptyState title="No rooms configured" message="There are no rooms defined in the system. Create one to assign rooms to scheduled classes." />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto bg-white">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-6 py-3 font-semibold text-gray-900">Room Name/No.</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-900">Type</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-900">Capacity</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-900">Status</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-900 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {rooms.map(room => (
                                                    <tr key={room.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-semibold text-gray-900 flex items-center">
                                                            <Home className="w-4 h-4 mr-2 text-gray-400" />
                                                            {room.name}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 font-semibold">{room.type}</td>
                                                        <td className="px-6 py-4 text-gray-600 font-semibold">{room.capacity || "Unlimited"}</td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${room.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {room.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right space-x-2">
                                                            {hasCreatePermission && (
                                                                <>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="sm" 
                                                                        onClick={() => {
                                                                            setEditingRoom(room);
                                                                            setRoomForm({
                                                                                name: room.name,
                                                                                type: room.type,
                                                                                capacity: room.capacity ? String(room.capacity) : "",
                                                                                status: room.status,
                                                                                description: room.description || ""
                                                                            });
                                                                            setIsRoomModalOpen(true);
                                                                        }}
                                                                    >
                                                                        Edit
                                                                    </Button>
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        className="text-red-500 hover:text-red-700" 
                                                                        size="sm" 
                                                                        onClick={() => handleDeleteRoom(room.id)}
                                                                    >
                                                                        Delete
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {activeRoomSubTab === "availability" && (
                        <div className="space-y-6">
                            <Card className="bg-gray-50/50">
                                <CardContent className="p-4">
                                    <div className="w-96">
                                        <Select 
                                            label="Select Room to Edit Availability"
                                            value={selectedAvailabilityRoomId}
                                            onChange={(e) => setSelectedAvailabilityRoomId(e.target.value)}
                                            options={rooms.map(r => ({ value: r.id, label: `${r.name} (Cap: ${r.capacity || "N/A"})` }))}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {selectedAvailabilityRoomId && periods.length > 0 ? (
                                <Card>
                                    <CardHeader className="bg-gray-50/50 border-b py-4">
                                        <CardTitle className="text-gray-800 text-base font-semibold flex items-center">
                                            <ShieldAlert className="w-5 h-5 mr-2 text-red-500" />
                                            Configure Room Blocked Slots
                                        </CardTitle>
                                        <p className="text-xs text-gray-500 mt-1">Block off slots where the room is unavailable for classes.</p>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto bg-white">
                                            <table className="w-full border-collapse border border-gray-200 min-w-[700px]">
                                                <thead>
                                                    <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b border-gray-200">
                                                        <th className="p-4 border-r text-left w-48 text-gray-900">Period / Time</th>
                                                        {DAYS.map(day => (
                                                            <th key={day.value} className="p-4 border-r text-center w-36 text-gray-900">{day.label}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {periods.map(period => (
                                                        <tr key={period.id} className="hover:bg-gray-50/20">
                                                            <td className="p-4 border-r font-medium bg-white">
                                                                <div className="text-sm text-gray-900">{period.name}</div>
                                                                <div className="text-xs text-gray-500 mt-0.5">{period.startTime} - {period.endTime}</div>
                                                            </td>
                                                            {DAYS.map(day => {
                                                                const key = `${day.value}-${period.id}`;
                                                                const isBlocked = !!roomAvailabilityMap[key];

                                                                if (period.isBreak) {
                                                                    return (
                                                                        <td key={day.value} className="p-4 border-r bg-gray-100/50 text-center text-xs text-gray-400 italic select-none">
                                                                            Break
                                                                        </td>
                                                                    );
                                                                }

                                                                return (
                                                                    <td key={day.value} className="p-4 border-r text-center align-middle bg-white">
                                                                        <button 
                                                                            onClick={() => toggleRoomAvailabilitySlot(day.value, period.id)}
                                                                            className={`w-12 h-10 rounded-lg flex items-center justify-center border font-bold text-[10px] mx-auto shadow-sm transition-all ${isBlocked ? 'bg-red-100 border-red-300 text-red-700' : 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'}`}
                                                                        >
                                                                            {isBlocked ? 'BLOCKED' : 'AVAIL'}
                                                                        </button>
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="text-center py-12 bg-white border border-dashed rounded-lg">
                                    <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500 font-medium">Select a room above to manage unavailable slots.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 1: Timetable Grid */}
            {activeTab === "grid" && (
                <div className="space-y-6">
                    {/* Filter controls */}
                    <Card className="bg-gray-50/50">
                        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">View Schedule For</label>
                                <div className="flex rounded-md shadow-sm">
                                    <button 
                                        onClick={() => setViewType("section")}
                                        className={`flex-1 px-4 py-2 text-xs font-bold rounded-l-md border transition-colors ${viewType === "section" ? "bg-[#006b3f] border-[#006b3f] text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                                    >
                                        Section
                                    </button>
                                    <button 
                                        onClick={() => setViewType("teacher")}
                                        className={`flex-1 px-4 py-2 text-xs font-bold border-y border-r transition-colors ${viewType === "teacher" ? "bg-[#006b3f] border-[#006b3f] text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                                    >
                                        Teacher
                                    </button>
                                    <button 
                                        onClick={() => setViewType("room")}
                                        className={`flex-1 px-4 py-2 text-xs font-bold border-y border-r rounded-r-md transition-colors ${viewType === "room" ? "bg-[#006b3f] border-[#006b3f] text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                                    >
                                        Room
                                    </button>
                                </div>
                            </div>

                            {/* Section filters */}
                            {viewType === "section" && (
                                <>
                                    <div className="w-64">
                                        <Select 
                                            label="Select Grade"
                                            value={selectedGradeId}
                                            onChange={(e) => setSelectedGradeId(e.target.value)}
                                            options={grades.map(g => ({ value: g.id, label: g.grade?.name || g.name }))}
                                        />
                                    </div>
                                    <div className="w-64">
                                        <Select 
                                            label="Select Section"
                                            value={selectedSectionId}
                                            onChange={(e) => setSelectedSectionId(e.target.value)}
                                            options={sections.map(s => ({ value: s.id, label: s.name }))}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Teacher filter */}
                            {viewType === "teacher" && (
                                <div className="w-72">
                                    <Select 
                                        label="Select Teacher"
                                        value={selectedTeacherId}
                                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                                        options={teachers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName} (${t.qualification || "Teacher"})` }))}
                                    />
                                </div>
                            )}

                            {/* Room filter */}
                            {viewType === "room" && (
                                <div className="w-72">
                                    <Select 
                                        label="Select Room"
                                        value={selectedRoomId}
                                        onChange={(e) => setSelectedRoomId(e.target.value)}
                                        options={rooms.map(r => ({ value: r.id, label: `${r.name} (Cap: ${r.capacity || "N/A"})` }))}
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Master Grid Table */}
                    {periods.length === 0 ? (
                        <EmptyState 
                            title="No periods defined" 
                            message="You must define Class Periods first in the 'Schedule Configuration' tab before building schedules." 
                        />
                    ) : (
                        <Card>
                            <CardHeader className="bg-gray-50/50 py-4 flex flex-row items-center justify-between border-b border-gray-200">
                                <CardTitle className="text-gray-800 text-base font-semibold text-gray-900">Master Calendar Grid</CardTitle>
                                {gridLoading && <span className="text-xs text-gray-500 animate-pulse font-medium">Updating grid...</span>}
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-gray-200 min-w-[800px]">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b border-gray-200">
                                                <th className="p-4 border-r border-gray-200 text-left w-48 text-gray-900">Period / Time</th>
                                                {DAYS.map(day => (
                                                    <th key={day.value} className="p-4 border-r border-gray-200 text-center w-40 text-gray-900">{day.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {periods.map(period => (
                                                <tr key={period.id} className="hover:bg-gray-50/20 transition-colors">
                                                    {/* Period Meta */}
                                                    <td className="p-4 border-r border-gray-200 font-medium">
                                                        <div className="text-sm text-gray-900">{period.name}</div>
                                                        <div className="text-xs text-gray-500 flex items-center mt-1 font-semibold">
                                                            <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                                                            {period.startTime} - {period.endTime}
                                                        </div>
                                                    </td>

                                                    {/* Days */}
                                                    {DAYS.map(day => {
                                                        const entry = getCellContent(day.value, period.id);
                                                        
                                                        if (period.isBreak) {
                                                            return (
                                                                <td key={day.value} className="p-4 border-r border-gray-200 bg-orange-50/40 text-center select-none">
                                                                    <span className="text-xs font-bold text-orange-600 tracking-widest uppercase">
                                                                        Break / Recess
                                                                    </span>
                                                                </td>
                                                            );
                                                        }

                                                        return (
                                                            <td key={day.value} className="p-3 border-r border-gray-200 align-middle text-center relative group min-h-[80px]">
                                                                {entry ? (
                                                                    <div className="bg-[#e6f3ed] border border-[#b3dbca] text-[#006b3f] p-3 rounded-lg text-left shadow-sm relative transition-all">
                                                                        <div className="text-xs font-bold uppercase tracking-wider text-[#006b3f]">
                                                                            {entry.teachingAssignment?.subject?.name}
                                                                        </div>
                                                                        
                                                                        {viewType !== "teacher" && (
                                                                            <div className="text-xs mt-1 text-gray-900 flex items-center font-medium">
                                                                                <User className="w-3 h-3 mr-1 text-[#006b3f]" />
                                                                                {entry.teachingAssignment?.teacher?.firstName} {entry.teachingAssignment?.teacher?.lastName}
                                                                            </div>
                                                                        )}

                                                                        {viewType !== "section" && (
                                                                            <div className="text-xs mt-1 text-gray-900 flex items-center font-medium">
                                                                                <GraduationCap className="w-3 h-3 mr-1 text-[#006b3f]" />
                                                                                Section: {entry.teachingAssignment?.section?.name || "All"}
                                                                            </div>
                                                                        )}

                                                                        <div className="text-xs mt-1.5 text-gray-500 font-bold flex items-center">
                                                                            <Home className="w-3 h-3 mr-1 text-gray-400" />
                                                                            {entry.roomId ? rooms.find(r => r.id === entry.roomId)?.name || "Room Assigned" : "No Room"}
                                                                        </div>

                                                                        {hasCreatePermission && (
                                                                            <button 
                                                                                onClick={() => handleDeleteLesson(entry.id)}
                                                                                className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 rounded border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                                                title="Unassign Slot"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    hasCreatePermission ? (
                                                                        <button 
                                                                            onClick={() => {
                                                                                setSelectedCell({ dayOfWeek: day.value, periodId: period.id });
                                                                                setIsAssignModalOpen(true);
                                                                            }}
                                                                            className="w-full min-h-[50px] border border-dashed border-gray-300 rounded-lg hover:border-[#006b3f] hover:bg-[#e6f3ed]/20 transition-all flex items-center justify-center group/btn bg-white"
                                                                        >
                                                                            <Plus className="w-5 h-5 text-gray-300 group-hover/btn:text-[#006b3f] transition-colors" />
                                                                        </button>
                                                                    ) : (
                                                                        <div className="text-xs text-gray-450 italic">Empty Slot</div>
                                                                    )
                                                                )}
                                                            </td>
                                                        );
                                                    })}
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

            {/* Tab 2: Period Configurator */}
            {activeTab === "periods" && (
                <Card>
                    <CardHeader className="bg-gray-50/50 py-4 flex flex-row items-center justify-between border-b border-gray-200">
                        <CardTitle className="text-gray-800 text-base font-semibold">Standard School Periods</CardTitle>
                        {hasCreatePermission && (
                            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsPeriodModalOpen(true)}>
                                Add Period / Break
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-0">
                        {periods.length === 0 ? (
                            <div className="p-6 text-center">
                                <EmptyState title="No periods configured" message="There are no class periods. Create one to begin scheduling." />
                            </div>
                        ) : (
                            <div className="overflow-x-auto bg-white">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold text-gray-900">Name</th>
                                            <th className="px-6 py-3 font-semibold text-gray-900">Start Time</th>
                                            <th className="px-6 py-3 font-semibold text-gray-900">End Time</th>
                                            <th className="px-6 py-3 font-semibold text-gray-900">Type</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {periods.map(period => (
                                            <tr key={period.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-gray-900 flex items-center">
                                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                    {period.name}
                                                </td>
                                                <td className="px-6 py-4 text-gray-650 font-semibold">{period.startTime}</td>
                                                <td className="px-6 py-4 text-gray-650 font-semibold">{period.endTime}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${period.isBreak ? 'bg-orange-100 text-orange-850' : 'bg-blue-100 text-blue-855'}`}>
                                                        {period.isBreak ? 'Break / Recess' : 'Instructional Period'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab 3: Subject Requirements */}
            {activeTab === "requirements" && (
                <Card>
                    <CardHeader className="bg-gray-50/50 py-4 border-b">
                        <CardTitle className="text-gray-800 text-base font-semibold">Configure Weekly Subject Periods</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {assignments.length === 0 ? (
                            <div className="p-6">
                                <EmptyState title="No Teaching Assignments" message="Configure teaching assignments under Teacher Core first." />
                            </div>
                        ) : (
                            <div className="overflow-x-auto bg-white">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold text-gray-900">Teacher</th>
                                            <th className="px-6 py-3 font-semibold text-gray-900">Grade / Section</th>
                                            <th className="px-6 py-3 font-semibold text-gray-900">Subject</th>
                                            <th className="px-6 py-3 font-semibold w-64 text-gray-900">Required Weekly Periods</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {assignments.map(as => (
                                            <tr key={as.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-gray-900">{as.teacher?.firstName} {as.teacher?.lastName}</p>
                                                    <p className="text-xs text-gray-500">{as.teacher?.employeeId || "Staff"}</p>
                                                </td>
                                                <td className="px-6 py-4 text-gray-700 font-semibold">
                                                    {as.schoolGrade?.grade?.name} — {as.section?.name || "All Sections"}
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-gray-900">
                                                    {as.subject?.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {hasCreatePermission ? (
                                                        <div className="flex items-center space-x-2">
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                max="20"
                                                                className="w-20 px-2 py-1.5 border border-gray-300 rounded text-center text-sm font-semibold text-gray-900 bg-white"
                                                                value={editingRequirements[as.id] ?? 0}
                                                                onChange={(e) => setEditingRequirements({ ...editingRequirements, [as.id]: Number(e.target.value) })}
                                                            />
                                                            <button 
                                                                onClick={() => handleUpdateRequirement(as.id, editingRequirements[as.id])}
                                                                className="p-1.5 bg-[#006b3f] hover:bg-[#005230] text-white rounded shadow-sm flex items-center justify-center transition-colors"
                                                                title="Save Requirement"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-gray-900">{as.periodsPerWeek || 0} periods/week</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tab 4: Teacher Availability */}
            {activeTab === "availability" && (
                <div className="space-y-6">
                    <Card className="bg-gray-50/50">
                        <CardContent className="p-4">
                            <div className="w-96">
                                <Select 
                                    label="Select Teacher to Edit Availability"
                                    value={selectedAvailabilityTeacherId}
                                    onChange={(e) => setSelectedAvailabilityTeacherId(e.target.value)}
                                    options={teachers.map(t => ({ value: t.id, label: `${t.firstName} ${t.lastName} (${t.qualification || "Teacher"})` }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {selectedAvailabilityTeacherId && periods.length > 0 ? (
                        <Card>
                            <CardHeader className="bg-gray-50/50 border-b py-4">
                                <CardTitle className="text-gray-800 text-base font-semibold flex items-center">
                                    <ShieldAlert className="w-5 h-5 mr-2 text-red-500" />
                                    Configure Unavailability Blocks
                                </CardTitle>
                                <p className="text-xs text-gray-500 mt-1">Check slots where the teacher is BLOCKED and cannot be scheduled.</p>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto bg-white">
                                    <table className="w-full border-collapse border border-gray-200 min-w-[700px]">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 text-xs font-semibold uppercase border-b border-gray-200">
                                                <th className="p-4 border-r text-left w-48 text-gray-900">Period / Time</th>
                                                {DAYS.map(day => (
                                                    <th key={day.value} className="p-4 border-r text-center w-36 text-gray-900">{day.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {periods.map(period => (
                                                <tr key={period.id} className="hover:bg-gray-50/20">
                                                    <td className="p-4 border-r font-medium bg-white">
                                                        <div className="text-sm text-gray-900">{period.name}</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">{period.startTime} - {period.endTime}</div>
                                                    </td>
                                                    {DAYS.map(day => {
                                                        const key = `${day.value}-${period.id}`;
                                                        const isBlocked = !!availabilityMap[key];

                                                        if (period.isBreak) {
                                                            return (
                                                                <td key={day.value} className="p-4 border-r bg-gray-100/50 text-center text-xs text-gray-400 italic select-none">
                                                                    Break
                                                                </td>
                                                            );
                                                        }

                                                        return (
                                                            <td key={day.value} className="p-4 border-r text-center align-middle bg-white">
                                                                <button 
                                                                    onClick={() => toggleAvailabilitySlot(day.value, period.id)}
                                                                    className={`w-12 h-10 rounded-lg flex items-center justify-center border font-bold text-[10px] mx-auto shadow-sm transition-all ${isBlocked ? 'bg-red-100 border-red-300 text-red-700' : 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'}`}
                                                                >
                                                                    {isBlocked ? 'BLOCKED' : 'AVAIL'}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="text-center py-12 bg-white border border-dashed rounded-lg">
                            <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 font-medium">Select a teacher above to manage availability slots.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal 1: Add/Configure Period */}
            <Modal isOpen={isPeriodModalOpen} onClose={() => setIsPeriodModalOpen(false)} title="Add Class Period / Break">
                <form onSubmit={handleCreatePeriod} className="space-y-4">
                    {formError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center">
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            {formError}
                        </div>
                    )}

                    <Input 
                        label="Period Name (e.g. Period 1, Recess, Lunch)"
                        required
                        value={newPeriod.name}
                        onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Start Time"
                            type="time"
                            required
                            value={newPeriod.startTime}
                            onChange={(e) => setNewPeriod({ ...newPeriod, startTime: e.target.value })}
                        />
                        <Input 
                            label="End Time"
                            type="time"
                            required
                            value={newPeriod.endTime}
                            onChange={(e) => setNewPeriod({ ...newPeriod, endTime: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <input 
                            type="checkbox"
                            id="isBreak"
                            className="w-4 h-4 rounded text-[#006b3f] focus:ring-[#006b3f]"
                            checked={newPeriod.isBreak}
                            onChange={(e) => setNewPeriod({ ...newPeriod, isBreak: e.target.checked })}
                        />
                        <label htmlFor="isBreak" className="text-sm font-semibold text-gray-700 select-none">
                            This is a Break (e.g. Recess, Lunch recess)
                        </label>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="ghost" onClick={() => setIsPeriodModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Create Period</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal 2: Assign Lesson */}
            <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Schedule Lesson Slot">
                <form onSubmit={handleAssignLesson} className="space-y-4">
                    {formError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center">
                            <ShieldAlert className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {selectedCell && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 font-semibold">
                            Slot: {DAYS.find(d => d.value === selectedCell.dayOfWeek)?.label} | {periods.find(p => p.id === selectedCell.periodId)?.name} ({periods.find(p => p.id === selectedCell.periodId)?.startTime} - {periods.find(p => p.id === selectedCell.periodId)?.endTime})
                        </div>
                    )}

                    <Select 
                        label="Select Teaching Assignment"
                        required
                        value={newAssignmentId}
                        onChange={(e) => setNewAssignmentId(e.target.value)}
                        options={assignments.map(as => ({
                            value: as.id,
                            label: `${as.subject?.name} - ${as.teacher?.firstName} ${as.teacher?.lastName} (${as.schoolGrade?.grade?.name || ""} ${as.section?.name || "All"})`
                        }))}
                    />

                    <Select 
                        label="Select Classroom / Room"
                        value={newRoomId}
                        onChange={(e) => setNewRoomId(e.target.value)}
                        options={rooms.map(r => ({
                            value: r.id,
                            label: `${r.name} (Capacity: ${r.capacity || "N/A"})`
                        }))}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Assign Slot</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal 3: Add/Edit Room */}
            <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} title={editingRoom ? "Edit Room Details" : "Register School Room/Facility"}>
                <form onSubmit={handleSaveRoom} className="space-y-4">
                    {formError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center">
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            {formError}
                        </div>
                    )}

                    <Input 
                        label="Room Name/Number (e.g. Room 201, Chemistry Lab)"
                        required
                        value={roomForm.name}
                        onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select 
                            label="Room Type"
                            value={roomForm.type}
                            onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
                            options={[
                                { value: "CLASSROOM", label: "Normal Classroom" },
                                { value: "LAB", label: "Laboratory" },
                                { value: "LIBRARY", label: "Library" },
                                { value: "SPORTS_FACILITY", label: "Sports Facility" },
                                { value: "OTHER", label: "Other facility" }
                            ]}
                        />
                        <Input 
                            label="Room Capacity (Student Seats)"
                            type="number"
                            value={roomForm.capacity}
                            onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                        />
                    </div>

                    <Select 
                        label="Room Availability Status"
                        value={roomForm.status}
                        onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                        options={[
                            { value: "AVAILABLE", label: "Available for classes" },
                            { value: "MAINTENANCE", label: "Under Maintenance" }
                        ]}
                    />

                    <Input 
                        label="Brief Description"
                        value={roomForm.description}
                        onChange={(e) => setRoomForm({ ...roomForm, description: e.target.value })}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="ghost" onClick={() => setIsRoomModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Room</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
