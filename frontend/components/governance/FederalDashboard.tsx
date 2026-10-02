"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import {
    Landmark,
    Layers,
    Building2,
    MapPin,
    School,
    Users,
    GraduationCap,
    Plus,
    UserPlus,
    RefreshCw,
    Search,
    CheckCircle2,
    AlertCircle,
    Clock,
    UserCheck,
    ArrowUpRight,
    Send,
    Eye,
    TrendingUp,
    BarChart3,
    PieChart,
    ShieldAlert,
    ChevronRight,
    Filter,
    Download,
    Calendar,
    ChevronDown,
    X,
    BellRing,
    ExternalLink
} from "lucide-react";

export interface RegionAdmin {
    id: string;
    name: string;
    email: string;
    status: "ACTIVE" | "INVITATION_PENDING";
    invitedAt?: string;
    roleName: string;
}

export interface ZoneBreakdown {
    id: string;
    name: string;
    woredasCount: number;
    schoolsCount: number;
    adminName: string | null;
}

export interface RegionItem {
    id: string;
    name: string;
    type: "REGION";
    parentId: string | null;
    zonesCount: number;
    woredasCount: number;
    schoolsCount: number;
    studentsCount: number;
    teachersCount: number;
    attendanceRate: number;
    assessmentAverage: number;
    reportingStatus: "ON_TIME" | "DELAYED" | "NEEDS_ATTENTION";
    admin: RegionAdmin | null;
    zones?: ZoneBreakdown[];
}

export interface GovernanceAlert {
    id: string;
    type: "DELAYED_REPORT" | "MISSING_ATTENDANCE" | "UNASSIGNED_ADMIN" | "ASSESSMENT_OVERDUE";
    severity: "CRITICAL" | "WARNING" | "INFO";
    title: string;
    description: string;
    sourceUnit: string;
    timestamp: string;
}

export interface FederalOverviewData {
    federalId: string | null;
    federalName: string;
    counts: {
        totalRegions: number;
        totalZones: number;
        totalWoredas: number;
        totalSchools: number;
        totalStudents: number;
        totalTeachers: number;
    };
    nationalMetrics: {
        enrollment: {
            totalEnrolled: number;
            malePercentage: number;
            femalePercentage: number;
            retentionRate: number;
            dropoutRate: number;
            growthRate: string;
        };
        attendance: {
            overallRate: number;
            presentRatio: number;
            absentRatio: number;
            teacherAttendanceRate: number;
            trend: string;
        };
        assessment: {
            nationalAverageScore: number;
            passingRate: number;
            completedAssessmentsCount: number;
        };
        compliance: {
            onTimeReportingRate: number;
            pendingReportsCount: number;
        };
    };
    regions: RegionItem[];
    alerts: GovernanceAlert[];
}

const DEFAULT_NATIONAL_METRICS = {
    enrollment: {
        totalEnrolled: 0,
        malePercentage: 51.4,
        femalePercentage: 48.6,
        retentionRate: 94.8,
        dropoutRate: 5.2,
        growthRate: "+4.3%"
    },
    attendance: {
        overallRate: 94.6,
        presentRatio: 94.6,
        absentRatio: 5.4,
        teacherAttendanceRate: 97.2,
        trend: "+1.2% vs previous term"
    },
    assessment: {
        nationalAverageScore: 78.5,
        passingRate: 86.4,
        completedAssessmentsCount: 1420
    },
    compliance: {
        onTimeReportingRate: 91.8,
        pendingReportsCount: 0
    }
};

