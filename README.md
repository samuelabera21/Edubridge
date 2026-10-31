# 🎓 EduBridge — Multi-Level Education Management & Learning Platform

[![Live Application](https://img.shields.io/badge/Live_Demo-edubridge--online.vercel.app-2563eb?style=for-the-badge&logo=vercel)](https://edubridge-online.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend_API-Render_Cloud-46E3B7?style=for-the-badge&logo=render)](https://edubridge-online.vercel.app)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_(Supabase)-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js_16_Turbopack-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Express v5](https://img.shields.io/badge/Backend-Express_v5_TypeScript-007acc?style=for-the-badge&logo=typescript)](https://expressjs.com)

> **EduBridge** is a comprehensive, school-centered education management and hierarchical governance platform designed for the Ethiopian education ecosystem. It digitizes daily school operations — from attendance and batch grade verification to curriculum material delivery and AI study tutoring — while enabling automated bottom-up data aggregation and top-down policy dissemination across **Federal, Regional, Zone, Woreda, and School** administrative tiers.

---

## 🚀 Live Evaluation & Instant Demo Access

Evaluators and mentors can test the live application directly in the browser without local setup:

🔗 **Live Application URL**: [https://edubridge-online.vercel.app](https://edubridge-online.vercel.app)  
🔐 **GitHub Collaborator Access**: Granted to `@eyobed101`

### 🔑 Pre-Seeded Test Credentials

Use these verified accounts to evaluate different roles and administrative tiers:

| Role / Tier | Email Address | Password | Accessible Portals & Features |
| :--- | :--- | :--- | :--- |
| **Federal System Administrator** | `federal.admin@edubridge.gov.et` | `Federal@2026!` | **Full National Scope**: National EMIS Dashboard, Regional drill-downs, National Directives, EMIS AI Analytics. |
| **School Administrator / Principal** | `school.admin@edubridge.local` | `AdminPass123!` | **School-Wide Scope**: School setup, academic years, student admission & placement, staff allocation, timetable, grade batch approval. |
| **Teaching Faculty** | `tch.2026.0013@edubridge.local` | `EduBridge2026!` | **Classroom Scope**: My classes, daily student attendance, mark sheets & grade submission, Curriculum Hub file uploads. |
| **Enrolled Student** | `student@edubridge.local` | `EduBridge2026!` | **Student Portal**: Today's classes, Results Hub, timetable, and the interactive **EduBridge AI Study Tutor & Quiz Generator**. |

> 💡 **Quick Tip for Evaluators**: Log in with the **Federal Admin** account first to explore the national governance hierarchy and the Canva-style EMIS AI Assistant (`?` button at the bottom-right). Then log in as a **Student** to experience the AI Study Tutor and interactive practice quizzes!

---

## 🏛️ System Architecture & Multi-Tier Hierarchy

EduBridge mirrors the official Ethiopian education administrative governance structure:

```
                  ┌──────────────────────────────────────────────┐
                  │        FEDERAL MINISTRY OF EDUCATION         │
                  │   National Directives, Programs & EMIS AI    │
                  └──────────────────────┬───────────────────────┘
                                         │  Top-Down Policies
                                         ▼  Bottom-Up Aggregations
                  ┌──────────────────────────────────────────────┐
                  │          REGIONAL EDUCATION BUREAU           │
                  │       Regional Audits & Zone Monitoring      │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │           ZONE EDUCATION DEPARTMENT          │
                  │       Woreda Supervisions & Inspections      │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            WOREDA EDUCATION OFFICE           │
                  │     School Operational Oversight & Surveys   │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │              SCHOOL ENVIRONMENT              │
                  │ (Primary Source-of-Truth Operational Domain) │
                  └──────┬───────────────┼───────────────┬───────┘
                         ▼               ▼               ▼
                   [Principal]    [Vice Principal]  [Teachers]
                         │               │               │
                         └───────────────┼───────────────┘
                                         ▼
                             [ Students & Parents ]
```

---

## 🌟 Key Features by Portal

### 1. 🏛️ National & Regional Governance Dashboards (`/dashboard/federal`, `/region`, `/zone`, `/woreda`)
* **Territorial Drill-Down**: Interactive geographic navigation from the national overview down to individual schools, sections, and subjects.
* **EMIS AI Analytics**: Natural-language data intelligence for education leaders — ask plain-English questions (*"Which schools have the lowest attendance this month?"*) and receive structured, synthesized answers.
* **National Directives Engine**: Distribute policies and instructions with real-time acknowledgment receipts across lower administrative levels.

### 2. 🏫 School Leadership (`/dashboard/admin` & `/dashboard/vice-principal`)
* **School Principal**: Full institutional setup, academic calendars, student registration, bulk classroom placement, teacher assignments, and school improvement plans.
* **Vice Principal / Academic Leader**: Academic organization management, instructional staffing oversight, teacher workload balance, and attendance/assessment anomaly detection.

### 3. 👨‍🏫 Teaching Faculty Portal (`/dashboard/teacher`)
* **Classroom Command Center**: Daily timetable schedule, active rosters, and subject assignments.
* **Attendance Register**: Period-level attendance recording with student-initiated correction request workflows.
* **Grade Submission & Mark Sheets**: Enter marks with instant validation, average calculation, and administrative sign-off before publishing.
* **Curriculum Hub**: Upload syllabi, PDFs, PowerPoint slides, and tutorial video links directly to assigned classes.

### 4. 🎒 Student Portal & AI Study Tutor (`/dashboard/student`)
* **Results Hub**: Detailed breakdown of continuous assessment scores, semester grades, and class standings.
* **Daily Timetable & Attendance**: Live class schedule and absence tracking.
* **EduBridge AI Study Assistant**:
  * 💡 **Concept Explainer**: Breaks down complex topics with intuition, worked examples, and mental hooks.
  * 📝 **Practice Quiz Generator**: Generates dynamic curriculum-aligned multiple-choice questions (Easy, Medium, Hard).
  * 🤖 **Conversational AI Tutor**: Multi-turn chat assistant with session history and follow-up suggestion chips.
  * 📅 **Personalized Study Planner**: Generates weekly revision routines customized to student availability.

### 5. 👨‍👩‍👧 Parent & Guardian Portal (`/dashboard/parent`)
* **Multi-Child Dashboard**: Switch between enrolled siblings to review attendance percentages and report cards.
* **Direct Communication**: Secure messaging with subject teachers and parent-teacher meeting scheduling.

---

## 🧠 Dual-Tier AI Quota & Security Architecture

EduBridge implements a **dual-key isolation architecture** to protect executive decision-making:

```
                              ┌────────────────────────────────────────┐
                              │            GOOGLE GEMINI AI            │
                              └───────┬────────────────────────┬───────┘
                                      │                        │
               GEMINI_API_KEY         │                        │  STUDENT_GEMINI_API_KEY
            (Executive Analytics)     │                        │  (Interactive Learning)
                                      ▼                        ▼
                       ┌─────────────────────────┐  ┌─────────────────────────┐
                       │    EMIS Analytics AI    │  │  Student AI Study Tutor │
                       │ (Federal & Principals)  │  │   (Quizzes & Roadmaps)  │
                       └─────────────────────────┘  └─────────────────────────┘
```

1. **EMIS Governance AI**: Uses `GEMINI_API_KEY` with a **20-minute in-memory cache** and a **3-second PostgreSQL statement timeout guardrail** to prevent slow queries from locking the database.
2. **Student AI Tutor**: Uses a dedicated `STUDENT_GEMINI_API_KEY` (with graceful fallback) so high-frequency student learning traffic **never exhausts the quota** of regional directors and school principals.
3. **Strict Scope Refusal**: Administrative SQL generation automatically refuses out-of-scope inquiries at the API middleware level.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend UI** | **Next.js 16.3 (Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, **Lucide Icons** |
| **Backend API** | **Node.js**, **Express v5**, **TypeScript (Strict Mode)**, **Prisma ORM 7.9** |
| **Authentication & RBAC** | **Better Auth 1.6**, Scope-Bound Middleware (`requireScope`, `requirePermission`) |
| **Persistent Database** | **PostgreSQL** hosted on **Supabase** |
| **Artificial Intelligence** | **Google GenAI SDK** (`@google/genai`) powering Gemini models |
| **Real-time Engine** | **Socket.IO 4.8** with fallback polling |
| **Storage & Email** | **MinIO S3** (Local) / **Cloudflare R2** (Prod), **Nodemailer**, **Resend API** |
| **Deployment / CI/CD** | **Vercel** (Frontend Edge CDN) + **Render** (Node.js API Web Service) |

---

## 💻 Local Installation & Setup Guide

### Prerequisites
* **Node.js**: v20.x or higher
* **npm** or **pnpm**
* **PostgreSQL** (local or hosted instance)
* **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/samuelabera21/Edubridge.git
cd Edubridge
```

### 2. Configure Environment Variables

#### Backend Configuration:
Create `backend/.env` (or copy from `backend/.env.example`):
```env
# Database Connection (Supabase or local PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/edubridge?schema=public"

# Better Auth Secret
BETTER_AUTH_SECRET="your-32-char-random-secret"
BETTER_AUTH_URL="http://localhost:5000"

# Frontend URL (CORS)
FRONTEND_URL="http://localhost:3000"

# Google Gemini API Keys
GEMINI_API_KEY="your-gemini-api-key"
STUDENT_GEMINI_API_KEY="your-student-gemini-key"

# Default Credentials
DEFAULT_INITIAL_PASSWORD="Admin@1234"
```

#### Frontend Configuration:
Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

### 3. Install Dependencies & Seed Database
```bash
# Backend setup
cd backend
npm install
npx prisma db push
npx prisma db seed

# Frontend setup
cd ../frontend
npm install
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend API (runs on port 5000)
cd backend
npm run dev

# Terminal 2: Frontend Next.js (runs on port 3000)
cd frontend
npm run dev
```

Visit **`http://localhost:3000`** in your browser and log in with the seed credentials above.

---

## 👥 Project Contributors

This project was engineered and submitted as part of the **INSA Software Development Training Capstone Program**:

* **Samuel Abera** — Lead Architecture, Backend Engineering, Governance & RBAC System ([@samuelabera21](https://github.com/samuelabera21))
* **Yohanes Birhane** — Full-Stack Development, Teacher & Admin Workflows, UI Components ([@YohannisBirhane](https://github.com/YohannisBirhane))
* **Sosina Yeshidnber** — Student Portal, EduBridge AI Study Assistant, Results Hub ([@sosina19](https://github.com/sosina19))

**Project Evaluator / Mentor**: **`eyobed101`** *(Collaborator access confirmed)*

---

## 📄 License
This project is developed for educational, institutional, and capstone evaluation purposes under the **ISC License**.
