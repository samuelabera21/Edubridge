/**
 * @swagger
 * tags:
 *   name: Vice Principal
 *   description: Vice Principal / Academic Leader operations
 */

/**
 * @swagger
 * /api/vice-principal/me:
 *   get:
 *     summary: Get Vice Principal overview profile
 *     description: Returns the active school and aggregated academic overview metrics (classes, teachers, students, attendance) for the Vice Principal dashboard.
 *     tags: [Vice Principal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved the overview profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 school:
 *                   type: object
 *                   description: The active school organization scope
 *                 overview:
 *                   type: object
 *                   properties:
 *                     activeAcademicYear:
 *                       type: string
 *                     totalStudents:
 *                       type: integer
 *                     totalTeachers:
 *                       type: integer
 *                     totalClasses:
 *                       type: integer
 *                     totalSections:
 *                       type: integer
 *                     todayActivity:
 *                       type: object
 *                       properties:
 *                         lessonsScheduled:
 *                           type: integer
 *                         lessonsCompleted:
 *                           type: integer
 *                         studentAttendanceRate:
 *                           type: number
 *                         teacherAttendanceRate:
 *                           type: number
 *                         missingAssessments:
 *                           type: integer
 *                 role:
 *                   type: string
 *                   example: "VICE_PRINCIPAL"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Missing school scope)
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/vice-principal/organization/anomalies/staffing:
 *   get:
 *     summary: Detect unstaffed subjects and classes
 *     description: Returns a list of classes or subjects that do not currently have a teacher assigned.
 *     tags: [Vice Principal]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved staffing anomalies
 */

/**
 * @swagger
 * /api/vice-principal/organization/anomalies/workload:
 *   get:
 *     summary: Detect teacher workload anomalies
 *     description: Returns a list of teachers who are overloaded (too many classes) or under-allocated (too few classes).
 *     tags: [Vice Principal]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved workload anomalies
 */

/**
 * @swagger
 * /api/vice-principal/organization/anomalies/timetable:
 *   get:
 *     summary: Detect timetable and scheduling conflicts
 *     description: Returns a list of scheduling anomalies such as teacher double-booking conflicts or sections with empty scheduled periods.
 *     tags: [Vice Principal]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved timetable anomalies
 */

/**
 * @swagger
 * /api/vice-principal/academic/sections/{sectionId}/staffing:
 *   get:
 *     summary: Get complete staffing view for a section
 *     description: Returns the full list of required subjects for the section's grade, showing exactly which are assigned to a teacher and which are missing (NONE).
 *     tags: [Vice Principal]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the section to view
 *     responses:
 *       200:
 *         description: Successfully retrieved section staffing view
 */

/**
 * @swagger
 * /api/vice-principal/organization/subjects:
 *   get:
 *     summary: View all school subjects
 *     description: Returns a list of all active subjects for the organization's current academic year.
 *     tags: [Vice Principal]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved school subjects
 */

/**
 * @swagger
 * /api/vice-principal/organization/calendar:
 *   get:
 *     summary: View academic calendar
 *     description: Returns the school's academic calendar including instructional periods and assessment periods.
 *     tags: [Vice Principal]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved academic calendar
 */

/**
 * @swagger
 * /api/vice-principal/organization/timetable:
 *   get:
 *     summary: View full school timetable
 *     description: Returns the master schedule, including all class periods and the specific teaching assignments occupying each slot.
 *     tags: [Vice Principal]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved school timetable
 */
