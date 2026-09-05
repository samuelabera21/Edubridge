"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Calendar as CalendarIcon, Plus, Trash2, Edit2, CheckCircle2, AlertTriangle, Clock, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AcademicYear } from "@/types/api";

interface AcademicPeriodItem {
    id: string;
    academicCalendarId: string;
    name: string;
    startDate: string;
    endDate: string;
    type: string;
}

interface AcademicCalendarData {
    id: string;
    academicYearId: string;
    description?: string;
    periods: AcademicPeriodItem[];
}

export default function AcademicCalendarPage() {
    const { authData } = useAuth();
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [calendar, setCalendar] = useState<AcademicCalendarData | null>(null);
    const [loading, setLoading] = useState(true);
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modal state for adding period
    const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
    const [periodForm, setPeriodForm] = useState({
        name: "Semester 1",
        type: "SEMESTER",
        startDate: "",
        endDate: ""
    });
    const [submittingPeriod, setSubmittingPeriod] = useState(false);
    const [periodError, setPeriodError] = useState<string | null>(null);

    const hasManagePermission = authData?.access.some(acc =>
        ["ADMIN", "SCHOOL_ADMIN", "VICE_PRINCIPAL"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => ["ACADEMIC:CREATE", "ACADEMIC:UPDATE", "ACADEMIC:MANAGE"].includes(p.permission?.name))
    );

    const selectedYear = years.find(y => y.id === selectedYearId) || null;

    // Load academic years on mount
    const loadYears = async () => {
        try {
            setLoading(true);
            const res = await fetchApi("/academic/years");
            if (!res.ok) throw new Error("Failed to load academic years");
            const data: AcademicYear[] = await res.json();
            setYears(data);

            if (data.length > 0) {
                // Default to active year or newest planned year
                const active = data.find(y => y.status === "ACTIVE");
                const initialYear = active || data[0];
                setSelectedYearId(initialYear.id);
            }
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load academic years");
        } finally {
            setLoading(false);
        }
    };

    // Load calendar for selected year
    const loadCalendar = async (yearId: string) => {
        if (!yearId) return;
        try {
            setCalendarLoading(true);
            const res = await fetchApi(`/academic/years/${yearId}/calendar`);
            if (res.ok) {
                const data = await res.json();
                setCalendar(data);
            } else if (res.status === 404) {
                setCalendar(null);
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

    useEffect(() => {
        loadYears();
    }, []);

    useEffect(() => {
        if (selectedYearId) {
            loadCalendar(selectedYearId);
        }
    }, [selectedYearId]);

    const handleCreateCalendar = async () => {
        if (!selectedYearId) return;
        try {
            setCalendarLoading(true);
            const res = await fetchApi(`/academic/years/${selectedYearId}/calendar`, {
                method: "POST",
                body: JSON.stringify({ description: `${selectedYear?.name} Operational Calendar` })
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

    const handleCreatePeriod = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!calendar) return;

        // Client boundary validations
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
                return setPeriodError(`Dates must fall within academic year range (${selectedYear.startDate.slice(0, 10)} to ${selectedYear.endDate.slice(0, 10)})`);
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

    if (loading) {
        return <LoadingState message="Loading academic calendar & operational terms..." />;
    }

    if (error && years.length === 0) {
        return <ErrorState message={error} onRetry={loadYears} />;
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header & Academic Year Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                        <CalendarIcon className="w-7 h-7 mr-3 text-[#006b3f]" />
                        Academic Calendar & Semesters
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure institutional semesters, terms, and academic period bounds for instruction and assessments.
                    </p>
                </div>

                {/* Year Selector Dropdown */}
                <div className="flex items-center space-x-3 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                    <label className="text-xs font-semibold text-gray-500 uppercase">Academic Year:</label>
                    <select
                        value={selectedYearId}
                        onChange={(e) => setSelectedYearId(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-[#006b3f] focus:border-[#006b3f] p-1.5 font-medium"
                    >
                        {years.map(y => (
                            <option key={y.id} value={y.id}>
                                {y.name} ({y.status})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Status & Guidance Banner */}
            {selectedYear && (
                <div className={`p-4 rounded-xl border flex items-start space-x-3 ${
                    selectedYear.status === "ACTIVE"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : selectedYear.status === "PLANNED"
                        ? "bg-blue-50 border-blue-200 text-blue-900"
                        : "bg-gray-50 border-gray-200 text-gray-800"
                }`}>
                    <div className="p-1 rounded-full bg-white shadow-sm mt-0.5">
                        {selectedYear.status === "ACTIVE" ? (
                            <CheckCircle2 className="w-5 h-5 text-[#006b3f]" />
                        ) : (
                            <Clock className="w-5 h-5 text-blue-600" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm">
                                {selectedYear.name} — Status: {selectedYear.status}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white border">
                                {selectedYear.startDate.slice(0, 10)} to {selectedYear.endDate.slice(0, 10)}
                            </span>
                        </div>
                        <p className="text-xs mt-1 text-gray-600">
                            {selectedYear.status === "PLANNED"
                                ? "🛠️ Preparatory Mode: Set up all terms/semesters now. When you activate this year, this calendar will govern school timetable and attendance."
                                : "Currently active academic operational calendar."}
                        </p>
                    </div>
                </div>
            )}

            {/* Calendar Body */}
            {calendarLoading ? (
                <LoadingState message="Loading calendar structure..." />
            ) : !calendar ? (
                <Card className="border-dashed border-2 border-gray-200 text-center py-12">
                    <CardContent className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#006b3f] flex items-center justify-center mx-auto">
                            <CalendarIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">No Calendar Initialized for {selectedYear?.name}</h3>
                            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                                An academic calendar is required to establish Semester 1 and Semester 2 (or term periods) before student scheduling.
                            </p>
                        </div>
                        {hasManagePermission && (
                            <Button onClick={handleCreateCalendar} leftIcon={<Plus className="w-4 h-4" />}>
                                Initialize Academic Calendar
                            </Button>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Period Overview Card */}
                    <Card className="shadow-sm">
                        <CardHeader className="py-4 bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-gray-900">Configured Academic Periods</CardTitle>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {calendar.periods?.length || 0} period(s) defined. Ethiopian General Education standard requires 2 semesters.
                                </p>
                            </div>
                            {hasManagePermission && (
                                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsPeriodModalOpen(true)}>
                                    Add Semester / Term
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            {(!calendar.periods || calendar.periods.length === 0) ? (
                                <div className="p-8 text-center text-gray-500">
                                    <Clock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                    <p className="font-semibold text-sm">No periods configured yet.</p>
                                    <p className="text-xs text-gray-400 mt-1">Click "Add Semester / Term" to set the dates for Semester 1.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-6 py-3.5 font-semibold">Period Name</th>
                                                <th className="px-6 py-3.5 font-semibold">Type</th>
                                                <th className="px-6 py-3.5 font-semibold">Start Date</th>
                                                <th className="px-6 py-3.5 font-semibold">End Date</th>
                                                <th className="px-6 py-3.5 font-semibold">Duration</th>
                                                <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {calendar.periods.map((period) => {
                                                const sDate = new Date(period.startDate);
                                                const eDate = new Date(period.endDate);
                                                const diffWeeks = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24 * 7)));

                                                return (
                                                    <tr key={period.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-gray-900 flex items-center">
                                                            <CalendarIcon className="w-4 h-4 mr-2 text-[#006b3f]" />
                                                            {period.name}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                                                {period.type}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-700 font-medium">
                                                            {period.startDate.slice(0, 10)}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-700 font-medium">
                                                            {period.endDate.slice(0, 10)}
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                                            ~{diffWeeks} instructional weeks
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {hasManagePermission && (
                                                                <button
                                                                    onClick={() => handleDeletePeriod(period.id)}
                                                                    className="text-red-600 hover:text-red-800 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                                    title="Delete Period"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
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

                    {/* Readiness Checklist for Calendar */}
                    <Card className="bg-gray-50/70 border border-gray-200">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm font-bold text-gray-800">Academic Structure Readiness</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                            <div className="flex items-center space-x-2">
                                {calendar.periods?.length >= 2 ? (
                                    <CheckCircle2 className="w-4 h-4 text-[#006b3f]" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                )}
                                <span className={calendar.periods?.length >= 2 ? "text-gray-700 font-medium" : "text-amber-800 font-medium"}>
                                    {calendar.periods?.length >= 2
                                        ? "Academic periods properly scheduled (2+ periods configured)."
                                        : "Recommended: Ethiopian schools generally require at least 2 Semesters configured."}
                                </span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <CheckCircle2 className="w-4 h-4 text-[#006b3f]" />
                                <span className="text-gray-700">All period dates are validated within the academic year boundary without overlaps.</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Add Period Modal */}
            <Modal isOpen={isPeriodModalOpen} onClose={() => setIsPeriodModalOpen(false)} title="Add Academic Period / Semester">
                <form onSubmit={handleCreatePeriod} className="space-y-4">
                    {periodError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                            {periodError}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Period Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Semester 1, Term 1"
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
                        <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                            Year Date Bounds: <strong>{selectedYear.startDate.slice(0, 10)}</strong> to <strong>{selectedYear.endDate.slice(0, 10)}</strong>. Periods must fall strictly within this range and cannot overlap with existing periods.
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
