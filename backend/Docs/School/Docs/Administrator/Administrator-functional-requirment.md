

EduBridge — School Administrator / Principal Functional Requirements
0. Role Definition
The School Administrator / Principal is the highest operational management role inside an individual school.
The Principal has school-wide visibility and operational authority across:
•	Students
•	Teachers
•	School staff
•	Academic organization
•	Attendance
•	Assessment
•	Teaching and learning
•	Student support
•	Parents
•	Communication
•	School resources
•	School improvement
•	Reports and analytics
•	School-level configuration
The Principal's central question is:
"What is happening in my school, what problems exist, and what action should the school take?"
The Principal operates within one authorized school scope. The Principal must not automatically gain authority over another school merely because the user has a high-level role.
The SRS requires role and organizational scope to determine what a user can see and do.
Principal vs Academic Leader
                    PRINCIPAL
                       │
             School-wide authority
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    Academic       Operations      School
    Leadership     Management      Improvement
        │              │              │
        └──────────────┼──────────────┘
                       │
              VICE PRINCIPAL /
             ACADEMIC LEADER
                       │
             Teaching + Learning
                       │
                    TEACHER
                       │
              Classroom execution
                       │
                    STUDENT
The School Administrator therefore has a broader operational scope than the Academic Leader. The source document explicitly freezes this distinction: Principal = entire school, Academic Leader = primarily academic/teaching operations.
________________________________________
1. SCHOOL DASHBOARD
Purpose
The dashboard is the Principal's school command center.
It should answer:
"What is happening across my school right now?"
The dashboard shall display
School overview
•	Total students
•	Total teachers
•	Total school staff
•	Active classes
•	Sections
•	Subjects
•	Current academic year
•	Enrollment overview
Attendance
•	Student attendance
•	Teacher attendance
•	Attendance problems
•	Repeated absence
•	Attendance trends
Academic
•	Assessment overview
•	Academic performance
•	Assignment/activity overview
•	Curriculum/teaching progress
•	Students requiring academic support
•	Students with attendance problems
•	Students at risk of disengagement/dropout
•	Students with repeated academic difficulties
School management
•	School improvement status
•	School targets
•	Open school issues
•	Pending administrative actions
•	Important school announcements
•	Important education-authority announcements
These dashboard requirements are explicitly specified in the School Administrator requirements.
Drill-down
The dashboard should not merely display numbers.
The Principal should be able to drill down:
School
 ↓
Grade
 ↓
Section
 ↓
Subject
 ↓
Teacher / Student
subject to authorization.
Example
Students                  842
Teachers                   42
Active Sections            24

Student Attendance        87%
Teacher Attendance        94%

Students Requiring Support 18
Open School Issues          6

School Improvement
7 / 10 targets on track
Clicking 18 students requiring support should take the Principal to the appropriate support view.
________________________________________
2. SCHOOL PROFILE & SCHOOL IDENTITY
Purpose
Maintain the school's operational identity and information.
The Principal shall be able to view
•	School name
•	Official school identifier
•	Region
•	Zone
•	Woreda
•	Kebele/locality
•	School sector/level
•	School type
•	Ownership
•	Urban/rural classification
•	Contact information
•	Principal information
•	Vice Principal information
•	Academic year
•	Grades offered
•	Sections/classes
•	Facilities
•	School capacity
•	Infrastructure information
•	Operational status
These fields are explicitly identified in the School Administrator requirements.
Important boundary
The Principal must not arbitrarily modify official identifiers or government geographic hierarchy.
For example:
Region
  ↓
Zone
  ↓
Woreda
  ↓
School
Official identity information must remain controlled by the appropriate higher-level authority/process.
________________________________________
3. ACADEMIC YEAR & SCHOOL CALENDAR
Purpose
Operate the school within the correct academic year without destroying historical information.
The Principal shall be able to
•	View current academic year
•	Activate/open the school's operational year
•	View previous academic years
•	Switch between permitted academic years
•	View historical school information
•	Prepare classes for a new academic year
•	Review student promotion
•	Review repetition
•	Review transfers
•	Review teacher assignments
•	Review subjects
•	Review sections/classes
•	Configure permitted academic periods
•	Review assessment periods
•	Review reporting periods
The SRS also emphasizes historical preservation and academic-year configuration rather than overwriting previous academic structures.
Example
2025/26
 ├── Grade 10A
 ├── Grade 10B
 ├── Teacher assignments
 ├── Attendance
 └── Results

