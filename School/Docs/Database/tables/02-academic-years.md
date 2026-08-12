Save the next file as:

**File:** `02-academic-years.md`

**Location:**

```text
docs/database/tables/02-academic-years.md
```

Copy the **entire Markdown block below** into that file.

````md
# EduBridge — School Database

# Table 02: `academic_years`

## 1. Entity

**Table:** `academic_years`

**Domain:** School

**Category:** Core / Academic Structure

**Status:** Conceptually approved

**Parent entity:** `schools`

**Source of truth:** School-specific academic-year context

---

## 2. Purpose

The `academic_years` table represents an academic year within a specific school.

An academic year is different from the school itself.

The `schools` table represents the long-lived institution.

The `academic_years` table represents a specific period in which the school operates its educational activities.

Conceptually:

```text
SCHOOL
   │
   ├── Academic Year 2017 E.C.
   │
   ├── Academic Year 2018 E.C.
   │
   └── Academic Year 2019 E.C.
````

The academic year provides the main context for year-dependent school operations.

---

## 3. Core responsibility

The `academic_years` entity shall:

* Identify an academic year belonging to a school.
* Define the school's academic-year period.
* Provide the parent/context for year-specific academic structures.
* Support the school operating across multiple academic years.
* Allow historical academic years to remain accessible.
* Distinguish current, past, and future academic years.
* Connect year-specific school configuration to the correct period.
* Provide a consistent academic-year reference for reporting and historical records.

The `academic_years` table shall not contain student, teacher, attendance, assessment, or other transactional records directly.

---

## 4. Relationship with `schools`

Each academic year belongs to a school.

Conceptually:

```text
schools
   │
   ├── academic_years
   │      ├── 2017 E.C.
   │      ├── 2018 E.C.
   │      └── 2019 E.C.
```

The relationship is:

```text
One school
    ↓
Many academic years
```

Therefore:

* One school may have many academic years.
* An academic year belongs to one school in the current School-domain model.
* Academic years must not exist without a school association.

The exact foreign-key implementation will be finalized during Prisma design.

---

## 5. Academic year identity

An academic year shall have a unique identity within EduBridge.

Conceptually, the entity must support:

* Internal EduBridge academic-year identifier.
* Academic-year label/name.
* Academic-year start.
* Academic-year end.
* Academic-year status.

The exact physical field names and types are **TBD during Prisma design**.

---

## 6. Academic-year label

The academic year shall have a human-readable representation.

Examples may include:

```text
2017 E.C.
2018 E.C.
2019 E.C.
```

The exact format of the academic-year label shall be decided during implementation.

The system should not rely only on a display string for determining chronological relationships.

Where appropriate, the physical model should maintain structured date/period information separately from the display label.

---

## 7. Academic-year period

An academic year represents a defined educational period.

Conceptually it has:

```text
Start
  ↓
Academic Year
  ↓
End
```

The entity should therefore support the information necessary to determine:

* When the academic year begins.
* When the academic year ends.
* Whether the period is currently active.
* Whether another academic year overlaps it.

The exact representation of Ethiopian calendar dates and/or Gregorian dates must be decided during physical schema design.

The system must not silently assume a calendar representation without an approved project decision.

---

## 8. Academic-year status

An academic year requires a lifecycle/status concept.

Conceptually, it may have states such as:

```text
PLANNED
ACTIVE
COMPLETED
ARCHIVED
```

These values are conceptual.

The final status vocabulary and transition rules are **TBD during Prisma design**.

The purpose of the status is to distinguish the academic year currently being operated from historical and future academic years.

---

## 9. Current academic year

A school may have one academic year that is considered its current operational academic year.

Conceptually:

```text
School
   │
   ├── 2017 E.C. → COMPLETED
   ├── 2018 E.C. → ACTIVE
   └── 2019 E.C. → PLANNED
```

The system should prevent ambiguous situations where multiple academic years are simultaneously treated as the current active year for the same school unless an explicitly approved business rule allows it.

The exact database constraint/implementation is **TBD during Prisma design**.

---

## 10. Historical academic years

Completed academic years must remain available for historical reference.

For example:

```text
School A
   │
   ├── 2016 E.C. → historical
   ├── 2017 E.C. → historical
   ├── 2018 E.C. → historical
   └── 2019 E.C. → current
