6. School Support Staff
This should be treated as a role group, not one person with unlimited permissions.
The Ministry's school-classification material explicitly refers to directors and support staff, and expects schools to have systems for collecting, storing and using school data and for proper use of human/material resources.
Therefore EduBridge should allow the principal to assign appropriate support-staff permissions according to the person's actual responsibility.
## 6.1 Support Staff — General responsibility
Their responsibility is:
"Perform the operational school tasks assigned to me and maintain the records related to those tasks."
They should not become another school administrator.
## 6.2 Student/School Records Staff
Where a school has a registrar, secretary, data clerk or similar staff member, EduBridge should allow them to:
Student records
- Shall register/import students when authorized.
- Shall maintain student basic records.
- Shall update permitted student information.
- Shall maintain enrollment records.
- Shall record student admission information.
- Shall record student transfer information.
- Shall record withdrawal information.
- Shall record promotion/status information where authorized.
- Shall assign students to approved grades/classes/sections where authorized.
- Shall search student records.
- Shall identify duplicate student records.
- Shall maintain required supporting documents.
- Shall prepare student lists.
- Shall generate enrollment reports.
Teacher records
- Shall maintain permitted teacher profile information.
- Shall record teacher assignment information when authorized.
- Shall maintain teacher lists.
- Shall support teacher onboarding.
- Shall identify incomplete teacher records.
Data quality
- Shall identify missing information.
- Shall identify duplicate records.
- Shall correct data when authorized.
- Shall submit correction requests when they cannot directly modify a record.
- Shall maintain traceability of record changes.
This is important because EduBridge should not assume that the principal personally performs every data-entry task.
## 6.3 Attendance/Administrative Support
If the school assigns attendance administration to support staff, they may:
- Shall monitor attendance submission status.
- Shall identify classes with missing attendance.
- Shall prepare attendance summaries.
- Shall review attendance exceptions submitted by students/parents.
- Shall forward attendance correction requests to the responsible teacher/administrator.
- Shall generate attendance reports.
- Shall identify persistent attendance problems for school leadership.
But:
They should not freely change teacher-submitted attendance records.
The original record and correction history must remain traceable.
## 6.4 Examination / Assessment Support
Where appropriate, authorized administrative staff may support:
- Shall prepare assessment schedules.
- Shall organize examination sessions.
- Shall manage assessment-related administrative records.
- Shall receive approved results.
- Shall verify completeness of submitted results.
- Shall prepare result reports.
- Shall identify missing assessment results.
- Shall support publication of approved results.
But:
The staff member should not change a teacher's assessment result without an authorized correction process.
And they should never modify official national examination results.
## 6.5 School Resource / Library Support
If EduBridge later includes resource management, an authorized librarian/resource staff member may:
- Shall manage learning-resource records.
- Shall record available textbooks/materials.
- Shall record resource distribution.
- Shall track resource availability.
- Shall record student/resource borrowing where applicable.
- Shall identify shortages.
- Shall report damaged or missing resources.
- Shall provide learning-resource information to students and teachers.
This connects with the broader school-improvement expectation that schools properly utilize educational resources. 
## 6.6 Student Support / Counseling Staff
This is a particularly useful permission specialization rather than necessarily another top-level actor.
Where the school has appropriate personnel, they may:
- Shall view students referred for support.
- Shall record support activities.
- Shall document intervention sessions.
- Shall monitor intervention progress.
- Shall communicate appropriate support recommendations.
- Shall refer cases to school leadership when necessary.
- Shall maintain restricted support information.
For students with special educational needs, Ministry material emphasizes coordinated support involving schools, parents, teachers and other relevant personnel. 
Therefore, this area should have strong privacy controls.
## 6.7 ICT / Technical Support Staff
If the school has an ICT/support person, EduBridge can give them limited technical functions:
- Shall support user access problems.
- Shall assist with device/connectivity issues.
- Shall monitor school-side technical problems.
- Shall assist with data import/export where authorized.
- Shall report system problems.
- Shall assist users with EduBridge operation.
They should not automatically receive access to student academic records merely because they provide technical support.
This is an important security principle:
Technical access ≠ educational-data access.
## 6.8 Support Staff Reports
Depending on their assigned permissions, support staff may:
- Shall generate operational reports.
- Shall view records necessary for their work.
- Shall identify missing data.
- Shall submit data-quality issues.
- Shall support school reporting.
But they should only see the minimum data required for their responsibility.
## 6.9 AI assistance for Support Staff
EduBridge AI can help with operational work.
For example:
Data-quality assistant
"17 student records are missing date-of-birth information."
Enrollment assistant
"12 students appear to have duplicate records."
Attendance assistant
"Grade 8B has not submitted attendance for three consecutive days."
Report assistant
"Generate this month's enrollment summary."
Support assistant
"Which student records require administrative attention?"
The AI should identify, summarize and assist.
It should not silently modify official records.
## 6.10 What Support Staff should NOT do
They should not:
- Change school leadership.
- Change official curriculum.
- Change teacher marks without authorization.
- Modify national examination results.
- Change official student identity without authorization.
- Access unrelated students' private information.
- Access regional/federal confidential information.
- Change school-wide permissions unless specifically authorized.
- Override teacher or principal decisions.
## 6.11 Final Support Staff model
So I recommend we define it like this:
```text
SCHOOL SUPPORT STAFF
│
├── Records / Registrar
│
├── Administrative / Attendance Support
│
├── Assessment / Examination Support
│
├── Library / Resource Support
│
├── Student Support / Counseling
│
└── ICT / Technical Support
```
Not all schools need all of these.
The principal assigns the appropriate permission profile.
This prevents us from creating six unnecessary top-level actors.
7. School Committees
This one is different.
I agree with your earlier decision:
Do not make School Committees a normal full-power EduBridge actor.
Instead, make them a school governance/participation module with controlled member access.
## 7.1 School Improvement Committee
The committee should be able to:
- Shall view school improvement information.
- Shall participate in school self-evaluation.
- Shall identify school strengths and weaknesses.
- Shall participate in identifying priority problems.
- Shall participate in school improvement planning.
- Shall define/approve improvement priorities according to the school's governance process.
- Shall monitor improvement activities.
- Shall monitor progress against school targets.
- Shall review evidence of improvement.
- Shall provide recommendations to school leadership.
- Shall participate in reviewing school performance.
- Shall monitor selected school-improvement indicators.
The Ministry's school-improvement framework describes the School Improvement Committee as having a role in determining how the school-improvement framework is implemented and managed. 
## 7.2 School Improvement Plan
EduBridge should allow authorized committee members to participate in:
Problem
↓
Evidence
↓
Priority
↓
Improvement objective
↓
Activity
↓
Responsible person
↓
Target
↓
Timeline
↓
Progress
↓
Result
For example:
Problem: Grade 8 mathematics performance is low.
Evidence: Average performance = 48%.
Target: Increase to 65%.
Intervention: Weekly remedial sessions.
Responsible: Mathematics department.
Timeline: 12 weeks.
Progress: 58%.
That is much more valuable than simply having a committee meeting record.
## 7.3 Parent–Student–Teacher Union / Association
The platform should support the school's PTSA/PSTA structure where applicable.
Authorized members may:
- Shall view relevant school-improvement information.
- Shall participate in school improvement planning.
- Shall participate in community awareness activities.
- Shall provide feedback to the school.
- Shall participate in approved school/community initiatives.
- Shall monitor selected school-improvement activities.
- Shall review appropriate school reports.
- Shall participate in discussions concerning school needs.
- Shall support communication between school and community.
The Ministry's guidelines specifically give the Parent, Student and Teacher Association responsibilities involving community awareness, school-grant management, school improvement planning and financial overview. 
## 7.4 Teacher Association / Teacher Representative
The Ministry's School Improvement Portal identifies the Chairman of the Basic Teachers Association at schools. 
EduBridge can therefore support a teacher-representative role for appropriate governance functions:
- Shall participate in school improvement discussions.
- Shall provide teacher feedback.
- Shall review relevant school-level issues.
- Shall contribute teacher perspectives to improvement planning.
- Shall communicate approved information to teachers.
- Shall participate in relevant school committees.
But this person does not automatically gain access to every teacher's private information.
## 7.5 Student Representative
The Ministry's school records also explicitly identify Student Representative positions. (SIP)
EduBridge can allow an authorized student representative to:
- Shall view approved student/community information.
- Shall provide student feedback.
- Shall participate in appropriate school-improvement discussions.
- Shall submit student concerns.
- Shall participate in approved student consultation.
- Shall communicate approved information to students.
- Shall contribute student perspectives to improvement planning.
They should not receive access to other students' private academic records.
## 7.6 Goodwill / Student Club Representatives
The Ministry's actual school profiles also identify Goodwill Club Representatives. (SIP)
Rather than creating a completely separate actor, EduBridge can support:
Club / student-activity representative
with permissions to:
- Shall manage approved club information.
- Shall organize activities.
- Shall record activities.
- Shall submit activity reports.
- Shall communicate approved club announcements.
- Shall track participation where appropriate.
- Shall report club needs.
- Shall contribute to student engagement activities.
This can later expand into clubs, volunteering, wellbeing, inclusion, environment, etc.
## 7.7 Committee meetings
This is a useful EduBridge capability.
Authorized committee members should be able to:
- Shall schedule meetings.
- Shall record meeting dates.
- Shall record participants.
- Shall create agendas.
- Shall record decisions.
- Shall assign actions.
- Shall assign responsible persons.
- Shall set deadlines.
- Shall track action completion.
- Shall maintain meeting history.
Example:
School Improvement Committee Meeting
Problem:
Low Grade 10 attendance.
Decision:
Create attendance intervention.
Responsible:
Vice Principal.
Deadline:
## 30 days.
Status:
In progress.
## 7.8 Committee evidence and documents
Where appropriate, EduBridge can allow committees to:
- Shall view approved school reports.
- Shall attach supporting documents.
- Shall upload approved plans.
- Shall view improvement evidence.
- Shall review progress reports.
- Shall maintain relevant committee records.
But sensitive student-level information should remain restricted.
For example:
Committee can see:
Grade 10 attendance: 84%
without necessarily seeing:
Student Hana: absent 7 times
unless there is a legitimate authorized reason.
## 7.9 AI assistance for committees
AI can be useful here, but it should be decision support, not decision-making.
School improvement assistant
"Based on attendance and assessment trends, identify the three biggest school-level improvement priorities."
Meeting assistant
"Summarize the previous meeting and list unfinished actions."
Planning assistant
"Draft an improvement plan for the identified mathematics-performance problem."
Progress assistant
"Which school improvement activities are behind schedule?"
Evidence assistant
"Show evidence supporting the current school improvement priorities."
The committee remains responsible for decisions.
AI only assists.
## 7.10 What committees should NOT do
Committee members should not:
- Change student grades.
- Change attendance.
- Modify teacher records.
- Assign teachers.
- Modify official student identity.
- Change school permissions.
- Modify official examination results.
- Access private student information unnecessarily.
- Access other schools.
- Access Woreda/Regional/Federal confidential data.
- Directly change national education indicators.
Final school actor model
After researching this final area, I recommend we freeze the school actors at seven, exactly as you originally proposed:
EDUBRIDGE — SCHOOL
```text
│
├── 1. School Principal / Administrator
│
├── 2. Vice Principal / Academic Leader
│
├── 3. Teacher
│
├── 4. Student
│
├── 5. Parent / Guardian
│
├── 6. School Support Staff
│      │
│      ├── Records / Registrar
│      ├── Administrative Support
│      ├── Assessment Support
│      ├── Library / Resource
│      ├── Student Support
│      └── ICT Support
│
└── 7. School Committees
       │
       ├── School Improvement Committee
       ├── Parent–Student–Teacher Union
       ├── Teacher Representative
       ├── Student Representative
       └── Clubs / Student Representatives


```
`