2026/27
 ├── New sections
 ├── New assignments
 └── New enrollment
Changing the year must not erase 2025/26 records.
Boundary
The Principal configures the school's operation.
The Principal does not define national academic policy or national curriculum.
________________________________________
4. STUDENT MANAGEMENT
Purpose
Provide school-wide oversight of student records.
The Principal shall be able to:
•	View all school students
•	Search students
•	Filter by grade
•	Filter by section
•	Filter by sex
•	Filter by enrollment status
•	View student profile
•	View academic history
•	View attendance history
•	View assessment history
•	View support history
•	View transfer history
•	View promotion status
•	View repetition status
•	Assign students to classes/sections where authorized
•	Approve applicable placement actions
•	Review enrollment
•	Review withdrawals
•	Review transfers
•	Review status changes
•	Identify incomplete student records
•	Identify duplicate records
•	Identify inconsistent information
These requirements are directly stated in the source.
Important source-of-truth rule
The Principal should not arbitrarily overwrite sensitive academic records.
Example:
Teacher enters assessment
        ↓
Principal reviews
        ↓
Problem discovered
        ↓
Correction request
        ↓
Authorized correction
        ↓
Audit trail
________________________________________
5. STUDENT ENROLLMENT
This should be treated as a distinct operational function.
The Principal shall be able to
•	View enrollment applications/records
•	Register eligible students where school policy permits
•	Review admission information
•	Confirm enrollment
•	Assign grade
•	Assign section
•	Set enrollment status
•	Review new entrants
•	Review returning students
•	Review repeaters
•	Review transferred-in students
•	Process applicable transfers
•	Record withdrawal
•	Record verified dropout status
•	Review enrollment totals
•	Review enrollment by grade
•	Review enrollment by sex
•	Review enrollment trends
The system must distinguish:
Student exists
from:
Student officially enrolled
at this school
for this academic year
This distinction is explicitly required by the source.
________________________________________
6. TEACHER & STAFF MANAGEMENT
Teacher management
The Principal shall be able to:
•	View teachers
•	Search teachers
•	View profiles
•	View qualifications
•	View specialization
•	View assignments
•	Assign teachers to subjects
•	Assign teachers to grades
•	Assign teachers to sections
•	Review workload
•	Review attendance
•	Review missed lessons
•	Review teaching activity
•	Review assessment activity
•	Review curriculum progress
•	Review professional development
•	Identify teachers requiring support
•	Review teacher performance information
•	Manage applicable school-level status information
•	Request/record substitution where applicable
The source specifically says the Principal should not become the government's HR system.
Staff management
For non-teaching school staff, permissions should reflect their actual responsibilities.
For example:
Principal
   ↓
Registrar
   ↓
Student records
rather than giving every staff member unrestricted Principal privileges.
The SRS supports role-based and minimum-necessary access.
________________________________________
7. TEACHER SUPERVISION
This is broader than simply managing teacher profiles.
The Principal shall be able to:
•	Review teaching activity
•	Review lesson completion
•	Review curriculum progress
•	Review student performance by teacher/class
•	Review attendance by class/teacher
•	Record classroom observations
•	Record supervision observations
•	Provide feedback
•	Identify teaching difficulties
•	Create teacher support actions
•	Monitor improvement actions
•	Review professional-development needs
•	Recommend training/support
•	Record follow-up observations
The system must distinguish:
Performance evidence
        ≠
Disciplinary action
EduBridge supports evidence and workflow; it should not automatically punish teachers.
________________________________________
8. CLASS & SECTION MANAGEMENT
The Principal shall manage the school's academic organization where authorized.
They shall be able to:
•	Create classes/sections
•	View classes
•	Rename sections where permitted
•	Assign grades
•	Set section capacity
•	Assign students
•	Move students between sections
•	View enrollment
•	View gender distribution
•	View attendance
•	View performance
•	View teachers
•	View timetable
•	Identify overcrowded sections
Example
Grade 10

