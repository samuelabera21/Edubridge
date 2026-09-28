import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";
import { HierarchyScopeService, MinimalOrganizationUnit } from "../hierarchy/hierarchy-scope.service.js";

export interface GovernanceKPIs {
    totalSchools: number;
    totalStudents: number;
    totalTeachers: number;
    studentTeacherRatio: number;
    attendanceRate: number | null;
    averageAssessmentScore: number | null;
    totalAssessments: number;
}

export interface GovernanceStudentsSummary {
    total: number;
    byGender: {
        male: number;
        female: number;
        other: number;
    };
    byGrade: Array<{
        gradeId: string;
        gradeName: string;
        level: number;
        studentCount: number;
    }>;
}

export interface GovernanceTeachersSummary {
    total: number;
    active: number;
}

export interface GovernanceAttendanceSummary {
    present: number;
    absent: number;
    late: number;
    excused: number;
    totalRecords: number;
    rate: number | null;
}

export interface GovernanceAssessmentSummary {
    totalResults: number;
    averageScore: number | null;
}

export interface GovernanceChildUnitBreakdown {
    id: string;
    name: string;
    type: OrganizationUnitType;
    schoolCount: number;
    studentCount: number;
    teacherCount: number;
    attendanceRate: number | null;
    averageAssessmentScore: number | null;
}

export interface GovernanceDashboardData {
    context: {
        organizationId: string;
        organizationName: string;
        organizationType: OrganizationUnitType;
        lineage: MinimalOrganizationUnit[];
        schoolCount: number;
        childUnitType: OrganizationUnitType | null;
        isDrillDown: boolean;
    };
    kpis: GovernanceKPIs;
    students: GovernanceStudentsSummary;
    teachers: GovernanceTeachersSummary;
    attendance: GovernanceAttendanceSummary;
    assessments: GovernanceAssessmentSummary;
    childUnitsBreakdown: GovernanceChildUnitBreakdown[];
}

