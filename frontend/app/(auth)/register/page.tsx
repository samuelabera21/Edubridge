"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchApi } from "../../../lib/api";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetchApi("/auth/sign-up/email", {
                method: "POST",
                body: JSON.stringify({ name, email, password }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setError(data.message || "Registration failed. Email might already be in use.");
                setLoading(false);
                return;
            }

            // Better Auth automatically logs in the user after sign-up
            router.push("/dashboard");
        } catch (err) {
            console.error(err);
            setError("A network error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="w-full text-black">
            <h1 className="text-3xl font-bold mb-2">Create an Account</h1>
            <p className="text-gray-500 mb-8">Join the EduBridge platform</p>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-6 text-sm border border-red-100">
                    {error}
                </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors"
                        required
                        disabled={loading}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors"
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
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors"
                        required
                        disabled={loading}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] transition-colors"
                        required
                        disabled={loading}
                    />
                </div>
                
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#4085b3] text-white p-2.5 rounded-md font-medium hover:bg-[#32698e] transition-colors flex justify-center items-center disabled:opacity-70 mt-2"
                >
                    {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Register"}
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="text-[#4085b3] hover:underline font-semibold">
                    Sign in here
                </Link>
            </div>
        </div>
    );
}
