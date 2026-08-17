# SCHOOL SUPPORT STAFF PORTAL: NAVIGATION & WORKFLOW SPECIFICATION

> **Overview & Purpose**  
This specification defines the complete navigation architecture, user-scoped database filtering, and operational workflows for the **School Support Staff Portal**. Designed specifically for non-teaching personnel (such as lab technicians, custodians, library aides, facility teams, and security staff), this portal provides role-based access control (RBAC) ensuring that each staff member interacts strictly with their own assigned tasks, incident reports, requisitions, and operational records.

---

## 1. MY DASHBOARD

**Sub-Nav:** Single Overview Screen  
**User Data Filter:** `WHERE user_id = current_user.id AND date = today`

### Step-by-Step Workflow
1. **Login & Session Validation:** The portal validates the staff member's authentication token and loads their specific shift profile.
2. **Shift Readiness Review:** The staff member checks their **Today’s Assigned Tasks** card and **Support Schedule Glance** to see immediate operational commitments (e.g., *08:00 AM - Science Lab 2 Setup*).
3. **Emergency Trigger:** If the staff member encounters an urgent issue right at shift start, they tap the **Quick Incident / Concern Action** floating button to bypass routine navigation and log a hazard immediately.
4. **Task Navigation:** Tapping any individual task card opens the detailed task view directly inside **ASSIGNED TASKS**.

---

## 2. ASSIGNED TASKS

### Sub-Nav 1: Task Overview
**User Data Filter:** `WHERE assigned_to = current_user.id AND status != 'Archived'`

#### Step-by-Step Workflow
1. **View Assigned Queue:** Staff member sees their work orders displayed in a Kanban board or List view filtered by status (`Pending`, `In Progress`, `Under Review`, `Completed`).
2. **Filter & Sort:** User filters their queue by Priority (`Urgent` first) or Location (e.g., *Building B*).
3. **Select Work Order:** Tapping a card expands the task details: assigned supervisor, due time, specific instructions, and location badge.
4. **Initiate Task:** Tapping **"Start Work"** updates the task status to `In Progress` in real time, recording a start timestamp.

### Sub-Nav 2: Update Task Status & Completion
**User Data Filter:** `WHERE task_id = selected_task.id AND assigned_to = current_user.id`

#### Step-by-Step Workflow
1. **Follow Checklist:** Staff member works through interactive checklist items (e.g., *1. Sanitize tables, 2. Restock safety goggles, 3. Check fire extinguisher*).
2. **Handle Blockers (If Any):** If work is interrupted (e.g., *Key to stockroom missing*), the user clicks **"Report Blocker"**. This updates the status to `Blocked` and sends an automated notification to their supervisor.
3. **Submit Proof & Sign-off:** Upon finishing all checklist items, the user:
   * Uploads an optional photo as completion proof.
   * Enters brief execution notes (e.g., *Used 2 bottles of disinfectant*).
   * Clicks **"Submit Completion"**.
4. **State Transition:** The system changes the status to `Under Review` or `Completed` and logs the completion timestamp.

---

## 3. STUDENT SUPPORT

### Sub-Nav 1: Assigned Support Activities
**User Data Filter:** `WHERE assigned_staff_id = current_user.id`

#### Step-by-Step Workflow
1. **View Non-Academic Duties:** Staff member reviews their assigned student supervision duties for the day (e.g., *Cafeteria Supervision - Lunch Shift 1*, *Library Duty - 2:00 PM*).
2. **Access Protocols:** User clicks on an activity to view specific safety guidelines or student assistance requirements for that session.

### Sub-Nav 2: Record Participation & Attendance
**User Data Filter:** `WHERE logged_by = current_user.id`

#### Step-by-Step Workflow
1. **Search Student:** Staff member uses the student lookup bar (by Name or Student ID) to find a student attending an assigned non-classroom activity (e.g., *Remedial Study Hall* or *After-School Lab Access*).
2. **Check-In/Check-Out:** Taps **"Record Entry"** to log the arrival timestamp.
3. **Log Notes:** Optionally tags participation behavior or assistance provided.
4. **Confirm Record:** User taps **"Save Attendance Entry"**. The record is saved and linked to the user's account for auditing.

### Sub-Nav 3: Report Concerns (Incidents & Welfare)
**User Data Filter:** `WHERE reported_by = current_user.id`

#### Step-by-Step Workflow
1. **Initiate Confidential Report:** Staff member clicks **"New Incident / Welfare Report"**.
2. **Enter Details:**
   * **Category:** Selects `Behavioral`, `Health / Medical`, `Safety / Bullying`, or `Facility Hazard Impacting Students`.
   * **Severity:** Selects `Low`, `Medium`, or `Urgent`.
   * **Location & Time:** Selects physical zone (e.g., *Playground Zone C*).
   * **Description & Attachment:** Types detailed observations and attaches photos if applicable.
3. **Automated Escalation & Routing:**
   * Tapping **"Submit"** immediately encrypts the record.
   * If marked `Urgent`, the backend pushes instant alert notifications to the Homeroom Teacher, Guidance Counselor, and School Administrator.
