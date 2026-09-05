"use client";

import { useEffect, useState, useMemo } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Calendar as CalendarIcon, 
    Plus, 
    Trash2, 
    Edit3, 
    CheckCircle2, 
    AlertTriangle, 
    Clock, 
    Sparkles, 
    ChevronLeft, 
    ChevronRight, 
    Filter, 
    BookOpen, 
    Award, 
    Coffee, 
    Flag, 
    Lock, 
    Unlock, 
    Eye, 
    List, 
    CalendarDays, 
    BarChart2, 
    Info, 
    Check, 
    X,
    Bell
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";

// --- Types ---
interface AcademicPeriodItem {
    id: string;
    academicCalendarId: string;
    name: string;
    startDate: string;
    endDate: string;
    type: string;
}

interface CalendarEventItem {
    id: string;
    academicCalendarId: string;
    academicPeriodId?: string | null;
    title: string;
    category: "ACADEMIC_PERIOD" | "EXAMINATION" | "HOLIDAY_BREAK" | "SCHOOL_EVENT";
    type: string;
    startDate: string;
    endDate: string;
    isAllDay: boolean;
    isSchoolClosed: boolean;
    isExternal: boolean;
    description?: string | null;
    source: "SYSTEM" | "SCHOOL" | "IMPORTED";
    isConfigurable: boolean;
    status: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
    academicPeriod?: AcademicPeriodItem | null;
    createdBy?: { id: string; name: string; email: string } | null;
    updatedBy?: { id: string; name: string; email: string } | null;
    createdAt?: string;
    updatedAt?: string;
}

interface AcademicCalendarData {
    id: string;
    academicYearId: string;
    description?: string;
    status: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";
    publishedAt?: string | null;
    periods: AcademicPeriodItem[];
    events: CalendarEventItem[];
}

interface SuggestedHoliday {
    title: string;
    type: string;
    category: string;
    suggestedStartDate: string;
    suggestedEndDate: string;
    isSchoolClosedDefault: boolean;
    description: string;
    religiousOrNationalContext: string;
    isAdded?: boolean;
    existingEventId?: string | null;
}

type CalendarViewMode = "month" | "agenda" | "timeline";

