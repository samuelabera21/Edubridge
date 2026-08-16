EduBridge — Vice Principal / Academic Leader Functional Requirements
0. Role definition
The Vice Principal / Academic Leader is the school's day-to-day academic and instructional management role.
The central question for this actor is:
"What is happening in teaching and learning today, and what needs academic attention?"
The SRS explicitly defines this actor as responsible primarily for academic and teaching oversight, with broader academic visibility than a teacher but still restricted to the authorized school scope.
Principal
   │
   │ school-wide authority
   ▼
Vice Principal / Academic Leader
   │
   │ teaching + learning + academic supervision
   ▼
Teacher
   │
   │ classroom execution
   ▼
Student
   │
   │ learning participation
1. Academic Dashboard
Purpose
The dashboard is the Academic Leader's command center.
It should answer:
What is happening academically across my school right now?
Functional requirements
The dashboard shall display:
•	Current academic year 
•	Active classes 
•	Sections 
•	Teachers 
•	Students 
•	Today's scheduled lessons 
•	Completed lessons 
•	Missed lessons 
•	Student attendance 
•	Teacher attendance 
•	Pending attendance 
•	Pending assessments 
•	Assessment completion 
•	Average performance 
•	Low-performing subjects 
•	Low-performing classes 
•	Students requiring academic support 
•	Students with repeated absence 
•	Curriculum progress 
•	Classes behind schedule 
•	Teacher activities requiring attention 
•	Upcoming academic activities 
•	Academic announcements 
•	Open academic issues 
These are explicitly listed in your Academic Leader requirements. 
Drill-down
The dashboard should allow:
School
 ↓
Grade
 ↓
Section
 ↓
Subject
 ↓
Teacher
 ↓
Student

subject to authorization. 
Example
The dashboard could show:
Academic Year: 2018 E.C.

Today's Lessons       42
Completed             35
Missed                 4
Pending                3

Student Attendance    87%
Teacher Attendance    94%

Pending Assessments    6

Students Needing Support    18
Classes Behind Schedule      3
Clicking "Classes Behind Schedule: 3" should take the Academic Leader to the affected classes.
2. Academic Organization
The Academic Leader manages the academic structure of the school, where authorized.
Must cover
•	Grades 
•	Sections 
•	Classes 
•	Subjects 
•	Teaching assignments 
•	Teacher workload 
•	Academic calendar 
•	Timetable 
•	Assessment periods 
•	Academic activities 
The Academic Leader should be able to detect:
•	Class without teacher 
•	Subject without teacher 
•	Teacher overload 
•	Teacher under-allocation 
•	Empty timetable periods 
•	Timetable conflicts 
•	Insufficient instructional time 
•	Scheduling problems 
Example
Grade 10B

Mathematics
Teacher: Abebe
Status: Assigned

Physics
Teacher: NONE
Status: ⚠ Requires attention

Important boundary
The Academic Leader manages the school's implementation of the curriculum.
They do not change national curriculum requirements. 
The SRS also requires academic structures to be associated with academic years and historical structures to remain preserved.
3. Teacher Academic Management
This is not general HR.
It is academic management of teachers.
The Academic Leader shall view
•	Teacher profile 
•	Specialization 
•	Qualifications 
•	Subjects taught 
•	Grades taught 
•	Sections taught 
•	Workload 
•	Timetable 
•	Attendance 
•	Teaching activity 
•	Assessment activity 
•	Curriculum progress 
•	Student performance associated with assignments 
The Academic Leader shall also
•	Identify teachers requiring academic support 
•	Record academic supervision 
•	Provide academic feedback 
•	Create teacher support actions 
•	Monitor teacher support actions 
Example
Teacher: Abebe
Specialization: Mathematics

Grades: 8, 9, 10
Sections: 8A, 9B, 10A
Weekly lessons: 26
Missed lessons: 3
Assessment completion: 82%
Curriculum progress: Behind by 1 week

