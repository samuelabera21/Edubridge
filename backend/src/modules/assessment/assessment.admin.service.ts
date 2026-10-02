import { prisma } from "../../infrastructure/prisma/client.js";

export interface OverviewFilters {
    academicYearId?: string;
    schoolGradeId?: string;
    sectionId?: string;
    subjectId?: string;
    assessmentId?: string;
}

export interface ResultsQueryFilters extends OverviewFilters {
    search?: string;
    page?: number;
    limit?: number;
}

export class AssessmentAdminService {
    /**
     * Resolves the target academic year. If academicYearId is supplied, validates it.
     * Otherwise finds the current ACTIVE academic year for the organization.
     */
    static async resolveAcademicYear(organizationId: string, academicYearId?: string) {
        if (academicYearId) {
            const year = await prisma.academicYear.findFirst({
                where: { id: academicYearId, organizationId }
            });
            if (!year) {
                throw new Error("Academic year not found or does not belong to organization");
            }
            return year;
        }

        const activeYear = await prisma.academicYear.findFirst({
            where: { organizationId, status: "ACTIVE" },
            orderBy: { createdAt: "desc" }
        });

        return activeYear;
    }

    /**
     * Get Assessment & Results Overview with KPIs, Grade Performance, and Subject Performance.
     */
    static async getOverview(organizationId: string, filters: OverviewFilters) {
        const year = await this.resolveAcademicYear(organizationId, filters.academicYearId);
        const resolvedYearId = year?.id;

        // Build where clause for StudentResult matching organization and filter parameters
        const whereClause: any = {
            assessment: {
                organizationId,
                ...(resolvedYearId ? { academicYearId: resolvedYearId } : {}),
                ...(filters.assessmentId ? { id: filters.assessmentId } : {}),
                ...(filters.subjectId ? { teachingAssignment: { subjectId: filters.subjectId } } : {}),
                ...(filters.schoolGradeId ? { teachingAssignment: { schoolGradeId: filters.schoolGradeId } } : {}),
                ...(filters.sectionId ? { teachingAssignment: { sectionId: filters.sectionId } } : {})
            }
        };

        // Query all matching results with rich relations for accurate aggregations without N+1
        const results = await prisma.studentResult.findMany({
            where: whereClause,
            include: {
                enrollment: {
                    include: {
                        student: true,
                        schoolGrade: { include: { grade: true } },
                        section: true
                    }
                },
                assessment: {
                    include: {
                        teachingAssignment: {
                            include: {
                                subject: true,
                                schoolGrade: { include: { grade: true } },
                                section: true
                            }
                        }
                    }
                }
            }
        });

        // Count unique assessments within scope
        const assessmentCount = await prisma.assessment.count({
            where: {
                organizationId,
                ...(resolvedYearId ? { academicYearId: resolvedYearId } : {}),
                ...(filters.assessmentId ? { id: filters.assessmentId } : {}),
                ...(filters.subjectId ? { teachingAssignment: { subjectId: filters.subjectId } } : {}),
                ...(filters.schoolGradeId ? { teachingAssignment: { schoolGradeId: filters.schoolGradeId } } : {}),
                ...(filters.sectionId ? { teachingAssignment: { sectionId: filters.sectionId } } : {})
            }
        });

        if (results.length === 0) {
            return {
                academicYear: year ? { id: year.id, name: year.name, status: year.status } : null,
                summary: {
                    totalAssessments: assessmentCount,
                    studentsWithResults: 0,
                    totalResults: 0,
                    averageScore: 0,
                    passRate: 0
                },
                gradePerformance: [],
                subjectPerformance: []
            };
        }

        // Summary KPI calculations
        const studentIdSet = new Set<string>();
        let totalPercentageSum = 0;
        let passingResultsCount = 0;

        // Maps for Grade and Subject breakdown
        const gradeMap = new Map<string, {
            gradeId: string;
            gradeName: string;
            studentIdSet: Set<string>;
            totalResults: number;
            totalPercentageSum: number;
            passedCount: number;
        }>();

        const subjectMap = new Map<string, {
            subjectId: string;
            subjectName: string;
            subjectCode: string;
            totalResults: number;
            totalPercentageSum: number;
            passedCount: number;
        }>();

        for (const res of results) {
            const maxScore = res.assessment.maxScore || 100;
            const passingScore = res.assessment.passingScore !== null && res.assessment.passingScore !== undefined 
                ? res.assessment.passingScore 
                : (maxScore * 0.5);

            const percentage = (res.score / maxScore) * 100;
            const isPassing = res.score >= passingScore;

            if (res.enrollment?.studentId) {
                studentIdSet.add(res.enrollment.studentId);
            }

            totalPercentageSum += percentage;
            if (isPassing) passingResultsCount++;

            // Grade Grouping (from teachingAssignment or enrollment)
            const schoolGrade = res.assessment.teachingAssignment?.schoolGrade || res.enrollment?.schoolGrade;
            const gradeName = schoolGrade?.grade?.name || "Unassigned Grade";
            const gradeId = schoolGrade?.id || "unknown-grade";

            if (!gradeMap.has(gradeId)) {
                gradeMap.set(gradeId, {
                    gradeId,
                    gradeName,
                    studentIdSet: new Set<string>(),
                    totalResults: 0,
                    totalPercentageSum: 0,
                    passedCount: 0
                });
            }
            const gradeEntry = gradeMap.get(gradeId)!;
            gradeEntry.totalResults += 1;
            gradeEntry.totalPercentageSum += percentage;
            if (isPassing) gradeEntry.passedCount += 1;
            if (res.enrollment?.studentId) gradeEntry.studentIdSet.add(res.enrollment.studentId);

            // Subject Grouping
            const subject = res.assessment.teachingAssignment?.subject;
            if (subject) {
                const subjectId = subject.id;
                if (!subjectMap.has(subjectId)) {
                    subjectMap.set(subjectId, {
                        subjectId,
                        subjectName: subject.name,
                        subjectCode: subject.code || "",
                        totalResults: 0,
                        totalPercentageSum: 0,
                        passedCount: 0
                    });
                }
                const subjectEntry = subjectMap.get(subjectId)!;
                subjectEntry.totalResults += 1;
                subjectEntry.totalPercentageSum += percentage;
                if (isPassing) subjectEntry.passedCount += 1;
            }
        }

        const totalResults = results.length;
        const averageScore = totalResults > 0 ? parseFloat((totalPercentageSum / totalResults).toFixed(1)) : 0;
        const passRate = totalResults > 0 ? parseFloat(((passingResultsCount / totalResults) * 100).toFixed(1)) : 0;

        const gradePerformance = Array.from(gradeMap.values()).map(g => ({
            gradeId: g.gradeId,
            gradeName: g.gradeName,
            students: g.studentIdSet.size,
            results: g.totalResults,
            average: g.totalResults > 0 ? parseFloat((g.totalPercentageSum / g.totalResults).toFixed(1)) : 0,
            passRate: g.totalResults > 0 ? parseFloat(((g.passedCount / g.totalResults) * 100).toFixed(1)) : 0
        })).sort((a, b) => a.gradeName.localeCompare(b.gradeName));

        const subjectPerformance = Array.from(subjectMap.values()).map(s => ({
            subjectId: s.subjectId,
            subjectName: s.subjectName,
            subjectCode: s.subjectCode,
            results: s.totalResults,
            average: s.totalResults > 0 ? parseFloat((s.totalPercentageSum / s.totalResults).toFixed(1)) : 0,
            passRate: s.totalResults > 0 ? parseFloat(((s.passedCount / s.totalResults) * 100).toFixed(1)) : 0
        })).sort((a, b) => a.subjectName.localeCompare(b.subjectName));

        return {
            academicYear: year ? { id: year.id, name: year.name, status: year.status } : null,
            summary: {
                totalAssessments: assessmentCount,
                studentsWithResults: studentIdSet.size,
                totalResults,
                averageScore,
                passRate
            },
            gradePerformance,
            subjectPerformance
        };
    }

