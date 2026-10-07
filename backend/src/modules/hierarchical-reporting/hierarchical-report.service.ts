import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";
import { HierarchyScopeService, AccessibleOrganizationScope, MinimalOrganizationUnit } from "../hierarchy/hierarchy-scope.service.js";
import ExcelJS from "exceljs";

export type ReportScopeMode = "CURRENT_AND_DESCENDANTS" | "CURRENT_ONLY";

export interface GenerateEducationSummaryInput {
    userId: string;
    targetOrganizationId?: string;
    scopeMode?: ReportScopeMode;
    academicYearId?: string;
}

export interface ReportMetricsSummary {
    regionsCount: number;
    zonesCount: number;
    woredasCount: number;
    schoolsCount: number;
    totalStudents: number;
    totalTeachers: number;
    gradesCount: number;
    sectionsCount: number;
}

export interface ReportBreakdownColumn {
    key: string;
    label: string;
    align?: "left" | "center" | "right";
    isNumeric?: boolean;
}

export interface ReportBreakdownRow {
    id: string;
    name: string;
    type?: OrganizationUnitType | string;
    parentName?: string;
    zonesCount?: number;
    woredasCount?: number;
    schoolsCount?: number;
    studentsCount?: number;
    teachersCount?: number;
    gradesCount?: number;
    sectionsCount?: number;
    status?: string;
    establishedYear?: number | string | null;
    [key: string]: any;
}

export interface EducationSummaryReportData {
    reportType: "EDUCATION_SUMMARY";
    title: string;
    generatedAt: string;
    generatedBy: {
        userId: string;
        organizationId: string;
        organizationName: string;
        organizationType: OrganizationUnitType;
    };
    targetOrganization: {
        id: string;
        name: string;
        type: OrganizationUnitType;
        parentId: string | null;
    };
    lineage: Array<{ id: string; name: string; type: OrganizationUnitType }>;
    scopeMode: ReportScopeMode;
    academicYear: {
        id: string;
        name: string;
        status: string;
    } | null;
    metrics: ReportMetricsSummary;
    breakdown: {
        level: "REGION" | "ZONE" | "WOREDA" | "SCHOOL" | "GRADE_SECTION";
        title: string;
        columns: ReportBreakdownColumn[];
        rows: ReportBreakdownRow[];
    };
}

export class HierarchicalReportService {
    /**
     * Resolves the user's authorized reporting scope and accessible organizations.
     */
    static async getReportingScope(userId: string) {
        if (!userId) {
            throw new Error("User ID is required to resolve reporting scope.");
        }

        const userScope: AccessibleOrganizationScope = await HierarchyScopeService.getAccessibleOrganizationScope(userId);
        
        // Fetch all organization units accessible to user
        const rawAccessibleUnits = await prisma.organizationUnit.findMany({
            where: {
                id: { in: userScope.accessibleOrganizationIds }
            },
            select: {
                id: true,
                name: true,
                type: true,
                parentId: true,
                parent: {
                    select: {
                        id: true,
                        name: true,
                        type: true
                    }
                }
            },
            orderBy: [
                { type: "asc" },
                { name: "asc" }
            ]
        });

        // Fetch academic years associated with accessible units
        const academicYears = await prisma.academicYear.findMany({
            where: {
                organizationId: { in: userScope.accessibleOrganizationIds }
            },
            select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
                organizationId: true
            },
            orderBy: {
                startDate: "desc"
            },
            take: 20
        });

