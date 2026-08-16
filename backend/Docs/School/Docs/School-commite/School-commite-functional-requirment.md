EduBridge — School Committee / Representative Functional Requirements
0. Role Definition
The School Committee / Representative is a school-governance and community-representation actor.
The central question for this actor is:
"How is the school progressing, what concerns does the school community have, and how can the committee participate in improving the school?"
The committee should act as a bridge between:
School Leadership
      │
      │ information + improvement priorities
      ▼
School Committee
      │
      │ community participation + oversight + feedback
      ▼
Parents / Community / Students / Teachers
The committee should have visibility into appropriate school-level information, but should not receive unrestricted access to confidential student, teacher, assessment, or personnel records.
Core principles
The School Committee shall:
•	Participate in school improvement planning.
•	Review selected school priorities.
•	Monitor agreed improvement targets.
•	Participate in meetings.
•	Record decisions and action items.
•	Provide community feedback.
•	Submit school concerns.
•	Submit improvement suggestions.
•	Follow selected issues.
•	Review appropriate school-level reports.
•	Promote accountability and community participation.
The committee shall not:
•	Manage students directly.
•	Create student records.
•	Enter student grades.
•	Modify assessment results.
•	Record attendance.
•	Manage teacher assignments.
•	Manage teacher employment.
•	Change the academic curriculum.
•	Manage school authentication/permissions.
•	Override the Principal.
•	Access confidential records without explicit authorization.
________________________________________
1. Committee Dashboard
The dashboard is the committee's governance and participation command center.
It should answer:
"What is the committee responsible for, what is happening with school improvement, and what requires our attention?"
Display
The dashboard should show:
•	Committee name
•	School name
•	Current academic year
•	Number of committee members
•	Upcoming meetings
•	Recent meetings
•	Open action items
•	Assigned activities
•	Improvement priorities
•	Improvement targets being monitored
•	Recently submitted concerns
•	Open concerns
•	Recent community feedback
•	Upcoming committee activities
•	Recent decisions
•	Important school notices
Example
School Committee

Members                         12
Upcoming Meetings                2
Open Action Items                5
Improvement Priorities            4
Open Concerns                     3

Current Priority

Improve Grade 8 Mathematics

Target:
Average performance: 55% → 70%

Progress:
62%

Status:
IN PROGRESS
Dashboard alerts
The dashboard may highlight:
HIGH
3 action items are overdue

MEDIUM
Grade 8 improvement target is behind schedule

INFO
Committee meeting scheduled tomorrow
The dashboard must use real backend information, not hardcoded numbers.
________________________________________
2. Committee Information & Membership
The committee should have a dedicated area showing its organizational information.
Committee information
Display:
•	Committee name
•	School
•	Committee type
•	Formation date
•	Current term/period
•	Status
•	Chairperson
•	Secretary
•	Other relevant officers
•	Member count
Members
Display appropriate member information:
•	Name
•	Role
•	Representation type
•	Status
•	Contact information where authorized
•	Committee participation
•	Meeting attendance
Possible representation types:
Parent representative
Teacher representative
Community representative
Student representative
Local/community representative
Other authorized representative
Membership history
Where supported, preserve:
•	Previous members
•	Membership period
•	Role changes
•	Committee terms
Historical membership should not disappear simply because a new committee term begins.
________________________________________
3. School Improvement Participation
This is the most important functional area of the School Committee.
The committee participates in school improvement rather than operating the school's daily academic activities.
The school leadership may create improvement priorities, and the committee should be able to review and participate in them.
View improvement priorities
The committee should be able to see appropriate priorities such as:
Priority 1
Improve student attendance

Priority 2
Improve Grade 8 mathematics performance

Priority 3
Improve classroom resources

Priority 4
Improve school sanitation
For each priority, display:
•	Problem
•	Evidence
•	Priority level
•	Target
•	Current status
•	Responsible school team
•	Planned activities
•	Start date
•	Target date
•	Progress
•	Committee involvement
Example
Priority:
Improve Grade 8 Mathematics

Problem:
Average performance is 55%.

Target:
70%

Current:
62%

Activities:
- Remedial classes
- Teacher support
- Additional learning materials

Target date:
June 30

