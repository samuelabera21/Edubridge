import { prisma } from "../../infrastructure/prisma/client.js";

export interface StaffingDemandSummary {
    academicYearId: string;
    academicYearName: string;
    totalDemandPeriods: number;
    totalAssignedPeriods: number;
    totalUnassignedPeriods: number;
    coveragePercentage: number;
    totalSections: number;
    totalSubjectsConfigured: number;
    grades: Array<{
        schoolGradeId: string;
        gradeName: string;
        level: number;
        sectionCount: number;
        demandPeriods: number;
        assignedPeriods: number;
        unassignedPeriods: number;
        coveragePercentage: number;
        subjects: Array<{
            subjectId: string;
            subjectName: string;
            subjectCode: string | null;
            weeklyPeriodsPerSection: number;
            demandPeriods: number;
            assignedPeriods: number;
            unassignedPeriods: number;
            coveragePercentage: number;
            status: "STAFFED" | "PARTIALLY_STAFFED" | "UNSTAFFED" | "OVER_ASSIGNED";
        }>;
    }>;
}

export interface SectionCoverageMatrix {
    academicYearId: string;
    sections: Array<{
        sectionId: string;
        sectionName: string;
        schoolGradeId: string;
        gradeName: string;
        gradeLevel: number;
        homeroomTeacher: {
            id: string;
            name: string;
            employeeId: string | null;
        } | null;
        subjectAllocations: Array<{
            subjectId: string;
            subjectName: string;
            weeklyPeriodsRequired: number;
            assignedPeriods: number;
            status: "STAFFED" | "VACANT" | "PROPOSED";
            assignmentId: string | null;
            assignmentStatus: string | null;
            teacher: {
                id: string;
                name: string;
                employeeId: string | null;
            } | null;
        }>;
    }>;
}

export interface TeacherWorkloadItem {
    teacherId: string;
    name: string;
    employeeId: string | null;
    email: string | null;
    employmentType: string;
    employmentStatus: string;
    minWorkload: number;
    targetWorkload: number;
    maxWorkload: number;
    totalPeriods: number;
    assignmentCount: number;
    status: "UNASSIGNED" | "UNDERLOADED" | "TARGET" | "NEAR_CAPACITY" | "OVERLOADED";
    homeroomSection: {
        id: string;
        name: string;
        gradeName: string;
    } | null;
    specializations: Array<{
        subjectId: string;
        subjectName: string;
        isPrimary: boolean;
        verified: boolean;
    }>;
    assignments: Array<{
        assignmentId: string;
        subjectName: string;
        gradeName: string;
        sectionName: string | null;
        periodsPerWeek: number;
        status: string;
    }>;
}

export class StaffingService {
    /**
     * Calculate teaching demand directly from Step 2:
     * Demand = Section count for Grade * SchoolGradeSubject.weeklyPeriods
     */
    static async getStaffingDemand(organizationId: string, academicYearId: string): Promise<StaffingDemandSummary> {
        const year = await prisma.academicYear.findFirst({
            where: { id: academicYearId, organizationId }
        });
        if (!year) throw new Error("Academic year not found for this school");

        // Fetch grades with their sections and configured curriculum subjects
        const schoolGrades = await prisma.schoolGrade.findMany({
            where: { academicYearId },
            include: {
                grade: true,
                sections: true,
                gradeSubjects: {
                    include: { subject: true }
                }
            },
            orderBy: { grade: { level: "asc" } }
        });

        // Fetch active/approved/proposed teaching assignments for this year
        const activeAssignments = await prisma.teachingAssignment.findMany({
            where: {
                academicYearId,
                teacher: { organizationId },
                status: { in: ["ACTIVE", "APPROVED", "PROPOSED"] }
            }
        });

        let grandTotalDemand = 0;
        let grandTotalAssigned = 0;
        let totalSectionsCount = 0;
        let totalConfiguredSubjects = 0;

        const gradeSummaries = schoolGrades.map((sg) => {
            const sectionCount = sg.sections.length;
            totalSectionsCount += sectionCount;

            let gradeDemand = 0;
            let gradeAssigned = 0;

            const subjectSummaries = sg.gradeSubjects.map((gs) => {
                totalConfiguredSubjects++;
                const weeklyPerSection = gs.weeklyPeriods || 0;
                const subjectDemand = weeklyPerSection * sectionCount;
                gradeDemand += subjectDemand;

                // Find assignments for this grade and subject
                const subjectAssignments = activeAssignments.filter(
                    (a) => a.schoolGradeId === sg.id && a.subjectId === gs.subjectId
                );

                const assignedPeriods = subjectAssignments.reduce((acc, curr) => acc + (curr.periodsPerWeek || 0), 0);
                gradeAssigned += assignedPeriods;

                const unassigned = Math.max(0, subjectDemand - assignedPeriods);
                const coverage = subjectDemand > 0 ? Math.min(100, Math.round((assignedPeriods / subjectDemand) * 100)) : 100;

                let status: "STAFFED" | "PARTIALLY_STAFFED" | "UNSTAFFED" | "OVER_ASSIGNED" = "UNSTAFFED";
                if (subjectDemand === 0 || assignedPeriods === subjectDemand) {
                    status = "STAFFED";
                } else if (assignedPeriods > subjectDemand) {
                    status = "OVER_ASSIGNED";
                } else if (assignedPeriods > 0) {
                    status = "PARTIALLY_STAFFED";
                }

                return {
                    subjectId: gs.subjectId,
                    subjectName: gs.subject.name,
                    subjectCode: gs.subject.code,
                    weeklyPeriodsPerSection: weeklyPerSection,
                    demandPeriods: subjectDemand,
                    assignedPeriods,
                    unassignedPeriods: unassigned,
                    coveragePercentage: coverage,
                    status
                };
            });

            grandTotalDemand += gradeDemand;
            grandTotalAssigned += gradeAssigned;

            const gradeUnassigned = Math.max(0, gradeDemand - gradeAssigned);
            const gradeCoverage = gradeDemand > 0 ? Math.min(100, Math.round((gradeAssigned / gradeDemand) * 100)) : 100;

            return {
                schoolGradeId: sg.id,
                gradeName: sg.grade.name,
                level: sg.grade.level,
                sectionCount,
                demandPeriods: gradeDemand,
                assignedPeriods: gradeAssigned,
                unassignedPeriods: gradeUnassigned,
                coveragePercentage: gradeCoverage,
                subjects: subjectSummaries
            };
        });

        const grandTotalUnassigned = Math.max(0, grandTotalDemand - grandTotalAssigned);
        const grandCoverage = grandTotalDemand > 0 ? Math.min(100, Math.round((grandTotalAssigned / grandTotalDemand) * 100)) : 100;

        return {
            academicYearId: year.id,
            academicYearName: year.name,
            totalDemandPeriods: grandTotalDemand,
            totalAssignedPeriods: grandTotalAssigned,
            totalUnassignedPeriods: grandTotalUnassigned,
            coveragePercentage: grandCoverage,
            totalSections: totalSectionsCount,
            totalSubjectsConfigured: totalConfiguredSubjects,
            grades: gradeSummaries
        };
    }

