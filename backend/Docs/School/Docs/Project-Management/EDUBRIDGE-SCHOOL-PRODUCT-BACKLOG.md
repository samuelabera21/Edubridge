


````markdown
# EduBridge — School Product Backlog

**Document:** EduBridge School Product Backlog  
**Version:** 1.0  
**Status:** Initial Baseline  
**Domain:** School  
**Product:** EduBridge  
**Scope:** School-level implementation  
**Source:** Approved SRS + approved School actors + approved School features  
**Purpose:** Master backlog for incremental development of the EduBridge School domain

---

# 1. Purpose

This document is the master Product Backlog for the EduBridge School domain.

It translates the approved:

- System Requirements Specification (SRS)
- School actors
- Actor responsibilities
- School features
- Business goals

into development-oriented Product Backlog Items (PBIs).

This backlog is the bridge between requirements and Sprint execution.

It is NOT:

- a database design
- a Prisma schema
- an API specification
- a Sprint Backlog
- a technical task list
- a fixed implementation plan

Those artifacts will be created only when the relevant backlog items are selected and refined for implementation.

---

# 2. Product Goal

EduBridge shall provide a structured digital education platform that supports school operations, teaching and learning, student support, communication, school improvement, analytics, and authorized information flow to higher administrative levels.

The School domain is the first implementation scope.

---

# 3. Backlog Principles

The Product Backlog shall follow these principles:

1. Requirements may evolve as the team learns.
2. Existing SRS requirements are the baseline, not an irreversible contract.
3. Changes must be reviewed and documented.
4. New discoveries may create new backlog items.
5. Existing backlog items may be changed, split, merged, reordered, or removed.
6. Technical implementation details belong in refinement and Sprint planning.
7. A feature is not automatically a Sprint item.
8. Priority is based on value, dependency, risk, and implementation readiness.
9. Every major backlog item should be traceable to its originating requirement or business capability.
10. The backlog remains the single ordered list of future product work.

---

# 4. Backlog Hierarchy

EduBridge backlog items shall normally follow:

