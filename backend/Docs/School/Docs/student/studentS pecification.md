       STUDENT DETAILS & ENROLLMENT DATA SPECIFICATION
Every logged-in student session is initialized with a global profile context containing the following data fields:

         Personal Profile Data
Student ID: Unique institutional identifier (e.g., STU-2026-8942).

Full Legal Name: First Name, Father's Name, Grandfather's Name.

Profile Photo & Avatar: URL path to uploaded profile image.

Date of Birth & Gender: Demographics for administrative registration.

Guardian Details: Primary Contact Name, Relationship, Phone Number, Emergency Line.

         Academic Placement & Enrollment
Institution Details: School Name, School Code, Regional Office.

Grade Level: Enrolled grade level (e.g., Grade 9).

Section Assignment: Enrolled section (e.g., Section 9-A).

Academic Year & Term: Active academic year (e.g., 2018 E.C.) and active term/semester.

Homeroom Teacher: Assigned advisor name and contact.

# FULL NAVIGATION BREAKDOWN & WORKFLOW GUIDES

## 1. MY DASHBOARD

### Navigation Trigger
User clicks "MY DASHBOARD" in the left sidebar menu.

### Screen Layout & Displayed Content
A responsive multi-widget overview grid containing real-time summaries:

* **Today’s Classes Widget:** Displays a timeline of today's periods, time slots, subject names, room numbers, and teacher names. Highlights the active class in real time.

* **Timetable Glance Widget:** Shows a horizontal summary bar of the day's classes with an "Expand Schedule" button.

* **Attendance Summary Badge:** Displays a radial donut chart showing overall term attendance percentage with status badges (`Good Standing` , `At Risk` , `Critical` ).

* **Upcoming Activities Feed:** Lists tasks and quizzes due within the next 48 hours.

* **Recent Results Feed:** Lists the last 3 published grades with assessment name, score, and grade letter.

* **Progress Bar:** Visual bar showing total curriculum completion for the active term.

* **Support Notifications Banner:** Highlights assigned remedial tasks or upcoming intervention sessions.

* **AI Learning Insights Card:** Displays personalized study tips based on recent test performance.

### Functionality & Interactions
* **Period Card Click:** Opens a modal with room details and subject outline.
* **"Expand Schedule" Click:** Redirects to `MY CLASSES -> Class Schedule`.
* **Task Item Click:** Redirects to `MY LEARNING ACTIVITIES -> Complete Activities`.
* **Result Item Click:** Redirects to `MY ASSESSMENTS -> Results & Feedback`.

---

## 2. MY PROFILE

### Navigation Trigger
User clicks "MY PROFILE" in the left sidebar menu. Default sub-nav: `Student Information`.

### Sub-Navigation Tabs & Displayed Content

#### Sub-Nav: Student Information
* **Displayed Content:** Profile card with student ID, full legal name, date of birth, gender, photo, home address, guardian contact details, and emergency phone.
* **Functionality:** Read-only profile view with a "Request Profile Correction" button that opens an administrative support ticket.

#### Sub-Nav: School
* **Displayed Content:** Institutional card displaying School Name, Ministry School Code, Campus Address, Region/Woreda, Principal Name, and School Contact Info.
* **Functionality:** View-only institutional directory.

#### Sub-Nav: Grade
* **Displayed Content:** Grade Level card showing enrolled grade (e.g., Grade 9), track/stream, and Grade Coordinator details.
* **Functionality:** Displays grade-level curriculum overview and academic expectations.

#### Sub-Nav: Section
* **Displayed Content:** Section card showing Section Code (e.g., Section 9-A), Assigned Homeroom Teacher, Classroom Number, and total student count.
* **Functionality:** Includes a quick link button to message the homeroom teacher via `COMMUNICATION`.

#### Sub-Nav: Academic Year
* **Displayed Content:** Current term information displaying Active Ethiopian Academic Year (e.g., 2018 E.C.), Current Semester, Start/End Dates, and Exam Windows.
* **Functionality:** Allows switching views between past and present academic terms.

---

## 3. MY CLASSES

### Navigation Trigger
User clicks "MY CLASSES" in the left sidebar menu. Default sub-nav: `Subjects`.

### Sub-Navigation Tabs & Displayed Content

