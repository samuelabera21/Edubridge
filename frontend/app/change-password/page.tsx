"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "../../lib/api";
import { 
    Key, 
    Lock, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    XCircle, 
    Loader2, 
    ShieldAlert,
    Check
} from "lucide-react";

export default function ChangePasswordPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    // Password Strength Checks
    const lengthValid = newPassword.length >= 8;
    const uppercaseValid = /[A-Z]/.test(newPassword);
    const lowercaseValid = /[a-z]/.test(newPassword);
    const numberValid = /[0-9]/.test(newPassword);
    const specialValid = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

    const score = [lengthValid, uppercaseValid, lowercaseValid, numberValid, specialValid].filter(Boolean).length;

    const getStrengthLabel = () => {
        if (score <= 1) return { label: "Weak", color: "bg-red-500", text: "text-red-500" };
        if (score <= 3) return { label: "Medium", color: "bg-amber-500", text: "text-amber-500" };
        if (score === 4) return { label: "Strong", color: "bg-blue-500", text: "text-blue-500" };
        return { label: "Very Strong", color: "bg-emerald-500", text: "text-emerald-600" };
    };

    const strength = getStrengthLabel();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError("All password fields are required.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("New password and confirmation password do not match.");
            return;
        }

        if (currentPassword === newPassword) {
            setError("New password must be different from your current temporary password.");
            return;
        }

        if (score < 4) {
            setError("Please meet at least 4 password security criteria.");
            return;
        }

        try {
            setLoading(true);
            const res = await fetchApi("/authorization/change-password", {
                method: "POST",
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                    confirmPassword,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.message || "Failed to update password. Please verify your current password.");
                setLoading(false);
                return;
            }

            setSuccess("Password changed successfully! Redirecting to your dashboard...");
            
            const meRes = await fetchApi("/authorization/me");
            let targetPath = "/dashboard/admin";
            if (meRes.ok) {
                const meData = await meRes.json();
                const roleName = meData.access?.[0]?.role?.name;
                switch (roleName) {
                    case "ADMIN":
                    case "SCHOOL_ADMIN":
                    case "ADMINISTRATOR": targetPath = "/dashboard/admin"; break;
                    case "TEACHER": targetPath = "/dashboard/teacher"; break;
                    case "STUDENT": targetPath = "/dashboard/student"; break;
                    case "PARENT": targetPath = "/dashboard/parent"; break;
                    case "VICE_PRINCIPAL": targetPath = "/dashboard/vice-principal"; break;
                    default: targetPath = "/dashboard/admin"; break;
                }
            }

            setTimeout(() => {
                router.push(targetPath);
            }, 1200);
        } catch (err) {
            console.error(err);
            setError("A network error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 text-gray-800">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <Key className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Change Password Required</h1>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                        For security, you must update your temporary default credentials before continuing to your dashboard.
                    </p>
                </div>

                {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl flex items-start space-x-2.5">
                        <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3.5 rounded-xl flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{success}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Current Password */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            Current / Temporary Password
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrent ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter temporary password"
                                className="w-full text-xs p-3 border border-gray-200 rounded-xl pr-10 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            New Secure Password
                        </label>
                        <div className="relative">
                            <input
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Create new password"
                                className="w-full text-xs p-3 border border-gray-200 rounded-xl pr-10 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Strength Indicator Bar */}
                        {newPassword && (
                            <div className="mt-2.5 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                    <span className="text-gray-500">Strength:</span>
                                    <span className={strength.text}>{strength.label}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className={`h-full flex-1 transition-all ${
                                                level <= score ? strength.color : "bg-gray-200"
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Password Strength Checklist */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-[11px] space-y-1.5 text-gray-600">
                        <p className="font-bold text-gray-700 mb-1">Password Requirements:</p>
                        <div className="grid grid-cols-2 gap-1">
                            <div className={`flex items-center space-x-1.5 ${lengthValid ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                {lengthValid ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 block">•</span>}
                                <span>At least 8 characters</span>
                            </div>
                            <div className={`flex items-center space-x-1.5 ${uppercaseValid ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                {uppercaseValid ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 block">•</span>}
                                <span>Uppercase letter</span>
                            </div>
                            <div className={`flex items-center space-x-1.5 ${lowercaseValid ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                {lowercaseValid ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 block">•</span>}
                                <span>Lowercase letter</span>
                            </div>
                            <div className={`flex items-center space-x-1.5 ${numberValid ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                {numberValid ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 block">•</span>}
                                <span>Number (0-9)</span>
                            </div>
                            <div className={`flex items-center space-x-1.5 ${specialValid ? "text-emerald-600 font-semibold" : "text-gray-400"}`}>
                                {specialValid ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 block">•</span>}
                                <span>Special character</span>
                            </div>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Re-enter new password"
                                className="w-full text-xs p-3 border border-gray-200 rounded-xl pr-10 focus:ring-2 focus:ring-blue-600 outline-none transition-all"
                                required
                                disabled={loading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-[10px] text-rose-500 font-semibold mt-1">Passwords do not match</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || Boolean(success)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password & Continue</span>}
                    </button>
                </form>
            </div>
        </div>
    );
}
