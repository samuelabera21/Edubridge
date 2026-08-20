# EduBridge — School Domain Model

## 1. Purpose

This document defines the core business/domain model of the EduBridge School system.

It translates the approved School actors and School feature structure into:

- Core domain entities
- Relationships between entities
- Ownership
- Academic-year boundaries
- Important business rules
- Operational flows
- AI interaction with the domain

This document is NOT a database schema.

It is the source from which database entities, API resources, services, and application modules will later be derived.

---

# 2. School Domain Overview

The central concept of EduBridge is the SCHOOL.

A school operates its educational activities within an ACADEMIC YEAR.

Within an academic year the school organizes:

- Grades
- Sections / Classes
- Students
- Teachers
- Subjects
- Teaching Assignments
- Timetable
- Attendance
- Assessments
- Learning Activities
- Student Support
- Parents / Guardians
- Communication
- School Improvement

The overall relationship is:

SCHOOL
  │
  └── ACADEMIC YEAR
        │
        ├── GRADES
        │     └── SECTIONS
        │           └── STUDENT ENROLLMENTS
        │
        ├── TEACHERS
        │     └── TEACHING ASSIGNMENTS
        │
        ├── SUBJECTS
        │
        ├── TIMETABLE
        │
        ├── ATTENDANCE
        │
        ├── ASSESSMENTS
        │     └── RESULTS
        │
        ├── LEARNING ACTIVITIES
        │     └── SUBMISSIONS
        │
        ├── STUDENT SUPPORT
        │     └── INTERVENTIONS
        │
        ├── PARENTS / GUARDIANS
        │
        ├── COMMUNICATION
        │
        └── SCHOOL IMPROVEMENT


# 3. Core Domain Entities

The primary School domain entities are:

1. School
2. Academic Year
3. Academic Calendar
4. Grade
5. Section / Class
6. Student
7. Student Enrollment
8. Student Transfer
9. Teacher
10. School Staff
11. Subject
12. Teaching Assignment
13. Timetable
14. Student Attendance
15. Teacher Attendance
16. Assessment
17. Assessment Result
18. Gradebook
19. Learning Activity
20. Learning Activity Submission
21. Learning Resource
22. Student Support Case
23. Intervention
24. Parent / Guardian
25. Student-Guardian Relationship
26. Communication
27. Notification
28. School Improvement Plan
29. School Improvement Activity
30. School Improvement Target
31. School Document
32. Audit Record


# 4. SCHOOL

## Purpose

Represents the educational institution using EduBridge.

The School is the root organizational boundary for School-level data.

## School contains

- School identity
- Official school identifier
- School name
- Region
- Zone
- Woreda
- School sector/type
- Ownership
- School status
- Grades offered
- Academic years
- Teachers
- Staff
- Students
- Parents/guardians
- School configuration

## School owns

- Academic years
- School configuration
- School-level operational records
- School improvement records

## School does NOT own

- Regional policy
- Woreda policy
- National curriculum policy
- National examination results
- Federal education statistics

Those belong to higher-level authorities or authorized external systems.


# 5. ACADEMIC YEAR

## Purpose

Academic Year is the primary temporal boundary for school educational operations.

Examples:

- 2018 E.C.
- 2019 E.C.

## Academic Year contains

- Academic calendar
- Grades
- Sections
- Student enrollments
- Teaching assignments
- Timetable
- Attendance
- Assessments
- Results
- Learning activities
- Student interventions
- School improvement activities

## Relationship

SCHOOL
  │
  └── has many ACADEMIC YEARS

ACADEMIC YEAR
  │
  ├── has GRADES
  ├── has SECTIONS
  ├── has ENROLLMENTS
  ├── has TEACHING ASSIGNMENTS
  ├── has TIMETABLE
  ├── has ATTENDANCE
  ├── has ASSESSMENTS
  └── has LEARNING ACTIVITIES

## Important rule