Committee role:
Monitor progress
________________________________________
4. Participate in Improvement Planning
The committee should be able to participate in the planning process.
Capabilities
Where authorized, committee members can:
•	Review proposed priorities.
•	Provide feedback.
•	Suggest priorities.
•	Suggest improvement activities.
•	Comment on proposed targets.
•	Recommend community support.
•	Recommend resources.
•	Participate in planning meetings.
•	Record committee recommendations.
Example
School proposes:
"Improve student attendance."
Committee recommendation:
"Work with parents of frequently absent students and organize a parent awareness meeting."
The recommendation becomes part of the improvement-planning record.
Important boundary
The committee recommendation does not automatically become school policy.
The authorized school leadership remains responsible for official implementation and approval.
________________________________________
5. Improvement Activity Monitoring
The committee should be able to monitor selected activities.
For example:
Improvement Priority
        ↓
Grade 8 Mathematics
        ↓
Activity
Remedial Program
        ↓
Responsible Team
Academic Department
        ↓
Target
+15 percentage points
Display:
•	Activity
•	Responsible person/team
•	Start date
•	Target date
•	Status
•	Progress
•	Target
•	Actual result
•	Committee comments
Status
NOT STARTED
IN PROGRESS
AT RISK
COMPLETED
DELAYED
CANCELLED
The committee should monitor, not directly manage the teacher or student carrying out the activity.
________________________________________
6. Improvement Target Monitoring
Committee members may monitor selected targets.
Examples:
Attendance
Target: 90%
Current: 84%
Status: Behind
Performance
Target: 70%
Current: 64%
Status: At Risk
School infrastructure
Target:
Repair 10 classrooms

Completed:
7

Remaining:
3
Monitoring history
The system should preserve:
January
55%

February
59%

March
64%

April
68%
This allows the committee to understand whether the school is actually improving.
________________________________________
7. Community Participation
The committee acts as a bridge between the school and community.
The system should provide a structured mechanism for community participation.
Community feedback
Committee members can record or submit:
•	Parent concerns
•	Community concerns
•	Student concerns
•	Teacher/community concerns
•	Suggestions
•	Resource needs
•	School-environment concerns
•	Safety concerns
•	Inclusion concerns
•	Academic concerns
•	Infrastructure concerns
Example
Concern

Category:
Infrastructure

Title:
Insufficient classroom desks

Description:
Grade 7B currently has 8 fewer desks than
the number of enrolled students.

Submitted by:
Community Representative

Status:
OPEN
________________________________________
8. Parent / Community Feedback
The committee should be able to review aggregated or authorized feedback.
Possible categories:
Academic
Attendance
School environment
Infrastructure
Learning resources
Student wellbeing
Communication
Safety
Community participation
Other
Feedback dashboard
Example:
Community Feedback — Current Term

Academic concerns          14
Infrastructure concerns     9
Attendance concerns         6
Communication concerns      4
Other                       3
The system should avoid exposing sensitive personal information unnecessarily.
________________________________________
9. Student Feedback
The committee may receive or review appropriate student/community feedback.
Examples:
•	Learning environment concerns
•	School facilities
•	Safety concerns
•	Learning-resource concerns
•	Extracurricular activities
•	General school experience
The committee should not receive unrestricted confidential student records.
For example, it should not expose:
Student medical record
Student disciplinary record
Student private assessment history
Student protected support information
unless a specific authorization model permits it.
________________________________________
10. Teacher / Community Concerns
The committee can receive appropriate concerns involving the school environment.
Examples:
"Students need additional science laboratory resources."

"Parents need more information about academic activities."

"Community members are concerned about school sanitation."

"Teachers report insufficient teaching materials."
The committee can:
•	Review the concern.
•	Discuss it.
•	Provide feedback.
•	Recommend action.
•	Track the issue where authorized.
It should not become a teacher disciplinary system.
________________________________________
11. Participation Records
The system should preserve evidence of community participation.
Track:
•	Person
•	Role
•	Activity
•	Date
•	Participation type
•	Meeting attendance
•	Feedback submitted
•	Recommendation submitted
•	Action assigned
•	Outcome
Example:
Member:
Abebe Kebede

Activity:
School Improvement Planning