export class GovernanceDashboardService {
    /**
     * Primary governance aggregation engine.
     * Computes hierarchical metrics for the authenticated user (or authorized target drill-down)
     * strictly across descendant schools in the active academic year context.
     */
    static async getGovernanceDashboard(
        userId: string,
        targetOrgId?: string
    ): Promise<GovernanceDashboardData> {
        if (!userId) {
            throw new Error("User ID is required to access governance dashboard");
        }

        // 1. Resolve caller's authorized scope via H2
        const userScope = await HierarchyScopeService.getAccessibleOrganizationScope(userId);

        // 2. Resolve Effective Unit & Lineage
        let effectiveOrgId = userScope.currentOrganizationId;
        let effectiveOrgName = userScope.currentOrganization.name;
        let effectiveOrgType = userScope.currentOrganizationType;
        let effectiveLineage = userScope.lineage;
        let isDrillDown = false;

        if (targetOrgId && targetOrgId !== userScope.currentOrganizationId) {
            if (!userScope.accessibleOrganizationIds.includes(targetOrgId)) {
                throw new Error("Forbidden: Target organization is outside your authorized hierarchy scope");
            }

            const targetUnit = await prisma.organizationUnit.findUnique({
                where: { id: targetOrgId },
                select: { id: true, name: true, type: true, parentId: true }
            });

            if (!targetUnit) {
                throw new Error(`Target organization unit '${targetOrgId}' not found`);
            }

            effectiveOrgId = targetUnit.id;
            effectiveOrgName = targetUnit.name;
            effectiveOrgType = targetUnit.type;
            effectiveLineage = await HierarchyScopeService.getLineage(targetOrgId);
            isDrillDown = true;
        }

        // 3. Load all hierarchy units once for in-memory child mapping & descendant resolution
        const allUnits = await prisma.organizationUnit.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
            },
        });

        // Adjacency map: parentId -> children[]
        const childrenMap = new Map<string, MinimalOrganizationUnit[]>();
        for (const u of allUnits) {
            if (u.parentId) {
                const list = childrenMap.get(u.parentId) || [];
                list.push(u);
                childrenMap.set(u.parentId, list);
            }
        }

        // Helper to get descendant school IDs for any unit in-memory
        const getDescendantSchoolsInMemory = (rootId: string, rootType: OrganizationUnitType): string[] => {
            if (rootType === "SCHOOL") return [rootId];
            const schoolIds: string[] = [];
            const queue: string[] = [rootId];
            const visited = new Set<string>([rootId]);

            while (queue.length > 0) {
                const curr = queue.shift()!;
                const children = childrenMap.get(curr) || [];
                for (const c of children) {
                    if (!visited.has(c.id)) {
                        visited.add(c.id);
                        if (c.type === "SCHOOL") {
                            schoolIds.push(c.id);
                        }
                        queue.push(c.id);
                    }
                }
            }
            return schoolIds;
        };

        const effectiveDescendantSchoolIds = getDescendantSchoolsInMemory(effectiveOrgId, effectiveOrgType);
        const directChildren = childrenMap.get(effectiveOrgId) || [];
        const childUnitType = directChildren.length > 0 ? directChildren[0]!.type : null;

        // 4. Handle Empty Scope (Zero Schools under this administrative unit)
        if (effectiveDescendantSchoolIds.length === 0) {
            const emptyChildBreakdown: GovernanceChildUnitBreakdown[] = directChildren.map(c => ({
                id: c.id,
                name: c.name,
                type: c.type,
                schoolCount: 0,
                studentCount: 0,
                teacherCount: 0,
                attendanceRate: null,
                averageAssessmentScore: null,
            }));

            return {
                context: {
                    organizationId: effectiveOrgId,
                    organizationName: effectiveOrgName,
                    organizationType: effectiveOrgType,
                    lineage: effectiveLineage,
                    schoolCount: 0,
                    childUnitType,
                    isDrillDown,
                },
                kpis: {
                    totalSchools: 0,
                    totalStudents: 0,
                    totalTeachers: 0,
                    studentTeacherRatio: 0,
                    attendanceRate: null,
                    averageAssessmentScore: null,
                    totalAssessments: 0,
                },
                students: {
                    total: 0,
                    byGender: { male: 0, female: 0, other: 0 },
                    byGrade: [],
                },
                teachers: {
                    total: 0,
                    active: 0,
                },
                attendance: {
                    present: 0,
                    absent: 0,
                    late: 0,
                    excused: 0,
                    totalRecords: 0,
                    rate: null,
                },
                assessments: {
                    totalResults: 0,
                    averageScore: null,
                },
                childUnitsBreakdown: emptyChildBreakdown,
            };
        }

        // 5. Batch Queries Across Descendant Schools (Single-pass database queries)
        // A. Resolve Active Academic Years for the descendant schools to ensure historical records are excluded
        const activeYears = await prisma.academicYear.findMany({
            where: {
                organizationId: { in: effectiveDescendantSchoolIds },
                status: "ACTIVE",
            },
            select: { id: true, organizationId: true },
        });
        const activeYearIds = activeYears.map(y => y.id);

        // B. Query Active Student Enrollments
        const [enrollments, teachers, attendanceRecords, assessmentResults] = await Promise.all([
            prisma.studentEnrollment.findMany({
                where: {
                    organizationId: { in: effectiveDescendantSchoolIds },
                    status: "ACTIVE",
                    ...(activeYearIds.length > 0 ? { academicYearId: { in: activeYearIds } } : {}),
                },
                select: {
                    id: true,
                    organizationId: true,
                    schoolGradeId: true,
                    schoolGrade: { select: { id: true, grade: { select: { id: true, name: true, level: true } } } },
                    student: { select: { gender: true } },
                },
            }),

            // C. Query Active Teachers
            prisma.teacher.findMany({
                where: {
                    organizationId: { in: effectiveDescendantSchoolIds },
                    employmentStatus: "ACTIVE",
                },
                select: {
                    id: true,
                    organizationId: true,
                },
            }),

            // D. Query Attendance Records (Active Year / Descendant Schools)
            prisma.studentAttendance.findMany({
                where: {
                    organizationId: { in: effectiveDescendantSchoolIds },
                    ...(activeYearIds.length > 0 ? { academicYearId: { in: activeYearIds } } : {}),
                },
                select: {
                    organizationId: true,
                    status: true,
                },
            }),

            // E. Query Assessment Results (Active Year / Descendant Schools)
            prisma.studentResult.findMany({
                where: {
                    assessment: {
                        organizationId: { in: effectiveDescendantSchoolIds },
                        ...(activeYearIds.length > 0 ? { academicYearId: { in: activeYearIds } } : {}),
                    },
                },
                select: {
                    score: true,
                    assessment: {
                        select: {
                            organizationId: true,
                            maxScore: true,
                        },
                    },
                },
            }),
        ]);

        // 6. Compute Aggregations in Memory
        // Student Metrics
        let maleCount = 0;
        let femaleCount = 0;
        let otherCount = 0;
        const gradeMap = new Map<string, { gradeId: string; gradeName: string; level: number; count: number }>();

        for (const e of enrollments) {
            const gender = (e.student?.gender || "").toUpperCase();
            if (gender === "MALE") maleCount++;
            else if (gender === "FEMALE") femaleCount++;
            else otherCount++;

            if (e.schoolGrade?.grade) {
                const gradeId = e.schoolGrade.grade.id || e.schoolGrade.id;
                const gradeName = e.schoolGrade.grade.name || "Unknown Grade";
                const gradeLevel = e.schoolGrade.grade.level ?? 0;
                const g = gradeMap.get(gradeId) || {
                    gradeId,
                    gradeName,
                    level: gradeLevel,
                    count: 0,
                };
                g.count++;
                gradeMap.set(gradeId, g);
            }
        }

        const byGrade = Array.from(gradeMap.values())
            .sort((a, b) => a.level - b.level)
            .map(g => ({
                gradeId: g.gradeId,
                gradeName: g.gradeName,
                level: g.level,
                studentCount: g.count,
            }));

        const totalStudents = enrollments.length;
        const totalTeachers = teachers.length;
        const studentTeacherRatio = totalTeachers > 0 ? Number((totalStudents / totalTeachers).toFixed(1)) : 0;

        // Attendance Metrics
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let excusedCount = 0;

        for (const att of attendanceRecords) {
            const st = att.status;
            if (st === "PRESENT") presentCount++;
            else if (st === "ABSENT") absentCount++;
            else if (st === "LATE") lateCount++;
            else if (st === "EXCUSED") excusedCount++;
        }

        const totalAttendanceRecords = attendanceRecords.length;
        const attendanceRate = totalAttendanceRecords > 0
            ? Number(((presentCount / totalAttendanceRecords) * 100).toFixed(1))
            : null;

        // Assessment Metrics
        let totalScoreSum = 0;
        let validScoresCount = 0;

        for (const res of assessmentResults) {
            if (typeof res.score === "number" && !isNaN(res.score)) {
                totalScoreSum += res.score;
                validScoresCount++;
            }
        }

        const averageAssessmentScore = validScoresCount > 0
            ? Number((totalScoreSum / validScoresCount).toFixed(1))
            : null;

        // 7. Compute Child-Unit Breakdown (In-Memory Slicing per Child Unit)
        // Group data by organizationId
        const studentsByOrg = new Map<string, number>();
        for (const e of enrollments) {
            studentsByOrg.set(e.organizationId, (studentsByOrg.get(e.organizationId) || 0) + 1);
        }

        const teachersByOrg = new Map<string, number>();
        for (const t of teachers) {
            teachersByOrg.set(t.organizationId, (teachersByOrg.get(t.organizationId) || 0) + 1);
        }

        const attendanceByOrg = new Map<string, { present: number; total: number }>();
        for (const a of attendanceRecords) {
            const curr = attendanceByOrg.get(a.organizationId) || { present: 0, total: 0 };
            curr.total++;
            if (a.status === "PRESENT") curr.present++;
            attendanceByOrg.set(a.organizationId, curr);
        }

        const assessmentByOrg = new Map<string, { scoreSum: number; count: number }>();
        for (const r of assessmentResults) {
            if (typeof r.score === "number" && !isNaN(r.score)) {
                const orgId = r.assessment.organizationId;
                const curr = assessmentByOrg.get(orgId) || { scoreSum: 0, count: 0 };
                curr.scoreSum += r.score;
                curr.count++;
                assessmentByOrg.set(orgId, curr);
            }
        }

        const childUnitsBreakdown: GovernanceChildUnitBreakdown[] = directChildren.map(child => {
            const childSchools = getDescendantSchoolsInMemory(child.id, child.type);
            const childSchoolSet = new Set(childSchools);

            let childStudents = 0;
            let childTeachers = 0;
            let childAttPresent = 0;
            let childAttTotal = 0;
            let childScoreSum = 0;
            let childScoreCount = 0;

            for (const schId of childSchoolSet) {
                childStudents += studentsByOrg.get(schId) || 0;
                childTeachers += teachersByOrg.get(schId) || 0;

                const att = attendanceByOrg.get(schId);
                if (att) {
                    childAttPresent += att.present;
                    childAttTotal += att.total;
                }

                const ass = assessmentByOrg.get(schId);
                if (ass) {
                    childScoreSum += ass.scoreSum;
                    childScoreCount += ass.count;
                }
            }

            return {
                id: child.id,
                name: child.name,
                type: child.type,
                schoolCount: childSchools.length,
                studentCount: childStudents,
                teacherCount: childTeachers,
                attendanceRate: childAttTotal > 0
                    ? Number(((childAttPresent / childAttTotal) * 100).toFixed(1))
                    : null,
                averageAssessmentScore: childScoreCount > 0
                    ? Number((childScoreSum / childScoreCount).toFixed(1))
                    : null,
            };
        });

        return {
            context: {
                organizationId: effectiveOrgId,
                organizationName: effectiveOrgName,
                organizationType: effectiveOrgType,
                lineage: effectiveLineage,
                schoolCount: effectiveDescendantSchoolIds.length,
                childUnitType,
                isDrillDown,
            },
            kpis: {
                totalSchools: effectiveDescendantSchoolIds.length,
                totalStudents,
                totalTeachers,
                studentTeacherRatio,
                attendanceRate,
                averageAssessmentScore,
                totalAssessments: assessmentResults.length,
            },
            students: {
                total: totalStudents,
                byGender: {
                    male: maleCount,
                    female: femaleCount,
                    other: otherCount,
                },
                byGrade,
            },
            teachers: {
                total: totalTeachers,
                active: totalTeachers,
            },
            attendance: {
                present: presentCount,
                absent: absentCount,
                late: lateCount,
                excused: excusedCount,
                totalRecords: totalAttendanceRecords,
                rate: attendanceRate,
            },
            assessments: {
                totalResults: assessmentResults.length,
                averageScore: averageAssessmentScore,
            },
            childUnitsBreakdown,
        };
    }
}
