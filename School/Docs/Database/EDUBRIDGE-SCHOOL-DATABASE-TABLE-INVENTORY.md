# EduBridge — School Domain: Decided Database Table Inventory

**Purpose:** This document freezes the conceptual tables for the School domain before detailed database implementation.

**Important boundary:** These are the tables/entities we have decided are needed from the approved School structure. This is **not yet the physical database schema**. Columns, data types, indexes, constraints, audit strategy, and API contracts will be designed next.

The design follows the approved EduBridge School structure and keeps the platform focused on supporting normal school operations while producing structured education data. Ethiopia's MoE documents emphasize integrated school, teacher, and student identifiers and EMIS structures across MoE, regional, woreda, and school levels. citeturn0search18turn0search0

---

## 1. Core school and academic structure

| Table / Entity | Purpose |
|---|---|
| `schools` | School identity and core school information |
| `academic_years` | Academic-year definition for a school |
| `academic_calendars` | Important academic dates, terms/periods, holidays and school calendar configuration |
| `grades` | Grade/level catalog used by the school |
| `school_grades` | Grades actually offered by a school in an academic year |
| `sections` | Classes/sections within a grade and academic year |
| `subjects` | Subject catalog |
| `school_subjects` | Subjects offered by a school for an academic year/grade |
| `timetables` | Timetable definition for an academic year |
| `timetable_entries` | Individual timetable slots connecting teacher, subject, grade/section and period |

---

## 2. Students

| Table / Entity | Purpose |
|---|---|
| `students` | Core student identity/profile |
| `student_enrollments` | Student enrollment in a school and academic year |
| `student_section_assignments` | Student placement into grade/section |
| `student_status_history` | Enrollment/status changes over time |
| `student_transfers` | Transfers into/out of the school |
| `student_documents` | Student-related uploaded/verified documents |
| `student_history` | Structured academic/school history that must remain traceable across years |

**Key design rule:** `students` represents the person; `student_enrollments` represents the student's participation in a particular school/academic year.

---

## 3. Teachers and school staff

| Table / Entity | Purpose |
|---|---|
| `teachers` | Teacher professional/profile record |
| `school_staff` | Non-teaching/support staff attached to the school |
| `teacher_assignments` | Connects teacher → subject → grade → section for an academic year |
| `teacher_workloads` | Teaching-load/workload information derived from assignments/timetable |
| `teacher_attendance` | Teacher attendance records |
| `professional_development` | Training/professional-development records |
| `teacher_certifications` | Teacher certification/qualification records where required |

The Ministry's current structure separately recognizes teacher/educational-leader development and EMIS/ICT functions, so teacher professional information should remain distinct from the core student/academic records. citeturn0search1

---

## 4. Attendance

| Table / Entity | Purpose |
|---|---|
| `student_attendance` | Daily/lesson-level student attendance |
| `teacher_attendance` | Teacher attendance |
| `absence_reasons` | Controlled reasons for absence |
| `attendance_explanations` | Student/parent explanations for an absence |
| `attendance_corrections` | Requests and approvals for correcting attendance |
| `attendance_alerts` | Recorded/generated attendance warnings |

Attendance is transactional school data; percentages, trends and higher-level summaries should normally be calculated from these records rather than stored as the primary source of truth.

---

## 5. Assessment and results

The Ministry curriculum framework explicitly treats continuous/formal assessment as part of teaching and learning and expects teachers to use assessment information to understand student progress and learning difficulties. citeturn0search17

| Table / Entity | Purpose |
|---|---|
| `assessments` | Assessment definition: test, quiz, assignment assessment, project, practical, exam, etc. |
| `assessment_items` | Optional questions/tasks/components belonging to an assessment |
| `assessment_results` | Student result for an assessment |
| `gradebooks` | Teacher/class subject gradebook context |
| `gradebook_entries` | Structured gradebook records where needed |
| `result_periods` | Term/semester/reporting period definitions |
| `student_results` | Official school-level summarized result for a reporting period |
| `teacher_feedback` | Teacher feedback attached to student learning/results |