Historical academic years should remain preserved.

Starting a new academic year must NOT overwrite previous academic-year records.


# 6. ACADEMIC CALENDAR

## Purpose

Defines important dates and periods within an academic year.

Can include:

- School opening
- School closing
- Terms/semesters where applicable
- Examination periods
- Assessment periods
- Holidays
- Special school events

## Relationship

ACADEMIC YEAR
  │
  └── has ACADEMIC CALENDAR


# 7. GRADE

## Purpose

Represents an educational grade offered by the school.

Examples:

- Grade 1
- Grade 8
- Grade 10
- Grade 12

## Relationship

ACADEMIC YEAR
  │
  └── GRADE
        │
        └── SECTIONS


# 8. SECTION / CLASS

## Purpose

Represents an organized group of students within a grade.

Examples:

- Grade 10A
- Grade 10B

## Section contains

- Grade
- Academic year
- Students through enrollment
- Teachers through teaching assignments
- Subjects
- Timetable

## Relationship

GRADE
  │
  └── SECTION
        │
        └── STUDENT ENROLLMENTS

A section exists within an academic year.


# 9. STUDENT

## Purpose

Represents a learner associated with the school.

The Student is a core person entity.

## Student may have

- Student identity
- Personal profile
- Enrollment history
- Academic history
- Attendance
- Assessment results
- Learning activities
- Support cases
- Interventions
- Parents/guardians
- Documents
- Notifications

## Important distinction

STUDENT is the person.

STUDENT ENROLLMENT is the student's participation in a specific school/academic-year context.

Therefore:

STUDENT
  │
  └── ENROLLMENTS
        │
        ├── Academic Year
        ├── Grade
        ├── Section
        └── Status

This allows the same student's educational history to remain intact across years.


# 10. STUDENT ENROLLMENT

## Purpose

Represents a student's enrollment in a school for a particular academic year.

## Enrollment connects

STUDENT
   ↓
SCHOOL
   ↓
ACADEMIC YEAR
   ↓
GRADE
   ↓
SECTION

## Enrollment may represent

- New enrollment
- Continuing student
- Repeater
- Transfer-in
- Transfer-out
- Completed
- Withdrawn
- Dropped out
- Other authorized status

## Important rule

Official enrollment information should be controlled by authorized school staff.

Students and parents may view appropriate information but should not directly alter official enrollment records.


# 11. STUDENT TRANSFER

## Purpose

Records movement of a student between schools or sections where applicable.

## Transfer records should preserve

- Student
- Origin
- Destination
- Academic year
- Transfer date
- Status
- Authorization
- Supporting information

## Important rule

Transfer history should not destroy previous enrollment history.


# 12. TEACHER

## Purpose

Represents a teacher working at the school.

## Teacher contains

- Teacher identity
- Professional profile
- Qualification information
- Subject specialization
- Employment information
- School association
- Professional development

## Teacher interacts with

- Teaching assignments
- Timetable
- Attendance
- Students
- Assessments
- Learning activities
- Student support
- Parent communication
- Professional development

## Teacher does NOT own

- Student official identity
- National examination results
- School configuration
- National education policy


# 13. SCHOOL STAFF

## Purpose

Represents non-teaching personnel who need access to EduBridge for authorized operational responsibilities.

Examples may include:

- Administrative staff
- Support personnel
- Other authorized school employees

## Important rule

School staff access should be permission-based.

Not every staff member receives the same access as the principal or teacher.


# 14. SUBJECT

## Purpose

Represents an academic subject taught at the school.

Examples:

- Mathematics
- English
- Physics
- Biology

The Ministry's current fact sheet shows subject structures varying by grade level, reinforcing that subjects should be modeled as educational entities rather than hard-coded into individual users. :contentReference[oaicite:1]{index=1}

## Subject is used by

- Teaching assignments
- Timetable
- Assessments
- Results
- Learning activities
- Learning resources


