import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let registeredUserId: string | null = null;

export const getSocketUrl = (): string => {
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
        return process.env.NEXT_PUBLIC_SOCKET_URL;
    }
    if (typeof window !== "undefined") {
        const protocol = window.location.protocol === "https:" ? "https:" : "http:";
        return `${protocol}//${window.location.hostname}:5000`;
    }
    return "http://localhost:5000";
};

export function getSocket(userId?: string): Socket | null {
    if (typeof window === "undefined") return null;

    if (!socket) {
        const url = getSocketUrl();
        socket = io(url, {
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            transports: ["websocket", "polling"],
            auth: {
                userId: userId || undefined,
            },
        });

        socket.on("connect", () => {
            console.log("[Socket.IO] Connected to WebSocket gateway:", socket?.id);
            if (registeredUserId) {
                socket?.emit("authenticate", { userId: registeredUserId });
            }
        });

        socket.on("connect_error", (err) => {
            console.warn("[Socket.IO] Connection error (falling back to long-polling):", err.message);
        });

        socket.on("disconnect", (reason) => {
            console.log("[Socket.IO] Disconnected:", reason);
        });
    }

    if (userId && userId !== registeredUserId) {
        registeredUserId = userId;
        if (socket.connected) {
            socket.emit("authenticate", { userId });
        } else {
            socket.auth = { userId };
        }
    }

    return socket;
}

export function emitTyping(toUserId: string, isTyping: boolean) {
    if (socket?.connected && toUserId) {
        socket.emit("typing", { toUserId, isTyping });
    }
}

export function emitMarkRead(senderId: string) {
    if (socket?.connected && senderId) {
        socket.emit("mark_read", { senderId });
    }
}

export function emitSendMessage(
    receiverId: string,
    content: string,
    organizationId?: string,
    callback?: (res: { success: boolean; message?: any; error?: string }) => void
) {
    if (socket?.connected) {
        socket.emit("send_message", { receiverId, content, organizationId }, callback);
    } else if (callback) {
        callback({ success: false, error: "Socket not connected" });
    }
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        registeredUserId = null;
    }
}
