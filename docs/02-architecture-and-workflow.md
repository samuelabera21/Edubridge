# EduBridge: Architecture & Workflow Guide

Welcome to the development team! This document outlines how our application is structured, where to find documentation, and how we handle development workflows.

---

## 1. Project Architecture

EduBridge is a modern, modular, full-stack monorepo. It is broken into two primary components:

### The Backend (`/backend`)
- **Framework:** Node.js with Express.
- **Database ORM:** Prisma interacting with PostgreSQL.
- **Authentication:** Better Auth.
- **Structure:** We use a highly decoupled **Modular Monolith** architecture.
  - Inside `/backend/src/modules/`, you will find a dedicated folder for every major actor and domain (e.g., `student`, `teacher`, `vice-principal`, `academic`).
  - **Rules for Modules:** 
    1. Each module has its own `*.controller.ts`, `*.routes.ts`, and `*.service.ts`.
    2. Modules should not tightly couple their business logic. If the Teacher module needs Student data, it should go through the Database or call a shared service, rather than importing directly from the Student controller.
  - **Routing:** All routes are registered centrally in `/backend/src/index.ts`.

### The Frontend (`/frontend`)
- **Framework:** Next.js (App Router).
- **Styling:** TailwindCSS.
- **Structure:** 
  - The main application interface lives inside `/frontend/app/dashboard/`.
  - The `layout.tsx` file handles the dynamic sidebar rendering. Depending on the authenticated user's Role, the sidebar transforms completely (e.g., a Parent sees different links than a School Admin).
  - Each actor has a dedicated page (e.g., `/dashboard/school`, `/dashboard/parent`).
- **API Communication:** All frontend-to-backend API calls should go through the proxy setup. We use the custom `fetchApi` hook (located in `/frontend/lib/api.ts`) which automatically forwards requests to the Express backend without CORS issues.

---

## 2. Essential Reading & Documentation

Before writing code for a feature, you **must** read the corresponding documentation to understand the requirements and constraints.

### The SRS (Software Requirements Specification)
The SRS outlines exactly what the platform needs to do. 
- You can find the SRS documents under `/backend/Docs/`.
- **Specifically, read the Actors requirements:** `/backend/Docs/School/Docs/Actors/Actors.md`. This defines the permissions, responsibilities, and hierarchy of the 7 core school actors.

### Database Schema
Familiarize yourself with the Prisma Schema located at `/backend/prisma/schema.prisma`. 
- This file is the single source of truth for our database tables and relationships.
- We have an extensive mapping of `OrganizationUnit`, `User`, `Role`, and `RoleAssignment`.

---

## 3. Development Workflow

We follow a parallel development strategy. Because the modules and frontend dashboards are strictly separated, multiple developers can work simultaneously without stepping on each other's toes.

### Step-by-Step Feature Implementation
1. **Understand the Requirement:** Read the SRS for the specific feature/actor you are assigned to.
2. **Database Updates:** If your feature requires new data storage, update `/backend/prisma/schema.prisma`. 
   - After updating, run: `docker exec -it edubridge_backend npx prisma db push` to sync the database.
3. **Backend API:** Create or update the controller and routes in the appropriate `backend/src/modules/` folder.
   - Example: If building a grading feature, you would work inside `modules/teacher/teacher.controller.ts`.
4. **Frontend UI:** Build out the user interface in the corresponding Next.js folder (`/frontend/app/dashboard/<actor>`).
   - Use the `fetchApi` utility to securely pull data from your new backend endpoint.

### Handling Merge Conflicts
Because we have separated our routes and controllers into distinct actor folders (e.g., `vice-principal` vs. `support-staff`), merge conflicts in backend files should be extremely rare. 

However, if you edit **Global Files** (like `index.ts`, `layout.tsx`, or `schema.prisma`), communicate with your team to ensure you don't override someone else's work.

---

## Next Steps
To learn how to test your features by logging in as different user types, please read the [Actor Provisioning & Testing Guide](./03-actor-provisioning.md).