export default function AcademicCalendarPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [calendar, setCalendar] = useState<AcademicCalendarData | null>(null);
    const [loading, setLoading] = useState(true);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // View mode & filters
    const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    const [periodFilter, setPeriodFilter] = useState<string>("ALL");
    const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());

    // Modals
    const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isHolidaySuggestionsOpen, setIsHolidaySuggestionsOpen] = useState(false);
    const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEventItem | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    // Period form
    const [periodForm, setPeriodForm] = useState({
        name: "Semester 1",
        type: "SEMESTER",
        startDate: "",
        endDate: ""
    });
    const [submittingPeriod, setSubmittingPeriod] = useState(false);
    const [periodError, setPeriodError] = useState<string | null>(null);

    // Event form
    const [eventForm, setEventForm] = useState({
        title: "",
        category: "EXAMINATION",
        type: "MIDTERM_EXAM",
        academicPeriodId: "",
        startDate: "",
        endDate: "",
        isSchoolClosed: false,
        description: ""
    });
    const [submittingEvent, setSubmittingEvent] = useState(false);
    const [eventError, setEventError] = useState<string | null>(null);
    const [eventWarnings, setEventWarnings] = useState<string[]>([]);

    // Holiday suggestions
    const [suggestedHolidays, setSuggestedHolidays] = useState<SuggestedHoliday[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [confirmingHolidayIndex, setConfirmingHolidayIndex] = useState<number | null>(null);

    // Permissions
    const hasManagePermission = authData?.access.some(acc =>
        ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => ["ACADEMIC:CREATE", "ACADEMIC:UPDATE", "ACADEMIC:MANAGE"].includes(p.permission?.name))
    );

    const isPrincipalOrAdmin = authData?.access.some(acc =>
        ["ADMIN", "SCHOOL_ADMIN"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => ["ACADEMIC:MANAGE"].includes(p.permission?.name))
    );

    const selectedYear = years.find(y => y.id === selectedYearId) || null;

    // Load academic years
    const loadYears = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/academic/years");
            if (!res.ok) throw new Error("Failed to load academic years");
            const data: AcademicYear[] = await res.json();
            setYears(data);

            if (data.length > 0) {
                const active = data.find(y => y.status === "ACTIVE");
                const initialYear = active || data[0];
                setSelectedYearId(initialYear.id);
                // Synchronize month view to start of academic year
                if (initialYear.startDate) {
                    setCurrentMonthDate(new Date(initialYear.startDate));
                }
            }
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load academic years");
        } finally {
            setLoading(false);
        }
    };

    // Load calendar
    const loadCalendar = async (yearId: string) => {
        if (!yearId) return;
        try {
            setCalendarLoading(true);
            const res = await fetchApi(`/academic/years/${yearId}/calendar`);
            if (res.ok) {
                const data = await res.json();
                setCalendar(data);
            } else {
                setCalendar(null);
            }
        } catch (err: any) {
            console.error("Error loading calendar:", err);
            setCalendar(null);
        } finally {
            setCalendarLoading(false);
        }
    };

    // Load Ethiopian holiday suggestions
    const loadHolidaySuggestions = async () => {
        if (!selectedYearId) return;
        try {
            setLoadingSuggestions(true);
            const res = await fetchApi(`/academic/years/${selectedYearId}/suggested-holidays`);
            if (res.ok) {
                const data: SuggestedHoliday[] = await res.json();
                setSuggestedHolidays(data);
            }
        } catch (err) {
            console.error("Failed to fetch suggested holidays", err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    useEffect(() => {
        loadYears();
    }, []);

    useEffect(() => {
        if (selectedYearId) {
            loadCalendar(selectedYearId);
            loadHolidaySuggestions();
            const yr = years.find(y => y.id === selectedYearId);
            if (yr?.startDate) {
                setCurrentMonthDate(new Date(yr.startDate));
            }
        }
    }, [selectedYearId]);

    // Handle Calendar Creation
    const handleCreateCalendar = async () => {
        if (!selectedYearId) return;
        try {
            setCalendarLoading(true);
            const res = await fetchApi(`/academic/years/${selectedYearId}/calendar`, {
                method: "POST",
                body: JSON.stringify({ description: `${selectedYear?.name} Official Academic Calendar` })
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to initialize calendar");
            }
            await loadCalendar(selectedYearId);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCalendarLoading(false);
        }
    };

    // Handle Publish / Unpublish Lifecycle
    const handlePublishCalendar = async () => {
        if (!calendar) return;
        if (!confirm("Are you sure you want to officially PUBLISH this academic calendar? Once published, this calendar becomes authoritative across the school.")) {
            return;
        }

        try {
            setCalendarLoading(true);
            const res = await fetchApi(`/academic/calendars/${calendar.id}/publish`, {
                method: "POST"
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to publish calendar");
            }
            await loadCalendar(selectedYearId);
            alert("✅ Academic calendar officially published! All terms, holidays, and examination schedules are now active.");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCalendarLoading(false);
        }
    };

    const handleUnpublishCalendar = async () => {
        if (!calendar) return;
        if (!confirm("Reopening this calendar will place it back into REVIEW status for revisions. An audit log entry will be recorded. Proceed?")) {
            return;
        }

        try {
            setCalendarLoading(true);
            const res = await fetchApi(`/academic/calendars/${calendar.id}/unpublish`, {
                method: "POST"
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to unpublish calendar");
            }
            await loadCalendar(selectedYearId);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCalendarLoading(false);
        }
    };

    // Handle Period Submission
    const handleCreatePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!calendar) return;

        if (!periodForm.name.trim()) return setPeriodError("Period name is required");
        if (!periodForm.startDate || !periodForm.endDate) return setPeriodError("Start date and end date are required");

        const start = new Date(periodForm.startDate);
        const end = new Date(periodForm.endDate);

        if (start >= end) {
            return setPeriodError("Start date must be strictly before end date");
        }

        if (selectedYear) {
            const yStart = new Date(selectedYear.startDate);
            const yEnd = new Date(selectedYear.endDate);
            if (start < yStart || end > yEnd) {
                return setPeriodError(`Dates must fall within academic year boundary (${selectedYear.startDate.slice(0, 10)} to ${selectedYear.endDate.slice(0, 10)})`);
            }
        }

        setSubmittingPeriod(true);
        setPeriodError(null);

        try {
            const res = await fetchApi(`/academic/calendars/${calendar.id}/periods`, {
                method: "POST",
                body: JSON.stringify(periodForm)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to create academic period");
            }

            await loadCalendar(selectedYearId);
            setIsPeriodModalOpen(false);
            setPeriodForm({
                name: calendar.periods.length === 0 ? "Semester 2" : `Period ${calendar.periods.length + 1}`,
                type: "SEMESTER",
                startDate: "",
                endDate: ""
            });
        } catch (err: any) {
            setPeriodError(err.message);
        } finally {
            setSubmittingPeriod(false);
        }
    };

    const handleDeletePeriod = async (periodId: string) => {
        if (!confirm("Are you sure you want to remove this academic period?")) return;
        try {
            const res = await fetchApi(`/academic/calendars/periods/${periodId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to delete academic period");
            }
            await loadCalendar(selectedYearId);
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Open Event Modal
    const openCreateEventModal = (prefillDate?: string) => {
        setEditingEventId(null);
        setEventForm({
            title: "",
            category: "EXAMINATION",
            type: "MIDTERM_EXAM",
            academicPeriodId: calendar?.periods[0]?.id || "",
            startDate: prefillDate || "",
            endDate: prefillDate || "",
            isSchoolClosed: false,
            description: ""
        });
        setEventError(null);
        setEventWarnings([]);
        setIsEventModalOpen(true);
    };

    const openEditEventModal = (ev: CalendarEventItem) => {
        setEditingEventId(ev.id);
        setEventForm({
            title: ev.title,
            category: ev.category,
            type: ev.type,
            academicPeriodId: ev.academicPeriodId || "",
            startDate: ev.startDate.slice(0, 10),
            endDate: ev.endDate.slice(0, 10),
            isSchoolClosed: ev.isSchoolClosed,
            description: ev.description || ""
        });
        setEventError(null);
        setEventWarnings([]);
        setIsEventModalOpen(true);
    };

    // Handle Event Save
    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!calendar) return;

        setSubmittingEvent(true);
        setEventError(null);

        try {
            const payload = {
                ...eventForm,
                academicPeriodId: eventForm.academicPeriodId || undefined
            };

            const url = editingEventId 
                ? `/academic/calendars/events/${editingEventId}`
                : `/academic/calendars/${calendar.id}/events`;
            
            const method = editingEventId ? "PUT" : "POST";

            const res = await fetchApi(url, {
                method,
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to save calendar event");
            }

            const data = await res.json();
            if (data.warnings && data.warnings.length > 0) {
                setEventWarnings(data.warnings);
            }

            await loadCalendar(selectedYearId);
            await loadHolidaySuggestions();

            // If there are warnings, keep modal open to notify user, otherwise close
            if (!data.warnings || data.warnings.length === 0) {
                setIsEventModalOpen(false);
            } else {
                alert(`Event saved successfully with notices:\n\n${data.warnings.join("\n")}`);
                setIsEventModalOpen(false);
            }
        } catch (err: any) {
            setEventError(err.message);
        } finally {
            setSubmittingEvent(false);
        }
    };

    // Delete Event
    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm("Are you sure you want to delete this event from the academic calendar?")) return;
        try {
            const res = await fetchApi(`/academic/calendars/events/${eventId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete calendar event");
            }
            await loadCalendar(selectedYearId);
            await loadHolidaySuggestions();
            if (selectedEventDetails?.id === eventId) {
                setSelectedEventDetails(null);
            }
        } catch (err: any) {
            alert(err.message);
        }
    };

    // Confirm suggested holiday
    const handleConfirmHoliday = async (sug: SuggestedHoliday, index: number) => {
        if (!calendar) return;
        setConfirmingHolidayIndex(index);
        try {
            const res = await fetchApi(`/academic/calendars/${calendar.id}/confirm-holiday`, {
                method: "POST",
                body: JSON.stringify({
                    title: sug.title,
                    suggestedStartDate: sug.suggestedStartDate,
                    suggestedEndDate: sug.suggestedEndDate,
                    type: sug.type,
                    isSchoolClosed: sug.isSchoolClosedDefault,
                    description: sug.description
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to import holiday");
            }

            await loadCalendar(selectedYearId);
            await loadHolidaySuggestions();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setConfirmingHolidayIndex(null);
        }
    };

    // Filtered events
    const filteredEvents = useMemo(() => {
        if (!calendar?.events) return [];
        return calendar.events.filter(ev => {
            if (categoryFilter !== "ALL" && ev.category !== categoryFilter) {
                return false;
            }
            if (periodFilter !== "ALL" && ev.academicPeriodId !== periodFilter) {
                return false;
            }
            return true;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [calendar?.events, categoryFilter, periodFilter]);

    // Unadded holiday count
    const pendingHolidayCount = useMemo(() => {
        return suggestedHolidays.filter(s => !s.isAdded).length;
    }, [suggestedHolidays]);

    // Helpers for event styling & badges
    const getEventBadge = (category: string, type: string, isClosed: boolean) => {
        if (isClosed) {
            return {
                bg: "bg-amber-100 text-amber-900 border-amber-300",
                dot: "bg-amber-600",
                icon: <Coffee className="w-3 h-3 text-amber-700" />,
                label: "School Closed"
            };
        }
        switch (category) {
            case "EXAMINATION":
                return {
                    bg: "bg-indigo-100 text-indigo-900 border-indigo-300",
                    dot: "bg-indigo-600",
                    icon: <Award className="w-3 h-3 text-indigo-700" />,
                    label: type.replace("_", " ")
                };
            case "HOLIDAY_BREAK":
                return {
                    bg: "bg-sky-100 text-sky-900 border-sky-300",
                    dot: "bg-sky-600",
                    icon: <Flag className="w-3 h-3 text-sky-700" />,
                    label: type.replace("_", " ")
                };
            case "SCHOOL_EVENT":
                return {
                    bg: "bg-emerald-100 text-emerald-900 border-emerald-300",
                    dot: "bg-emerald-600",
                    icon: <BookOpen className="w-3 h-3 text-emerald-700" />,
                    label: type.replace("_", " ")
                };
            default:
                return {
                    bg: "bg-gray-100 text-gray-800 border-gray-300",
                    dot: "bg-gray-600",
                    icon: <CalendarIcon className="w-3 h-3 text-gray-600" />,
                    label: "Event"
                };
        }
    };

    // Calendar grid calculations for Month view
    const monthCalendarGrid = useMemo(() => {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
        const totalDays = lastDayOfMonth.getDate();

        const days: { date: Date; dateStr: string; isCurrentMonth: boolean; events: CalendarEventItem[] }[] = [];

        // Previous month padding
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const d = new Date(year, month - 1, prevMonthLastDay - i);
            const dStr = d.toISOString().slice(0, 10);
            days.push({
                date: d,
                dateStr: dStr,
                isCurrentMonth: false,
                events: []
            });
        }

        // Current month days
        for (let d = 1; d <= totalDays; d++) {
            const dateObj = new Date(year, month, d);
            const dStr = dateObj.toISOString().slice(0, 10);
            const dayEvents = (calendar?.events || []).filter(ev => {
                const s = ev.startDate.slice(0, 10);
                const e = ev.endDate.slice(0, 10);
                return dStr >= s && dStr <= e;
            });

            days.push({
                date: dateObj,
                dateStr: dStr,
                isCurrentMonth: true,
                events: dayEvents
            });
        }

        // Next month padding to fill complete grid of 35 or 42
        const remaining = (7 - (days.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            const dStr = d.toISOString().slice(0, 10);
            days.push({
                date: d,
                dateStr: dStr,
                isCurrentMonth: false,
                events: []
            });
        }

        return days;
    }, [currentMonthDate, calendar?.events]);

    const handlePrevMonth = () => {
        setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    if (loading) {
        return <LoadingState message="Loading Ethiopian academic calendar workspace..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadYears} />;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-16">
            {/* Header & Academic Year Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#006b3f] to-emerald-500 flex items-center justify-center text-white shadow-sm">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                Ethiopian School Academic Calendar
                                {calendar?.status && (
                                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                                        calendar.status === "PUBLISHED" 
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                            : calendar.status === "REVIEW"
                                            ? "bg-blue-50 text-blue-800 border-blue-300"
                                            : "bg-amber-50 text-amber-800 border-amber-300"
                                    }`}>
                                        {calendar.status === "PUBLISHED" ? "🔒 Official Published" : `State: ${calendar.status}`}
                                    </span>
                                )}
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Institutional semesters, examination windows, national Ethiopian holidays, and instructional breaks.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Ethiopian Holiday Suggestions Trigger */}
                    {calendar && (
                        <button
                            onClick={() => setIsHolidaySuggestionsOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 text-amber-900 border border-amber-300 shadow-sm transition-all"
                        >
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            Ethiopian Holiday Suggestions
                            {pendingHolidayCount > 0 && (
                                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                    {pendingHolidayCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Academic Year Switcher */}
                    <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm text-xs">
                        <span className="font-semibold text-gray-500 uppercase tracking-wider">Year:</span>
                        <select
                            value={selectedYearId}
                            onChange={(e) => setSelectedYearId(e.target.value)}
                            className="bg-transparent text-gray-900 font-bold focus:outline-none cursor-pointer"
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} ({y.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Publish / Unpublish Action Button */}
                    {calendar && isPrincipalOrAdmin && (
                        calendar.status === "PUBLISHED" ? (
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                leftIcon={<Unlock className="w-3.5 h-3.5 text-gray-600" />}
                                onClick={handleUnpublishCalendar}
                                className="text-xs border border-gray-300"
                            >
                                Reopen for Review
                            </Button>
                        ) : (
                            <Button 
                                size="sm" 
                                leftIcon={<Lock className="w-3.5 h-3.5" />}
                                onClick={handlePublishCalendar}
                                className="text-xs bg-[#006b3f] hover:bg-[#005230] text-white shadow"
                            >
                                Publish Calendar
                            </Button>
                        )
                    )}
                </div>
            </div>

            {/* Calendar Structure Initializer if none exists */}
            {calendarLoading ? (
                <LoadingState message="Loading calendar structure & schedules..." />
            ) : !calendar ? (
                <Card className="border-dashed border-2 border-emerald-300 bg-emerald-50/20 text-center py-14 shadow-none">
                    <CardContent className="space-y-4 max-w-md mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#006b3f] flex items-center justify-center mx-auto shadow-sm">
                            <CalendarIcon className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Academic Calendar Not Initialized</h3>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                Establish the authoritative operational calendar for <strong>{selectedYear?.name}</strong> to configure semesters, schedule examinations, and confirm Ethiopian holidays.
                            </p>
                        </div>
                        {hasManagePermission && (
                            <Button onClick={handleCreateCalendar} leftIcon={<Plus className="w-4 h-4" />}>
                                Initialize {selectedYear?.name} Calendar
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Top Operational Banner */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border bg-white shadow-sm">
                        <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${
                                calendar.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                            }`}>
                                {calendar.status === "PUBLISHED" ? <Lock className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-bold text-sm text-gray-900">
                                        {selectedYear?.name} Academic Calendar
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono">
                                        ({selectedYear?.startDate.slice(0, 10)} to {selectedYear?.endDate.slice(0, 10)})
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {calendar.periods.length} Semesters configured • {calendar.events.length} Events & Holidays recorded
                                    {calendar.publishedAt && ` • Published ${new Date(calendar.publishedAt).toLocaleDateString()}`}
                                </p>
                            </div>
                        </div>

                        {/* Quick Action Buttons */}
                        {hasManagePermission && (
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm" 
                                    variant="secondary"
                                    leftIcon={<Plus className="w-3.5 h-3.5" />} 
                                    onClick={() => setIsPeriodModalOpen(true)}
                                    className="text-xs"
                                >
                                    Add Semester
                                </Button>
                                <Button 
                                    size="sm" 
                                    leftIcon={<Plus className="w-3.5 h-3.5" />} 
                                    onClick={() => openCreateEventModal()}
                                    className="text-xs"
                                >
                                    Add Event / Exam
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* View Mode Toolbar & Filters */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                        {/* View Switcher */}
                        <div className="flex items-center bg-white rounded-lg p-1 border border-gray-200 shadow-xs">
                            <button
                                onClick={() => setViewMode("month")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    viewMode === "month" ? "bg-[#006b3f] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                <CalendarDays className="w-3.5 h-3.5" />
                                Month View
                            </button>
                            <button
                                onClick={() => setViewMode("agenda")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    viewMode === "agenda" ? "bg-[#006b3f] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                <List className="w-3.5 h-3.5" />
                                List / Agenda
                            </button>
                            <button
                                onClick={() => setViewMode("timeline")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    viewMode === "timeline" ? "bg-[#006b3f] text-white shadow-xs" : "text-gray-600 hover:text-gray-900"
                                }`}
                            >
                                <BarChart2 className="w-3.5 h-3.5" />
                                Year Timeline
                            </button>
                        </div>

                        {/* Filter Selectors */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                <span className="font-semibold">Category:</span>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="bg-white border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-800 font-medium"
                                >
                                    <option value="ALL">All Categories</option>
                                    <option value="EXAMINATION">Examinations</option>
                                    <option value="HOLIDAY_BREAK">Holidays & Breaks</option>
                                    <option value="SCHOOL_EVENT">School Events</option>
                                </select>
                            </div>

                            <div className="flex items-center space-x-1.5 text-xs text-gray-500">
                                <span className="font-semibold">Semester:</span>
                                <select
                                    value={periodFilter}
                                    onChange={(e) => setPeriodFilter(e.target.value)}
                                    className="bg-white border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-800 font-medium"
                                >
                                    <option value="ALL">All Semesters</option>
                                    {calendar.periods.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* MAIN VIEW: Month View */}
                    {viewMode === "month" && (
                        <Card className="shadow-sm border border-gray-200 overflow-hidden">
                            {/* Month Navigation Header */}
                            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
                                <div className="flex items-center space-x-3">
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {currentMonthDate.toLocaleString("default", { month: "long" })} {currentMonthDate.getFullYear()}
                                    </h2>
                                    <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                                        {filteredEvents.length} events
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={handlePrevMonth}
                                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                                        title="Previous Month"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentMonthDate(new Date())}
                                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={handleNextMonth}
                                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                                        title="Next Month"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* 7 Days of Week Header */}
                            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center py-2 text-xs font-bold text-gray-500 uppercase">
                                <div>Sun</div>
                                <div>Mon</div>
                                <div>Tue</div>
                                <div>Wed</div>
                                <div>Thu</div>
                                <div>Fri</div>
                                <div>Sat</div>
                            </div>

                            {/* 35/42 Days Grid */}
                            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-gray-100">
                                {monthCalendarGrid.map((day, idx) => {
                                    const isToday = day.dateStr === new Date().toISOString().slice(0, 10);
                                    return (
                                        <div
                                            key={idx}
                                            className={`min-h-[110px] p-1.5 flex flex-col justify-between transition-colors ${
                                                day.isCurrentMonth ? "bg-white" : "bg-gray-50/60 text-gray-400"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                                    isToday 
                                                        ? "bg-[#006b3f] text-white" 
                                                        : day.isCurrentMonth ? "text-gray-800" : "text-gray-400"
                                                }`}>
                                                    {day.date.getDate()}
                                                </span>

                                                {hasManagePermission && day.isCurrentMonth && (
                                                    <button
                                                        onClick={() => openCreateEventModal(day.dateStr)}
                                                        className="text-gray-300 hover:text-emerald-700 p-0.5 rounded opacity-0 hover:opacity-100 transition-opacity"
                                                        title="Add event on this date"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Event Pills */}
                                            <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                                                {day.events.slice(0, 3).map(ev => {
                                                    const badge = getEventBadge(ev.category, ev.type, ev.isSchoolClosed);
                                                    return (
                                                        <button
                                                            key={ev.id}
                                                            onClick={() => setSelectedEventDetails(ev)}
                                                            className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 border ${badge.bg}`}
                                                            title={`${ev.title} (${badge.label})`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                                                            <span className="truncate">{ev.title}</span>
                                                        </button>
                                                    );
                                                })}
                                                {day.events.length > 3 && (
                                                    <div className="text-[10px] text-gray-500 font-semibold px-1">
                                                        +{day.events.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* MAIN VIEW: Agenda / List View */}
                    {viewMode === "agenda" && (
                        <Card className="shadow-sm">
                            <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-base font-bold text-gray-900">Academic Schedule Agenda</CardTitle>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Chronological sequence of instructional terms, examination windows, and holidays.
                                    </p>
                                </div>
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    {filteredEvents.length} items listed
                                </span>
                            </CardHeader>
                            <CardContent className="p-0">
                                {filteredEvents.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">
                                        <CalendarIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                                        <p className="font-semibold text-sm">No events match the selected filters.</p>
                                        <p className="text-xs text-gray-400 mt-1">Add events or review suggested Ethiopian holidays to populate the agenda.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-3.5 font-semibold">Event / Term Title</th>
                                                    <th className="px-6 py-3.5 font-semibold">Category & Type</th>
                                                    <th className="px-6 py-3.5 font-semibold">Dates</th>
                                                    <th className="px-6 py-3.5 font-semibold">School Session</th>
                                                    <th className="px-6 py-3.5 font-semibold">Semester</th>
                                                    <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {filteredEvents.map(ev => {
                                                    const badge = getEventBadge(ev.category, ev.type, ev.isSchoolClosed);
                                                    return (
                                                        <tr key={ev.id} className="hover:bg-gray-50/70 transition-colors">
                                                            <td className="px-6 py-3.5 font-bold text-gray-900">
                                                                <button
                                                                    onClick={() => setSelectedEventDetails(ev)}
                                                                    className="hover:underline flex items-center gap-2 text-left"
                                                                >
                                                                    {badge.icon}
                                                                    {ev.title}
                                                                </button>
                                                                {ev.description && (
                                                                    <p className="text-xs text-gray-500 font-normal mt-0.5 line-clamp-1">
                                                                        {ev.description}
                                                                    </p>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3.5">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                                                    {ev.type.replace("_", " ")}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3.5 text-xs text-gray-700 font-medium">
                                                                {ev.startDate.slice(0, 10)}
                                                                {ev.startDate.slice(0, 10) !== ev.endDate.slice(0, 10) && ` to ${ev.endDate.slice(0, 10)}`}
                                                            </td>
                                                            <td className="px-6 py-3.5">
                                                                {ev.isSchoolClosed ? (
                                                                    <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                                        School Closed
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-gray-600">Regular Session</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3.5 text-xs text-gray-600">
                                                                {ev.academicPeriod?.name || "Calendar-wide"}
                                                            </td>
                                                            <td className="px-6 py-3.5 text-right space-x-1">
                                                                <button
                                                                    onClick={() => setSelectedEventDetails(ev)}
                                                                    className="p-1.5 text-gray-500 hover:text-gray-800 rounded hover:bg-gray-100"
                                                                    title="View Details"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                {hasManagePermission && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => openEditEventModal(ev)}
                                                                            className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50"
                                                                            title="Edit Event"
                                                                        >
                                                                            <Edit3 className="w-4 h-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteEvent(ev.id)}
                                                                            className="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50"
                                                                            title="Delete Event"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* MAIN VIEW: Year Timeline */}
                    {viewMode === "timeline" && (
                        <div className="space-y-6">
                            {/* Academic Periods Breakdown */}
                            <Card className="shadow-sm">
                                <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base font-bold text-gray-900">Academic Semesters & Term Bounds</CardTitle>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Macro instruction terms. Ethiopian General Education standard mandates Semester 1 and Semester 2.
                                        </p>
                                    </div>
                                    {hasManagePermission && (
                                        <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsPeriodModalOpen(true)}>
                                            Add Semester
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-gray-100">
                                        {calendar.periods.map((p, idx) => {
                                            const pStart = new Date(p.startDate);
                                            const pEnd = new Date(p.endDate);
                                            const diffWeeks = Math.max(1, Math.round((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24 * 7)));
                                            const childEvents = calendar.events.filter(ev => ev.academicPeriodId === p.id);

                                            return (
                                                <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#006b3f] flex items-center justify-center font-bold text-sm shrink-0">
                                                            S{idx + 1}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                                    {p.type}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {p.startDate.slice(0, 10)} to {p.endDate.slice(0, 10)} (~{diffWeeks} instructional weeks)
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {childEvents.length} scheduled exam(s) and term event(s) attached
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        {hasManagePermission && (
                                                            <button
                                                                onClick={() => handleDeletePeriod(p.id)}
                                                                className="text-xs text-red-600 hover:text-red-800 px-2.5 py-1.5 rounded-md hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                                                            >
                                                                Remove Period
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Readiness Checklist */}
                            <Card className="bg-gray-50/70 border border-gray-200">
                                <CardHeader className="py-3">
                                    <CardTitle className="text-sm font-bold text-gray-800">Academic Structure Readiness</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-xs">
                                    <div className="flex items-center space-x-2">
                                        {calendar.periods.length >= 2 ? (
                                            <CheckCircle2 className="w-4 h-4 text-[#006b3f]" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        )}
                                        <span className={calendar.periods.length >= 2 ? "text-gray-700 font-medium" : "text-amber-800 font-medium"}>
                                            {calendar.periods.length >= 2
                                                ? "Academic periods properly scheduled (2+ semesters configured)."
                                                : "Recommended: Ethiopian schools require at least 2 Semesters configured."}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#006b3f]" />
                                        <span className="text-gray-700">Strict backend boundaries: All period and exam dates validated within academic year limits.</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle2 className="w-4 h-4 text-[#006b3f]" />
                                        <span className="text-gray-700">
                                            {calendar.status === "PUBLISHED"
                                                ? "Official calendar is PUBLISHED and authoritative."
                                                : "Calendar is in draft/review mode and ready to be published when finalized."}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: Ethiopian Holiday Suggestions */}
            <Modal
                isOpen={isHolidaySuggestionsOpen}
                onClose={() => setIsHolidaySuggestionsOpen(false)}
                title="✨ Ethiopian Holiday Suggestions Engine"
            >
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                    <p className="text-xs text-gray-600 leading-relaxed">
                        The suggested holidays below follow Ethiopian national and religious calendars (Enkutatash, Meskel, Genna, Timket, Adwa, Siklet, Fasika, and Eid). 
                        <strong>Administrators review and confirm dates</strong>. Confirmed holidays are marked with customized closure policies.
                    </p>

                    {loadingSuggestions ? (
                        <LoadingState message="Calculating Ethiopian holidays for this academic year..." />
                    ) : (
                        <div className="space-y-2.5">
                            {suggestedHolidays.map((sug, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                        sug.isAdded 
                                            ? "bg-gray-50/80 border-gray-200 opacity-80"
                                            : "bg-white border-amber-200 shadow-xs hover:border-amber-400"
                                    }`}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-sm text-gray-900">{sug.title}</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                                                {sug.religiousOrNationalContext}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                                            <span className="font-semibold text-gray-800">
                                                Suggested: {sug.suggestedStartDate}
                                                {sug.suggestedStartDate !== sug.suggestedEndDate && ` to ${sug.suggestedEndDate}`}
                                            </span>
                                            <span>•</span>
                                            <span>{sug.isSchoolClosedDefault ? "School Closed" : "Regular Session"}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{sug.description}</p>
                                    </div>

                                    <div>
                                        {sug.isAdded ? (
                                            <span className="inline-flex items-center text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                                <Check className="w-3.5 h-3.5 mr-1 text-[#006b3f]" />
                                                Added
                                            </span>
                                        ) : hasManagePermission ? (
                                            <Button
                                                size="sm"
                                                onClick={() => handleConfirmHoliday(sug, idx)}
                                                isLoading={confirmingHolidayIndex === idx}
                                                leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                            >
                                                Confirm & Add
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">Unadded</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t">
                        <Button variant="ghost" onClick={() => setIsHolidaySuggestionsOpen(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* MODAL: Add / Edit Calendar Event */}
            <Modal
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                title={editingEventId ? "Edit Calendar Event" : "Schedule New Academic Calendar Event"}
            >
                <form onSubmit={handleSaveEvent} className="space-y-4">
                    {eventError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                            {eventError}
                        </div>
                    )}

                    {eventWarnings.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs space-y-1">
                            <div className="font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                Conflict Notices:
                            </div>
                            {eventWarnings.map((w, i) => (
                                <p key={i}>• {w}</p>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Event Title</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Semester 1 Final Examinations, Adwa Victory Day"
                            value={eventForm.title}
                            onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                            <select
                                value={eventForm.category}
                                onChange={(e) => {
                                    const cat = e.target.value as any;
                                    setEventForm(prev => ({
                                        ...prev,
                                        category: cat,
                                        type: cat === "EXAMINATION" ? "MIDTERM_EXAM" : cat === "HOLIDAY_BREAK" ? "PUBLIC_HOLIDAY" : "SCHOOL_EVENT"
                                    }));
                                }}
                                className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                            >
                                <option value="EXAMINATION">Examination</option>
                                <option value="HOLIDAY_BREAK">Holiday / Break</option>
                                <option value="SCHOOL_EVENT">School Event</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Event Type</label>
                            <select
                                value={eventForm.type}
                                onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                            >
                                {eventForm.category === "EXAMINATION" && (
                                    <>
                                        <option value="MIDTERM_EXAM">Midterm Examination</option>
                                        <option value="FINAL_EXAM">Final Examination</option>
                                        <option value="MAKEUP_EXAM">Makeup Examination</option>
                                        <option value="NATIONAL_EXAM">National Exam (Grade 12 / 8)</option>
                                        <option value="REGIONAL_EXAM">Regional Examination</option>
                                    </>
                                )}
                                {eventForm.category === "HOLIDAY_BREAK" && (
                                    <>
                                        <option value="PUBLIC_HOLIDAY">Public Holiday</option>
                                        <option value="SCHOOL_HOLIDAY">School Holiday</option>
                                        <option value="MIDYEAR_BREAK">Midyear Semester Break</option>
                                        <option value="TERM_BREAK">Term Break</option>
                                        <option value="OTHER_BREAK">Other Break</option>
                                    </>
                                )}
                                {eventForm.category === "SCHOOL_EVENT" && (
                                    <>
                                        <option value="REGISTRATION">Registration Window</option>
                                        <option value="ORIENTATION">Orientation</option>
                                        <option value="SCHOOL_EVENT">School Event / Ceremony</option>
                                        <option value="MEETING">Staff / Parent Meeting</option>
                                        <option value="OTHER">Other Event</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                required
                                value={eventForm.startDate}
                                onChange={(e) => setEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                required
                                value={eventForm.endDate}
                                onChange={(e) => setEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Parent Academic Period / Semester (Optional)
                        </label>
                        <select
                            value={eventForm.academicPeriodId}
                            onChange={(e) => setEventForm(prev => ({ ...prev, academicPeriodId: e.target.value }))}
                            className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                        >
                            <option value="">None (Calendar-wide)</option>
                            {calendar?.periods.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.startDate.slice(0, 10)} to {p.endDate.slice(0, 10)})
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-gray-500 mt-1">
                            Notice: Exams must fall within the date boundaries of the selected semester.
                        </p>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                        <input
                            type="checkbox"
                            id="isSchoolClosed"
                            checked={eventForm.isSchoolClosed}
                            onChange={(e) => setEventForm(prev => ({ ...prev, isSchoolClosed: e.target.checked }))}
                            className="w-4 h-4 text-[#006b3f] rounded focus:ring-[#006b3f]"
                        />
                        <label htmlFor="isSchoolClosed" className="text-xs font-semibold text-gray-700 cursor-pointer">
                            School Closed (Instruction Suspended on these dates)
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Notes</label>
                        <textarea
                            rows={2}
                            placeholder="Optional operational or academic notes..."
                            value={eventForm.description}
                            onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsEventModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={submittingEvent}>
                            {editingEventId ? "Update Event" : "Save Event"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: Event Details Inspector */}
            {selectedEventDetails && (
                <Modal
                    isOpen={!!selectedEventDetails}
                    onClose={() => setSelectedEventDetails(null)}
                    title="Calendar Event Details"
                >
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{selectedEventDetails.title}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                        {selectedEventDetails.type.replace("_", " ")}
                                    </span>
                                    {selectedEventDetails.isSchoolClosed && (
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                            School Closed
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg border">
                            <div>
                                <span className="font-semibold text-gray-500">Date Range:</span>
                                <p className="text-gray-900 font-medium mt-0.5">
                                    {selectedEventDetails.startDate.slice(0, 10)} to {selectedEventDetails.endDate.slice(0, 10)}
                                </p>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-500">Parent Semester:</span>
                                <p className="text-gray-900 font-medium mt-0.5">
                                    {selectedEventDetails.academicPeriod?.name || "Calendar-wide"}
                                </p>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-500">Source:</span>
                                <p className="text-gray-900 font-medium mt-0.5">
                                    {selectedEventDetails.source === "IMPORTED" ? "Ethiopian Holiday Engine" : selectedEventDetails.source}
                                </p>
                            </div>
                            <div>
                                <span className="font-semibold text-gray-500">Audit Status:</span>
                                <p className="text-gray-900 font-medium mt-0.5">
                                    {calendar?.status === "PUBLISHED" ? "Audited & Authoritative" : "Draft / Unaudited"}
                                </p>
                            </div>
                        </div>

                        {selectedEventDetails.description && (
                            <div>
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Description:</h5>
                                <p className="text-xs text-gray-600 bg-white p-3 rounded-lg border leading-relaxed">
                                    {selectedEventDetails.description}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t">
                            {hasManagePermission ? (
                                <div className="space-x-2">
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            const ev = selectedEventDetails;
                                            setSelectedEventDetails(null);
                                            openEditEventModal(ev);
                                        }}
                                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                        onClick={() => handleDeleteEvent(selectedEventDetails.id)}
                                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            ) : <div />}

                            <Button variant="ghost" onClick={() => setSelectedEventDetails(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL: Add Academic Period */}
            <Modal isOpen={isPeriodModalOpen} onClose={() => setIsPeriodModalOpen(false)} title="Add Academic Period / Semester">
                <form onSubmit={handleCreatePeriod} className="space-y-4">
                    {periodError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                            {periodError}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Period Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Semester 1, Semester 2"
                            value={periodForm.name}
                            onChange={(e) => setPeriodForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Period Type</label>
                        <select
                            value={periodForm.type}
                            onChange={(e) => setPeriodForm(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                        >
                            <option value="SEMESTER">Semester</option>
                            <option value="TERM">Term</option>
                            <option value="QUARTER">Quarter</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                required
                                value={periodForm.startDate}
                                onChange={(e) => setPeriodForm(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                required
                                value={periodForm.endDate}
                                onChange={(e) => setPeriodForm(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full p-2 border rounded-lg text-sm bg-white text-gray-900 focus:ring-2 focus:ring-[#006b3f]"
                            />
                        </div>
                    </div>

                    {selectedYear && (
                        <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border">
                            Year Bounds: <strong>{selectedYear.startDate.slice(0, 10)}</strong> to <strong>{selectedYear.endDate.slice(0, 10)}</strong>. Periods must fall strictly within this range and cannot overlap with other periods.
                        </p>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsPeriodModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={submittingPeriod}>
                            Add Period
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
