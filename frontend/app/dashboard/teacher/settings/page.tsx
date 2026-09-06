"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { 
    User, 
    Settings, 
    Lock, 
    ArrowLeft, 
    CheckCircle2, 
    AlertCircle, 
    Phone, 
    Mail, 
    MapPin, 
    BookOpen, 
    Shield, 
    Save, 
    Key,
    Loader2
} from "lucide-react";

export default function TeacherSettingsPage() {
    const [activeTab, setActiveTab] = useState<"profile" | "account">("profile");
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
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        loadProfile();
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
                setProfileMsg({ type: "error", text: errData.error || "Failed to update profile details." });
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
                setPasswordMsg({ type: "error", text: errData.error || "Failed to change password. Please check your current password." });
            }
        } catch (err: any) {
            setPasswordMsg({ type: "error", text: err.message || "Failed to update password." });
        } finally {
            setSavingPassword(false);
        }
    }

    if (loading) {
        return (
            <div className="w-full max-w-5xl mx-auto p-12 text-center text-gray-500 min-h-[400px] flex flex-col justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#4085b3] mb-3" />
                <p className="text-sm font-semibold text-gray-600">Loading your profile settings...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 text-gray-800">
            {/* Header */}
            <div className="flex items-center space-x-3">
                <Link href="/dashboard/teacher" className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-2xs">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Profile & Account Settings</h1>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                        Manage your teacher credentials, personal details, contact details, and account security.
                    </p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 space-x-4 text-xs font-bold bg-white p-2 rounded-2xl border border-gray-100 shadow-2xs">
                <button
                    onClick={() => setActiveTab("profile")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 ${
                        activeTab === "profile" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <User className="w-4 h-4" />
                    <span>1. My Profile Details</span>
                </button>
                <button
                    onClick={() => setActiveTab("account")}
                    className={`px-4 py-2.5 rounded-xl transition-all flex items-center space-x-2 ${
                        activeTab === "account" ? "bg-[#4085b3] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-50"
                    }`}
                >
                    <Lock className="w-4 h-4" />
                    <span>2. Account & Security Settings</span>
                </button>
            </div>

            {/* TAB 1: MY PROFILE DETAILS */}
            {activeTab === "profile" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Read-only Teacher Summary Card */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                <Shield className="w-4 h-4 text-[#4085b3]" />
                                <span>Official Information</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center space-y-2">
                                <div className="w-16 h-16 rounded-2xl bg-[#4085b3] text-white font-black text-xl flex items-center justify-center mx-auto shadow-2xs">
                                    {profile?.firstName?.[0]}{profile?.lastName?.[0]}
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 text-sm">{profile?.firstName} {profile?.lastName}</h3>
                                    <p className="text-[10px] text-gray-500 font-mono font-bold mt-0.5">{profile?.employeeId || "TCH-2026"}</p>
                                </div>
                                <span className="inline-block px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                    Active Faculty
                                </span>
                            </div>

                            <div className="space-y-2.5">
                                <div>
                                    <p className="text-gray-400 font-bold uppercase text-[10px]">Email Address</p>
                                    <p className="font-semibold text-gray-800 flex items-center space-x-1.5 mt-0.5">
                                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{profile?.email || profile?.user?.email || "teacher@edubridge.local"}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase text-[10px]">Qualification</p>
                                    <p className="font-semibold text-gray-800 flex items-center space-x-1.5 mt-0.5">
                                        <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                        <span>{profile?.qualification || "B.Sc Education"}</span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-400 font-bold uppercase text-[10px]">Assigned Teaching Sections</p>
                                    <p className="font-bold text-[#4085b3] mt-0.5">
                                        {profile?.assignments?.length || 0} Section(s) Assigned
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Editable Profile Form */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                <User className="w-4 h-4 text-[#4085b3]" />
                                <span>Edit Personal Details</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                                {profileMsg && (
                                    <div className={`p-3.5 rounded-xl border flex items-center space-x-2 ${
                                        profileMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                                    }`}>
                                        {profileMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                        <span className="font-semibold">{profileMsg.text}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="+251 911 000 000"
                                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                            />
                                            <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Subject Specialization</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={specialization}
                                                onChange={(e) => setSpecialization(e.target.value)}
                                                placeholder="e.g. Mathematics, Algebra & Geometry"
                                                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                            />
                                            <BookOpen className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Residential Address</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="City, Woreda, Kebele"
                                            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                        />
                                        <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Teacher Biography / Notes</label>
                                    <textarea
                                        rows={3}
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Brief teaching philosophy or background notes..."
                                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingProfile}
                                    className="px-5 py-2.5 bg-[#4085b3] hover:bg-[#356e94] text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition-colors shadow-2xs disabled:opacity-50"
                                >
                                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    <span>Save Profile Changes</span>
                                </button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB 2: ACCOUNT & SECURITY SETTINGS */}
            {activeTab === "account" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Password Change Card */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                <Key className="w-4 h-4 text-[#4085b3]" />
                                <span>Change Security Password</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                                {passwordMsg && (
                                    <div className={`p-3.5 rounded-xl border flex items-center space-x-2 ${
                                        passwordMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                                    }`}>
                                        {passwordMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                                        <span className="font-semibold">{passwordMsg.text}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter your current password"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter your new password (min. 8 characters)"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re-enter your new password"
                                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4085b3]"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingPassword}
                                    className="px-5 py-2.5 bg-[#4085b3] hover:bg-[#356e94] text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition-colors shadow-2xs disabled:opacity-50"
                                >
                                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                    <span>Update Password</span>
                                </button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Account Security Info Card */}
                    <Card className="md:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                <Shield className="w-4 h-4 text-emerald-600" />
                                <span>Security Information</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs">
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-900 space-y-1">
                                <p className="font-bold text-[11px]">Password Policy</p>
                                <p className="text-[10px] text-blue-800">
                                    Passwords must be at least 8 characters long and contain a combination of letters, numbers, and symbols.
                                </p>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1.5">
                                <p className="text-gray-400 font-bold uppercase text-[10px]">Session Status</p>
                                <p className="font-bold text-emerald-700 flex items-center space-x-1 text-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Active Secure Session</span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
