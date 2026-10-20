# EduBridge Platform

**EduBridge** is an enterprise-grade education monitoring, information management, interactive learning, and decision-support platform designed for the Ethiopian national educational ecosystem across multiple administrative tiers: **Federal, Regional, Zonal, Woreda, and School**.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, Better-Auth (Authentication), Custom Scope-Based RBAC (Authorization)
- **Database & ORM**: PostgreSQL 15, Prisma ORM
- **Real-Time Communication**: Socket.IO (WebSockets with automatic polling fallback)
- **Object Storage**: MinIO S3-compatible document storage
- **Containerization**: Docker Compose

---

## ⚡ Quick Start (Local Development)

### 1. First-time Setup
Run the setup script once after cloning to automatically generate database secrets and configuration:

```bash
bash setup.sh
```

### 2. Start Services with Docker Compose
```bash
docker compose up -d
```

### 3. Access Services
- **Web Application**: [http://localhost:3001](http://localhost:3001)
- **Backend REST & WebSocket API**: [http://localhost:5001](http://localhost:5001) (and `http://localhost:5000`)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001) (API on port `9000`)
- **PostgreSQL Database**: `localhost:5434`

---

## 📢 Team Members: Updating After Pulling Changes

When pulling new updates that include the **WebSocket real-time communication engine**:

```bash
# Rebuild Docker volumes with updated dependencies (socket.io and socket.io-client)
docker compose up --build -d
```

*Or, if running without Docker:*
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## 📚 Developer Documentation

| Document | Purpose |
| :--- | :--- |
| **[ONBOARDING.md](file:///home/sosi/Edubridge/ONBOARDING.md)** | Developer onboarding guide, database seeding, credentials, and feature rules |
| **[Real-Time Communication Guide](file:///home/sosi/Edubridge/docs/06-realtime-communication.md)** | Socket.IO gateway, frontend hooks, event reference, and Nginx proxy guide |
| **[Local Setup Details](file:///home/sosi/Edubridge/docs/01-local-setup.md)** | Manual local environment configuration |
| **[Architecture & Workflow](file:///home/sosi/Edubridge/docs/02-architecture-and-workflow.md)** | System topology and multi-tier organizational scoping |
| **[Actor Provisioning](file:///home/sosi/Edubridge/docs/03-actor-provisioning.md)** | User roles, scopes, and test identities |