Date:
March 10

Participation:
Planning meeting

Contribution:
Recommended additional parent engagement

Status:
Recorded
This helps establish accountability.
________________________________________
12. Committee Meetings
Meetings are a major operational feature.
The committee should have a dedicated meeting management area.
Meeting list
Display:
•	Upcoming meetings
•	Completed meetings
•	Cancelled meetings
•	Meeting date
•	Meeting location
•	Meeting type
•	Chairperson
•	Status
Meeting types
Examples:
•	Regular committee meeting
•	School improvement meeting
•	Community meeting
•	Emergency meeting
•	Academic/community review
•	Resource planning meeting
________________________________________
13. Meeting Scheduling
Where authorized, the committee can participate in scheduling meetings.
A meeting may contain:
•	Title
•	Date
•	Start time
•	End time
•	Location
•	Organizer
•	Chairperson
•	Participants
•	Agenda
•	Related improvement priority
•	Status
Example:
School Improvement Committee Meeting

Date:
April 15

Time:
10:00 AM

Location:
School Meeting Hall

Topic:
Grade 8 performance improvement

Related Priority:
Student Performance

Status:
Scheduled
________________________________________
14. Meeting Agenda
Every formal meeting should support an agenda.
Agenda items can contain:
•	Topic
•	Description
•	Presenter
•	Priority
•	Related improvement priority
•	Expected decision/action
Example:
Agenda

1. Review previous action items
2. Grade 8 performance
3. Student attendance
4. Classroom resource needs
5. Community feedback
6. New action items
________________________________________
15. Meeting Attendance
The system should record meeting attendance.
For each participant:
Present
Absent
Excused
Late
Example:
Committee Meeting — April 15

Members: 12

Present: 10
Absent: 1
Excused: 1
Where applicable, meeting quorum should be visible to authorized users.
________________________________________
16. Meeting Decisions
The committee should be able to record decisions/recommendations from meetings.
Example:
Decision

The committee recommends providing
additional Grade 8 mathematics
learning materials.

Decision type:
Recommendation

Status:
Submitted to School Leadership
The system should distinguish:
•	Discussion
•	Recommendation
•	Decision
•	Approval
•	Escalation
The committee should not be able to record something as an official school administrative decision if that authority belongs to the Principal or another authorized body.
________________________________________
17. Meeting Action Items
Decisions should be convertible into action items.
Each action item should contain:
•	Action
•	Responsible person/team
•	Due date
•	Priority
•	Status
•	Related meeting
•	Related improvement priority
•	Progress
•	Outcome
Example:
Action:

Organize parent meeting for Grade 8 attendance.

Responsible:
Parent Engagement Team

Due:
May 10

Status:
IN PROGRESS
________________________________________
18. Action Item Monitoring
Committee members should be able to monitor actions relevant to them.
Statuses:
OPEN
IN PROGRESS
COMPLETED
OVERDUE
BLOCKED
CANCELLED
Example:
5 Open Actions

2 In Progress
1 Completed
1 Overdue
1 Blocked
The committee should not modify another person's work records without authorization.
________________________________________
19. Submit School Concerns
The committee should be able to submit formal school concerns.
A concern should contain:
•	Title
•	Category
•	Description
•	Evidence
•	Severity
•	Affected area
•	Date submitted
•	Submitter
•	Suggested action
•	Status
Categories may include:
Academic
Attendance
Infrastructure
Resources
Student wellbeing
Safety
Communication
Community
Environment
Other
Example:
Concern:
Insufficient science laboratory equipment

Severity:
HIGH

Evidence:
Grade 9 students cannot complete
planned practical activities.

Suggested action:
Review laboratory resource requirements.

Status:
Submitted
________________________________________
20. Improvement Suggestions
A concern and a suggestion should be separate concepts.
Concern
"The school does not have enough desks."
Suggestion
"Partner with the local community to support desk procurement."
A suggestion should support:
•	Title
•	Description
•	Category
•	Expected benefit
•	Suggested resources
•	Submitter
•	Date
•	Status
•	School response
________________________________________
21. Issue Follow-Up
Committee members should be able to follow selected issues.
Example:
Issue:
Insufficient classroom desks

