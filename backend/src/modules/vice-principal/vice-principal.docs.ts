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