    /**
     * Get paginated, filtered student results for the School Administrator / Principal.
     */
    static async getSchoolResults(organizationId: string, filters: ResultsQueryFilters) {
        const year = await this.resolveAcademicYear(organizationId, filters.academicYearId);
        const resolvedYearId = year?.id;

        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
        const skip = (page - 1) * limit;

        const search = filters.search?.trim();

        const whereClause: any = {
            assessment: {
                organizationId,
                ...(resolvedYearId ? { academicYearId: resolvedYearId } : {}),
                ...(filters.assessmentId ? { id: filters.assessmentId } : {}),
                ...(filters.subjectId ? { teachingAssignment: { subjectId: filters.subjectId } } : {}),
                ...(filters.schoolGradeId ? { teachingAssignment: { schoolGradeId: filters.schoolGradeId } } : {}),
                ...(filters.sectionId ? { teachingAssignment: { sectionId: filters.sectionId } } : {})
            },
            ...(search ? {
                enrollment: {
                    student: {
                        OR: [
                            { firstName: { contains: search, mode: "insensitive" } },
                            { lastName: { contains: search, mode: "insensitive" } },
                            { studentId: { contains: search, mode: "insensitive" } }
                        ]
                    }
                }
            } : {})
        };

        const [total, results] = await Promise.all([
            prisma.studentResult.count({ where: whereClause }),
            prisma.studentResult.findMany({
                where: whereClause,
                include: {
                    enrollment: {
                        include: {
                            student: true,
                            schoolGrade: { include: { grade: true } },
                            section: true,
                            academicYear: true
                        }
                    },
                    assessment: {
                        include: {
                            academicYear: true,
                            teachingAssignment: {
                                include: {
                                    subject: true,
                                    teacher: true,
                                    schoolGrade: { include: { grade: true } },
                                    section: true
                                }
                            }
                        }
                    },
                    gradedBy: true
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit
            })
        ]);

        const formattedResults = results.map(res => {
            const student = res.enrollment?.student;
            const maxScore = res.assessment.maxScore || 100;
            const passingScore = res.assessment.passingScore !== null && res.assessment.passingScore !== undefined
                ? res.assessment.passingScore
                : (maxScore * 0.5);

            const percentage = Math.round((res.score / maxScore) * 100);
            const isPassing = res.score >= passingScore;

            const schoolGrade = res.assessment.teachingAssignment?.schoolGrade || res.enrollment?.schoolGrade;
            const section = res.assessment.teachingAssignment?.section || res.enrollment?.section;
            const subject = res.assessment.teachingAssignment?.subject;
            const teacher = res.assessment.teachingAssignment?.teacher;

            return {
                id: res.id,
                student: student ? {
                    id: student.id,
                    studentId: student.studentId || "N/A",
                    firstName: student.firstName,
                    lastName: student.lastName,
                    fullName: `${student.firstName} ${student.lastName}`
                } : null,
                enrollmentId: res.enrollmentId,
                grade: schoolGrade?.grade?.name || "N/A",
                gradeId: schoolGrade?.id,
                section: section ? section.name : "N/A",
                sectionId: section?.id,
                subject: subject ? {
                    id: subject.id,
                    name: subject.name,
                    code: subject.code || ""
                } : null,
                teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unassigned",
                assessment: {
                    id: res.assessment.id,
                    title: res.assessment.title,
                    type: res.assessment.type,
                    maxScore: res.assessment.maxScore,
                    passingScore: res.assessment.passingScore,
                    dueDate: res.assessment.dueDate ? res.assessment.dueDate.toISOString().split("T")[0] : null
                },
                score: res.score,
                maxScore,
                percentage,
                isPassing,
                resultStatus: isPassing ? "PASS" : "FAIL",
                feedback: res.feedback || null,
                academicYear: res.assessment.academicYear?.name || "Current Year",
                createdAt: res.createdAt.toISOString()
            };
        });

        return {
            results: formattedResults,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1
            }
        };
    }