# 15. TEACHING ASSIGNMENT

## Purpose

Teaching Assignment connects a teacher to the actual teaching responsibility.

It is one of the most important relationships in the domain.

## Teaching Assignment connects

TEACHER
   │
   ├── SUBJECT
   ├── GRADE
   ├── SECTION
   └── ACADEMIC YEAR

Example:

Teacher A
  ↓
Mathematics
  ↓
Grade 10
  ↓
Section 10A
  ↓
Academic Year 2018 E.C.

## Why it matters

The assignment determines which students a teacher is authorized to teach and which educational records the teacher can normally create or view.


# 16. TIMETABLE

## Purpose

Defines when teaching activities are scheduled.

## Timetable connects

- Academic year
- Day
- Period/time
- Teacher
- Subject
- Grade
- Section
- Classroom where applicable

## Important rule

The timetable should be generated/managed by authorized school leadership.

Teachers primarily consume their assigned timetable.


# 17. STUDENT ATTENDANCE

## Purpose

Records student participation in scheduled school activities/classes.

## Attendance connects

STUDENT
   ↓
ENROLLMENT
   ↓
CLASS / SECTION
   ↓
DATE / SESSION
   ↓
TEACHER / SUBJECT where applicable

## Possible states

- Present
- Absent
- Late
- Excused
- Other configured status

## Important rule

Attendance should be traceable to the person who recorded or modified it.


# 18. TEACHER ATTENDANCE

## Purpose

Records teacher attendance and teaching participation.

## Teacher attendance is separate from student attendance.

Teacher attendance may include:

- Present
- Absent
- Late
- Excused
- Leave
- Other authorized status

## Important distinction

TEACHER ABSENT

is different from

LESSON NOT CONDUCTED.

The system should not automatically treat these as the same event.


# 19. ASSESSMENT

## Purpose

Represents an academic evaluation activity.

Examples:

- Quiz
- Test
- Assignment assessment
- Project
- Practical assessment
- Midterm
- Examination
- Continuous assessment

## Assessment connects

- Teacher
- Subject
- Grade
- Section
- Academic year
- Students

## Assessment contains

- Assessment type
- Title
- Date
- Maximum score
- Applicable students
- Assessment status

## Important boundary

EduBridge supports school/internal assessment.

It does NOT become the authority that creates or owns official national examination results.

The Ministry currently identifies the Education Assessment and Examination Service as a separate sector institution. :contentReference[oaicite:2]{index=2}


# 20. ASSESSMENT RESULT

## Purpose

Represents the result of one student for one assessment.

Relationship:

ASSESSMENT
   │
   └── RESULTS
         │
         └── STUDENT

Example:

Assessment:
Grade 10 Mathematics Test 1

Result:
Student A → 72/100

## Results may be used for

- Gradebook
- Student progress
- Teacher analysis
- School analytics
- Student support
- Parent visibility
- Aggregated education indicators


# 21. GRADEBOOK

## Purpose

Provides an organized view of assessment results for a class/subject.

It is primarily an operational/derived view of:

ASSESSMENTS
+
RESULTS

## Important rule

Gradebook should not become a second independent source of truth for marks.

The underlying assessment results remain authoritative.


# 22. LEARNING ACTIVITY

## Purpose

Represents a learning activity assigned or conducted through EduBridge.

Examples:

- Assignment
- Quiz
- Class activity
- Project
- Practice activity

## Learning Activity connects

- Teacher
- Subject
- Grade
- Section
- Academic year
- Students

## Activity may have

- Instructions
- Due date
- Resources
- Submission requirement
- Assessment
- Feedback


# 23. LEARNING ACTIVITY SUBMISSION

## Purpose

Records a student's response/completion of a learning activity.

Relationship:

LEARNING ACTIVITY
   │
   └── SUBMISSIONS
         │
         └── STUDENT

## Submission may contain