10A — 48 students
10B — 51 students ⚠
10C — 44 students
If capacity is 45:
10B
51 / 45
OVER CAPACITY
This becomes a school management issue.
The source explicitly describes this type of section-management workflow.
________________________________________
9. SUBJECTS & TEACHING ASSIGNMENTS
The Principal shall be able to:
•	View subjects
•	View subject structure
•	Assign teachers to subjects
•	Assign teachers to grades
•	Assign teachers to sections
•	Review teacher-subject compatibility
•	Review workload
•	Identify unassigned subjects
•	Identify classes without teachers
•	Identify excessive teacher workload
•	Review teaching allocation
The core relationship is:
Teacher
   ↓
Subject
   ↓
Grade
   ↓
Section
   ↓
Students
This relationship becomes the basis for later school analytics.
________________________________________
10. TIMETABLE MANAGEMENT
The Principal or authorized academic administrator shall be able to:
•	View timetable
•	Create timetable
•	Edit timetable
•	Assign teacher
•	Assign subject
•	Assign class
•	Assign section
•	Assign room
•	Define periods
•	Define school days
•	Detect teacher conflicts
•	Detect class conflicts
•	Detect room conflicts
•	Publish timetable
•	Notify teachers
•	Notify students
•	Notify parents when appropriate
•	View timetable changes
•	Track timetable history
The Principal should also identify:
•	Missing lessons
•	Repeated conflicts
•	Underused periods
•	Teacher scheduling problems
________________________________________
11. STUDENT ATTENDANCE OVERSIGHT
Teachers normally record attendance.
The Principal oversees the school-wide attendance situation.
The Principal shall be able to:
•	View today's attendance
•	View attendance by grade
•	View by section
•	View by subject
•	View by teacher
•	View individual student history
•	View trends
•	Identify frequent absence
•	Identify repeated lateness
•	Identify poor-attendance classes
•	Identify unusual patterns
•	Review absence explanations
•	Review correction requests
•	Approve/reject authorized corrections
•	Monitor unresolved attendance issues
The normal workflow is:
Teacher records attendance
          ↓
School system stores record
          ↓
Principal monitors
          ↓
Problem identified
          ↓
Action / correction / intervention
The Principal should not manually enter every student's attendance.
________________________________________
12. TEACHER ATTENDANCE & TEACHING CONTINUITY
The Principal shall be able to:
•	View teacher attendance
•	View lateness
•	View absence
•	View approved leave where integrated
•	Identify missed lessons
•	Identify repeated absence
•	Identify affected classes
•	Arrange/request substitute teachers where applicable
•	Monitor instructional continuity
Important:
Teacher absent
      ↓
Substitute teaches
      ↓
Lesson completed
is not the same as:
Teacher absent
      ↓
No substitute
      ↓
Lesson missed
This distinction matters for school management.
________________________________________
13. ASSESSMENT & RESULTS OVERSIGHT
The Principal has school-wide assessment oversight.
The Principal shall be able to:
•	View assessment schedule
•	View assessments by grade
•	View by subject
•	View by teacher
•	View class results
•	View subject results
•	View grade results
•	View student performance
•	View pass/failure distributions
•	View trends
•	Identify low-performing subjects
•	Identify low-performing classes
•	Identify students requiring support
•	Review assessment completion
•	Review missing results
•	Review unusual result patterns
•	Approve applicable result-finalization workflows
•	Monitor publication
The Principal must not arbitrarily rewrite teacher-entered marks.
Corrections must follow an authorized process with traceability.
________________________________________
14. STUDENT SUPPORT & INTERVENTIONS
The Principal shall oversee school-level student support.
They shall be able to:
•	View students requiring support
•	View academic-risk indicators
•	View attendance-risk indicators
•	View combined risk indicators
•	Review teacher recommendations
•	Create school-level interventions
•	Assign intervention responsibility
•	Assign remedial programs
•	Assign tutoring/support sessions
•	Monitor intervention attendance
•	Monitor intervention results
•	Compare before/after performance
•	Close completed interventions
•	Escalate serious cases
The system should say:
"Student may require support."
not:
"Student will fail."
The source explicitly preserves professional/human judgment.
________________________________________
15. DROPOUT & STUDENT RETENTION MONITORING
The Principal shall be able to identify students showing signs of disengagement.
Indicators include:
•	Repeated absence
•	Declining attendance
•	Declining academic performance
•	Repeated academic difficulty
•	Reduced participation
•	Other authorized indicators
The Principal shall be able to:
•	Identify students requiring attention
•	Record interventions
•	Track follow-up
•	Record verified withdrawal/dropout status
•	Review dropout patterns
•	Compare by grade
•	Compare by sex
•	Compare academic years
•	Identify unusual grade/class patterns
The system should distinguish risk detection from official dropout status.
AI or analytics must never automatically declare a student a dropout.
________________________________________
16. CURRICULUM & TEACHING PROGRESS
The Principal shall monitor:
•	Expected curriculum progress
•	Actual progress
•	Progress by grade
•	Progress by subject
•	Progress by teacher
•	Progress by section
•	Delayed areas
•	Completed units
•	Incomplete units
•	Classes falling behind
The Principal shall be able to:
Identify delay
      ↓
