# EduBridge — School Domain Team Ownership

## Shared Kernel — LOCKED

The following models are shared by all School Domain teams:

- OrganizationUnit
- SchoolProfile
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

These models must not be independently redesigned by actor teams.

Any change to the shared kernel requires team-lead approval.

---

# Domain Ownership

## Team A — School Administration

Owns:

- School Administrator / Principal
- School Dashboard
- School Profile operations
- Academic Year operations
- Student management UI/workflows
- Teacher and staff management UI/workflows
- Class and section management
- School settings
- Users and permissions
- School-level reports
- School administration workflows

---

## Team B — Teacher

Owns:

- Teacher Dashboard
- My Teaching Assignments
- Student Management from teacher scope
- Attendance
- Lesson / Curriculum
- Assessment
- Learning Activities
- Student Support
- Parent Communication
- Teacher Communication
- Professional Development
- Teacher Reports
- AI Teacher Assistant

Teacher functionality must consume the canonical:

Teacher
→ TeachingAssignment
→ AcademicYear
→ Subject
→ SchoolGrade
→ Section

structure.

---

## Team C — Student

Owns:

- My Dashboard
- My Profile
- My Classes
- My Attendance
- My Assessments
- My Learning Activities
- My Support
- Communication
- Learning Resources
- AI Study Assistant

Student functionality must consume:

Student
→ StudentEnrollment
→ School
→ AcademicYear
→ SchoolGrade
→ Section

---

## Team D — Parent / Guardian

Owns:

- Parent Dashboard
- Child Profile
- Attendance
- Academic Performance
- Learning Activities
- Student Support
- Communication
- Consent / Confirmation
- AI Parent Assistant

Parent functionality must consume:

Parent
→ ParentStudent
→ Student
→ StudentEnrollment

---

## Team E — Vice Principal / Academic Leader

Owns:

- Academic Dashboard
- Academic Organization views
- Teaching Monitoring
- Student Attendance monitoring
- Assessment Monitoring
- Student Support monitoring
- Teacher Support
- Academic Reports
- Academic Communication
- AI Academic Assistant

This domain consumes the academic and teacher/student data.
It must not create duplicate academic models.

---

## Team F — School Support Staff

Owns:

- Assigned Tasks
- Student Support activities
- School Operations
- Communication
- Limited Reporting

---

## Team G — School Committee

Owns:

- Committee Dashboard
- School Improvement participation
- Community Participation
- Meetings
- Feedback
- Committee Reports

---

# Shared Infrastructure — Existing

The following are platform infrastructure and must not be recreated:

- User
- Session
- Account
- Verification
- Role
- Permission
- RolePermission
- RoleAssignment
- OrganizationUnit
- AuditLog

---

# Dependency Rule

Actor domains may READ shared academic data.

Actor domains must not create duplicate versions of:

- Student
- Teacher
- AcademicYear
- Grade
- SchoolGrade
- Section
- Subject
- StudentEnrollment
- TeachingAssignment

---

# Database Rule

The Prisma shared schema is a controlled area.

Do not modify shared models merely to make an actor feature convenient.

If an actor feature requires a shared-model change:

1. Open an issue.
2. Explain why the change is required.
3. Team lead reviews it.
4. Shared-model change is approved.
5. Change is coordinated with affected teams.

---

# Integration Rule

Teams develop independently.

They do NOT need to wait for another actor team to finish its dashboard.

Teams integrate through:

- shared domain contracts
- existing Prisma models
- backend API contracts
- permission contracts
- organization/school scope
- agreed identifiers

---

# Actor Boundary

The actor is NOT the database model.

For example:

Student actor
≠
Student database model.

Teacher actor
≠
Teacher database model.

Principal actor
≠
SchoolProfile database model.

Actors are users/roles interacting with domain capabilities.

The underlying academic entities are shared.

---

# Current Development Principle

Build the School Domain as one coherent system with independently owned modules.

Do not build seven isolated mini-applications.

Do not allow seven teams to redesign the same database.

The shared academic structure is the contract.
Actor domains are consumers of that contract.