- Submission content
- File
- Date submitted
- Completion state
- Score
- Teacher feedback


# 24. LEARNING RESOURCE

## Purpose

Represents educational material that can be recommended or linked.

Examples:

- Ministry learning resource
- Approved external resource
- School resource
- Teacher resource

EduBridge should integrate/link to existing learning platforms where appropriate rather than automatically rebuilding another complete LMS. The Ministry already operates a K–12 LMS with courses and learning content. :contentReference[oaicite:3]{index=3}


# 25. STUDENT SUPPORT CASE

## Purpose

Represents an identified student need requiring attention.

Examples:

- Academic difficulty
- Attendance concern
- Learning difficulty
- Repeated poor performance
- Other authorized support concern

## Support Case connects

STUDENT
   ↓
SUPPORT CASE
   ↓
INTERVENTION


# 26. INTERVENTION

## Purpose

Represents an action taken to support a student.

Examples:

- Remedial class
- Tutorial
- Academic counseling
- Additional practice
- Enrichment
- Parent meeting
- Teacher support
- Other school-approved intervention

## Intervention lifecycle

IDENTIFIED
   ↓
PLANNED
   ↓
ASSIGNED
   ↓
IN PROGRESS
   ↓
COMPLETED
   ↓
OUTCOME REVIEWED

## Intervention contains

- Student
- Problem/need
- Action
- Responsible person
- Start date
- End date
- Status
- Outcome


# 27. PARENT / GUARDIAN

## Purpose

Represents an adult associated with one or more students.

A parent/guardian is primarily a monitoring and communication actor.

## Parent may

- View authorized student information
- Receive notifications
- Communicate with teachers
- Communicate with school
- View attendance
- View academic progress
- View support information
- Participate in meetings


# 28. STUDENT-GUARDIAN RELATIONSHIP

## Purpose

Connects a student to a parent/guardian.

Relationship:

STUDENT
   │
   └── GUARDIAN RELATIONSHIP
          │
          └── PARENT / GUARDIAN

The relationship may represent:

- Parent
- Guardian
- Other authorized relationship

## Important rule

Access to a student's information must be determined by the relationship and authorization, not merely by having a parent account.


# 29. COMMUNICATION

## Purpose

Represents controlled communication between authorized school actors.

Possible participants:

- Principal
- Academic leader
- Teacher
- Student
- Parent/guardian
- Authorized school staff

## Communication may be

- Direct message
- Class announcement
- School announcement
- Parent-teacher communication
- Student-teacher communication

## Important rule

Communication must respect role and relationship boundaries.


# 30. NOTIFICATION

## Purpose

Represents system-generated or manually generated notifications.

Examples:

- Attendance alert
- Assignment deadline
- Assessment result
- Parent notification
- School announcement
- Support notification
- System notification

Notification delivery may use:

- In-app
- Push
- SMS
- Email

depending on configured infrastructure.


# 31. SCHOOL IMPROVEMENT PLAN

## Purpose

Represents a school's structured improvement effort.

A school may identify:

- Learning problems
- Attendance problems
- Infrastructure problems
- Resource problems
- Teacher-development needs
- Other school priorities

## Improvement Plan contains

- Priority
- Problem
- Objective
- Target
- Activities
- Responsible persons
- Timeline
- Progress
- Outcome


# 32. SCHOOL IMPROVEMENT ACTIVITY

## Purpose

Represents an individual action within a school improvement plan.

Example:

Problem:
Low Grade 8 Mathematics performance

Activity:
Organize weekly remedial sessions

Responsible:
Academic leader

Timeline:
September–November

Outcome:
Performance improves


# 33. SCHOOL IMPROVEMENT TARGET

## Purpose

Represents a measurable objective.

Example:

Current attendance:
82%

Target:
90%

Deadline:
End of semester

Targets should be measurable where possible.


# 34. SCHOOL DOCUMENT

## Purpose

Represents documents associated with authorized school operations.