        return {
            userScope: {
                userId: userScope.userId,
                currentOrganizationId: userScope.currentOrganizationId,
                currentOrganizationType: userScope.currentOrganizationType,
                currentOrganizationName: userScope.currentOrganization.name,
                lineage: userScope.lineage
            },
            accessibleOrganizations: rawAccessibleUnits.map(u => ({
                id: u.id,
                name: u.name,
                type: u.type,
                parentId: u.parentId,
                parentName: u.parent?.name || null
            })),
            academicYears: academicYears.map(ay => ({
                id: ay.id,
                name: ay.name,
                status: ay.status,
                startDate: ay.startDate,
                endDate: ay.endDate
            }))
        };
    }

    /**
     * Generates an authoritative Education Summary Report for the target organization.
     * Enforces HierarchyScopeService so users can never report outside their authorized hierarchy.
     */
    static async generateEducationSummary(input: GenerateEducationSummaryInput): Promise<EducationSummaryReportData> {
        const { userId, targetOrganizationId, scopeMode = "CURRENT_AND_DESCENDANTS", academicYearId } = input;

        // 1. Resolve user scope
        const userScope = await HierarchyScopeService.getAccessibleOrganizationScope(userId);

        const targetOrgId = targetOrganizationId || userScope.currentOrganizationId;

        // 2. Strict authorization check: target must be inside user's scope
        const isAllowed = await HierarchyScopeService.isOrganizationInScope(
            userScope.currentOrganizationId,
            targetOrgId
        );

        if (!isAllowed) {
            const error: any = new Error(`Unauthorized: Organization with ID '${targetOrgId}' is outside your authorized administrative hierarchy.`);
            error.statusCode = 403;
            throw error;
        }

        // 3. Fetch target organization details
        const targetOrg = await prisma.organizationUnit.findUnique({
            where: { id: targetOrgId },
            include: {
                schoolProfile: true,
                parent: {
                    select: { id: true, name: true, type: true }
                }
            }
        });

        if (!targetOrg) {
            const error: any = new Error(`Organization unit '${targetOrgId}' was not found.`);
            error.statusCode = 404;
            throw error;
        }

        // 4. Fetch lineage from target to root
        const lineage = await HierarchyScopeService.getLineage(targetOrg.id);

        // 5. Fetch academic year details if specified
        let academicYearInfo: { id: string; name: string; status: string } | null = null;
        if (academicYearId) {
            const ay = await prisma.academicYear.findUnique({
                where: { id: academicYearId },
                select: { id: true, name: true, status: true }
            });
            if (ay) {
                academicYearInfo = ay;
            }
        }

        // 6. Resolve accessible unit IDs and descendant school IDs for target
        let relevantUnitIds: string[] = [];
        let descendantSchoolIds: string[] = [];

        if (scopeMode === "CURRENT_ONLY") {
            relevantUnitIds = [targetOrg.id];
            descendantSchoolIds = targetOrg.type === "SCHOOL" ? [targetOrg.id] : [];
        } else {
            relevantUnitIds = await HierarchyScopeService.getAccessibleOrganizationIds(targetOrg.id, true);
            descendantSchoolIds = await HierarchyScopeService.getDescendantSchoolIds(targetOrg.id, targetOrg.type);
        }

        // 7. Load all relevant organization units in single query
        const allRelevantUnits = await prisma.organizationUnit.findMany({
            where: { id: { in: relevantUnitIds } },
            include: {
                schoolProfile: true
            }
        });

        const unitMap = new Map(allRelevantUnits.map(u => [u.id, u]));

        // Calculate unit counts
        let regionsCount = 0;
        let zonesCount = 0;
        let woredasCount = 0;
        let schoolsCount = 0;

        for (const u of allRelevantUnits) {
            if (u.type === "REGION") regionsCount++;
            else if (u.type === "ZONE") zonesCount++;
            else if (u.type === "WOREDA") woredasCount++;
            else if (u.type === "SCHOOL") schoolsCount++;
        }

        // 8. Calculate live counts for Students, Teachers, Grades, Sections
        let totalStudents = 0;
        let totalTeachers = 0;
        let gradesCount = 0;
        let sectionsCount = 0;

        if (descendantSchoolIds.length > 0) {
            // Count total active / enrolled students in descendant schools
            const enrollmentWhere: any = {
                organizationId: { in: descendantSchoolIds }
            };
            if (academicYearId) {
                enrollmentWhere.academicYearId = academicYearId;
            }

            const [enrolledCount, rawTeacherCount, rawGradesCount, rawSectionsCount] = await Promise.all([
                prisma.studentEnrollment.count({ where: enrollmentWhere }).catch(() => 0),
                prisma.teacher.count({ where: { organizationId: { in: descendantSchoolIds } } }).catch(() => 0),
                prisma.grade.count({ where: { organizationId: { in: descendantSchoolIds } } }).catch(() => 0),
                prisma.section.count({
                    where: {
                        schoolGrade: {
                            grade: {
                                organizationId: { in: descendantSchoolIds }
                            }
                        }
                    }
                }).catch(() => 0)
            ]);

            totalStudents = enrolledCount;
            totalTeachers = rawTeacherCount;
            gradesCount = rawGradesCount;
            sectionsCount = rawSectionsCount;

            // Fallback: If no enrollments exist in DB, check student count if school is direct
            if (totalStudents === 0) {
                const directStudentCount = await prisma.student.count().catch(() => 0);
                if (targetOrg.type === "FEDERAL" && directStudentCount > 0) {
                    totalStudents = directStudentCount;
                }
            }
        }

        // 9. Build breakdown rows and columns based on target organization level
        const breakdown = await this.buildBreakdownData(targetOrg, allRelevantUnits, descendantSchoolIds, academicYearId);

        const title = `${targetOrg.name} — Education Summary Report`;

        return {
            reportType: "EDUCATION_SUMMARY",
            title,
            generatedAt: new Date().toISOString(),
            generatedBy: {
                userId: userScope.userId,
                organizationId: userScope.currentOrganizationId,
                organizationName: userScope.currentOrganization.name,
                organizationType: userScope.currentOrganizationType
            },
            targetOrganization: {
                id: targetOrg.id,
                name: targetOrg.name,
                type: targetOrg.type,
                parentId: targetOrg.parentId
            },
            lineage: lineage.map(l => ({ id: l.id, name: l.name, type: l.type })),
            scopeMode,
            academicYear: academicYearInfo,
            metrics: {
                regionsCount,
                zonesCount,
                woredasCount,
                schoolsCount,
                totalStudents,
                totalTeachers,
                gradesCount,
                sectionsCount
            },
            breakdown
        };
    }

    /**
     * Builds hierarchical breakdown table according to the target unit's administrative tier.
     */
    private static async buildBreakdownData(
        targetOrg: { id: string; name: string; type: OrganizationUnitType },
        allRelevantUnits: Array<{ id: string; name: string; type: OrganizationUnitType; parentId: string | null; schoolProfile?: any }>,
        descendantSchoolIds: string[],
        academicYearId?: string
    ) {
        // Child units directly under targetOrg
        const directChildren = allRelevantUnits.filter(u => u.parentId === targetOrg.id);

        // Preload student and teacher counts grouped by school for fast aggregation
        const schoolStudentCounts = new Map<string, number>();
        const schoolTeacherCounts = new Map<string, number>();

        if (descendantSchoolIds.length > 0) {
            const enrollmentWhere: any = { organizationId: { in: descendantSchoolIds } };
            if (academicYearId) enrollmentWhere.academicYearId = academicYearId;

            const [enrollmentsByOrg, teachersByOrg] = await Promise.all([
                prisma.studentEnrollment.groupBy({
                    by: ["organizationId"],
                    _count: { id: true },
                    where: enrollmentWhere
                }).catch(() => [] as any[]),
                prisma.teacher.groupBy({
                    by: ["organizationId"],
                    _count: { id: true },
                    where: { organizationId: { in: descendantSchoolIds } }
                }).catch(() => [] as any[])
            ]);

            for (const item of enrollmentsByOrg) {
                schoolStudentCounts.set(item.organizationId, item._count.id);
            }
            for (const item of teachersByOrg) {
                schoolTeacherCounts.set(item.organizationId, item._count.id);
            }
        }

        // Helper to collect all descendant schools under a specific unit in memory
        const getUnitDescendantSchools = (unitId: string): string[] => {
            const schools: string[] = [];
            const queue: string[] = [unitId];
            const visited = new Set<string>([unitId]);

            while (queue.length > 0) {
                const curr = queue.shift()!;
                const children = allRelevantUnits.filter(u => u.parentId === curr);
                for (const child of children) {
                    if (!visited.has(child.id)) {
                        visited.add(child.id);
                        if (child.type === "SCHOOL") {
                            schools.push(child.id);
                        }
                        queue.push(child.id);
                    }
                }
            }
            return schools;
        };

        if (targetOrg.type === "FEDERAL") {
            // Breakdown by REGION
            const columns: ReportBreakdownColumn[] = [
                { key: "name", label: "Region Name", align: "left" },
                { key: "zonesCount", label: "Zones", align: "right", isNumeric: true },
                { key: "woredasCount", label: "Woredas", align: "right", isNumeric: true },
                { key: "schoolsCount", label: "Schools", align: "right", isNumeric: true },
                { key: "studentsCount", label: "Students", align: "right", isNumeric: true },
                { key: "teachersCount", label: "Teachers", align: "right", isNumeric: true }
            ];

            const rows: ReportBreakdownRow[] = directChildren.map(region => {
                const descendantSchools = getUnitDescendantSchools(region.id);
                
                // Count zones and woredas under this region
                const zones = allRelevantUnits.filter(u => u.parentId === region.id && u.type === "ZONE");
                let woredasCount = 0;
                for (const z of zones) {
                    woredasCount += allRelevantUnits.filter(u => u.parentId === z.id && u.type === "WOREDA").length;
                }

                let studentsCount = 0;
                let teachersCount = 0;
                for (const schId of descendantSchools) {
                    studentsCount += schoolStudentCounts.get(schId) || 0;
                    teachersCount += schoolTeacherCounts.get(schId) || 0;
                }

                return {
                    id: region.id,
                    name: region.name,
                    type: region.type,
                    zonesCount: zones.length,
                    woredasCount,
                    schoolsCount: descendantSchools.length,
                    studentsCount,
                    teachersCount
                };
            });

            return {
                level: "REGION" as const,
                title: "Regional Distribution & Aggregates",
                columns,
                rows
            };
        }

        if (targetOrg.type === "REGION") {
            // Breakdown by ZONE
            const columns: ReportBreakdownColumn[] = [
                { key: "name", label: "Zone Name", align: "left" },
                { key: "woredasCount", label: "Woredas", align: "right", isNumeric: true },
                { key: "schoolsCount", label: "Schools", align: "right", isNumeric: true },
                { key: "studentsCount", label: "Students", align: "right", isNumeric: true },
                { key: "teachersCount", label: "Teachers", align: "right", isNumeric: true }
            ];

            const rows: ReportBreakdownRow[] = directChildren.map(zone => {
                const descendantSchools = getUnitDescendantSchools(zone.id);
                const woredas = allRelevantUnits.filter(u => u.parentId === zone.id && u.type === "WOREDA");

                let studentsCount = 0;
                let teachersCount = 0;
                for (const schId of descendantSchools) {
                    studentsCount += schoolStudentCounts.get(schId) || 0;
                    teachersCount += schoolTeacherCounts.get(schId) || 0;
                }

                return {
                    id: zone.id,
                    name: zone.name,
                    type: zone.type,
                    woredasCount: woredas.length,
                    schoolsCount: descendantSchools.length,
                    studentsCount,
                    teachersCount
                };
            });

            return {
                level: "ZONE" as const,
                title: "Zonal Distribution & Aggregates",
                columns,
                rows
            };
        }

        if (targetOrg.type === "ZONE") {
            // Breakdown by WOREDA
            const columns: ReportBreakdownColumn[] = [
                { key: "name", label: "Woreda Name", align: "left" },
                { key: "schoolsCount", label: "Schools", align: "right", isNumeric: true },
                { key: "studentsCount", label: "Students", align: "right", isNumeric: true },
                { key: "teachersCount", label: "Teachers", align: "right", isNumeric: true }
            ];

            const rows: ReportBreakdownRow[] = directChildren.map(woreda => {
                const descendantSchools = getUnitDescendantSchools(woreda.id);

                let studentsCount = 0;
                let teachersCount = 0;
                for (const schId of descendantSchools) {
                    studentsCount += schoolStudentCounts.get(schId) || 0;
                    teachersCount += schoolTeacherCounts.get(schId) || 0;
                }

                return {
                    id: woreda.id,
                    name: woreda.name,
                    type: woreda.type,
                    schoolsCount: descendantSchools.length,
                    studentsCount,
                    teachersCount
                };
            });

            return {
                level: "WOREDA" as const,
                title: "Woreda Distribution & Aggregates",
                columns,
                rows
            };
        }

        if (targetOrg.type === "WOREDA") {
            // Breakdown by SCHOOL
            const columns: ReportBreakdownColumn[] = [
                { key: "name", label: "School Name", align: "left" },
                { key: "status", label: "Status", align: "center" },
                { key: "establishedYear", label: "Established", align: "center" },
                { key: "studentsCount", label: "Enrolled Students", align: "right", isNumeric: true },
                { key: "teachersCount", label: "Teachers", align: "right", isNumeric: true }
            ];

            const rows: ReportBreakdownRow[] = directChildren.map(school => {
                const studentsCount = schoolStudentCounts.get(school.id) || 0;
                const teachersCount = schoolTeacherCounts.get(school.id) || 0;
                const status = school.schoolProfile?.status || "ACTIVE";
                const establishedYear = school.schoolProfile?.establishedYear || "—";

                return {
                    id: school.id,
                    name: school.name,
                    type: school.type,
                    status,
                    establishedYear,
                    studentsCount,
                    teachersCount
                };
            });

            return {
                level: "SCHOOL" as const,
                title: "Schools Directory & Operational Status",
                columns,
                rows
            };
        }

        // If targetOrg.type === "SCHOOL"
        const schoolGrades = await prisma.grade.findMany({
            where: { organizationId: targetOrg.id },
            include: {
                schoolGrades: {
                    include: {
                        sections: {
                            include: {
                                homeroomTeacher: true
                            }
                        },
                        studentEnrollments: true
                    }
                }
            },
            orderBy: { level: "asc" }
        }).catch(() => [] as any[]) || [];

        const columns: ReportBreakdownColumn[] = [
            { key: "gradeName", label: "Grade", align: "left" },
            { key: "level", label: "Level", align: "center", isNumeric: true },
            { key: "sectionsCount", label: "Sections", align: "right", isNumeric: true },
            { key: "studentsCount", label: "Enrolled Students", align: "right", isNumeric: true }
        ];

        const rows: ReportBreakdownRow[] = (schoolGrades || []).map(g => {
            let totalGradeStudents = 0;
            let sectionsTotal = 0;

            for (const sg of (g.schoolGrades || [])) {
                sectionsTotal += (sg.sections || []).length;
                totalGradeStudents += (sg.studentEnrollments || []).length;
            }

            return {
                id: g.id,
                name: g.name,
                gradeName: g.name,
                level: g.level,
                sectionsCount: sectionsTotal,
                studentsCount: totalGradeStudents
            };
        });

        return {
            level: "GRADE_SECTION" as const,
            title: "Grade & Section Enrollment Breakdown",
            columns,
            rows
        };
    }

    /**
     * Generates CSV format string with standard RFC 4180 escaping and UTF-8 BOM,
     * containing all detailed metadata, aggregate metrics, and full hierarchy breakdown with totals.
     */
    static generateCsvExport(report: EducationSummaryReportData): string {
        const lines: string[] = [];

        // Escape CSV field helper (RFC 4180)
        const escapeCsv = (val: any): string => {
            if (val === null || val === undefined) return '""';
            const str = String(val);
            if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return `"${str}"`;
        };

        // 1. Header Title & Subtitle Banner
        lines.push(`"EduBridge — National Education Management Information System"`);
        lines.push(`"AUTHORITATIVE HIERARCHICAL REPORT • ${report.title.toUpperCase()}"`);
        lines.push("");

        // 2. Report Information / Metadata Block
        lines.push(`"REPORT INFORMATION"`);
        lines.push(`"Target Administrative Scope:",${escapeCsv(`${report.targetOrganization.name} [${report.targetOrganization.type}]`)}`);
        lines.push(`"Hierarchical Depth Mode:",${escapeCsv(report.scopeMode === "CURRENT_AND_DESCENDANTS" ? "Target Organization & All Descendants" : "Target Organization Only")}`);
        lines.push(`"Academic Year:",${escapeCsv(report.academicYear ? `${report.academicYear.name} (${report.academicYear.status})` : "All Active Academic Years")}`);
        lines.push(`"Report Generated At:",${escapeCsv(new Date(report.generatedAt).toLocaleString())}`);
        lines.push("");

        // 3. Aggregate System Metrics Summary Block
        lines.push(`"KEY AGGREGATE SYSTEM METRICS"`);
        if (report.metrics.regionsCount > 0) lines.push(`"Total Regional Bureaus",${report.metrics.regionsCount}`);
        if (report.metrics.zonesCount > 0) lines.push(`"Total Administrative Zones",${report.metrics.zonesCount}`);
        if (report.metrics.woredasCount > 0) lines.push(`"Total Woreda Offices",${report.metrics.woredasCount}`);
        lines.push(`"Total Operating Schools",${report.metrics.schoolsCount}`);
        lines.push(`"Total Enrolled Students",${report.metrics.totalStudents}`);
        lines.push(`"Total Appointed Teachers",${report.metrics.totalTeachers}`);
        if (report.metrics.gradesCount > 0) lines.push(`"Total Academic Grades",${report.metrics.gradesCount}`);
        if (report.metrics.sectionsCount > 0) lines.push(`"Total Class Sections",${report.metrics.sectionsCount}`);
        lines.push("");

        // 4. Breakdown Table Header Section
        lines.push(escapeCsv(report.breakdown.title.toUpperCase()));
        
        // Table Columns Header Row
        const headerRow = report.breakdown.columns.map(col => escapeCsv(col.label)).join(",");
        lines.push(headerRow);

        // Data Rows & Totals Calculation
        const columnTotals = new Map<string, number>();

        for (const row of report.breakdown.rows) {
            const dataRow = report.breakdown.columns.map(col => {
                const val = row[col.key];
                if (col.isNumeric && typeof val === "number") {
                    const prev = columnTotals.get(col.key) || 0;
                    columnTotals.set(col.key, prev + val);
                    return val;
                }
                return escapeCsv(val !== undefined && val !== null ? val : "—");
            }).join(",");
            lines.push(dataRow);
        }

        // 5. Total / Hierarchy Aggregate Row
        if (report.breakdown.rows.length > 0) {
            const totalRow = report.breakdown.columns.map((col, colIdx) => {
                if (colIdx === 0) {
                    return escapeCsv("TOTAL / HIERARCHY AGGREGATE");
                }
                if (col.isNumeric && columnTotals.has(col.key)) {
                    return columnTotals.get(col.key);
                }
                return '""';
            }).join(",");
            lines.push(totalRow);
        }

        // Return UTF-8 BOM + CRLF CSV string
        return "\uFEFF" + lines.join("\r\n");
    }

    /**
     * Generates a beautifully styled, executive-grade Excel workbook (.xlsx) using ExcelJS.
     */
    static async generateExcelExport(report: EducationSummaryReportData): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "EduBridge National EMIS Platform";
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet("Education Summary", {
            views: [{ showGridLines: true }]
        });

        // Determine column count from breakdown columns (minimum 6 columns for balanced layout)
        const totalCols = Math.max(report.breakdown.columns.length, 6);
        const lastColLetter = String.fromCharCode(64 + totalCols); // 'F', 'G', etc.

        // Set predefined, balanced column widths
        const colWidths = [32, 16, 16, 16, 18, 18, 18, 18];
        for (let i = 1; i <= totalCols; i++) {
            worksheet.getColumn(i).width = colWidths[i - 1] || 18;
        }

        // Color Palette (Official Deep Navy & Indigo Executive Theme)
        const NAVY_HEADER_BG = "FF0F2942";
        const ACCENT_BLUE_BG = "FF1E40AF";
        const LIGHT_BLUE_BG = "FFEBF5FF";
        const CARD_BG = "FFF8FAFC";
        const BORDER_COLOR = "FFCBD5E1";
        const TEXT_DARK = "FF0F172A";
        const TEXT_MUTED = "FF475569";
        const TEXT_WHITE = "FFFFFFFF";

        const thinBorder: Partial<ExcelJS.Borders> = {
            top: { style: "thin", color: { argb: BORDER_COLOR } },
            left: { style: "thin", color: { argb: BORDER_COLOR } },
            bottom: { style: "thin", color: { argb: BORDER_COLOR } },
            right: { style: "thin", color: { argb: BORDER_COLOR } }
        };

        const totalRowBorder: Partial<ExcelJS.Borders> = {
            top: { style: "thin", color: { argb: "FF94A3B8" } },
            left: { style: "thin", color: { argb: BORDER_COLOR } },
            bottom: { style: "double", color: { argb: "FF0F172A" } },
            right: { style: "thin", color: { argb: BORDER_COLOR } }
        };

        // 1. Title Banner
        worksheet.mergeCells(`A1:${lastColLetter}1`);
        const titleCell = worksheet.getCell("A1");
        titleCell.value = "EduBridge — National Education Management Information System";
        titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: TEXT_WHITE } };
        titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER_BG } };
        titleCell.alignment = { vertical: "middle", horizontal: "center" };
        worksheet.getRow(1).height = 34;

        // 1B. Sub-title Banner
        worksheet.mergeCells(`A2:${lastColLetter}2`);
        const subTitleCell = worksheet.getCell("A2");
        subTitleCell.value = `AUTHORITATIVE HIERARCHICAL REPORT • ${report.title.toUpperCase()}`;
        subTitleCell.font = { name: "Calibri", size: 9, bold: true, color: { argb: "FF93C5FD" } };
        subTitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } };
        subTitleCell.alignment = { vertical: "middle", horizontal: "center" };
        worksheet.getRow(2).height = 20;

        worksheet.addRow([]); // Row 3 empty

        // 2. Executive Metadata Box (Rows 4 to 8)
        worksheet.mergeCells("A4:B4");
        worksheet.mergeCells(`C4:${lastColLetter}4`);
        worksheet.getCell("A4").value = "REPORT INFORMATION";
        worksheet.getCell("A4").font = { bold: true, size: 10, color: { argb: TEXT_WHITE } };
        worksheet.getCell("A4").fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_BLUE_BG } };
        worksheet.getCell(`C4`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_BLUE_BG } };
        worksheet.getRow(4).height = 22;

        const metaEntries = [
            ["Target Administrative Scope:", `${report.targetOrganization.name} [${report.targetOrganization.type}]`],
            ["Hierarchical Depth Mode:", report.scopeMode === "CURRENT_AND_DESCENDANTS" ? "Target Organization & All Descendants" : "Target Organization Only"],
            ["Academic Year:", report.academicYear ? `${report.academicYear.name} (${report.academicYear.status})` : "All Active Academic Years"],
            ["Report Generated At:", new Date(report.generatedAt).toLocaleString()]
        ];

        let currentMetaRow = 5;
        for (const [label, val] of metaEntries) {
            worksheet.mergeCells(`A${currentMetaRow}:B${currentMetaRow}`);
            worksheet.mergeCells(`C${currentMetaRow}:${lastColLetter}${currentMetaRow}`);

            const lblCell = worksheet.getCell(`A${currentMetaRow}`);
            lblCell.value = label;
            lblCell.font = { bold: true, size: 9, color: { argb: TEXT_MUTED } };
            lblCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CARD_BG } };
            lblCell.border = thinBorder;

            const valCell = worksheet.getCell(`C${currentMetaRow}`);
            valCell.value = val;
            valCell.font = { bold: true, size: 9, color: { argb: TEXT_DARK } };
            valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CARD_BG } };
            valCell.border = thinBorder;

            worksheet.getRow(currentMetaRow).height = 20;
            currentMetaRow++;
        }

        worksheet.addRow([]); // Row 9 empty

        // 3. Aggregate Metrics Summary (2-column executive table)
        const metricHeaderRowIndex = currentMetaRow + 1;
        worksheet.mergeCells(`A${metricHeaderRowIndex}:B${metricHeaderRowIndex}`);
        worksheet.getCell(`A${metricHeaderRowIndex}`).value = "KEY AGGREGATE SYSTEM METRICS";
        worksheet.getCell(`A${metricHeaderRowIndex}`).font = { bold: true, size: 10, color: { argb: TEXT_WHITE } };
        worksheet.getCell(`A${metricHeaderRowIndex}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT_BLUE_BG } };
        worksheet.getCell(`A${metricHeaderRowIndex}`).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        worksheet.getRow(metricHeaderRowIndex).height = 22;

        const metricsData = [
            ...(report.metrics.regionsCount > 0 ? [["Total Regional Bureaus", report.metrics.regionsCount]] : []),
            ...(report.metrics.zonesCount > 0 ? [["Total Administrative Zones", report.metrics.zonesCount]] : []),
            ...(report.metrics.woredasCount > 0 ? [["Total Woreda Offices", report.metrics.woredasCount]] : []),
            ["Total Operating Schools", report.metrics.schoolsCount],
            ["Total Enrolled Students", report.metrics.totalStudents],
            ["Total Appointed Teachers", report.metrics.totalTeachers],
            ...(report.metrics.gradesCount > 0 ? [["Total Academic Grades", report.metrics.gradesCount]] : []),
            ...(report.metrics.sectionsCount > 0 ? [["Total Class Sections", report.metrics.sectionsCount]] : [])
        ];

        let metricRowIndex = metricHeaderRowIndex + 1;
        for (const [mLabel, mVal] of metricsData) {
            const mRow = worksheet.getRow(metricRowIndex);
            
            const cellA = mRow.getCell(1);
            cellA.value = mLabel;
            cellA.font = { size: 9, color: { argb: TEXT_DARK } };
            cellA.border = thinBorder;
            cellA.fill = { type: "pattern", pattern: "solid", fgColor: { argb: metricRowIndex % 2 === 0 ? CARD_BG : "FFFFFFFF" } };

            const cellB = mRow.getCell(2);
            cellB.value = mVal;
            cellB.numFmt = "#,##0";
            cellB.font = { bold: true, size: 10, color: { argb: ACCENT_BLUE_BG } };
            cellB.alignment = { horizontal: "right" };
            cellB.border = thinBorder;
            cellB.fill = { type: "pattern", pattern: "solid", fgColor: { argb: metricRowIndex % 2 === 0 ? CARD_BG : "FFFFFFFF" } };

            mRow.height = 20;
            metricRowIndex++;
        }

        worksheet.addRow([]); // Empty row before breakdown table

        // 4. Breakdown Table Header Section
        const breakdownSectionRowIndex = metricRowIndex + 1;
        worksheet.mergeCells(`A${breakdownSectionRowIndex}:${lastColLetter}${breakdownSectionRowIndex}`);
        const secHeaderCell = worksheet.getCell(`A${breakdownSectionRowIndex}`);
        secHeaderCell.value = report.breakdown.title.toUpperCase();
        secHeaderCell.font = { bold: true, size: 11, color: { argb: NAVY_HEADER_BG } };
        secHeaderCell.alignment = { vertical: "middle" };
        worksheet.getRow(breakdownSectionRowIndex).height = 24;

        // Column Headers
        const tableHeaderRowIndex = breakdownSectionRowIndex + 1;
        const bHeaderRow = worksheet.getRow(tableHeaderRowIndex);
        report.breakdown.columns.forEach((col, idx) => {
            const cell = bHeaderRow.getCell(idx + 1);
            cell.value = col.label;
            cell.font = { bold: true, size: 10, color: { argb: TEXT_WHITE } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_HEADER_BG } };
            cell.alignment = {
                vertical: "middle",
                horizontal: col.align || (col.isNumeric ? "right" : "left")
            };
            cell.border = thinBorder;
        });
        bHeaderRow.height = 26;

        // Data Rows
        let dataRowIndex = tableHeaderRowIndex + 1;
        const columnTotals = new Map<string, number>();

        report.breakdown.rows.forEach((rowObj, idx) => {
            const dataRow = worksheet.getRow(dataRowIndex);
            const isStripe = idx % 2 === 0;
            const rowBg = isStripe ? CARD_BG : "FFFFFFFF";

            report.breakdown.columns.forEach((col, colIdx) => {
                const cell = dataRow.getCell(colIdx + 1);
                const rawVal = rowObj[col.key];

                if (col.isNumeric && typeof rawVal === "number") {
                    cell.value = rawVal;
                    cell.numFmt = "#,##0";
                    // Accumulate totals
                    const prev = columnTotals.get(col.key) || 0;
                    columnTotals.set(col.key, prev + rawVal);
                } else {
                    cell.value = rawVal !== undefined && rawVal !== null ? rawVal : "—";
                }

                cell.font = {
                    name: "Calibri",
                    size: 9,
                    bold: colIdx === 0, // bold primary name
                    color: { argb: TEXT_DARK }
                };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
                cell.alignment = {
                    vertical: "middle",
                    horizontal: col.align || (col.isNumeric ? "right" : "left")
                };
                cell.border = thinBorder;
            });

            dataRow.height = 22;
            dataRowIndex++;
        });

        // 5. Total / Summary Aggregate Row
        if (report.breakdown.rows.length > 0) {
            const totalRow = worksheet.getRow(dataRowIndex);
            report.breakdown.columns.forEach((col, colIdx) => {
                const cell = totalRow.getCell(colIdx + 1);
                if (colIdx === 0) {
                    cell.value = "TOTAL / HIERARCHY AGGREGATE";
                    cell.font = { bold: true, size: 10, color: { argb: NAVY_HEADER_BG } };
                    cell.alignment = { vertical: "middle", horizontal: "left" };
                } else if (col.isNumeric && columnTotals.has(col.key)) {
                    cell.value = columnTotals.get(col.key);
                    cell.numFmt = "#,##0";
                    cell.font = { bold: true, size: 10, color: { argb: ACCENT_BLUE_BG } };
                    cell.alignment = { vertical: "middle", horizontal: "right" };
                } else {
                    cell.value = "";
                }
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LIGHT_BLUE_BG } };
                cell.border = totalRowBorder;
            });
            totalRow.height = 24;
        }

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}
