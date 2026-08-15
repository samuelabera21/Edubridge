# EduBridge — School Domain API Contract

## Purpose

This document defines the API boundaries between EduBridge
School Domain modules.

Actor teams must communicate through APIs/contracts and must
not directly depend on another actor module's internal
implementation.

---

# 1. Authentication

All protected APIs require an authenticated User.

The authenticated User provides:

- userId
- assigned role(s)
- organization scope
- permissions

---

# 2. Organization Scope

Every school-level operation must respect:

OrganizationUnit

The user's active school scope determines which school data
the user may access.

A user must never access another school's private records
unless explicitly authorized by a higher-level scope.

---

# 3. Academic Context

The canonical academic hierarchy is:

School
→ AcademicYear
→ SchoolGrade
→ Section

and:

School
→ AcademicYear
→ SchoolSubject

The following models are canonical:

- AcademicYear
- Grade
- SchoolGrade
- Section
- Subject
- SchoolSubject

Actor modules consume these models.

They do not create duplicate academic models.

---

# 4. Student Contract

Canonical relationship:

Student
→ StudentEnrollment
→ School
→ AcademicYear
→ SchoolGrade
→ Section

Student APIs must expose the information required by
authorized consumers.

Example consumers:

- Principal
- Vice Principal
- Teacher
- Student
- Parent
- Support Staff

Student module owns Student-domain behavior.

---

# 5. Teacher Contract

Canonical relationship:

Teacher
→ TeachingAssignment
→ AcademicYear
→ Subject
→ SchoolGrade
→ Section

Teacher APIs must expose the information required by
authorized consumers.

Example consumers:

- Principal
- Vice Principal
- Teacher

Teacher module owns Teacher-domain behavior.

---

# 6. Parent Contract

Canonical relationship:

Parent
→ ParentStudent
→ Student

Parent access is restricted to authorized linked students.

A parent must not access unrelated student records.

---

# 7. Principal Contract

Principal functionality consumes:

- School information
- Academic structure
- Student information
- Teacher information
- Attendance information
- Assessment information
- Support information
- School improvement information
- Reports
- Issues

The Principal module must not duplicate Student or Teacher
domain models.

---

# 8. Academic Leader Contract

Academic Leader functionality consumes:

- Academic structure
- Teaching assignments
- Student academic information
- Attendance
- Assessment
- Curriculum information
- Student support information

The Academic Leader module must not duplicate academic,
student, or teacher models.

---

# 9. Read vs Write Ownership

Each domain owns its own business operations.

Other domains may request information through the defined
API contract.

Example:

Teacher:
- records classroom attendance

Principal:
- views school attendance

Student:
- views own attendance

Parent:
- views authorized child's attendance

These are different capabilities over the same underlying
domain information.

---

# 10. No Direct Cross-Module Database Logic

Actor modules must not directly import another actor
module's repositories, services, controllers, or internal
implementation.

Forbidden examples:

Student module
→ imports TeacherService

Teacher module
→ imports PrincipalService

Parent module
→ imports StudentRepository directly

Principal module
→ modifies Teacher tables directly

Instead, use the defined domain/API boundary.

---

# 11. Shared Kernel Changes

Changes to the following require team-lead approval:

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
- Parent
- ParentStudent

A developer must not modify these models simply to make
their own feature easier to implement.

---

# 12. Historical Data

Actor features must preserve historical records.

Do not overwrite historical academic relationships when:

- a student changes section
- a student transfers
- a teacher changes assignment
- an academic year changes
- a teacher stops teaching a subject
- a student changes enrollment status

Historical records must remain traceable.

---

# 13. API Stability

Once an API contract is approved, actor teams may implement
against it independently.

Internal implementation may change as long as the agreed
contract remains compatible.

---

# 14. Integration Principle

Teams should be able to develop independently:

Student Team
      ↓
Student APIs

Teacher Team
      ↓
Teacher APIs

Principal Team
      ↓
Principal APIs

Parent Team
      ↓
Parent APIs

Academic Leader Team
      ↓
Academic APIs

Each team integrates through contracts rather than waiting
for another team to finish its entire actor.

---

# 15. Contract Ownership

Shared contracts are reviewed by the Team Lead.

Actor implementation is owned by the corresponding actor team.

A team may propose a contract change, but may not silently
change a shared contract.

---

# 16. Core Rule

The database is shared.

The domain responsibilities are separated.

The APIs are the communication boundaries.

Actor teams implement independently.