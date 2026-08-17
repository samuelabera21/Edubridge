"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { Building2, Save, CheckCircle2, Users, GraduationCap, LayoutGrid, Settings, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";

export default function SchoolProfilePage() {
    const { authData } = useAuth(); // Auth verified by layout
    
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
                        setFormData({
                            schoolName: data.school?.name || "",
                            activeAcademicYearId: activeYear ? activeYear.id : (data.academicYears?.[0]?.id || ""),
                            establishedYear: data.profile?.establishedYear?.toString() || "",
                            contactEmail: data.profile?.contactEmail || "",
                            phoneNumber: data.profile?.phoneNumber || "",
                            address: data.profile?.address || "",
                        });
                        if (data.profile?.configuration) {
                            setConfigData({
                                gradingFormat: data.profile.configuration.gradingFormat || "letter",
                                attendancePolicy: data.profile.configuration.attendancePolicy || "daily",
                                passingMark: data.profile.configuration.passingMark || 50
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
                configuration: configData
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
        return <LoadingState message="Loading school profile..." />;
    }

    if (error && !formData.schoolName) {
        return <ErrorState message={error} onRetry={() => window.location.reload()} />;
    }

    return (
        <div className="max-w-4xl text-black">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                        <Building2 className="h-6 w-6 text-[#006b3f]" />
                        <span>School Profile</span>
                    </h1>
                    <p className="text-gray-500 mt-1">Manage core information and settings for {formData.schoolName}</p>
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Link href="/dashboard/teachers" className="block group">
                    <Card className="bg-blue-50/50 border-blue-100 transition-shadow hover:shadow-md h-full">
                        <CardContent className="p-4 flex items-center space-x-4">
                            <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-200 transition-colors">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Teachers</p>
                                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{stats.totalTeachers}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/students" className="block group">
                    <Card className="bg-[#006b3f]/5 border-[#006b3f]/10 transition-shadow hover:shadow-md h-full">
                        <CardContent className="p-4 flex items-center space-x-4">
                            <div className="p-3 bg-[#006b3f]/10 text-[#006b3f] rounded-full group-hover:bg-[#006b3f]/20 transition-colors">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Total Students</p>
                                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-[#006b3f] transition-colors">{stats.totalStudents}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/academics/grades" className="block group">
                    <Card className="bg-purple-50 border-purple-100 transition-shadow hover:shadow-md h-full">
                        <CardContent className="p-4 flex items-center space-x-4">
                            <div className="p-3 bg-purple-100 text-purple-600 rounded-full group-hover:bg-purple-200 transition-colors">
                                <LayoutGrid className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Active Sections</p>
                                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{stats.activeSections}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {error && (
                <div className="mb-6">
                    <ErrorState title="Error" message={error} />
                </div>
            )}

            {success && (
                <div className="bg-green-50 text-green-700 p-4 rounded-md border border-green-200 mb-6 flex items-start space-x-3 shadow-sm">
                    <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500" />
                    <p className="font-medium">Settings updated successfully.</p>
                </div>
            )}

            <div className="bg-white border-b border-gray-200 mb-6 rounded-t-lg shadow-sm overflow-hidden">
                <nav className="flex space-x-1" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab("general")}
                        className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors flex justify-center items-center space-x-2 ${
                            activeTab === "general"
                                ? "border-[#006b3f] text-[#006b3f] bg-gray-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        <FileText className="w-4 h-4" />
                        <span>General Info</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("config")}
                        className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors flex justify-center items-center space-x-2 ${
                            activeTab === "config"
                                ? "border-[#006b3f] text-[#006b3f] bg-gray-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        <Settings className="w-4 h-4" />
                        <span>System Configuration</span>
                    </button>
                </nav>
            </div>

            <Card className="shadow-sm">
                <CardContent className="sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === "general" ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                                    <input
                                        type="text"
                                        name="schoolName"
                                        value={formData.schoolName}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Active Academic Year</label>
                                    <select
                                        name="activeAcademicYearId"
                                        value={formData.activeAcademicYearId}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving || academicYears.length === 0}
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white"
                                    >
                                        {academicYears.length === 0 && <option value="">No academic years found</option>}
                                        {academicYears.map(year => (
                                            <option key={year.id} value={year.id}>
                                                {year.name} ({new Date(year.startDate).getFullYear()} - {new Date(year.endDate).getFullYear()}) {year.status === "ACTIVE" ? " (Currently Active)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Established Year</label>
                                    <input
                                        type="number"
                                        name="establishedYear"
                                        value={formData.establishedYear}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                                        placeholder="e.g. 1995"
                                        min="1800"
                                        max={new Date().getFullYear()}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                                    <input
                                        type="email"
                                        name="contactEmail"
                                        value={formData.contactEmail}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                                        placeholder="info@school.edu.et"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Official Phone Number</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    disabled={!isEditing || !hasUpdatePermission || saving}
                                    className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                                    placeholder="+251 911 000 000"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    disabled={!isEditing || !hasUpdatePermission || saving}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                                    placeholder="Woreda, Zone, Region, Specific location details"
                                ></textarea>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-800 mb-1">Academic Configuration</h3>
                                <p className="text-sm text-blue-600">These settings dictate how academic progress and attendance are tracked across the school.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Grading Format</label>
                                    <select
                                        name="gradingFormat"
                                        value={configData.gradingFormat}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white"
                                    >
                                        <option value="letter">Letter Grades (A, B, C, D, F)</option>
                                        <option value="percentage">Percentage (0-100%)</option>
                                        <option value="points">Points Based (Out of Max)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Attendance Policy</label>
                                    <select
                                        name="attendancePolicy"
                                        value={configData.attendancePolicy}
                                        onChange={handleChange}
                                        disabled={!isEditing || !hasUpdatePermission || saving}
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-50 disabled:text-gray-500 transition-colors bg-white"
                                    >
                                        <option value="daily">Daily Attendance</option>
                                        <option value="subject">Subject-wise (Per Period)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Default Passing Mark (%)</label>
                                <input
                                    type="number"
                                    name="passingMark"
                                    value={configData.passingMark}
                                    onChange={handleChange}
                                    disabled={!isEditing || !hasUpdatePermission || saving}
                                    className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#006b3f] focus:border-[#006b3f] disabled:bg-gray-50 disabled:text-gray-500 transition-colors"
                                    min="0"
                                    max="100"
                                />
                                <p className="text-xs text-gray-500 mt-1">Students scoring below this percentage will be flagged as failing.</p>
                            </div>
                        </div>
                    )}

                    {hasUpdatePermission ? (
                        <div className="pt-6 border-t border-gray-100 flex justify-end space-x-3">
                            {isEditing ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsEditing(false)}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        isLoading={saving}
                                        leftIcon={<Save className="h-5 w-5" />}
                                    >
                                        Save Settings
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={() => setIsEditing(true)}
                                >
                                    Edit Profile
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="pt-4 border-t border-gray-100 text-sm text-gray-500 italic">
                            You do not have permission to update the school profile or configurations.
                        </div>
                    )}
                </form>
                </CardContent>
            </Card>
        </div>
    );
}