    /**
     * Get section-by-section coverage matrix
     */
    static async getSectionCoverageMatrix(organizationId: string, academicYearId: string, schoolGradeId?: string): Promise<SectionCoverageMatrix> {
        const year = await prisma.academicYear.findFirst({
            where: { id: academicYearId, organizationId }
        });
        if (!year) throw new Error("Academic year not found");

        const sections = await prisma.section.findMany({
            where: {
                schoolGrade: {
                    academicYearId,
                    ...(schoolGradeId ? { id: schoolGradeId } : {})
                }
            },
            include: {
                homeroomTeacher: true,
                schoolGrade: {
                    include: {
                        grade: true,
                        gradeSubjects: {
                            include: { subject: true }
                        }
                    }
                }
            },
            orderBy: [
                { schoolGrade: { grade: { level: "asc" } } },
                { name: "asc" }
            ]
        });

        const assignments = await prisma.teachingAssignment.findMany({
            where: {
                academicYearId,
                teacher: { organizationId },
                status: { in: ["ACTIVE", "APPROVED", "PROPOSED"] }
            },
            include: {
                teacher: true,
                subject: true
            }
        });

        const matrixSections = sections.map((sec) => {
            const configuredSubjects = sec.schoolGrade.gradeSubjects;
            
            const allocations = configuredSubjects.map((gs) => {
                const reqPeriods = gs.weeklyPeriods || 0;
                const assignment = assignments.find(
                    (a) => a.schoolGradeId === sec.schoolGradeId && a.sectionId === sec.id && a.subjectId === gs.subjectId
                );

                let status: "STAFFED" | "VACANT" | "PROPOSED" = "VACANT";
                if (assignment) {
                    status = assignment.status === "ACTIVE" ? "STAFFED" : "PROPOSED";
                }

                return {
                    subjectId: gs.subjectId,
                    subjectName: gs.subject.name,
                    weeklyPeriodsRequired: reqPeriods,
                    assignedPeriods: assignment ? assignment.periodsPerWeek : 0,
                    status,
                    assignmentId: assignment ? assignment.id : null,
                    assignmentStatus: assignment ? assignment.status : null,
                    teacher: assignment
                        ? {
                              id: assignment.teacher.id,
                              name: `${assignment.teacher.firstName} ${assignment.teacher.lastName}`.trim(),
                              employeeId: assignment.teacher.employeeId
                          }
                        : null
                };
            });

            return {
                sectionId: sec.id,
                sectionName: sec.name,
                schoolGradeId: sec.schoolGradeId,
                gradeName: sec.schoolGrade.grade.name,
                gradeLevel: sec.schoolGrade.grade.level,
                homeroomTeacher: sec.homeroomTeacher
                    ? {
                          id: sec.homeroomTeacher.id,
                          name: `${sec.homeroomTeacher.firstName} ${sec.homeroomTeacher.lastName}`.trim(),
                          employeeId: sec.homeroomTeacher.employeeId
                      }
                    : null,
                subjectAllocations: allocations
            };
        });

        return {
            academicYearId,
            sections: matrixSections
        };
    }