Academic Support:
✓ Lesson planning support
✓ Follow-up observation
The SRS separately requires teacher qualifications, certifications, assignments, workload, statistics, and professional-development records. 
4. Teaching Activity & Lesson Continuity
The Academic Leader must determine whether planned teaching is actually happening.
Monitor
•	Scheduled lessons 
•	Completed lessons 
•	Missed lessons 
•	Cancelled lessons 
•	Substitute lessons 
•	Lesson topics 
•	Classes taught 
•	Student attendance during lessons 
•	Shared teaching notes 
•	Curriculum units covered 
Critical distinction
Teacher absence ≠ automatically missed lesson.
For example:
Teacher absent
     ↓
Substitute assigned
     ↓
Lesson completed
versus:
Teacher absent
     ↓
No substitute
     ↓
Lesson missed
Your requirements explicitly require these to be distinguished. 
Example
Grade 10 Mathematics

Scheduled: 20
Completed: 17
Missed:     3
That becomes an academic-management signal. 
________________________________________
5. Classroom Observation & Academic Supervision
This is one of the most important Academic Leader features.
The system should not merely say:
"Teacher observed."
It should capture the actual supervision process.
Requirements
The Academic Leader shall be able to:
•	Schedule observation 
•	Select teacher 
•	Select subject 
•	Select grade 
•	Select section 
•	Record date 
•	Record lesson/topic 
•	Record observation criteria 
•	Record strengths 
•	Record weaknesses 
•	Record recommendations 
•	Give teacher feedback 
•	Create follow-up actions 
•	Set follow-up date 
•	Record follow-up observation 
•	Track improvement 
Example
Teacher: Abebe
Subject: Mathematics
Grade: 10
Topic: Algebra

Strength:
Good student participation.

Needs improvement:
Limited formative assessment.

Action:
Use short formative checks.

Follow-up:
2 weeks
This is consistent with Ethiopian instructional-leadership research emphasizing classroom observation, teacher feedback, curriculum coordination, and monitoring student progress. 
6. Curriculum Progress Monitoring
This should be a core feature, not a decorative chart.
View progress by
•	Grade 
•	Subject 
•	Section 
•	Teacher 
Compare
Expected progress
       vs
Actual progress
Track:
•	Completed units 
•	Pending units 
•	Delayed units 
•	Classes behind schedule 
•	Subjects behind schedule 
Example
Grade 9 Biology

Expected:
Unit 1 ✓
Unit 2 ✓
Unit 3 ✓
Unit 4 ✓

Actual:
Unit 1 ✓
Unit 2 ✓
Unit 3 →
Unit 4 ✗

Status:
2 weeks behind
The Academic Leader can then:
1.	Identify delay 
2.	Request explanation 
3.	Record action 
4.	Assign support 
5.	Monitor recovery 
6.	Escalate unresolved problems to Principal 
7. Timetable & Lesson Management
The Academic Leader handles the academic scheduling operation, while the Principal retains overall school authority. 
Requirements
•	View timetable 
•	Create timetable where authorized 
•	Edit timetable 
•	Assign lessons 
•	Assign teachers 
•	Assign classes 
•	Assign sections 
•	Assign rooms 
•	Detect teacher conflicts 
•	Detect class conflicts 
•	Detect room conflicts 
•	Publish timetable 
•	Record timetable changes 
•	Notify affected teachers 
•	Notify affected students 
•	Monitor timetable implementation 
The SRS explicitly requires timetable creation, periods, subject/teacher/section assignment, conflict detection, modification and publishing. 
Example
Monday 10:00

Grade 10A
Mathematics
Teacher: Abebe
Room: 204

Conflict detected:
Abebe already assigned to Grade 10B
The system should prevent or clearly flag this.
8. Student Attendance Monitoring
Teachers record attendance.
The Academic Leader monitors the school-wide academic attendance situation. 
View
•	Daily attendance 
•	Grade attendance 
•	Section attendance 
•	Subject attendance 
•	Teacher-associated attendance 
•	Student attendance 
•	Attendance history 
•	Attendance trends 
Identify
•	Frequently absent students 
•	Repeated lateness 
•	Low-attendance classes 
•	Low-attendance subjects 
•	Attendance anomalies 
Handle
•	Attendance explanations 
•	Correction requests 
•	Escalation 
•	Attendance interventions 
Example
Grade 9B

