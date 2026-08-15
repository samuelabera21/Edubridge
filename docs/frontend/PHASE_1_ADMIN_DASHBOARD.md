# Phase 1: Admin Dashboard Proof of Integration

## Overview
This phase successfully proved that the Next.js frontend can interact seamlessly with the fully audited backend School Domain API using the shared Better Auth session.

## Frontend Route Created
- **URL**: `/dashboard/admin`
- **Location**: `frontend/app/dashboard/admin/page.tsx`
- **Component Type**: Next.js Server Component (Async)

## APIs Consumed
The dashboard concurrently fetches from the following backend endpoints using `Promise.all` for efficiency:
1. `GET /api/school/profile` (School Information)
2. `GET /api/academic/years` (Academic Years)
3. `GET /api/student/enrollments` (Student Enrollments)
4. `GET /api/teacher` (Teacher Profiles)

## Authentication Approach
- Uses **Better Auth** session natively.
- No second authentication or NextAuth system was introduced.
- Client-side checks are handled in `hooks/useAuth` and `dashboard/layout.tsx`.
- Server-side data fetching is managed via `lib/server-api.ts`, which automatically forwards the user's secure cookies to the backend (bypassing the need to hardcode organization scopes since `requireScope` on the backend extracts it directly from the session's active role).

## Components Created
- `lib/server-api.ts`: A lightweight fetch utility that injects server cookies for authenticated backend requests.
- `app/dashboard/admin/page.tsx`: The main page displaying real data pulled via `server-api.ts`.
- `layout.tsx` was extended to include the `Admin Dashboard` link.

## Environment Variables Required
The Next.js app requires:
- `BACKEND_URL`: URL to the backend API (e.g., `http://backend:5000` internally, or `http://localhost:5000` via Rewrites). This is handled via `next.config.ts`.

## How to Start Frontend
1. Make sure the backend is running on port 5000 (via `docker-compose up --build`).
2. Frontend should also be running via Docker (`http://localhost:3001` mapped to 3000) or locally via `npm run dev`.

## How to Test the Dashboard
1. Open the browser to `http://localhost:3001/login`.
2. Authenticate using the Admin credentials from `TEST_DATA.md` (e.g., `admin_audit_<timestamp>@test.com`).
3. Click on the **Admin Dashboard** link in the sidebar or navigate to `http://localhost:3001/dashboard/admin`.
4. Observe the School Name, Active Academic Year, Total Students, and Active Teachers populated accurately from the database.

## Known Limitations
- The current implementation of `server-api.ts` does not attempt token rotation; it simply forwards the session cookies.
- This is a read-only proof-of-integration dashboard. Interactive forms (creation/updates) will be implemented in subsequent phases.

## Backend Contract Issues Discovered
- **None**. The backend contract works exactly as designed. The `requireScope` middleware perfectly scoped the API requests based on the session's role assignments, removing the need for passing explicit Organization IDs in the Next.js fetch layer.