```text
PRODUCT GOAL
    ↓
EPIC
    ↓
FEATURE
    ↓
PRODUCT BACKLOG ITEM
    ↓
USER STORY / USE CASE
    ↓
ACCEPTANCE CRITERIA
    ↓
TECHNICAL TASKS
````

Not every item must contain every level.

Technical tasks are created only after a Product Backlog Item is selected for refinement.

---

# 5. Backlog Status

Allowed statuses:

```text
IDEA
↓
DISCOVERED
↓
DEFINED
↓
REFINED
↓
READY
↓
SELECTED
↓
IN PROGRESS
↓
DONE
```

Additional status:

```text
DEFERRED
REMOVED
BLOCKED
```

---

# 6. Priority

Initial priority levels:

| Priority | Meaning                                                         |
| -------- | --------------------------------------------------------------- |
| P0       | Critical foundation / must exist before dependent functionality |
| P1       | High-value core capability                                      |
| P2       | Important capability                                            |
| P3       | Useful enhancement                                              |
| P4       | Future / optional                                               |

Priority may change during backlog refinement.

---

# 7. Backlog Item Format

Every significant Product Backlog Item should contain:

```text
ID
Epic
Feature
Actor
Description
Business Value
Source Requirement
Dependencies
Priority
Status
```

Detailed acceptance criteria and technical tasks are added during refinement.

---

# 8. School Product Backlog

## EPIC E01 — Platform Foundation

### PBIs

| ID      | Feature               | Actor                    | Description                                                               | Priority | Status |
| ------- | --------------------- | ------------------------ | ------------------------------------------------------------------------- | -------- | ------ |
| PBI-001 | User Identity         | Administrator            | Provide authenticated platform identities for authorized EduBridge users. | P0       | IDEA   |
| PBI-002 | Authentication        | All authenticated actors | Allow authorized users to securely authenticate into EduBridge.           | P0       | IDEA   |
| PBI-003 | Role Management       | Administrator            | Allow authorized administrators to manage user roles.                     | P0       | IDEA   |
| PBI-004 | Permission Management | Administrator            | Control capabilities available to each role.                              | P0       | IDEA   |
| PBI-005 | School Scope          | Administrator            | Restrict users to their authorized school/organizational scope.           | P0       | IDEA   |
| PBI-006 | Audit Foundation      | Administrator            | Record important security and data-changing operations.                   | P1       | IDEA   |

---

# EPIC E02 — School Management

### PBIs

| ID      | Feature                        | Actor                | Description                                                                    | Priority | Status |
| ------- | ------------------------------ | -------------------- | ------------------------------------------------------------------------------ | -------- | ------ |
| PBI-007 | School Profile                 | School Administrator | Manage the school's identity and operational information.                      | P1       | IDEA   |
| PBI-008 | School Classification          | School Administrator | Manage school type, ownership, sector and related classification.              | P1       | IDEA   |
| PBI-009 | School Administrative Location | School Administrator | Associate the school with the appropriate administrative/geographic hierarchy. | P1       | IDEA   |
| PBI-010 | School Settings                | School Administrator | Manage authorized school-level configuration.                                  | P1       | IDEA   |

---

# EPIC E03 — Academic Organization

### PBIs

| ID      | Feature               | Actor                                  | Description                                                    | Priority | Status |
| ------- | --------------------- | -------------------------------------- | -------------------------------------------------------------- | -------- | ------ |
| PBI-011 | Academic Year         | School Administrator / Academic Leader | Create and manage academic years.                              | P0       | IDEA   |
| PBI-012 | Academic Calendar     | Academic Leader                        | Manage important academic dates and periods.                   | P1       | IDEA   |
| PBI-013 | Grades                | Academic Leader                        | Manage grades/levels used by the school.                       | P1       | IDEA   |
| PBI-014 | Sections              | Academic Leader                        | Create and manage classes/sections within academic structures. | P1       | IDEA   |
| PBI-015 | Subjects              | Academic Leader                        | Manage school subjects.                                        | P1       | IDEA   |
| PBI-016 | Academic Organization | Academic Leader                        | Connect academic years, grades, sections and subjects.         | P1       | IDEA   |

---

# EPIC E04 — Student Management

### PBIs

| ID      | Feature              | Actor                | Description                                          | Priority | Status |
| ------- | -------------------- | -------------------- | ---------------------------------------------------- | -------- | ------ |
| PBI-017 | Student Registration | School Administrator | Register students in the school.                     | P0       | IDEA   |
| PBI-018 | Student Profile      | School Administrator | Maintain authorized student information.             | P0       | IDEA   |
| PBI-019 | Enrollment           | School Administrator | Enroll students into an academic year.               | P0       | IDEA   |
| PBI-020 | Section Placement    | Academic Leader      | Place students into appropriate grades and sections. | P0       | IDEA   |
| PBI-021 | Student Status       | School Administrator | Manage student lifecycle/status information.         | P1       | IDEA   |
| PBI-022 | Student Transfer     | School Administrator | Record authorized student transfers.                 | P1       | IDEA   |
| PBI-023 | Student History      | School Administrator | Preserve traceable student academic/school history.  | P1       | IDEA   |
| PBI-024 | Student Documents    | School Administrator | Manage authorized student documents.                 | P2       | IDEA   |

---

# EPIC E05 — Teacher and Staff Management

### PBIs

| ID      | Feature                  | Actor                | Description                                              | Priority | Status |
| ------- | ------------------------ | -------------------- | -------------------------------------------------------- | -------- | ------ |
| PBI-025 | Teacher Profile          | School Administrator | Maintain teacher professional information.               | P1       | IDEA   |
| PBI-026 | Staff Profile            | School Administrator | Maintain school support-staff information.               | P1       | IDEA   |
| PBI-027 | Teacher Assignment       | Academic Leader      | Assign teachers to subjects, grades and sections.        | P0       | IDEA   |
| PBI-028 | Teacher Workload         | Academic Leader      | Monitor teaching workload.                               | P2       | IDEA   |
| PBI-029 | Professional Development | Academic Leader      | Record teacher professional-development activities.      | P2       | IDEA   |
| PBI-030 | Teacher Qualifications   | School Administrator | Maintain relevant teacher qualifications/certifications. | P2       | IDEA   |

---

# EPIC E06 — Classes, Teaching and Timetable

### PBIs

| ID      | Feature                      | Actor                     | Description                                                     | Priority | Status |
| ------- | ---------------------------- | ------------------------- | --------------------------------------------------------------- | -------- | ------ |
| PBI-031 | Teaching Assignment          | Academic Leader           | Establish teacher-subject-grade-section teaching relationships. | P0       | IDEA   |
| PBI-032 | Timetable                    | Academic Leader           | Create and manage school timetables.                            | P1       | IDEA   |
| PBI-033 | Timetable Conflict Detection | Academic Leader           | Detect scheduling conflicts.                                    | P2       | IDEA   |
| PBI-034 | Teacher Timetable            | Teacher                   | View assigned teaching schedule.                                | P1       | IDEA   |
| PBI-035 | Student/Class Timetable      | Student / Teacher         | View authorized class schedules.                                | P1       | IDEA   |
| PBI-036 | Curriculum Progress          | Teacher / Academic Leader | Track curriculum/teaching progress.                             | P2       | IDEA   |

---

# EPIC E07 — Attendance

### PBIs

| ID      | Feature                | Actor                     | Description                                         | Priority | Status |
| ------- | ---------------------- | ------------------------- | --------------------------------------------------- | -------- | ------ |
| PBI-037 | Student Attendance     | Teacher                   | Record student attendance.                          | P0       | IDEA   |
| PBI-038 | Attendance History     | Teacher / Academic Leader | View student attendance history.                    | P1       | IDEA   |
| PBI-039 | Absence Reason         | Teacher / Administrator   | Record controlled absence reasons.                  | P1       | IDEA   |
| PBI-040 | Attendance Explanation | Parent / Guardian         | Submit permitted absence explanations.              | P2       | IDEA   |
| PBI-041 | Attendance Correction  | Authorized Staff          | Correct attendance through an auditable workflow.   | P1       | IDEA   |
| PBI-042 | Attendance Alerts      | School / Parent           | Generate and deliver appropriate attendance alerts. | P1       | IDEA   |
| PBI-043 | Teacher Attendance     | School Administrator      | Record and monitor teacher attendance.              | P1       | IDEA   |

---

# EPIC E08 — Assessment and Results

### PBIs

| ID      | Feature             | Actor                     | Description                                          | Priority | Status |
| ------- | ------------------- | ------------------------- | ---------------------------------------------------- | -------- | ------ |
| PBI-044 | Assessment Creation | Teacher                   | Create school-level assessments.                     | P0       | IDEA   |
| PBI-045 | Assessment Items    | Teacher                   | Define assessment questions/tasks where applicable.  | P2       | IDEA   |
| PBI-046 | Assessment Results  | Teacher                   | Record student assessment results.                   | P0       | IDEA   |
| PBI-047 | Gradebook           | Teacher                   | Maintain subject/class gradebooks.                   | P1       | IDEA   |
| PBI-048 | Reporting Periods   | Academic Leader           | Define result/reporting periods.                     | P1       | IDEA   |
| PBI-049 | Student Results     | Teacher / Academic Leader | Produce authorized school-level student results.     | P1       | IDEA   |
| PBI-050 | Teacher Feedback    | Teacher                   | Provide learning/result feedback.                    | P1       | IDEA   |
| PBI-051 | Performance Trends  | Teacher / Academic Leader | Analyze authorized student/class performance trends. | P2       | IDEA   |

---

# EPIC E09 — Learning Activities

### PBIs

| ID      | Feature             | Actor             | Description                                           | Priority | Status |
| ------- | ------------------- | ----------------- | ----------------------------------------------------- | -------- | ------ |
| PBI-052 | Learning Activity   | Teacher           | Create assignments, quizzes, projects and activities. | P1       | IDEA   |
| PBI-053 | Activity Assignment | Teacher           | Assign activities to students/classes.                | P1       | IDEA   |
| PBI-054 | Submission          | Student           | Submit assigned work.                                 | P1       | IDEA   |
| PBI-055 | Completion Tracking | Teacher / Student | Track activity completion.                            | P1       | IDEA   |
| PBI-056 | Activity Feedback   | Teacher           | Provide feedback on learning activities.              | P1       | IDEA   |

---

# EPIC E10 — Learning Resources

### PBIs

| ID      | Feature                  | Actor            | Description                                                                  | Priority | Status |
| ------- | ------------------------ | ---------------- | ---------------------------------------------------------------------------- | -------- | ------ |
| PBI-057 | Learning Resources       | Teacher          | Manage/reference learning resources.                                         | P2       | IDEA   |
| PBI-058 | Approved Resources       | School           | Maintain school-approved resources.                                          | P2       | IDEA   |
| PBI-059 | External Resource Links  | Teacher          | Reference authorized external learning resources.                            | P2       | IDEA   |
| PBI-060 | Ministry LMS Integration | Authorized Users | Reference/connect to authorized Ministry learning resources where supported. | P3       | IDEA   |

---

# EPIC E11 — Student Support

### PBIs

| ID      | Feature               | Actor                           | Description                                      | Priority | Status |
| ------- | --------------------- | ------------------------------- | ------------------------------------------------ | -------- | ------ |
| PBI-061 | Support Case          | Academic Leader / Support Staff | Record and manage student support cases.         | P1       | IDEA   |
| PBI-062 | Learning Difficulty   | Authorized Staff                | Record appropriate learning-support information. | P2       | IDEA   |
| PBI-063 | Intervention Plan     | Support Staff / Academic Leader | Create student intervention plans.               | P1       | IDEA   |
| PBI-064 | Intervention Sessions | Support Staff                   | Record intervention activities/sessions.         | P2       | IDEA   |
| PBI-065 | Intervention Outcomes | Support Staff / Academic Leader | Track intervention outcomes.                     | P2       | IDEA   |

---

# EPIC E12 — Parent and Guardian Services

### PBIs

| ID      | Feature                       | Actor                | Description                                                 | Priority | Status |
| ------- | ----------------------------- | -------------------- | ----------------------------------------------------------- | -------- | ------ |
| PBI-066 | Guardian Profile              | School Administrator | Maintain parent/guardian information.                       | P1       | IDEA   |
| PBI-067 | Student-Guardian Relationship | School Administrator | Establish authorized student-parent/guardian relationships. | P0       | IDEA   |
| PBI-068 | Parent Student View           | Parent / Guardian    | View permitted information about linked students.           | P1       | IDEA   |
| PBI-069 | Parent Meetings               | School / Parent      | Manage parent-teacher/school meetings.                      | P2       | IDEA   |
| PBI-070 | Guardian Consent              | Parent / Guardian    | Record required consent/confirmation.                       | P2       | IDEA   |

---

# EPIC E13 — Communication and Notifications

### PBIs

| ID      | Feature                  | Actor                | Description                                               | Priority | Status |
| ------- | ------------------------ | -------------------- | --------------------------------------------------------- | -------- | ------ |
| PBI-071 | Announcements            | School Administrator | Publish authorized school announcements.                  | P1       | IDEA   |
| PBI-072 | Messaging                | Authorized Users     | Provide controlled communication between relevant actors. | P1       | IDEA   |
| PBI-073 | Notifications            | System               | Notify users about relevant events.                       | P1       | IDEA   |
| PBI-074 | Notification Preferences | Users                | Manage permitted notification preferences.                | P2       | IDEA   |
| PBI-075 | Notification Delivery    | System               | Track notification delivery status.                       | P2       | IDEA   |

---

# EPIC E14 — School Improvement

### PBIs

| ID      | Feature                | Actor             | Description                             | Priority | Status |
| ------- | ---------------------- | ----------------- | --------------------------------------- | -------- | ------ |
| PBI-076 | School Problems        | School Leadership | Record school-level problems/issues.    | P2       | IDEA   |
| PBI-077 | Improvement Priorities | School Leadership | Define improvement priorities.          | P2       | IDEA   |
| PBI-078 | Improvement Plans      | School Leadership | Create school improvement plans.        | P2       | IDEA   |
| PBI-079 | Improvement Activities | School Leadership | Manage actions under improvement plans. | P2       | IDEA   |
| PBI-080 | Improvement Targets    | School Leadership | Define measurable improvement targets.  | P2       | IDEA   |
| PBI-081 | Improvement Progress   | School Leadership | Track progress toward targets.          | P2       | IDEA   |
| PBI-082 | Improvement Outcomes   | School Leadership | Record and review improvement outcomes. | P2       | IDEA   |

---

# EPIC E15 — Reports and Analytics

### PBIs

| ID      | Feature                     | Actor             | Description                                   | Priority | Status |
| ------- | --------------------------- | ----------------- | --------------------------------------------- | -------- | ------ |
| PBI-083 | Enrollment Reports          | School Leadership | Produce enrollment reports.                   | P1       | IDEA   |
| PBI-084 | Attendance Reports          | School Leadership | Produce attendance reports.                   | P1       | IDEA   |
| PBI-085 | Teacher Statistics          | School Leadership | Produce teacher statistics.                   | P2       | IDEA   |
| PBI-086 | Assessment Reports          | School Leadership | Produce assessment reports.                   | P1       | IDEA   |
| PBI-087 | Student Performance         | School Leadership | Analyze student performance.                  | P1       | IDEA   |
| PBI-088 | Curriculum Progress Reports | Academic Leader   | Report curriculum progress.                   | P2       | IDEA   |
| PBI-089 | Student Support Reports     | School Leadership | Report student-support activity and outcomes. | P2       | IDEA   |
| PBI-090 | School Performance          | School Leadership | Produce school-level performance indicators.  | P2       | IDEA   |

---

# EPIC E16 — AI Education Assistant

### PBIs

| ID      | Feature                      | Actor             | Description                                                                | Priority | Status |
| ------- | ---------------------------- | ----------------- | -------------------------------------------------------------------------- | -------- | ------ |
| PBI-091 | Teacher AI Assistant         | Teacher           | Provide AI assistance for teaching and learning work.                      | P2       | IDEA   |
| PBI-092 | Student AI Assistant         | Student           | Provide AI-assisted learning support.                                      | P2       | IDEA   |
| PBI-093 | Parent AI Assistance         | Parent / Guardian | Explain authorized student information and provide guidance.               | P3       | IDEA   |
| PBI-094 | School Leadership AI         | School Leadership | Provide AI-assisted school analysis.                                       | P2       | IDEA   |
| PBI-095 | Risk Indicators              | Authorized Staff  | Generate explainable early-warning indicators from approved data.          | P2       | IDEA   |
| PBI-096 | Intervention Recommendations | Authorized Staff  | Provide AI-assisted intervention recommendations.                          | P2       | IDEA   |
| PBI-097 | Natural-Language Analytics   | School Leadership | Allow authorized users to query school information using natural language. | P3       | IDEA   |
| PBI-098 | AI Feedback                  | Users             | Capture feedback about AI usefulness and correctness.                      | P3       | IDEA   |

---

# EPIC E17 — Administrative-Level Monitoring

This epic is part of the overall EduBridge vision but is NOT the initial School implementation scope.

### Future PBIs

| ID      | Feature                   | Actor                 | Description                                                   | Priority | Status |
| ------- | ------------------------- | --------------------- | ------------------------------------------------------------- | -------- | ------ |
| PBI-099 | Woreda Monitoring         | Woreda Actor          | Monitor authorized aggregated school information.             | P3       | FUTURE |
| PBI-100 | Zone Monitoring           | Zone Actor            | Monitor authorized aggregated woreda/school information.      | P3       | FUTURE |
| PBI-101 | Regional Monitoring       | Region Actor          | Monitor authorized aggregated regional education information. | P3       | FUTURE |
| PBI-102 | Federal Monitoring        | Federal Actor         | Monitor authorized aggregated national education information. | P3       | FUTURE |
| PBI-103 | Bottom-Up Reporting       | Administrative Actors | Receive authorized information from lower levels.             | P3       | FUTURE |
| PBI-104 | Top-Down Information Flow | Administrative Actors | Deliver authorized information/guidance to lower levels.      | P3       | FUTURE |

---

# EPIC E18 — External Integration

### PBIs

| ID      | Feature                       | Actor                | Description                                                   | Priority | Status |
| ------- | ----------------------------- | -------------------- | ------------------------------------------------------------- | -------- | ------ |
| PBI-105 | Education System Integration  | System Administrator | Integrate with authorized education information systems.      | P3       | FUTURE |
| PBI-106 | Examination Integration       | System Administrator | Integrate with authorized examination systems where required. | P3       | FUTURE |
| PBI-107 | Learning Platform Integration | System Administrator | Integrate/reference authorized learning platforms.            | P3       | FUTURE |
| PBI-108 | Notification Integration      | System Administrator | Integrate external notification services.                     | P2       | IDEA   |

---

# EPIC E19 — File and Document Management

### PBIs

| ID      | Feature                 | Actor            | Description                                             | Priority | Status |
| ------- | ----------------------- | ---------------- | ------------------------------------------------------- | -------- | ------ |
| PBI-109 | File Management         | Authorized Users | Store and manage permitted files/documents.             | P1       | IDEA   |
| PBI-110 | Document Association    | Authorized Users | Associate documents with permitted domain records.      | P1       | IDEA   |
| PBI-111 | Document Access Control | System           | Protect sensitive documents according to authorization. | P1       | IDEA   |

---

# EPIC E20 — Audit and Traceability

### PBIs

| ID      | Feature             | Actor                | Description                                        | Priority | Status |
| ------- | ------------------- | -------------------- | -------------------------------------------------- | -------- | ------ |
| PBI-112 | Audit Logging       | System Administrator | Record important system and data-changing actions. | P0       | IDEA   |
| PBI-113 | Data Change History | System               | Preserve required historical changes.              | P1       | IDEA   |
| PBI-114 | Access Logging      | System Administrator | Record relevant security/access events.            | P1       | IDEA   |

---

# 9. Initial Dependency Direction

The backlog should generally evolve from foundational capabilities toward dependent capabilities.

```text
IDENTITY
   ↓