#### Sub-Nav: Subjects
* **Displayed Content:** Grid of subject cards for all enrolled courses (Physics, Mathematics, Amharic, English, Chemistry, Biology, History).
* **Functionality:** Clicking a card expands a drawer displaying syllabus outline, total weekly periods, textbook references, and subject performance summary.

#### Sub-Nav: Teachers Directory
* **Displayed Content:** Directory cards for all assigned section teachers displaying photo, name, subject taught, office hours, and room number.
* **Functionality:** Features a "Message Teacher" button on each card that directly opens a chat thread in `COMMUNICATION -> Direct Contact`.

#### Sub-Nav: Class Schedule
* **Displayed Content:** Weekly timetable grid (Monday through Friday, Periods 1 to 8). Each cell shows Subject, Room, and Teacher Name.
* **Functionality:** Filter by day or week view. Highlights the current active period automatically.

#### Sub-Nav: Learning Resources
* **Displayed Content:** Subject-organized repository containing lecture notes, syllabus documents, worksheets, and presentation slides.
* **Functionality:** Search bar, subject category filters, file preview modal, and direct file download options.

---

## 4. MY ATTENDANCE

### Navigation Trigger
User clicks "MY ATTENDANCE" in the left sidebar menu. Default sub-nav: `Overview & Calendar View`.

### Top-Level Filters Available Across All Sub-Tabs
* **Subject Selector Dropdown:** `All Subjects [Default]`, `Physics`, `Mathematics`, `Amharic`, `Chemistry`, etc.
* **Status Filter Toggle:** `All`, `Present`, `Absent`, `Late`, `Excused`.

### Sub-Navigation Tabs & Displayed Content

#### Sub-Nav: Overview & Calendar View
* **Displayed Content:**
  * **Subject-Specific Attendance Card:** Calculates percentage based on selected subject:
   
  * **Interactive Monthly Calendar:** Color-coded daily/period badges (`Green` = Present, `Yellow` = Late, `Red` = Unexcused Absent, `Blue` = Excused).
* **Functionality:** Clicking any calendar day opens a popover detailing period-by-period attendance logs (e.g., *Period 2: Math [Late - 10 mins]*).

#### Sub-Nav: Absence Logs & Explanations
* **Displayed Content:** Log table listing dates, subject names, period numbers, recording teachers, and excuse status (`Unexcused`, `Pending Review`, `Approved`).
* **Functionality:** "Submit Absence Explanation" button opens a modal supporting date/period selection, reason selection (Medical, Family Emergency, Transportation), written explanation, and file attachment uploader (medical notes, letters).

#### Sub-Nav: Subject-Wise Breakdown
* **Displayed Content:** Comparative bar chart and breakdown table showing attendance percentage across all enrolled subjects simultaneously.
* **Functionality:** Automatically flags subjects where attendance drops below the required 85% minimum threshold.

---

## 5. MY ASSESSMENTS

### Navigation Trigger
User clicks "MY ASSESSMENTS" in the left sidebar menu. Default sub-nav: `Tests & Quizzes`.

### Sub-Navigation Tabs & Displayed Content

#### Sub-Nav: Tests & Quizzes
* **Displayed Content:** Table listing scheduled formal examinations, midterms, and quizzes with dates, time slots, locations, mark weightings (e.g., `20% of Term Grade`), and syllabus coverage.
* **Functionality:** Filter by subject or upcoming/past status; "Add to Calendar" button.

#### Sub-Nav: Assignments
* **Displayed Content:** Listing of homework, lab reports, and term projects showing assignment title, subject, assigned date, due date, maximum score, and status badge (`Not Started`, `In Progress`, `Submitted`, `Overdue`).

* **Functionality:** Clicking an assignment redirects directly to `MY LEARNING ACTIVITIES -> Complete Activities`.

#### Sub-Nav: Results & Feedback
* **Displayed Content:** Scorecard listing published assessment grades, earned points vs. total points, letter grade, class average comparison, and teacher written feedback.
* **Functionality:** "View Annotated Feedback" opens the graded document with inline teacher comments.

#### Sub-Nav: Performance Trends
* **Displayed Content:** Interactive line graph mapping score progression over time across assessments, midterms, and finals.
* **Functionality:** Dropdown filters to isolate trend lines by specific subjects or compare against overall class averages.

