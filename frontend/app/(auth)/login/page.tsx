"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../../lib/api";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const resolveLoginEmail = (input: string) => {
        const trimmed = input.trim();
        if (trimmed.includes("@")) return trimmed;

        const lower = trimmed.toLowerCase();
        if (lower === "admin" || lower === "school_admin") return "admin@edubridge.com";
        if (lower === "teacher") return "teacher@edubridge.com";
        if (lower === "student") return "student@edubridge.com";
        if (lower === "parent") return "parent@edubridge.com";

        // Auto-formatted system username
        return `${lower}@edubridge.local`;
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
                    setError("Invalid username or password. Please check your username and password.");
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
                if (meData.isActive === false || meData.user?.isActive === false) {
                    setError("Your account is currently inactive. Please contact your administrator.");
                    await fetchApi("/auth/sign-out", { method: "POST" });
                    setLoading(false);
                    return;
                }

                if (meData.requiresPasswordChange || meData.user?.requiresPasswordChange) {
                    router.push("/change-password");
                    return;
                }

                const roleName = meData.access?.[0]?.role?.name;
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
                        router.push("/dashboard/admin");
                        return;
                }
            }

            router.push("/dashboard/admin");
        } catch (err) {
            console.error(err);
            setError("A network error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="w-full text-black">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-gray-500 mb-8">Sign in to your EduBridge account</p>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm border border-red-100">
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors"
                        placeholder="Enter your username"
                        required
                        disabled={loading}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors"
                        placeholder="••••••••"
                        required
                        disabled={loading}
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#4085b3] text-white p-2.5 rounded-md font-medium hover:bg-[#32698e] transition-colors flex justify-center items-center disabled:opacity-70"
                >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign In"}
                </button>
            </form>

            <div className="mt-8 text-center text-xs text-gray-500">
                Account registration is managed by your School Administrator.
            </div>
        </div>
    );
}
