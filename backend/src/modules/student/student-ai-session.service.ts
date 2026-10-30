import fs from "fs/promises";
import path from "path";

export interface AiChatMessage {
    id: string;
    role: "user" | "assistant";
    text: string;
    timestamp: string;
    file?: {
        name: string;
        size: number;
        mimeType: string;
        data?: string;
    };
    resource?: {
        id: string;
        title: string;
        category: "teacher" | "school" | "recommended";
        description?: string;
        source?: string;
        recommendationNote?: string;
    };
    suggestedFollowUps?: string[];
}

export interface AiChatSession {
    id: string;
    title: string;
    subject: string;
    createdAt: string;
    updatedAt: string;
    messages: AiChatMessage[];
    summary?: string;
}

export interface PastSessionSummary {
    id: string;
    title: string;
    subject: string;
    date: string;
    summary: string;
}

const STORAGE_DIR = path.join(process.cwd(), "storage", "ai_sessions");

export class StudentAiSessionService {
    private static async getFilePath(userId: string): Promise<string> {
        if (!userId || typeof userId !== "string" || !userId.trim()) {
            throw new Error("Student authentication required for private AI session isolation.");
        }
        await fs.mkdir(STORAGE_DIR, { recursive: true });
        const safeUserId = userId.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
        return path.join(STORAGE_DIR, `${safeUserId}.json`);
    }

    /**
     * Retrieves all saved conversation sessions strictly for the requesting student.
     */
    static async getSessions(userId: string): Promise<AiChatSession[]> {
        if (!userId || typeof userId !== "string" || !userId.trim()) {
            return [];
        }
        try {
            const filePath = await this.getFilePath(userId);
            const data = await fs.readFile(filePath, "utf-8");
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            return [];
        } catch {
            return [];
        }
    }

    /**
     * Saves or updates a conversation session strictly for the requesting student.
     */
    static async saveSession(userId: string, session: AiChatSession): Promise<AiChatSession[]> {
        if (!userId || typeof userId !== "string" || !userId.trim()) {
            throw new Error("Student authentication required to save session.");
        }
        const filePath = await this.getFilePath(userId);
        const existing = await this.getSessions(userId);

        const index = existing.findIndex(s => s.id === session.id);
        const updatedSession = {
            ...session,
            updatedAt: new Date().toISOString()
        };

        if (index >= 0) {
            existing[index] = updatedSession;
        } else {
            existing.unshift(updatedSession);
        }

        // Keep up to 50 sessions
        const trimmed = existing.slice(0, 50);
        await fs.writeFile(filePath, JSON.stringify(trimmed, null, 2), "utf-8");
        return trimmed;
    }

    /**
     * Deletes a specific conversation session strictly for the requesting student.
     */
    static async deleteSession(userId: string, sessionId: string): Promise<AiChatSession[]> {
        if (!userId || typeof userId !== "string" || !userId.trim()) {
            throw new Error("Student authentication required to delete session.");
        }
        const filePath = await this.getFilePath(userId);
        const existing = await this.getSessions(userId);
        const filtered = existing.filter(s => s.id !== sessionId);
        await fs.writeFile(filePath, JSON.stringify(filtered, null, 2), "utf-8");
        return filtered;
    }

    /**
     * Generates a concise summary list of past conversations to inject into Gemini's prompt memory.
     */
    static async getPastSessionsMemory(userId: string, currentSessionId?: string): Promise<PastSessionSummary[]> {
        const sessions = await this.getSessions(userId);
        return sessions
            .filter(s => s.id !== currentSessionId && Array.isArray(s.messages) && s.messages.length > 1)
            .slice(0, 8)
            .map(s => {
                const userMessages = s.messages.filter(m => m.role === "user").map(m => m.text).slice(0, 3);
                const assistantHighlights = s.messages.filter(m => m.role === "assistant").map(m => m.text.slice(0, 100)).slice(0, 2);
                
                const summary = s.summary || [
                    `Topics asked: ${userMessages.join("; ")}`,
                    assistantHighlights.length > 0 ? `Key insights covered: ${assistantHighlights[0]}` : ""
                ].filter(Boolean).join(". ");

                return {
                    id: s.id,
                    title: s.title || "Academic Mentorship",
                    subject: s.subject || "General",
                    date: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "Recent",
                    summary: summary.slice(0, 250)
                };
            });
    }
}