Possible documents:

- Student documents
- Teacher documents
- School documents
- Certificates
- Supporting documents
- Uploaded learning materials

## Important rule

Documents require access control.

A document should never automatically become visible to every school user.


# 35. AUDIT RECORD

## Purpose

Records important actions performed in EduBridge.

The domain requires traceability because educational records can be sensitive and important.

Audit information should answer:

WHO
WHAT
WHEN
WHICH RECORD
OLD VALUE
NEW VALUE
WHY / CONTEXT where required

Examples:

Teacher updated attendance.

School administrator approved transfer.

Academic leader approved assessment result.

This is an audit concern, not an education feature.


# 36. CORE RELATIONSHIP MODEL

The central relationships are:

SCHOOL
  │
  ├── ACADEMIC YEARS
  │
  ├── STUDENTS
  │
  ├── TEACHERS
  │
  ├── STAFF
  │
  └── PARENTS / GUARDIANS


ACADEMIC YEAR
  │
  ├── ACADEMIC CALENDAR
  │
  ├── GRADES
  │     └── SECTIONS
  │
  ├── STUDENT ENROLLMENTS
  │
  ├── TEACHING ASSIGNMENTS
  │
  ├── TIMETABLE
  │
  ├── ATTENDANCE
  │
  ├── ASSESSMENTS
  │     └── RESULTS
  │
  ├── LEARNING ACTIVITIES
  │     └── SUBMISSIONS
  │
  └── INTERVENTIONS


STUDENT
  │
  ├── ENROLLMENTS
  ├── ATTENDANCE
  ├── RESULTS
  ├── LEARNING ACTIVITY SUBMISSIONS
  ├── SUPPORT CASES
  ├── INTERVENTIONS
  └── GUARDIANS


TEACHER
  │
  ├── TEACHING ASSIGNMENTS
  ├── TIMETABLE
  ├── ATTENDANCE
  ├── ASSESSMENTS
  ├── LEARNING ACTIVITIES
  └── INTERVENTIONS


TEACHING ASSIGNMENT
  │
  ├── TEACHER
  ├── SUBJECT
  ├── GRADE
  ├── SECTION
  └── ACADEMIC YEAR


ASSESSMENT
  │
  └── RESULTS
        │
        └── STUDENT


LEARNING ACTIVITY
  │
  └── SUBMISSIONS
        │
        └── STUDENT


STUDENT SUPPORT CASE
  │
  └── INTERVENTION


STUDENT
  │
  └── GUARDIAN RELATIONSHIP
        │
        └── PARENT / GUARDIAN


# 37. DOMAIN OWNERSHIP

## School

Owns:

- School configuration
- Academic years
- School organization
- School operations

## Principal / School Administrator

Operates:

- School management
- Student administration
- Teacher/staff administration
- Academic organization
- School reporting
- School improvement

## Academic Leader

Operates:

- Academic monitoring
- Teaching oversight
- Curriculum progress
- Assessment monitoring
- Student support monitoring

## Teacher

Operates:

- Teaching assignments within authorization
- Student attendance
- Assessments
- Results
- Learning activities
- Student support
- Teacher/student communication

## Student

Operates:

- Own learning activities
- Own submissions
- Own support participation
- Own communication
- Own view of educational information

## Parent / Guardian

Operates:

- Own communication
- Meeting requests
- Selected confirmations

Views:

- Authorized child's information

## School Support Staff

Operates only the functions explicitly granted by permission.

---

# 38. IMPORTANT DOMAIN BOUNDARIES

EduBridge School does NOT own every education-system function.

The following remain outside the School domain:

- National education policy
- National curriculum authority
- National examination authority
- Federal education statistics authority
- Regional education policy
- Woreda governance
- National teacher employment authority
- Official national certificates