AUTHORIZATION
   ↓
SCHOOL
   ↓
ACADEMIC YEAR
   ↓
GRADES / SECTIONS / SUBJECTS
   ↓
STUDENTS + TEACHERS
   ↓
ENROLLMENT / ASSIGNMENTS
   ↓
TIMETABLE
   ↓
ATTENDANCE
   ↓
ASSESSMENT
   ↓
LEARNING ACTIVITIES
   ↓
STUDENT SUPPORT
   ↓
COMMUNICATION
   ↓
REPORTING / ANALYTICS
   ↓
AI
   ↓
HIGHER-LEVEL INTEGRATION
```

This is a dependency guide, not a mandatory Sprint sequence.

---

# 10. Definition of Ready for a Product Backlog Item

A PBI may be considered READY for Sprint consideration when:

* Its purpose is understood.
* The responsible actor is known.
* Its business value is understood.
* Its relationship to the SRS is known where applicable.
* Major dependencies are identified.
* The scope is sufficiently understood.
* The team can reasonably estimate the work.
* Acceptance criteria can be defined.
* No major unresolved requirement prevents implementation.

---

# 11. Definition of Done

A PBI is not DONE merely because code has been written.

The team's Definition of Done shall eventually require appropriate completion of:

```text
Requirement understood
        ↓
