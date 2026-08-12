````md
# EduBridge — School Database

# Table 01: `schools`

## 1. Entity

**Table:** `schools`

**Domain:** School

**Category:** Core

**Status:** Conceptually approved

**Source of truth:** School institutional identity

---

## 2. Purpose

The `schools` table represents the school institution itself.

A school is a long-lived institution in EduBridge. It exists independently of a particular academic year.

The same school may have many academic years, many students, many teachers, many sections, many subjects, and many operational records over time.

Therefore, `schools` must represent the **institution**, not a specific school-year operation.

For example:

```text
School
   │
   ├── Academic Year 2017 E.C.
   │      ├── Students
   │      ├── Teachers
   │      ├── Sections
   │      └── Academic operations
   │
   ├── Academic Year 2018 E.C.
   │      ├── Students
   │      ├── Teachers
   │      ├── Sections
   │      └── Academic operations
   │
   └── Academic Year 2019 E.C.
          ├── Students
          ├── Teachers
          ├── Sections
          └── Academic operations
````

The school record must therefore remain stable across academic years.

---

## 3. Core responsibility

The `schools` entity shall:

* Identify a school within EduBridge.
* Represent the school institution.
* Store the school's recognized identity.
* Store the school's basic institutional classification.
* Store the school's administrative/geographic placement.
* Store basic institutional contact information.
* Store the school's platform lifecycle status.
* Provide the parent entity for school-level academic and operational data.
* Allow other EduBridge domains to reference a school consistently.
* Support integration with authoritative education-system identifiers where available.

The `schools` table shall **not** become a container for operational school data.

---

## 4. What `schools` owns

The `schools` entity owns information describing:

* Who the school is.
* How the school is identified.
* What type of school it is.
* Where the school belongs administratively.
* How the school can be contacted.
* Whether the school is active within EduBridge.

It does not own:

* Students.
* Teachers.
* Parents.
* Academic years.
* Grades being offered in a particular year.
* Sections/classes.
* Subjects being offered in a particular year.
* Timetables.
* Attendance.
* Assessments.
* Results.
* Assignments.
* Student interventions.
* School improvement activities.

Those belong to their respective entities.

---

## 5. School identity

The school shall have an EduBridge internal identity.

Conceptually, the school identity must support:

* Internal EduBridge school identifier.
* Official/recognized school identifier.
* School code/reference.
* Official school name.
* School status.

### Internal EduBridge identifier

EduBridge shall maintain its own unique identifier for every school.

This identifier is used internally to establish relationships between the school and other EduBridge entities.

The internal identifier is controlled by EduBridge.

### Official/recognized identifier

EduBridge should support an identifier originating from the relevant authoritative education system where such an identifier exists.

The official identifier and EduBridge internal identifier are different concepts.

EduBridge must not assume that its generated identifier replaces an official education-system identifier.

### School code

Where the authoritative education system provides a school code/reference, EduBridge should be able to store and reference it.

The exact representation and uniqueness rules for official identifiers and school codes shall be finalized during physical database/Prisma design.

---

## 6. School name

The school record shall contain the recognized school name.

The name should represent the institution rather than a specific academic year.

Changing the display/name of a school should not create a new school entity unless the underlying institution itself is genuinely a different institution.

Historical changes to important identity information must remain traceable through the platform's audit/history mechanisms.

---

## 7. School classification

The school shall support institutional classification required by EduBridge.

Conceptually this includes:

* Education sector/level.
* School type.
* Ownership.
* Other authoritative classification values required by the education system.

Examples of education-sector classifications that may need to be represented include:

* Pre-primary.
* Primary.
* Secondary.
* ABE/program-related classification.

The exact controlled vocabulary shall **not be invented at this stage**.

Reference values should be confirmed against the authoritative Ministry/education data source before the Prisma schema is finalized.

---

## 8. School ownership

The school shall support the classification of institutional ownership where required.

Examples may include categories such as:

* Government/public.
* Private.
* Other officially recognized ownership categories.

The final allowed values must be based on the authoritative education-system classification used by the project.

The database implementation shall use controlled/reference values rather than unrestricted free text where appropriate.

---

## 9. Administrative and geographic identity

A school must be connected to the administrative hierarchy used by EduBridge.

The conceptual hierarchy is:

```text
REGION
   │
   └── ZONE / SUB-CITY
          │
          └── WOREDA
                 │
                 └── KEBELE / LOCAL AREA
                        │
                        └── SCHOOL
