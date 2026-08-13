export const API_URL = "/api";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}${endpoint}`;
    const defaultOptions: RequestInit = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        credentials: "include", // Ensures cookies/session tokens are sent to backend
    };

    return fetch(url, defaultOptions);
}