Request explanation
      ↓
Create support action
      ↓
Monitor recovery
      ↓
Measure outcome
The purpose is school implementation and monitoring, not changing the national curriculum.
________________________________________
17. ASSIGNMENT & LEARNING ACTIVITY OVERSIGHT
Teachers create classroom activities.
The Principal monitors the school-wide picture.
The Principal shall be able to:
•	View assignments
•	Filter by grade
•	Filter by subject
•	Filter by teacher
•	View due dates
•	View completion rates
•	View overdue activities
•	Identify low-completion classes
•	Identify low-participation subjects
•	Review activity trends
•	Monitor teacher activity
The Principal does not need to personally grade every assignment.
________________________________________
18. PARENT / GUARDIAN MANAGEMENT
The Principal shall be able to:
•	View guardians connected to students
•	Approve/verify relationships where required
•	View contact status
•	Identify students without connected guardians
•	Send school-wide parent announcements
•	Send grade-level announcements
•	Communicate with parents
•	Organize parent meetings
•	Track meeting participation where appropriate
•	Send attendance alerts
•	Send academic-support notifications
•	Review communication history
•	Manage parent communication permissions where authorized
The Principal must only access family information necessary for school operations.
________________________________________
19. SCHOOL COMMUNICATION
The Principal shall communicate with:
•	Teachers
•	Students
•	Parents/guardians
•	School staff
•	School committees
•	Appropriate higher-level education offices
Capabilities:
•	School announcements
•	Targeted messages
•	School-wide notices
•	Emergency notices
•	Scheduled announcements
•	Attach approved documents
•	Receive responses
•	Track delivery
•	Review communication history
________________________________________
20. SCHOOL IMPROVEMENT
This is one of the Principal's most important responsibilities.
The Principal shall be able to:
•	Review school strengths
•	Identify weaknesses
•	Identify priority problems
•	Create improvement objectives
•	Define targets
•	Define activities
•	Assign responsible people
•	Define timelines
•	Track activities
•	Record progress
•	Record evidence
•	Review outcomes
•	Close completed activities
•	Review unfinished activities
•	Prepare annual improvement plans
•	Review previous plans
•	Compare targets with actual outcomes
Example
Problem
Grade 8 mathematics performance is low
        ↓
Target
Increase average performance
        ↓
Intervention
Weekly remedial mathematics
        ↓
Responsible
Mathematics department
        ↓
Monitoring
Monthly
        ↓