```

The school should therefore be associated with the appropriate geographic/administrative entities.

Conceptually:

```text
schools
   │
   ├── region
   ├── zone / sub-city
   ├── woreda
   └── kebele / local area
```

However, the school should not store these administrative names as uncontrolled text if the platform has structured geographic reference tables.

The approved conceptual model contains:

* `regions`
* `zones`
* `woredas`
* `kebeles`
* `school_geographic_assignments`

The final relationship/cardinality will be determined during physical Prisma/database design.

---

## 10. School geographic assignment

The project has already decided that geographic hierarchy should be represented separately from the school itself.

The conceptual supporting entity is:

`school_geographic_assignments`

Its purpose is to associate a school with the appropriate administrative hierarchy.

This separation allows EduBridge to avoid treating geographic names as arbitrary school text fields.

It also supports the future requirement that school information can be viewed hierarchically from:

```text
Federal
   ↓
Region
   ↓
Zone
   ↓
Woreda
   ↓
School
```

The exact implementation of current versus historical geographic assignments remains **TBD during Prisma/database design**.

---

## 11. School contact information

The school may contain basic institutional contact information required for normal EduBridge operation.

Conceptually this may include:

* Official phone/contact number.
* Official email address.
* Physical/location description.
* Other institutional contact information required by the platform.

Contact information belongs to the school institution.

Individual teacher, student, and parent contact information must remain in their respective entities.

The exact fields and normalization strategy are **TBD during Prisma/database design**.

---

## 12. School location

The school should support location information required for institutional identification and future platform capabilities.

This may include:

* Administrative location.
* Local area/kebele.
* Physical address information.
* Geographic coordinates where required and legally/operationally appropriate.

Administrative hierarchy and physical/geographic location are related but should not automatically be treated as the same concept.

The exact representation is **TBD during physical schema design**.

---

## 13. School status

The school shall have a lifecycle/status concept.

The purpose is to determine whether the school is currently active and available for normal EduBridge operations.

Conceptually, status may distinguish states such as:

```text
ACTIVE
INACTIVE
SUSPENDED
ARCHIVED
```

These values are conceptual only.

The final status vocabulary and transition rules shall be determined during Prisma/database design.

A school becoming inactive should not automatically delete its historical academic data.

Historical records must remain traceable.

---

## 14. School lifecycle

A school has a lifecycle independent of academic years.

Conceptually:

```text
School created
      ↓
School onboarded
      ↓
School active
      ↓
School may become inactive/suspended
      ↓
School may be archived
```

The platform should preserve historical records associated with the school.

Deleting the school institution should therefore not be treated as an ordinary deletion operation.

The final archive/deactivation strategy is **TBD during physical database design**.

---

## 15. Relationship with academic years

A school can have many academic years.

Conceptually:

```text
schools
   │
   └── academic_years
          ├── Academic Year A
          ├── Academic Year B
          └── Academic Year C
```

Therefore:

* One school can have many academic years.
* Each academic year belongs to one school in the current School-domain model.
* Academic-year-specific information must not be stored directly in `schools`.

Examples of information that should NOT be stored in `schools`:

* Current academic year.
* Current grade offerings.
* Current sections.
* Current subjects.
* Current timetable.
* Current enrollment count.

Those belong to academic-year or derived/reporting entities.

---

## 16. Relationship with students

A school can have many students over time.

The relationship is not:

```text
school → student
```

alone.

The project has explicitly decided to distinguish:

```text
students
    ↓
student_enrollments
    ↓
school + academic_year
```

Therefore:

* `students` represents the student/person.
* `student_enrollments` represents participation in a school during an academic year.
* `schools` represents the institution.

This separation is required for historical enrollment and school transitions.

---

## 17. Relationship with teachers

A school can have many teachers and staff.

Teacher identity is represented separately in:

`teachers`

The relationship between teachers and their actual teaching responsibilities is represented through:

`teacher_assignments`

Therefore the school record must not directly contain lists of teachers or teaching assignments.

Conceptually:

```text
schools
   │
   └── teachers
          │
          └── teacher_assignments
                 ├── subject
                 ├── grade
                 └── section