Submitted:
March 2

Status:
Under Review

School response:
Procurement request submitted

Latest update:
40 desks ordered

Expected completion:
April 20
Possible statuses:
SUBMITTED
UNDER REVIEW
ACCEPTED
IN PROGRESS
RESOLVED
REJECTED
CLOSED
If an issue is rejected, an appropriate explanation should be available where the system permits.
________________________________________
22. School Response to Committee Feedback
The feedback loop should not stop at submission.
The system should support:
Committee submits concern
        ↓
School leadership reviews
        ↓
Response
        ↓
Action
        ↓
Progress
        ↓
Outcome
        ↓
Committee sees status
Example:
Committee:
"Grade 7 classrooms need additional desks."

Principal:
"Request approved."

Action:
"Purchase 30 desks."

Progress:
20/30 delivered.

Outcome:
Completed.
This creates real accountability.
________________________________________
23. Committee Reports
The committee should have access to reports appropriate to its governance role.
Improvement progress
Show:
•	Improvement priorities
•	Targets
•	Current status
•	Progress
•	Delayed activities
•	Completed activities
•	Outstanding actions
Example:
School Improvement — Term 2

Priority                     Progress

Attendance improvement        72%
Grade 8 performance           64%
Infrastructure improvement    81%
Parent participation          58%
________________________________________
24. Meeting Reports
Meeting reports should contain:
•	Meeting
•	Date
•	Participants
•	Attendance
•	Agenda
•	Discussions
•	Decisions
•	Recommendations
•	Action items
•	Responsible persons
•	Deadlines
•	Follow-up status
Example:
Meeting Report

Date:
April 15

Participants:
10 / 12

Main discussion:
Grade 8 performance

Recommendation:
Expand remedial support

Action:
Academic team to review intervention

Deadline:
May 1
________________________________________
25. Committee Activity Reports
Provide an overview of committee participation.
Possible metrics:
•	Meetings attended
•	Meetings held
•	Recommendations submitted
•	Concerns submitted
•	Suggestions submitted
•	Improvement activities reviewed
•	Action items completed
•	Action items overdue
•	Community feedback reviewed
Example:
Committee Activity — Current Year

Meetings held              8
Meetings attended          7
Recommendations            12
Concerns submitted          5
Improvement reviews         9
Actions completed          18
Actions overdue             2
________________________________________
26. School Improvement Evidence
Where authorized, committee members should be able to view school-level evidence supporting improvement decisions.
Examples:
Attendance:
91% → 86%

Grade 8 average:
55% → 64%

Parent participation:
42% → 61%
The committee should see enough evidence to participate meaningfully rather than simply receiving unexplained status labels.
________________________________________
27. Notifications
The committee should receive relevant notifications.
Examples:
Meeting
Committee meeting tomorrow at 10:00 AM.
Action
Action item "Parent meeting" is due in 2 days.
Improvement
Grade 8 performance improvement target
has been updated.
Feedback
Your submitted concern has received
a response from school leadership.
Issue
Your followed issue has been resolved.
Notifications should respect the existing communication and authorization system.
________________________________________
28. Communication
The committee may communicate with appropriate school stakeholders.
Possible communication targets:
•	Principal
•	Academic Leader
•	Authorized school staff
•	Committee members
•	Parent/community representatives
Examples:
Request clarification
Submit recommendation
Discuss improvement activity
Respond to school concern
Notify committee members about meetings
The committee should not have unrestricted messaging access to every student or teacher.
________________________________________
29. Community Engagement Activities
The committee may participate in organized community activities.
Examples:
•	Parent engagement
•	Community consultation
•	School improvement campaign
•	Resource mobilization
•	School environment improvement
•	Awareness activities
•	Community support programs
Each activity can contain:
•	Activity name
•	Purpose
•	Date
•	Organizer
•	Participants
•	Target
•	Progress
•	Outcome
________________________________________
30. Resource & Community Support Participation
Where supported by the SRS and authorized governance model, the committee may help identify or mobilize community support.
Examples:
Need:
30 classroom desks

Community contribution:
20 desks

Remaining:
10 desks
Or:
Need:
School library materials

Community contribution:
120 books