Implementation completed
        ↓
Code reviewed
        ↓
Automated tests completed
        ↓
Integration verified
        ↓
Security/authorization verified
        ↓
Acceptance criteria satisfied
        ↓
Documentation updated where required
        ↓
Working increment demonstrated
```

The exact Definition of Done will be finalized before Sprint execution.

---

# 12. Requirement Change Policy

Requirements may change.

When a change is discovered:

```text
CHANGE DISCOVERED
       ↓
IMPACT REVIEW
       ↓
REQUIREMENT REVIEW
       ↓
BACKLOG UPDATE
       ↓
PRIORITY / DEPENDENCY REVIEW
       ↓
IMPLEMENTATION
```

The team shall not silently change important requirements inside code.

Important changes shall be reflected in the appropriate project documentation.

---

# 13. Traceability

Backlog items should eventually connect to:

```text
SRS Requirement
      ↓
Product Backlog Item
      ↓
User Story / Use Case
      ↓
Acceptance Criteria
      ↓
Technical Design
      ↓
Implementation
      ↓
Test
```

Example:

```text
FR-STU-001
   ↓
PBI-017 Student Registration
   ↓
Student Registration User Story
   ↓
Acceptance Criteria
   ↓
Technical Design
   ↓
Implementation
   ↓
Automated Tests
```

---

# 14. Current Backlog State

The backlog is currently a BASELINE.

It is not yet the Sprint Backlog.

No PBI should be considered selected for Sprint 1 until the team performs:

1. Backlog review.
2. Dependency review.
3. Priority review.
4. Refinement of candidate items.
5. Sprint Goal definition.
6. Sprint Planning.

---

# 15. Current Project Position

```text
SRS
        ✓ APPROVED

