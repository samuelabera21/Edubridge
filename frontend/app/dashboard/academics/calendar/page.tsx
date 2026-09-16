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
    Check, 
    X,
    Building2,
    CalendarCheck,
    Layers,
    ShieldCheck
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

    // Pagination for Agenda view
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Reset pagination when filters or year change
    useEffect(() => {
        setCurrentPage(1);
    }, [categoryFilter, periodFilter, selectedYearId, pageSize]);

    // Permissions
    const hasManagePermission = authData?.access?.some(acc =>
        ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => ["ACADEMIC:CREATE", "ACADEMIC:UPDATE", "ACADEMIC:MANAGE"].includes(p.permission?.name))
    ) ?? true;

    const isPrincipalOrAdmin = authData?.access?.some(acc =>
        ["ADMIN", "SCHOOL_ADMIN"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => ["ACADEMIC:MANAGE"].includes(p.permission?.name))
    ) ?? true;

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
            alert("Official academic calendar successfully published. All terms, examinations, and holidays are now authoritative.");
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

            if (!data.warnings || data.warnings.length === 0) {
                setIsEventModalOpen(false);
            } else {
                alert(`Event saved with notices:\n\n${data.warnings.join("\n")}`);
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
            if (categoryFilter === "CLOSURES") {
                if (!ev.isSchoolClosed) return false;
            } else if (categoryFilter !== "ALL" && ev.category !== categoryFilter) {
                return false;
            }

            if (periodFilter !== "ALL") {
                if (ev.academicPeriodId === periodFilter) return true;
                const selectedPeriod = calendar.periods.find(p => p.id === periodFilter);
                if (selectedPeriod && !ev.academicPeriodId) {
                    const pStart = selectedPeriod.startDate.slice(0, 10);
                    const pEnd = selectedPeriod.endDate.slice(0, 10);
                    const evStart = ev.startDate.slice(0, 10);
                    const evEnd = ev.endDate.slice(0, 10);
                    return evStart <= pEnd && evEnd >= pStart;
                }
                return false;
            }
            return true;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }, [calendar?.events, calendar?.periods, categoryFilter, periodFilter]);

    // Paginated events for Agenda view
    const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
    const paginatedEvents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredEvents.slice(start, start + pageSize);
    }, [filteredEvents, currentPage, pageSize]);

    // Current month events count based on active filters
    const currentMonthEventsCount = useMemo(() => {
        const year = currentMonthDate.getFullYear();
        const month = currentMonthDate.getMonth();
        const startOfMonth = new Date(year, month, 1).toISOString().slice(0, 10);
        const endOfMonth = new Date(year, month + 1, 0).toISOString().slice(0, 10);
        return filteredEvents.filter(ev => {
            const s = ev.startDate.slice(0, 10);
            const e = ev.endDate.slice(0, 10);
            return s <= endOfMonth && e >= startOfMonth;
        }).length;
    }, [currentMonthDate, filteredEvents]);

    // Unadded holiday count
    const pendingHolidayCount = useMemo(() => {
        return suggestedHolidays.filter(s => !s.isAdded).length;
    }, [suggestedHolidays]);

    // Summary counts
    const examCount = useMemo(() => {
        return calendar?.events?.filter(e => e.category === "EXAMINATION").length || 0;
    }, [calendar?.events]);

    const holidayCount = useMemo(() => {
        return calendar?.events?.filter(e => e.category === "HOLIDAY_BREAK").length || 0;
    }, [calendar?.events]);

    const closureCount = useMemo(() => {
        return calendar?.events?.filter(e => e.isSchoolClosed).length || 0;
    }, [calendar?.events]);

    const formatEventType = (type: string) => {
        if (!type) return "Event";
        return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    };

    // Helpers for event styling & badges
    const getEventBadge = (category: string, type: string) => {
        const formattedType = formatEventType(type);
        switch (category) {
            case "EXAMINATION":
                return {
                    bg: "bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100",
                    dot: "bg-indigo-500",
                    badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200",
                    label: formattedType
                };
            case "HOLIDAY_BREAK":
                return {
                    bg: "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100",
                    dot: "bg-amber-500",
                    badgeBg: "bg-slate-100 text-slate-800 border-slate-200",
                    label: formattedType
                };
            case "SCHOOL_EVENT":
                return {
                    bg: "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100",
                    dot: "bg-emerald-500",
                    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
                    label: formattedType
                };
            default:
                return {
                    bg: "bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100",
                    dot: "bg-slate-400",
                    badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
                    label: formattedType || "Event"
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
            const dayEvents = filteredEvents.filter(ev => {
                const s = ev.startDate.slice(0, 10);
                const e = ev.endDate.slice(0, 10);
                return dStr >= s && dStr <= e;
            });
            days.push({
                date: d,
                dateStr: dStr,
                isCurrentMonth: false,
                events: dayEvents
            });
        }

        // Current month days
        for (let d = 1; d <= totalDays; d++) {
            const dateObj = new Date(year, month, d);
            const dStr = dateObj.toISOString().slice(0, 10);
            const dayEvents = filteredEvents.filter(ev => {
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

        // Next month padding to fill complete grid
        const remaining = (7 - (days.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            const dStr = d.toISOString().slice(0, 10);
            const dayEvents = filteredEvents.filter(ev => {
                const s = ev.startDate.slice(0, 10);
                const e = ev.endDate.slice(0, 10);
                return dStr >= s && dStr <= e;
            });
            days.push({
                date: d,
                dateStr: dStr,
                isCurrentMonth: false,
                events: dayEvents
            });
        }

        return days;
    }, [currentMonthDate, filteredEvents]);

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
        <div className="space-y-6 max-w-7xl mx-auto pb-16 text-slate-800">
            {/* Clean Official Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#4085b3]/10 text-[#4085b3] border border-[#4085b3]/20 flex items-center justify-center shrink-0">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                Academic Calendar
                            </h1>
                            {calendar?.status && (
                                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold border ${
                                    calendar.status === "PUBLISHED" 
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                        : calendar.status === "REVIEW"
                                        ? "bg-sky-50 text-sky-800 border-sky-300"
                                        : "bg-slate-100 text-slate-700 border-slate-300"
                                }`}>
                                    {calendar.status === "PUBLISHED" ? (
                                        <>
                                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                                            <span>Published</span>
                                        </>
                                    ) : (
                                        <>
                                            <Clock className="w-3 h-3 text-slate-500" />
                                            <span>{calendar.status}</span>
                                        </>
                                    )}
                                </span>
                            )}
                        </div>
                        {selectedYear && (
                            <p className="text-xs text-slate-500 font-mono mt-0.5">
                                {selectedYear.name} ({selectedYear.startDate.slice(0, 10)} to {selectedYear.endDate.slice(0, 10)})
                            </p>
                        )}
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Academic Year Switcher */}
                    <select
                        value={selectedYearId}
                        onChange={(e) => setSelectedYearId(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#4085b3] cursor-pointer"
                    >
                        {years.map(y => (
                            <option key={y.id} value={y.id}>
                                Year: {y.name} ({y.status})
                            </option>
                        ))}
                    </select>

                    {/* Ethiopian Holiday Suggestions Trigger */}
                    {calendar && (
                        <button
                            onClick={() => setIsHolidaySuggestionsOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
                        >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Holidays</span>
                            {pendingHolidayCount > 0 && (
                                <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                    {pendingHolidayCount}
                                </span>
                            )}
                        </button>
                    )}

                    {/* Publish / Unpublish Action Button */}
                    {calendar && isPrincipalOrAdmin && (
                        calendar.status === "PUBLISHED" ? (
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                leftIcon={<Unlock className="w-3.5 h-3.5 text-slate-600" />}
                                onClick={handleUnpublishCalendar}
                                className="text-xs border-slate-300 h-8"
                            >
                                Reopen
                            </Button>
                        ) : (
                            <Button 
                                size="sm" 
                                leftIcon={<Lock className="w-3.5 h-3.5" />}
                                onClick={handlePublishCalendar}
                                className="text-xs bg-[#4085b3] hover:bg-[#32698e] text-white h-8"
                            >
                                Publish Calendar
                            </Button>
                        )
                    )}
                </div>
            </div>

            {/* Calendar Initializer state */}
            {calendarLoading ? (
                <LoadingState message="Loading calendar structure & schedules..." />
            ) : !calendar ? (
                <Card className="border-dashed border-2 border-slate-300 bg-white text-center py-14 shadow-none">
                    <CardContent className="space-y-4 max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#4085b3] flex items-center justify-center mx-auto border border-slate-200">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Academic Calendar Not Initialized</h3>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                Establish the authoritative operational calendar for <strong>{selectedYear?.name}</strong> to configure semesters, schedule examinations, and adopt national Ethiopian holidays.
                            </p>
                        </div>
                        {hasManagePermission && (
                            <Button onClick={handleCreateCalendar} leftIcon={<Plus className="w-4 h-4" />} className="bg-[#4085b3] hover:bg-[#32698e] text-white">
                                Initialize {selectedYear?.name} Calendar
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {/* Unified Navigation, Filter & Action Toolbar */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                        {/* Left: View Switcher */}
                        <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200/80 shrink-0">
                            <button
                                onClick={() => setViewMode("month")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    viewMode === "month" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <CalendarDays className="w-3.5 h-3.5 text-[#4085b3]" />
                                Month View
                            </button>
                            <button
                                onClick={() => setViewMode("agenda")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    viewMode === "agenda" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <List className="w-3.5 h-3.5 text-[#4085b3]" />
                                Agenda
                            </button>
                            <button
                                onClick={() => setViewMode("timeline")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                    viewMode === "timeline" ? "bg-white text-slate-900 shadow-xs border border-slate-200" : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                <BarChart2 className="w-3.5 h-3.5 text-[#4085b3]" />
                                Semesters
                            </button>
                        </div>

                        {/* Middle & Right: Filters & Creation Actions */}
                        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 flex-1">
                            {/* Filter Selectors */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center space-x-1 text-xs">
                                    <Filter className="w-3 h-3 text-slate-400" />
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#4085b3]"
                                    >
                                        <option value="ALL">All Categories</option>
                                        <option value="EXAMINATION">Examinations</option>
                                        <option value="HOLIDAY_BREAK">Holidays & Breaks</option>
                                        <option value="CLOSURES">School Closures</option>
                                        <option value="SCHOOL_EVENT">Events</option>
                                    </select>
                                </div>

                                <div className="flex items-center space-x-1 text-xs">
                                    <select
                                        value={periodFilter}
                                        onChange={(e) => setPeriodFilter(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#4085b3]"
                                    >
                                        <option value="ALL">All Semesters</option>
                                        {calendar.periods.map(p => (
                                             <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {(categoryFilter !== "ALL" || periodFilter !== "ALL") && (
                                    <button
                                        onClick={() => { setCategoryFilter("ALL"); setPeriodFilter("ALL"); }}
                                        className="text-xs text-red-600 hover:text-red-800 font-medium px-1.5 py-0.5 rounded bg-red-50 border border-red-200 transition-colors"
                                        title="Clear filters"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            {/* Management Actions */}
                            {hasManagePermission && (
                                <div className="flex items-center gap-2">
                                    <Button 
                                        size="sm" 
                                        variant="secondary"
                                        leftIcon={<Plus className="w-3.5 h-3.5" />} 
                                        onClick={() => setIsPeriodModalOpen(true)}
                                        className="text-xs border-slate-300 h-8"
                                    >
                                        Add Semester
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        leftIcon={<Plus className="w-3.5 h-3.5" />} 
                                        onClick={() => openCreateEventModal()}
                                        className="text-xs bg-[#4085b3] hover:bg-[#32698e] text-white h-8"
                                    >
                                        Add Event / Exam
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MAIN VIEW: Month View */}
                    {viewMode === "month" && (
                        <Card className="shadow-xs border border-slate-200 overflow-hidden bg-white">
                            {/* Month Navigation Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-white border-b border-slate-200">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                        {currentMonthDate.toLocaleString("default", { month: "long" })} {currentMonthDate.getFullYear()}
                                    </h2>
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                                        {currentMonthEventsCount} scheduled
                                    </span>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                    <button
                                        onClick={handlePrevMonth}
                                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                                        title="Previous Month"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentMonthDate(new Date())}
                                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                                    >
                                        Today
                                    </button>
                                    <button
                                        onClick={handleNextMonth}
                                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
                                        title="Next Month"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* 7 Days of Week Header */}
                            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <div>Sun</div>
                                <div>Mon</div>
                                <div>Tue</div>
                                <div>Wed</div>
                                <div>Thu</div>
                                <div>Fri</div>
                                <div>Sat</div>
                            </div>

                            {/* 35/42 Days Grid */}
                            <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-slate-200">
                                {monthCalendarGrid.map((day, idx) => {
                                    const isToday = day.dateStr === new Date().toISOString().slice(0, 10);
                                    return (
                                        <div
                                            key={idx}
                                            className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors ${
                                                day.isCurrentMonth ? "bg-white" : "bg-slate-50/70 text-slate-400"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${
                                                    isToday 
                                                        ? "bg-[#4085b3] text-white" 
                                                        : day.isCurrentMonth ? "text-slate-800" : "text-slate-400"
                                                }`}>
                                                    {day.date.getDate()}
                                                </span>

                                                {hasManagePermission && day.isCurrentMonth && (
                                                    <button
                                                        onClick={() => openCreateEventModal(day.dateStr)}
                                                        className="text-slate-300 hover:text-[#4085b3] hover:bg-slate-100 p-0.5 rounded transition-all"
                                                        title="Schedule event on this date"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Event Chips */}
                                            <div className="space-y-1 flex-1 overflow-y-auto max-h-[85px] pr-0.5">
                                                {day.events.slice(0, 3).map(ev => {
                                                    const badge = getEventBadge(ev.category, ev.type);
                                                    return (
                                                        <button
                                                            key={ev.id}
                                                            onClick={() => setSelectedEventDetails(ev)}
                                                            className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1.5 border transition-all ${badge.bg}`}
                                                            title={`${ev.title} (${badge.label})`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                                                            <span className="truncate leading-none">{ev.title}</span>
                                                        </button>
                                                    );
                                                })}
                                                {day.events.length > 3 && (
                                                    <div className="text-[10px] text-slate-500 font-semibold px-1 pt-0.5">
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
                        <Card className="shadow-xs border border-slate-200 bg-white">
                            <CardHeader className="py-3.5 px-5 border-b border-slate-200 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold text-slate-900">Academic Schedule Agenda</CardTitle>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Chronological ledger of instructional terms, examination windows, and official holidays.
                                    </p>
                                </div>
                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                    {filteredEvents.length} items recorded
                                </span>
                            </CardHeader>
                            <CardContent className="p-0">
                                {filteredEvents.length === 0 ? (
                                    <div className="p-12 text-center text-slate-500">
                                        <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                        <p className="font-semibold text-sm text-slate-800">No events match the selected filters.</p>
                                        <p className="text-xs text-slate-500 mt-1">Add events or review suggested Ethiopian holidays to populate the agenda.</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-5 py-3 font-semibold tracking-wider">Event / Activity Title</th>
                                                        <th className="px-5 py-3 font-semibold tracking-wider">Category & Type</th>
                                                        <th className="px-5 py-3 font-semibold tracking-wider">Scheduled Dates</th>
                                                        <th className="px-5 py-3 font-semibold tracking-wider">Attendance Status</th>
                                                        <th className="px-5 py-3 font-semibold tracking-wider">Semester</th>
                                                        <th className="px-5 py-3 font-semibold tracking-wider text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {paginatedEvents.map(ev => {
                                                        const badge = getEventBadge(ev.category, ev.type);
                                                        return (
                                                            <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                                                                <td className="px-5 py-3.5 text-slate-900">
                                                                    <button
                                                                        onClick={() => setSelectedEventDetails(ev)}
                                                                        className="hover:underline font-semibold text-slate-900 text-xs text-left block"
                                                                    >
                                                                        {ev.title}
                                                                    </button>
                                                                    {ev.description && (
                                                                        <p className="text-[11px] text-slate-500 font-normal mt-0.5 line-clamp-1">
                                                                            {ev.description}
                                                                        </p>
                                                                    )}
                                                                </td>
                                                                <td className="px-5 py-3.5">
                                                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${badge.dot}`} />
                                                                        <span>{badge.label}</span>
                                                                    </span>
                                                                </td>
                                                                <td className="px-5 py-3.5 text-slate-800 font-mono font-medium">
                                                                    {ev.startDate.slice(0, 10)}
                                                                    {ev.startDate.slice(0, 10) !== ev.endDate.slice(0, 10) && ` → ${ev.endDate.slice(0, 10)}`}
                                                                </td>
                                                                <td className="px-5 py-3.5">
                                                                    {ev.isSchoolClosed ? (
                                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                                                            <span>School Closed</span>
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                                            <span>In Session</span>
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-5 py-3.5 text-slate-600">
                                                                    {ev.academicPeriod?.name || "Calendar-wide"}
                                                                </td>
                                                                <td className="px-5 py-3.5 text-right">
                                                                    <div className="flex items-center justify-end gap-1">
                                                                        <button
                                                                            onClick={() => setSelectedEventDetails(ev)}
                                                                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                                                            title="View Details"
                                                                        >
                                                                            <Eye className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        {hasManagePermission && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => openEditEventModal(ev)}
                                                                                    className="p-1.5 text-slate-500 hover:text-[#4085b3] hover:bg-sky-50 rounded-md transition-colors"
                                                                                    title="Edit Event"
                                                                                >
                                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDeleteEvent(ev.id)}
                                                                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                                    title="Delete Event"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination Controls */}
                                        <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
                                            <div className="flex items-center gap-3">
                                                <span>
                                                    Showing <strong className="text-slate-900 font-semibold">{Math.min((currentPage - 1) * pageSize + 1, filteredEvents.length)}</strong> to <strong className="text-slate-900 font-semibold">{Math.min(currentPage * pageSize, filteredEvents.length)}</strong> of <strong className="text-slate-900 font-semibold">{filteredEvents.length}</strong> entries
                                                </span>
                                                <div className="flex items-center space-x-1.5 pl-3 border-l border-slate-200">
                                                    <span className="text-[11px] text-slate-500">Rows:</span>
                                                    <select
                                                        value={pageSize}
                                                        onChange={(e) => setPageSize(Number(e.target.value))}
                                                        className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#4085b3]"
                                                    >
                                                        <option value={5}>5</option>
                                                        <option value={10}>10</option>
                                                        <option value={20}>20</option>
                                                        <option value={50}>50</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                    className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                    title="Previous Page"
                                                >
                                                    <ChevronLeft className="w-3.5 h-3.5" />
                                                </button>

                                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                                    .map((pageNum, idx, arr) => {
                                                        const prev = arr[idx - 1];
                                                        const showEllipsis = prev && pageNum - prev > 1;
                                                        return (
                                                            <div key={pageNum} className="flex items-center">
                                                                {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                                                                <button
                                                                    onClick={() => setCurrentPage(pageNum)}
                                                                    className={`min-w-[28px] h-7 px-2 text-xs font-semibold rounded transition-colors ${
                                                                        currentPage === pageNum
                                                                            ? "bg-[#4085b3] text-white"
                                                                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                                                    }`}
                                                                >
                                                                    {pageNum}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}

                                                <button
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                    title="Next Page"
                                                >
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* MAIN VIEW: Semester Terms */}
                    {viewMode === "timeline" && (
                        <div className="space-y-6">
                            {/* Academic Periods Breakdown */}
                            <Card className="shadow-xs border border-slate-200 bg-white">
                                <CardHeader className="py-4 px-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-sm font-bold text-slate-900">Academic Semesters & Terms</CardTitle>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Instructional terms and institutional scheduling windows according to national curriculum standards.
                                        </p>
                                    </div>
                                    {hasManagePermission && (
                                        <Button 
                                            size="sm" 
                                            leftIcon={<Plus className="w-3.5 h-3.5" />} 
                                            onClick={() => setIsPeriodModalOpen(true)} 
                                            className="text-xs bg-[#4085b3] hover:bg-[#32698e] text-white shadow-xs font-medium"
                                        >
                                            Add Semester
                                        </Button>
                                    )}
                                </CardHeader>
                                <CardContent className="p-0">
                                    {calendar.periods.length === 0 ? (
                                        <div className="p-12 text-center text-slate-500">
                                            <Layers className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                            <p className="font-semibold text-sm text-slate-800">No semesters configured yet.</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Add Semester 1 and Semester 2 to establish instructional periods and exam windows.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100">
                                            {calendar.periods.map((p, idx) => {
                                                const pStart = new Date(p.startDate);
                                                const pEnd = new Date(p.endDate);
                                                const diffWeeks = Math.max(1, Math.round((pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24 * 7)));
                                                const childEvents = calendar.events.filter(ev => ev.academicPeriodId === p.id);

                                                return (
                                                    <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                                                        <div className="flex items-start space-x-3.5">
                                                            <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#4085b3] border border-sky-200/80 flex items-center justify-center font-bold text-xs shrink-0">
                                                                S{idx + 1}
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="flex items-center space-x-2">
                                                                    <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                                                                    <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                                        {p.type}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-700">
                                                                    <span className="font-mono font-medium text-slate-900">{p.startDate.slice(0, 10)}</span>
                                                                    <span className="text-slate-400 mx-1.5">to</span>
                                                                    <span className="font-mono font-medium text-slate-900">{p.endDate.slice(0, 10)}</span>
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 self-end md:self-center">
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80 text-[11px] font-medium">
                                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                                    {diffWeeks} Weeks
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/80 text-[11px] font-medium">
                                                                    <BookOpen className="w-3 h-3 text-slate-400" />
                                                                    {childEvents.length} Activities & Exams
                                                                </span>
                                                            </div>

                                                            {hasManagePermission && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => handleDeletePeriod(p.id)}
                                                                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                                                    className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                                                >
                                                                    Remove
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Readiness & Compliance Checklist */}
                            <Card className="shadow-xs border border-slate-200 bg-white">
                                <CardHeader className="py-4 px-6 border-b border-slate-200 flex flex-row items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-[#4085b3]" />
                                    <div>
                                        <CardTitle className="text-sm font-bold text-slate-900">Academic Structure & Regulatory Compliance</CardTitle>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            National curriculum alignment and schedule validation checks.
                                        </p>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-5 space-y-3 text-xs">
                                    {calendar.periods.length >= 2 ? (
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-sky-50/50 border border-sky-200/60">
                                            <CheckCircle2 className="w-4 h-4 text-[#4085b3] shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-semibold text-slate-900">Academic Terms Configured</p>
                                                <p className="text-[11px] text-slate-600 mt-0.5">
                                                    Complies with the 2-semester national general education standard ({calendar.periods.length} semesters defined).
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-semibold text-amber-900">Semester Structure Notice</p>
                                                <p className="text-[11px] text-amber-700 mt-0.5">
                                                    Ethiopian General Education standard requires 2 distinct semesters (Semester 1 & Semester 2) to be configured.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/60 border border-slate-200/80">
                                        <CheckCircle2 className="w-4 h-4 text-[#4085b3] shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-900">Academic Year Boundary Conformity</p>
                                            <p className="text-[11px] text-slate-600 mt-0.5">
                                                All configured instructional semesters and examination windows fall strictly within the active academic year.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50/60 border border-slate-200/80">
                                        <CheckCircle2 className="w-4 h-4 text-[#4085b3] shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-900">Institutional Calendar Authority</p>
                                            <p className="text-[11px] text-slate-600 mt-0.5">
                                                {calendar.status === "PUBLISHED"
                                                    ? "This official academic calendar is PUBLISHED and authoritative across student, staff, and parent portals."
                                                    : "Calendar is in review draft mode and awaiting formal administrative publication."}
                                            </p>
                                        </div>
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
                title="Ethiopian National & Religious Holidays"
                maxWidth="xl"
            >
                <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                        Official national and religious holidays according to the Ethiopian educational standards (Enkutatash, Meskel, Mawlid, Genna, Timket, Adwa, Siklet, Fasika, Eid). Review and adopt holidays into this calendar.
                    </p>

                    {loadingSuggestions ? (
                        <LoadingState message="Calculating Ethiopian holidays for this academic year..." />
                    ) : (
                        <div className="space-y-2.5">
                            {suggestedHolidays.map((sug, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                        sug.isAdded 
                                            ? "bg-slate-50 border-slate-200 opacity-80"
                                            : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                                    }`}
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-xs text-slate-900">{sug.title}</span>
                                            <span className="text-[10px] px-2 py-0.2 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                {sug.religiousOrNationalContext}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-xs text-slate-600 font-mono">
                                            <span>
                                                {sug.suggestedStartDate}
                                                {sug.suggestedStartDate !== sug.suggestedEndDate && ` → ${sug.suggestedEndDate}`}
                                            </span>
                                            <span className="font-sans text-slate-400">•</span>
                                            <span className="font-sans text-slate-600">
                                                {sug.isSchoolClosedDefault ? "School Closed" : "Regular Session"}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500">{sug.description}</p>
                                    </div>

                                    <div>
                                        {sug.isAdded ? (
                                             <span className="inline-flex items-center text-xs font-semibold text-[#4085b3] bg-sky-50 px-2.5 py-1 rounded border border-sky-200">
                                                 <Check className="w-3.5 h-3.5 mr-1 text-[#4085b3]" />
                                                 Adopted
                                             </span>
                                        ) : hasManagePermission ? (
                                             <Button
                                                 size="sm"
                                                 onClick={() => handleConfirmHoliday(sug, idx)}
                                                 isLoading={confirmingHolidayIndex === idx}
                                                 leftIcon={<Plus className="w-3.5 h-3.5" />}
                                                 className="text-xs bg-[#4085b3] hover:bg-[#32698e] text-white"
                                             >
                                                 Adopt Holiday
                                             </Button>
                                        ) : (
                                             <span className="text-xs text-slate-400 italic">Unadopted</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-slate-200">
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
                title={editingEventId ? "Edit Calendar Event / Activity" : "Schedule New Calendar Event / Exam"}
                maxWidth="xl"
            >
                <form onSubmit={handleSaveEvent} className="space-y-4">
                    {eventError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{eventError}</span>
                        </div>
                    )}

                    {eventWarnings.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg text-xs space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>Conflict Notices:</span>
                            </div>
                            {eventWarnings.map((w, i) => (
                                <p key={i} className="pl-5 text-amber-700">• {w}</p>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Event / Examination Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Semester 1 Midterm Examinations, Adwa Victory Day"
                            value={eventForm.title}
                            onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
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
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all"
                            >
                                <option value="EXAMINATION">Examination</option>
                                <option value="HOLIDAY_BREAK">Holiday / Break</option>
                                <option value="SCHOOL_EVENT">School Event</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Event Type</label>
                            <select
                                value={eventForm.type}
                                onChange={(e) => setEventForm(prev => ({ ...prev, type: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all"
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
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={eventForm.startDate}
                                onChange={(e) => setEventForm(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                End Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={eventForm.endDate}
                                onChange={(e) => setEventForm(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Associated Academic Semester (Optional)
                        </label>
                        <select
                            value={eventForm.academicPeriodId}
                            onChange={(e) => setEventForm(prev => ({ ...prev, academicPeriodId: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all"
                        >
                            <option value="">None (Institutional / Calendar-wide)</option>
                            {calendar?.periods.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.startDate.slice(0, 10)} to {p.endDate.slice(0, 10)})
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Examinations must fall strictly within the date bounds of the associated semester.
                        </p>
                    </div>

                    <label 
                        htmlFor="isSchoolClosed" 
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                            eventForm.isSchoolClosed 
                                ? "bg-rose-50/60 border-rose-200" 
                                : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
                        }`}
                    >
                        <input
                            type="checkbox"
                            id="isSchoolClosed"
                            checked={eventForm.isSchoolClosed}
                            onChange={(e) => setEventForm(prev => ({ ...prev, isSchoolClosed: e.target.checked }))}
                            className="mt-0.5 w-4 h-4 rounded text-[#4085b3] focus:ring-[#4085b3] accent-[#4085b3]"
                        />
                        <div>
                            <span className="block text-xs font-semibold text-slate-900">
                                School Closure (Regular instruction suspended)
                            </span>
                            <span className="block text-[11px] text-slate-500 mt-0.5 leading-normal">
                                Flag this date range as a school holiday or exam closure where standard student attendance is suspended.
                            </span>
                        </div>
                    </label>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Operational Description / Notes
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Optional administrative guidelines or parent instructions..."
                            value={eventForm.description}
                            onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all resize-none"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => setIsEventModalOpen(false)}
                            className="text-xs border-slate-300 hover:bg-slate-50 text-slate-700"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            isLoading={submittingEvent} 
                            className="text-xs bg-[#4085b3] hover:bg-[#32698e] text-white shadow-xs font-medium"
                        >
                            {editingEventId ? "Update Event" : "Save Event"}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* MODAL: Event Details Inspector */}
            {selectedEventDetails && (() => {
                const badge = getEventBadge(selectedEventDetails.category, selectedEventDetails.type);
                return (
                    <Modal
                        isOpen={!!selectedEventDetails}
                        onClose={() => setSelectedEventDetails(null)}
                        title="Calendar Event Details"
                    >
                        <div className="space-y-4">
                            {/* Header / Event Title and Badges */}
                            <div className="pb-3 border-b border-slate-100">
                                <h3 className="text-base font-bold text-slate-900 leading-snug">
                                    {selectedEventDetails.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                        <span>{badge.label}</span>
                                    </span>
                                    {selectedEventDetails.isSchoolClosed ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            School Closed
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            In Session
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Structured Key-Value Properties */}
                            <div className="bg-slate-50/80 rounded-lg border border-slate-200/80 divide-y divide-slate-200/60 text-xs">
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-slate-500 font-medium">Scheduled Dates</span>
                                    <span className="text-slate-900 font-mono font-medium">
                                        {selectedEventDetails.startDate.slice(0, 10)}
                                        {selectedEventDetails.startDate.slice(0, 10) !== selectedEventDetails.endDate.slice(0, 10) && (
                                            <> <span className="text-slate-400 font-sans">to</span> {selectedEventDetails.endDate.slice(0, 10)}</>
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-slate-500 font-medium">Academic Semester</span>
                                    <span className="text-slate-900 font-medium">
                                        {selectedEventDetails.academicPeriod?.name || "Institutional / Calendar-wide"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-slate-500 font-medium">Event Source</span>
                                    <span className="text-slate-900 font-medium">
                                        {selectedEventDetails.source === "IMPORTED" ? "Ethiopian National Calendar" : "School Institutional"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3">
                                    <span className="text-slate-500 font-medium">Calendar Status</span>
                                    <span className="text-slate-900 font-medium">
                                        {calendar?.status === "PUBLISHED" ? "Authoritative (Published)" : "Draft / In Review"}
                                    </span>
                                </div>
                            </div>

                            {/* Operational Notes / Description */}
                            {selectedEventDetails.description && (
                                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                                        Operational Notes
                                    </span>
                                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {selectedEventDetails.description}
                                    </p>
                                </div>
                            )}

                            {/* Action Footer */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                {hasManagePermission ? (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => {
                                                const ev = selectedEventDetails;
                                                setSelectedEventDetails(null);
                                                openEditEventModal(ev);
                                            }}
                                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                                            className="text-xs border-slate-300 hover:bg-slate-50 text-slate-700"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                            onClick={() => handleDeleteEvent(selectedEventDetails.id)}
                                            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                ) : <div />}

                                <Button 
                                    variant="secondary" 
                                    onClick={() => setSelectedEventDetails(null)} 
                                    className="text-xs border-slate-300 hover:bg-slate-50 text-slate-700"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </Modal>
                );
            })()}

            {/* MODAL: Add Academic Period */}
            <Modal isOpen={isPeriodModalOpen} onClose={() => setIsPeriodModalOpen(false)} title="Configure Academic Semester / Term">
                <form onSubmit={handleCreatePeriod} className="space-y-4">
                    {periodError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{periodError}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Period / Semester Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Semester 1, Semester 2"
                            value={periodForm.name}
                            onChange={(e) => setPeriodForm(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Period Type</label>
                        <select
                            value={periodForm.type}
                            onChange={(e) => setPeriodForm(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all"
                        >
                            <option value="SEMESTER">Semester</option>
                            <option value="TERM">Term</option>
                            <option value="QUARTER">Quarter</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Start Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={periodForm.startDate}
                                onChange={(e) => setPeriodForm(prev => ({ ...prev, startDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                End Date <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={periodForm.endDate}
                                onChange={(e) => setPeriodForm(prev => ({ ...prev, endDate: e.target.value }))}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4085b3]/20 focus:border-[#4085b3] transition-all font-mono"
                            />
                        </div>
                    </div>

                    {selectedYear && (
                        <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-lg border border-slate-200/80">
                            Academic Year Boundaries: <strong className="text-slate-800">{selectedYear.startDate.slice(0, 10)}</strong> to <strong className="text-slate-800">{selectedYear.endDate.slice(0, 10)}</strong>. Periods must fall strictly within this window.
                        </p>
                    )}

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => setIsPeriodModalOpen(false)}
                            className="text-xs border-slate-300 hover:bg-slate-50 text-slate-700"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            isLoading={submittingPeriod} 
                            className="text-xs bg-[#4085b3] hover:bg-[#32698e] text-white shadow-xs font-medium"
                        >
                            Configure Period
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
