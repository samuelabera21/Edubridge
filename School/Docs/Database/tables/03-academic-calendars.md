**File:** `03-academic-calendars.md`
**Save in:** `docs/database/tables/`

````md
# EduBridge — School Database

# Table 03: `academic_calendars`

## 1. Entity

**Table:** `academic_calendars`

**Domain:** School

**Category:** Core

**Status:** Conceptually approved

---

## 2. Purpose

The `academic_calendars` table represents the calendar structure and important time periods/events within a school's academic year.

It defines how an academic year is organized in time.

The `academic_years` table answers:

> Which academic year is this?

The `academic_calendars` entity answers:

> What important academic periods, dates and events occur within that academic year?

The calendar may contain:

- Academic terms/periods.
- Teaching periods.
- Examination periods.
- Holidays.
- School events.
- Registration/enrollment periods.
- Other important academic dates.

The exact calendar structure may vary according to the applicable education requirements and the school's operational configuration.

---

## 3. Core responsibility

The `academic_calendars` entity shall:

- Associate calendar information with an academic year.
- Define important academic periods.
- Define important academic dates and events.
- Support school planning and scheduling.
- Provide a common time reference for school operations.
- Allow teachers, students, parents and school leadership to understand important academic dates.
- Preserve historical calendar information for completed academic years.

---

## 4. Relationship with `academic_years`

An academic calendar belongs to a specific academic year.

Conceptually:

```text
SCHOOL
   │
   └── ACADEMIC YEAR
          │
          └── ACADEMIC CALENDAR
                 │
                 ├── Academic Period
                 ├── Holiday
                 ├── Examination Period
                 ├── School Event
                 └── Other Important Date
````

The academic year remains the parent time boundary.

The calendar must not create an independent academic year.

---

## 5. Calendar identity

The calendar record shall conceptually contain:

* EduBridge internal calendar identifier.
* Reference to the academic year.
* Calendar name or label.
* Calendar status where required.
* Calendar configuration information.

The exact identifier and implementation will be finalized during Prisma/database design.

---

## 6. Calendar periods

The calendar shall support configurable academic periods.

Examples may include:

* Term 1.
* Term 2.
* Term 3.
* Semester 1.
* Semester 2.
* Other applicable reporting/teaching periods.

EduBridge should not hard-code a single national period structure unless a confirmed education requirement requires it.

The system should allow the applicable school/education configuration to determine the period structure.

---

## 7. Period information

Each academic period shall conceptually support:

* Period name.
* Period type.
* Start date.
* End date.
* Sequence/order.
* Status where required.

Example:

```text
ACADEMIC YEAR
│
├── Term 1
│   ├── Start
│   └── End
│
├── Term 2
│   ├── Start
│   └── End
│
└── Term 3
    ├── Start
    └── End
```

The exact physical representation of periods will be determined during schema design.

---

## 8. Important academic dates and events

The calendar shall support important dates/events relevant to school operation.

Examples include:

* School opening.
* School closing.
* Registration period.
* Enrollment period.
* Examination period.
* Assessment period.
* Parent-teacher meeting period.
* School event.
* Holiday.
* Teacher development/training period.
* Other configured academic events.

The system should distinguish between an academic period and a specific calendar event/date.

---

## 9. Holidays

The calendar may contain configured holidays or non-teaching days applicable to the school.

Holiday information may conceptually include:

* Holiday name.
* Start date.
* End date.
* Description.
* Status.

Holiday records should remain associated with the relevant academic year/calendar.

---

## 10. Examination periods

The calendar may define examination periods.

For example:

```text
ACADEMIC CALENDAR
│
└── EXAMINATION PERIOD
      │
      ├── Start date
      ├── End date
      └── Description
```

The calendar defines when an examination period occurs.

It does not store examination results.

Examination and assessment information belongs to the Assessment domain.

---

## 11. Assessment periods

The calendar may define periods used for assessment/reporting.

Examples:

* Continuous assessment period.
* Mid-term assessment.
* Term assessment.
* Final assessment.
* Reporting period.

The actual assessment records remain in the Assessment domain.

The calendar only provides the relevant time context.

---

## 12. School events

The calendar may contain school-level events.

Examples:

* Parent meeting.
* School meeting.
* Orientation.
* Graduation event.
* Training event.
* School improvement activity.
* Community event.

Event details should remain limited to calendar/scheduling information.

Detailed communication, participant management or meeting records belong to their respective domains.

---

## 13. Academic calendar visibility

Calendar information may be presented to different actors according to their permissions.

### School leadership

May view and manage the school's calendar.

### Teachers

May view dates relevant to their teaching responsibilities.

### Students

May view dates relevant to their learning and school activities.

### Parents/guardians

May view dates relevant to their children and school participation.

The exact access permissions will be defined in the authorization layer.

---

## 14. Relationship with timetable

The academic calendar and timetable are different concepts.

### Academic calendar

Defines the broader academic schedule:

```text
Academic Year
│
├── Terms
├── Holidays
├── Examination Periods
└── Important Events
```

### Timetable

Defines recurring teaching schedules:

```text
Timetable
│
├── Monday
│   ├── Mathematics
│   └── English
│
├── Tuesday
│   ├── Physics
│   └── Biology
│
└── ...
```

The timetable belongs to:

* `timetables`
* `timetable_entries`

The academic calendar does not replace the timetable.

---

## 15. Relationship with attendance

The calendar provides the time context that can help determine expected school days and important non-teaching periods.

Attendance itself remains authoritative in:

* `student_attendance`
* `teacher_attendance`

The system should not use calendar events as a substitute for attendance records.

---

## 16. Relationship with assessments

Assessment periods can reference the applicable academic calendar period.

Conceptually:

```text
ACADEMIC YEAR
│
└── ACADEMIC CALENDAR
      │
      └── ASSESSMENT PERIOD
             │
             └── ASSESSMENTS
                    │
                    └── RESULTS