Last month: 91%
This month: 76%

⚠ Attendance decline
Drill-down:
Grade 9B
 ↓
Subjects
 ↓
Teachers
 ↓
Students
 ↓
Attendance history
The SRS also requires attendance history, patterns, alerts, corrections, traceability and reports. 
________________________________________
9. Teacher Attendance & Lesson Continuity
This is separate from student attendance.
View
•	Teacher attendance 
•	Lateness 
•	Absence 
•	Missed lessons 
•	Affected classes 
Identify
•	Repeated teacher absence 
•	Classes losing instructional time 
Manage
•	Substitute arrangements 
•	Replacement lessons 
•	Continuity monitoring 
The SRS requires teacher attendance records, history, corrections and statistics. 
________________________________________
10. Assessment Management & Monitoring
The Academic Leader has school-wide academic oversight, but should not arbitrarily modify teacher-entered marks.
View
•	Assessment calendar 
•	Assessments by grade 
•	Subject 
•	Section 
•	Teacher 
•	Completion 
•	Missing assessments 
•	Submitted results 
•	Result status 
•	Distributions 
•	Pass rates 
•	Average scores 
•	Trends 
•	Low performance 
•	Unusual patterns 
•	Incomplete records 
Correct workflow
Teacher enters result
        ↓
Academic Leader reviews
        ↓
Problem?
   ↙         ↘
 No          Yes
 ↓            ↓
Accept    Correction request
             ↓
        Authorized correction
             ↓
          Audit trail
The SRS explicitly requires authorized result correction and traceability. 
________________________________________
11. Academic Performance Analysis
The Academic Leader needs comparisons, not just individual marks.
Compare
Grades
Grade 8
Grade 9
Grade 10
Sections
10A
10B
10C
Subjects
Mathematics
English
Physics
Assessments
Test 1
Test 2
Midterm
Time
Current term
Previous term
Identify
•	Declining subjects 
•	Improving subjects 
•	Low-performing classes 
•	High-performing classes 
•	Performance gaps 
•	Students requiring support 
The SRS also explicitly requires class, subject, student performance and trend information. 
________________________________________
12. Student Academic Support & At-Risk Monitoring
This combines two closely related requirements.
Student support
The Academic Leader shall:
•	Review students identified by teachers 
•	Review academic difficulties 
•	Review attendance 
•	Review assessment history 
•	Review support history 
•	Coordinate interventions 
•	Assign remedial support 
•	Assign tutoring 
•	Assign enrichment 
•	Assign responsible teachers 
•	Set intervention periods 
•	Monitor attendance 
•	Monitor results 
•	Record outcomes 
•	Close interventions 
At-risk monitoring
Possible indicators:
•	Low performance 
•	Declining performance 
•	Repeated absence 
•	Repeated lateness 
•	Missed assessments 
•	Poor assignment completion 
•	Repeated academic difficulty 
•	Previous repetition 
•	Multiple interventions 
The system may produce:
🟢 Low
🟡 Moderate
🔴 High
But the Academic Leader must see the evidence and make the educational judgment. 
The SRS confirms that support cases, learning difficulties, interventions, responsible personnel, sessions, outcomes and support history must be supported while sensitive information remains restricted. 
________________________________________
13. Remedial & Enrichment Programs
The Academic Leader organizes academic support programs.
Remedial examples
•	Mathematics support 
•	Reading support 
•	Science support 
•	Language support 
•	Examination preparation 
Enrichment examples
•	Advanced mathematics 
•	Science activities 
•	Reading clubs 
•	Academic competitions 
•	Projects 
•	High-performing student activities 
Each program needs:
•	Program name 
•	Subject 
•	Target students 
•	Responsible teacher 
•	Schedule 
•	Location 
•	Duration 
•	Attendance 
•	Activities 
•	Progress 
•	Outcome 
Example
Program:
Grade 8 Mathematics Remedial

