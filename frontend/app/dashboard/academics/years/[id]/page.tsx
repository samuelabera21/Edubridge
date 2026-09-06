"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { 
    ArrowLeft, Users, UserCheck, Layers, LayoutGrid, Calendar, 
    Settings, Copy, Save, CheckCircle2, AlertCircle, X, Check, BookOpen, ChevronRight 
} from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { AcademicYear } from "@/types/api";

export default function AcademicYearDetailsPage() {
    const { authData } = useAuth();
    const params = useParams();
    const router = useRouter();
    const yearId = params.id as string;

    const hasUpdatePermission = authData?.access.some(acc => 
        ["ADMIN", "SCHOOL_ADMIN"].includes(acc.role.name) ||
        acc.role.permissions.some((p: any) => p.permission?.name === "ACADEMIC:UPDATE")
    );

    const [year, setYear] = useState<AcademicYear | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

    // Form states
    const [name, setName] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [status, setStatus] = useState("PLANNED");
    const [saving, setSaving] = useState(false);

    // Copy states
    const [otherYears, setOtherYears] = useState<AcademicYear[]>([]);
    const [selectedPrevYear, setSelectedPrevYear] = useState("");
    const [copying, setCopying] = useState(false);

    const [activeTab, setActiveTab] = useState<"overview" | "settings">("overview");

    const getAvailableStatusOptions = (currentStatus?: string) => {
        switch (currentStatus) {
            case "PLANNED":
                return [
                    { value: "PLANNED", label: "PLANNED - Planning phase" },
                    { value: "ACTIVE", label: "ACTIVE - Current operational year" },
                    { value: "ARCHIVED", label: "ARCHIVED - Cancelled before start" }
                ];
            case "ACTIVE":
                return [
                    { value: "ACTIVE", label: "ACTIVE - Current operational year" },
                    { value: "COMPLETED", label: "COMPLETED - Year finished" }
                ];
            case "COMPLETED":
                return [
                    { value: "COMPLETED", label: "COMPLETED - Year finished" },
                    { value: "ARCHIVED", label: "ARCHIVED - Read-only history" }
                ];
            case "ARCHIVED":
                return [
                    { value: "ARCHIVED", label: "ARCHIVED - Read-only history" }
                ];
            default:
                return [
                    { value: "PLANNED", label: "PLANNED - Planning phase" },
                    { value: "ACTIVE", label: "ACTIVE - Current operational year" },
                    { value: "COMPLETED", label: "COMPLETED - Year finished" },
                    { value: "ARCHIVED", label: "ARCHIVED - Read-only history" }
                ];
        }
    };

    const loadYear = async () => {
        try {
            setLoading(true);
            const res = await fetchApi(`/academic/years/${yearId}`);
            if (!res.ok) throw new Error("Failed to load academic year details");
            const data = await res.json();
            setYear(data);
            setName(data.name);
            setStartDate(new Date(data.startDate).toISOString().split('T')[0]);
            setEndDate(new Date(data.endDate).toISOString().split('T')[0]);
            setStatus(data.status);
            setError(null);
        } catch (err: any) {
            setError(err.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const loadOtherYears = async () => {
        try {
            const res = await fetchApi("/academic/years");
            if (res.ok) {
                const data = await res.json();
                setOtherYears(data.filter((y: AcademicYear) => y.id !== yearId));
            }
        } catch (err) {
            console.error("Failed to load other years", err);
        }
    };

    useEffect(() => {
        if (yearId) {
            loadYear();
            loadOtherYears();
        }
    }, [yearId]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotification(null);

        if (new Date(startDate) >= new Date(endDate)) {
            setNotification({ type: "error", message: "Start date must be before end date." });
            return;
        }

        try {
            setSaving(true);
            const res = await fetchApi(`/academic/years/${yearId}`, {
                method: "PUT",
                body: JSON.stringify({ name, startDate, endDate, status }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to update academic year");
            }
            setNotification({ type: "success", message: "Academic year updated successfully." });
            loadYear();
        } catch (err: any) {
            setNotification({ type: "error", message: err.message || "Failed to update academic year" });
        } finally {
            setSaving(false);
        }
    };

    const handleCopyStructure = async () => {
        if (!selectedPrevYear) {
            setNotification({ type: "error", message: "Please select a previous year to copy from." });
            return;
        }
        if (!confirm("Are you sure you want to copy grades and sections from the selected year?")) return;
        
        try {
            setCopying(true);
            setNotification(null);
            const res = await fetchApi(`/academic/years/${yearId}/copy-structure`, {
                method: "POST",
                body: JSON.stringify({ previousYearId: selectedPrevYear }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to copy structure");
            
            setNotification({ type: "success", message: data.message || "Structure copied successfully." });
            loadYear();
        } catch (err: any) {
            setNotification({ type: "error", message: err.message || "Failed to copy structure" });
        } finally {
            setCopying(false);
        }
    };

    const handleActivate = async () => {
        if (!confirm("Are you sure you want to activate this academic year? Any currently active year will be marked as completed.")) return;
        try {
            setNotification(null);
            const res = await fetchApi(`/academic/years/${yearId}/activate`, {
                method: "PUT",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to activate");
            setNotification({ type: "success", message: "Academic year activated successfully." });
            loadYear();
        } catch (err: any) {
            setNotification({ type: "error", message: err.message || "Failed to activate academic year" });
        }
    };

    if (loading) return <LoadingState message="Loading academic year details..." />;
    if (error || !year) return <ErrorState message={error || "Academic Year not found"} onRetry={() => router.back()} />;

    return (
        <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans text-gray-900">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Link href="/dashboard" className="hover:text-gray-900">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/academics/years" className="hover:text-gray-900">Academics</Link>
                <span>/</span>
                <Link href="/dashboard/academics/years" className="hover:text-gray-900">Academic Years</Link>
                <span>/</span>
                <span className="text-gray-900 font-medium">{year.name}</span>
            </div>

            {/* Notification Messages */}
            {notification && (
                <div className={`p-3.5 rounded-md border flex items-center justify-between text-xs transition-all ${
                    notification.type === "success" 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                        : "bg-rose-50 text-rose-800 border-rose-200"
                }`}>
                    <div className="flex items-center space-x-2">
                        {notification.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <p className="font-medium">{notification.message}</p>
                    </div>
                    <button 
                        onClick={() => setNotification(null)}
                        className="text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Unified Government Session Header Card */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <Link 
                        href="/dashboard/academics/years"
                        className="inline-flex items-center space-x-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors w-fit"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Academic Years</span>
                    </Link>

                    <div className="flex items-center space-x-3">
                        {hasUpdatePermission && year.status === "PLANNED" && (
                            <button 
                                onClick={handleActivate} 
                                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors shadow-xs cursor-pointer"
                            >
                                <Check className="w-3.5 h-3.5" />
                                <span>Set as Active Year</span>
                            </button>
                        )}
                        {year.status === "ACTIVE" && (
                            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Active Operational Year</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center space-x-3">
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                                Academic Year {year.name}
                            </h1>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                year.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                                year.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
                                year.status === 'PLANNED' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-700 border border-gray-200'
                            }`}>
                                {year.status}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-600 font-mono">
                            <span>Start: {new Date(year.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            <span className="text-gray-300">&bull;</span>
                            <span>End: {new Date(year.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Government Tabs */}
            <div className="flex border-b border-gray-200 text-xs font-medium space-x-6">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`pb-3 transition-colors relative cursor-pointer ${
                        activeTab === "overview" ? "text-[#4085b3] font-semibold" : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <span>Overview & Statistics</span>
                    {activeTab === "overview" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4085b3]" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("settings")}
                    className={`pb-3 transition-colors relative cursor-pointer ${
                        activeTab === "settings" ? "text-[#4085b3] font-semibold" : "text-gray-500 hover:text-gray-800"
                    }`}
                >
                    <span>Configuration</span>
                    {activeTab === "settings" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4085b3]" />
                    )}
                </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* 4 Clean Elevated Metric Cards (EAES Portal Style) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Link href="/dashboard/students" className="block group">
                            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs group-hover:border-[#4085b3] group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Enrolled Students</p>
                                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#4085b3] flex items-center justify-center transition-colors group-hover:bg-[#4085b3] group-hover:text-white">
                                        <Users className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">{year.stats?.students || 0}</p>
                                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                    <span>Student Directory</span>
                                    <span className="text-[#4085b3] font-medium group-hover:underline">View &rarr;</span>
                                </div>
                            </div>
                        </Link>
                        
                        <Link href="/dashboard/teachers/assignments" className="block group">
                            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs group-hover:border-[#4085b3] group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Assigned Teachers</p>
                                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#4085b3] flex items-center justify-center transition-colors group-hover:bg-[#4085b3] group-hover:text-white">
                                        <UserCheck className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">{year.stats?.teachers || 0}</p>
                                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                    <span>Staffing Coverage</span>
                                    <span className="text-[#4085b3] font-medium group-hover:underline">View &rarr;</span>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/academics/grades" className="block group">
                            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs group-hover:border-[#4085b3] group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Configured Grades</p>
                                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#4085b3] flex items-center justify-center transition-colors group-hover:bg-[#4085b3] group-hover:text-white">
                                        <Layers className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">{year.stats?.grades || 0}</p>
                                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                    <span>Grade Levels</span>
                                    <span className="text-[#4085b3] font-medium group-hover:underline">View &rarr;</span>
                                </div>
                            </div>
                        </Link>

                        <Link href="/dashboard/academics/grades" className="block group">
                            <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs group-hover:border-[#4085b3] group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Active Sections</p>
                                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#4085b3] flex items-center justify-center transition-colors group-hover:bg-[#4085b3] group-hover:text-white">
                                        <LayoutGrid className="w-4 h-4" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-gray-900 mt-2 font-mono">{year.stats?.sections || 0}</p>
                                <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                    <span>Class Sections</span>
                                    <span className="text-[#4085b3] font-medium group-hover:underline">View &rarr;</span>
                                </div>
                            </div>
                        </Link>
                    </div>

                    {/* Academic Structure Rollover */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Structure Rollover
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Copy grade levels and class sections from a previous academic session.
                                </p>
                            </div>
                            {(year.stats?.grades || 0) > 0 && (
                                <span className="text-xs text-gray-500 font-mono bg-gray-50 border border-gray-200 px-2.5 py-1 rounded">
                                    Current: {year.stats?.grades} grades, {year.stats?.sections} sections
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center pt-2">
                            <select 
                                className="w-full sm:w-80 rounded-md border border-gray-300 px-3 py-2 text-xs bg-white focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none cursor-pointer"
                                value={selectedPrevYear}
                                onChange={(e) => setSelectedPrevYear(e.target.value)}
                            >
                                <option value="">Select source academic year...</option>
                                {otherYears.map(y => (
                                    <option key={y.id} value={y.id}>{y.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleCopyStructure} 
                                disabled={!selectedPrevYear || copying}
                                className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex-shrink-0"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                <span>{copying ? "Copying..." : "Copy Structure"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Academic Management Modules (EAES Hover Grid) */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs space-y-4">
                        <div className="border-b border-gray-100 pb-3">
                            <h3 className="text-sm font-bold text-gray-900">
                                Academic Management Modules
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Core curricular components and operational settings for this session.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                            <Link 
                                href="/dashboard/academics/grades"
                                className="group p-4 rounded-lg border border-gray-200 hover:border-[#4085b3] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-white"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#4085b3] flex items-center justify-center group-hover:bg-[#4085b3] group-hover:text-white transition-colors">
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#4085b3] group-hover:translate-x-0.5 transition-all" />
                                </div>
                                <h4 className="text-xs font-bold text-gray-900 mt-3 group-hover:text-[#4085b3] transition-colors">
                                    Grades & Class Sections
                                </h4>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Configure academic grade levels, student streams, and homeroom divisions.
                                </p>
                            </Link>

                            <Link 
                                href="/dashboard/academics/subjects"
                                className="group p-4 rounded-lg border border-gray-200 hover:border-[#4085b3] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-white"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#4085b3] flex items-center justify-center group-hover:bg-[#4085b3] group-hover:text-white transition-colors">
                                        <BookOpen className="w-4 h-4" />
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#4085b3] group-hover:translate-x-0.5 transition-all" />
                                </div>
                                <h4 className="text-xs font-bold text-gray-900 mt-3 group-hover:text-[#4085b3] transition-colors">
                                    Curriculum Subjects
                                </h4>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Define official courses, curriculum codes, credits, and weekly period counts.
                                </p>
                            </Link>

                            <Link 
                                href="/dashboard/academics/calendar"
                                className="group p-4 rounded-lg border border-gray-200 hover:border-[#4085b3] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-white"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-9 h-9 rounded-lg bg-sky-50 text-[#4085b3] flex items-center justify-center group-hover:bg-[#4085b3] group-hover:text-white transition-colors">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#4085b3] group-hover:translate-x-0.5 transition-all" />
                                </div>
                                <h4 className="text-xs font-bold text-gray-900 mt-3 group-hover:text-[#4085b3] transition-colors">
                                    Academic Calendar
                                </h4>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Manage semesters, term examination dates, holidays, and school periods.
                                </p>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: SETTINGS */}
            {activeTab === "settings" && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs">
                    <h3 className="text-sm font-bold text-gray-900 pb-3 border-b border-gray-100 mb-5">
                        Year Configuration
                    </h3>

                    <form onSubmit={handleUpdate} className="space-y-4 max-w-xl text-xs">
                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Academic Year Name *</label>
                            <input 
                                type="text" 
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. 2018 E.C."
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">Start Date *</label>
                                <input 
                                    type="date" 
                                    required
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block font-medium text-gray-700 mb-1">End Date *</label>
                                <input 
                                    type="date" 
                                    required
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-medium text-gray-700 mb-1">Status</label>
                            <select 
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={!hasUpdatePermission || year.status === "ARCHIVED"}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 bg-white focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {getAvailableStatusOptions(year.status).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            {year.status === "ARCHIVED" && (
                                <p className="text-[11px] text-amber-600 mt-1">Archived academic years are locked and cannot be modified.</p>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex justify-end">
                            <button 
                                type="submit" 
                                disabled={saving || !hasUpdatePermission || year.status === "ARCHIVED"} 
                                className="inline-flex items-center space-x-1.5 px-5 py-2 text-xs font-medium text-white bg-[#4085b3] hover:bg-[#2b6a94] rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>{saving ? "Saving..." : "Save Changes"}</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
