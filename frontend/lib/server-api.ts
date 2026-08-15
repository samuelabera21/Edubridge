import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const API_BASE = `${BACKEND_URL}/api`;

export async function fetchServerApi(endpoint: string, options: RequestInit = {}) {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ');

    const url = `${API_BASE}${endpoint}`;
    
    const defaultOptions: RequestInit = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Cookie": cookieString,
            ...options.headers,
        },
    };

    const res = await fetch(url, defaultOptions);
    
    return res;
}
