"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    AlertTriangle, 
    ShieldAlert, 
    Search, 
    X, 
    UserCheck, 
    Calendar,
    Clock,
    ArrowRight,
    CheckCircle2,
    Building2,
    User,
    RefreshCw,
    ExternalLink
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";

interface RiskAlert {
    id: string;
    type: "STUDENT_CONSECUTIVE_ABSENCE" | "STUDENT_CHRONIC_ABSENCE" | "SECTION_ANOMALY" | "TEACHER_ABSENCE";
    severity: "CRITICAL" | "WARNING" | "INFO";
    targetId: string;
    enrollmentId?: string;
    teacherId?: string;
    sectionId?: string;
    title: string;
    description: string;
    metric: string;
    date?: string;
    suggestedAction: string;
}

export default function AttendanceAlertsPage() {
    const router = useRouter();
    const { authData } = useAuth();

    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    
    const [alerts, setAlerts] = useState<RiskAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Action Modal
    const [activeAlert, setActiveAlert] = useState<RiskAlert | null>(null);
    const [actionNotes, setActionNotes] = useState("");
    const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

    // Initial Year Load
    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetchApi("/academic/years");
                if (res.ok) {
                    const data: AcademicYear[] = await res.json();
                    setYears(data);
                    const active = data.find(y => y.status === "ACTIVE");
                    if (active) setSelectedYearId(active.id);
                }
            } catch (e) {
                console.error(e);
            }
        };
        init();
    }, []);

    const loadAlerts = async (isManual = false) => {
        try {
            if (isManual) setRefreshing(true);
            else setLoading(true);
            setError(null);

            const q = new URLSearchParams();
            if (selectedYearId) q.set("academicYearId", selectedYearId);

            const res = await fetchApi(`/attendance/admin/alerts?${q.toString()}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to load risk alerts");
            }

            const data: RiskAlert[] = await res.json();
            setAlerts(data);
        } catch (err: any) {
            setError(err.message || "Failed to load absence alerts");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadAlerts();
    }, [selectedYearId]);

    // Filter alerts
    const filteredAlerts = alerts.filter(a => {
        if (selectedSeverity !== "ALL" && a.severity !== selectedSeverity) return false;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return (
                a.title.toLowerCase().includes(query) ||
                a.description.toLowerCase().includes(query) ||
                a.metric.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const criticalCount = alerts.filter(a => a.severity === "CRITICAL").length;
    const warningCount = alerts.filter(a => a.severity === "WARNING").length;

    const handleLogIntervention = (e: React.FormEvent) => {
        e.preventDefault();
        setActionSuccessMsg(`Intervention action recorded for ${activeAlert?.title}.`);
        setTimeout(() => {
            setActiveAlert(null);
            setActionSuccessMsg(null);
            setActionNotes("");
        }, 1500);
    };

    return (
        <div className="space-y-6 text-black">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <ShieldAlert className="w-7 h-7 text-red-600" />
                        <span>Absence Risk & Early Warning Alerts</span>
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Automated detection of consecutive student absences, chronic absenteeism, and section deficits.
                    </p>
                </div>

                <div className="flex items-center space-x-3">
                    {years.length > 0 && (
                        <select
                            value={selectedYearId}
                            onChange={(e) => setSelectedYearId(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-medium shadow-sm focus:ring-2 focus:ring-[#006b3f]"
                        >
                            {years.map(y => (
                                <option key={y.id} value={y.id}>
                                    {y.name} {y.status === "ACTIVE" ? "(Active)" : ""}
                                </option>
                            ))}
                        </select>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadAlerts(true)}
                        disabled={refreshing}
                        className="flex items-center space-x-1"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                        <span>Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Severity Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-red-800 uppercase">Critical Risks (Immediate Action)</span>
                        <p className="text-2xl font-extrabold text-red-900">{criticalCount}</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-full text-red-700">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                </div>

                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div>
                        <span className="text-xs font-bold text-amber-800 uppercase">Attention Warnings</span>
                        <p className="text-2xl font-extrabold text-amber-900">{warningCount}</p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-full text-amber-700">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between shadow-sm">
                    <div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Total Flagged Items</span>
                        <p className="text-2xl font-extrabold text-gray-900">{alerts.length}</p>
                    </div>
                    <div className="p-3 bg-gray-100 rounded-full text-gray-700">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <Card className="border-gray-200 shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            placeholder="Filter alerts by name, metric, or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                        />
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        {["ALL", "CRITICAL", "WARNING"].map((sev) => (
                            <button
                                key={sev}
                                onClick={() => setSelectedSeverity(sev)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                    selectedSeverity === sev
                                        ? "bg-gray-900 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                {sev === "ALL" ? "All Alerts" : sev}
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Alerts List */}
            {loading ? (
                <div className="p-12">
                    <LoadingState message="Scanning school attendance records for risks..." />
                </div>
            ) : error ? (
                <ErrorState message={error} onRetry={() => loadAlerts()} />
            ) : filteredAlerts.length === 0 ? (
                <Card className="border-gray-200 p-12 text-center text-gray-400">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
                    <h3 className="font-bold text-gray-900 text-base">No active absence risks found</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        All enrolled students, sections, and faculty members are maintaining healthy presence rates.
                    </p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className={`p-5 rounded-xl border transition-all ${
                                alert.severity === "CRITICAL"
                                    ? "bg-red-50/40 border-red-200 hover:border-red-300"
                                    : "bg-amber-50/40 border-amber-200 hover:border-amber-300"
                            }`}
                        >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="space-y-1.5">
                                    <div className="flex items-center space-x-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                            alert.severity === "CRITICAL"
                                                ? "bg-red-600 text-white"
                                                : "bg-amber-600 text-white"
                                        }`}>
                                            {alert.severity}
                                        </span>
                                        <span className="text-xs font-bold text-gray-700 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                                            {alert.type.replace(/_/g, " ")}
                                        </span>
                                        {alert.date && (
                                            <span className="text-xs text-gray-500">
                                                Triggered on {alert.date}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-bold text-gray-900">
                                        {alert.title}
                                    </h3>
                                    <p className="text-xs text-gray-700 max-w-3xl">
                                        {alert.description}
                                    </p>
                                    <div className="flex items-center space-x-2 pt-1">
                                        <span className="text-xs font-bold text-gray-900 bg-white px-2.5 py-1 rounded border border-gray-200 shadow-2xs">
                                            Metric: <strong className="text-red-700">{alert.metric}</strong>
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Recommended: <em className="text-gray-700 font-medium">{alert.suggestedAction}</em>
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 shrink-0">
                                    {alert.enrollmentId && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/attendance/student?gradeId=&search=`)}
                                            className="text-xs bg-white flex items-center space-x-1"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Inspect Student</span>
                                        </Button>
                                    )}
                                    {alert.sectionId && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/dashboard/attendance/student?sectionId=${alert.sectionId}`)}
                                            className="text-xs bg-white flex items-center space-x-1"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Inspect Section</span>
                                        </Button>
                                    )}
                                    {alert.teacherId && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push("/dashboard/attendance/teacher")}
                                            className="text-xs bg-white flex items-center space-x-1"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>Inspect Faculty</span>
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setActiveAlert(alert);
                                            setActionNotes("");
                                            setActionSuccessMsg(null);
                                        }}
                                        className="bg-[#006b3f] hover:bg-[#005a34] text-white text-xs"
                                    >
                                        Log Intervention
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Intervention Log Modal */}
            {activeAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-150">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                                <ShieldAlert className="w-5 h-5 text-red-600" />
                                <span>Administrative Follow-Up Log</span>
                            </h3>
                            <button
                                onClick={() => setActiveAlert(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleLogIntervention} className="p-6 space-y-4">
                            {actionSuccessMsg ? (
                                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-lg text-sm font-semibold flex items-center">
                                    <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-600" />
                                    {actionSuccessMsg}
                                </div>
                            ) : (
                                <>
                                    <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
                                        <p className="font-bold text-gray-900">{activeAlert.title}</p>
                                        <p className="text-gray-600">{activeAlert.description}</p>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">
                                            Intervention & Counseling Notes
                                        </label>
                                        <textarea
                                            rows={4}
                                            required
                                            value={actionNotes}
                                            onChange={(e) => setActionNotes(e.target.value)}
                                            placeholder="Detail parent contact, medical verification, home visit notes, or agreed action plan..."
                                            className="w-full p-3 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#006b3f]"
                                        />
                                    </div>

                                    <div className="flex justify-end space-x-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setActiveAlert(null)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-[#006b3f] hover:bg-[#005a34] text-white"
                                        >
                                            Save Follow-Up
                                        </Button>
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
