"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../../lib/api";
import { Loader2, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token") || "";

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // Password strength evaluator
    const getStrength = (pwd: string) => {
        let score = 0;
        if (pwd.length >= 8) score++;
        if (/[A-Z]/.test(pwd)) score++;
        if (/[0-9]/.test(pwd)) score++;
        if (/[^A-Za-z0-9]/.test(pwd)) score++;
        return score;
    };

    const strength = getStrength(password);
    const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
    const strengthColors = ["bg-red-500", "bg-yellow-500", "bg-blue-500", "bg-emerald-500"];

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Missing or invalid password reset token. Please request a new link.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match. Please verify both fields.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetchApi("/auth/reset-password", {
                method: "POST",
                body: JSON.stringify({
                    newPassword: password,
                    token,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const msg = data.message || data.error || "Failed to reset password. The link may have expired.";
                setError(msg);
                setLoading(false);
                return;
            }

            setSuccess(true);
            setLoading(false);
        } catch (err: any) {
            console.error("Password reset error:", err);
            setError("A network error occurred. Please try again.");
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full text-slate-800 text-center py-6 animate-fade-in">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Password Reset Successful!</h1>
                <p className="text-slate-600 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
                    Your password has been securely updated. You can now log into your EduBridge account with your new credentials.
                </p>
                <Link
                    href="/login"
                    className="inline-flex items-center justify-center w-full bg-[#4085b3] text-white p-3 rounded-lg font-medium hover:bg-[#32698e] transition-all shadow-sm"
                >
                    Proceed to Sign In &rarr;
                </Link>
            </div>
        );
    }

    if (!token) {
        return (
            <div className="w-full text-slate-800 py-6 animate-fade-in">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-200">
                    <AlertCircle className="w-7 h-7" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Invalid Reset Link</h1>
                <p className="text-slate-600 mb-6 text-center text-sm leading-relaxed">
                    This password reset link is missing a valid token or has expired. Please request a new link from the login page.
                </p>
                <div className="space-y-3">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center w-full bg-[#4085b3] text-white p-2.5 rounded-lg font-medium hover:bg-[#32698e] transition-colors text-sm"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full text-slate-800">
            <div className="flex items-center space-x-2 text-sm text-slate-500 mb-6">
                <Link href="/login" className="hover:text-[#4085b3] transition-colors flex items-center">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Sign In
                </Link>
            </div>

            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-sky-50 text-[#4085b3] rounded-lg border border-sky-100">
                    <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
            </div>
            <p className="text-slate-500 mb-6 text-sm">
                Enter and confirm your new password to restore account access.
            </p>

            {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-5 text-sm border border-red-200 flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleReset} className="space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-all text-sm"
                            placeholder="At least 8 characters"
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>

                    {/* Password Strength Meter */}
                    {password && (
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Password strength:</span>
                                <span className="font-semibold text-slate-700">{strengthLabels[strength - 1] || "Very Weak"}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 flex gap-1 overflow-hidden">
                                {[0, 1, 2, 3].map((idx) => (
                                    <div
                                        key={idx}
                                        className={`h-full flex-1 transition-all rounded-full ${
                                            strength > idx ? strengthColors[strength - 1] : "bg-slate-200"
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-all text-sm"
                            placeholder="Repeat new password"
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
                    <p className={password.length >= 8 ? "text-emerald-600 font-medium" : ""}>&bull; Minimum 8 characters long</p>
                    <p className={/[0-9]/.test(password) && /[A-Za-z]/.test(password) ? "text-emerald-600 font-medium" : ""}>&bull; Contains both letters and numbers</p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#4085b3] text-white p-2.5 rounded-lg font-medium hover:bg-[#32698e] transition-colors flex justify-center items-center disabled:opacity-70 shadow-sm"
                >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Update Password & Sign In"}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#4085b3]" />
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
