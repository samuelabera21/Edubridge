export const API_URL = "/api";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}${endpoint}`;
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const defaultOptions: RequestInit = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        credentials: "include",
        cache: "no-store", // Prevent Next.js from caching API responses
    };

    return fetch(url, defaultOptions);
}
