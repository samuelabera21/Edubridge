"use client";

import { useEffect, useState } from "react";
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
    BookOpen,
    Shield,
    Save,
    Key,
    Loader2,
    Palette,
    Globe,
    Calendar,
    Eye,
    EyeOff,
    Check
} from "lucide-react";

type Tab = "profile" | "security" | "appearance";

export default function TeacherSettingsPage() {
    const [activeTab, setActiveTab] = useState<Tab>("profile");
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Profile Form State
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [bio, setBio] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Password Form State
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Appearance State (persisted to localStorage)
    const [language, setLanguage] = useState("en");
    const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
    const [appearanceSaved, setAppearanceSaved] = useState(false);

    useEffect(() => {
        loadProfile();
        // Load appearance prefs from localStorage
        const savedLang = localStorage.getItem("teacher_lang") || "en";
        const savedDate = localStorage.getItem("teacher_dateFormat") || "DD/MM/YYYY";
        setLanguage(savedLang);
        setDateFormat(savedDate);
    }, []);

    async function loadProfile() {
        try {
            setLoading(true);
            const res = await fetchApi("/teacher/profile");
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                setPhone(data.phone || "");
                setAddress(data.address || "");
                setSpecialization(data.specialization || "");
                setBio(data.bio || "");
            }
        } catch (err) {
            console.error("Failed to load teacher profile:", err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveProfile(e: React.FormEvent) {
        e.preventDefault();
        setProfileMsg(null);
        try {
            setSavingProfile(true);
            const res = await fetchApi("/teacher/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, address, specialization, bio })
            });
            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                setProfileMsg({ type: "success", text: "Profile details updated successfully!" });
            } else {
                const errData = await res.json();
                setProfileMsg({ type: "error", text: errData.error || "Failed to update profile." });
            }
        } catch (err: any) {
            setProfileMsg({ type: "error", text: err.message || "An unexpected error occurred." });
        } finally {
            setSavingProfile(false);
        }
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
                const errData = await res.json();
                setPasswordMsg({ type: "error", text: errData.error || "Failed to change password. Check your current password." });
            }
        } catch (err: any) {
            setPasswordMsg({ type: "error", text: err.message || "Failed to update password." });
        } finally {
            setSavingPassword(false);
        }
    }

    function handleSaveAppearance() {
        localStorage.setItem("teacher_lang", language);
        localStorage.setItem("teacher_dateFormat", dateFormat);
        setAppearanceSaved(true);
        setTimeout(() => setAppearanceSaved(false), 2500);
    }

    // Password strength
    const passwordStrength = (() => {
        if (!newPassword) return null;
        if (newPassword.length < 6) return { label: "Weak", color: "bg-rose-500", width: "25%" };
        if (newPassword.length < 8) return { label: "Fair", color: "bg-amber-500", width: "50%" };
        if (/[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword))
            return { label: "Strong", color: "bg-emerald-500", width: "100%" };
        return { label: "Good", color: "bg-[#4085b3]", width: "75%" };
    })();

    const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
        { key: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
        { key: "security", label: "Account Security", icon: <Lock className="w-4 h-4" /> },
        { key: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
    ];

    if (loading) {
        return (
            <div className="w-full max-w-5xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#4085b3] mb-3" />
                <p className="text-sm font-semibold text-gray-600">Loading your settings...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-[#4085b3] flex items-center justify-center shrink-0">
                    <Settings className="w-5 h-5" />
                </div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Settings</h1>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 w-fit text-xs font-semibold">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition-all duration-200 ${
                            activeTab === tab.key
                                ? "bg-white text-[#4085b3] shadow-xs font-bold"
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
                    {/* Left: Avatar & read-only info */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-[#4085b3]" />
                                <span>Official Information</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs">
                            {/* Avatar */}
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2.5">
                                <div className="w-16 h-16 rounded-2xl bg-[#4085b3] text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
                                    {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 text-sm">{profile?.firstName} {profile?.lastName}</h3>
                                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{profile?.employeeId || "TCH-2026"}</p>
                                </div>
                                <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                    Active Faculty
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <p className="text-gray-400 font-bold uppercase text-[10px] mb-0.5">Email Address</p>
                                    <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <span className="truncate">{profile?.email || profile?.user?.email || "teacher@edubridge.local"}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase text-[10px] mb-0.5">Qualification</p>
                                    <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                        <span>{profile?.qualification || "B.Sc Education"}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase text-[10px] mb-0.5">Assigned Sections</p>
                                    <p className="font-bold text-[#4085b3]">{profile?.assignments?.length || 0} Section(s)</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Editable form */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <User className="w-4 h-4 text-[#4085b3]" />
                                <span>Edit Personal Details</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                                {profileMsg && (
                                    <div className={`p-3.5 rounded-xl border flex items-center gap-2 ${
                                        profileMsg.type === "success"
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                            : "bg-rose-50 border-rose-200 text-rose-800"
                                    }`}>
                                        {profileMsg.type === "success"
                                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                        <span className="font-semibold">{profileMsg.text}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+251 911 000 000"
                                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Subject Specialization</label>
                                        <div className="relative">
                                            <BookOpen className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                            <input
                                                type="text"
                                                value={specialization}
                                                onChange={(e) => setSpecialization(e.target.value)}
                                                placeholder="e.g. Mathematics, Algebra & Geometry"
                                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Residential Address</label>
                                    <div className="relative">
                                        <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="City, Woreda, Kebele"
                                            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Biography / Teaching Notes</label>
                                    <textarea
                                        rows={3}
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Brief teaching philosophy or background notes..."
                                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] focus:border-transparent resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="px-5 py-2.5 bg-[#4085b3] hover:bg-[#347099] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
                                >
                                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span>Save Profile Changes</span>
                                </button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ─────────────── TAB 2: ACCOUNT SECURITY ─────────────── */}
            {activeTab === "security" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Left: Password form */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Key className="w-4 h-4 text-[#4085b3]" />
                                <span>Change Password</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                                {passwordMsg && (
                                    <div className={`p-3.5 rounded-xl border flex items-center gap-2 ${
                                        passwordMsg.type === "success"
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                            : "bg-rose-50 border-rose-200 text-rose-800"
                                    }`}>
                                        {passwordMsg.type === "success"
                                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                        <span className="font-semibold">{passwordMsg.text}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPw ? "text" : "password"}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter your current password"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 pr-10 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] focus:border-transparent"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                        >
                                            {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPw ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="At least 8 characters"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 pr-10 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] focus:border-transparent"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPw(!showNewPw)}
                                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                        >
                                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {/* Password strength meter */}
                                    {passwordStrength && (
                                        <div className="mt-2 space-y-1">
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                                    style={{ width: passwordStrength.width }}
                                                />
                                            </div>
                                            <p className={`text-[10px] font-bold ${
                                                passwordStrength.label === "Weak" ? "text-rose-600"
                                                    : passwordStrength.label === "Fair" ? "text-amber-600"
                                                    : passwordStrength.label === "Good" ? "text-[#4085b3]"
                                                    : "text-emerald-600"
                                            }`}>
                                                Password strength: {passwordStrength.label}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPw ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter your new password"
                                            className={`w-full bg-white border rounded-xl px-3 pr-10 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3] focus:border-transparent ${
                                                confirmPassword && confirmPassword !== newPassword
                                                    ? "border-rose-300 bg-rose-50"
                                                    : confirmPassword && confirmPassword === newPassword
                                                    ? "border-emerald-300"
                                                    : "border-gray-200"
                                            }`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPw(!showConfirmPw)}
                                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {confirmPassword && confirmPassword !== newPassword && (
                                        <p className="text-[10px] text-rose-600 font-semibold mt-1">Passwords do not match</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingPassword}
                                    className="px-5 py-2.5 bg-[#4085b3] hover:bg-[#347099] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
                                >
                                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    <span>Update Password</span>
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Right: Security info */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-600" />
                                <span>Security Info</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 text-blue-900 space-y-1.5">
                                <p className="font-bold text-[11px]">Password Policy</p>
                                <ul className="space-y-0.5 text-[10px] text-blue-800 list-none">
                                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-500" />Minimum 8 characters</li>
                                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-500" />Mix of letters & numbers</li>
                                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-500" />At least one symbol</li>
                                </ul>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                                <p className="text-gray-400 font-bold uppercase text-[10px]">Session Status</p>
                                <p className="font-bold text-emerald-700 flex items-center gap-1.5 text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Active Secure Session</span>
                                </p>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                                <p className="text-gray-400 font-bold uppercase text-[10px]">Account Email</p>
                                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span className="truncate">{profile?.email || profile?.user?.email || "—"}</span>
                                </p>
                                <p className="text-[10px] text-gray-400">Contact your administrator to change your login email.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ─────────────── TAB 3: APPEARANCE ─────────────── */}
            {activeTab === "appearance" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Palette className="w-4 h-4 text-[#4085b3]" />
                                <span>Display Preferences</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 text-xs">
                            {/* Language */}
                            <div className="space-y-2">
                                <label className="block font-bold text-gray-700 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-[#4085b3]" />
                                    Language / Interface Language
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { code: "en", label: "English", flag: "🇬🇧" },
                                        { code: "am", label: "Amharic (አማርኛ)", flag: "🇪🇹" },
                                        { code: "om", label: "Afaan Oromo", flag: "🇪🇹" },
                                        { code: "ti", label: "Tigrinya (ትግርኛ)", flag: "🇪🇹" },
                                        { code: "so", label: "Somali", flag: "🇸🇴" },
                                        { code: "fr", label: "French", flag: "🇫🇷" },
                                    ].map((lang) => (
                                        <button
                                            key={lang.code}
                                            type="button"
                                            onClick={() => setLanguage(lang.code)}
                                            className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all duration-200 ${
                                                language === lang.code
                                                    ? "border-[#4085b3] bg-blue-50 text-[#4085b3] font-bold shadow-xs"
                                                    : "border-gray-200 bg-white text-gray-700 hover:border-[#4085b3] hover:bg-blue-50/40"
                                            }`}
                                        >
                                            <span className="text-base">{lang.flag}</span>
                                            <span className="text-[11px] font-semibold leading-tight">{lang.label}</span>
                                            {language === lang.code && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#4085b3] absolute top-1.5 right-1.5" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Interface language preference is saved locally in your browser.</p>
                            </div>

                            <div className="border-t border-slate-100" />

                            {/* Date Format */}
                            <div className="space-y-2">
                                <label className="block font-bold text-gray-700 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-[#4085b3]" />
                                    Date Display Format
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {[
                                        { value: "DD/MM/YYYY", example: "25/10/2026", label: "Day / Month / Year" },
                                        { value: "MM/DD/YYYY", example: "10/25/2026", label: "Month / Day / Year" },
                                        { value: "YYYY-MM-DD", example: "2026-10-25", label: "ISO Format" },
                                    ].map((fmt) => (
                                        <button
                                            key={fmt.value}
                                            type="button"
                                            onClick={() => setDateFormat(fmt.value)}
                                            className={`relative flex flex-col gap-0.5 px-3.5 py-3 rounded-xl border text-left transition-all duration-200 ${
                                                dateFormat === fmt.value
                                                    ? "border-[#4085b3] bg-blue-50 text-[#4085b3] shadow-xs"
                                                    : "border-gray-200 bg-white text-gray-700 hover:border-[#4085b3] hover:bg-blue-50/40"
                                            }`}
                                        >
                                            <span className="font-extrabold text-sm tabular-nums">{fmt.example}</span>
                                            <span className="text-[10px] font-medium text-gray-500">{fmt.label}</span>
                                            {dateFormat === fmt.value && (
                                                <CheckCircle2 className="w-3.5 h-3.5 text-[#4085b3] absolute top-2 right-2" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Save */}
                            <button
                                type="button"
                                onClick={handleSaveAppearance}
                                className="px-5 py-2.5 bg-[#4085b3] hover:bg-[#347099] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs"
                            >
                                {appearanceSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                <span>{appearanceSaved ? "Preferences Saved!" : "Save Preferences"}</span>
                            </button>
                        </CardContent>
                    </Card>

                    {/* Right: Preview card */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-[#4085b3]" />
                                <span>Preview</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                <p className="text-gray-400 font-bold uppercase text-[10px]">Selected Language</p>
                                <p className="font-bold text-gray-900 text-sm capitalize">
                                    {{
                                        en: "🇬🇧 English",
                                        am: "🇪🇹 Amharic (አማርኛ)",
                                        om: "🇪🇹 Afaan Oromo",
                                        ti: "🇪🇹 Tigrinya",
                                        so: "🇸🇴 Somali",
                                        fr: "🇫🇷 French"
                                    }[language] || language}
                                </p>
                            </div>

                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                <p className="text-gray-400 font-bold uppercase text-[10px]">Date Example</p>
                                <p className="font-bold text-gray-900 text-sm tabular-nums">{
                                    dateFormat === "DD/MM/YYYY" ? "25/10/2026"
                                    : dateFormat === "MM/DD/YYYY" ? "10/25/2026"
                                    : "2026-10-25"
                                }</p>
                                <p className="text-[10px] text-gray-400">Format: <span className="font-bold text-gray-600">{dateFormat}</span></p>
                            </div>

                            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 text-blue-900 space-y-1">
                                <p className="font-bold text-[11px]">Note</p>
                                <p className="text-[10px] text-blue-800">
                                    Preferences are saved in your browser. They will be remembered the next time you log in on this device.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