    /**
     * Get comprehensive individual student result detail for the Principal.
     */
    static async getStudentResultDetail(organizationId: string, enrollmentId: string, academicYearId?: string) {
        const enrollment = await prisma.studentEnrollment.findFirst({
            where: { id: enrollmentId, organizationId },
            include: {
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true,
                academicYear: true
            }
        });

        if (!enrollment) {
            throw new Error("Student enrollment not found in this organization");
        }

        const results = await prisma.studentResult.findMany({
            where: {
                enrollmentId,
                assessment: {
                    organizationId,
                    ...(academicYearId ? { academicYearId } : {})
                }
            },
            include: {
                assessment: {
                    include: {
                        teachingAssignment: {
                            include: {
                                subject: true,
                                teacher: true,
                                schoolGrade: { include: { grade: true } },
                                section: true
                            }
                        }
                    }
                },
                gradedBy: true
            },
            orderBy: { createdAt: "desc" }
        });

        // Group by subject
        const subjectMap = new Map<string, {
            subjectId: string;
            subjectName: string;
            subjectCode: string;
            teacherName: string;
            totalScore: number;
            totalMax: number;
            assessments: Array<{
                id: string;
                title: string;
                type: string;
                score: number;
                maxScore: number;
                percentage: number;
                isPassing: boolean;
                feedback: string | null;
                date: string | null;
            }>;
        }>();

        let totalScoreSum = 0;
        let totalMaxSum = 0;
        let passCount = 0;
        let failCount = 0;

        for (const r of results) {
            const subj = r.assessment.teachingAssignment?.subject;
            const teacher = r.assessment.teachingAssignment?.teacher;
            const subjId = subj?.id || "general";
            const subjName = subj?.name || "General";
            const subjCode = subj?.code || "";
            const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : "Unassigned";

            const maxScore = r.assessment.maxScore || 100;
            const passingScore = r.assessment.passingScore !== null && r.assessment.passingScore !== undefined
                ? r.assessment.passingScore
                : (maxScore * 0.5);

            const percentage = Math.round((r.score / maxScore) * 100);
            const isPassing = r.score >= passingScore;

            if (isPassing) passCount++;
            else failCount++;

            totalScoreSum += r.score;
            totalMaxSum += maxScore;

            if (!subjectMap.has(subjId)) {
                subjectMap.set(subjId, {
                    subjectId: subjId,
                    subjectName: subjName,
                    subjectCode: subjCode,
                    teacherName,
                    totalScore: 0,
                    totalMax: 0,
                    assessments: []
                });
            }

            const subjEntry = subjectMap.get(subjId)!;
            subjEntry.totalScore += r.score;
            subjEntry.totalMax += maxScore;
            subjEntry.assessments.push({
                id: r.id,
                title: r.assessment.title,
                type: r.assessment.type,
                score: r.score,
                maxScore,
                percentage,
                isPassing,
                feedback: r.feedback || null,
                date: (r.assessment.dueDate ? r.assessment.dueDate.toISOString().split("T")[0] : null) as string | null
            });
        }

        const subjectSummaries = Array.from(subjectMap.values()).map(s => ({
            subjectId: s.subjectId,
            subjectName: s.subjectName,
            subjectCode: s.subjectCode,
            teacherName: s.teacherName,
            averagePercentage: s.totalMax > 0 ? Math.round((s.totalScore / s.totalMax) * 100) : 0,
            assessmentsCount: s.assessments.length,
            assessments: s.assessments
        }));

        const overallPercentage = totalMaxSum > 0 ? Math.round((totalScoreSum / totalMaxSum) * 100) : 0;

        return {
            student: {
                id: enrollment.student.id,
                studentId: enrollment.student.studentId || "N/A",
                firstName: enrollment.student.firstName,
                lastName: enrollment.student.lastName,
                fullName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
                gender: enrollment.student.gender,
                emergencyContactPhone: enrollment.student.emergencyContactPhone
            },
            enrollment: {
                id: enrollment.id,
                grade: enrollment.schoolGrade?.grade?.name || "N/A",
                section: enrollment.section ? `Section ${enrollment.section.name}` : "N/A",
                academicYear: enrollment.academicYear?.name || "N/A"
            },
            summary: {
                totalAssessments: results.length,
                totalScore: totalScoreSum,
                totalMax: totalMaxSum,
                overallPercentage,
                passCount,
                failCount,
                status: results.length === 0 ? "NO_RESULTS" : (overallPercentage >= 50 ? "PASS" : "FAIL")
            },
            subjects: subjectSummaries
        };
    }

