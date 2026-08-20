"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../lib/api";

export interface AuthData {
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
        requiresPasswordChange?: boolean;
        isActive?: boolean;
    };
    access: Array<{
        role: { name: string; permissions: Array<any> };
        scope: { id: string; name: string; type: string };
    }>;
    requiresPasswordChange?: boolean;
    isActive?: boolean;
}

export function useAuth(requireAuth = false) {
    const [authData, setAuthData] = useState<AuthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        
        async function fetchAuth() {
            try {
                const res = await fetchApi("/authorization/me");
                if (res.ok) {
                    const data = await res.json();
                    if (mounted) {
                        setAuthData(data);
                        setLoading(false);
                    }
                } else {
                    if (mounted) {
                        setAuthData(null);
                        setLoading(false);
                        if (requireAuth) {
                            window.location.href = "/login";
                        }
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError("Network Error");
                    setLoading(false);
                }
            }
        }

        fetchAuth();

        return () => {
            mounted = false;
        };
    }, [requireAuth]);

    return { authData, loading, error };
}
