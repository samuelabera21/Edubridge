"use client";

import { useEffect, useState, useRef } from "react";
import { fetchApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
    User,
    Settings,
    Lock,
    CheckCircle2,
    AlertCircle,
    Phone,
    Mail,
    MapPin,
    Shield,
    Key,
    Loader2,
    Palette,
    Globe,
    Calendar,
    Eye,
    EyeOff,
    Sparkles,
    Check,
    GraduationCap,
    School,
    Camera,
    Upload,
    Trash2,
} from "lucide-react";

type Tab = "profile" | "security" | "preferences";

export default function StudentSettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("profile");
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Profile Photo State
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoMsg, setPhotoMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const photoInputRef = useRef<HTMLInputElement | null>(null);

    // Password Form State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Preferences State (persisted to localStorage)
    const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
    const [preferencesSaved, setPreferencesSaved] = useState(false);

    useEffect(() => {
        loadProfile();

        // Load photo from localStorage
        const savedPhoto = localStorage.getItem("student_profile_photo");
        if (savedPhoto) {
            setPhotoUrl(savedPhoto);
        }

        // Clean up any residual dark mode or themes
        if (typeof window !== "undefined") {
            document.documentElement.classList.remove("dark");
            localStorage.removeItem("theme");
            localStorage.setItem("student_lang", "en");
        }

        // Load appearance prefs from localStorage
        const savedDate = localStorage.getItem("student_dateFormat") || "DD/MM/YYYY";
        setDateFormat(savedDate);
    }, []);

    async function loadProfile() {
        try {
            setLoading(true);
            const res = await fetchApi("/student/me");
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                const localPhoto = localStorage.getItem("student_profile_photo");
                if (!localPhoto && data.photoUrl) {
                    setPhotoUrl(data.photoUrl);
                }
            }
        } catch (err) {
            console.error("Failed to load student profile:", err);
        } finally {
            setLoading(false);
        }
    }

    function handleSavePreferences() {
        localStorage.setItem("student_dateFormat", dateFormat);
        setPreferencesSaved(true);
        setTimeout(() => setPreferencesSaved(false), 2500);
    }

    // Profile Photo Upload & Remove Handler
    function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setPhotoMsg({ type: "error", text: "Please upload an image file (JPG, PNG, WebP)" });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setPhotoMsg({ type: "error", text: "Image file size should be less than 5MB" });
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            setPhotoUrl(dataUrl);
            localStorage.setItem("student_profile_photo", dataUrl);
            window.dispatchEvent(new CustomEvent("studentProfilePhotoChanged", { detail: dataUrl }));
            setPhotoMsg({ type: "success", text: "Profile photo updated successfully!" });
            setTimeout(() => setPhotoMsg(null), 3000);
        };
        reader.readAsDataURL(file);
    }

    function handleRemovePhoto() {
        setPhotoUrl(null);
        localStorage.removeItem("student_profile_photo");
        window.dispatchEvent(new CustomEvent("studentProfilePhotoChanged", { detail: null }));
        if (photoInputRef.current) {
            photoInputRef.current.value = "";
        }
        setPhotoMsg({ type: "success", text: "Profile picture removed successfully" });
        setTimeout(() => setPhotoMsg(null), 3000);
    }

    async function handleChangePassword(e: React.FormEvent) {
        e.preventDefault();
        setPasswordMsg(null);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordMsg({ type: "error", text: "All password fields are required." });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: "error", text: "New password and confirmation do not match." });
            return;
        }
        if (newPassword.length < 8) {
            setPasswordMsg({ type: "error", text: "New password must be at least 8 characters long." });
            return;
        }

        try {
            setSavingPassword(true);
            const res = await fetchApi("/authorization/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            if (res.ok) {
                setPasswordMsg({ type: "success", text: "Password changed successfully!" });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                const errData = await res.json().catch(() => ({}));
                setPasswordMsg({ type: "error", text: errData.error || "Failed to change password. Please check your current password." });
            }
        } catch (err: any) {
            setPasswordMsg({ type: "error", text: err?.message || "Failed to update password." });
        } finally {
            setSavingPassword(false);
        }
    }

    // Password strength
    const passwordStrength = (() => {
        if (!newPassword) return null;
        if (newPassword.length < 6) return { label: "Weak", color: "bg-rose-500", width: "25%" };
        if (newPassword.length < 8) return { label: "Fair", color: "bg-amber-500", width: "50%" };
        if (/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword))
            return { label: "Strong", color: "bg-emerald-500", width: "100%" };
        return { label: "Good", color: "bg-slate-700", width: "75%" };
    })();

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: "profile", label: "My Profile", icon: <User className="w-4 h-4" /> },
        { key: "security", label: "Account Security", icon: <Lock className="w-4 h-4" /> },
        { key: "preferences", label: "Preferences", icon: <Palette className="w-4 h-4" /> },
    ];

    const enrollment = profile?.enrollments?.[0];
    const studentName = profile?.user?.name || [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Student";
    const gradeName = enrollment?.schoolGrade?.grade?.name || "Grade Level";
    const sectionName = enrollment?.section?.name ? `Section ${enrollment.section.name}` : "General Section";
    const academicYear = enrollment?.academicYear?.name || "Current Academic Year";

    if (loading) {
        return (
            <div className="w-full max-w-5xl mx-auto p-12 text-center text-slate-500 min-h-[400px] flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-700 mb-3" />
                <p className="text-sm font-semibold text-slate-600">Loading your settings...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 text-slate-800 font-sans p-2 sm:p-4">
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-slate-200 pb-4">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                    <Settings className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-900 leading-tight">Settings</h1>
                    <p className="text-xs text-slate-500">Manage your profile information, password security, and display preferences.</p>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 w-full sm:w-fit text-xs font-semibold overflow-x-auto scrollbar-none">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all duration-150 shrink-0 cursor-pointer ${
                            activeTab === tab.key
                                ? "bg-white text-slate-900 shadow-xs font-bold"
                                : "text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ─────────────── TAB 1: PROFILE ─────────────── */}
            {activeTab === "profile" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Left: Avatar & Profile Pic Upload */}
                    <Card className="md:col-span-1 border-slate-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-slate-700" />
                                <span>Official Identity</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs">
                            {/* Profile Pic with Upload Functionality */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-3">
                                <div className="relative w-20 h-20 mx-auto group">
                                    {photoUrl ? (
                                        <img
                                            src={photoUrl}
                                            alt={studentName}
                                            className="w-20 h-20 rounded-full object-cover border-2 border-slate-300 shadow-xs"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-slate-800 text-white font-black text-2xl flex items-center justify-center shadow-xs">
                                            {profile?.firstName?.[0] || "S"}{profile?.lastName?.[0] || "T"}
                                        </div>
                                    )}

                                    {/* Camera Hover overlay */}
                                    <button
                                        type="button"
                                        onClick={() => photoInputRef.current?.click()}
                                        className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                        title="Change profile picture"
                                    >
                                        <Camera className="w-6 h-6" />
                                    </button>
                                </div>

                                <input
                                    type="file"
                                    ref={photoInputRef}
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                />

                                <div>
                                    <h3 className="font-extrabold text-slate-900 text-sm">{studentName}</h3>
                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{profile?.studentId || "STD-2026"}</p>
                                </div>

                                <div className="flex items-center justify-center gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => photoInputRef.current?.click()}
                                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[11px] flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                                    >
                                        <Upload className="w-3 h-3" />
                                        <span>Change Photo</span>
                                    </button>
                                    {photoUrl && (
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                                            title="Remove picture"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                {photoMsg && (
                                    <p className={`text-[10px] font-semibold ${photoMsg.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
                                        {photoMsg.text}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] mb-0.5">Academic Cohort</p>
                                    <p className="font-semibold text-slate-800">{gradeName} · {sectionName}</p>
                                    <p className="text-[10px] text-slate-400">{academicYear}</p>
                                </div>

                                <div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] mb-0.5">Gender &amp; Nationality</p>
                                    <p className="font-semibold text-slate-800">{profile?.gender || "Not Specified"} · {profile?.nationality || "Ethiopian"}</p>
                                </div>

                                <div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] mb-0.5">Date of Birth</p>
                                    <p className="font-semibold text-slate-800">
                                        {profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "Recorded on file"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Contact & Guardian Details */}
                    <Card className="md:col-span-2 border-slate-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <School className="w-4 h-4 text-slate-700" />
                                <span>Contact &amp; Guardian Records</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        Guardian / Emergency Contact
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={profile?.emergencyContactName || "Guardian on record"}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium"
                                    />
                                    <p className="text-[10px] text-slate-400">Relation: {profile?.emergencyContactRelation || "Parent / Guardian"}</p>
                                </div>

                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        Emergency Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={profile?.emergencyContactPhone || "+251 (on file)"}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1 pt-2 border-t border-slate-100">
                                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                    Registered Residential Address
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Region</p>
                                        <p className="font-bold text-slate-800 truncate">{profile?.region || "—"}</p>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Zone</p>
                                        <p className="font-bold text-slate-800 truncate">{profile?.zone || "—"}</p>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Woreda</p>
                                        <p className="font-bold text-slate-800 truncate">{profile?.woreda || "—"}</p>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Kebele</p>
                                        <p className="font-bold text-slate-800 truncate">{profile?.kebele || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-900 text-[11px] flex items-start gap-2.5">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Need to update official details?</p>
                                    <p className="text-amber-700 mt-0.5">
                                        To update your registered name, date of birth, or section placement, contact your school registrar or administrative desk.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ─────────────── TAB 2: SECURITY ─────────────── */}
            {activeTab === "security" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Password Form */}
                    <Card className="md:col-span-2 border-slate-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Key className="w-4 h-4 text-slate-700" />
                                <span>Change Login Password</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                                {passwordMsg && (
                                    <div
                                        className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                                            passwordMsg.type === "success"
                                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                                : "bg-rose-50 border-rose-200 text-rose-800"
                                        }`}
                                    >
                                        {passwordMsg.type === "success" ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        ) : (
                                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                        )}
                                        <span>{passwordMsg.text}</span>
                                    </div>
                                )}

                                {/* Current Password */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPw ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter your current password"
                                            className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-800 text-xs bg-slate-50/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* New Password */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPw ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="At least 8 characters"
                                            className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-800 text-xs bg-slate-50/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPw(!showNewPw)}
                                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {passwordStrength && (
                                        <div className="space-y-1 pt-1">
                                            <div className="flex items-center justify-between text-[10px]">
                                                <span className="text-slate-400">Strength:</span>
                                                <span className="font-bold text-slate-700">{passwordStrength.label}</span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${passwordStrength.color} rounded-full transition-all duration-300`}
                                                    style={{ width: passwordStrength.width }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-1">
                                    <label className="font-bold text-slate-700">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPw ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter your new password"
                                            className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-slate-800 text-xs bg-slate-50/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingPassword}
                                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                >
                                    {savingPassword ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Updating Password...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Key className="w-3.5 h-3.5" />
                                            <span>Update Password</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Security tips */}
                    <Card className="md:col-span-1 border-slate-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-slate-700" />
                                <span>Security Recommendations</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-slate-600">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                <p className="font-bold text-slate-800">Password Tips</p>
                                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500">
                                    <li>Use at least 8 characters</li>
                                    <li>Include numbers and symbols</li>
                                    <li>Never share with classmates</li>
                                </ul>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                <p className="font-bold text-slate-800">Account Security</p>
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    Your student login grants access to official EMIS report cards, attendance, and evaluation records. Always log out on shared computers.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ─────────────── TAB 3: DISPLAY & PREFERENCES ─────────────── */}
            {activeTab === "preferences" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Card className="md:col-span-2 border-slate-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Palette className="w-4 h-4 text-slate-700" />
                                <span>Preferences</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 text-xs">
                            {/* Standard Interface Language (English Only) */}
                            <div className="space-y-2">
                                <label className="block font-bold text-slate-800 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-slate-600" />
                                    <span>Interface Language</span>
                                </label>
                                <div className="max-w-xs">
                                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-900 bg-slate-50 text-slate-900 shadow-xs">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-xl">🇬🇧</span>
                                            <div>
                                                <p className="font-bold text-xs">English</p>
                                                <p className="text-[10px] text-slate-500">Official System Language</p>
                                            </div>
                                        </div>
                                        <CheckCircle2 className="w-4 h-4 text-slate-900" />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    English is the standardized instructional and record language for this portal.
                                </p>
                            </div>

                            <div className="border-t border-slate-100" />

                            {/* Date Format */}
                            <div className="space-y-2">
                                <label className="block font-bold text-slate-800 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-slate-600" />
                                    Date Display Format
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {[
                                        { value: "DD/MM/YYYY", example: "26/10/2026", label: "Day / Month / Year" },
                                        { value: "MM/DD/YYYY", example: "10/26/2026", label: "Month / Day / Year" },
                                        { value: "YYYY-MM-DD", example: "2026-10-26", label: "ISO Format" },
                                    ].map((fmt) => (
                                        <button
                                            key={fmt.value}
                                            type="button"
                                            onClick={() => setDateFormat(fmt.value)}
                                            className={`relative flex flex-col gap-0.5 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                                                dateFormat === fmt.value
                                                    ? "border-slate-900 bg-slate-50 text-slate-900 shadow-xs font-bold"
                                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                                            }`}
                                        >
                                            <span className="font-bold text-xs tabular-nums">{fmt.example}</span>
                                            <span className="text-[10px] text-slate-500">{fmt.label}</span>
                                            {dateFormat === fmt.value && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 absolute top-2 right-2" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleSavePreferences}
                                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Save Preferences</span>
                                </button>
                                {preferencesSaved && (
                                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <span>Preferences saved successfully!</span>
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Information summary */}
                    <Card className="md:col-span-1 border-slate-200 bg-white">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-slate-700" />
                                <span>Study Environment</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-slate-600 leading-relaxed">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="font-bold text-slate-800">Clear Daytime Interface</p>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    The portal uses high-contrast typography and clear layouts optimized for academic readability across desktop and mobile screens.
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="font-bold text-slate-800">Standard Language</p>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    All instructional metrics, curriculum schedules, and official marksheets are standardized in English.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