    /**
     * Get active filter options for the Principal Oversight filter bar.
     */
    static async getFilterOptions(organizationId: string, academicYearId?: string) {
        const year = await this.resolveAcademicYear(organizationId, academicYearId);
        const resolvedYearId = year?.id;

        const [academicYears, schoolGrades, subjects, assessments] = await Promise.all([
            prisma.academicYear.findMany({
                where: { organizationId },
                orderBy: { startDate: "desc" },
                select: { id: true, name: true, status: true }
            }),
            prisma.schoolGrade.findMany({
                where: {
                    academicYear: { organizationId },
                    ...(resolvedYearId ? { academicYearId: resolvedYearId } : {})
                },
                include: {
                    grade: true,
                    sections: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { grade: { level: "asc" } }
            }),
            prisma.subject.findMany({
                where: { organizationId },
                select: { id: true, name: true, code: true },
                orderBy: { name: "asc" }
            }),
            prisma.assessment.findMany({
                where: {
                    organizationId,
                    ...(resolvedYearId ? { academicYearId: resolvedYearId } : {})
                },
                select: { id: true, title: true, type: true, maxScore: true },
                orderBy: { title: "asc" }
            })
        ]);

        return {
            activeAcademicYear: year ? { id: year.id, name: year.name, status: year.status } : null,
            academicYears,
            grades: schoolGrades.map(sg => ({
                id: sg.id,
                name: sg.grade?.name || `Grade ${sg.id}`,
                sections: sg.sections.map(sec => ({
                    id: sec.id,
                    name: `Section ${sec.name}`
                }))
            })),
            subjects,
            assessments
        };
    }

    /**
     * Get enrolled students matching academic year, grade, section, and search query.
     */
    static async getStudentsRoster(organizationId: string, filters: {
        academicYearId?: string;
        schoolGradeId?: string;
        sectionId?: string;
        search?: string;
    }) {
        const year = await this.resolveAcademicYear(organizationId, filters.academicYearId);
        const resolvedYearId = year?.id;
        const search = filters.search?.trim();

        const enrollments = await prisma.studentEnrollment.findMany({
            where: {
                organizationId,
                ...(resolvedYearId ? { academicYearId: resolvedYearId } : {}),
                ...(filters.schoolGradeId ? { schoolGradeId: filters.schoolGradeId } : {}),
                ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
                ...(search ? {
                    student: {
                        OR: [
                            { firstName: { contains: search, mode: "insensitive" } },
                            { lastName: { contains: search, mode: "insensitive" } },
                            { fatherName: { contains: search, mode: "insensitive" } },
                            { studentId: { contains: search, mode: "insensitive" } }
                        ]
                    }
                } : {})
            },
            include: {
                student: true,
                schoolGrade: { include: { grade: true } },
                section: true,
                academicYear: true
            },
            orderBy: [
                { student: { firstName: "asc" } },
                { student: { lastName: "asc" } }
            ]
        });

        return enrollments;
    }
}