School Actors
        ✓ BASELINE APPROVED

School Features
        ✓ BASELINE APPROVED
        ↳ May evolve when justified

Product Backlog
        ✓ VERSION 1 CREATED

Backlog Refinement
        → NEXT STEP

Sprint Goal
        → AFTER REFINEMENT

Sprint 1 Backlog
        → AFTER SPRINT GOAL

Technical Design
        → AFTER STORY REFINEMENT

Implementation
        → AFTER TECHNICAL DESIGN
```

---

# 16. Important Rule for EduBridge

The team shall build EduBridge incrementally.

We do NOT attempt to implement every actor and every feature before delivering the first working increment.

We maintain the complete product direction in the Product Backlog while selecting a small, valuable, coherent subset for each Sprint.

The Product Backlog is expected to evolve as the team gains knowledge.

The Sprint Backlog is created from the Product Backlog for a specific Sprint and is updated as the Developers learn more during that Sprint.

---

# 17. Version History

| Version | Status   | Description                                                                   |
| ------- | -------- | ----------------------------------------------------------------------------- |
| 1.0     | Baseline | Initial School Product Backlog created from approved SRS, actors and features |

---

```

**Stop here.** Don't create Sprint 1 yet.

The next step is **Step 2 — review and prioritize this backlog**, where we will decide what genuinely belongs near the top and identify the dependencies that matter. Only then do we create the Sprint Goal and Sprint Backlog. This preserves the distinction between the Product Backlog and Sprint Backlog used in Scrum. :contentReference[oaicite:1]{index=1}

Also, your approach of allowing the backlog to evolve is correct: Scrum's Product Goal and backlog are explicitly expected to evolve as the team learns. :contentReference[oaicite:2]{index=2}
```

[1]: https://www.scrum.org/resources/blog/scrum-guide-2020-update-introducing-product-goal?utm_source=chatgpt.com "Scrum Guide 2020 Update - Introducing the Product Goal | Scrum.org"