```

Historical academic years are important because EduBridge must support:

* Student history.
* Historical enrollment.
* Historical class placement.
* Historical teacher assignments.
* Historical attendance.
* Historical assessments.
* Historical performance.
* School-level reporting over time.

Completing an academic year must not delete its related educational records.

---

## 11. Future academic years

EduBridge may allow a school to prepare a future academic year before it becomes active.

A future academic year can provide the context for planning/configuration such as:

* Grades.
* Sections.
* Subjects.
* Teacher assignments.
* Timetable preparation.
* Academic calendar preparation.

The exact workflow for creating and activating future academic years is a feature-level decision and is **TBD during implementation design**.

---

## 12. Academic calendar relationship

The project has a separate entity:

`academic_calendars`

The academic calendar belongs to an academic year.

Conceptually:

```text
academic_years
      │
      └── academic_calendars
             ├── Terms / periods
             ├── Holidays
             ├── Important dates
             └── Academic events
```

The `academic_years` table identifies the academic period.

The `academic_calendars` entity manages the dates and calendar structure within that period.

The exact cardinality and structure will be finalized during Prisma design.

---

## 13. Relationship with grades

Grades offered by a school are academic-year dependent.

The project has already defined:

`school_grades`

Therefore:

```text
academic_year
      │
      └── school_grades
             └── grade
```

This allows a school to offer different grades in different academic years.

For example:

```text
2017 E.C.
   ├── Grade 1
   ├── Grade 2
   └── Grade 3

2018 E.C.
   ├── Grade 1
   ├── Grade 2
   ├── Grade 3
   └── Grade 4
```

The academic year should therefore not contain a simple list of grades.

The relationship is represented through the appropriate academic structure.

---

## 14. Relationship with sections/classes

Sections are specific to an academic year.

Conceptually:

```text
academic_year
      │
      └── school_grades
             │
             └── sections
                    ├── Section A
                    ├── Section B
                    └── Section C
```

This means a section from one academic year must not be assumed to be the same operational section in another academic year.

The same label, such as `10A`, may exist in multiple academic years while representing different student groupings.

---

## 15. Relationship with subjects

Subjects offered by the school are also academic-year dependent.

The project has defined:

`school_subjects`

Conceptually:

```text
academic_year
      │
      └── school_subjects
             └── subject
```

A subject may exist in the global subject catalog while its availability or configuration within a school is specific to an academic year.

The `academic_years` table therefore provides the temporal context.

---

## 16. Relationship with teachers and teaching assignments

Teacher assignments are academic-year dependent.

Conceptually:

```text
academic_year
      │
      └── teacher_assignments
             ├── teacher
             ├── subject
             ├── grade
             └── section
```

A teacher may teach different subjects, grades, or sections in different academic years.

Therefore, the academic year must be part of the teaching-assignment context.

The exact foreign-key structure will be finalized during Prisma design.

---

## 17. Relationship with timetable

A timetable belongs to an academic-year context.

Conceptually:

```text
academic_year
      │
      └── timetable
             └── timetable_entries
                    ├── teacher
                    ├── subject
                    ├── grade
                    ├── section
                    └── period
```

Timetable records from one academic year must remain distinguishable from timetable records belonging to another year.

---

## 18. Relationship with student enrollment

Student participation in a school is academic-year dependent.

The project has explicitly defined:

`student_enrollments`

Conceptually:

```text
student
   │
   └── student_enrollment
          ├── school
          └── academic_year
```

Therefore:

* A student can have multiple enrollment records over time.
* An enrollment record identifies the student's participation during a particular academic year.
* The academic year must not be stored merely as free text on the student.

Example:

```text
Student A
   │
   ├── School A / 2017 E.C.
   ├── School A / 2018 E.C.
   └── School A / 2019 E.C.
```

---

## 19. Relationship with student section placement

Student placement is also year-dependent.

Conceptually:

```text
academic_year
      │
      └── section
             │
             └── student_section_assignment
                    └── student
```

A student's placement in Grade 10 Section A during one academic year must not overwrite their placement from a previous year.

This allows EduBridge to reconstruct historical class placement.

---

## 20. Relationship with attendance

Attendance records belong to an academic context.

Student attendance and teacher attendance should be associated with the appropriate school and academic-year context.

Conceptually:

```text
academic_year
      │
      ├── student_attendance
      │
      └── teacher_attendance
```

The academic year allows reporting such as:

* Attendance for a specific year.
* Attendance by grade.
* Attendance by section.
* Attendance by student.
* Teacher attendance for a specific academic year.

The raw attendance records remain the source of truth.

---

## 21. Relationship with assessments and results

Assessments and results are academic-year dependent.

Conceptually:

```text
academic_year
      │
      ├── assessments
      │
      ├── assessment_results
      │
      └── student_results