---

## 6. MY LEARNING ACTIVITIES

### Navigation Trigger
User clicks "MY LEARNING ACTIVITIES" in the left sidebar menu. Default sub-nav: `View Assignments`.

### Sub-Navigation Tabs & Displayed Content

#### Sub-Nav: View Assignments
* **Displayed Content:** Filterable task queue categorized by tabs: `To-Do` (Pending tasks), `Submitted` (Awaiting evaluation), `Graded` (Completed).
* **Functionality:** Cards display deadline countdown timers and direct action buttons ("Start Assignment").

#### Sub-Nav: Complete Activities & Submit Work
* **Displayed Content:** Workspace for completing tasks. Displays instructions, attached prompt files, rich text answer editor, and file upload zone.
* **Functionality:** Supports dragging and dropping PDF/Image files, autosaves text drafts every 30 seconds, and generates a timestamped submission receipt on submit.

#### Sub-Nav: Take Quizzes
* **Displayed Content:** Interactive quiz testing interface with countdown timer, question navigation panel, and multiple-choice / short-answer formats.
* **Functionality:** Auto-saves selected choices, prompts confirmation on submit, and auto-submits when the timer reaches zero.

#### Sub-Nav: View Feedback
* **Displayed Content:** Review view for graded activities. Displays submitted work side-by-side with teacher rubrics, line-item comments, and awarded points.
* **Functionality:** Allows downloading annotated submission files.

#### Sub-Nav: Track Completion
* **Displayed Content:** Visual progress tracker mapping weekly completed activities against assigned milestones for each subject.
* **Functionality:** Shows streak counters for on-time submissions.

---

## 7. MY SUPPORT

### Navigation Trigger
User clicks "MY SUPPORT" in the left sidebar menu. Default sub-nav: `Support Recommendations`.

### Sub-Navigation Tabs & Displayed Content

#### Sub-Nav: Support Recommendations
* **Displayed Content:** Diagnostic alerts flagging subjects or specific learning objectives where assessment scores fall below target competency standards.
* **Functionality:** Displays teacher-written intervention plans and system-recommended study paths.

#### Sub-Nav: Remedial Activities
* **Displayed Content:** Assigned catch-up worksheets, foundational video lessons, and review quizzes designed to fill learning gaps.
* **Functionality:** Completing remedial modules automatically updates the student's support progress metrics.

#### Sub-Nav: Enrichment Activities
* **Displayed Content:** Advanced challenge projects, research prompts, and extension problem sets for subjects where the student excels.
* **Functionality:** Allows students to earn academic achievement badges upon completion.

#### Sub-Nav: Intervention Information & Progress
* **Displayed Content:** Calendar of scheduled 1-on-1 or small-group tutoring sessions, assigned mentor/teacher name, meeting room/link, support session attendance logs, and goal completion bars.
* **Functionality:** "Confirm Attendance" button for scheduled tutoring sessions.

---

## 8. COMMUNICATION

### Navigation Trigger
User clicks "COMMUNICATION" in the left sidebar menu. Default sub-nav: `Direct Contact`.

### Sub-Navigation Tabs & Displayed Content

#### Sub-Nav: Direct Contact (Teacher Messages)
* **Displayed Content:** Two-column messaging interface:
  * **Left Column:** List of assigned subject teachers with unread message counts, online indicators, and office hours.
  * **Right Column:** Active chat stream displaying message history, text inputs, attachment buttons, and timestamped read receipts.
* **Functionality:** Real-time 1-on-1 messaging with teachers, file sharing (PDFs, Images), and message search within threads.

#### Sub-Nav: School Announcements
* **Displayed Content:** Broadcast feed of official school news, administrative notices, exam schedules, and holiday announcements.
* **Functionality:** Search bar, category filters (`General`, `Exam`, `Urgent`, `Event`), and downloadable notice attachments.

---

## 9. NOTIFICATIONS (DEDICATED TOP-LEVEL NAV)

### Navigation Trigger
User clicks "NOTIFICATIONS" in the left sidebar menu. Unread badge counter displayed on sidebar (e.g., `NOTIFICATIONS [5]`).

### Sub-Navigation Tabs & Displayed Content