Students: 14
Teacher: Hana
Schedule: Tue/Thu 4:00 PM
Duration: 6 weeks

Before average: 43%
After average: 59%

Improvement: +16 points
That exact intervention-comparison concept is also specified in the Academic Leader document. 
________________________________________
14. Learning Activity & Assignment Monitoring
Teachers create learning activities.
The Academic Leader monitors them across the school.
View
•	Assignments 
•	Grade 
•	Subject 
•	Teacher 
•	Due dates 
•	Completion rates 
•	Overdue activities 
Identify
•	Poor completion classes 
•	Low-participation subjects 
•	Activity trends 
The Academic Leader does not need to personally grade every assignment. 
The SRS supports assignments, quizzes, projects, deadlines, submissions, completion status and teacher feedback. 
________________________________________
15. Academic Calendar & Academic Meetings
Academic calendar
Manage/monitor:
•	Academic periods 
•	Terms/semesters 
•	Assessment periods 
•	Examination periods 
•	Parent-teacher academic meetings 
•	Remedial periods 
•	Academic events 
•	Academic activities 
•	Important deadlines 
The goal is coordination between:
Teaching
Assessment
Remedial work
Academic events
Meetings
Deadlines
Academic meetings
The Academic Leader can organize:
•	Department meetings 
•	Subject meetings 
•	Grade meetings 
•	Academic reviews 
•	Teacher development meetings 
•	Assessment reviews 
•	Curriculum reviews 
•	Remedial-support meetings 
Meeting records should contain:
•	Agenda 
•	Participants 
•	Date 
•	Decisions 
•	Action items 
•	Responsible person 
•	Deadline 
•	Follow-up 
•	Completion status 
________________________________________
16. Teacher Professional Development & Academic Support
This should be a support system, not simply a teacher surveillance system.
Professional development
View:
•	Teacher training 
•	Assigned training 
•	Participation 
•	Completion 
•	Certificates 
•	Development needs 
The Academic Leader can:
•	Recommend training 
•	Assign school-level development activities where authorized 
•	Record mentoring 
•	Record coaching 
•	Monitor follow-up 
Teacher academic support
Support types:
•	Mentoring 
•	Peer observation 
•	Lesson-planning support 
•	Assessment support 
•	Classroom-management support 
•	Digital-teaching support 
•	Curriculum support 
•	Remedial-teaching support 
Example:
Problem:
Grade 8 mathematics performance declining

Action:
Peer observation
+
Lesson-planning support

Follow-up:
Observe next lesson

Outcome:
Performance improving
This aligns with Ethiopian education-sector emphasis on instructional leadership, curriculum coordination, teacher supervision/evaluation and professional development. 
________________________________________
17. Academic Communication, Parent Communication & Academic Issues
Academic communication
The Academic Leader can communicate with:
•	Teachers 
•	Principal 
•	Students 
•	Parents/guardians 
•	Academic/support staff 
Examples:
•	Academic announcements 
•	Teacher instructions 
•	Timetable-change notifications 
•	Academic-activity notices 
•	Assessment announcements 
•	Remedial announcements 
•	Academic concerns 
•	Teacher feedback 
The SRS requires role-, relationship- and organization-scoped communication and notification. 
Parent academic communication
This is limited to academic matters.
The Academic Leader can:
•	Send academic notices 
•	Notify parents about remedial support 
•	Notify parents about academic concerns 
•	Invite parents to academic meetings 
•	Respond to academic inquiries 
•	Review academic communication 
•	Escalate serious matters to Principal 
They should not become the general parent administrator. 
Academic problems
The Academic Leader can create an academic issue such as:
•	Mathematics performance decline 
•	Low reading achievement 
•	Curriculum delay 
•	Teacher shortage 
•	Assessment problem 
•	High absence 
•	Overcrowded class 
•	Insufficient learning materials 
•	Laboratory limitation 
•	ICT problem 
Each issue contains:
Problem
Evidence
Severity
Affected grade
Affected subject
Affected students
Responsible person
Proposed action
Deadline
Status
Outcome
________________________________________
18. Academic Quality, Reports, Alerts, Data Quality, Audit & AI
This final area contains several capabilities that should appear as separate pages/modules in the eventual UI, even though they belong to one larger academic intelligence and accountability layer.
18.1 Academic quality monitoring
Monitor:
•	Teaching-quality indicators 
•	Classroom observations 
•	Assessment quality 
•	Curriculum implementation 
•	Student performance 
•	Student attendance 
•	Learning activity participation 
•	Intervention effectiveness 
The quality cycle is:
Observe
   ↓
