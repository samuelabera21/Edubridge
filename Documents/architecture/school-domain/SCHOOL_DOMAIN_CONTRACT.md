# EduBridge — School Domain Contract

## Purpose

This document is the shared contract for all developers working on the
EduBridge School Domain.

All Student, Teacher, Principal, Vice Principal, Parent, Support Staff,
and School Committee features must use these shared concepts.

No developer may create a competing model for these concepts.

---

# 1. School

A School is an OrganizationUnit representing one educational institution.

A school belongs to the organizational hierarchy:

School
→ Woreda
→ Zone
→ Region
→ Federal

School-level data must remain isolated by the authorized OrganizationUnit scope.

---

# 2. Academic Year

AcademicYear represents the school year in which academic operations occur.

Academic records that are year-dependent must reference an AcademicYear.

Examples:

- Student enrollment
- Teaching assignments
- Classes/sections
- Subjects offered
- Attendance
- Assessments
- Learning activities
- Academic progress

---

# 3. Grade

Grade represents the educational level offered by the school.

Examples:

- Grade 1
- Grade 2
- Grade 9
- Grade 10

Grade is part of the shared academic structure.

Student, Teacher, Principal, and other domains must reference the shared Grade.

---

# 4. Section

Section represents a class grouping within a Grade for an AcademicYear.

Example:

Grade 10
→ Section 10A
→ Section 10B
→ Section 10C

A Section belongs to:

- School
- AcademicYear
- Grade

Students are placed into Sections through Enrollment.

Teachers are connected to Sections through TeachingAssignment.

---

# 5. Subject

Subject represents an academic subject offered by the school.

Examples:

- Mathematics
- English
- Physics
- Chemistry
- Biology

Subjects are part of the shared academic structure.

Teachers do not create their own Subject model.

Students do not create their own Subject model.

Principal and Vice Principal use the same Subject model.

---

# 6. Student

Student represents the permanent learner identity.

Student is NOT the same thing as enrollment.

A Student may have multiple historical enrollments.

Example:

Student
→ Enrollment at School A
→ Transfer
→ Enrollment at School B

The Student identity must not be destroyed when enrollment changes.

---

# 7. Student Enrollment

Enrollment represents a student's participation in a school for a specific AcademicYear.

Enrollment connects:

Student
→ School
→ AcademicYear
→ Grade
→ Section

Enrollment is the source for determining where a student belongs academically.

Student status changes must preserve history.

---

# 8. Teacher

Teacher represents the professional teacher identity/profile.

Teacher is separate from teaching assignment.

A teacher may have different assignments over different academic years.

---

# 9. Teaching Assignment

TeachingAssignment represents a teacher's academic responsibility.

It connects:

Teacher
→ School
→ AcademicYear
→ Subject
→ Grade
→ Section

This relationship is used by attendance, assessment, curriculum,
learning activities, and teacher/student views.

---

# 10. Core Academic Relationship

The shared academic structure is:

School
→ AcademicYear
→ Grade
→ Section
→ Subject

Student:

Student
→ Enrollment
→ AcademicYear + Grade + Section

Teacher:

Teacher
→ TeachingAssignment
→ AcademicYear + Subject + Grade + Section

---

# 11. Ownership Rule

Each shared concept has one owner.

Academic Core owns:

- AcademicYear
- Grade
- Section
- Subject

Student Domain owns:

- Student
- Enrollment
- Student lifecycle

Teacher Domain owns:

- Teacher
- TeachingAssignment
- Teacher professional information

Other domains must reference these concepts.

They must NOT recreate them.

---

# 12. Actor Rule

Actors are NOT separate databases or separate versions of the academic model.

They are authorized users of shared school-domain data.

Principal:
school-wide management and oversight.

Vice Principal / Academic Leader:
academic monitoring and coordination.

Teacher:
classroom teaching and academic evidence creation.

Student:
personal learning and academic participation.

Parent / Guardian:
authorized access to linked child information.

Support Staff:
limited operational/support activities.

School Committee:
authorized participation in school improvement/community activities.

---

# 13. Critical Rule

Before creating a new entity, developer must ask:

"Does this already belong to the shared School Domain Contract?"

If yes:

Use the existing entity.

Do not create another version.

---

# 14. Historical Data Rule

Academic records must preserve historical context.

Do not overwrite historical academic relationships simply because a
student, teacher, section, or academic year changes.

Current state and historical state must remain distinguishable.

---

# 15. Scope Rule

All school-level operations must respect OrganizationUnit scope.

A user authorized for School A must not access School B data merely by
changing an ID supplied by the client.

Authorization and scope remain enforced by the existing platform
authorization foundation.

---

# 16. Contract Status

This document is the initial shared contract for parallel development.

Changes to these shared concepts require team agreement before implementation.