#### Sub-Nav: Actionable System Alerts
* **Displayed Content:** List of real-time actionable notifications grouped by priority (`High Priority`, `General`):
  * Newly published grades and feedback.
  * New assignment or quiz posted.
  * Attendance status updates or excuse approval/rejection.
  * Assigned remedial tasks or tutoring session invitations.
* **Functionality:**
  * "Mark All as Read" button.
  * **Click-through routing:** Clicking an alert item marks it as read and immediately routes the user to the relevant portal page (e.g., clicking a grade alert opens `MY ASSESSMENTS -> Results & Feedback`).

#### Sub-Nav: Activity History Log
* **Displayed Content:** Read-only log of historical system interactions (e.g., *Assignment submitted on Oct 12, 10:14 AM*, *Password updated on Sep 04*).
* **Functionality:** Filter log history by date range or activity category.

---

## 10. LEARNING RESOURCES

### Navigation Trigger
User clicks "LEARNING RESOURCES" in the left sidebar menu. Default sub-nav: `Recommended Resources`.

### Sub-Navigation Tabs & Displayed Content

#### Sub-Nav: Recommended Resources
* **Displayed Content:** Curated list of reading links, video tutorials, and interactive simulations recommended based on current weekly class topics.
* **Functionality:** Subject filter dropdown and "Save to Favorites" bookmark option.

#### Sub-Nav: School & Approved Resources
* **Displayed Content:** Digital library repository containing Electronic Textbooks, Reference Handbooks, Past National Examination Papers with answer keys, and Study Guides.
* **Functionality:** Full-text search bar, grade-level filtering, online PDF reader modal, and direct file download buttons.

#### Sub-Nav: Ministry LMS Links
* **Displayed Content:** Grid of external resource cards pointing to official Ministry of Education learning portals, regional digital libraries, and e-learning platforms.
* **Functionality:** Direct launch buttons opening authorized educational web portals in new browser tabs.

---

## 11. AI STUDY ASSISTANT

### Navigation Trigger
User clicks "AI STUDY ASSISTANT" in the left sidebar menu or triggers the persistent AI drawer widget. Default sub-nav: `Explain Concepts`.

### Pedagogical Guardrails & Anti-Cheating Controls
* **Curriculum Bounded:** Limits responses strictly to approved grade-level syllabus content.
* **Anti-Cheating Mechanism:** Refuses direct final answers for active homework/test problems, defaulting to Socratic guided steps and hints.

### Sub-Navigation Modes & Displayed Content

#### Sub-Nav: Explain Concepts
* **Displayed Content:** Interactive chat interface generating structured breakdowns:
  1. Core Idea (2-sentence summary).
  2. Real-World Analogy.
  3. Step-by-Step Concept Breakdown.
  4. Follow-up Comprehension Question.
* **Functionality:** Prompt input bar, topic selector dropdown, and "Simplify Explanation" button.

#### Sub-Nav: Guided Practice & Hints
* **Displayed Content:** Interactive problem-solving workspace. When a student enters a problem, the AI provides progressive **Tiered Hints**:
  * **Hint 1 (Conceptual):** Highlights relevant formulas or principles.
  * **Hint 2 (Structural):** Demonstrates how to set up the problem step-by-step.
  * **Hint 3 (Guided Example):** Solves a parallel example problem without solving the original.
* **Functionality:** Student response submission input and step verification engine.

#### Sub-Nav: Explain Mistakes (Mistake Analysis)
* **Displayed Content:** Diagnostic workspace where students select a past graded item with lost marks.
* **Functionality:** Analyzes the student's incorrect input, highlights the exact misconception (e.g., *"Calculation error in step 2 during unit conversion"*), and generates a new practice problem to re-verify mastery.

#### Sub-Nav: Practice Questions Generator
* **Displayed Content:** Self-assessment engine generating practice problem sets targeting weak areas identified in `MY ASSESSMENTS`.
* **Functionality:** Difficulty toggle (`Beginner`, `Intermediate`, `Advanced`), instant answer validation, and detailed solution steps.

#### Sub-Nav: Study Planning & Learning Goals
* **Displayed Content:** Interactive study planner that scans upcoming test dates and builds prioritized daily/weekly study routines.
* **Functionality:** Goal tracking progress bars, custom study session creators, and automated daily study reminders.