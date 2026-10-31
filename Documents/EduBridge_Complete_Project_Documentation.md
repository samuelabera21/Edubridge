# EduBridge: Multi-Level Education Management & Learning Platform
**Comprehensive Project Documentation & Technical Report**  
*Compliant with IEEE 29148 / 830 Standards & Submission Guidelines*

---

## Document Control & Submission Information

| Parameter | Details |
| :--- | :--- |
| **Project Title** | **EduBridge**: A Multi-Level Education Management & Learning Platform |
| **Course / Program** | Software Development Training — Capstone Project |
| **Team Members** | 1. **Samuel Abera**<br>2. **Yohanes Birhane**<br>3. **Sosina Yeshidnber** |
| **Source Code Repository** | [GitHub: samuelabera21/Edubridge](https://github.com/samuelabera21/Edubridge) *(Collaborator Access Granted to `eyobed101`)* |
| **Live Frontend URL** | Deployed on **Vercel** *(Integrated with Next.js Edge CDN)* |
| **Live Backend API URL** | Deployed on **Render** *(Node.js / Express Web Service)* |
| **Database Instance** | Managed PostgreSQL on **Supabase** |
| **Version & Date** | Version 1.0 — October 2026 |

---

## 1. Executive Summary & Project Objectives

### 1.1 Project Purpose & Background
In multi-tiered education systems such as Ethiopia's, administrative and operational responsibilities are structured across several tiers: **Federal Ministry &rarr; Regional Education Bureau &rarr; Zone Education Department &rarr; Woreda Education Office &rarr; Individual Schools**. 

Historically, education information systems suffer from deep architectural fragmentation:
* Schools operate using isolated paper records or disconnected spreadsheets.
* Higher authorities rely on periodic, manual reporting pipelines that introduce delays, transcription errors, and missing data.
* School leaders lack real-time visibility into student attendance, teacher workload, and academic risks.
* Students and parents have limited visibility into daily schedules, learning materials, and academic progression.

**EduBridge** is engineered as a unified, school-centered operational platform and hierarchical governance system. Its core governing philosophy is:
> *Authoritative educational data should emerge naturally from routine daily school operations (attendance, assessments, teaching allocations) rather than burdening educators with redundant reporting duties.*

### 1.2 General Objective
To design, implement, and deploy a secure, multi-level digital platform connecting classrooms, school administrative leadership, and education governance bodies into an integrated ecosystem with automated bottom-up data aggregation, top-down policy dissemination, and isolated artificial intelligence support.

### 1.3 Specific Objectives
1. **School Operational Foundation**: Provide dedicated, role-tailored workspaces for School Principals, Vice Principals / Academic Leaders, Teachers, Students, and Parents.
2. **Hierarchical Governance Architecture**: Support multi-tier oversight across Federal, Regional, Zone, and Woreda levels with strict territorial data isolation.
3. **Rigorous Access Control**: Enforce Role-Based and Scope-Bound Access Control (RBAC) ensuring users only operate within their legitimate jurisdiction.
4. **Automated Teaching & Assessment Workflows**: Digitize timetable scheduling, daily attendance recording with correction workflows, batch grade submissions, and curriculum material distribution.
5. **Dual-Tier AI Capabilities**: 
   * **Administrative EMIS AI**: Natural-language data intelligence for education directors with 20-minute caching and 3-second statement timeouts.
   * **Student AI Study Assistant**: Curriculum-grounded concept explainers, interactive practice quizzes, multi-turn AI tutoring, and personal study planners.
6. **Quota-Protected Infrastructure**: Architect separate API key handling (`GEMINI_API_KEY` vs. `STUDENT_GEMINI_API_KEY`) to prevent high-volume student tutoring from throttling governance decision-making.

### 1.4 Scope & System Boundaries
* **In-Scope**: School profiling, academic years, grade and section configurations, student registration, enrollment, and classroom placement, teacher assignments, timetable generation, student & teacher attendance, marks entry and verification, curriculum document repositories, student support interventions, parent portal with multi-child linkage, internal direct messaging, national directives, and hierarchical reports.
* **Out-of-Scope**: Replacing national payroll/HR systems, national curriculum textbook authoring, and national high-stakes matriculation examination grading.

---

## 2. System Requirements Specification (SRS)

Following IEEE guidelines, requirements are partitioned into unambiguous functional capabilities and system-wide non-functional constraints.

### 2.1 Functional Requirements Matrix

| ID | Functional Area | Detailed Specification |
| :--- | :--- | :--- |
| **FR-01** | **Identity & Access** | Session-based authentication via Better Auth. Granular permissions evaluated against assigned roles and administrative scopes (`FEDERAL`, `REGION`, `ZONE`, `WOREDA`, `SCHOOL`). |
| **FR-02** | **School Structure** | Management of school profile, academic calendar, terms, grades, sections, subject catalogs, and room inventories. |
| **FR-03** | **Student Lifecycle** | Student registration, admission validation, enrollment batches, classroom section placement, profile management, and transfer workflows. |
| **FR-04** | **Instructional Staffing**| Teacher profiles, subject qualification mapping, grade-section teaching assignments, and workload balancing. |
| **FR-05** | **Attendance Tracking** | Period-level and daily attendance recording for students and staff. Student-initiated correction requests subject to teacher/admin approval. |
| **FR-06** | **Assessments & Grades** | Continuous assessment recordings, batch mark-sheet submission, grade verification, and administrative sign-off before publishing to results hubs. |
| **FR-07** | **Timetable Scheduling** | Automated conflict detection across teacher, section, room, and period allocations with published timetable views. |
| **FR-08** | **Curriculum Hub** | Teacher-uploaded digital resources, notes, and documents mapped to syllabus subjects with student access controls. |
| **FR-09** | **Academic Leadership** | Vice Principal oversight across teaching completion, staff allocation anomalies, attendance trends, and at-risk student monitoring. |
| **FR-10** | **Parent Engagement** | Multi-child dashboard, attendance summaries, published report cards, direct teacher messaging, and meeting requests. |
| **FR-11** | **Communication** | Direct multi-actor messaging, system notifications, school bulletins, and top-down hierarchical directives with acknowledgment receipts. |
| **FR-12** | **Governance Analytics** | Aggregated enrollment, attendance, and exam performance reporting across Federal, Regional, Zonal, and Woreda levels. |
| **FR-13** | **Administrative AI** | In-scope natural-language SQL query synthesis, executive summary generation, and institutional trend detection. |
| **FR-14** | **Student AI Tutor** | Conversational academic tutoring, step-by-step homework assistance, multi-difficulty quiz generation, and weekly study plan optimization. |

### 2.2 Non-Functional Requirements (NFRs)

```
                     ┌──────────────────────────────────────────────┐
                     │          NON-FUNCTIONAL REQUIREMENTS         │
                     └──────────────────────┬───────────────────────┘
          ┌─────────────────────┬───────────┴───────────┬─────────────────────┐
          ▼                     ▼                       ▼                     ▼
   [ Performance ]       [ Security & RBAC ]     [ Reliability & AI ]   [ Maintainability ]
  • API Latency < 2s    • Session Auth          • 3s DB Timeout Guard  • TypeScript Strict
  • 20-min AI Cache     • Scope Refusal 403     • Multi-Model Fallback • Modular Architecture
  • Next.js Prerender   • Encrypted Passwords   • Quota Isolation      • Automated CI/CD
```

1. **Security & Boundary Isolation**: 
   * Strict cross-scope refusal: A Woreda officer querying Regional data or a Student attempting administrative queries receives an immediate `403 Forbidden`.
   * Secure session tokens with automated expiration and HTTP-only cookie transport.
2. **Performance & Query Safety**:
   * API endpoints respond under 2 seconds under regular concurrency.
   * AI queries execute with a strict **3-second PostgreSQL statement timeout** to prevent complex join queries from degrading database performance.
   * Repeated administrative inquiries utilize an **in-memory 20-minute cache**.
3. **High Availability & Fault Tolerance**:
   * Google Gemini models employ dynamic multi-model fallback (`gemini-3.5-flash-lite` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-3.8-flash`).
   * Cloud hosting with automatic restart policies on Render and global edge caching on Vercel.

---

## 3. Technology Stack & Architectural Decisions

### 3.1 Technology Composition

| Layer | Technology | Version | Architectural Purpose |
| :--- | :--- | :--- | :--- |
| **Client Frontend** | Next.js (App Router) | `16.3.0` | React Server Components, Turbopack bundling, static page prerendering, and SEO optimization. |
| **UI Framework** | React / Tailwind CSS | `19.2.8` / `v4` | High-performance reactive rendering with utility-first responsive layout design. |
| **Icons & Media** | Lucide React | `1.31.0` | Accessible, consistent iconography across all actor portals. |
| **Application Server** | Node.js / Express | `v5.2.1` | REST API micro-routing, async pipeline execution, and middleware authorization chains. |
| **Core Language** | TypeScript | `v7.0.2` (Back) / `v5` (Front) | End-to-end type safety eliminating runtime null-pointer and type-coercion bugs. |
| **Database ORM** | Prisma ORM | `7.9.1` | Schema-driven migrations, type-safe client generation, and optimized connection pooling. |
| **Production Database**| PostgreSQL (Supabase) | Managed | ACID-compliant relational data persistence with foreign-key referential integrity. |
| **Authentication Engine**| Better Auth | `1.6.27` | Session-based token security, credential encryption, and role attribution. |
| **Artificial Intelligence**| Google GenAI SDK | `@google/genai 2.31.0` | Powers EMIS data analytics and student tutoring via the Gemini API. |
| **Real-time Comms** | Socket.IO | `4.8.4` | Low-latency bi-directional event transport for direct messaging and alerts. |
| **Object Storage** | MinIO / Cloudflare R2 | S3-Compatible | Secure storage for teacher curriculum files, PDFs, and student enrollment records. |
| **Hosting Infrastructure**| Vercel & Render | Cloud Platform | Continuous delivery triggered from git branch updates (`deployment`). |

### 3.2 Engineering Design Decisions
* **Monorepo Cohesion**: Unified git workspace separating concerns into `/frontend` and `/backend` while maintaining shared domain models and contracts.
* **Separation of API Quotas**: Distinct environment variables `GEMINI_API_KEY` (Administrative governance) and `STUDENT_GEMINI_API_KEY` (Student portal) guarantee that high student query volume never throttles executive ministerial analytics.
* **Branch-Gated Deployment Pipeline**:
  ```
  [ Feature Branch ] ──(PR & Review)──> [ dev ] ──(Full Build & Typecheck)──> [ deployment ] ──> Auto Deploy (Render + Vercel)
  ```

---

## 4. System Architecture & Detailed Design

### 4.1 System Topology & Network Architecture

```mermaid
graph TD
    User([End Users: Admin, Teacher, Student, Parent]) -->|HTTPS / WSS| Vercel[Vercel Global Edge Network\nNext.js 16 App Router]
    Vercel -->|Internal API Proxy /api/*| Render[Render Web Service\nExpress v5 TypeScript Engine]
    
    subgraph Security Middleware
        Render --> AuthMW[Better Auth Session Validator]
        AuthMW --> ScopeMW[requireScope: Hierarchy Boundary Guard]
        ScopeMW --> PermMW[requirePermission: RBAC Guard]
    end
    
    subgraph Data & AI Infrastructure
        PermMW --> Prisma[Prisma ORM Client]
        Prisma --> Supabase[(Supabase PostgreSQL\nPersistent Relational Store)]
        
        PermMW --> AIService[AI Engine / Model Router]
        AIService -->|GEMINI_API_KEY| GemAdmin[Gemini AI: EMIS Governance Analytics]
        AIService -->|STUDENT_GEMINI_API_KEY| GemStudent[Gemini AI: Student Tutor & Quizzes]
        
        PermMW --> Storage[MinIO / Cloudflare R2\nDocument Repository]
    end
```

### 4.2 Multi-Tier Hierarchical Governance Model
The platform mirrors the sovereign educational administrative structure:
```
           [ FEDERAL MINISTRY OF EDUCATION ]
                           │  Top-Down Directives & Policies
                           ▼  Bottom-Up National Aggregations
           [ REGIONAL EDUCATION BUREAU ]
                           │  Zonal Allocations & Regional Audits
                           ▼
           [ ZONE EDUCATION DEPARTMENT ]
                           │  Woreda Inspections & Consolidations
                           ▼
           [ WOREDA EDUCATION OFFICE ]
                           │  School Supervision & Data Requests
                           ▼
           [ INDIVIDUAL SCHOOL ENVIRONMENT ]
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   [ School Admin ]  [ Vice Principal ]  [ Teachers ]
         │                 │                 │
         └─────────────────┼─────────────────┘
                           ▼
               [ Students & Parents ]
```

### 4.3 Database Domain Model (Key Entities)

```
┌──────────────────┐       1:N       ┌──────────────────┐       1:N       ┌──────────────────┐
│   Organization   │ ─────────────── │      School      │ ─────────────── │   AcademicYear   │
│ (Hierarchy Node) │                 │  (School Info)   │                 │ (Terms/Sessions) │
└──────────────────┘                 └──────────────────┘                 └──────────────────┘
         │                                    │                                    │
         │ 1:N                                │ 1:N                                │ 1:N
         ▼                                    ▼                                    ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│       User       │ ─────────────── │     Student      │ ─────────────── │ StudentAttendance│
│  (Auth Entity)   │      1:1        │  (ID / Record)   │      1:N        │ (Period Status)  │
└──────────────────┘                 └──────────────────┘                 └──────────────────┘
         │                                    │                                    │
         │ 1:N                                │ 1:N                                │ 1:N
         ▼                                    ▼                                    ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│  RoleAssignment  │                 │    Enrollment    │                 │   StudentMark    │
│  (Scope / Role)  │                 │  (Grade/Section) │                 │ (Verified Scores)│
└──────────────────┘                 └──────────────────┘                 └──────────────────┘
```

---

## 5. Implementation Details

The implementation spans **30 backend domain modules** and **209 Next.js frontend routes**, representing complete operational coverage.

### 5.1 Backend Modular Services Directory
* `authentication`: User registration, Better Auth integration, password reset, session verification.
* `school` & `school-settings`: School profile lifecycle, institutional policies, kebele localization.
* `academic`: Academic year transition, terms, subject configurations, room capacities.
* `student`: Registration pipelines, student admissions, placement algorithms, lifecycle statuses.
* `teacher`: Faculty registration, qualification verification, subject allocations, workload metrics.
* `timetable`: Multi-period instructional scheduling, conflict avoidance engine.
* `attendance`: Clock-in, classroom student attendance, absence categorization, correction requests.
* `grade-submission`: Teacher grade sheets, batch verification, sign-off and publishing rules.
* `vice-principal`: Academic organization oversight, staffing anomaly detection, calendar sync.
* `learning`: Curriculum material uploads, homework assignments, submission intake.
* `parent`: Family connection verification, multi-child aggregation, meeting appointment booking.
* `communication`: Direct messaging, notifications, system broadcasts, directive distribution.
* `ai-analytics` & `ai-leadership`: Multi-tier natural-language query engine, data synthesis.
* `student-ai`: Concept explanation, practice quiz generation, multi-turn AI tutor, study planner.
* `governance` & `hierarchy`: Multi-tiered reporting, organizational scope enforcement, aggregate metrics.

### 5.2 Implementation Highlights & Security Safeguards

#### 1. Scope-Bound Guard Middleware
```typescript
// Core security middleware ensuring strict organizational boundary enforcement
export const requireScope = (expectedScope: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userScope = req.user?.activeScope?.type;
        if (!userScope || (userScope !== expectedScope && !isHigherScope(userScope, expectedScope))) {
            return res.status(403).json({ error: "Access Denied: Operating outside authorized administrative scope." });
        }
        next();
    };
};
```

#### 2. Dual-Key AI Quota Isolation Engine
```typescript
// backend/src/modules/student/student-ai.service.ts
private static getClient(): GoogleGenAI {
    if (!this.genAI) {
        // Dedicated student key isolates high-frequency learning traffic from executive analytics
        const apiKey = process.env.STUDENT_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("STUDENT_GEMINI_API_KEY or GEMINI_API_KEY is not configured in environment.");
        }
        this.genAI = new GoogleGenAI({ apiKey });
    }
    return this.genAI;
}
```

#### 3. Circuit-Breaker SQL Query Protection
Administrative natural language inquiries synthesize SQL statements that are guarded by an automated regex validator preventing `DROP`, `ALTER`, `DELETE`, or `UPDATE` mutations, executed under a strict **3000ms database statement timeout**.

---

## 6. Functional Capabilities & Feature Showcase

### 6.1 Actor-Specific Capabilities

#### A. School Principal / Administrator (`/dashboard/admin`)
* **Institutional Master Setup**: Establishes academic years, calendars, grade ladders, and sections.
* **Student Roster Management**: Orchestrates student registration, document verification, and bulk placement.
* **Staffing & Faculty Allocations**: Assigns educators to subjects and sections; manages user permissions and role revocations.
* **School Improvement & Audit**: Tracks school developmental objectives, milestones, and audit activities.

#### B. Vice Principal / Academic Leader (`/dashboard/vice-principal`)
* **Academic Organization**: Inspects classroom section counts, timetable distributions, and room utilization.
* **Instructional Staffing Oversight**: Analyzes teacher workloads to identify unassigned classes or over-allocated instructors.
* **Attendance & Performance Monitoring**: Evaluates daily attendance percentages and subject failure rates.
* **Student & Teacher Academic Support**: Flags learners needing remedial assistance and monitors intervention progress.

#### C. Teacher Portal (`/dashboard/teacher`)
* **Classroom Command Center**: Displays daily timetable schedule, subject roster, and active classes.
* **Digital Attendance Register**: Records daily student presence, absences, and tardiness with reason codes.
* **Curriculum & Materials Hub**: Uploads syllabi, reading materials, presentations, and reference links scoped to their classes.
* **Grade Submission Workflow**: Prepares mark sheets, audits calculations, and submits batches for administrative countersignature.

#### D. Student Portal (`/dashboard/student`)
* **Personal Academic Hub**: Displays daily schedules, current attendance records, and verified examination marks.
* **Results Hub**: Interactive grade breakdown categorized by semester, assessment type, and class ranking.
* **EduBridge AI Study Assistant**:
  * *Concept Explainer*: Breaks complex concepts into digestible intuition, mental hooks, and check questions.
  * *Practice Quiz Generator*: Dynamic, curriculum-aligned multiple-choice questions across Easy, Medium, and Hard tiers.
  * *Conversational AI Tutor*: Chat assistant supporting file attachments and session persistence.
  * *Personalized Study Planner*: Generates optimized weekly revision schedules balancing study and rest.

#### E. Parent / Guardian Portal (`/dashboard/parent`)
* **Multi-Child Monitoring**: Switch between enrolled siblings to review attendance percentages and grade summaries.
* **Teacher Communication**: Direct messaging with subject instructors; parent-teacher conference appointment requests.
* **Official Bulletins & Notices**: Real-time receipt of school emergency announcements, event alerts, and consent requests.

#### F. Governance Tiers (`/dashboard/federal`, `/region`, `/zone`, `/woreda`)
* **Territorial Drill-Down**: Interactive geographic navigation from the national overview down to individual schools.
* **EMIS Natural Language AI**: Executive inquiry interface converting plain-English inquiries into aggregated data charts.
* **Policy & Directive Dissemination**: National directive publishing with real-time school acknowledgment tracking.

---

## 7. Verification, Validation & Testing

A multi-layered testing regimen was enforced across the repository prior to staging and live deployment.

### 7.1 Testing Methodologies Applied

| Testing Level | Mechanism & Tooling | Scope of Verification |
| :--- | :--- | :--- |
| **Static Analysis** | TypeScript Compiler (`tsc --noEmit`) | Strict type consistency, interface enforcement, nullability validation across 30 backend modules and frontend code. |
| **Production Build Gates** | Next.js Engine (`next build` / Turbopack) | Server/client component isolation, bundle integrity, dead-code elimination, and prerendering of all 209 routes. |
| **Unit & Logic Testing** | Vitest Framework | Unit verification of helper functions, grading algorithms, and timetable conflict detection. |
| **Integration & Route Testing** | Supertest / API Harnesses | Endpoint response codes, JSON schema conformity, and database transaction rollbacks. |
| **Security & Boundary Auditing**| Manual Multi-Role Matrix | Verification that cross-scope requests return `403 Forbidden` and unauthenticated calls return `401 Unauthorized`. |

### 7.2 Pre-Deployment Quality Assurance Log

```
[VERIFICATION SUITE: OCT 2026]
----------------------------------------------------------------------
✓ Backend Static Typecheck  : npx tsc --noEmit           -> PASSED (0 Errors)
✓ Frontend Static Typecheck : npx tsc --noEmit           -> PASSED (0 Errors)
✓ Next.js Turbopack Build   : npm run build              -> PASSED (209/209 Routes Prerendered)
✓ Database Schema Sync      : prisma db push             -> PASSED (Schema synchronized)
✓ Security Isolation Check  : Cross-Scope Refusal Test   -> PASSED (403 Correctly Enforced)
✓ Model Quota Separation    : Dual-Key Resolution Test   -> PASSED (Independent Keys Functioning)
----------------------------------------------------------------------
FINAL STATUS: PRODUCTION READY — DEPLOYMENT APPROVED
```

### 7.3 Verifiable Test Results
1. **Compilation Zero-Defect Standard**: Both `frontend` and `backend` pass compile checks with zero TypeScript errors under strict mode.
2. **Build Prerender Success**: All 209 Next.js application routes compiled into optimized production chunks with zero hydration or build mismatches.
3. **Data Security Isolation**: Verified that accounts assigned to `SCHOOL` scope receive an immediate refusal when querying `/api/region` or `/api/federal` endpoints.
4. **AI Safety & Isolation**: Verified that the Student AI Assistant cannot access or summarize restricted administrative database tables.

---

## 8. Conclusion & Future Roadmap

### 8.1 Project Conclusion
EduBridge demonstrates a scalable, secure, and modern approach to national education data engineering. By placing the school at the center of the operational model, the platform eliminates double-entry burdens on teachers while guaranteeing that higher education authorities receive accurate, timely, and structured data. 

Through its combination of role-based security, modular TypeScript architecture, resilient dual-key AI integration, and zero-downtime cloud deployment on Vercel and Render, EduBridge successfully fulfills every functional and architectural objective set forth in its initial specifications.

### 8.2 Deliverables Summary
* **Full Source Code**: Hosted securely at [GitHub: samuelabera21/Edubridge](https://github.com/samuelabera21/Edubridge)
* **Production Application**: Live Next.js Web Application on Vercel Edge CDN
* **Production REST API**: Scalable Express Web Service on Render Cloud
* **Production Database**: High-availability PostgreSQL database on Supabase

### 8.3 Future Enhancements
* **Mobile Applications**: Cross-platform Flutter / React Native applications optimized for teachers and students in low-bandwidth environments.
* **Offline-First Synchronization**: Local caching and progressive data syncing for remote schools with intermittent internet access.
* **National EMIS Data Exchange**: Direct bidirectional API connectors to the Ethiopian Ministry of Education's centralized data warehouse.
* **Advanced Early-Warning AI**: Machine-learning models predicting academic dropout risk before semester examinations.
* **Multilingual Expansion**: Comprehensive localization supporting Amharic, Afaan Oromoo, Tigrinya, and Somali across all interfaces.

---

## Appendix: Repository & Access Verification

* **GitHub Repository URL**: `https://github.com/samuelabera21/Edubridge`
* **Evaluator Access**: Added collaborator `eyobed101` with full read/review permissions.
* **Primary Branches**:
  * `main`: Release stability baseline.
  * `dev`: Active integration and peer code review branch.
  * `deployment`: Production branch continuously mirrored to Vercel and Render.