The Ministry currently separates General Education, Curriculum Development, Teachers' and Educational Leaders' Development, Educational Program and Quality Improvement, EMIS/ICT, and the Education Assessment and Examination Service. EduBridge should therefore integrate with such authorities/systems where appropriate rather than pretending the School domain owns them. :contentReference[oaicite:4]{index=4}


# 39. DERIVED DATA VS SOURCE DATA

EduBridge should distinguish between source/operational data and derived information.

## Source / operational data

Examples:

- Student enrollment
- Attendance record
- Assessment result
- Teaching assignment
- Learning activity
- Intervention

## Derived information

Examples:

- Attendance percentage
- Class average
- Subject average
- Performance trend
- At-risk indicator
- School performance indicator
- Intervention effectiveness
- Dashboard statistics

Derived information should normally be calculated from authoritative operational records rather than manually entered.

---

# 40. AI DOMAIN BOUNDARY

AI is a service layer over the School domain.

AI does NOT replace the underlying educational records.

The relationship is:

OPERATIONAL DATA
      │
      ├── Student data
      ├── Attendance
      ├── Results
      ├── Learning activity
      ├── Intervention
      └── School data
             │
             ↓
        AI SERVICES
             │
      ┌──────┼─────────┐
      ↓      ↓         ↓
   INSIGHT  ALERT   RECOMMENDATION


## AI capabilities

### Teacher AI

Uses authorized:

- Student performance
- Attendance
- Assessment results
- Learning activity

Can provide:

- Performance summaries
- Suggested remedial activities
- Learning difficulty insights
- Lesson support
- Student support suggestions

### Student AI

Uses the student's authorized learning context.

Can provide:

- Learning assistance
- Explanations
- Study guidance
- Resource recommendations
- Progress explanations

### Parent AI

Can explain authorized information such as:

- Attendance trends
- Academic progress
- School notices
- Support recommendations

### School Leadership AI

Can analyze school-level information:

- Enrollment
- Attendance
- Assessment
- Student support
- Curriculum progress
- Teacher/class operational indicators

Can provide:

- Trends
- Alerts
- Possible problem areas
- Suggested areas for investigation

### Early Warning

Can combine signals such as:

Attendance
+
Performance
+
Progress
+
Support history

to produce:

POSSIBLE SUPPORT NEED

not:

CERTAIN FAILURE

AI recommendations must remain reviewable by authorized education personnel.


# 41. DASHBOARD DATA IS DERIVED FROM THE DOMAIN

The School Dashboard is NOT the primary data source.

It is a view over the domain.

For example:

SCHOOL DASHBOARD
      │
      ├── Enrollment
      │      ← Student Enrollment
      │
      ├── Attendance
      │      ← Attendance
      │
      ├── Performance
      │      ← Assessment Results
      │
      ├── Student Support
      │      ← Support / Intervention
      │
      └── School Improvement
             ← Improvement data


# 42. ACCESS CONTROL DOMAIN

Every domain operation must be evaluated against:

USER
+
ROLE
+
SCHOOL
+
ACADEMIC YEAR
+
RELATIONSHIP
+
PERMISSION

Examples:

Teacher
  → can access assigned students

Student
  → can access own data

Parent
  → can access authorized child's data

School administrator
  → can access school-wide data

Academic leader
  → can access authorized academic monitoring data


# 43. DATA VISIBILITY PRINCIPLE

The School domain follows:

NEED TO KNOW
+
ROLE BASED ACCESS
+
RELATIONSHIP BASED ACCESS

Examples:

Student:

MY DATA

Teacher:

MY CLASSES / MY STUDENTS

Academic Leader:

ACADEMIC DATA WITHIN SCHOOL

Principal:

SCHOOL DATA

Parent:

MY CHILD'S AUTHORIZED DATA


# 44. EDUCATIONAL DATA FLOW

Operationally, EduBridge works like this:

SCHOOL
   │
   ├── organizes academic year
   │
   ├── enrolls students
   │
   ├── assigns teachers
   │
   ├── schedules teaching
   │
   ├── records attendance
   │
   ├── conducts assessment
   │
   ├── records results
   │
   ├── assigns learning activities
   │
   ├── identifies student needs
   │
   └── performs interventions


These operational records can then produce:

SCHOOL INSIGHTS
      │
      ├── Enrollment indicators
      ├── Attendance indicators
      ├── Learning indicators
      ├── Teacher/class indicators
      ├── Student support indicators
      └── School improvement indicators


# 45. HISTORICAL DATA PRINCIPLE

Educational records are historical.

The system should avoid destructive updates to important records.

Examples:

Do NOT simply overwrite:

- Previous enrollment
- Previous section
- Previous assessment result
- Previous attendance
- Previous academic year

Instead preserve the history and record authorized corrections/change events.

This is essential for trustworthy educational analytics.


# 46. CORE DOMAIN LIFECYCLE

The normal school lifecycle is:

SCHOOL
  ↓
ACADEMIC YEAR
  ↓
ACADEMIC ORGANIZATION
  ↓
STUDENT ENROLLMENT
  ↓
TEACHER ASSIGNMENT
  ↓
TIMETABLE
  ↓
TEACHING
  ↓
ATTENDANCE
  ↓
LEARNING ACTIVITIES
  ↓
ASSESSMENT
  ↓
RESULTS
  ↓
STUDENT PERFORMANCE
  ↓
SUPPORT / INTERVENTION
  ↓
OUTCOME
  ↓
SCHOOL ANALYTICS


# 47. MINIMUM CORE DOMAIN

The minimum domain required for the first implementation is:

SCHOOL
ACADEMIC YEAR
GRADE
SECTION
STUDENT
STUDENT ENROLLMENT
TEACHER
SUBJECT
TEACHING ASSIGNMENT
TIMETABLE
STUDENT ATTENDANCE
TEACHER ATTENDANCE
ASSESSMENT
ASSESSMENT RESULT
LEARNING ACTIVITY
SUBMISSION
PARENT / GUARDIAN
STUDENT-GUARDIAN RELATIONSHIP
STUDENT SUPPORT
INTERVENTION


Additional capabilities such as:

- AI
- Notifications
- Communication
- School Improvement
- Learning Resources
- Analytics

should build on this core domain.


# 48. FINAL DOMAIN STRUCTURE

SCHOOL
│
├── ACADEMIC YEAR
│   │
│   ├── Academic Calendar
│   ├── Grades
│   │   └── Sections
│   │
│   ├── Student Enrollments
│   │
│   ├── Teachers
│   │   └── Teaching Assignments
│   │       ├── Subject
│   │       ├── Grade
│   │       └── Section
│   │
│   ├── Timetable
│   │
│   ├── Attendance
│   │   ├── Student Attendance
│   │   └── Teacher Attendance
│   │
│   ├── Assessments
│   │   └── Results
│   │
│   ├── Learning Activities
│   │   └── Submissions
│   │
│   ├── Student Support
│   │   └── Interventions
│   │
│   └── School Improvement
│
├── STUDENTS
│   ├── Enrollment History
│   ├── Attendance
│   ├── Results
│   ├── Learning Activities
│   ├── Support
│   └── Guardians
│
├── TEACHERS
│   ├── Assignments
│   ├── Attendance
│   ├── Assessments
│   └── Learning Activities
│
├── PARENTS / GUARDIANS
│   └── Student Relationships
│
├── COMMUNICATION
│
├── NOTIFICATIONS
│
├── LEARNING RESOURCES
│
├── SCHOOL IMPROVEMENT
│
├── SCHOOL DOCUMENTS
│
└── AUDIT


AI SERVICES
│
├── Teacher AI
├── Student AI
├── Parent AI
├── Leadership AI
├── Early Warning
├── Performance Analysis
└── Recommendations

AI SERVICES consume authorized SCHOOL DOMAIN DATA.