4. **Track Status:** Staff member monitors the report state (`Submitted` $\rightarrow$ `Acknowledged by Counselor` $\rightarrow$ `Resolved`).

---

## 4. SCHOOL OPERATIONS

### Sub-Nav 1: Operational Records
**User Data Filter:** `WHERE assigned_facility_zone IN (current_user.assigned_zones)`

#### Step-by-Step Workflow
1. **Review Daily Routine Logins:** Staff member accesses routine facility checklists (e.g., *Morning Campus Opening Check* or *Daily Equipment Inspection*).
2. **Execute Inspection:** User marks pass/fail toggles for each asset or physical area.
3. **Digital Sign-off:** User signs or confirms completion, saving an immutable log entry with their ID and timestamp.

### Sub-Nav 2: Resource Requests
**User Data Filter:** `WHERE requested_by = current_user.id`

#### Step-by-Step Workflow
1. **Open Catalog:** Staff member browses inventory categories (e.g., *Cleaning Supplies*, *Lab Consumables*, *PPE & Safety Tools*).
2. **Create Requisition:** Clicks **"New Request"**, inputs quantities, sets urgency level, and specifies the destination room/department.
3. **Track Lifecycle:** User monitors their request status in a personalized table:
   $$\text{Requested} \longrightarrow \text{Pending Admin Approval} \longrightarrow \text{Dispatched} \longrightarrow \text{Fulfilled}$$
4. **Acknowledge Receipt:** Upon receiving materials, staff taps **"Confirm Delivery"**, which updates stock levels in the backend.

### Sub-Nav 3: Facility Issues & Work Orders
**User Data Filter:** `WHERE reported_by = current_user.id`

#### Step-by-Step Workflow
1. **Report Issue:** User encounters a broken asset (e.g., *Leaking pipe in Restroom 2A*).
2. **Submit Work Order Ticket:** Taps **"Report Facility Issue"**, tags room location, selects category (`Plumbing`), adds a photo, and submits.
3. **Track Resolution:** The ticket appears in their personal reporting feed. They receive updates when maintenance technicians are assigned and when the repair is marked resolved.

### Sub-Nav 4: Operational Reports Submission
**User Data Filter:** `WHERE submitted_by = current_user.id`

#### Step-by-Step Workflow
1. **Select Report Template:** Staff selects required periodic submission form (e.g., *Weekly Sanitation Audit* or *Monthly Lab Inventory Count*).
2. **Fill & Auto-Populate:** System pre-fills Staff Name, ID, Department, and Date. Staff enters operational figures and metrics.
3. **Submit & Download:** User taps **"Submit Report"**, generating a stamped downloadable PDF receipt for their records.

---

## 5. COMMUNICATION

### Sub-Nav 1: School Announcements
**User Data Filter:** `WHERE target_audience IN ('All Staff', 'Support Staff', current_user.department)`

#### Step-by-Step Workflow
1. **Browse Feed:** Staff member views broadcast announcements published by school executives or department heads.
2. **Filter Announcements:** Filters updates by tag (`Urgent`, `Facility Alert`, `Policy Update`, `Campus Event`).
3. **Acknowledge Reading:** For critical notices requiring confirmation, staff clicks **"Acknowledge & Read"**, updating the admin tracking log.

### Sub-Nav 2: Direct Contact & Operational Updates
**User Data Filter:** `WHERE sender_id = current_user.id OR receiver_id = current_user.id`

#### Step-by-Step Workflow
1. **Select Contact:** User selects their supervisor, department manager, or facility admin from their assigned contacts list.
2. **Send Message / Update:** Types a text message, attaches a photo/file, or links an active task ID directly to the chat thread.
3. **Real-time Notifications:** Incoming replies trigger instant system alerts so staff can coordinate field operations seamlessly.

---

## 6. LIMITED REPORTING

### Sub-Nav 1: Assigned-Area Summary
**User Data Filter:** `WHERE user_id = current_user.id`

#### Step-by-Step Workflow
1. **Select Date Range:** Staff selects filter period (`This Week`, `This Month`, `Custom Term`).
2. **View Performance Metrics:** System renders visual summary widgets showing:
   * Total Tasks Completed vs. Assigned.
   * On-Time Task Completion Rate (%).
   * Total Incidents Reported & Resolved.
   * Total Resource Requests Submitted.

### Sub-Nav 2: Task & Activity History
**User Data Filter:** `WHERE user_id = current_user.id AND action_timestamp IN (selected_range)`

#### Step-by-Step Workflow
1. **Audit Personal History:** User accesses a searchable historical log containing every action performed in the system (completed tasks, logged attendance, submitted work orders, report receipts).
2. **Search & Filter:** User searches by key term (e.g., *"Science Lab 2"*) or filters by activity type.
3. **Export Statement:** User clicks **"Export Activity Statement"** to download a compiled PDF/CSV file for performance reviews or supervisor verification.