**Boundary:** EduBridge may manage school/internal assessment. It does not become the authority that issues national examination results.

---

## 6. Learning activities

| Table / Entity | Purpose |
|---|---|
| `learning_activities` | Assignment, quiz, class activity, project or other learning activity |
| `learning_activity_items` | Optional questions/tasks inside an activity |
| `activity_submissions` | Student submission/response |
| `activity_completion` | Completion/status tracking |
| `activity_feedback` | Teacher feedback on a submission/activity |
| `learning_resources` | Learning resources referenced by the school/teacher |
| `resource_links` | Links to approved/external resources |

EduBridge should support learning activities without trying to replace the Ministry's existing LMS; the MoE already operates a K–12 learning platform. citeturn0search7

---

## 7. Student support and intervention

| Table / Entity | Purpose |
|---|---|
| `student_support_cases` | A student's identified learning/support need |
| `learning_difficulties` | Structured learning-difficulty categories/records |
| `interventions` | A support intervention such as remedial teaching or enrichment |
| `intervention_plans` | Planned intervention actions, targets and responsible staff |
| `intervention_participants` | Students/staff involved in an intervention |
| `intervention_sessions` | Individual intervention sessions |
| `intervention_outcomes` | Outcome/progress after intervention |

The purpose is **support**, not automatic labeling. AI risk indicators should lead to review/support workflows rather than become official judgments.

---

## 8. Parents / guardians

| Table / Entity | Purpose |
|---|---|
| `parents_guardians` | Parent/guardian profile |
| `student_guardians` | Relationship between a student and parent/guardian |
| `guardian_consents` | Consent/confirmation records where required |
| `parent_meetings` | Parent-teacher/school meeting records |
| `parent_meeting_participants` | Students/parents/staff participating in meetings |

---

## 9. Communication and notifications

| Table / Entity | Purpose |
|---|---|
| `announcements` | School/class/teacher announcements |
| `messages` | Controlled user-to-user communication |
| `message_threads` | Conversation/thread context |
| `notifications` | In-app notification records |
| `notification_preferences` | User notification preferences |
| `notification_deliveries` | Delivery status for SMS/email/push/in-app notifications |

Communication must respect actor scope: teachers communicate with their students/parents, parents with the school/teachers relevant to their child, and school leadership with the school's users.

---

## 10. School improvement

| Table / Entity | Purpose |
|---|---|
| `school_problems` | Identified school-level problems/issues |
| `improvement_priorities` | Prioritized improvement areas |
| `improvement_plans` | School improvement plans |
| `improvement_activities` | Activities/actions under a plan |
| `improvement_targets` | Measurable targets |
| `improvement_progress` | Progress updates against activities/targets |
| `improvement_outcomes` | Final/outcome records |

This domain is intentionally separate from ordinary academic records because a school improvement plan is an institutional management process.

---

## 11. AI education assistant

AI is a **supporting capability over the school domain**, not the owner of education records.

| Table / Entity | Purpose |
|---|---|
| `ai_assistant_sessions` | AI interaction/session context |
| `ai_assistant_messages` | User/AI messages within a session |
| `ai_insights` | AI-generated analytical observations |
| `ai_recommendations` | AI-generated recommendations for teachers, students, parents or school leadership |
| `ai_risk_indicators` | Explainable early-warning indicators generated from approved school data |
| `ai_intervention_recommendations` | AI suggestions for possible support/intervention |
| `ai_feedback` | Human feedback on AI usefulness/correctness |

**AI rule:** AI can recommend, summarize, detect patterns and assist. It must not silently change official attendance, grades, enrollment, promotion, examination results, or other authoritative records.

---

## 12. Reports and analytics

These should primarily be **derived/read models**, not duplicate sources of truth.

