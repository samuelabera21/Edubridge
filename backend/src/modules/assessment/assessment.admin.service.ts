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

    /**
     * Imports a result marksheet from Excel (any dynamic column schema).
     */
    static async importResultSheet(organizationId: string, data: {
        title: string;
        fileName?: string;
        academicYearId?: string;
        schoolGradeId?: string;
        sectionId?: string;
        subjectId?: string;
        teachingAssignmentId?: string;
        columns: string[];
        rows: Record<string, any>[];
        maxScore?: number;
        passingScore?: number;
        uploadedById?: string;
    }) {
        const year = await this.resolveAcademicYear(organizationId, data.academicYearId);
        if (!year) throw new Error("No active academic year found for this school");
        const resolvedYearId = year.id;

        // Find or associate a teaching assignment
        let assignmentId = data.teachingAssignmentId;
        if (!assignmentId) {
            const matchWhere: any = {
                academicYearId: resolvedYearId,
                academicYear: { organizationId }
            };
            if (data.subjectId) matchWhere.subjectId = data.subjectId;
            if (data.schoolGradeId) matchWhere.schoolGradeId = data.schoolGradeId;
            if (data.sectionId) matchWhere.sectionId = data.sectionId;

            const existing = await prisma.teachingAssignment.findFirst({
                where: matchWhere
            });

            if (existing) {
                assignmentId = existing.id;
            } else {
                const anyAssignment = await prisma.teachingAssignment.findFirst({
                    where: { academicYear: { organizationId } }
                });
                if (anyAssignment) {
                    assignmentId = anyAssignment.id;
                } else {
                    const [firstTeacher, firstSubject, firstGrade] = await Promise.all([
                        prisma.teacher.findFirst({ where: { organizationId } }),
                        prisma.subject.findFirst({ where: { organizationId } }),
                        prisma.schoolGrade.findFirst({ where: { academicYearId: resolvedYearId } })
                    ]);

                    if (firstTeacher && firstSubject && firstGrade) {
                        const createdAssignment = await prisma.teachingAssignment.create({
                            data: {
                                academicYearId: resolvedYearId,
                                teacherId: firstTeacher.id,
                                subjectId: data.subjectId || firstSubject.id,
                                schoolGradeId: data.schoolGradeId || firstGrade.id,
                                sectionId: data.sectionId || null,
                                status: "ACTIVE"
                            }
                        });
                        assignmentId = createdAssignment.id;
                    } else {
                        throw new Error("Cannot import results: school requires at least one registered teacher, subject, and grade.");
                    }
                }
            }
        }

        // Calculate statistics across rows
        const numericValues: number[] = [];
        const scoreColumnKeywords = ["total", "totalscore", "score", "mark", "final", "result", "grade", "points"];
        let targetScoreCol: string | null = null;
        for (const col of data.columns) {
            const lower = col.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (scoreColumnKeywords.some(s => lower.includes(s))) {
                targetScoreCol = col;
                break;
            }
        }

        if (targetScoreCol) {
            for (const r of data.rows) {
                const val = parseFloat(r[targetScoreCol]);
                if (!isNaN(val)) numericValues.push(val);
            }
        } else {
            for (const col of data.columns) {
                const nums: number[] = [];
                for (const r of data.rows) {
                    const val = parseFloat(r[col]);
                    if (!isNaN(val)) nums.push(val);
                }
                if (nums.length >= data.rows.length * 0.5 && nums.length > 0) {
                    targetScoreCol = col;
                    numericValues.push(...nums);
                    break;
                }
            }
        }

        const calculatedMax = data.maxScore || (numericValues.length > 0 ? Math.max(...numericValues, 100) : 100);
        const calculatedPassing = data.passingScore !== undefined ? data.passingScore : (calculatedMax * 0.5);
        const averageScore = numericValues.length > 0 ? Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 10) / 10 : 0;
        const passCount = numericValues.filter(v => v >= calculatedPassing).length;
        const passRate = numericValues.length > 0 ? Math.round((passCount / numericValues.length) * 1000) / 10 : 0;

        const sheetMetadata = {
            isExcelSheet: true,
            fileName: data.fileName || `${data.title.replace(/\s+/g, "_")}.xlsx`,
            columns: data.columns,
            rows: data.rows,
            scoreColumn: targetScoreCol,
            uploadedAt: new Date().toISOString(),
            uploadedById: data.uploadedById,
            summary: {
                totalRows: data.rows.length,
                averageScore,
                passRate,
                highestScore: numericValues.length > 0 ? Math.max(...numericValues) : 0,
                lowestScore: numericValues.length > 0 ? Math.min(...numericValues) : 0
            }
        };

        const assessment = await prisma.assessment.create({
            data: {
                organizationId,
                academicYearId: resolvedYearId,
                teachingAssignmentId: assignmentId,
                title: data.title,
                description: JSON.stringify(sheetMetadata),
                type: "EXAM",
                status: "RELEASED",
                maxScore: calculatedMax,
                passingScore: calculatedPassing
            },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        teacher: true
                    }
                }
            }
        });

        // Match rows to enrollments if student identification column is present
        try {
            const idKeywords = ["studentid", "id", "rollno", "studentno", "code", "admissionno"];
            let idCol: string | null = null;
            for (const col of data.columns) {
                const lower = col.toLowerCase().replace(/[^a-z0-9]/g, "");
                if (idKeywords.some(s => lower === s || lower.includes("studentid"))) {
                    idCol = col;
                    break;
                }
            }

            if (idCol && targetScoreCol && data.rows.length > 0) {
                const enrollments = await prisma.studentEnrollment.findMany({
                    where: {
                        organizationId,
                        academicYearId: resolvedYearId,
                        ...(data.sectionId ? { sectionId: data.sectionId } : {})
                    },
                    include: { student: true }
                });

                const enrollmentMap = new Map<string, string>();
                for (const e of enrollments) {
                    if (e.student?.studentId) {
                        enrollmentMap.set(e.student.studentId.trim().toLowerCase(), e.id);
                    }
                }

                for (const r of data.rows) {
                    const rawId = String(r[idCol] || "").trim().toLowerCase();
                    const enrollmentId = enrollmentMap.get(rawId);
                    const score = parseFloat(r[targetScoreCol]);
                    if (enrollmentId && !isNaN(score)) {
                        await prisma.studentResult.upsert({
                            where: {
                                assessmentId_enrollmentId: {
                                    assessmentId: assessment.id,
                                    enrollmentId
                                }
                            },
                            update: {
                                score,
                                status: "SUBMITTED"
                            },
                            create: {
                                assessmentId: assessment.id,
                                enrollmentId,
                                score,
                                status: "SUBMITTED"
                            }
                        }).catch(() => {});
                    }
                }
            }
        } catch (err) {
            console.error("Student result matching non-critical error:", err);
        }

        return {
            id: assessment.id,
            title: assessment.title,
            fileName: sheetMetadata.fileName,
            gradeName: assessment.teachingAssignment?.schoolGrade?.grade?.name || "General",
            sectionName: assessment.teachingAssignment?.section?.name ? `Section ${assessment.teachingAssignment.section.name}` : "All Sections",
            subjectName: assessment.teachingAssignment?.subject?.name || "General Subject",
            teacherName: assessment.teachingAssignment?.teacher ? `${assessment.teachingAssignment.teacher.firstName} ${assessment.teachingAssignment.teacher.lastName}` : "Faculty Member",
            totalStudents: data.rows.length,
            averageScore,
            passRate,
            submittedAt: assessment.createdAt,
            columns: data.columns
        };
    }

    /**
     * Get all submitted result marksheets for the School Administrator.
     */
    static async getResultSheets(organizationId: string, filters: OverviewFilters & { search?: string }) {
        const year = await this.resolveAcademicYear(organizationId, filters.academicYearId);
        const resolvedYearId = year?.id;

        const assessments = await prisma.assessment.findMany({
            where: {
                organizationId,
                ...(resolvedYearId ? { academicYearId: resolvedYearId } : {}),
                ...(filters.subjectId ? { teachingAssignment: { subjectId: filters.subjectId } } : {}),
                ...(filters.schoolGradeId ? { teachingAssignment: { schoolGradeId: filters.schoolGradeId } } : {}),
                ...(filters.sectionId ? { teachingAssignment: { sectionId: filters.sectionId } } : {}),
                ...(filters.search ? {
                    OR: [
                        { title: { contains: filters.search, mode: "insensitive" } },
                        { description: { contains: filters.search, mode: "insensitive" } }
                    ]
                } : {})
            },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        teacher: true
                    }
                },
                results: {
                    include: {
                        enrollment: {
                            include: { student: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return assessments.map(a => {
            let metadata: any = null;
            if (a.description) {
                try {
                    metadata = JSON.parse(a.description);
                } catch {
                    metadata = null;
                }
            }

            const isExcel = metadata && metadata.isExcelSheet;
            const columns = isExcel && metadata.columns ? metadata.columns : ["Student ID", "Student Name", "Score", "Max Score", "Status"];
            const totalRows = isExcel && metadata.rows ? metadata.rows.length : a.results.length;

            const avgScore = isExcel && metadata.summary?.averageScore !== undefined
                ? metadata.summary.averageScore
                : (a.results.length > 0 ? Math.round((a.results.reduce((acc, r) => acc + r.score, 0) / a.results.length) * 10) / 10 : 0);

            const passRate = isExcel && metadata.summary?.passRate !== undefined
                ? metadata.summary.passRate
                : (a.results.length > 0 ? Math.round((a.results.filter(r => r.score >= (a.passingScore || a.maxScore * 0.5)).length / a.results.length) * 1000) / 10 : 0);

            return {
                id: a.id,
                title: a.title,
                fileName: isExcel ? metadata.fileName : `${a.title.replace(/\s+/g, "_")}.xlsx`,
                schoolGradeId: a.teachingAssignment?.schoolGradeId,
                gradeName: a.teachingAssignment?.schoolGrade?.grade?.name || "General",
                sectionId: a.teachingAssignment?.sectionId,
                sectionName: a.teachingAssignment?.section?.name ? `Section ${a.teachingAssignment.section.name}` : "All Sections",
                subjectId: a.teachingAssignment?.subjectId,
                subjectName: a.teachingAssignment?.subject?.name || "General Subject",
                subjectCode: a.teachingAssignment?.subject?.code || "",
                teacherName: a.teachingAssignment?.teacher ? `${a.teachingAssignment.teacher.firstName} ${a.teachingAssignment.teacher.lastName}` : "Faculty Member",
                submittedAt: a.createdAt,
                totalStudents: totalRows,
                averageScore: avgScore,
                passRate: passRate,
                maxScore: a.maxScore,
                passingScore: a.passingScore,
                columnsCount: columns.length,
                columns
            };
        });
    }

    /**
     * Get the complete raw rows and columns for a specific result sheet.
     */
    static async getResultSheetDetail(organizationId: string, sheetId: string) {
        const assessment = await prisma.assessment.findFirst({
            where: { id: sheetId, organizationId },
            include: {
                teachingAssignment: {
                    include: {
                        subject: true,
                        schoolGrade: { include: { grade: true } },
                        section: true,
                        teacher: true
                    }
                },
                results: {
                    include: {
                        enrollment: {
                            include: { student: true }
                        }
                    }
                }
            }
        });

        if (!assessment) throw new Error("Result sheet not found");

        let metadata: any = null;
        if (assessment.description) {
            try {
                metadata = JSON.parse(assessment.description);
            } catch {
                metadata = null;
            }
        }

        const isExcel = metadata && metadata.isExcelSheet;
        const columns = isExcel && metadata.columns ? metadata.columns : ["Student ID", "Student Name", "Score", "Max Score", "Status"];
        
        const rows = isExcel && metadata.rows ? metadata.rows : assessment.results.map((r, idx) => ({
            "Student ID": r.enrollment?.student?.studentId || `STU-${idx + 1}`,
            "Student Name": r.enrollment?.student ? `${r.enrollment.student.firstName} ${r.enrollment.student.lastName}` : `Student ${idx + 1}`,
            "Score": r.score,
            "Max Score": assessment.maxScore,
            "Status": r.score >= (assessment.passingScore || assessment.maxScore * 0.5) ? "PASSED" : "FAILED"
        }));

        return {
            id: assessment.id,
            title: assessment.title,
            fileName: isExcel ? metadata.fileName : `${assessment.title.replace(/\s+/g, "_")}.xlsx`,
            schoolGradeId: assessment.teachingAssignment?.schoolGradeId,
            gradeName: assessment.teachingAssignment?.schoolGrade?.grade?.name || "General",
            sectionId: assessment.teachingAssignment?.sectionId,
            sectionName: assessment.teachingAssignment?.section?.name ? `Section ${assessment.teachingAssignment.section.name}` : "All Sections",
            subjectId: assessment.teachingAssignment?.subjectId,
            subjectName: assessment.teachingAssignment?.subject?.name || "General Subject",
            subjectCode: assessment.teachingAssignment?.subject?.code || "",
            teacherName: assessment.teachingAssignment?.teacher ? `${assessment.teachingAssignment.teacher.firstName} ${assessment.teachingAssignment.teacher.lastName}` : "Faculty Member",
            submittedAt: assessment.createdAt,
            totalStudents: rows.length,
            averageScore: isExcel && metadata.summary?.averageScore !== undefined
                ? metadata.summary.averageScore
                : (assessment.results.length > 0 ? Math.round((assessment.results.reduce((acc, r) => acc + r.score, 0) / assessment.results.length) * 10) / 10 : 0),
            passRate: isExcel && metadata.summary?.passRate !== undefined
                ? metadata.summary.passRate
                : (assessment.results.length > 0 ? Math.round((assessment.results.filter(r => r.score >= (assessment.passingScore || assessment.maxScore * 0.5)).length / assessment.results.length) * 1000) / 10 : 0),
            maxScore: assessment.maxScore,
            passingScore: assessment.passingScore,
            columns,
            rows
        };
    }

    /**
     * Delete a result sheet.
     */
    static async deleteResultSheet(organizationId: string, sheetId: string) {
        const assessment = await prisma.assessment.findFirst({
            where: { id: sheetId, organizationId }
        });
        if (!assessment) throw new Error("Result sheet not found");

        await prisma.studentResult.deleteMany({
            where: { assessmentId: sheetId }
        });

        return prisma.assessment.delete({
            where: { id: sheetId }
        });
    }
}


