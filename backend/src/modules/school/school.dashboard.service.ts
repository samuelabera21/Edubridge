import { prisma } from "../../infrastructure/prisma/client.js";

export interface SchoolDashboardData {
    school: {
        id: string;
        name: string;
        type: string;
        status: string;
        lastUpdated: string;
    };
    academicYear: {
        id: string;
        name: string;
        status: string;
        startDate: string;
        endDate: string;
        isLocked: boolean;
    } | null;
    availableAcademicYears: Array<{
        id: string;
        name: string;
        status: string;
        startDate: string;
        endDate: string;
    }>;
    overview: {
        totalStudents: number;
        totalTeachers: number;
        totalGrades: number;
        totalSections: number;
        totalSubjects: number;
        timetableCoveragePercentage: number;
        unplacedStudents: number;
        readinessScore: number;
        readinessStatus: "READY" | "NEEDS_ATTENTION" | "INCOMPLETE";
    };
    students: {
        totalEnrolled: number;
        placed: number;
        unplaced: number;
        placementRate: number;
        byGrade: Array<{
            gradeId: string;
            gradeName: string;
            level: number;
            studentCount: number;
        }>;
        genderRatio: {
            male: number;
            female: number;
            malePercentage: number;
            femalePercentage: number;
        };
    };
    teachers: {
        totalActive: number;
        assigned: number;
        unassigned: number;
        totalAssignments: number;
        totalRequiredPeriods: number;
        totalScheduledPeriods: number;
        remainingPeriods: number;
    };
    timetable: {
        requiredPeriods: number;
        scheduledPeriods: number;
        remainingPeriods: number;
        coverageRate: number;
        incompleteAssignmentsCount: number;
        incompleteSectionsCount: number;
        status: "DRAFT" | "PUBLISHED";
        byGrade: Array<{
            gradeId: string;
            gradeName: string;
            level: number;
            requiredPeriods: number;
            scheduledPeriods: number;
            coverageRate: number;
        }>;
    };
    readiness: {
        score: number;
        status: "READY" | "NEEDS_ATTENTION" | "INCOMPLETE";
        summary: string;
        checks: Array<{
            id: string;
            name: string;
            status: "PASSED" | "WARNING" | "FAILED";
            message: string;
        }>;
    };
    alerts: Array<{
        id: string;
        severity: "CRITICAL" | "WARNING" | "INFO";
        category: "PLACEMENT" | "TIMETABLE" | "TEACHING_ASSIGNMENT" | "ACADEMIC_YEAR" | "ACADEMIC_CONFIG";
        title: string;
        message: string;
        actionUrl: string;
        actionLabel: string;
    }>;
    recentActivity: Array<{
        id: string;
        action: string;
        actionLabel: string;
        resource: string;
        resourceId: string | null;
        userName: string;
        createdAt: string;
    }>;
}

