# EduBridge — Canonical Academic Model

## School Academic Structure

School
→ AcademicYear
→ Grade
→ Section
→ Subject

## Student Relationship

Student
→ StudentEnrollment
→ School
→ AcademicYear
→ SchoolGrade
→ Section

## Teacher Relationship

Teacher
→ TeachingAssignment
→ School
→ AcademicYear
→ Subject
→ SchoolGrade
→ Section

## Canonical Models

The following Prisma models are shared academic models:

- OrganizationUnit
- AcademicYear
- Grade
- SchoolGrade
- Section
- Subject
- SchoolSubject
- Student
- StudentEnrollment
- Teacher
- TeachingAssignment

## Ownership

Academic structure owns:

- AcademicYear
- Grade
- SchoolGrade
- Section
- Subject
- SchoolSubject

Student domain owns:

- Student
- StudentEnrollment

Teacher domain owns:

- Teacher
- TeachingAssignment

## Actor Rule

Principal, Vice Principal, Teacher, Student, Parent,
Support Staff, and School Committee features must consume
these canonical models.

No actor domain may create a duplicate:

- Student model
- Teacher model
- Grade model
- Section model
- Subject model
- AcademicYear model

## Historical Rule

Academic relationships must preserve historical records.

Student transfers, teacher assignment changes, academic-year changes,
section changes, and other lifecycle changes must not destroy historical data.

## Scope Rule

All school-level records must remain associated with the appropriate
OrganizationUnit and must respect authorization scope.

## Pending Schema Change

StudentEnrollment currently has:

@@unique([studentId, academicYearId])

This constraint must be reviewed/changed to support legitimate
same-year transfer history.

No developer should independently modify the shared academic schema.