    /**
     * Compute teacher weekly periods and workload status
     */
    static async getFacultyWorkload(organizationId: string, academicYearId: string): Promise<TeacherWorkloadItem[]> {
        const teachers = await prisma.teacher.findMany({
            where: { organizationId },
            include: {
                specializations: {
                    include: { subject: true }
                },
                homeroomSections: {
                    where: { schoolGrade: { academicYearId } },
                    include: { schoolGrade: { include: { grade: true } } }
                },
                assignments: {
                    where: {
                        academicYearId,
                        status: { in: ["ACTIVE", "APPROVED", "PROPOSED"] }
                    },
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                }
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }]
        });

        return teachers.map((t) => {
            const totalPeriods = t.assignments.reduce((acc, curr) => acc + (curr.periodsPerWeek || 0), 0);
            const minW = t.minWorkload ?? 18;
            const targetW = t.targetWorkload ?? 22;
            const maxW = t.maxWorkload ?? 28;

            let status: "UNASSIGNED" | "UNDERLOADED" | "TARGET" | "NEAR_CAPACITY" | "OVERLOADED" = "UNASSIGNED";
            if (totalPeriods === 0) {
                status = "UNASSIGNED";
            } else if (totalPeriods < minW) {
                status = "UNDERLOADED";
            } else if (totalPeriods <= targetW) {
                status = "TARGET";
            } else if (totalPeriods <= maxW) {
                status = "NEAR_CAPACITY";
            } else {
                status = "OVERLOADED";
            }

            const hrSection = t.homeroomSections[0] || null;

            return {
                teacherId: t.id,
                name: `${t.firstName} ${t.lastName}`.trim(),
                employeeId: t.employeeId,
                email: t.email,
                employmentType: t.employmentType,
                employmentStatus: t.employmentStatus,
                minWorkload: minW,
                targetWorkload: targetW,
                maxWorkload: maxW,
                totalPeriods,
                assignmentCount: t.assignments.length,
                status,
                homeroomSection: hrSection
                    ? {
                          id: hrSection.id,
                          name: hrSection.name,
                          gradeName: hrSection.schoolGrade.grade.name
                      }
                    : null,
                specializations: t.specializations.map((s) => ({
                    subjectId: s.subjectId,
                    subjectName: s.subject.name,
                    isPrimary: s.isPrimary,
                    verified: s.verified
                })),
                assignments: t.assignments.map((a) => ({
                    assignmentId: a.id,
                    subjectName: a.subject.name,
                    gradeName: a.schoolGrade.grade.name,
                    sectionName: a.section ? a.section.name : null,
                    periodsPerWeek: a.periodsPerWeek,
                    status: a.status
                }))
            };
        });
    }

    /**
     * Check teacher specialization match for a subject
     */
    static async evaluateSpecializationMatch(teacherId: string, subjectId: string): Promise<{
        isMatch: boolean;
        level: "MATCH" | "WARNING";
        message: string;
    }> {
        const spec = await prisma.teacherSpecialization.findFirst({
            where: { teacherId, subjectId }
        });

        if (spec) {
            return {
                isMatch: true,
                level: "MATCH",
                message: spec.verified ? "Teacher has verified specialization in this subject" : "Teacher is specialized in this subject"
            };
        }

        return {
            isMatch: false,
            level: "WARNING",
            message: "Teacher does not have an explicit recorded specialization for this subject"
        };
    }

    /**
     * Assign Homeroom teacher to Section
     */
    static async setSectionHomeroomTeacher(organizationId: string, sectionId: string, teacherId: string | null, userId?: string) {
        const section = await prisma.section.findFirst({
            where: {
                id: sectionId,
                schoolGrade: { academicYear: { organizationId } }
            },
            include: {
                schoolGrade: { include: { academicYear: true, grade: true } },
                homeroomTeacher: true
            }
        });
        if (!section) throw new Error("Section not found in this school");

        if (teacherId) {
            const teacher = await prisma.teacher.findFirst({
                where: { id: teacherId, organizationId }
            });
            if (!teacher) throw new Error("Teacher not found in this school");
        }

        const oldTeacher = section.homeroomTeacher;

        const updated = await prisma.section.update({
            where: { id: sectionId },
            data: { homeroomTeacherId: teacherId },
            include: { homeroomTeacher: true }
        });

        await prisma.auditLog.create({
            data: {
                organizationId,
                action: teacherId ? "HOMEROOM_TEACHER_ASSIGNED" : "HOMEROOM_TEACHER_REMOVED",
                resource: "Section",
                resourceId: sectionId,
                oldValue: oldTeacher ? { teacherId: oldTeacher.id, name: `${oldTeacher.firstName} ${oldTeacher.lastName}` } : undefined,
                newValue: updated.homeroomTeacher ? { teacherId: updated.homeroomTeacher.id, name: `${updated.homeroomTeacher.firstName} ${updated.homeroomTeacher.lastName}` } : undefined,
                userId: userId || null
            }
        });

        return updated;
    }
}
