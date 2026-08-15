# EduBridge School Foundation Dependency Map

## Identity & Access
Entity: `User`, `Role`, `Permission`, `RoleAssignment`
↓
Depends on: None
↓
Used by: All Domains
↓
Actor modules that consume it: All Modules

## School Identity
Entity: `OrganizationUnit`, `SchoolProfile`
↓
Depends on: Identity & Access
↓
Used by: Academic Core, Student Core, Teacher Core
↓
Actor modules that consume it: Principal, Academic Leader, Support Staff, Committee

## Academic Core
Entity: `AcademicYear`, `Grade`, `Section`, `Subject`
↓
Depends on: School Identity
↓
Used by: Student Core, Teacher Core, Teaching Structure, Assessment Core
↓
Actor modules that consume it: Principal, Academic Leader, Teacher, Student, Parent

## Student Core
Entity: `Student`, `StudentEnrollment`
↓
Depends on: Academic Core
↓
Used by: Parent Relationship, Attendance Core, Assessment Core, Learning & Support Core
↓
Actor modules that consume it: Principal, Academic Leader, Teacher, Student, Parent

## Teacher Core
Entity: `Teacher`, `TeachingAssignment`
↓
Depends on: Academic Core
↓
Used by: Teaching Structure, Attendance Core, Assessment Core
↓
Actor modules that consume it: Principal, Academic Leader, Teacher

## Teaching Structure
Entity: `Timetable`, `Period`
↓
Depends on: Academic Core, Teacher Core
↓
Used by: Attendance Core
↓
Actor modules that consume it: Principal, Academic Leader, Teacher, Student

## Attendance Core
Entity: `AttendanceRecord`, `AbsenceReason`
↓
Depends on: Student Core, Teacher Core, Teaching Structure
↓
Used by: Analytics, Parent Relationship
↓
Actor modules that consume it: Principal, Academic Leader, Teacher, Student, Parent

## Assessment Core
Entity: `Assessment`, `Result`
↓
Depends on: Student Core, Teacher Core, Teaching Structure
↓
Used by: Analytics, Parent Relationship
↓
Actor modules that consume it: Principal, Academic Leader, Teacher, Student, Parent

## Learning & Support Core
Entity: `LearningActivity`, `SupportFlag`, `Intervention`
↓
Depends on: Student Core, Teacher Core
↓
Used by: Analytics, Parent Relationship
↓
Actor modules that consume it: Principal, Academic Leader, Teacher, Student, Parent, Support Staff

## Parent Relationship
Entity: `Parent`, `ParentStudent`
↓
Depends on: Student Core, Identity & Access
↓
Used by: Communication Core
↓
Actor modules that consume it: Parent, Teacher, Principal

## Communication Core
Entity: `Notification`, `Announcement`
↓
Depends on: Identity & Access, Parent Relationship, Student Core
↓
Used by: All Domains
↓
Actor modules that consume it: All Modules

## Operational Core
Entity: `Resource`, `Issue`, `Task`
↓
Depends on: School Identity
↓
Used by: Analytics
↓
Actor modules that consume it: Principal, Support Staff, Committee