export class SchoolDashboardService {
    /**
     * Aggregates live, school-scoped operational data for the Principal / School Administrator Dashboard.
     * All metrics are strictly scoped to organizationId and the selected academicYearId.
     */
    static async getDashboardMetrics(organizationId: string, requestedAcademicYearId?: string): Promise<SchoolDashboardData> {
        // 1. Resolve Organization
        const org = await prisma.organizationUnit.findUnique({
            where: { id: organizationId }
        });

        if (!org) {
            throw new Error("ORGANIZATION_NOT_FOUND");
        }

        // 2. Resolve Academic Years (Multi-tenant scoped)
        const allYears = await prisma.academicYear.findMany({
            where: { organizationId },
            orderBy: [{ status: "asc" }, { startDate: "desc" }]
        });

        let selectedYear = null;
        if (requestedAcademicYearId) {
            selectedYear = allYears.find(y => y.id === requestedAcademicYearId) || null;
            if (!selectedYear) {
                throw new Error("ACADEMIC_YEAR_NOT_FOUND");
            }
        } else {
            // Default to ACTIVE or latest
            selectedYear = allYears.find(y => y.status === "ACTIVE") || allYears[0] || null;
        }

        const isLocked = selectedYear?.status === "COMPLETED" || selectedYear?.status === "ARCHIVED";

        // If no academic year exists for this school yet (empty setup state)
        if (!selectedYear) {
            return {
                school: {
                    id: org.id,
                    name: org.name,
                    type: org.type,
                    status: org.status || "ACTIVE",
                    lastUpdated: new Date().toISOString()
                },
                academicYear: null,
                availableAcademicYears: [],
                overview: {
                    totalStudents: 0,
                    totalTeachers: 0,
                    totalGrades: 0,
                    totalSections: 0,
                    totalSubjects: 0,
                    timetableCoveragePercentage: 0,
                    unplacedStudents: 0,
                    readinessScore: 0,
                    readinessStatus: "INCOMPLETE"
                },
                students: {
                    totalEnrolled: 0,
                    placed: 0,
                    unplaced: 0,
                    placementRate: 0,
                    byGrade: [],
                    genderRatio: { male: 0, female: 0, malePercentage: 0, femalePercentage: 0 }
                },
                teachers: {
                    totalActive: 0,
                    assigned: 0,
                    unassigned: 0,
                    totalAssignments: 0,
                    totalRequiredPeriods: 0,
                    totalScheduledPeriods: 0,
                    remainingPeriods: 0
                },
                timetable: {
                    requiredPeriods: 0,
                    scheduledPeriods: 0,
                    remainingPeriods: 0,
                    coverageRate: 0,
                    incompleteAssignmentsCount: 0,
                    incompleteSectionsCount: 0,
                    status: "DRAFT",
                    byGrade: []
                },
                readiness: {
                    score: 0,
                    status: "INCOMPLETE",
                    summary: "School setup is incomplete. No academic year configured.",
                    checks: [
                        { id: "academic_year", name: "Academic Year", status: "FAILED", message: "No active academic year found." },
                        { id: "grades", name: "Grades Configuration", status: "FAILED", message: "No grades configured." },
                        { id: "sections", name: "Sections Configuration", status: "FAILED", message: "No sections configured." },
                        { id: "teachers", name: "Staffing", status: "FAILED", message: "No active teachers available." }
                    ]
                },
                alerts: [
                    {
                        id: "no-year",
                        severity: "CRITICAL",
                        category: "ACADEMIC_YEAR",
                        title: "Academic Year Required",
                        message: "Configure and activate an academic year to start academic operations.",
                        actionUrl: "/dashboard/academics/academic-years",
                        actionLabel: "Configure Academic Year"
                    }
                ],
                recentActivity: []
            };
        }

        const yearId = selectedYear.id;

        // 3. Query School Configuration for Selected Academic Year
        const schoolGrades = await prisma.schoolGrade.findMany({
            where: { academicYearId: yearId },
            include: {
                grade: true,
                sections: {
                    where: { status: "ACTIVE" },
                    orderBy: { name: "asc" }
                }
            },
            orderBy: { grade: { level: "asc" } }
        });

        const totalGrades = schoolGrades.length;
        const totalSections = schoolGrades.reduce((acc, g) => acc + g.sections.length, 0);

        const totalSubjects = await prisma.subject.count({
            where: { organizationId }
        });

        // 4. Query Student Enrollment & Placement for Selected Year
        // Active participation is tracked through StudentEnrollment in the selected academic year
        const activeEnrollments = await prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                academicYearId: yearId,
                status: { in: ["ENROLLED", "ACTIVE"] as any }
            },
            include: {
                student: {
                    select: { gender: true }
                },
                schoolGrade: {
                    include: { grade: true }
                }
            }
        });

        const totalStudents = activeEnrollments.length;
        let placedStudents = 0;
        let unplacedStudents = 0;
        let maleCount = 0;
        let femaleCount = 0;

        // Group by grade
        const gradeStudentMap: Map<string, { gradeName: string; level: number; count: number }> = new Map();
        schoolGrades.forEach(sg => {
            gradeStudentMap.set(sg.id, {
                gradeName: sg.grade.name,
                level: sg.grade.level,
                count: 0
            });
        });

        activeEnrollments.forEach(enr => {
            if (enr.sectionId) {
                placedStudents += 1;
            } else {
                unplacedStudents += 1;
            }

            if (enr.student.gender === "MALE") maleCount += 1;
            else if (enr.student.gender === "FEMALE") femaleCount += 1;

            if (enr.schoolGradeId && gradeStudentMap.has(enr.schoolGradeId)) {
                const item = gradeStudentMap.get(enr.schoolGradeId)!;
                item.count += 1;
            }
        });

        const placementRate = totalStudents > 0 ? Math.round((placedStudents / totalStudents) * 1000) / 10 : 100;
        const malePercentage = totalStudents > 0 ? Math.round((maleCount / totalStudents) * 100) : 0;
        const femalePercentage = totalStudents > 0 ? Math.round((femaleCount / totalStudents) * 100) : 0;

        const studentsByGrade = Array.from(gradeStudentMap.entries()).map(([gradeId, data]) => ({
            gradeId,
            gradeName: data.gradeName,
            level: data.level,
            studentCount: data.count
        })).sort((a, b) => a.level - b.level);

        // 5. Query Teachers & Teaching Assignments
        const activeTeachers = await prisma.teacher.findMany({
            where: {
                organizationId,
                employmentStatus: "ACTIVE"
            },
            select: { id: true }
        });

        const totalActiveTeachers = activeTeachers.length;

        // Teaching Assignments for selected academic year
        const assignments = await prisma.teachingAssignment.findMany({
            where: {
                academicYearId: yearId,
                teacher: { organizationId },
                status: "ACTIVE"
            },
            include: {
                teacher: true,
                subject: true,
                schoolGrade: { include: { grade: true } },
                section: true
            }
        });

        const assignedTeacherIds = new Set(assignments.map(a => a.teacherId));
        const assignedTeachersCount = assignedTeacherIds.size;
        const unassignedTeachersCount = Math.max(0, totalActiveTeachers - assignedTeachersCount);

        const totalAssignments = assignments.length;
        const totalRequiredPeriods = assignments.reduce((acc, a) => acc + (a.periodsPerWeek || 0), 0);

        // 6. Query Timetable Entries for Selected Academic Year
        const scheduledSlots = await prisma.timetable.findMany({
            where: {
                organizationId,
                academicYearId: yearId
            },
            select: {
                id: true,
                teachingAssignmentId: true,
                teachingAssignment: {
                    select: {
                        sectionId: true,
                        schoolGradeId: true
                    }
                }
            }
        });

        const scheduledCountsMap: Record<string, number> = {};
        scheduledSlots.forEach(slot => {
            scheduledCountsMap[slot.teachingAssignmentId] = (scheduledCountsMap[slot.teachingAssignmentId] || 0) + 1;
        });

        let totalScheduledPeriods = 0;
        let incompleteAssignmentsCount = 0;

        // Grade-level timetable breakdown
        const gradeTimetableMap: Map<string, { gradeName: string; level: number; required: number; scheduled: number }> = new Map();
        schoolGrades.forEach(sg => {
            gradeTimetableMap.set(sg.id, {
                gradeName: sg.grade.name,
                level: sg.grade.level,
                required: 0,
                scheduled: 0
            });
        });

        // Track incomplete sections
        const sectionDemandMap: Record<string, { required: number; scheduled: number }> = {};

        assignments.forEach(a => {
            const req = a.periodsPerWeek || 0;
            const sched = scheduledCountsMap[a.id] || 0;
            totalScheduledPeriods += sched;

            if (sched < req) {
                incompleteAssignmentsCount += 1;
            }

            if (a.schoolGradeId && gradeTimetableMap.has(a.schoolGradeId)) {
                const gItem = gradeTimetableMap.get(a.schoolGradeId)!;
                gItem.required += req;
                gItem.scheduled += sched;
            }

            if (a.sectionId) {
                if (!sectionDemandMap[a.sectionId]) {
                    sectionDemandMap[a.sectionId] = { required: 0, scheduled: 0 };
                }
                sectionDemandMap[a.sectionId].required += req;
                sectionDemandMap[a.sectionId].scheduled += sched;
            }
        });

        const incompleteSectionsCount = Object.values(sectionDemandMap).filter(s => s.scheduled < s.required).length;

        const remainingPeriods = Math.max(0, totalRequiredPeriods - totalScheduledPeriods);
        const timetableCoverageRate = totalRequiredPeriods > 0 
            ? Math.min(100, Math.round((totalScheduledPeriods / totalRequiredPeriods) * 100))
            : (totalAssignments === 0 ? 100 : 0);

        const timetableByGrade = Array.from(gradeTimetableMap.entries()).map(([gradeId, d]) => ({
            gradeId,
            gradeName: d.gradeName,
            level: d.level,
            requiredPeriods: d.required,
            scheduledPeriods: d.scheduled,
            coverageRate: d.required > 0 ? Math.min(100, Math.round((d.scheduled / d.required) * 100)) : 100
        })).sort((a, b) => a.level - b.level);

        // 7. Publication Status
        const publishAudit = await prisma.auditLog.findFirst({
            where: {
                organizationId,
                resource: "Timetable",
                action: { in: ["TIMETABLE_PUBLISHED", "TIMETABLE_UNPUBLISHED"] }
            },
            orderBy: { createdAt: "desc" }
        });
        const timetableStatus = (publishAudit && publishAudit.action === "TIMETABLE_PUBLISHED") ? "PUBLISHED" : "DRAFT";

        // 8. Deterministic Academic Readiness Evaluation
        const checks: Array<{ id: string; name: string; status: "PASSED" | "WARNING" | "FAILED"; message: string }> = [];

        // Check 1: Academic Year Status
        if (selectedYear.status === "ACTIVE") {
            checks.push({ id: "academic_year", name: "Academic Year Active", status: "PASSED", message: `${selectedYear.name} is currently active.` });
        } else {
            checks.push({ id: "academic_year", name: "Academic Year Status", status: "WARNING", message: `${selectedYear.name} is ${selectedYear.status.toLowerCase()}.` });
        }

        // Check 2: Grades Configured
        if (totalGrades > 0) {
            checks.push({ id: "grades", name: "Grades Configured", status: "PASSED", message: `${totalGrades} school grades configured.` });
        } else {
            checks.push({ id: "grades", name: "Grades Configured", status: "FAILED", message: "No active school grades configured." });
        }

        // Check 3: Sections Configured
        if (totalSections > 0) {
            checks.push({ id: "sections", name: "Sections Configured", status: "PASSED", message: `${totalSections} sections active.` });
        } else {
            checks.push({ id: "sections", name: "Sections Configured", status: "FAILED", message: "No sections configured." });
        }

        // Check 4: Subjects Available
        if (totalSubjects > 0) {
            checks.push({ id: "subjects", name: "Subjects Configured", status: "PASSED", message: `${totalSubjects} subjects available.` });
        } else {
            checks.push({ id: "subjects", name: "Subjects Configured", status: "FAILED", message: "No curriculum subjects found." });
        }

        // Check 5: Teachers Available
        if (totalActiveTeachers > 0) {
            checks.push({ id: "teachers", name: "Teaching Staff Available", status: "PASSED", message: `${totalActiveTeachers} active teachers on staff.` });
        } else {
            checks.push({ id: "teachers", name: "Teaching Staff Available", status: "FAILED", message: "No active teachers found." });
        }

        // Check 6: Teaching Assignments Configured
        if (totalAssignments > 0) {
            if (unassignedTeachersCount === 0) {
                checks.push({ id: "teaching_assignments", name: "Teaching Assignments", status: "PASSED", message: `All active teachers have assigned instructional duties (${totalAssignments} total).` });
            } else {
                checks.push({ id: "teaching_assignments", name: "Teaching Assignments", status: "WARNING", message: `${unassignedTeachersCount} active teachers have no assignments.` });
            }
        } else {
            checks.push({ id: "teaching_assignments", name: "Teaching Assignments", status: "FAILED", message: "No teaching assignments configured." });
        }

        // Check 7: Student Enrollment
        if (totalStudents > 0) {
            checks.push({ id: "student_enrollment", name: "Student Enrollment", status: "PASSED", message: `${totalStudents} students actively enrolled.` });
        } else {
            checks.push({ id: "student_enrollment", name: "Student Enrollment", status: "WARNING", message: "No active student enrollments for this year." });
        }

        // Check 8: Student Section Placement
        if (totalStudents > 0) {
            if (unplacedStudents === 0) {
                checks.push({ id: "student_placement", name: "Student Section Placement", status: "PASSED", message: `100% of students placed in sections.` });
            } else {
                checks.push({ id: "student_placement", name: "Student Section Placement", status: "WARNING", message: `${unplacedStudents} enrolled students not yet placed in sections.` });
            }
        } else {
            checks.push({ id: "student_placement", name: "Student Section Placement", status: "PASSED", message: "No unplaced students." });
        }

        // Check 9: Timetable Coverage
        if (totalRequiredPeriods > 0) {
            if (timetableCoverageRate >= 100) {
                checks.push({ id: "timetable_coverage", name: "Timetable Coverage", status: "PASSED", message: "100% instructional periods scheduled." });
            } else if (timetableCoverageRate >= 80) {
                checks.push({ id: "timetable_coverage", name: "Timetable Coverage", status: "WARNING", message: `${timetableCoverageRate}% coverage (${remainingPeriods} periods unscheduled).` });
            } else {
                checks.push({ id: "timetable_coverage", name: "Timetable Coverage", status: "FAILED", message: `Incomplete coverage: only ${timetableCoverageRate}% scheduled.` });
            }
        } else {
            checks.push({ id: "timetable_coverage", name: "Timetable Coverage", status: "WARNING", message: "No instructional demand configured." });
        }

        // Check 10: Timetable Publication
        if (timetableStatus === "PUBLISHED") {
            checks.push({ id: "timetable_published", name: "Timetable Published", status: "PASSED", message: "Timetable is officially published and active." });
        } else {
            checks.push({ id: "timetable_published", name: "Timetable Published", status: "WARNING", message: "Timetable is currently in Draft mode." });
        }

        // Calculate Deterministic Score (0 to 100%)
        const passedCount = checks.filter(c => c.status === "PASSED").length;
        const warningCount = checks.filter(c => c.status === "WARNING").length;
        const rawScore = Math.round(((passedCount + (warningCount * 0.5)) / checks.length) * 100);
        const readinessScore = Math.min(100, Math.max(0, rawScore));

        let readinessStatus: "READY" | "NEEDS_ATTENTION" | "INCOMPLETE" = "INCOMPLETE";
        let readinessSummary = "";
        if (readinessScore >= 90) {
            readinessStatus = "READY";
            readinessSummary = "School is academically and operationally ready for active learning.";
        } else if (readinessScore >= 60) {
            readinessStatus = "NEEDS_ATTENTION";
            readinessSummary = "School setup is largely in place but has operational items requiring leadership action.";
        } else {
            readinessStatus = "INCOMPLETE";
            readinessSummary = "Essential academic components are missing or incomplete.";
        }

        // 9. Operational Alerts (Deduplicated, Actionable)
        const alerts: Array<{ id: string; severity: "CRITICAL" | "WARNING" | "INFO"; category: "PLACEMENT" | "TIMETABLE" | "TEACHING_ASSIGNMENT" | "ACADEMIC_YEAR" | "ACADEMIC_CONFIG"; title: string; message: string; actionUrl: string; actionLabel: string }> = [];

        if (unplacedStudents > 0) {
            alerts.push({
                id: "alert-unplaced-students",
                severity: "WARNING",
                category: "PLACEMENT",
                title: "Unplaced Enrolled Students",
                message: `${unplacedStudents} active student${unplacedStudents > 1 ? "s are" : " is"} enrolled but not placed into any classroom section.`,
                actionUrl: "/dashboard/students",
                actionLabel: "View Placement Workspace"
            });
        }

        if (unassignedTeachersCount > 0) {
            alerts.push({
                id: "alert-unassigned-teachers",
                severity: "WARNING",
                category: "TEACHING_ASSIGNMENT",
                title: "Unassigned Teaching Staff",
                message: `${unassignedTeachersCount} active teacher${unassignedTeachersCount > 1 ? "s have" : " has"} no instructional assignments for ${selectedYear.name}.`,
                actionUrl: "/dashboard/teachers",
                actionLabel: "Assign Teachers"
            });
        }

        if (remainingPeriods > 0) {
            alerts.push({
                id: "alert-unscheduled-periods",
                severity: "WARNING",
                category: "TIMETABLE",
                title: "Incomplete Instructional Timetable",
                message: `${remainingPeriods} weekly period${remainingPeriods > 1 ? "s remain" : " remains"} unscheduled across ${incompleteAssignmentsCount} assignment${incompleteAssignmentsCount > 1 ? "s" : ""}.`,
                actionUrl: "/dashboard/academics/timetable",
                actionLabel: "Open Timetable Grid"
            });
        }

        if (timetableStatus === "DRAFT" && totalScheduledPeriods > 0) {
            alerts.push({
                id: "alert-timetable-draft",
                severity: "INFO",
                category: "TIMETABLE",
                title: "Timetable In Draft Status",
                message: `The weekly timetable for ${selectedYear.name} has scheduled lessons but is currently in Draft mode. Publish to make it official.`,
                actionUrl: "/dashboard/academics/timetable",
                actionLabel: "Review & Publish"
            });
        }

        if (isLocked) {
            alerts.push({
                id: "alert-year-locked",
                severity: "INFO",
                category: "ACADEMIC_YEAR",
                title: "Historical Academic Year (Read-Only)",
                message: `You are viewing ${selectedYear.name}, which is ${selectedYear.status.toLowerCase()}. Historical records are locked against modifications.`,
                actionUrl: "/dashboard/academics/academic-years",
                actionLabel: "Academic Years"
            });
        }

        // 10. Query Recent Administrative Activity (Audit Log)
        const recentLogs = await prisma.auditLog.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
            take: 7,
            include: {
                user: {
                    select: { name: true, email: true }
                }
            }
        });

        const actionLabels: Record<string, string> = {
            TIMETABLE_SLOT_ASSIGNED: "Scheduled instructional period",
            TIMETABLE_SLOT_REASSIGNED: "Reassigned timetable slot",
            TIMETABLE_SLOT_REMOVED: "Removed timetable lesson",
            TIMETABLE_PUBLISHED: "Published academic timetable",
            TIMETABLE_UNPUBLISHED: "Reverted timetable to draft",
            STUDENT_SECTION_PLACED: "Placed student into section",
            STUDENT_SECTION_REASSIGNED: "Reassigned student section",
            TEACHING_ASSIGNMENT_CREATED: "Created teaching assignment",
            TEACHING_ASSIGNMENT_UPDATED: "Updated teaching assignment",
            STUDENT_ENROLLMENT_CREATED: "Enrolled new student",
            ACADEMIC_YEAR_ACTIVATED: "Activated academic year"
        };

        const recentActivity = recentLogs.map(log => ({
            id: log.id,
            action: log.action,
            actionLabel: actionLabels[log.action] || log.action.replace(/_/g, " ").toLowerCase(),
            resource: log.resource,
            resourceId: log.resourceId,
            userName: log.user?.name || log.user?.email || "System Administrator",
            createdAt: log.createdAt.toISOString()
        }));

        return {
            school: {
                id: org.id,
                name: org.name,
                type: org.type,
                status: org.status || "ACTIVE",
                lastUpdated: new Date().toISOString()
            },
            academicYear: {
                id: selectedYear.id,
                name: selectedYear.name,
                status: selectedYear.status,
                startDate: selectedYear.startDate.toISOString(),
                endDate: selectedYear.endDate.toISOString(),
                isLocked
            },
            availableAcademicYears: allYears.map(y => ({
                id: y.id,
                name: y.name,
                status: y.status,
                startDate: y.startDate.toISOString(),
                endDate: y.endDate.toISOString()
            })),
            overview: {
                totalStudents,
                totalTeachers: totalActiveTeachers,
                totalGrades,
                totalSections,
                totalSubjects,
                timetableCoveragePercentage: timetableCoverageRate,
                unplacedStudents,
                readinessScore,
                readinessStatus
            },
            students: {
                totalEnrolled: totalStudents,
                placed: placedStudents,
                unplaced: unplacedStudents,
                placementRate,
                byGrade: studentsByGrade,
                genderRatio: {
                    male: maleCount,
                    female: femaleCount,
                    malePercentage,
                    femalePercentage
                }
            },
            teachers: {
                totalActive: totalActiveTeachers,
                assigned: assignedTeachersCount,
                unassigned: unassignedTeachersCount,
                totalAssignments,
                totalRequiredPeriods,
                totalScheduledPeriods,
                remainingPeriods
            },
            timetable: {
                requiredPeriods: totalRequiredPeriods,
                scheduledPeriods: totalScheduledPeriods,
                remainingPeriods,
                coverageRate: timetableCoverageRate,
                incompleteAssignmentsCount,
                incompleteSectionsCount,
                status: timetableStatus,
                byGrade: timetableByGrade
            },
            readiness: {
                score: readinessScore,
                status: readinessStatus,
                summary: readinessSummary,
                checks
            },
            alerts,
            recentActivity
        };
    }
}
