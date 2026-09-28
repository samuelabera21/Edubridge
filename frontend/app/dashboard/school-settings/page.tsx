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
    RefreshCw,
    User,
    ArrowLeft,
    ArrowRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";

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
                    setError("Start time must be before end time.");
                    setSaving(false);
                    return;
                }
                if (generalSettings.periodDurationMinutes < 15 || generalSettings.periodDurationMinutes > 180) {
                    setError("Period duration must be between 15 and 180 minutes.");
                    setSaving(false);
                    return;
                }
                if (generalSettings.instructionalDays.length === 0) {
                    setError("Select at least one instructional day.");
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

            setSuccessMessage("Settings saved successfully.");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error("Save error:", err);
            setError(err.message || "Failed to save settings.");
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

    if (loading) return <LoadingState message="Loading settings..." />;

    return (
        <div className="space-y-5 text-slate-800">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2.5">
                    <Settings className="w-6 h-6 text-[#4085b3]" />
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">School Settings</h1>
                        <p className="text-xs text-slate-500">Operational configuration, bell schedules, and audit log.</p>
                    </div>
                </div>
            </div>

            {/* Error / Success Alerts */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2.5 text-xs text-red-800 font-medium">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto text-xs">
                <button
                    onClick={() => { setActiveTab("general"); setError(null); }}
                    className={`flex items-center space-x-2 py-2.5 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "general"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                >
                    <Clock className="w-3.5 h-3.5" />
                    <span>General Operations</span>
                </button>

                <button
                    onClick={() => { setActiveTab("attendance"); setError(null); }}
                    className={`flex items-center space-x-2 py-2.5 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "attendance"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Attendance Rules</span>
                </button>

                <button
                    onClick={() => { setActiveTab("notifications"); setError(null); }}
                    className={`flex items-center space-x-2 py-2.5 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "notifications"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                >
                    <Bell className="w-3.5 h-3.5" />
                    <span>Notification Preferences</span>
                </button>

                <button
                    onClick={() => { setActiveTab("audit"); setError(null); }}
                    className={`flex items-center space-x-2 py-2.5 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === "audit"
                            ? "border-[#4085b3] text-[#4085b3]"
                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                >
                    <History className="w-3.5 h-3.5" />
                    <span>Audit Activity</span>
                </button>
            </div>

            {/* TAB 1: GENERAL OPERATIONS */}
            {activeTab === "general" && (
                <div className="space-y-4">
                    <Card className="shadow-sm border border-slate-200">
                        <CardContent className="p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Primary Language
                                    </label>
                                    <select
                                        value={generalSettings.primaryLanguage}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, primaryLanguage: e.target.value })}
                                        disabled={!hasUpdatePermission}
                                        className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-[#4085b3] focus:outline-none"
                                    >
                                        {LANGUAGE_OPTIONS.map((lang) => (
                                            <option key={lang} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Period Duration (Minutes)
                                    </label>
                                    <input
                                        type="number"
                                        min="15"
                                        max="180"
                                        value={generalSettings.periodDurationMinutes}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, periodDurationMinutes: parseInt(e.target.value, 10) || 45 })}
                                        disabled={!hasUpdatePermission}
                                        className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#4085b3] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        School Day Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={generalSettings.schoolDayStartTime}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, schoolDayStartTime: e.target.value })}
                                        disabled={!hasUpdatePermission}
                                        className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#4085b3] focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        School Day End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={generalSettings.schoolDayEndTime}
                                        onChange={(e) => setGeneralSettings({ ...generalSettings, schoolDayEndTime: e.target.value })}
                                        disabled={!hasUpdatePermission}
                                        className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#4085b3] focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Instructional Days */}
                            <div className="pt-3 border-t border-slate-100">
                                <label className="block text-xs font-semibold text-slate-700 mb-2">
                                    Instructional Days
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_INSTRUCTIONAL_DAYS.map((day) => {
                                        const isSelected = generalSettings.instructionalDays.includes(day.key);
                                        return (
                                            <button
                                                key={day.key}
                                                type="button"
                                                onClick={() => toggleInstructionalDay(day.key)}
                                                disabled={!hasUpdatePermission}
                                                className={`py-1.5 px-3.5 rounded-lg text-xs font-medium border transition-all ${
                                                    isSelected
                                                        ? "bg-[#4085b3] text-white border-[#4085b3] shadow-sm hover:bg-[#32698e]"
                                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {hasUpdatePermission && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => handleSaveCategory("general")}
                                isLoading={saving}
                                leftIcon={<Save className="w-3.5 h-3.5" />}
                                className="bg-[#4085b3] hover:bg-[#32698e] text-white"
                            >
                                Save General Operations
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: ATTENDANCE RULES */}
            {activeTab === "attendance" && (
                <div className="space-y-4">
                    <Card className="shadow-sm border border-slate-200">
                        <CardContent className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                                        className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:ring-2 focus:ring-[#4085b3] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-semibold text-slate-900">Automated Truancy Risk Flagging</div>
                                    <div className="text-[11px] text-slate-500">Highlight students exceeding the unexcused absence threshold</div>
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
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4085b3]"></div>
                                </label>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-semibold text-slate-900">Roll-Call Completion Summaries</div>
                                    <div className="text-[11px] text-slate-500">Track daily section attendance completion for administration</div>
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
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4085b3]"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {hasUpdatePermission && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => handleSaveCategory("attendance")}
                                isLoading={saving}
                                leftIcon={<Save className="w-3.5 h-3.5" />}
                                className="bg-[#4085b3] hover:bg-[#32698e] text-white"
                            >
                                Save Attendance Rules
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 3: NOTIFICATION PREFERENCES */}
            {activeTab === "notifications" && (
                <div className="space-y-4">
                    <Card className="shadow-sm border border-slate-200">
                        <CardContent className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-semibold text-slate-900">Emergency Broadcasts</div>
                                    <div className="text-[11px] text-slate-500">Publish urgent notices across staff and parent dashboards</div>
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
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4085b3]"></div>
                                </label>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-semibold text-slate-900">Daily Summary Report</div>
                                    <div className="text-[11px] text-slate-500">Generate end-of-day operational summary</div>
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
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4085b3]"></div>
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {hasUpdatePermission && (
                        <div className="flex justify-end">
                            <Button
                                onClick={() => handleSaveCategory("notifications")}
                                isLoading={saving}
                                leftIcon={<Save className="w-3.5 h-3.5" />}
                                className="bg-[#4085b3] hover:bg-[#32698e] text-white"
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
                    <Card className="shadow-sm border border-slate-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-900">
                                Audit Activity ({auditTotal} events)
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadAuditLogs(auditPage)}
                                isLoading={auditLoading}
                                leftIcon={<RefreshCw className="w-3 h-3" />}
                            >
                                Refresh
                            </Button>
                        </div>

                        <CardContent className="p-0">
                            {auditLoading ? (
                                <div className="p-6 text-center text-xs text-slate-500">Loading audit log...</div>
                            ) : auditLogs.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">
                                    <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                                    <p className="text-xs font-semibold text-slate-700">No audit activity logged</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-2.5 font-semibold">Action</th>
                                                <th className="px-4 py-2.5 font-semibold">Resource</th>
                                                <th className="px-4 py-2.5 font-semibold">Actor</th>
                                                <th className="px-4 py-2.5 font-semibold">Details</th>
                                                <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {auditLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="px-4 py-2.5 font-mono font-semibold text-[11px] text-[#4085b3]">
                                                        {log.action}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-700 font-medium">
                                                        {log.resource}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-3 h-3 text-slate-400" />
                                                            <span>{log.user?.name || log.user?.email || "System"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-500 max-w-xs truncate font-mono text-[11px]">
                                                        {log.newValue ? JSON.stringify(log.newValue) : "—"}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination */}
                            {auditTotalPages > 1 && (
                                <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="text-slate-500">
                                        Page {auditPage} of {auditTotalPages}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                                            disabled={auditPage <= 1 || auditLoading}
                                            leftIcon={<ArrowLeft className="w-3 h-3" />}
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
                                                <ArrowRight className="w-3 h-3" />
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