Measure
   ↓
Identify
   ↓
Support
   ↓
Monitor
   ↓
Improve
________________________________________
18.2 Academic reports
Reports should include:
Teaching
•	Teacher activity 
•	Lesson completion 
•	Curriculum progress 
•	Classroom observations 
•	Teacher support 
Students
•	Attendance 
•	Performance 
•	At-risk students 
•	Remedial students 
•	Enrichment students 
Assessments
•	Completion 
•	Subject performance 
•	Grade performance 
•	Section performance 
•	Trends 
Academic
•	Curriculum progress 
•	Teaching quality 
•	Intervention outcomes 
•	Academic problems 
Management
•	Timetable 
•	Teacher workload 
•	Missed lessons 
•	Academic activities 
The SRS independently requires enrollment, attendance, teacher statistics, assessment, student performance, curriculum, support, school performance, trends and comparative analysis. 
________________________________________
18.3 Notifications & alerts
Examples:
CURRICULUM
Grade 10 Physics is behind schedule.

ATTENDANCE
Grade 9B attendance dropped below threshold.

ASSESSMENT
3 classes haven't submitted their latest assessment.

PERFORMANCE
Grade 8 Mathematics declined significantly.

TEACHER
A teacher missed several scheduled lessons.

STUDENT
12 students require academic support.

INTERVENTION
5 students haven't attended remedial sessions.
________________________________________
18.4 Academic data quality
The system should detect:
•	Missing attendance 
•	Missing assessment results 
•	Incomplete curriculum records 
•	Incorrect teacher assignment 
•	Students without class assignment 
•	Duplicate academic records 
•	Missing subject assignment 
•	Missing assessment submission 
•	Inconsistent lesson records 
The Academic Leader can:
Review
 ↓
Request correction
 ↓
Return to responsible user
 ↓
Track correction
 ↓
Escalate unresolved problem
________________________________________
18.5 Academic audit trail
Sensitive academic actions must be traceable.
Example:
Teacher submitted result
        ↓
Vice Principal reviewed
        ↓
Correction requested
        ↓
Teacher corrected
        ↓
Finalized
The system retains:
•	User 
•	Action 
•	Date/time 
•	Record 
•	Previous value 
•	New value 
•	Reason where applicable 
This directly matches the SRS audit requirements for assessment corrections, attendance corrections, enrollment changes, transfers and permission changes. 
________________________________________
18.6 AI Academic Assistant
This is decision support, not autonomous decision-making.
The Academic Leader can ask:
Which grades are falling behind curriculum progress?
Which subjects have the largest performance decline?
Which teachers have classes with unusually low attendance?
Which students have declining marks and repeated absence?
What changed in Grade 10 Mathematics this term?
Which interventions are actually improving performance?
AI response structure
The AI should provide:

Answer
 ↓
Evidence
 ↓
Affected classes/students
 ↓
Trend
 ↓
Possible explanation
 ↓
Suggested action

Example:
Grade 10B Mathematics requires attention.

Evidence:
Average: 71% → 58%
Attendance: 93% → 81%
14 students declining
8 students repeatedly absent
2 assessments below previous average