| Table / Entity | Purpose |
|---|---|
| `report_definitions` | Definitions/configuration of supported reports |
| `report_runs` | Generated report execution/history |
| `analytics_snapshots` | Optional precomputed reporting snapshots for performance |
| `school_kpis` | Optional calculated school indicators |

Examples include enrollment, attendance, assessment performance, teacher statistics, curriculum progress, student support and school performance.

The raw transactional tables remain the authoritative source.

---

## 13. Users, roles and authorization

| Table / Entity | Purpose |
|---|---|
| `users` | Authentication identity for platform users |
| `roles` | Roles such as principal, academic leader, teacher, student, parent |
| `permissions` | Fine-grained capabilities |
| `user_roles` | User-to-role assignment |
| `user_school_scopes` | Limits a user's access to the appropriate school |
| `role_permissions` | Maps roles to permissions |

A person/profile and a login identity should not be treated as the same concept. For example, a teacher is represented in `teachers`, while their authentication identity is represented in `users`.

---

## 14. Documents and files

| Table / Entity | Purpose |
|---|---|
| `files` | Central file metadata/storage reference |
| `document_links` | Links a file to a student, teacher, school, assessment, improvement plan, etc. |

This avoids creating a separate physical-file system for every module.

---

## 15. Audit and platform traceability

| Table / Entity | Purpose |
|---|---|
| `audit_logs` | Who performed what action, when and against which entity |
| `data_change_history` | Detailed historical changes for records requiring traceability |
| `access_logs` | Security/access events where needed |

For education records, traceability is essential. A correction to attendance or a result should not simply overwrite history without an auditable trail.

---

# 16. Supporting geographic hierarchy

Because EduBridge eventually operates from school upward through woreda, zone, region and federal levels, the school domain should reference an authoritative organizational/geographic hierarchy rather than storing free-text locations.

| Table / Entity | Purpose |
|---|---|
| `regions` | Region/city administration |
| `zones` | Zone/sub-city hierarchy where applicable |
| `woredas` | Woreda/sub-city hierarchy |
| `kebeles` | Kebele/local administrative reference where required |
| `school_geographic_assignments` | School's placement in the administrative hierarchy |

The MoE's School Improvement Portal currently exposes school information through region, zone, woreda, school code, sector and ownership, reinforcing the need for structured school identity and hierarchy. citeturn0search11

---

# 17. Important relationships — the core model

```text
SCHOOL
  │
  └── ACADEMIC YEAR
        │
        ├── SCHOOL GRADES
        │     └── SECTIONS
        │           └── STUDENT SECTION ASSIGNMENTS
        │                 └── STUDENTS
        │
        ├── SCHOOL SUBJECTS
        │
        ├── TEACHERS
        │     └── TEACHING ASSIGNMENTS
        │            ├── SUBJECT
        │            ├── GRADE
        │            └── SECTION
        │
        ├── TIMETABLE
        │     └── TIMETABLE ENTRIES
        │
        ├── ATTENDANCE
        │     ├── STUDENT ATTENDANCE
        │     └── TEACHER ATTENDANCE
        │
        ├── ASSESSMENTS
        │     └── ASSESSMENT RESULTS
        │
        ├── LEARNING ACTIVITIES
        │     └── SUBMISSIONS / COMPLETION
        │
        ├── STUDENT SUPPORT
        │     └── INTERVENTIONS
        │
        ├── PARENTS / GUARDIANS
        │     └── STUDENT-GUARDIAN RELATIONSHIPS
        │
        ├── COMMUNICATION
        │
        └── SCHOOL IMPROVEMENT

AI ASSISTANT
  │
  └── reads approved school data
        ├── produces insights
        ├── produces recommendations
        └── produces risk indicators

REPORTING / ANALYTICS
  │
  └── reads transactional school data
        └── produces school-level indicators
```

---

# 18. Source-of-truth rules

These rules should be kept when we implement the database.