Outcome
Performance improves
This is much more meaningful than simply storing:
Mathematics average = 48%
The source explicitly describes this improvement-management cycle.
________________________________________
21. SCHOOL IMPROVEMENT COMMITTEES & COMMUNITY PARTICIPATION
The Principal shall be able to:
•	View committees
•	View committee members
•	Create/manage committee records where authorized
•	Schedule meetings
•	Create agendas
•	Record minutes
•	Record decisions
•	Assign actions
•	Track action completion
•	Record community participation
•	Monitor participation in improvement activities
Committees do not automatically receive Principal-level permissions.
________________________________________
22. SCHOOL RESOURCES & FACILITIES
The Principal shall monitor school resources such as:
•	Classrooms
•	Laboratories
•	Libraries
•	ICT facilities
•	Textbooks
•	Learning materials
•	Furniture
•	Water
•	Sanitation
•	Electricity
•	Internet/connectivity
•	Accessibility facilities
•	Other infrastructure
The Principal shall be able to:
•	View resource availability
•	Record resource problems
•	Report missing resources
•	Report damaged facilities
•	Track maintenance requests
•	Track resource needs
•	Prioritize needs
•	Monitor resolution
This connects operational problems with school improvement.
________________________________________
23. SCHOOL PROBLEMS / ISSUE MANAGEMENT
The Principal shall be able to create and manage school-level issues.
Examples:
•	Teacher shortage
•	Student overcrowding
•	Classroom shortage
•	Textbook shortage
•	Laboratory problem
•	Internet problem
•	Attendance problem
•	Academic performance problem
•	Student welfare concern
•	Infrastructure problem
•	Safety concern
•	Accessibility problem
Each issue should contain:
Problem
Category
Priority
Responsible person
Date identified
Action
Status
Evidence
Resolution
Escalation
________________________________________
24. SCHOOL REPORTS
Reports shall cover:
Student
•	Enrollment
•	Distribution
•	Promotion
•	Repetition
•	Transfer
•	Withdrawal
•	Attendance
•	Performance
•	Support/intervention
•	Dropout
Teacher
•	Teacher numbers
•	Teacher distribution
•	Assignments
•	Workload
•	Attendance
•	Teaching activity
•	Professional development
Academic
•	Subject performance
•	Grade performance
•	Section performance
•	Assessment performance
•	Curriculum progress
School
•	School performance
•	Attendance
•	Improvement
•	Resources/facilities
•	Operational problems
Parent/community
•	Parent participation
•	Parent communication
•	Meetings
•	School-community activities
These report categories are explicitly specified in the source.
________________________________________
25. SCHOOL ANALYTICS
Analytics should not merely show static numbers.
The Principal should be able to analyze:
•	Enrollment trends
•	Attendance trends
•	Teacher attendance
•	Academic trends
•	Subject performance
•	Grade performance
•	Section performance
•	Student support trends
•	Dropout trends
•	Promotion trends
•	Repetition trends
•	Teacher workload
•	Curriculum progress
•	School improvement progress
The analytical workflow should be:
Current state
      ↓
Trend
      ↓
Problem
      ↓
Drill-down
      ↓
Action
      ↓
Outcome
Example
Grade 9 Mathematics
Performance ↓ 12%
        ↓
Grade 9 sections
        ↓
Section 9B
        ↓
Teacher
        ↓
Assessment
        ↓
Students
        ↓
Action
This exact current-state → trend → problem → drill-down → action model is specified in the requirements.
________________________________________
26. AI SCHOOL LEADERSHIP ASSISTANT
AI is a decision-support tool, not an autonomous school authority.
The Principal can ask
•	Which grade has the lowest attendance?
•	Which subjects are below the school average?
•	Which students have low attendance and declining performance?
•	Which classes are behind curriculum progress?
•	What changed compared with last term?
•	Which improvement activities are behind?
•	Which school problems appear most urgent?
AI can summarize
•	School performance
•	Attendance
•	Assessment
•	Student support
•	Teacher activity
•	School improvement
AI can detect patterns
•	Attendance decline
•	Performance decline
•	Possible data anomalies
•	Repeated support needs
•	Classes requiring attention
•	Curriculum delays
AI can recommend actions
Example:
Grade 10B has declining Mathematics performance and attendance. Consider reviewing teacher feedback, attendance patterns, and remedial participation.
AI must NOT
•	Fail students
•	Promote students
•	Change marks
•	Change attendance
•	Discipline teachers
•	Declare dropout
•	Make official education decisions
The SRS explicitly establishes human authority over AI.
________________________________________
27. PRINCIPAL NOTIFICATIONS & ALERTS
The Principal shall receive important school alerts.
Attendance
Grade 8 attendance has fallen significantly.
Academic
Mathematics performance is below the school target.
Teaching
Several scheduled lessons were not conducted.
Student
12 students show combined attendance and performance concerns.
Curriculum
Grade 10 Science is behind schedule.
Data
Several classes have incomplete assessment records.
Improvement
Three school-improvement activities are overdue.
Alerts should be evidence-based, not generated merely to populate a dashboard.
________________________________________
28. DATA QUALITY MANAGEMENT
The Principal should be able to see:
•	Missing student records
•	Duplicate records
•	Missing teacher assignments
•	Missing attendance
•	Missing assessment results
•	Invalid class assignments
•	Incomplete parent relationships
•	Incomplete school information
•	Unsubmitted teacher records
•	Unusual data patterns
And:
•	Review
•	Request correction
•	Correct authorized school information
•	Return records to responsible users
•	Track unresolved data-quality issues
This is especially important because school data may later be aggregated into higher administrative levels.
The SRS also explicitly includes data-quality management as a major product function.
________________________________________
29. AUDIT & ACCOUNTABILITY
The Principal shall be able to view appropriate school-level audit information.
Examples:
Who changed a student record?
Who entered an assessment?
Who corrected attendance?
Who approved a request?
When?
What was the old value?
What is the new value?
Why was it changed?
The Principal must not be able to erase the audit trail.
This is consistent with the SRS requirement for audit logging and traceability.
________________________________________
30. SCHOOL SETTINGS
The Principal or authorized school administrator shall be able to configure permitted operational settings:
•	Academic configuration
•	Classes
•	Sections
•	Subjects
•	Timetable periods
•	Attendance rules where permitted
•	Assessment periods
•	School communication settings
•	Parent communication settings
•	Notification settings
•	School calendar
•	Authorized school users
This is school configuration, not national education policy.
________________________________________
31. USERS & PERMISSIONS
This needs an important clarification compared with your original feature tree.
The Principal should be able to manage authorized school users and school-level roles/permissions, but the Principal is not the platform-wide identity administrator.
The system should support roles such as:
Principal
Vice Principal / Academic Leader
Teacher
Student
Parent / Guardian
Registrar / Records Staff
Administrative Support
Assessment Support
Resource / Library Staff
Student Support Staff
ICT Support
Permissions should follow:
Role
 +
