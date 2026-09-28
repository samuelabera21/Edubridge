"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    Settings, 
    Clock, 
    ShieldCheck, 
    Bell, 
    History, 
    Save, 
    CheckCircle2, 
    AlertCircle, 
    Calendar,
    RefreshCw,
    User,
    ArrowLeft,
    ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

const ALL_INSTRUCTIONAL_DAYS = [
    { key: "MONDAY", label: "Monday" },
    { key: "TUESDAY", label: "Tuesday" },
    { key: "WEDNESDAY", label: "Wednesday" },
    { key: "THURSDAY", label: "Thursday" },
    { key: "FRIDAY", label: "Friday" },
    { key: "SATURDAY", label: "Saturday" },
    { key: "SUNDAY", label: "Sunday" }
];

const LANGUAGE_OPTIONS = [
    "English",
    "Amharic",
    "Afaan Oromo",
    "Tigrigna",
    "Somali",
    "English / Amharic Bilingual",
    "Other"
];

export default function SchoolSettingsPage() {
    const { authData } = useAuth();
    const [activeTab, setActiveTab] = useState<"general" | "attendance" | "notifications" | "audit">("general");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Operational Settings State
    const [generalSettings, setGeneralSettings] = useState({
        primaryLanguage: "English",
        schoolDayStartTime: "08:00",
        schoolDayEndTime: "15:30",
        periodDurationMinutes: 45,
        instructionalDays: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
    });

    const [attendanceSettings, setAttendanceSettings] = useState({
        consecutiveUnexcusedAbsenceThreshold: 3,
        absenceAlertEnabled: true,
        attendanceNotificationEnabled: true
    });

    const [notificationSettings, setNotificationSettings] = useState({
        emergencyBroadcastEnabled: true,
        dailySummaryEnabled: false
    });

    // Audit Logs State
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotalPages, setAuditTotalPages] = useState(1);
    const [auditTotal, setAuditTotal] = useState(0);

    const hasUpdatePermission = authData?.access?.some((acc: any) => 
        acc.role?.permissions?.some((p: any) => p.permission?.name === "SCHOOL:UPDATE")
    ) ?? true;

    // Load Settings
    const loadSettings = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetchApi("/school-settings/settings");
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to load operational settings");
            }
            const data = await res.json();
            if (data.general) setGeneralSettings(data.general);
            if (data.attendance) setAttendanceSettings(data.attendance);
            if (data.notifications) setNotificationSettings(data.notifications);
        } catch (err: any) {
            console.error("Error fetching school settings:", err);
            setError(err.message || "Failed to load operational settings");
        } finally {
            setLoading(false);
        }
    };

    // Load Audit Logs
    const loadAuditLogs = async (page: number = 1) => {
        try {
            setAuditLoading(true);
            const res = await fetchApi(`/school-settings/audit-logs?page=${page}&limit=15`);
            if (res.ok) {
                const data = await res.json();
                setAuditLogs(data.logs || []);
                setAuditPage(data.page || 1);
                setAuditTotalPages(data.totalPages || 1);
                setAuditTotal(data.total || 0);
            }
        } catch (err) {
            console.error("Error loading audit logs:", err);
        } finally {
            setAuditLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (activeTab === "audit") {
            loadAuditLogs(auditPage);
        }
    }, [activeTab, auditPage]);

    // Handle Save by Category
    const handleSaveCategory = async (category: "general" | "attendance" | "notifications") => {
        try {
            setSaving(true);
            setError(null);
            setSuccessMessage(null);

            let payload: any = {};
            if (category === "general") {
                if (generalSettings.schoolDayStartTime >= generalSettings.schoolDayEndTime) {
                    setError("School day start time must be strictly earlier than end time.");
                    setSaving(false);
                    return;
                }
                if (generalSettings.periodDurationMinutes < 15 || generalSettings.periodDurationMinutes > 180) {
                    setError("Period duration must be between 15 and 180 minutes.");
                    setSaving(false);
                    return;
                }
                if (generalSettings.instructionalDays.length === 0) {
                    setError("At least one instructional day must be selected.");
                    setSaving(false);
                    return;
                }
                payload = generalSettings;
            } else if (category === "attendance") {
                if (
                    attendanceSettings.consecutiveUnexcusedAbsenceThreshold < 1 || 
                    attendanceSettings.consecutiveUnexcusedAbsenceThreshold > 30
                ) {
                    setError("Absence threshold must be between 1 and 30 days.");
                    setSaving(false);
                    return;
                }
                payload = attendanceSettings;
            } else if (category === "notifications") {
                payload = notificationSettings;
            }

            const res = await fetchApi("/school-settings/settings", {
                method: "PATCH",
                body: JSON.stringify({
                    category,
                    data: payload
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to update settings");
            }

            const resData = await res.json();
            if (resData.settings) {
                if (resData.settings.general) setGeneralSettings(resData.settings.general);
                if (resData.settings.attendance) setAttendanceSettings(resData.settings.attendance);
                if (resData.settings.notifications) setNotificationSettings(resData.settings.notifications);
            }

            setSuccessMessage(`${category.charAt(0).toUpperCase() + category.slice(1)} settings updated successfully.`);
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (err: any) {
            console.error("Save error:", err);
            setError(err.message || "Failed to update school settings.");
        } finally {
            setSaving(false);
        }
    };

    const toggleInstructionalDay = (dayKey: string) => {
        setGeneralSettings(prev => {
            const exists = prev.instructionalDays.includes(dayKey);
            const newDays = exists 
                ? prev.instructionalDays.filter(d => d !== dayKey)
                : [...prev.instructionalDays, dayKey];
            return { ...prev, instructionalDays: newDays };
        });
    };

    if (loading) return <LoadingState message="Loading school operational settings..." />;

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2.5">
                        <Settings className="w-7 h-7 text-[#006b3f]" />
                        <span>School Operational Settings</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure institutional schedules, attendance alert rules, and operational preferences.
                    </p>
                </div>
            </div>

            {/* Error / Success Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-sm text-red-800">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-sm text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="font-medium">{successMessage}</span>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 space-x-2 overflow-x-auto">
                <button
                    onClick={() => { setActiveTab("general"); setError(null); }}
                    className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "general"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    <span>General Operations</span>
                </button>

                <button
                    onClick={() => { setActiveTab("attendance"); setError(null); }}
                    className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "attendance"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Attendance Rules</span>
                </button>

                <button
                    onClick={() => { setActiveTab("notifications"); setError(null); }}
                    className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "notifications"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    <Bell className="w-4 h-4" />
                    <span>Notification Preferences</span>
                </button>

                <button
                    onClick={() => { setActiveTab("audit"); setError(null); }}
                    className={`flex items-center space-x-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "audit"
                            ? "border-[#006b3f] text-[#006b3f]"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    <History className="w-4 h-4" />
                    <span>Audit Activity</span>
                </button>
            </div>

            {/* TAB 1: GENERAL OPERATIONS */}
            {activeTab === "general" && (
                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader className="py-4 border-b border-gray-100">
                            <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                                <Clock className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Instructional Schedule & Language
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Primary Language */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                                        Primary Language of Instruction
                                    </label>
                                    <select
                                        value={generalSettings.primaryLanguage}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, primaryLanguage: e.target.value })}
                                        disabled={!hasUpdatePermission}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                    >
                                        {LANGUAGE_OPTIONS.map((lang) => (
                                            <option key={lang} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">Default medium of instruction across academic sections.</p>
                                </div>

                                {/* Period Duration */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                                        Standard Period Duration (Minutes)
                                    </label>
                                    <input
                                        type="number"
                                        min="15"
                                        max="180"
                                        value={generalSettings.periodDurationMinutes}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, periodDurationMinutes: parseInt(e.target.value, 10) || 45 })}
                                        disabled={!hasUpdatePermission}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Standard lesson duration for class scheduling.</p>
                                </div>

                                {/* Start Time */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                                        School Day Start Time (HH:MM)
                                    </label>
                                    <input
                                        type="time"
                                        value={generalSettings.schoolDayStartTime}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, schoolDayStartTime: e.target.value })}
                                        disabled={!hasUpdatePermission}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Official morning bell schedule start time.</p>
                                </div>

                                {/* End Time */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                                        School Day End Time (HH:MM)
                                    </label>
                                    <input
                                        type="time"
                                        value={generalSettings.schoolDayEndTime}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, schoolDayEndTime: e.target.value })}
                                        disabled={!hasUpdatePermission}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Official dismissal time for standard school days.</p>
                                </div>
                            </div>

                            {/* Instructional Days */}
                            <div className="pt-2 border-t border-gray-100">
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-2 flex items-center">
                                    <Calendar className="w-4 h-4 mr-1 text-[#006b3f]" />
                                    Active Instructional Days
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                                    {ALL_INSTRUCTIONAL_DAYS.map((day) => {
                                        const isSelected = generalSettings.instructionalDays.includes(day.key);
                                        return (
                                            <button
                                                key={day.key}
                                                type="button"
                                                onClick={() => toggleInstructionalDay(day.key)}
                                                disabled={!hasUpdatePermission}
                                                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                                                    isSelected
                                                        ? "bg-[#006b3f] text-white border-[#006b3f] shadow-sm"
                                                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Selected days define the active timetable cycle for the institution.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {hasUpdatePermission && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => handleSaveCategory("general")}
                                isLoading={saving}
                                leftIcon={<Save className="w-4 h-4" />}
                                className="bg-[#006b3f] hover:bg-[#005432] text-white"
                            >
                                Save General Operations
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: ATTENDANCE RULES */}
            {activeTab === "attendance" && (
                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader className="py-4 border-b border-gray-100">
                            <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                                <ShieldCheck className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Attendance Policy & Absence Triggers
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-6 space-y-5">
                            {/* Absence Threshold */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                                    Consecutive Unexcused Absence Warning Threshold (Days)
                                </label>
                                <div className="max-w-xs">
                                    <input
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={attendanceSettings.consecutiveUnexcusedAbsenceThreshold}
                                        onChange={(e) => setAttendanceSettings({
                                            ...attendanceSettings,
                                            consecutiveUnexcusedAbsenceThreshold: parseInt(e.target.value, 10) || 3
                                        })}
                                        disabled={!hasUpdatePermission}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#006b3f] focus:outline-none"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Number of consecutive unexcused absences before a student is flagged for administrative intervention.
                                </p>
                            </div>

                            {/* Absence Alert Toggle */}
                            <div className="pt-3 border-t border-gray-100 flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900">Automated Truancy Risk Flagging</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Highlight students exceeding the unexcused absence threshold on the Attendance Oversight dashboard.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={attendanceSettings.absenceAlertEnabled}
                                        onChange={(e) => setAttendanceSettings({
                                            ...attendanceSettings,
                                            absenceAlertEnabled: e.target.checked
                                        })}
                                        disabled={!hasUpdatePermission}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006b3f]"></div>
                                </label>
                            </div>

                            {/* Attendance Notification Toggle */}
                            <div className="pt-3 border-t border-gray-100 flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900">Attendance Roll-Call Summaries</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Enable daily section attendance completion tracking and summary notifications for school leadership.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={attendanceSettings.attendanceNotificationEnabled}
                                        onChange={(e) => setAttendanceSettings({
                                            ...attendanceSettings,
                                            attendanceNotificationEnabled: e.target.checked
                                        })}
                                        disabled={!hasUpdatePermission}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006b3f]"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {hasUpdatePermission && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => handleSaveCategory("attendance")}
                                isLoading={saving}
                                leftIcon={<Save className="w-4 h-4" />}
                                className="bg-[#006b3f] hover:bg-[#005432] text-white"
                            >
                                Save Attendance Rules
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: NOTIFICATION PREFERENCES */}
            {activeTab === "notifications" && (
                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader className="py-4 border-b border-gray-100">
                            <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                                <Bell className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Operational Notification Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-6 space-y-5">
                            {/* Emergency Broadcast Toggle */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900">Emergency & Critical Notices</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Allow emergency announcements and critical directives to be published and highlighted across all portals.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.emergencyBroadcastEnabled}
                                        onChange={(e) => setNotificationSettings({
                                            ...notificationSettings,
                                            emergencyBroadcastEnabled: e.target.checked
                                        })}
                                        disabled={!hasUpdatePermission}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006b3f]"></div>
                                </label>
                            </div>

                            {/* Daily Summary Toggle */}
                            <div className="pt-3 border-t border-gray-100 flex items-start justify-between gap-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-900">Daily Executive Summary</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Generate an end-of-day administrative summary covering attendance rates and active incidents.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.dailySummaryEnabled}
                                        onChange={(e) => setNotificationSettings({
                                            ...notificationSettings,
                                            dailySummaryEnabled: e.target.checked
                                        })}
                                        disabled={!hasUpdatePermission}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006b3f]"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {hasUpdatePermission && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => handleSaveCategory("notifications")}
                                isLoading={saving}
                                leftIcon={<Save className="w-4 h-4" />}
                                className="bg-[#006b3f] hover:bg-[#005432] text-white"
                            >
                                Save Notification Preferences
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 4: AUDIT ACTIVITY */}
            {activeTab === "audit" && (
                <div className="space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader className="py-4 border-b border-gray-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-base font-bold text-gray-900 flex items-center">
                                <History className="w-5 h-5 mr-2 text-[#006b3f]" />
                                Administrative Audit Activity Trail ({auditTotal} events)
                            </CardTitle>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadAuditLogs(auditPage)}
                                isLoading={auditLoading}
                                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                            >
                                Refresh
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0">
                            {auditLoading ? (
                                <div className="p-8 text-center text-sm text-gray-500">Loading audit activity logs...</div>
                            ) : auditLogs.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <History className="w-10 h-10 mx-auto text-emerald-300 mb-2" />
                                    <p className="font-semibold text-gray-800">No audit activity logged yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Audit entries will automatically populate as administrative changes occur.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="px-5 py-3 font-semibold">Action</th>
                                                <th className="px-5 py-3 font-semibold">Resource</th>
                                                <th className="px-5 py-3 font-semibold">Actor</th>
                                                <th className="px-5 py-3 font-semibold">Details</th>
                                                <th className="px-5 py-3 font-semibold">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {auditLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                                                    <td className="px-5 py-3.5">
                                                        <span className="inline-block px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs font-semibold text-gray-700">
                                                        {log.resource}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-gray-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3.5 h-3.5 text-gray-400" />
                                                            <span>{log.user?.name || log.user?.email || "System"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-gray-600 max-w-xs truncate">
                                                        {log.newValue ? JSON.stringify(log.newValue) : "—"}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination Controls */}
                            {auditTotalPages > 1 && (
                                <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        Page {auditPage} of {auditTotalPages}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                                            disabled={auditPage <= 1 || auditLoading}
                                            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAuditPage(prev => Math.min(auditTotalPages, prev + 1))}
                                            disabled={auditPage >= auditTotalPages || auditLoading}
                                        >
                                            <span className="flex items-center gap-1">
                                                Next
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
