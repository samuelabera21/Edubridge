"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../../lib/api";
import { Loader2, KeyRound, Mail, CheckCircle2, AlertCircle, X } from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [pageChecking, setPageChecking] = useState(true);

    // Forgot Password Modal State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotInput, setForgotInput] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError] = useState("");
    const [forgotSuccess, setForgotSuccess] = useState(false);

    const router = useRouter();

    const routeUserByScope = (meData: any) => {
        if (meData.isActive === false || meData.user?.isActive === false) {
            setError("Your account is currently inactive. Please contact your administrator.");
            fetchApi("/auth/sign-out", { method: "POST" });
            return;
        }

        if (meData.requiresPasswordChange || meData.user?.requiresPasswordChange) {
            router.push("/change-password");
            return;
        }

        const primaryAccess = meData.access?.[0];
        const roleName = primaryAccess?.role?.name;
        const scopeType = primaryAccess?.scope?.type;

        // 1. Hierarchy / Administrative scopes
        if (scopeType === "FEDERAL") {
            router.push("/dashboard/federal");
            return;
        }
        if (scopeType === "REGION") {
            router.push("/dashboard/region");
            return;
        }
        if (scopeType === "ZONE") {
            router.push("/dashboard/zone");
            return;
        }
        if (scopeType === "WOREDA") {
            router.push("/dashboard/woreda");
            return;
        }

        // 2. School-level roles
        switch (roleName) {
            case "ADMIN":
            case "SCHOOL_ADMIN":
            case "ADMINISTRATOR":
                router.push("/dashboard/admin");
                return;
            case "TEACHER":
                router.push("/dashboard/teacher");
                return;
            case "STUDENT":
                router.push("/dashboard/student");
                return;
            case "PARENT":
                router.push("/dashboard/parent");
                return;
            case "VICE_PRINCIPAL":
                router.push("/dashboard/vice-principal");
                return;
            default:
                router.push("/dashboard/federal");
                return;
        }
    };

    // Check if user is already authenticated (e.g. returning from Google OAuth callback)
    useEffect(() => {
        let isMounted = true;
        const checkExistingSession = async () => {
            try {
                const meRes = await fetchApi("/authorization/me");
                if (meRes.ok) {
                    const meData = await meRes.json();
                    if (isMounted && meData) {
                        routeUserByScope(meData);
                        return;
                    }
                }
            } catch (err) {
                // Not authenticated, proceed to show login form
            } finally {
                if (isMounted) setPageChecking(false);
            }
        };

        checkExistingSession();
        return () => { isMounted = false; };
    }, []);

    const handleGoogleSignIn = async () => {
        setError("");
        setGoogleLoading(true);
        try {
            const callbackURL = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";
            const res = await fetchApi("/auth/sign-in/social", {
                method: "POST",
                body: JSON.stringify({
                    provider: "google",
                    callbackURL,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Failed to initialize Google Sign-in. Please check your credentials.");
                setGoogleLoading(false);
                return;
            }

            const data = await res.json();
            if (data?.url) {
                window.location.href = data.url;
                return;
            } else {
                setError("Unable to obtain Google login redirect URL.");
                setGoogleLoading(false);
            }
        } catch (err: any) {
            console.error("Google sign-in redirection error:", err);
            setError("Failed to initialize Google Sign-in. Please try again.");
            setGoogleLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        let targetEmail = username.trim();
        try {
            const resolveRes = await fetchApi("/authorization/resolve-username", {
                method: "POST",
                body: JSON.stringify({ username: username.trim() }),
            });
            if (resolveRes.ok) {
                const resolveData = await resolveRes.json();
                if (resolveData.email) targetEmail = resolveData.email;
            }
        } catch (err) {
            console.warn("Username resolution fallback used", err);
        }

        try {
            let res = await fetchApi("/auth/sign-in/email", {
                method: "POST",
                body: JSON.stringify({ email: targetEmail, password }),
            });

            // Fallback attempt with direct username as email if first attempt fails
            if (!res.ok && !username.includes("@")) {
                res = await fetchApi("/auth/sign-in/email", {
                    method: "POST",
                    body: JSON.stringify({ email: username.trim(), password }),
                });
            }

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const msg = data.message || "";
                if (msg.toLowerCase().includes("email") || msg.toLowerCase().includes("credential") || !msg) {
                    setError("Invalid username or password. Please check your credentials.");
                } else {
                    setError(msg);
                }
                setLoading(false);
                return;
            }

            // Verify user state server-side
            const meRes = await fetchApi("/authorization/me");
            if (meRes.ok) {
                const meData = await meRes.json();
                routeUserByScope(meData);
                return;
            }

            router.push("/dashboard/federal");
        } catch (err) {
            console.error(err);
            setError("A network error occurred. Please try again.");
            setLoading(false);
        }
    };

    const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setForgotError("");
        setForgotLoading(true);

        const inputVal = forgotInput.trim();
        if (!inputVal) {
            setForgotError("Please enter your email or system username.");
            setForgotLoading(false);
            return;
        }

        let targetEmail = inputVal;
        try {
            const resolveRes = await fetchApi("/authorization/resolve-username", {
                method: "POST",
                body: JSON.stringify({ username: inputVal }),
            });
            if (resolveRes.ok) {
                const resolveData = await resolveRes.json();
                if (resolveData.email) targetEmail = resolveData.email;
            }
        } catch (err) {
            console.warn("Username resolution error during forgot password", err);
        }

        try {
            const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : "/reset-password";
            let res = await fetchApi("/auth/request-password-reset", {
                method: "POST",
                body: JSON.stringify({
                    email: targetEmail,
                    redirectTo,
                }),
            });

            if (!res.ok) {
                res = await fetchApi("/auth/forget-password", {
                    method: "POST",
                    body: JSON.stringify({
                        email: targetEmail,
                        redirectTo,
                    }),
                });
            }

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const msg = data.message || data.error || "Failed to process request. Please verify your email/username.";
                setForgotError(msg);
                setForgotLoading(false);
                return;
            }

            setForgotSuccess(true);
            setForgotLoading(false);
        } catch (err: any) {
            console.error("Forgot password request error:", err);
            setForgotError("A network error occurred. Please try again later.");
            setForgotLoading(false);
        }
    };

    if (pageChecking) {
        return (
            <div className="w-full flex flex-col items-center justify-center py-16 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#4085b3] mb-3" />
                <p className="text-sm">Verifying session...</p>
            </div>
        );
    }

    return (
        <div className="w-full text-black">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-500 mb-6">Sign in to your EduBridge account</p>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-200 flex items-start space-x-2 animate-fade-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username or Email
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors text-sm"
                        placeholder="Enter your email or username"
                        required
                        disabled={loading || googleLoading}
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <button
                            type="button"
                            onClick={() => {
                                setForgotSuccess(false);
                                setForgotError("");
                                setForgotInput(username);
                                setShowForgotModal(true);
                            }}
                            className="text-xs text-[#4085b3] hover:text-[#32698e] font-semibold transition-colors"
                        >
                            Forgot Password?
                        </button>
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors text-sm"
                        placeholder="••••••••"
                        required
                        disabled={loading || googleLoading}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full bg-[#4085b3] text-white p-2.5 rounded-lg font-medium hover:bg-[#32698e] transition-colors flex justify-center items-center disabled:opacity-70 shadow-sm text-sm"
                >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign In"}
                </button>
            </form>

            {/* Clean Divider */}
            <div className="relative flex items-center justify-center my-6">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400 font-semibold absolute">
                    or continue with
                </span>
            </div>

            {/* Google Sign-in Button at Bottom */}
            <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 p-2.5 rounded-lg font-medium transition-all shadow-sm disabled:opacity-60"
            >
                {googleLoading ? (
                    <Loader2 className="animate-spin h-5 w-5 text-[#4085b3]" />
                ) : (
                    <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                        </svg>
                        <span>Continue with Google</span>
                    </>
                )}
            </button>

            <div className="mt-8 text-center text-xs text-gray-500">
                Institutional account access is provisioned by your respective administrator.
            </div>

            {/* Forgot Password Interactive Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 relative animate-scale-in">
                        <button
                            type="button"
                            onClick={() => setShowForgotModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {forgotSuccess ? (
                            <div className="text-center py-4 space-y-4">
                                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Reset Link Dispatched</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    If an active EduBridge account is registered with <strong>{forgotInput}</strong>, a password reset link has been dispatched to that email.
                                </p>
                                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                                    Please check your inbox (and spam folder) and follow the link to set your new password.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowForgotModal(false)}
                                    className="w-full bg-[#4085b3] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#32698e] transition-colors text-sm shadow-sm"
                                >
                                    Close & Return to Sign In
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center space-x-3 mb-2">
                                    <div className="p-2 bg-sky-50 text-[#4085b3] rounded-lg border border-sky-100">
                                        <KeyRound className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Reset Your Password</h3>
                                </div>
                                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                    Enter your registered email address or system username. We will send you a secure link to reset your password.
                                </p>

                                {forgotError && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-xs border border-red-200 flex items-start space-x-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500 mt-0.5" />
                                        <span>{forgotError}</span>
                                    </div>
                                )}

                                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                                            Email Address or Username
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={forgotInput}
                                                onChange={(e) => setForgotInput(e.target.value)}
                                                className="w-full border border-slate-300 rounded-lg p-2.5 pl-9 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors text-sm"
                                                placeholder="Enter your email or username"
                                                required
                                                disabled={forgotLoading}
                                            />
                                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowForgotModal(false)}
                                            disabled={forgotLoading}
                                            className="flex-1 border border-slate-300 text-slate-700 py-2.5 px-4 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={forgotLoading}
                                            className="flex-1 bg-[#4085b3] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#32698e] transition-colors flex items-center justify-center text-sm shadow-sm disabled:opacity-70"
                                        >
                                            {forgotLoading ? <Loader2 className="animate-spin h-4 w-4" /> : "Send Reset Link"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