1. **Student identity:** `students`
2. **Student participation in a school/year:** `student_enrollments`
3. **Current class placement:** `student_section_assignments`
4. **Teacher identity:** `teachers`
5. **Teaching relationship:** `teacher_assignments`
6. **Attendance:** `student_attendance` / `teacher_attendance`
7. **Assessment definition:** `assessments`
8. **Assessment result:** `assessment_results`
9. **Learning activity:** `learning_activities`
10. **Student submission:** `activity_submissions`
11. **Support:** `student_support_cases` + intervention tables
12. **Parent relationship:** `student_guardians`
13. **Communication:** messaging/announcement tables
14. **School improvement:** improvement tables
15. **AI:** AI tables are advisory/derived; they do not replace authoritative education records
16. **Reports:** derived from source data whenever practical
17. **Audit:** every sensitive change must be traceable

---

# 19. What we are NOT creating as School-domain tables yet

To keep the scope clean, these remain outside this table inventory:

- Federal Ministry operational tables
- Regional authority operational tables
- Zone operational tables
- Woreda operational tables
- National examination authority tables
- Government HR/payroll tables
- National curriculum-authoring system
- Full LMS/course-content platform
- National EMIS replacement
- Government finance/budget system

EduBridge may **integrate** with such systems later. It should not duplicate them without a clear requirement.

---

# 20. Final conceptual table groups

For implementation planning, the School domain is therefore:

```text
CORE
├── schools
├── academic_years
├── academic_calendars
├── grades
├── school_grades
├── sections
├── subjects
├── school_subjects
├── timetables
└── timetable_entries

STUDENTS
├── students
├── student_enrollments
├── student_section_assignments
├── student_status_history
├── student_transfers
├── student_documents
└── student_history

TEACHERS & STAFF
├── teachers
├── school_staff
├── teacher_assignments
├── teacher_workloads
├── teacher_attendance
├── professional_development
└── teacher_certifications

ATTENDANCE
├── student_attendance
├── teacher_attendance
├── absence_reasons
├── attendance_explanations
├── attendance_corrections
└── attendance_alerts

ASSESSMENT
├── assessments
├── assessment_items
├── assessment_results
├── gradebooks
├── gradebook_entries
├── result_periods
├── student_results
└── teacher_feedback

LEARNING
├── learning_activities
├── learning_activity_items
├── activity_submissions
├── activity_completion
├── activity_feedback
├── learning_resources
└── resource_links

SUPPORT
├── student_support_cases
├── learning_difficulties
├── interventions
├── intervention_plans
├── intervention_participants
├── intervention_sessions
└── intervention_outcomes

PARENTS
├── parents_guardians
├── student_guardians
├── guardian_consents
├── parent_meetings
└── parent_meeting_participants

COMMUNICATION
├── announcements
├── messages
├── message_threads
├── notifications
├── notification_preferences
└── notification_deliveries

SCHOOL IMPROVEMENT
├── school_problems
├── improvement_priorities
├── improvement_plans
├── improvement_activities
├── improvement_targets
├── improvement_progress
└── improvement_outcomes

AI
├── ai_assistant_sessions
├── ai_assistant_messages
├── ai_insights
├── ai_recommendations
├── ai_risk_indicators
├── ai_intervention_recommendations
└── ai_feedback

REPORTING
├── report_definitions
├── report_runs
├── analytics_snapshots
└── school_kpis

AUTHORIZATION
├── users
├── roles
├── permissions
├── user_roles
├── user_school_scopes
└── role_permissions

FILES & AUDIT
├── files
├── document_links
├── audit_logs
├── data_change_history
└── access_logs

GEOGRAPHY
├── regions
├── zones
├── woredas
├── kebeles
└── school_geographic_assignments
```

## Status

**This is the conceptual table inventory to freeze before physical database design.**

Tomorrow's database work should start from this inventory and determine:

- exact columns
- primary keys
- foreign keys
- unique constraints
- enums/reference tables
- indexes
- soft-delete/archive strategy
- audit strategy
- tenant/school isolation
- API ownership

**Do not create those details yet.** This document is the boundary between the approved EduBridge School-domain feature model and the physical database implementation.