School scope
 +
Permission
 =
Authorized operation
For example:
Registrar
 → student records

Teacher
 → assigned classes/students

Parent
 → linked child

Principal
 → school-wide authorized data
The SRS explicitly requires users to access only information appropriate to their role and administrative scope.
________________________________________
32. DATA IMPORT & SCHOOL ONBOARDING
This is an important requirement that your 16-item tree does not emphasize enough.
The SRS-related administrator material requires support for importing existing:
•	Schools
•	Students
•	Teachers
•	Classes
•	Subjects
•	Attendance history
•	Assessment summaries
•	School information
Possible mechanisms include:
•	CSV
•	Excel
•	API
•	Secure migration
The process should be:
Existing school system
        ↓
Import
        ↓
Validation
        ↓
Duplicate detection
        ↓
Error review
        ↓
Approved import
        ↓
EduBridge
The source explicitly states that schools should not necessarily have to start from zero.
Data validation
The system should detect:
•	Missing student IDs
•	Duplicate students
•	Invalid school IDs
•	Invalid teacher IDs
•	Invalid grades
•	Invalid classes
•	Invalid relationships
•	Duplicate phone numbers
•	Invalid dates
________________________________________
33. HISTORICAL DATA PRESERVATION
The Principal must be able to view historical school information without destroying previous records.
For example:
2025/26
Grade 10B
Teacher: Abebe
Results
Attendance
Enrollment
must remain available after:
2026/27
becomes active.
Historical records must remain associated with their relevant academic year.
This follows the SRS's emphasis on historical data management and reporting.
________________________________________
34. CROSS-CUTTING AUTHORIZATION
This is mandatory across every feature.
The authorization model is:
Authentication
      ↓
Role
      ↓
Organization / School scope
      ↓
Permission
      ↓
Record-level authorization
      ↓
Action
A Principal from School A must never be able to retrieve:
School B students
School B teachers
School B attendance
School B results
School B parents
The SRS explicitly states that organizational position determines maximum scope while role determines what the user can do within that scope.
________________________________________
35. SOURCE-OF-TRUTH RULE
The Principal UI must never create parallel/fake academic records.
The architecture should remain:
Student
   ↓
Enrollment
   ↓
Section placement
   ↓
Attendance
   ↓
Assessment
   ↓
Support
   ↓
Analytics
and:
Teacher
   ↓
Teaching assignment
   ↓
Timetable
   ↓
Teaching activity
   ↓
Assessment
   ↓
