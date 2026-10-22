"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Save, CheckCircle2, Users, GraduationCap, LayoutGrid, Settings, FileText } from "lucide-react";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function SchoolProfilePage() {
    const { authData } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    const [academicYears, setAcademicYears] = useState<any[]>([]);
    const [stats, setStats] = useState({
        totalTeachers: 0,
        totalStudents: 0,
        activeSections: 0,
    });
    const [activeTab, setActiveTab] = useState("general");
    const [isEditing, setIsEditing] = useState(false);
    
    const [formData, setFormData] = useState({
        schoolName: "",
        activeAcademicYearId: "",
        establishedYear: "",
        contactEmail: "",
        phoneNumber: "",
        address: "",
        schoolLevel: "PRIMARY",
        ownership: "GOVERNMENT",
        region: "Addis Ababa",
        zone: "",
        woreda: "",
        kebele: "",
        principalName: "",
    });

    const [configData, setConfigData] = useState({
        gradingFormat: "letter",
        attendancePolicy: "daily",
        passingMark: 50
    });

    const hasUpdatePermission = authData?.access.some(acc => 
        acc.role.permissions.some((p: any) => p.permission.name === "SCHOOL:UPDATE")
    );

    useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            try {
                const res = await fetchApi("/school/profile");
                if (!res.ok) {
                    if (res.status === 403) setError("You do not have permission to view the school profile.");
                    else setError("Failed to load school profile.");
                    setLoading(false);
                    return;
                }
                
                const data = await res.json();
                if (mounted) {
                    if (data.stats) {
                        setStats(data.stats);
                    }
                    if (data.academicYears) {
                        setAcademicYears(data.academicYears);
                    }
                    
                    const activeYear = data.academicYears?.find((y: any) => y.status === "ACTIVE");
                    
                    if (data.profile || data.school) {
                        const cfg = data.profile?.configuration || {};
                        setFormData({
                            schoolName: data.school?.name || "",
                            activeAcademicYearId: activeYear ? activeYear.id : (data.academicYears?.[0]?.id || ""),
                            establishedYear: data.profile?.establishedYear?.toString() || "",
                            contactEmail: data.profile?.contactEmail || "",
                            phoneNumber: data.profile?.phoneNumber || "",
                            address: data.profile?.address || "",
                            schoolLevel: cfg.schoolLevel || "PRIMARY",
                            ownership: cfg.ownership || "GOVERNMENT",
                            region: cfg.region || "Addis Ababa",
                            zone: cfg.zone || "",
                            woreda: cfg.woreda || "",
                            kebele: cfg.kebele || "",
                            principalName: cfg.principalName || "",
                        });
                        if (data.profile?.configuration) {
                            setConfigData({
                                gradingFormat: cfg.gradingFormat || "letter",
                                attendancePolicy: cfg.attendancePolicy || "daily",
                                passingMark: cfg.passingMark || 50
                            });
                        }
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (mounted) {
                    setError("Network error occurred while loading profile.");
                    setLoading(false);
                }
            }
        }

        loadProfile();

        return () => {
            mounted = false;
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (activeTab === "general") {
            setFormData(prev => ({ ...prev, [name]: value }));
        } else {
            setConfigData(prev => ({ ...prev, [name]: name === "passingMark" ? Number(value) : value }));
        }
        setSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setSaving(true);

        try {
            const payload = {
                schoolName: formData.schoolName || undefined,
                activeAcademicYearId: formData.activeAcademicYearId || undefined,
                establishedYear: formData.establishedYear ? parseInt(formData.establishedYear, 10) : null,
                contactEmail: formData.contactEmail || null,
                phoneNumber: formData.phoneNumber || null,
                address: formData.address || null,
                configuration: {
                    ...configData,
                    schoolLevel: formData.schoolLevel,
                    ownership: formData.ownership,
                    region: formData.region,
                    zone: formData.zone,
                    woreda: formData.woreda,
                    kebele: formData.kebele,
                    principalName: formData.principalName,
                }
            };

            const res = await fetchApi("/school/profile", {
                method: "PUT",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Failed to update profile. Check your permissions.");
            } else {
                setSuccess(true);
                setIsEditing(false);
            }
        } catch (err) {
            setError("Network error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="py-20">
                <LoadingState message="Loading school profile..." />
            </div>
        );
    }

    if (error && !formData.schoolName) {
        return (
            <div className="p-6">
                <ErrorState message={error} onRetry={() => window.location.reload()} />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12 font-sans max-w-5xl">
            {/* Header: Clean & Institutional */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        School Profile
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Institutional records, administrative hierarchy, and operational settings
                    </p>
                </div>
            </div>

            {/* Top 3 KPI Cards: Clean hover fill from left to right */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/dashboard/teachers" className="block group">
                    <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group-hover:border-[#4085b3] transition-all duration-300 cursor-pointer shadow-xs group-hover:shadow-md">
                        {/* Blue wipe from left to right */}
                        <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />

                        <div className="relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                                Total Teachers
                            </span>
                            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                {stats.totalTeachers}
                            </span>
                        </div>
                        <Users className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                </Link>

                <Link href="/dashboard/students" className="block group">
                    <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group-hover:border-[#4085b3] transition-all duration-300 cursor-pointer shadow-xs group-hover:shadow-md">
                        {/* Blue wipe from left to right */}
                        <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />

                        <div className="relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                                Total Students
                            </span>
                            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                {stats.totalStudents}
                            </span>
                        </div>
                        <GraduationCap className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                </Link>

                <Link href="/dashboard/academics/grades" className="block group">
                    <div className="relative overflow-hidden border border-slate-200 bg-white rounded p-4 flex items-center justify-between group-hover:border-[#4085b3] transition-all duration-300 cursor-pointer shadow-xs group-hover:shadow-md">
                        {/* Blue wipe from left to right */}
                        <span className="absolute inset-0 bg-[#4085b3] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out pointer-events-none" />

                        <div className="relative z-10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-blue-100 transition-colors duration-300 block mb-1">
                                Active Sections
                            </span>
                            <span className="text-2xl font-bold text-slate-900 group-hover:text-white transition-colors duration-300 tabular-nums">
                                {stats.activeSections}
                            </span>
                        </div>
                        <LayoutGrid className="relative z-10 w-5 h-5 text-slate-400 group-hover:text-white transition-colors duration-300" />
                    </div>
                </Link>
            </div>

            {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">Settings updated successfully.</span>
                </div>
            )}

            {/* Tab Navigation: Clean Institutional Underline Tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex space-x-6" aria-label="Tabs">
                    <button
                        type="button"
                        onClick={() => setActiveTab("general")}
                        className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
                            activeTab === "general"
                                ? "border-[#4085b3] text-[#4085b3]"
                                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>General & Classification</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("config")}
                        className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer border-b-2 ${
                            activeTab === "config"
                                ? "border-[#4085b3] text-[#4085b3]"
                                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                        }`}
                    >
                        <Settings className="w-4 h-4" />
                        <span>System Configuration</span>
                    </button>
                </nav>
            </div>

            {/* Main Form: Directly on clean canvas (DfE & GOV.UK Standard) */}
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                    {activeTab === "general" ? (
                        <div className="space-y-6">
                            {/* Section 1: Classification */}
                            <div className="pb-2 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900">Institutional Classification</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">School Level</label>
                                    <select
                                        name="schoolLevel"
                                        value={formData.schoolLevel}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors bg-white cursor-pointer"
                                    >
                                        <option value="PRIMARY">Primary School (Grades 1–8)</option>
                                        <option value="SECONDARY">Secondary School (Grades 9–12)</option>
                                        <option value="COMPLETE">Complete Secondary (Grades 1–12)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ownership Type</label>
                                    <select
                                        name="ownership"
                                        value={formData.ownership}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors bg-white cursor-pointer"
                                    >
                                        <option value="GOVERNMENT">Government / Public School</option>
                                        <option value="PRIVATE">Private School</option>
                                        <option value="MISSION">Mission / Religious School</option>
                                        <option value="COMMUNITY">Community School</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Organization Name</label>
                                    <input
                                        type="text"
                                        name="schoolName"
                                        value={formData.schoolName}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Head Principal / Director</label>
                                    <input
                                        type="text"
                                        name="principalName"
                                        value={formData.principalName}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors"
                                        placeholder="Principal Name"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Active Academic Year</label>
                                    <select
                                        name="activeAcademicYearId"
                                        value={formData.activeAcademicYearId}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving || academicYears.length === 0}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors bg-white cursor-pointer"
                                    >
                                        {academicYears.length === 0 && <option value="">No academic years found</option>}
                                        {academicYears.map(year => (
                                            <option key={year.id} value={year.id}>
                                                {year.name} ({new Date(year.startDate).getFullYear()} - {new Date(year.endDate).getFullYear()}) {year.status === "ACTIVE" ? " (Active)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Established Year</label>
                                    <input
                                        type="number"
                                        name="establishedYear"
                                        value={formData.establishedYear}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors"
                                        placeholder="e.g. 1995"
                                        min="1800"
                                        max={new Date().getFullYear()}
                                    />
                                </div>
                            </div>

                            {/* Section 2: Administrative Hierarchy */}
                            <div className="border-t border-slate-100 pt-5">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                                    Administrative Hierarchy & Location
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
                                        <input
                                            type="text"
                                            name="region"
                                            value={formData.region}
                                            onChange={handleChange}
                                            disabled={!isEditing || !hasUpdatePermission || saving}
                                            className="w-full border border-slate-300 rounded p-2 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Zone / Sub-city</label>
                                        <input
                                            type="text"
                                            name="zone"
                                            value={formData.zone}
                                            onChange={handleChange}
                                            disabled={!isEditing || !hasUpdatePermission || saving}
                                            className="w-full border border-slate-300 rounded p-2 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Woreda</label>
                                        <input
                                            type="text"
                                            name="woreda"
                                            value={formData.woreda}
                                            onChange={handleChange}
                                            disabled={!isEditing || !hasUpdatePermission || saving}
                                            className="w-full border border-slate-300 rounded p-2 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Kebele</label>
                                        <input
                                            type="text"
                                            name="kebele"
                                            value={formData.kebele}
                                            onChange={handleChange}
                                            disabled={!isEditing || !hasUpdatePermission || saving}
                                            className="w-full border border-slate-300 rounded p-2 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Contact Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-100 pt-5">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Email</label>
                                    <input
                                        type="email"
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors"
                                        placeholder="email@school.edu.et"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Official Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors"
                                        placeholder="+251..."
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Physical Address / Description</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    disabled={!isEditing || !hasUpdatePermission || saving}
                                    rows={2}
                                    className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors"
                                    placeholder="Street, landmarks, and location details"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Academic Policy Settings */}
                            <div className="pb-2 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-900">Academic Policy & Tracking</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Grading Format</label>
                                    <select
                                        name="gradingFormat"
                                        value={configData.gradingFormat}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors bg-white cursor-pointer"
                                    >
                                        <option value="letter">Letter Grades (A, B, C, D, F)</option>
                                        <option value="percentage">Percentage (0-100%)</option>
                                        <option value="points">Points Based (Out of Max)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Attendance Policy</label>
                                    <select
                                        name="attendancePolicy"
                                        value={configData.attendancePolicy}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors bg-white cursor-pointer"
                                    >
                                        <option value="daily">Daily Attendance</option>
                                        <option value="subject">Subject-wise (Per Period)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Default Passing Mark (%)</label>
                                <input
                                    type="number"
                                    name="passingMark"
                                    value={configData.passingMark}
                                    onChange={handleChange}
                                    disabled={!isEditing || !hasUpdatePermission || saving}
                                    className="w-full max-w-xs border border-slate-300 rounded p-2.5 text-sm text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#4085b3] focus:border-[#4085b3] disabled:bg-slate-50 disabled:text-slate-600 disabled:border-slate-200 transition-colors"
                                    min="0"
                                    max="100"
                                />
                            </div>
                        </div>
                    )}

                    {hasUpdatePermission ? (
                        <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                            {isEditing ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        disabled={saving}
                                        className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded transition-colors cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>{saving ? "Saving..." : "Save Settings"}</span>
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-2 bg-[#4085b3] hover:bg-[#32698e] text-white text-sm font-semibold rounded transition-colors cursor-pointer"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 italic">
                            You do not have permission to update school profile settings.
                        </div>
                    )}
                </form>
        </div>
    );
}