```

---

## 18. Relationship with academic structure

The school is the root institutional entity for the academic structure.

Conceptually:

```text
SCHOOL
   │
   └── ACADEMIC YEAR
          │
          ├── SCHOOL GRADES
          │      └── SECTIONS
          │
          ├── SCHOOL SUBJECTS
          │
          └── TIMETABLE
```

The `schools` table should therefore provide the institutional reference required by these entities.

It should not duplicate their operational information.

---

## 19. Relationship with school operations

The following domains ultimately belong to a school:

* Student enrollment.
* Student placement.
* Teacher assignments.
* Attendance.
* Assessments.
* Learning activities.
* Student support.
* Parent relationships.
* Communication.
* School improvement.
* Reports and analytics.

These domains should reference the school directly or indirectly through their authoritative parent entities.

The school entity remains the institutional root.

---

## 20. Relationship with reporting

School-level reports and analytics may use `schools` as their institutional dimension.

Examples:

* School enrollment.
* School attendance.
* School assessment performance.
* School teacher statistics.
* School student-support statistics.
* School improvement indicators.

However, the `schools` table itself should not store calculated statistics such as:

* Total students.
* Attendance percentage.
* Average school grade.
* Number of teachers.
* Performance percentage.

These values should normally be calculated from authoritative transactional records or maintained in explicitly derived reporting structures.

---

## 21. Relationship with Ministry / external systems

EduBridge is not intended to replace the national EMIS or other government systems.

The school entity should therefore be designed so that it can integrate with authoritative external education systems when required.

Conceptually:

```text
External / Government Education System
                │
                │ authoritative identifier/data
                ↓
             EduBridge
                │
                ↓
             schools
```

EduBridge should be able to associate its internal school identity with external/official identifiers.

The exact integration mechanism is outside the physical definition of this table and will be handled by the integration/API architecture.

---

## 22. Source-of-truth rule

`schools` is the source of truth for:

* EduBridge school identity.
* EduBridge school lifecycle status.
* Core institutional school information maintained by EduBridge.

`schools` is NOT the source of truth for:

* Student identity.
* Teacher identity.
* Parent identity.
* Academic-year operations.
* Student enrollment.
* Student attendance.
* Teacher attendance.
* Assessment results.
* Learning activities.
* Student interventions.
* Communication records.
* School improvement activities.
* Calculated school analytics.

Each of those belongs to its designated domain entity.

---

## 23. Historical data rule

A school record must remain compatible with historical academic records.

For example:

```text
School A
   │
   ├── 2017 E.C.
   │      └── historical student/teacher/academic data
   │
   ├── 2018 E.C.
   │      └── historical student/teacher/academic data
   │
   └── 2019 E.C.
          └── current student/teacher/academic data
```

Changes to the school's current configuration must not destroy historical academic records.

Historical relationships must remain reconstructable.

---

## 24. Audit requirements

Important changes to school identity or institutional information must be auditable.

The platform should be able to answer:

```text
Who changed the school information?
What was changed?
When was it changed?
What was the previous value?
What is the new value?
```

The project already defines:

* `audit_logs`
* `data_change_history`

These are responsible for the platform-wide traceability mechanism.

The `schools` entity should therefore be designed to work with those audit mechanisms rather than implementing an unrelated audit system.

---

## 25. Authorization requirements

Access to a school record must respect organizational scope.

Examples:

* A school administrator may manage their own school.
* A teacher may access school information necessary for their role.
* A student may access only school information appropriate to the student.
* A parent may access school information relevant to their child.
* Woreda/regional/federal users may access school information according to their authorized hierarchy.
* EduBridge platform administrators may manage platform configuration without automatically receiving unrestricted educational-data access.

The exact permission matrix is defined by the authorization model, not by the `schools` table itself.

---

## 26. Multi-school / tenant consideration

EduBridge is intended to operate as a SaaS platform.

Therefore the school entity must support a future environment where many schools exist in the same platform.

Conceptually:

```text
EduBridge
   │
   ├── School A
   ├── School B
   ├── School C
   └── School D