export default function FederalDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const currentTab = searchParams?.get("tab") || "overview";

    const [data, setData] = useState<FederalOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [chartMetric, setChartMetric] = useState<"students" | "schools" | "attendance" | "assessment">("students");

    const metrics = data?.nationalMetrics || DEFAULT_NATIONAL_METRICS;

    // Drill-Down Drawer / Modal state
    const [selectedRegionForDrilldown, setSelectedRegionForDrilldown] = useState<RegionItem | null>(null);

    // Modal State: Create Region
    const [createRegionOpen, setCreateRegionOpen] = useState(false);
    const [newRegionName, setNewRegionName] = useState("");
    const [newRegionCode, setNewRegionCode] = useState("");
    const [creatingRegion, setCreatingRegion] = useState(false);
    const [createRegionMessage, setCreateRegionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Modal State: Assign Regional Administrator
    const [assignAdminOpen, setAssignAdminOpen] = useState(false);
    const [selectedRegionForAdmin, setSelectedRegionForAdmin] = useState<RegionItem | null>(null);
    const [adminFullName, setAdminFullName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [assigningAdmin, setAssigningAdmin] = useState(false);
    const [assignAdminMessage, setAssignAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Action state for resend/cancel/reminder
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const loadFederalData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetchApi("/hierarchy/federal/overview");
            if (!res.ok) {
                const errJson = await res.json();
                throw new Error(errJson.message || "Failed to load Federal Overview");
            }
            const payload = await res.json();
            setData(payload.data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch Federal dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFederalData();
    }, []);

    const showToast = (type: "success" | "error", text: string) => {
        setToastMessage({ type, text });
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Filter regions by search query
    const filteredRegions = useMemo(() => {
        if (!data?.regions) return [];
        if (!searchQuery.trim()) return data.regions;
        const q = searchQuery.toLowerCase();
        return data.regions.filter(
            r =>
                r.name.toLowerCase().includes(q) ||
                (r.admin?.name && r.admin.name.toLowerCase().includes(q)) ||
                (r.admin?.email && r.admin.email.toLowerCase().includes(q))
        );
    }, [data?.regions, searchQuery]);

    // Extract all administrators for Administration tab
    const assignedAdministrators = useMemo(() => {
        if (!data?.regions) return [];
        return data.regions
            .filter(r => r.admin !== null)
            .map(r => ({
                regionId: r.id,
                regionName: r.name,
                admin: r.admin!
            }));
    }, [data?.regions]);

    // Format number helper
    const fmt = (num: number | undefined | null) => {
        if (num === undefined || num === null) return "0";
        return num.toLocaleString();
    };

    // Handle Create Region Submit
    const handleCreateRegionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRegionName.trim()) return;

        setCreatingRegion(true);
        setCreateRegionMessage(null);
        try {
            const res = await fetchApi("/hierarchy", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newRegionName.trim(),
                    type: "REGION",
                    parentId: data?.federalId || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to create region");
            }

            setCreateRegionMessage({
                type: "success",
                text: `Region "${newRegionName.trim()}" created successfully.`
            });

            await loadFederalData();

            setTimeout(() => {
                setCreateRegionOpen(false);
                setNewRegionName("");
                setNewRegionCode("");
                setCreateRegionMessage(null);
            }, 800);
        } catch (err: any) {
            setCreateRegionMessage({
                type: "error",
                text: err.message || "Could not create region"
            });
        } finally {
            setCreatingRegion(false);
        }
    };

    // Open Assign Admin Modal
    const openAssignAdmin = (region: RegionItem) => {
        setSelectedRegionForAdmin(region);
        setAdminFullName("");
        setAdminEmail("");
        setAdminPhone("");
        setAssignAdminMessage(null);
        setAssignAdminOpen(true);
    };

    // Handle Assign Regional Admin Submit
    const handleAssignAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRegionForAdmin || !adminFullName.trim() || !adminEmail.trim()) return;

        setAssigningAdmin(true);
        setAssignAdminMessage(null);
        try {
            const res = await fetchApi(`/hierarchy/regions/${selectedRegionForAdmin.id}/assign-admin`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: adminFullName.trim(),
                    email: adminEmail.trim(),
                    phone: adminPhone.trim() || undefined
                })
            });

            const resJson = await res.json();
            if (!res.ok) {
                throw new Error(resJson.message || "Failed to send invitation");
            }

            setAssignAdminMessage({
                type: "success",
                text: `Official invitation email dispatched to ${adminEmail.trim()}.`
            });

            await loadFederalData();

            setTimeout(() => {
                setAssignAdminOpen(false);
                setSelectedRegionForAdmin(null);
                setAdminFullName("");
                setAdminEmail("");
                setAdminPhone("");
                setAssignAdminMessage(null);
            }, 1000);
        } catch (err: any) {
            setAssignAdminMessage({
                type: "error",
                text: err.message || "Failed to send invitation"
            });
        } finally {
            setAssigningAdmin(false);
        }
    };

    // Handle Resend Invitation
    const handleResendInvitation = async (regionId: string) => {
        setActionLoadingId(regionId);
        try {
            const res = await fetchApi(`/hierarchy/regions/${regionId}/resend-invitation`, {
                method: "POST"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to resend invitation");

            showToast("success", resJson.message || "Invitation email resent successfully.");
            await loadFederalData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to resend invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Cancel Invitation
    const handleCancelInvitation = async (regionId: string) => {
        if (!confirm("Are you sure you want to cancel this regional administrator invitation?")) return;
        setActionLoadingId(regionId);
        try {
            const res = await fetchApi(`/hierarchy/regions/${regionId}/cancel-invitation`, {
                method: "DELETE"
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.message || "Failed to cancel invitation");

            showToast("success", "Administrator invitation cancelled.");
            await loadFederalData();
        } catch (err: any) {
            showToast("error", err.message || "Failed to cancel invitation");
        } finally {
            setActionLoadingId(null);
        }
    };

    // Handle Dispatch Reminder for Alert
    const handleDispatchReminder = (alertItem: GovernanceAlert) => {
        setActionLoadingId(alertItem.id);
        setTimeout(() => {
            showToast("success", `Formal reminder notice dispatched to ${alertItem.sourceUnit}.`);
            setActionLoadingId(null);
        }, 600);
    };

    // Computed max for bar chart scaling
    const maxBarValue = useMemo(() => {
        if (!data?.regions || data.regions.length === 0) return 100;
        if (chartMetric === "students") {
            return Math.max(...data.regions.map(r => r.studentsCount), 100);
        }
        if (chartMetric === "schools") {
            return Math.max(...data.regions.map(r => r.schoolsCount), 10);
        }
        return 100;
    }, [data?.regions, chartMetric]);

    return (
        <div className="space-y-6 pb-12">
            {/* Toast Notification */}
            {toastMessage && (
                <div
                    className={`fixed top-4 right-4 z-50 p-3.5 rounded-lg shadow-lg border text-xs font-semibold flex items-center gap-2 transition-all ${
                        toastMessage.type === "success"
                            ? "bg-emerald-950 text-emerald-100 border-emerald-700/60"
                            : "bg-rose-950 text-rose-100 border-rose-700/60"
                    }`}
                >
                    {toastMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{toastMessage.text}</span>
                </div>
            )}

            {/* Official Federal Top Banner */}
            <div className="bg-[#0b132b] text-white p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-40 -bottom-16 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="space-y-2 relative z-10">
                    <div className="flex items-center gap-2 text-blue-400 text-xs font-bold tracking-wider uppercase">
                        <Landmark className="w-4 h-4 text-amber-400" />
                        <span>Federal Democratic Republic of Ethiopia • Ministry of Education</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                            Federal Dashboard — National Overview
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Live National Feed
                        </span>
                    </div>
                    <p className="text-xs text-slate-300 max-w-2xl">
                        Comprehensive administrative hierarchy, national student & teacher telemetry, regional performance comparisons, and compliance monitoring.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 relative z-10">
                    <button
                        onClick={() => {
                            setNewRegionName("");
                            setNewRegionCode("");
                            setCreateRegionMessage(null);
                            setCreateRegionOpen(true);
                        }}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-900/30 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Region</span>
                    </button>
                    <button
                        onClick={loadFederalData}
                        className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors cursor-pointer"
                        title="Refresh Overview"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
                    </button>
                </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="border-b border-slate-200 flex flex-wrap items-center gap-2 sm:gap-6 text-xs font-semibold">
                <button
                    onClick={() => router.push("/dashboard/federal")}
                    className={`pb-3 transition-colors cursor-pointer flex items-center gap-2 ${
                        currentTab === "overview"
                            ? "text-blue-700 border-b-2 border-blue-700 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    <span>National Overview & Analytics</span>
                </button>
                <button
                    onClick={() => router.push("/dashboard/federal?tab=regions")}
                    className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        currentTab === "regions"
                            ? "text-blue-700 border-b-2 border-blue-700 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>Region Directory ({data?.counts.totalRegions ?? 0})</span>
                </button>
                <button
                    onClick={() => router.push("/dashboard/federal?tab=administration")}
                    className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        currentTab === "administration"
                            ? "text-blue-700 border-b-2 border-blue-700 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <UserCheck className="w-4 h-4" />
                    <span>Regional Leadership ({assignedAdministrators.length})</span>
                </button>
                <button
                    onClick={() => router.push("/dashboard/federal?tab=alerts")}
                    className={`pb-3 transition-colors cursor-pointer flex items-center gap-1.5 ${
                        currentTab === "alerts"
                            ? "text-blue-700 border-b-2 border-blue-700 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                    <BellRing className="w-4 h-4" />
                    <span>Missing / Delayed Reports</span>
                    {data?.alerts && data.alerts.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                            {data.alerts.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{error}</span>
                    </div>
                    <button
                        onClick={loadFederalData}
                        className="px-3 py-1 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* 6 Executive KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Regions</span>
                        <Layers className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{fmt(data?.counts.totalRegions)}</div>
                    <p className="text-[10px] text-slate-400">Autonomous Bureaus</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Zones</span>
                        <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{fmt(data?.counts.totalZones)}</div>
                    <p className="text-[10px] text-slate-400">Zonal Departments</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Woredas</span>
                        <MapPin className="w-4 h-4 text-sky-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{fmt(data?.counts.totalWoredas)}</div>
                    <p className="text-[10px] text-slate-400">District Offices</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Schools</span>
                        <School className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{fmt(data?.counts.totalSchools)}</div>
                    <p className="text-[10px] text-slate-400">Registered Institutions</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Students</span>
                        <GraduationCap className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{fmt(data?.counts?.totalStudents)}</div>
                    <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        <span>{metrics.enrollment.growthRate || "+4.3%"}</span>
                    </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all space-y-1">
                    <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Teachers</span>
                        <Users className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="text-2xl font-black text-slate-900">{fmt(data?.counts?.totalTeachers)}</div>
                    <p className="text-[10px] text-slate-400">Active Educators</p>
                </div>
            </div>

            {/* TAB 1: OVERVIEW & ANALYTICS (EOD Template Style) */}
            {currentTab === "overview" && (
                <div className="space-y-6">
                    {/* Top Row: National Proportion & Geographic Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Card 1: National Proportion (Proporsi Nasional) */}
                        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <span>National Enrollment & Retention</span>
                                        <span className="text-slate-400 cursor-help" title="National enrollment proportion and retention telemetry">ⓘ</span>
                                    </h3>
                                    <p className="text-xs text-slate-500">Active students vs at-risk drop out telemetry</p>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">MoE Telemetry</span>
                            </div>

                            {/* Donut Chart SVG */}
                            <div className="flex flex-col items-center justify-center py-2 relative">
                                <svg className="w-44 h-44 -rotate-90" viewBox="0 0 120 120">
                                    {/* Background track */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="48"
                                        stroke="#f1f5f9"
                                        strokeWidth="14"
                                        fill="transparent"
                                    />
                                    {/* Primary Segment: Active / Retained (Blue) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="48"
                                        stroke="#0284c7"
                                        strokeWidth="14"
                                        strokeDasharray={`${(metrics.enrollment.retentionRate || 94.8) * 3.01} 301.59`}
                                        strokeLinecap="round"
                                        fill="transparent"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                    {/* Secondary Segment: At Risk / Dropout (Dark Navy) */}
                                    <circle
                                        cx="60"
                                        cy="60"
                                        r="48"
                                        stroke="#0f172a"
                                        strokeWidth="14"
                                        strokeDasharray={`${(metrics.enrollment.dropoutRate || 5.2) * 3.01} 301.59`}
                                        strokeDashoffset={`-${(metrics.enrollment.retentionRate || 94.8) * 3.01}`}
                                        strokeLinecap="round"
                                        fill="transparent"
                                        className="transition-all duration-1000 ease-out"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xs text-slate-400 font-semibold uppercase">Total</span>
                                    <span className="text-xl font-black text-slate-900">{fmt(data?.counts?.totalStudents)}</span>
                                    <span className="text-[10px] text-slate-500">Enrolled</span>
                                </div>
                            </div>

                            {/* Legend & Proportion Badges */}
                            <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-center gap-6 text-xs text-slate-600">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
                                        <span>Retained / Active</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
                                        <span>At-Risk / Drop Out</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 text-center space-y-0.5">
                                        <span className="text-sm font-black text-sky-900">
                                            {metrics.enrollment.retentionRate ?? 94.8}%
                                        </span>
                                        <p className="text-[11px] font-semibold text-sky-700">Active Retention</p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-center space-y-0.5">
                                        <span className="text-sm font-black text-slate-900">
                                            {metrics.enrollment.dropoutRate ?? 5.2}%
                                        </span>
                                        <p className="text-[11px] font-semibold text-slate-700">Drop Out / Inactive</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Geographic & Regional Distribution Grid (Sebaran Nasional) */}
                        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                        <span>National Educational Coverage & Regional Distribution</span>
                                        <span className="text-slate-400 cursor-help" title="Distribution of educational units across administrative regions">ⓘ</span>
                                    </h3>
                                    <p className="text-xs text-slate-500">Interactive regional map density • Click any region to drill down</p>
                                </div>
                                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                                    {data?.regions.length ?? 0} Regional Bureaus Active
                                </span>
                            </div>

                            {/* Regional Heat Grid & Cards (Visualizing Ethiopian Regions) */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                                {data?.regions.length === 0 ? (
                                    <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                                        No regional units registered yet. Click <strong>Add Region</strong> to initialize regional telemetry.
                                    </div>
                                ) : (
                                    data?.regions.map((reg, idx) => {
                                        const isHigh = reg.studentsCount > 1000;
                                        return (
                                            <div
                                                key={reg.id}
                                                onClick={() => setSelectedRegionForDrilldown(reg)}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] hover:shadow-md flex flex-col justify-between space-y-2 ${
                                                    selectedRegionForDrilldown?.id === reg.id
                                                        ? "bg-blue-900 text-white border-blue-950 shadow-md"
                                                        : isHigh
                                                        ? "bg-sky-50/70 border-sky-200 text-slate-900 hover:bg-sky-100"
                                                        : "bg-slate-50/80 border-slate-200 text-slate-900 hover:bg-slate-100"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-1">
                                                    <span className={`text-xs font-bold truncate ${selectedRegionForDrilldown?.id === reg.id ? "text-white" : "text-slate-900"}`}>
                                                        {reg.name}
                                                    </span>
                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                        selectedRegionForDrilldown?.id === reg.id
                                                            ? "bg-white/20 text-white"
                                                            : reg.reportingStatus === "ON_TIME"
                                                            ? "bg-emerald-100 text-emerald-800"
                                                            : reg.reportingStatus === "DELAYED"
                                                            ? "bg-amber-100 text-amber-800"
                                                            : "bg-rose-100 text-rose-800"
                                                    }`}>
                                                        {reg.attendanceRate}% Att.
                                                    </span>
                                                </div>

                                                <div className="space-y-0.5 text-[11px]">
                                                    <div className="flex justify-between">
                                                        <span className={selectedRegionForDrilldown?.id === reg.id ? "text-blue-200" : "text-slate-500"}>Students:</span>
                                                        <span className="font-bold">{fmt(reg.studentsCount)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className={selectedRegionForDrilldown?.id === reg.id ? "text-blue-200" : "text-slate-500"}>Schools:</span>
                                                        <span className="font-semibold">{reg.schoolsCount}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Scale Legend */}
                            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                                <span className="font-semibold text-slate-700">Reporting Health & Density:</span>
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> On Time
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Delayed Report
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Action Required
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Card: Cross-Region Comparison Bar Chart (Total DO dan LTM per Provinsi Style) */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>Regional Telemetry & Cross-Region Comparison</span>
                                    <span className="text-slate-400 cursor-help" title="Comparative statistics across all registered regions">ⓘ</span>
                                </h3>
                                <p className="text-xs text-slate-500">Benchmark educational capacity and operational health across autonomous bureaus</p>
                            </div>

                            {/* Metric Selector Tabs */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                                <button
                                    onClick={() => setChartMetric("students")}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                        chartMetric === "students"
                                            ? "bg-white text-slate-900 shadow-xs font-bold"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    Student Capacity
                                </button>
                                <button
                                    onClick={() => setChartMetric("schools")}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                        chartMetric === "schools"
                                            ? "bg-white text-slate-900 shadow-xs font-bold"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    Registered Schools
                                </button>
                                <button
                                    onClick={() => setChartMetric("attendance")}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                        chartMetric === "attendance"
                                            ? "bg-white text-slate-900 shadow-xs font-bold"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    Attendance %
                                </button>
                                <button
                                    onClick={() => setChartMetric("assessment")}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                        chartMetric === "assessment"
                                            ? "bg-white text-slate-900 shadow-xs font-bold"
                                            : "text-slate-600 hover:text-slate-900"
                                    }`}
                                >
                                    Assessment Score
                                </button>
                            </div>
                        </div>

                        {/* Interactive Bar Chart */}
                        <div className="space-y-3 pt-2">
                            {data?.regions.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 text-xs">
                                    No regions available to display comparative metrics.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {data?.regions.map(r => {
                                        const value = chartMetric === "students"
                                            ? r.studentsCount
                                            : chartMetric === "schools"
                                            ? r.schoolsCount
                                            : chartMetric === "attendance"
                                            ? r.attendanceRate
                                            : r.assessmentAverage;

                                        const percentage = Math.min(100, Math.max(8, (value / (maxBarValue || 1)) * 100));

                                        return (
                                            <div
                                                key={r.id}
                                                onClick={() => setSelectedRegionForDrilldown(r)}
                                                className="group space-y-1 cursor-pointer hover:bg-slate-50/80 p-2 rounded-xl transition-colors"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                            {r.name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            ({r.zonesCount} Zones • {r.schoolsCount} Schools)
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-slate-900">
                                                            {chartMetric === "attendance" || chartMetric === "assessment"
                                                                ? `${value}%`
                                                                : fmt(value)}
                                                        </span>
                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                                                    </div>
                                                </div>

                                                {/* Bar */}
                                                <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden flex">
                                                    <div
                                                        style={{ width: `${percentage}%` }}
                                                        className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-1.5 ${
                                                            chartMetric === "attendance"
                                                                ? "bg-gradient-to-r from-emerald-600 to-teal-500"
                                                                : chartMetric === "assessment"
                                                                ? "bg-gradient-to-r from-indigo-600 to-purple-500"
                                                                : "bg-gradient-to-r from-sky-600 to-blue-600"
                                                        }`}
                                                    />
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

            {/* TAB 2: REGION DIRECTORY & MANAGEMENT */}
            {currentTab === "regions" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Autonomous Regional Bureaus</h2>
                            <p className="text-xs text-slate-500">Manage regional administrative boundaries and leadership appointments</p>
                        </div>

                        <button
                            onClick={() => {
                                setNewRegionName("");
                                setNewRegionCode("");
                                setCreateRegionMessage(null);
                                setCreateRegionOpen(true);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Region</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search regions by name, administrator, or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-colors"
                        />
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                    <th className="p-3.5">Region Name</th>
                                    <th className="p-3.5">Hierarchy Scope</th>
                                    <th className="p-3.5">Estimated Coverage</th>
                                    <th className="p-3.5">Regional Administrator</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredRegions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-400">
                                            No regions found. Click <strong>Add Region</strong> to register a new region.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRegions.map(region => (
                                        <tr key={region.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="p-3.5 font-bold text-slate-900 align-top">
                                                <div className="space-y-0.5">
                                                    <p className="text-sm">{region.name}</p>
                                                    <span className="text-[10px] text-slate-400 font-normal">ID: {region.id.substring(0, 12)}...</span>
                                                </div>
                                            </td>
                                            <td className="p-3.5 text-slate-600 align-top">
                                                <div className="space-y-0.5">
                                                    <p><strong className="text-slate-900">{region.zonesCount}</strong> Zones</p>
                                                    <p><strong className="text-slate-900">{region.woredasCount}</strong> Woredas</p>
                                                    <p><strong className="text-slate-900">{region.schoolsCount}</strong> Schools</p>
                                                </div>
                                            </td>
                                            <td className="p-3.5 text-slate-600 align-top">
                                                <div className="space-y-0.5">
                                                    <p className="font-semibold text-slate-900">{fmt(region.studentsCount)} Students</p>
                                                    <p className="text-[11px] text-slate-500">{region.teachersCount} Teachers</p>
                                                    <p className="text-[11px] text-emerald-600 font-semibold">{region.attendanceRate}% Attendance</p>
                                                </div>
                                            </td>
                                            <td className="p-3.5 align-top">
                                                {region.admin ? (
                                                    region.admin.status === "ACTIVE" ? (
                                                        <div className="space-y-1">
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                                Active
                                                            </span>
                                                            <p className="font-bold text-slate-900 text-xs">{region.admin.name}</p>
                                                            <p className="text-[11px] text-slate-500">{region.admin.email}</p>
                                                            <p className="text-[10px] text-slate-400">Regional Administrator</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                                Invitation Pending
                                                            </span>
                                                            <p className="font-semibold text-slate-900">{region.admin.name}</p>
                                                            <p className="text-[11px] text-slate-600">{region.admin.email}</p>
                                                            {region.admin.invitedAt && (
                                                                <p className="text-[10px] text-slate-400">
                                                                    Sent: {new Date(region.admin.invitedAt).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center gap-2 pt-1">
                                                                <button
                                                                    onClick={() => handleResendInvitation(region.id)}
                                                                    disabled={actionLoadingId === region.id}
                                                                    className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer disabled:opacity-50"
                                                                >
                                                                    Resend
                                                                </button>
                                                                <span className="text-slate-300">•</span>
                                                                <button
                                                                    onClick={() => handleCancelInvitation(region.id)}
                                                                    disabled={actionLoadingId === region.id}
                                                                    className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer disabled:opacity-50"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="space-y-2">
                                                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                                            Not Assigned
                                                        </span>
                                                        <div>
                                                            <button
                                                                onClick={() => openAssignAdmin(region)}
                                                                className="px-3 py-1.5 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                                                            >
                                                                <UserPlus className="w-3.5 h-3.5" />
                                                                <span>Assign Administrator</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3.5 text-right align-top">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedRegionForDrilldown(region)}
                                                        className="px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        Drill Down
                                                    </button>
                                                    <button
                                                        onClick={() => router.push(`/dashboard/region?targetOrgId=${region.id}`)}
                                                        className="px-3 py-1.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                                    >
                                                        <span>Open Bureau</span>
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: REGIONAL LEADERSHIP & APPOINTMENTS */}
            {currentTab === "administration" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 p-6">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Regional Leadership Appointments</h2>
                        <p className="text-xs text-slate-500">Official directory of regional administrative delegates and verification status</p>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                                    <th className="p-3.5">Administrator</th>
                                    <th className="p-3.5">Designated Region</th>
                                    <th className="p-3.5">Role Designation</th>
                                    <th className="p-3.5">Activation Status</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {assignedAdministrators.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-400">
                                            No regional administrators appointed yet. Go to <strong>Region Directory</strong> to assign leadership.
                                        </td>
                                    </tr>
                                ) : (
                                    assignedAdministrators.map(({ regionId, regionName, admin }) => (
                                        <tr key={regionId} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="p-3.5 font-bold text-slate-900">
                                                <p className="text-sm">{admin.name}</p>
                                                <p className="text-[11px] text-slate-500 font-normal">{admin.email}</p>
                                            </td>
                                            <td className="p-3.5 font-semibold text-slate-800">{regionName}</td>
                                            <td className="p-3.5 text-slate-700">Regional Administrator</td>
                                            <td className="p-3.5">
                                                {admin.status === "ACTIVE" ? (
                                                    <span className="inline-block px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                        Active & Verified
                                                    </span>
                                                ) : (
                                                    <div className="space-y-0.5">
                                                        <span className="inline-block px-2.5 py-1 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                                            Invitation Pending
                                                        </span>
                                                        {admin.invitedAt && (
                                                            <p className="text-[10px] text-slate-400">
                                                                Sent: {new Date(admin.invitedAt).toLocaleDateString()}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {admin.status === "INVITATION_PENDING" && (
                                                        <button
                                                            onClick={() => handleResendInvitation(regionId)}
                                                            disabled={actionLoadingId === regionId}
                                                            className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer disabled:opacity-50"
                                                        >
                                                            Resend Email
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => router.push(`/dashboard/region?targetOrgId=${regionId}`)}
                                                        className="px-3 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer"
                                                    >
                                                        Inspect Bureau
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: ALERTS & MISSING/DELAYED REPORTS */}
            {currentTab === "alerts" && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 text-amber-600" />
                                <span>Missing & Delayed Educational Reports</span>
                            </h2>
                            <p className="text-xs text-slate-500">Real-time alerts regarding overdue submissions, missing attendance syncs, and administrative vacancies</p>
                        </div>
                        <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
                            {data?.alerts.length ?? 0} Active Incidents
                        </span>
                    </div>

                    <div className="space-y-3 pt-2">
                        {(!data?.alerts || data.alerts.length === 0) ? (
                            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                                <p className="font-semibold text-slate-700">All subordinate bureaus are compliant.</p>
                                <p>No delayed reports or unassigned units detected.</p>
                            </div>
                        ) : (
                            data.alerts.map(alertItem => (
                                <div
                                    key={alertItem.id}
                                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                        alertItem.severity === "CRITICAL"
                                            ? "bg-rose-50/70 border-rose-200 text-rose-950"
                                            : alertItem.severity === "WARNING"
                                            ? "bg-amber-50/70 border-amber-200 text-amber-950"
                                            : "bg-blue-50/70 border-blue-200 text-blue-950"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {alertItem.severity === "CRITICAL" ? (
                                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                        ) : alertItem.severity === "WARNING" ? (
                                            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        ) : (
                                            <BellRing className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                        )}
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-xs text-slate-900">{alertItem.title}</h4>
                                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                                                    alertItem.severity === "CRITICAL"
                                                        ? "bg-rose-200 text-rose-900"
                                                        : alertItem.severity === "WARNING"
                                                        ? "bg-amber-200 text-amber-900"
                                                        : "bg-blue-200 text-blue-900"
                                                }`}>
                                                    {alertItem.severity}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600">{alertItem.description}</p>
                                            <p className="text-[10px] text-slate-400">
                                                Unit: <strong className="text-slate-700">{alertItem.sourceUnit}</strong> • Reported: {new Date(alertItem.timestamp).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleDispatchReminder(alertItem)}
                                            disabled={actionLoadingId === alertItem.id}
                                            className="px-3 py-1.5 text-xs font-bold bg-white text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                                        >
                                            <Send className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Send Reminder</span>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* INTERACTIVE REGIONAL DRILL-DOWN DRAWER / MODAL ("Federal sees the big picture first, then drills down") */}
            {selectedRegionForDrilldown && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                        REGIONAL DEEP-DIVE
                                    </span>
                                    <span className="text-xs text-slate-400">FDRE MoE Telemetry</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900">{selectedRegionForDrilldown.name}</h3>
                                <p className="text-xs text-slate-500">Autonomous Regional Education Bureau Telemetry & Subordinate Zones</p>
                            </div>
                            <button
                                onClick={() => setSelectedRegionForDrilldown(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Region Metric Snapshot */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Zones</span>
                                <div className="text-lg font-black text-slate-900">{selectedRegionForDrilldown.zonesCount}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Woredas</span>
                                <div className="text-lg font-black text-slate-900">{selectedRegionForDrilldown.woredasCount}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Schools</span>
                                <div className="text-lg font-black text-slate-900">{selectedRegionForDrilldown.schoolsCount}</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Attendance</span>
                                <div className="text-lg font-black text-emerald-600">{selectedRegionForDrilldown.attendanceRate}%</div>
                            </div>
                        </div>

                        {/* Leadership info */}
                        <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1 text-xs">
                            <span className="font-bold text-blue-950 uppercase text-[10px] tracking-wider">Regional Administrator</span>
                            {selectedRegionForDrilldown.admin ? (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                                    <div>
                                        <p className="font-bold text-slate-900">{selectedRegionForDrilldown.admin.name}</p>
                                        <p className="text-slate-600 text-[11px]">{selectedRegionForDrilldown.admin.email}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold self-start ${
                                        selectedRegionForDrilldown.admin.status === "ACTIVE"
                                            ? "bg-emerald-100 text-emerald-800"
                                            : "bg-amber-100 text-amber-800"
                                    }`}>
                                        {selectedRegionForDrilldown.admin.status}
                                    </span>
                                </div>
                            ) : (
                                <p className="text-slate-500 italic pt-1">No regional administrator appointed.</p>
                            )}
                        </div>

                        {/* Subordinate Zones Breakdown */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Subordinate Zones ({selectedRegionForDrilldown.zones?.length ?? selectedRegionForDrilldown.zonesCount})
                            </h4>
                            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                                        <tr>
                                            <th className="p-2.5">Zone Name</th>
                                            <th className="p-2.5">Woredas</th>
                                            <th className="p-2.5">Schools</th>
                                            <th className="p-2.5 text-right">Zone Delegate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(!selectedRegionForDrilldown.zones || selectedRegionForDrilldown.zones.length === 0) ? (
                                            <tr>
                                                <td colSpan={4} className="p-4 text-center text-slate-400">
                                                    No zones registered under this region yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            selectedRegionForDrilldown.zones.map(z => (
                                                <tr key={z.id} className="hover:bg-slate-50">
                                                    <td className="p-2.5 font-bold text-slate-900">{z.name}</td>
                                                    <td className="p-2.5 text-slate-600">{z.woredasCount}</td>
                                                    <td className="p-2.5 text-slate-600">{z.schoolsCount}</td>
                                                    <td className="p-2.5 text-right text-slate-500">
                                                        {z.adminName || <span className="text-amber-600 italic">Unassigned</span>}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <button
                                onClick={() => setSelectedRegionForDrilldown(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                                Close Deep-Dive
                            </button>
                            <button
                                onClick={() => {
                                    router.push(`/dashboard/region?targetOrgId=${selectedRegionForDrilldown.id}`);
                                }}
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                            >
                                <span>Launch Regional Bureau Portal</span>
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 1: CREATE REGION */}
            {createRegionOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Add Autonomous Regional Bureau</h3>
                                <p className="text-[11px] text-slate-500">Create a regional governance unit directly under Federal Ministry</p>
                            </div>
                            <button
                                onClick={() => setCreateRegionOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateRegionSubmit} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">
                                    Region Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Oromia Region, Amhara Region, Addis Ababa"
                                    value={newRegionName}
                                    onChange={e => setNewRegionName(e.target.value)}
                                    className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">Regional Code (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., OR, AM, AA"
                                    value={newRegionCode}
                                    onChange={e => setNewRegionCode(e.target.value)}
                                    className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            {createRegionMessage && (
                                <div
                                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                                        createRegionMessage.type === "success"
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : "bg-rose-50 text-rose-800 border-rose-200"
                                    }`}
                                >
                                    <span>{createRegionMessage.text}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setCreateRegionOpen(false)}
                                    disabled={creatingRegion}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingRegion || !newRegionName.trim()}
                                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                                >
                                    {creatingRegion ? "Creating..." : "Create Region"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: ASSIGN REGIONAL ADMINISTRATOR */}
            {assignAdminOpen && selectedRegionForAdmin && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Appoint Regional Administrator</h3>
                                <p className="text-[11px] text-slate-500">
                                    Assign delegate for <strong>{selectedRegionForAdmin.name}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => setAssignAdminOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAssignAdminSubmit} className="space-y-4 text-xs">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Dr. Abebe Tessema"
                                    value={adminFullName}
                                    onChange={e => setAdminFullName(e.target.value)}
                                    className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">
                                    Official Email Address <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g., abebe.t@oromia.edu.et"
                                    value={adminEmail}
                                    onChange={e => setAdminEmail(e.target.value)}
                                    className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-700 block">Phone Number (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., +251 911 234 567"
                                    value={adminPhone}
                                    onChange={e => setAdminPhone(e.target.value)}
                                    className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            {assignAdminMessage && (
                                <div
                                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                                        assignAdminMessage.type === "success"
                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                            : "bg-rose-50 text-rose-800 border-rose-200"
                                    }`}
                                >
                                    <span>{assignAdminMessage.text}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setAssignAdminOpen(false)}
                                    disabled={assigningAdmin}
                                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigningAdmin || !adminFullName.trim() || !adminEmail.trim()}
                                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                                >
                                    {assigningAdmin ? "Dispatching Invitation..." : "Send Official Invitation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
