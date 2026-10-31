# 🎓 EduBridge — Multi-Level Education Management & Learning Platform

[![Live Application](https://img.shields.io/badge/Live_Demo-edubridge--olive.vercel.app-2563eb?style=for-the-badge&logo=vercel)](https://edubridge-olive.vercel.app)
[![Backend API](https://img.shields.io/badge/Backend_API-Render_Cloud-46E3B7?style=for-the-badge&logo=render)](https://edubridge-olive.vercel.app)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_(Supabase)-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Next.js 16](https://img.shields.io/badge/Frontend-Next.js_16_Turbopack-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Express v5](https://img.shields.io/badge/Backend-Express_v5_TypeScript-007acc?style=for-the-badge&logo=typescript)](https://expressjs.com)

> **EduBridge** is an enterprise-grade, school-centered education management and hierarchical governance platform designed for the Ethiopian national educational ecosystem. It digitizes daily school operations — from period attendance and batch mark-sheet verification to curriculum distribution and AI study tutoring — while enabling automated bottom-up data aggregation and top-down policy dissemination across **Federal, Regional, Zone, Woreda, and School** administrative tiers.

---

## 🚀 Live Evaluation & Instant Demo Access

Evaluators and mentors can test the live application directly in the browser:

🔗 **Live Application URL**: [https://edubridge-olive.vercel.app](https://edubridge-olive.vercel.app)  
🔐 **GitHub Collaborator Access**: Granted to `@eyobed101`

### 🔑 Master Seeded Credential (Always Active)

To ensure strict institutional authority and territorial data isolation, EduBridge uses a single pre-seeded apex administrator. All lower-tier offices, schools, and users are provisioned hierarchically:

| Role / Tier | Master Email Address | Password | Jurisdiction & Scope |
| :--- | :--- | :--- | :--- |
| **Federal System Administrator** | `federal.admin@edubridge.gov.et` | `Federal@2026!` | **Apex National Governance**: National EMIS Dashboard, Regional drill-downs, National Directives, and Canva-style EMIS AI Analytics. |

---

## 🏛️ How the System Works: Top-Down Provisioning Walkthrough

EduBridge is engineered around **sovereign institutional hierarchy and role-based authority**. To experience the complete end-to-end platform, follow this modern operational walkthrough:

```
[ Federal Admin ] ──(Creates & Invites)──> [ Regional Admin ]
                                                    │
                                                    ▼ (Creates & Invites)
                                           [ Zonal Admin ]
                                                    │
                                                    ▼ (Creates & Invites)
                                           [ Woreda Admin ]
                                                    │
                                                    ▼ (Creates School & Principal)
                                           [ School Administrator ]
                                                    │
                         ┌──────────────────────────┼──────────────────────────┐
                         ▼                          ▼                          ▼
                   [ Teachers ]                [ Students ]                [ Parents ]
               (Attendance & Marks)      (AI Tutor & Timetable)      (Progress & Alerts)
```

---

### Step 1: Log In as the Federal Administrator
1. Go to the login page: [https://edubridge-olive.vercel.app/login](https://edubridge-olive.vercel.app/login)
2. Enter the official seed credentials:
   * **Email**: `federal.admin@edubridge.gov.et`
   * **Password**: `Federal@2026!`
3. You will arrive at the **National Federal Dashboard** (`/dashboard/federal`), where you can:
   * Monitor national metrics across all regions, zones, woredas, schools, students, and teachers.
   * Test the **EMIS AI Analytics Assistant** by clicking the blue circular `?` button in the bottom-right corner (try asking: *"What is our overall institutional structure?"*).
   * Issue national directives with real-time acknowledgment tracking.

---

### Step 2: Provision Regional, Zonal & Woreda Hierarchy
From the Federal Dashboard:
1. Click **"+ Add Region"** to create a Regional Education Bureau (e.g., *Addis Ababa, Oromia, Amhara, Sidama*).
2. Click **"Assign Admin"** to invite the Regional Administrator with their official email and temporary credentials.
3. **Drill Down or Log In as Regional Admin**:
   * Regional Administrators create **Zones** and assign Zonal Admins.
   * Zonal Administrators create **Woredas** and assign Woreda Admins.
   * Woreda Administrators create **Schools** in their territory and provision the **School Administrator / Principal**.
   *(Note: As the Federal Admin, you can also use the interactive **Territorial Drill-Down** to inspect any existing Region, Zone, Woreda, or School already registered in the system!)*

---

### Step 3: School Operational Setup (Principal / School Admin)
When a School Administrator logs into their school portal:
1. **Academic Configuration**: Set up the current **Academic Year**, active **Grades**, classroom **Sections** (e.g. Grade 9A, 10B), and **Subject Catalogs**.
2. **Instructional Timetable**: Create periods and allocate teachers to avoid schedule conflicts.

---

### Step 4: Provision Teachers, Students & Parents
Inside the School Portal, navigate to **Users & Permissions** (`/dashboard/users-permissions`):
* 👨‍🏫 **Register Teachers**:
  * Create teacher accounts and assign them to specific subjects, grades, and sections.
  * Teachers can immediately log in to record classroom attendance, upload curriculum resources, and submit mark sheets.
* 🎒 **Register & Enroll Students**:
  * Register new student profiles with auto-generated student IDs.
  * Enroll students into active sections.
  * Students can immediately log in to access their **Results Hub**, **Live Timetable**, and the **EduBridge AI Study Tutor**.
* 👨‍👩‍👧 **Link Parents / Guardians**:
  * Create parent accounts and link them to their enrolled children for attendance tracking and teacher messaging.

---

### Step 5: Test the Actor Portals

Once created by the School Administrator:

#### 1. 👨‍🏫 Teacher Portal Experience (`/dashboard/teacher`)
* View today's teaching schedule and assigned classes.
* Record period-level student attendance with absence categorization.
* Upload lesson notes, PDFs, and video links to the **Curriculum Hub**.
* Enter assessment mark sheets and submit batches for administrative verification.

#### 2. 🎒 Student Portal & AI Tutor (`/dashboard/student`)
* Check daily class schedules and attendance summaries.
* Open the **Results Hub** to view continuous assessment grades and class standing.
* Launch the **EduBridge AI Study Assistant** (`/dashboard/student/assistant` or the floating `?` button):
  * 💡 **Concept Explainer**: Request step-by-step breakdowns of complex subjects.
  * 📝 **Practice Quiz Generator**: Take dynamically generated multiple-choice quizzes (Easy, Medium, Hard).
  * 🤖 **AI Tutor Chat**: Ask homework questions with conversation history.
  * 📅 **Weekly Study Planner**: Generate structured revision timetables.

#### 3. 👨‍👩‍👧 Parent Portal (`/dashboard/parent`)
* Switch between children to review attendance percentages and report cards.
* Directly message subject teachers and schedule conferences.

---

## 🧠 Dual-Tier AI Quota & Security Architecture

EduBridge implements an isolated **dual-key architecture** to protect executive decision-making:

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

1. **EMIS Governance AI**: Uses `GEMINI_API_KEY` with a **20-minute in-memory cache** and a **3-second PostgreSQL statement timeout guardrail** to protect live database performance.
2. **Student AI Tutor**: Uses a dedicated `STUDENT_GEMINI_API_KEY` (with automatic fallback) so high-frequency student learning traffic **never exhausts the quota** of regional directors and school leaders.
3. **Strict Scope Isolation**: Cross-scope queries and non-student role requests are automatically refused at the middleware level with `403 Forbidden` / `401 Unauthorized`.

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

#### Backend (`backend/.env`):
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

#### Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL="http://localhost:5000"
```

### 3. Install Dependencies & Seed Master Account
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

Visit **`http://localhost:3000`** in your browser and sign in using the Master Federal Administrator credentials.

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
