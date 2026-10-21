# EduBridge Real-Time WebSocket Communication Guide

This guide explains how the real-time communication system works across the EduBridge platform, what team members need to do after pulling changes, and how developers can utilize the WebSocket gateway for new features.

---

## 1. What Team Members Need to Do After Pulling

When you pull the latest changes containing the WebSocket gateway, your local environment must update its dependencies.

### If running with Docker Compose (Recommended)
Because Docker volumes cache `node_modules`, rebuild and restart the containers:

```bash
# Rebuild containers with new dependencies (socket.io and socket.io-client)
docker compose up --build -d
```

*Or, if your containers are already running and you do not want to restart Docker:*
```bash
docker exec edubridge-backend-1 npm install socket.io
docker exec edubridge_frontend npm install socket.io-client
```

### If running locally (Node.js without Docker)
```bash
# Backend dependencies
cd backend && npm install

# Frontend dependencies
cd ../frontend && npm install
```

---

## 2. Environment Variables & Networking

- **Default Port**: The backend runs the WebSocket server on port `5000` (mapped to `5001` externally in docker-compose).
- **Auto-Discovery**: By default, the frontend automatically discovers the WebSocket gateway URL based on `window.location.hostname:5000`.
- **Custom URL (Optional)**: If you run the frontend against a remote server or custom port, add the following to `frontend/.env.local`:
  ```env
  NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
  ```

---

## 3. Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              Browser Clients                 │
                      │  (Student Portal / Teacher / Parent / Admin) │
                      └─────────────┬──────────────────▲─────────────┘
                                    │                  │
                1. WebSocket Events │                  │ 4. Instant Event Push
             (send_message, typing, │                  │ (new_message, typing_status,
                        mark_read)  │                  │  messages_read, presence)
                                    ▼                  │
                      ┌────────────────────────────────┴─────────────┐
                      │          Backend WebSocket Gateway           │
                      │     (Node.js HTTP Server + Socket.IO)        │
                      └─────────────┬──────────────────▲─────────────┘
                                    │                  │
                         2. Persist │                  │ 3. REST Services
                                    ▼                  │ (emitNewMessageToUsers,
                      ┌────────────────────────────────┴─────────────┐
                      │              Prisma ORM & PostgreSQL         │
                      └──────────────────────────────────────────────┘
```

- **Protocol**: WebSockets (with automatic long-polling fallback via `Socket.IO`).
- **User Isolation**: Every connected user automatically joins a private room: `user:<userId>`.
- **Dual-Delivery Guarantee**: Messages sent via the REST API (`POST /api/communication/messages` or `POST /api/student/communication/messages`) **also** trigger socket events, ensuring all clients stay synchronized regardless of whether they used REST or WebSockets to send.

---

## 4. Frontend Developer Guide

Use the helper library in [`frontend/lib/socket.ts`](file:///home/sosi/Edubridge/frontend/lib/socket.ts).

### 4.1 Connecting & Listening for Messages
```typescript
import { useEffect, useState } from "react";
import { getSocket, emitTyping, emitMarkRead } from "@/lib/socket";

export function ChatComponent({ currentUserId, recipientUserId }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    const socket = getSocket(currentUserId);
    if (!socket) return;

    // 1. Listen for new incoming messages
    const handleNewMessage = (msg) => {
      if (
        (msg.senderId === recipientUserId && msg.receiverId === currentUserId) ||
        (msg.senderId === currentUserId && msg.receiverId === recipientUserId)
      ) {
        setMessages((prev) => [...prev, msg]);
        // Automatically mark as read if conversation is open
        if (msg.senderId === recipientUserId) {
          emitMarkRead(recipientUserId);
        }
      }
    };

    // 2. Listen for typing indicators
    const handleTyping = ({ fromUserId, isTyping }) => {
      if (fromUserId === recipientUserId) {
        setIsTyping(Boolean(isTyping));
      }
    };

    // 3. Listen for read receipts (✓✓ Read)
    const handleRead = ({ byUserId }) => {
      if (byUserId === recipientUserId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === currentUserId ? { ...m, isRead: true } : m))
        );
      }
    };

    // 4. Track online presence
    const handlePresence = ({ userId, status }) => {
      if (userId === recipientUserId) {
        setIsOnline(status === "online");
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("typing_status", handleTyping);
    socket.on("messages_read", handleRead);
    socket.on("user_presence", handlePresence);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("typing_status", handleTyping);
      socket.off("messages_read", handleRead);
      socket.off("user_presence", handlePresence);
    };
  }, [currentUserId, recipientUserId]);

  // 5. Broadcast typing when user types
  const handleInputChange = (text) => {
    emitTyping(recipientUserId, true);
    // Debounce to stop typing indicator after 1.5 seconds
  };
}
```

### 4.2 Available Client Socket Events

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `authenticate` | Client ➔ Server | `{ userId: string }` | Registers user identity and joins `user:<userId>` room. |
| `send_message` | Client ➔ Server | `{ receiverId, content, organizationId? }` | Directly sends a message, saves to PostgreSQL, and notifies recipient. |
| `typing` | Client ➔ Server | `{ toUserId: string, isTyping: boolean }` | Alerts the other user that someone is composing a message. |
| `mark_read` | Client ➔ Server | `{ senderId: string }` | Marks all unread messages from `senderId` as read. |
| `get_online_status` | Client ➔ Server | `string[]` (userIds), callback | Returns a boolean map of which users are currently online. |
| `new_message` | Server ➔ Client | `Message` object | Dispatched instantly when a new message arrives. |
| `typing_status` | Server ➔ Client | `{ fromUserId: string, isTyping: boolean }` | Indicates that `fromUserId` is typing. |
| `messages_read` | Server ➔ Client | `{ byUserId: string }` | Indicates that `byUserId` opened and read your messages. |
| `user_presence` | Server ➔ Client | `{ userId: string, status: "online" \| "offline" }` | Emitted when a user connects or disconnects. |
| `new_announcement` | Server ➔ Client | `Announcement` object | Dispatched when a new school-wide or section bulletin is posted. |

---

## 5. Backend Developer Guide

To broadcast real-time events from any controller, service, or background job, import the helper functions from [`backend/src/infrastructure/socket/socket.service.ts`](file:///home/sosi/Edubridge/backend/src/infrastructure/socket/socket.service.ts):

```typescript
import {
  emitNewMessageToUsers,
  emitNewAnnouncement,
  getIO
} from "../../infrastructure/socket/socket.service.js";

// Example 1: Dispatched after saving a message to database
emitNewMessageToUsers(createdMessage);

// Example 2: Dispatched after creating an announcement
emitNewAnnouncement(announcement, organizationId);

// Example 3: Send a custom real-time notification to a specific user
getIO()?.to(`user:${targetUserId}`).emit("notification", {
  title: "Assignment Graded",
  score: 95
});
```

---

## 6. Production & Reverse Proxy Deployment (DevOps / Nginx)

When deploying behind an Nginx reverse proxy or cloud load balancer (e.g. AWS ALB, Cloudflare), WebSocket upgrade headers **must** be enabled:

```nginx
# Nginx Configuration
location /socket.io/ {
    proxy_pass http://backend:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

> **Note on Horizontal Scaling:** If multiple backend containers are deployed behind a load balancer, install `@socket.io/redis-adapter` and connect Socket.IO to Redis so socket rooms are shared across instances. Single-instance setups do not require Redis.
