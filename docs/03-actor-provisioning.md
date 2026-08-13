# EduBridge: Actor Provisioning & Role Assignment Guide

During local development, you will constantly need to log in as different types of users (e.g., a Student to see grades, a Teacher to post grades). 

Because our application uses strict Role-Based Access Control (RBAC), newly registered users have **zero permissions by default**. 

To make development easier, we have created **Provisioning Scripts** that automatically generate roles, assign them to a user, and link the user to the "EduBridge Demo School".

---

## 1. How to Create and Assign an Actor Role

Follow these steps whenever you need a new test account with specific privileges.

### Step 1: Register the User via the Frontend
1. Open your browser and go to `http://localhost:3000/auth/sign-up`.
2. Fill out the registration form with a recognizable test email (e.g., `test-teacher@demo.com`) and a simple password (e.g., `password123`).
3. Click "Sign Up". 
4. At this point, the user exists in the database but has no roles and cannot see any dashboard.

### Step 2: Run the Provisioning Script
Open a new terminal window in the root of the project. We need to execute a script inside the running backend Docker container.

Run the script corresponding to the role you want to grant, passing the user's email address as the argument:

**For a School Administrator:**
```bash
docker exec edubridge_backend npx tsx scratch/promote-admin.ts <email>
```

**For a Vice Principal:**
```bash
docker exec edubridge_backend npx tsx scratch/promote-vice-principal.ts <email>
```

**For a Teacher:**
```bash
docker exec edubridge_backend npx tsx scratch/promote-teacher.ts <email>
```

**For a Student:**
```bash
docker exec edubridge_backend npx tsx scratch/promote-student.ts <email>
```

**For a Parent:**
```bash
docker exec edubridge_backend npx tsx scratch/promote-parent.ts <email>
```

**For Support Staff (Registrars, Counselors, IT):**
```bash
docker exec edubridge_backend npx tsx scratch/promote-support-staff.ts <email>
```

**For School Committees (PTA, Board Members):**
```bash
docker exec edubridge_backend npx tsx scratch/promote-committee.ts <email>
```

### Step 3: Log In and Test
1. Return to your browser and log in at `http://localhost:3000/auth/sign-in` using the credentials you created in Step 1.
2. You will instantly be routed to the correct, role-specific dashboard!

---

## 2. Pre-Configured Demo Accounts

For your convenience, we have already registered and provisioned one demo account for every single actor type. You do not need to run the scripts for these; they are ready to use right now.

**The password for all demo accounts is:** `password123`

| Actor Role | Email Login | Dashboard Route |
| :--- | :--- | :--- |
| **School Admin** | `admin@demo.school.et` | `/dashboard/school` |
| **Vice Principal** | `vp@demo.school.et` | `/dashboard/vice-principal` |
| **Teacher** | `teacher@demo.school.et` | `/dashboard/teacher` |
| **Student** | `test@demo.school.et` | `/dashboard/student` |
| **Parent** | `parent@demo.school.et` | `/dashboard/parent` |
| **Support Staff** | `staff@demo.school.et` | `/dashboard/support-staff` |
| **Committee** | `pta@demo.school.et` | `/dashboard/committee` |

---

## 3. How the Scripts Work (For Backend Developers)

If you need to create a *new* type of role in the future, you can use the existing scripts in `/backend/scratch/` as a template.

The scripts perform the following automated actions:
1. Validates that the user exists.
2. Checks if the requested Role (e.g., `TEACHER`) exists in the `Role` table. If not, it creates it.
3. Retrieves the specific `OrganizationUnit` (in this case, "EduBridge Demo School").
4. Creates a `RoleAssignment` in the database, binding the User to the Role, scoped specifically to that School.
5. *(For specialized actors)* Automatically creates the corresponding domain model (e.g., creating a row in the `Student` or `Parent` table and linking it to the `User` table).