```

This ensures that results from different academic years remain separate.

For example:

```text
Student A
   │
   ├── Mathematics result — 2017 E.C.
   ├── Mathematics result — 2018 E.C.
   └── Mathematics result — 2019 E.C.
```

Historical results must remain traceable.

---

## 22. Relationship with learning activities

Learning activities occur within an academic context.

Examples include:

* Assignments.
* Quizzes.
* Class activities.
* Projects.
* Other learning activities.

Conceptually:

```text
academic_year
      │
      └── learning_activities
             └── submissions / completion
```

The exact direct or indirect relationship will be finalized during Prisma design.

---

## 23. Relationship with student support

Student support cases and interventions may occur within an academic year.

Conceptually:

```text
academic_year
      │
      └── student_support_cases
             └── interventions
```

This allows the school to distinguish:

* Support provided in one academic year.
* Support provided in another academic year.
* Historical intervention outcomes.

Support records must remain traceable even after the academic year is completed.

---

## 24. Relationship with school improvement

School improvement activities may be associated with an academic year.

Conceptually:

```text
academic_year
      │
      └── improvement_plans
             ├── activities
             ├── targets
             ├── progress
             └── outcomes
```

This allows a school to evaluate improvement activities within a defined academic period.

The exact relationship is **TBD during Prisma design**.

---

## 25. Academic-year reporting context

The academic year is a major reporting dimension.

EduBridge should be able to produce school reports for:

* Current academic year.
* Previous academic year.
* Multiple academic years.
* Comparisons between academic years.

Examples:

```text
Enrollment
2017 E.C. → 1,120 students
2018 E.C. → 1,180 students
2019 E.C. → 1,245 students
```

The reporting system should derive these values from authoritative records rather than storing them as permanent values in `academic_years`.

---

## 26. Academic-year isolation rule

Year-specific records must not accidentally mix across academic years.

For example:

A student enrolled in Grade 9 in one academic year must not automatically appear as a Grade 10 student in a historical report simply because their current placement changed.

The system must use the correct academic-year context when retrieving:

* Enrollment.
* Grade.
* Section.
* Teacher assignment.
* Attendance.
* Assessment.
* Learning activity.
* Student support.
* Reports.

This is a critical business rule.

---

## 27. Academic-year uniqueness

A school should not accidentally have duplicate academic-year records representing the same academic period.

Conceptually:

```text
School A
   ├── 2018 E.C.  ← valid
   ├── 2019 E.C.  ← valid
   └── 2019 E.C.  ← duplicate, should be prevented
```

The physical database should enforce an appropriate uniqueness rule for the school + academic-year identity.

The exact constraint is **TBD during Prisma design**.

---

## 28. Academic-year overlap

The system should prevent invalid overlapping academic-year periods for the same school where the project requires one continuous academic-year sequence.

The exact rule must account for the calendar system used by EduBridge.

The final validation and database constraints are **TBD during Prisma design**.

---

## 29. Calendar-system consideration

EduBridge is intended for Ethiopian education use.

The academic-year model must therefore not assume that a simple Gregorian-year model is sufficient.

The implementation must explicitly determine how the project represents:

* Ethiopian academic-year labels.
* Academic-year start dates.
* Academic-year end dates.
* Gregorian dates used by technical infrastructure where necessary.
* Academic calendar periods.

This decision must be made before finalizing date-related Prisma fields.

No specific implementation should be assumed at the conceptual stage.

---

## 30. Academic-year activation

An academic year may move through a lifecycle such as:

```text
PLANNED
   ↓
ACTIVE
   ↓
COMPLETED
   ↓
