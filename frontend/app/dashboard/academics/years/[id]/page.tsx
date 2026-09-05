"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Users, UserCheck, Layers, LayoutGrid, Calendar, Settings, Copy, Save, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
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
            setNotification({ type: "success", message: "Academic year updated successfully!" });
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
        if (!confirm("Are you sure you want to copy grades and sections from the selected year? This cannot be undone.")) return;
        
        try {
            setCopying(true);
            setNotification(null);
            const res = await fetchApi(`/academic/years/${yearId}/copy-structure`, {
                method: "POST",
                body: JSON.stringify({ previousYearId: selectedPrevYear }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to copy structure");
            
            setNotification({ type: "success", message: data.message || "Structure copied successfully!" });
            loadYear(); // reload stats
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
            setNotification({ type: "success", message: "Academic year activated successfully!" });
            loadYear();
        } catch (err: any) {
            setNotification({ type: "error", message: err.message || "Failed to activate academic year" });
        }
    };

    if (loading) return <LoadingState message="Loading academic year details..." />;
    if (error || !year) return <ErrorState message={error || "Academic Year not found"} onRetry={() => router.back()} />;

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {notification && (
                <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    notification.type === "success" 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                        : "bg-red-50 text-red-800 border-red-200"
                }`}>
                    <div className="flex items-center space-x-3">
                        {notification.type === "success" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        )}
                        <p className="text-sm font-medium">{notification.message}</p>
                    </div>
                    <button 
                        onClick={() => setNotification(null)}
                        className="p-1 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-black/5"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => router.back()}>
                    Back to Academic Years
                </Button>
                {hasUpdatePermission && year.status === "PLANNED" && (
                    <Button onClick={handleActivate} variant="secondary" className="text-green-600 border-green-600 hover:bg-green-50">
                        Set as Active Year
                    </Button>
                )}
            </div>

            {/* HEADER */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <Calendar className="w-8 h-8 mr-3 text-[#006b3f]" />
                        {year.name}
                    </h1>
                    <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                        <div className="flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                year.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                                year.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' : 
                                year.status === 'PLANNED' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                            }`}>
                                {year.status}
                            </span>
                        </div>
                        <div className="flex items-center">Start: {new Date(year.startDate).toLocaleDateString()}</div>
                        <div className="flex items-center">End: {new Date(year.endDate).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "overview" ? "border-[#006b3f] text-[#006b3f]" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Overview & Stats
                </button>
                <button
                    onClick={() => setActiveTab("settings")}
                    className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "settings" ? "border-[#006b3f] text-[#006b3f]" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                >
                    Settings & Configuration
                </button>
            </div>

            {activeTab === "overview" && (
                <div className="space-y-6">
                    <h2 className="text-lg font-bold text-gray-900">Academic Year Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-blue-600 mb-1">Enrolled Students</p>
                                        <p className="text-3xl font-bold text-gray-900">{year.stats?.students || 0}</p>
                                    </div>
                                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                                        <Users className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-purple-600 mb-1">Assigned Teachers</p>
                                        <p className="text-3xl font-bold text-gray-900">{year.stats?.teachers || 0}</p>
                                    </div>
                                    <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                                        <UserCheck className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-amber-50 to-white border-amber-100">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-amber-600 mb-1">Total Grades</p>
                                        <p className="text-3xl font-bold text-gray-900">{year.stats?.grades || 0}</p>
                                    </div>
                                    <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-50 to-white border-green-100">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-green-600 mb-1">Total Sections</p>
                                        <p className="text-3xl font-bold text-gray-900">{year.stats?.sections || 0}</p>
                                    </div>
                                    <div className="p-3 bg-green-100 rounded-lg text-green-600">
                                        <LayoutGrid className="w-6 h-6" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Copy Academic Structure</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Quickly set up this academic year by copying Grades and Sections from a previous year. 
                            This is useful for rolling over the school structure without manual entry.
                        </p>
                        <div className="flex gap-4 items-center">
                            <select 
                                className="flex-1 max-w-sm rounded-lg border border-gray-300 p-2.5 text-sm focus:ring-[#006b3f] focus:border-[#006b3f]"
                                value={selectedPrevYear}
                                onChange={(e) => setSelectedPrevYear(e.target.value)}
                            >
                                <option value="">Select a previous academic year...</option>
                                {otherYears.map(y => (
                                    <option key={y.id} value={y.id}>{y.name}</option>
                                ))}
                            </select>
                            <Button 
                                onClick={handleCopyStructure} 
                                disabled={!selectedPrevYear || copying}
                                leftIcon={<Copy className="w-4 h-4" />}
                            >
                                {copying ? "Copying..." : "Copy Grades & Sections"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "settings" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Settings className="w-5 h-5 mr-2 text-gray-500" />
                            Update Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdate} className="space-y-6 max-w-2xl">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. 2018 E.C."
                                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-[#006b3f] focus:border-[#006b3f]"
                                />
                                <p className="text-xs text-gray-500 mt-1">Use the standard Ethiopian Calendar format if required.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-[#006b3f] focus:border-[#006b3f]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-[#006b3f] focus:border-[#006b3f]"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select 
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    disabled={!hasUpdatePermission || year.status === "ARCHIVED"}
                                    className="w-full rounded-lg border border-gray-300 p-2.5 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    {getAvailableStatusOptions(year.status).map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                {year.status === "ARCHIVED" && (
                                    <p className="text-xs text-amber-600 mt-1">Archived academic years are locked and cannot be modified.</p>
                                )}
                            </div>
                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <Button 
                                    type="submit" 
                                    disabled={saving || !hasUpdatePermission || year.status === "ARCHIVED"} 
                                    leftIcon={<Save className="w-4 h-4" />}
                                >
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
