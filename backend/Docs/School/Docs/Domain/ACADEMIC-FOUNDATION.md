# EduBridge Academic Foundation

**Purpose:** This document establishes the shared academic structure foundation that future EduBridge actors and feature modules MUST use.

## Core Principle: Do Not Duplicate

The fundamental rule for future development is **DO NOT DUPLICATE**.

- **Do not create** `StudentSubject` if `Subject` already represents the subject concept.
- **Do not create** another `School` model. Use `OrganizationUnit` where `type === 'SCHOOL'`.
- **Do not create** another tenancy/organization model.
- **Do not create** a separate `Term` or `Semester` model unless explicitly authorized; use `AcademicYear` boundaries for operations.
- **Do not create** separate `Grade`, `Class`, or `Section` tables for new modules.

Future modules (Student, Teacher, Assessment, Attendance) **must** reference these canonical entities to ensure data integrity across the platform.

## Academic Domain Entities

1. **`AcademicYear`**
   - Represents the primary temporal boundary for educational operations.
   - Example: "2018 E.C."
   - Statuses: PLANNED, ACTIVE, COMPLETED, ARCHIVED.
   - *Ownership:* Belongs strictly to an `OrganizationUnit` (School).

2. **`Grade`**
   - The catalog of educational grades offered by the school.
   - *Ownership:* Belongs strictly to an `OrganizationUnit`.

3. **`SchoolGrade`**
   - Connects a `Grade` to a specific `AcademicYear`. Represents the grades that are actively taught in a given year.

4. **`Section`**
   - An organized class of students within a `SchoolGrade` (and therefore within an `AcademicYear`).
   - Example: "10A".

5. **`Subject`**
   - The catalog of subjects offered by the school.
   - *Ownership:* Belongs strictly to an `OrganizationUnit`.

6. **`SchoolSubject`**
   - Connects a `Subject` to a specific `AcademicYear`.

## Relationships

```text
OrganizationUnit (School)
  │
  ├── AcademicYear
  │     │
  │     ├── SchoolGrade
  │     │     └── Section
  │     │
  │     └── SchoolSubject
  │
  ├── Grade
  │
  └── Subject
```

## Authorization & Scope Isolation

**Multi-School Isolation is strictly enforced at the database level.**

Every academic API endpoint MUST enforce school isolation using the existing middleware:

```typescript
router.use(requireScope("SCHOOL"));
```

This ensures that the authenticated user is only able to read/write records belonging to the `OrganizationUnit` they are assigned to.

**Permissions:**
The following permissions protect the academic foundation:
- `ACADEMIC:VIEW`
- `ACADEMIC:CREATE`
- `ACADEMIC:UPDATE`
- `ACADEMIC:DELETE`

## Extension Rules for Future Sprints

When building future modules:
1. **Student Module:** Create `StudentProfile` and `StudentEnrollment`. A `StudentEnrollment` should have foreign keys to `AcademicYear`, `Grade`, and `Section`.
2. **Teacher Module:** Create `TeacherProfile` and `TeachingAssignment`. A `TeachingAssignment` should link a `User` (Teacher) to an `AcademicYear`, `Subject`, `Grade`, and `Section`.
3. **Attendance & Assessment:** These should directly reference `Section`, `Subject`, and `AcademicYear` to maintain a unified historical record.
