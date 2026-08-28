# EduBridge Developer Onboarding Guide

Welcome to the EduBridge project! This guide will help you understand the architecture, how to run the project, and the rules for adding new features.

## 1. What is EduBridge?
EduBridge is a multi-level education monitoring, information, communication, and decision-support platform for the Ethiopian education system. It operates at multiple levels: Federal, Region, Zone, Woreda, and School.

## 2. Architecture Overview
- **Backend**: Node.js + Express + Prisma (PostgreSQL). Located in the `backend/` directory.
- **Frontend**: Next.js + React. Located in the `frontend/` directory.
- **Authentication**: Handled by Better-Auth (`auth.ts`).
- **Authorization**: Custom RBAC (Role-Based Access Control) using Prisma.

## 3. Important Concepts

### 3.1 Authentication vs. Authorization
- **Authentication** answers "Who is this user?" (Handled by Better-Auth).
- **Authorization** answers "What is this user allowed to do?" (Handled by our custom RBAC implementation).

### 3.2 Organizational Scope
A user's authorization is tied to an organizational scope (e.g., a specific School). The hierarchy is:
`Federal -> Region -> Zone -> Woreda -> School`.
A user (e.g., `SCHOOL_ADMIN`) is assigned to a specific `OrganizationUnit`. They **cannot** access data outside their assigned organization.

### 3.3 The Academic Core
The foundational structure for schools is:
`School -> Academic Year -> Grade -> Section`.
Subjects are also tied to the School and Academic Year. This structure must be preserved historically (e.g., do not overwrite last year's grades).

### 3.4 Students vs. Enrollments
- **Student**: Represents the permanent person identity (`Student` model).
- **StudentEnrollment**: Represents the student's participation in a specific school and academic year (`StudentEnrollment` model). **Never couple these concepts.**

### 3.5 Teachers vs. Teaching Assignments
- **Teacher**: Represents the professional profile of a teacher.
- **TeachingAssignment**: Represents what they are teaching in a specific school and academic year.

## 4. Running the Project (Docker)
We use Docker Compose to provide a reproducible development environment.

### ⚡ First-time setup (run once after cloning)

```bash
# This creates .env automatically with secure random secrets
bash setup.sh
```

> **What `setup.sh` does:**
> - Creates `.env` from `.env.example` (skips if `.env` already exists)
> - Auto-generates a random `POSTGRES_PASSWORD` and `BETTER_AUTH_SECRET`
> - Syncs `backend/.env` with the same database credentials
> - You never need to manually edit any `.env` file

### ▶️ Start the project

```bash
docker compose up
```

> **Services available at:**
> - **Admin Dashboard (Frontend):** http://localhost:3001
> - **Backend API:** http://localhost:5001
> - **Database (Postgres):** localhost:5434

### 🔑 Default login credentials
| Field | Value |
|-------|-------|
| Email | `admin@edubridge.local` |
| Password | `Admin@1234` |

> **⚠️ Important:** `.env` is git-ignored and will NOT be committed. Every developer must run `bash setup.sh` once after cloning or pulling on a new machine.

## 5. Database Management (Prisma)
To run migrations or seed the database, run these commands inside the `backend` directory (or inside the backend container):

```bash
# Run migrations
npx prisma migrate dev

# Generate the client
npx prisma generate

# Seed the database
npx tsx prisma/seed.ts
```

## 6. How to Add a New Feature Safely
EduBridge is designed for parallel team development. When building a new feature (e.g., Attendance, Grading):

1. **Do not duplicate foundation models**: Use the existing `AcademicYear`, `SchoolGrade`, `Section`, `StudentEnrollment`, and `TeachingAssignment` models.
2. **Enforce Scope**: Always use `requireScope("SCHOOL")` in your backend routes and ensure your database queries filter by `organizationId`.
3. **Audit Sensitive Changes**: Use the `AuditLog` table for important mutations.
4. **Preserve History**: Do not use hard-deletes for important educational records. Use status enums (e.g., `ARCHIVED`, `WITHDRAWN`).
5. **Decouple Actor UIs**: The Student Portal UI should not depend on the Principal Dashboard UI. They should both consume the shared backend APIs.

If you are unsure about a design decision, refer to the SRS documentation in `backend/Docs/SRS/`.