Suggested action:
Review attendance, assessment difficulty
and current remedial program.
AI curriculum analysis
Compare:
Expected curriculum progress
             vs
Actual teaching progress
Example:


Grade 9 Biology

Expected: Unit 6
Actual: Unit 4

Delay: approximately 2 weeks
Teacher: Hana
Section: 9B
Delayed lessons: 5

The AI must not automatically accuse the teacher of poor performance. 
AI assessment analysis
Identify:
•	Performance changes 
•	Declining subjects 
•	Unusual distributions 
•	Students needing support 
•	Assessment completion problems 
•	Possible data anomalies 
AI intervention analysis
Example:
Before intervention: 43%
After intervention: 59%

Change: +16 points
And distinguish:
•	Students who improved 
•	Students who did not 
•	Intervention attendance 
•	Intervention completion 
The SRS makes the AI boundary even stricter: AI cannot silently modify student records, attendance, assessments, enrollment or official examination results. AI recommendations require appropriate human authorization before becoming actions. 

Critical cross-cutting requirements
These are not optional, even though they are not necessarily sidebar features.
A. Authorization
The Academic Leader must only see and operate on the authorized school.
The SRS requires:
•	Authentication 
•	Role authorization 
•	Organizational scope 
•	Permission checks 
•	Protected-record checks 
•	School-scope restrictions 
So this must never happen:
Academic Leader of School A
        ↓
GET School B teachers
It must return an authorization failure.
________________________________________
B. Source of truth
The UI must not create duplicate "fake academic data."
The SRS defines:
Student identity
       → Student record

Enrollment
       → Enrollment record

Placement
       → Section assignment

Teacher identity
       → Teacher record

Teaching relationship
       → Teaching assignment

Attendance
       → Attendance records

Assessment
       → Assessment results

Learning activity
       → Learning activity records

Intervention
       → Intervention records

AI
       → Advisory information
This is extremely important for your implementation.
________________________________________
C. Historical preservation
Changing the academic year must not erase previous academic information.
For example:
2025/26
Grade 10B
Teacher: Abebe
Results...
Attendance...
must remain available even after:
2026/27
is created.
The SRS explicitly requires historical academic structures, enrollment history and other historical records to remain preserved. 
________________________________________
What the Academic Leader must NOT do
This is just as important as the feature list.
The Academic Leader shall not:
•	Change national curriculum 
•	Create national examination rules 
•	Modify national examination results 
•	Change regional/Woreda statistics 
•	Manage another school 
•	Arbitrarily change student identity 
•	Change teacher employment status unless separately authorized 
•	Arbitrarily change teacher marks 
•	Arbitrarily change attendance 
•	Automatically fail/promote students 
•	Automatically punish teachers 
•	Make AI disciplinary decisions 
•	Override the Principal's overall authority
The SRS similarly establishes least-privilege access, school scope and human authority over AI.
The actual Academic Leader workflow
                 ACADEMIC LEADER
                        │
              ┌─────────┴─────────┐
              │                   │
            PLAN                MONITOR
              │                   │
      Grades/Sections       Teaching
      Subjects              Attendance
      Teachers              Assessment
      Assignments           Curriculum
      Timetable              Performance
      Calendar               Activities
              │                   │
              └─────────┬─────────┘
                        │
                     IDENTIFY
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       Problem       At-risk       Teacher
       classes       students      support
          │             │             │
          └─────────────┼─────────────┘
                        │
                       ACT
                        │
       ┌────────────────┼────────────────┐
       │                │                │
    Remedial        Teacher support   Academic
    intervention    Coaching          action
       │                │                │
       └────────────────┼────────────────┘
                        │
                      MEASURE
                        │
             Performance / attendance
             curriculum / intervention
                        │
                      REPORT
                        │
                    Principal

This is much closer to the real purpose of the actor than simply having a sidebar with pages.
It also fits the SRS's school-first architecture: operational records are created through normal school activity, while authorized leaders consume those records for monitoring, planning, analysis and performance management