Status:
Partially fulfilled
The committee should not independently manipulate the school's financial ledger unless the project's SRS explicitly grants that authority.
________________________________________
31. School Accountability & Transparency
The committee should provide a governance-level view of selected school performance and improvement information.
The purpose is not to expose every school record.
It is to allow the committee to ask:
"Are agreed school priorities actually progressing?"
For example:
Priority:
Improve attendance

Target:
90%

Current:
86%

Status:
AT RISK

Committee action:
Discuss with school leadership
This is consistent with the broader purpose of school-management committees as participatory governance and accountability mechanisms. (ScienceDirect)
________________________________________
32. Committee History
The system should preserve historical committee information.
For example:
2025 Committee

Members:
10

Meetings:
8

Improvement priorities:
4
Then:
2026 Committee

Members:
12

Meetings:
9

Improvement priorities:
5
Historical records should remain available according to authorization.
________________________________________
33. Audit & Traceability
Important committee actions should be traceable.
For example:
Member submitted concern
        ↓
School reviewed concern
        ↓
Response submitted
        ↓
Action created
        ↓
Action completed
Audit information may include:
•	User
•	Action
•	Date/time
•	Record
•	Previous value
•	New value
•	Reason where applicable
This is particularly important for:
•	Meeting decisions
•	Recommendations
•	Improvement targets
•	Concerns
•	Feedback
•	Action items
•	Committee membership changes
________________________________________
34. Authorization & Privacy
This is a critical cross-cutting requirement.
The committee must only access information explicitly permitted for its role.
The committee may generally access
School-level improvement information
Aggregated school statistics
Committee records
Meeting records
Selected school reports
Improvement progress
Community feedback
Assigned activities
The committee should not automatically access
Individual student private records
Student medical information
Individual assessment details
Teacher confidential personnel records
Teacher disciplinary records
Private parent information
Authentication credentials
Internal administrative permissions
The system must enforce school scope and role permissions.
For example:
Committee Member — School A
        ↓
School A improvement data
        ✓

Committee Member — School A
        ↓
School B improvement data
        ✗
________________________________________
35. What the School Committee Does NOT Do
This boundary is essential when implementing the actor.
The School Committee is not the Admin/Principal.
It should not:
•	Create student accounts.
•	Enroll students.
•	Transfer students.
•	Create teacher accounts.
•	Assign teachers to classes.
•	Enter grades.
•	Correct assessment results.
•	Record attendance.
•	Modify student attendance.
•	Create academic years.
•	Manage the timetable.
•	Manage subjects.
•	Manage teacher workload.
•	Manage teacher employment.
•	Manage school authentication.
•	Grant permissions.
•	Access another school.
•	Override the Principal.
•	Make individual student disciplinary decisions.
•	Make individual teacher disciplinary decisions.
•	Modify confidential student records.
•	Make autonomous AI decisions.
________________________________________
36. Overall School Committee Workflow
The complete workflow should look like:
                 SCHOOL COMMITTEE
                         │
                         ▼
                    REVIEW
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       School        Improvement     Community
      information     priorities      feedback
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                    PARTICIPATE
                         │
              ┌──────────┼──────────┐
              │          │          │
           Meeting   Planning    Feedback
              │          │          │
              └──────────┼──────────┘
                         │
                         ▼
                  RECOMMEND / ACT
                         │
              ┌──────────┼──────────┐
              │          │          │
          Suggestion   Concern    Action
              │          │          │
              └──────────┼──────────┘
                         │
                         ▼
                    MONITOR
                         │
                Improvement progress
                         │
                         ▼
                    FOLLOW UP
                         │
                         ▼
                     REPORT
                         │
                         ▼
                 SCHOOL LEADERSHIP
The key distinction from your other actors
Your architecture should therefore look roughly like this:
Principal / Administrator
        │
        │ manages
        ▼
School operations


Vice Principal / Academic Leader
        │
        │ manages/monitors
        ▼
Teaching + learning


School Committee
        │
        │ participates / advises / monitors
        ▼
School governance + improvement


Teacher
        │
        │ executes
        ▼
Teaching + assessment


Student
        │
        │ participates
        ▼
Learning


Parent / Guardian
        │
        │ supports
        ▼
Student + school relationship

