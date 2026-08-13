"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../../lib/api";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetchApi("/auth/sign-in/email", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Invalid email or password");
                setLoading(false);
                return;
            }

            // Route protection will handle checking role in dashboard
            router.push("/dashboard");
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors"
                        placeholder="admin@edubridge.local"
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

            <div className="mt-8 text-center text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/register" className="text-[#4085b3] hover:underline font-semibold">
                    Register here
                </Link>
            </div>
        </div>
    );
}
