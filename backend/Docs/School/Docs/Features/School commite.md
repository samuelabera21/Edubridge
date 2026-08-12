7. School Committees / School Governance
The purpose of this part of EduBridge is:
Enable the people representing the school community to participate in school improvement, review evidence, provide feedback, and monitor agreed activities.
They do not operate the school's daily academic system.
## 7.1 School Improvement Committee
The committee shall be able to:
School improvement
- Shall view the school's improvement priorities.
- Shall participate in school self-assessment.
- Shall identify school strengths and weaknesses.
- Shall identify priority school problems.
- Shall review evidence supporting identified problems.
- Shall participate in preparing the School Improvement Plan.
- Shall participate in defining improvement objectives.
- Shall participate in defining improvement activities.
- Shall participate in setting improvement targets.
- Shall monitor implementation of improvement activities.
- Shall review progress toward improvement targets.
- Shall record recommendations.
- Shall review completed improvement activities.
- Shall provide feedback to school leadership.
## 7.2 School Improvement Plan
EduBridge should provide a structured improvement workflow:
Problem
→ Evidence
→ Priority
→ Objective
→ Activity
→ Responsible person
→ Target
→ Deadline
→ Progress
→ Result
Example:
Problem
Grade 8 mathematics performance is below target.
Evidence
Average = 48%.
Objective
Improve mathematics performance.
Target
65%.
Intervention
Weekly remedial support.
Responsible
Mathematics teachers.
Deadline
End of semester.
Current
58%.
This allows the committee to monitor whether an identified school problem is actually being addressed.
## 7.3 Committee meetings
The committee shall be able to:
- Shall schedule meetings.
- Shall record meeting dates.
- Shall define meeting agendas.
- Shall record participants.
- Shall record discussions.
- Shall record decisions.
- Shall create action items.
- Shall assign responsible persons.
- Shall assign deadlines.
- Shall track action-item status.
- Shall record follow-up decisions.
- Shall maintain meeting history.
Example:
Meeting: School Improvement Committee
Issue:
Low student attendance.
Decision:
Implement attendance-support intervention.
Responsible:
Vice Principal.
Deadline:
## 30 days.
Status:
In progress.
## 7.4 Parent–Student–Teacher Union / Association
The Ministry's school records explicitly identify the Parent, Student, Teacher Union, and Ministry school-grant guidance gives this structure responsibilities related to school improvement, community awareness and school resources. 
EduBridge should therefore allow authorized members to:
- Shall view approved school-improvement information.
- Shall participate in school-improvement planning.
- Shall provide parent/community feedback.
- Shall raise school-community concerns.
- Shall participate in approved school initiatives.
- Shall monitor selected improvement activities.
- Shall review appropriate school reports.
- Shall participate in discussions concerning school needs.
- Shall support communication between school and community.
- Shall submit recommendations to school leadership.
They should not receive unrestricted access to individual student records.
## 7.5 Basic Teachers Association / Teacher Representative
The Ministry's school records explicitly identify the Chairman of the Basic Teachers Association as a school-level role.
EduBridge should allow the authorized teacher representative to:
- Shall provide teacher feedback.
- Shall participate in school-improvement discussions.
- Shall participate in relevant planning activities.
- Shall communicate approved information to teachers.
- Shall raise teacher-related school concerns.
- Shall review appropriate school-level indicators.
- Shall contribute teacher perspectives to improvement priorities.
- Shall participate in relevant committees.
They should not automatically gain access to private information belonging to every teacher.
## 7.6 Student Representative
The Ministry's actual school profiles identify Student Representative as a school-level position. 
EduBridge should allow the authorized student representative to:
- Shall provide student feedback.
- Shall submit student concerns.
- Shall participate in appropriate school-improvement discussions.
- Shall contribute student perspectives to improvement planning.
- Shall participate in approved student consultation.
- Shall communicate approved information to students.
- Shall participate in appropriate school-community activities.
- Shall monitor selected student-related improvement activities.
The student representative must not be able to inspect another student's:
- grades
- attendance
- personal information
- support records
- disciplinary information
## 7.7 Goodwill Club / Student Activity Representative
The Ministry's School Improvement Portal also identifies Goodwill Club Representative positions. 
EduBridge can represent this as a broader Club / Student Activity permission.
Authorized representatives shall be able to:
- Shall create approved club/activity information.
- Shall organize activities.
- Shall record activities.
- Shall publish approved announcements.
- Shall record participation where appropriate.
- Shall submit activity reports.
- Shall report resource needs.
- Shall track activity progress.
- Shall communicate with participating students.
This gives EduBridge room for:
- clubs
- student organizations
- community activities
- volunteering
- school campaigns
- extracurricular activities
without creating a new actor for every club.
## 7.8 School feedback
Committee members shall be able to submit structured feedback about:
Learning
- Learning problems
- Curriculum implementation concerns
- Student performance concerns
Students
- Attendance concerns
- Student participation
- Student welfare concerns
Teachers
- Teacher support needs
- Teaching-resource concerns
- Professional-development needs
Infrastructure
- Classroom problems
- Water
- Electricity
- Toilets
- Library
- Laboratories
- ICT
- Internet
- Accessibility
These infrastructure categories are particularly relevant because the Ministry's School Improvement Portal tracks school facilities such as water, electricity, classrooms, libraries, laboratories, ICT, internet, toilets and accessibility facilities. 
## 7.9 Committee reports
Authorized committee members shall be able to view:
- School improvement status
- Improvement targets
- Improvement activities
- Activity progress
- Selected attendance indicators
- Selected academic indicators
- School resource indicators
- School facility indicators
- Meeting/action status
But the principle should be:
Committee members see evidence needed for governance, not unrestricted student-level data.
For example:
✅ Grade 10 attendance: 84%
rather than automatically:
❌ Student X was absent on August 10.
## 7.10 AI assistance
AI can be very useful for committees, but it should remain decision support.
School improvement assistant
The committee could ask:
"What are the three biggest school-level problems based on current data?"
The AI might identify:
1.	Low Grade 8 mathematics performance
2.	Increasing absenteeism
3.	Insufficient laboratory resources
Planning assistant
"Draft an improvement plan for the mathematics problem."
Meeting assistant
"Summarize our previous meeting and list unfinished actions."
Progress assistant
"Which improvement activities are behind schedule?"
Evidence assistant
"Show the evidence supporting this improvement priority."
The committee still makes the actual decision.
## 7.11 What School Committees SHALL NOT do
They shall not:
- Change student grades.
- Change attendance records.
- Change teacher assessment records.
- Assign teachers.
- Enroll students.
- Modify official student identity.
- Change class assignments.
- Change the timetable.
- Modify national examination results.
- Modify official school statistics directly.
- Change user permissions.
- Access another school's information.
- Access confidential regional/federal information.
- Override the principal's operational responsibilities.
## 7.12 Final structure for this actor
I recommend we model it as:
```text
SCHOOL COMMITTEES / GOVERNANCE
│
├── School Improvement Committee
│
├── Parent–Student–Teacher Union
│
├── Basic Teachers Association Representative
│
├── Student Representative
│
└── Club / Student Activity Representative
```
These are not five completely independent actors.
They are committee/representation roles with different permissions.
That is important for your future RBAC design.
School actors are now complete
We can now freeze the school-level actor model as:
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
│      ├── Records / Registrar
│      ├── Administrative Support
│      ├── Assessment Support
│      ├── Resource / Library
│      ├── Student Support
│      └── ICT Support
│
└── 7. School Committees / Governance
       ├── School Improvement Committee
       ├── Parent–Student–Teacher Union
       ├── Teacher Representative
       ├── Student Representative
       └── Club / Student Activity Representative


```
`