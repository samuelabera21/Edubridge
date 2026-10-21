import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { prisma } from "../prisma/client.js";

let io: SocketIOServer | null = null;
const onlineUsers = new Map<string, number>(); // userId -> active connection count

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://localhost:5173",
                "http://localhost:5001",
            ],
            credentials: true,
        },
        pingTimeout: 30000,
        pingInterval: 10000,
    });

    io.on("connection", (socket: Socket) => {
        let currentUserId: string | null = (socket.handshake.auth?.userId as string) || null;

        const registerUser = (userId: string) => {
            if (!userId) return;
            currentUserId = userId;
            socket.data.userId = userId;

            // Join personal user room
            socket.join(`user:${userId}`);

            // Track online presence
            const count = onlineUsers.get(userId) || 0;
            onlineUsers.set(userId, count + 1);

            if (count === 0) {
                // Broadcast that user is now online
                socket.broadcast.emit("user_presence", { userId, status: "online" });
            }

            // Send list of currently online users to the connecting client
            socket.emit("online_users_list", Array.from(onlineUsers.keys()));
        };

        if (currentUserId) {
            registerUser(currentUserId);
        }

        // Explicit join / authentication event
        socket.on("authenticate", (data: { userId: string }) => {
            if (data?.userId) {
                registerUser(data.userId);
            }
        });

        // Query online status
        socket.on("get_online_status", (userIds: string[], callback?: (statuses: Record<string, boolean>) => void) => {
            const result: Record<string, boolean> = {};
            if (Array.isArray(userIds)) {
                userIds.forEach((id) => {
                    result[id] = (onlineUsers.get(id) || 0) > 0;
                });
            }
            if (callback) callback(result);
            else socket.emit("online_status_response", result);
        });

        // Real-time typing indicators
        socket.on("typing", (data: { toUserId: string; isTyping: boolean }) => {
            if (!currentUserId || !data?.toUserId) return;
            io?.to(`user:${data.toUserId}`).emit("typing_status", {
                fromUserId: currentUserId,
                isTyping: Boolean(data.isTyping),
            });
        });

        // Real-time mark-as-read
        socket.on("mark_read", async (data: { senderId: string }) => {
            if (!currentUserId || !data?.senderId) return;
            try {
                await prisma.message.updateMany({
                    where: {
                        senderId: data.senderId,
                        receiverId: currentUserId,
                        isRead: false,
                    },
                    data: { isRead: true },
                });

                // Notify sender that their messages were read
                io?.to(`user:${data.senderId}`).emit("messages_read", {
                    byUserId: currentUserId,
                });
            } catch (err) {
                console.warn("[Socket] mark_read error:", err);
            }
        });

        // Real-time direct message sending over socket
        socket.on("send_message", async (data: {
            receiverId: string;
            content: string;
            organizationId?: string;
        }, callback?: (response: { success: boolean; message?: unknown; error?: string }) => void) => {
            if (!currentUserId) {
                if (callback) callback({ success: false, error: "Unauthorized socket" });
                return;
            }
            if (!data?.receiverId || !data?.content?.trim()) {
                if (callback) callback({ success: false, error: "Invalid receiver or content" });
                return;
            }

            try {
                // Find organizationId if not provided
                let orgId = data.organizationId;
                if (!orgId) {
                    const student = await prisma.student.findFirst({
                        where: { userId: currentUserId },
                        select: { enrollments: { select: { organizationId: true }, take: 1 } },
                    });
                    const teacher = await prisma.teacher.findFirst({
                        where: { userId: currentUserId },
                        select: { organizationId: true },
                    });
                    orgId = student?.enrollments?.[0]?.organizationId || teacher?.organizationId;
                }

                if (!orgId) {
                    if (callback) callback({ success: false, error: "No organization associated with user" });
                    return;
                }

                const created = await prisma.message.create({
                    data: {
                        organizationId: orgId,
                        senderId: currentUserId,
                        receiverId: data.receiverId,
                        content: data.content.trim(),
                    },
                    include: {
                        sender: { select: { id: true, name: true, email: true } },
                        receiver: { select: { id: true, name: true, email: true } },
                    },
                });

                // Instantly dispatch to both recipient and sender rooms
                io?.to(`user:${data.receiverId}`).emit("new_message", created);
                io?.to(`user:${currentUserId}`).emit("new_message", created);

                if (callback) callback({ success: true, message: created });
            } catch (err) {
                console.error("[Socket] send_message error:", err);
                if (callback) callback({ success: false, error: "Failed to send message" });
            }
        });

        socket.on("disconnect", () => {
            if (currentUserId) {
                const count = onlineUsers.get(currentUserId) || 1;
                if (count <= 1) {
                    onlineUsers.delete(currentUserId);
                    socket.broadcast.emit("user_presence", { userId: currentUserId, status: "offline" });
                } else {
                    onlineUsers.set(currentUserId, count - 1);
                }
            }
        });
    });

    console.log("[Socket.IO] WebSocket gateway initialized successfully.");
    return io;
}

export function getIO(): SocketIOServer | null {
    return io;
}

export function emitNewMessageToUsers(message: {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    isRead: boolean;
    createdAt: Date | string;
    sender?: { id: string; name: string };
    receiver?: { id: string; name: string };
}) {
    if (!io) return;
    io.to(`user:${message.receiverId}`).emit("new_message", message);
    io.to(`user:${message.senderId}`).emit("new_message", message);
}

export function emitNewAnnouncement(announcement: unknown, targetOrganizationId?: string) {
    if (!io) return;
    if (targetOrganizationId) {
        io.to(`org:${targetOrganizationId}`).emit("new_announcement", announcement);
    } else {
        io.emit("new_announcement", announcement);
    }
}