```

The calendar provides scheduling/time context.

The assessment domain stores the actual assessment and result data.

---

## 17. Relationship with learning activities

Learning activities may be planned within academic periods or dates.

For example:

```text
Academic Calendar
      │
      └── Term 1
             │
             └── Learning Activities
```

The actual activity remains in:

`learning_activities`

The calendar does not become the source of truth for activity submissions or completion.

---

## 18. Relationship with parent meetings

Parent meetings may be represented through the calendar when they are scheduled school events.

Detailed meeting records remain in:

* `parent_meetings`
* `parent_meeting_participants`

The calendar may provide the scheduled date/time context.

---

## 19. Relationship with school improvement

School improvement activities may be scheduled against calendar dates.

The improvement domain remains responsible for:

* Problems.
* Priorities.
* Plans.
* Activities.
* Targets.
* Progress.
* Outcomes.

The academic calendar only provides scheduling context.

---

## 20. Calendar lifecycle

A calendar may have a lifecycle corresponding to the academic year's preparation and operation.

Conceptual statuses may include:

* Draft.
* Published.
* Active.
* Completed.
* Archived.

The final controlled values will be determined during Prisma/reference-data design.

---

## 21. Calendar publication

School leadership may prepare or update the academic calendar before it becomes the operational calendar for users.

A published calendar represents the calendar intended for normal school use.

Changes to a published calendar should be traceable through the platform's audit mechanism.

The exact approval workflow is a feature/authorization decision and is not fixed by this table definition.

---

## 22. Historical calendars

Historical academic calendars shall remain associated with their original academic years.

For example:

```text
SCHOOL
│
├── 2018 E.C.
│   └── Academic Calendar
│
├── 2019 E.C.
│   └── Academic Calendar
│
└── 2020 E.C.
    └── Academic Calendar
```

Creating a new academic year must not overwrite the previous year's calendar.

---

## 23. Source-of-truth rule

`academic_calendars` is the source of truth for:

* School academic-calendar configuration.
* Academic periods represented in the calendar.
* Calendar events.
* Calendar dates.
* Holidays/non-teaching dates configured in the calendar.
* Examination/assessment periods represented as calendar events.

It is not the source of truth for:

* Student attendance.
* Teacher attendance.
* Assessment results.
* Student enrollment.
* Timetable entries.
* Learning activity submissions.
* Parent meeting participation.

Those remain in their respective entities.

---

## 24. Important business rules

The implementation shall enforce or validate the following rules:

1. Calendar information must belong to an academic year.

2. Calendar dates must fall within or appropriately relate to the academic-year period.

3. A calendar period must have a valid start and end date.

4. A period's end date must not precede its start date.

5. Calendar periods should have a defined sequence/order where ordering is required.

6. Conflicting calendar periods should be prevented or explicitly handled.

7. Historical calendars must remain associated with their original academic year.

8. Changes to important published calendar information must be traceable.

9. A calendar must not be used as a replacement for attendance records.

10. A calendar must not be used as a replacement for timetable records.

11. A calendar must not store assessment results.

12. Calendar information must respect the user's school authorization scope.

---

## 25. What does NOT belong in `academic_calendars`

The following should not be stored as the primary responsibility of this entity:

* Student profiles.
* Student enrollment.
* Student section placement.
* Teacher profiles.
* Teacher assignments.
* Student attendance.
* Teacher attendance.
* Assessment results.
* Gradebook records.
* Learning activity submissions.
* Student support cases.
* Parent relationships.
* Messages.
* Notifications.
* AI insights.
* AI recommendations.
* School improvement outcomes.
* School performance reports.

Those belong to their respective domains.

---

## 26. Conceptual relationship summary

```text
SCHOOL
   │
   └── ACADEMIC YEAR
          │
          └── ACADEMIC CALENDAR
                 │
                 ├── ACADEMIC PERIODS
                 │
                 ├── HOLIDAYS
                 │
                 ├── EXAMINATION PERIODS
                 │
                 ├── ASSESSMENT PERIODS
                 │
                 ├── SCHOOL EVENTS
                 │
                 └── OTHER IMPORTANT DATES
```

---

## 27. Physical database design — NOT YET DECIDED

The following are intentionally left for the Prisma/database implementation stage:

* Primary key type.
* Foreign-key names.
* Exact column names.
* Exact column data types.
* Nullability.
* Default values.
* Unique constraints.
* Database indexes.
* Enum implementation.
* Reference-table implementation.
* Cascade behavior.
* Delete behavior.
* Archive strategy.
* Calendar-period storage strategy.
* Event storage strategy.
* Prisma relations.
* Database migrations.

This document defines the conceptual responsibility and rules of `academic_calendars`.

It is not the final Prisma model.

---

## 28. Final definition

`academic_calendars` represents:

> **The time-based academic schedule of a school within a specific academic year, including academic periods, holidays, examination/assessment periods, important dates and school events used to organize school operations.**

```
```