Performance
Dashboards and analytics should be derived from these operational records.
The SRS explicitly defines source-of-truth discipline and says EduBridge should avoid unnecessary duplication of specialized systems.
________________________________________
36. PRINCIPAL SHALL NOT DO
This is critical.
The Principal shall not:
•	Change the national curriculum
•	Change national examination results
•	Create national education policy
•	Modify regional statistics
•	Modify Woreda statistics directly
•	Access another school's private records
•	Access another school's students/teachers
•	Change official government identifiers without authorization
•	Arbitrarily rewrite historical assessment records
•	Arbitrarily change teacher attendance
•	Arbitrarily change student attendance
•	Automatically determine student dropout using AI
•	Automatically determine student failure using AI
•	Automatically discipline teachers using AI
These boundaries are explicitly stated in the School Administrator requirements.
Also, the SRS distinguishes the Platform Administrator from the School Administrator: the platform role manages software configuration, technical operations, roles and permissions, while technical administration does not automatically grant access to private educational records.
________________________________________
37. THE COMPLETE PRINCIPAL WORKFLOW
The entire actor can be understood as:
                    PRINCIPAL
                        │
                       PLAN
                        │
        ┌───────────────┼────────────────┐
        │               │                │
   Academic         Teachers         School targets
   organization     Students         Improvement
   Classes          Subjects         Resources
   Timetable        Staffing         Calendar
        │               │                │
        └───────────────┼────────────────┘
                        │
                      OPERATE
                        │
        ┌───────────────┼────────────────┐
        │               │                │
     Students       Teaching         Assessment
     Attendance     Activities       Results
     Parents        Resources        Support
        │               │                │
        └───────────────┼────────────────┘
                        │
                     MONITOR
                        │
        ┌───────────────┼────────────────┐
        │               │                │
    Performance     Attendance       Curriculum
    Teachers        Students         Resources
    Enrollment      Assessment       Improvement
                        │
                        ▼
                    IDENTIFY
                        │
        ┌───────────────┼────────────────┐
        │               │                │
      Problems       At-risk         Data-quality
      Students       students         problems
      Teachers       Classes          Resource gaps
                        │
                        ▼
                      ACT
                        │
        ┌───────────────┼────────────────┐
        │               │                │
    Intervention    Teacher support   Improvement
    Remedial        Parent action     Resource action
    Communication   School action     Escalation
                        │
                        ▼
                    MEASURE
                        │
             Outcomes / Trends / Targets
                        │
                        ▼
                     REPORT
                        │
                  Higher authorities
This matches the source's final Principal workflow: PLAN → OPERATE → MONITOR → IDENTIFY → ACT → MEASURE → REPORT.
________________________________________
One important correction to your original 16-feature tree
Your original tree is very good, but I would add these as explicit Principal requirements because they are present in the SRS/source material and are important enough not to hide inside another feature:
SCHOOL ADMINISTRATOR / PRINCIPAL
│
├── 1. School Dashboard
├── 2. School Profile
├── 3. Academic Year & Calendar
├── 4. Student Management
├── 5. Student Enrollment
├── 6. Teacher & Staff Management
├── 7. Teacher Supervision
├── 8. Class & Section Management
├── 9. Subjects & Teaching Assignments
├── 10. Timetable
├── 11. Student Attendance
├── 12. Teacher Attendance
├── 13. Assessment & Results
├── 14. Student Support & Intervention
├── 15. Dropout / Retention Monitoring
├── 16. Curriculum / Teaching Progress
├── 17. Learning Activity Oversight
├── 18. Parent / Guardian Management
├── 19. Communication
├── 20. School Improvement
├── 21. School Improvement Committees
├── 22. Resources & Facilities
├── 23. School Issues
├── 24. Reports
├── 25. School Analytics
├── 26. AI School Leadership
├── 27. Notifications & Alerts
├── 28. Data Quality
├── 29. Audit & Accountability
├── 30. School Settings
├── 31. Users & Permissions
├── 32. Data Import / Migration
└── 33. Historical School Data
That gives you a much more faithful Principal specification than simply implementing the original 16 sidebar categories. The SRS itself identifies school management, student/teacher information, attendance, resources, reporting, dashboards/drill-down, alerts/problems/interventions, communication, data import, historical management, audit and data quality as major system functions.