```

Data belonging to one school must not become visible to another school unless explicitly authorized.

The physical tenant/isolation strategy is **TBD during Prisma/database design**.

The final implementation must establish a reliable school-scope boundary.

---

## 27. AI boundary

AI features may use school information for:

* School-level summaries.
* Operational insights.
* Pattern detection.
* Recommendations.
* Natural-language analytics.

However, AI must not become the source of truth for the school's institutional identity.

AI must not silently:

* Rename a school.
* Change official school identifiers.
* Change school ownership.
* Change administrative assignment.
* Activate/deactivate a school.
* Modify authoritative school records.

AI output must remain advisory unless an authorized human explicitly performs an allowed action.

---

## 28. Files and documents

The `schools` entity may have files/documents associated with it.

The project has a central file model:

* `files`
* `document_links`

Therefore, school documents should normally use the central file/document mechanism rather than creating a separate physical file-storage implementation inside `schools`.

Examples may include:

* Institutional documents.
* Authorized school documents.
* School-related supporting documentation.

The exact document categories are **TBD based on actual implementation requirements**.

---

## 29. Deletion rule

A school should not be hard-deleted if it has historical educational records.

Because other entities may reference the school, deletion could destroy historical relationships.

The preferred conceptual approach is:

```text
Active school
     ↓
Inactive / suspended
     ↓
Archived
```

rather than destructive deletion.

The final database deletion/archival policy is **TBD during Prisma design**.

---

## 30. Constraints to decide during Prisma design

The following must be explicitly decided when converting this conceptual entity into a Prisma model:

* Primary key strategy.
* Internal identifier type.
* Official identifier uniqueness.
* School-code uniqueness.
* Required versus optional identity fields.
* School-name requirements.
* Classification reference strategy.
* Ownership reference strategy.
* Geographic foreign keys.
* Geographic assignment cardinality.
* Contact-field normalization.
* Status enum/reference strategy.
* Created/updated timestamps.
* Archive/deactivation strategy.
* Soft-delete policy.
* Audit integration.
* Tenant/school isolation.
* Indexes.
* Foreign-key behavior.
* Unique constraints.

No physical decision should be invented here unless it has already been approved.

---

## 31. Fields explicitly NOT decided yet

The following are intentionally not finalized in this conceptual document:

* Exact column names beyond the entity/table name.
* UUID versus integer identifiers.
* Exact Prisma scalar types.
* Exact enum values.
* Exact geographic foreign-key structure.
* Exact address structure.
* Exact contact structure.
* Exact external identifier structure.
* Exact audit columns.
* Exact soft-delete columns.
* Exact indexes.
* Exact database constraints.

These will be decided during the physical Prisma/database design phase.

---

## 32. Core relationships summary

```text
schools
   │
   ├── 1 : N → academic_years
   │
   ├── 1 : N → student_enrollments
   │
   ├── 1 : N → teachers / school_staff
   │
   ├── 1 : N → school_grades
   │
   ├── 1 : N → school_subjects
   │
   ├── 1 : N → timetables
   │
   ├── 1 : N → student_attendance
   │
   ├── 1 : N → teacher_attendance
   │
   ├── 1 : N → assessments / results
   │
   ├── 1 : N → learning_activities
   │
   ├── 1 : N → student_support_cases
   │
   ├── 1 : N → announcements
   │
   ├── 1 : N → school_problems / improvement_plans
   │
   └── 1 : N → school_geographic_assignments
```

The exact direct versus indirect foreign-key relationships will be finalized during Prisma schema design.

---

## 33. Conceptual definition

The `schools` table can be summarized as:

> **The institutional identity and lifecycle record of a school in EduBridge.**

It is the stable root entity for school-level operations across multiple academic years.

It identifies **which school** the rest of the School domain belongs to.

It does not attempt to contain the operational data of the school.

---

## 34. Implementation readiness

This entity is ready to proceed to physical Prisma/database design after the remaining conceptual table documents are established.

The next table in the approved inventory is:

`academic_years`

The `academic_years` entity will define the school's academic-year context and become the major parent/context for year-specific grades, sections, subjects, teaching assignments, timetables, attendance, assessments, and other academic operations.

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