ARCHIVED
```

The exact transitions are **TBD**.

The platform should ensure that only authorized school users can perform lifecycle operations.

For example, a teacher should not normally be able to activate or close the school's academic year.

---

## 31. Historical preservation

Completing or archiving an academic year must not delete its educational records.

Historical data associated with the year must remain available for:

* Student history.
* School reporting.
* Teacher history.
* Attendance history.
* Assessment history.
* Learning history.
* Intervention history.
* School improvement history.
* Higher-level reporting/aggregation.

---

## 32. Source-of-truth rule

`academic_years` is the source of truth for:

* The academic-year identity within a school.
* The school's academic-year lifecycle.
* The temporal context for year-specific school operations.

`academic_years` is NOT the source of truth for:

* Students.
* Student identity.
* Teachers.
* Teacher identity.
* Grades themselves.
* Subjects themselves.
* Attendance.
* Assessments.
* Results.
* Learning activities.
* Student interventions.
* School improvement activities.
* Calculated school statistics.

Those belong to their respective entities.

---

## 33. AI boundary

AI features may use academic-year data for:

* Year-based performance analysis.
* Attendance trend analysis.
* Comparison of academic years.
* School planning assistance.
* Natural-language reporting.
* Early-warning analysis.

AI must not silently modify:

* Academic-year identity.
* Academic-year dates.
* Academic-year status.
* Historical academic records.

Any change to an academic year must be performed through an authorized platform action.

---

## 34. Audit requirements

Important academic-year changes should be auditable.

The system should be able to determine:

```text
Who created the academic year?
Who changed its dates?
Who changed its status?
When was the change made?
What was the previous value?
What is the new value?
```

The project-wide audit mechanisms are:

* `audit_logs`
* `data_change_history`

The academic-year entity should integrate with those mechanisms.

---

## 35. Authorization requirements

Academic-year operations must respect school scope and role permissions.

Conceptually:

* School principal/administrator can manage academic-year configuration.
* Academic leader can perform authorized academic configuration tasks.
* Teachers can use the active academic year for teaching operations.
* Students can access information associated with their active enrollment/year.
* Parents can access information associated with their child's relevant academic year.
* Higher-level education users can access academic-year information according to their authorized organizational scope.
* Platform administrators manage platform infrastructure and should not automatically have unrestricted authority over educational decisions.

The exact permission matrix is defined by the authorization model.

---

## 36. Deletion and archival rule

An academic year with related educational records should not be hard-deleted.

The preferred conceptual lifecycle is:

```text
Planned
   ↓
Active
   ↓
Completed
   ↓
Archived
```

Historical academic records must remain intact.

The exact soft-delete/archive strategy is **TBD during Prisma design**.

---

## 37. Constraints to decide during Prisma design

The following must be explicitly decided:

* Primary key strategy.
* Foreign key to `schools`.
* Academic-year identifier strategy.
* Academic-year label format.
* Start/end date representation.
* Ethiopian calendar representation.
* Gregorian technical date representation if required.
* Status enum/reference strategy.
* School + academic-year uniqueness.
* Current-year uniqueness rule.
* Overlap validation.
* Required versus optional fields.
* Indexes.
* Foreign-key behavior.
* Archive strategy.
* Audit strategy.
* Tenant/school isolation.

---

## 38. Fields explicitly NOT decided yet

The following are intentionally not finalized:

* Exact Prisma field names.
* UUID versus integer identifiers.
* Exact Prisma scalar types.
* Exact enum values.
* Exact date/calendar implementation.
* Exact uniqueness constraints.
* Exact indexes.
* Exact audit columns.
* Exact archive fields.
* Exact foreign-key implementation.

These will be decided during physical Prisma/database design.

---

## 39. Core conceptual relationships

```text
schools
   │
   └── 1 : N
          │
          ▼
    academic_years
          │
          ├── 1 : N → academic_calendars
          │
          ├── 1 : N → school_grades
          │                 └── sections
          │
          ├── 1 : N → school_subjects
          │
          ├── 1 : N → teacher_assignments
          │
          ├── 1 : N → timetables
          │
          ├── 1 : N → student_enrollments
          │
          ├── 1 : N → student_section_assignments
          │
          ├── 1 : N → attendance records
          │
          ├── 1 : N → assessments
          │
          ├── 1 : N → learning_activities
          │
          ├── 1 : N → student_support / interventions
          │
          └── 1 : N → school improvement records
```

The exact direct versus indirect relationships will be finalized during Prisma schema design.

---

## 40. Conceptual definition

The `academic_years` table can be summarized as:

> **The school-specific academic period that provides the temporal context for year-dependent educational operations.**

It connects the long-lived school institution to the specific academic period in which students, teachers, classes, subjects, attendance, assessments, learning activities, support, and school improvement activities occur.

---

## 41. Implementation readiness

This entity is conceptually defined and ready to be converted into a physical Prisma model later.

The physical schema must be designed only after the conceptual table inventory and table-level business rules are sufficiently established.

---

## Status

**Conceptual status:** APPROVED

**Physical Prisma schema:** NOT YET CREATED

**Columns:** NOT YET FINALIZED

**Relationships:** CONCEPTUALLY DEFINED

**Constraints:** NOT YET FINALIZED

**Indexes:** NOT YET FINALIZED

**API contract:** NOT YET DEFINED

**Migration:** NOT YET CREATED

```
```
