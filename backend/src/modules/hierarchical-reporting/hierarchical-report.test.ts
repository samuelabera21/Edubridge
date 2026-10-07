import { describe, it, expect, vi, beforeEach } from "vitest";
import { HierarchicalReportService } from "./hierarchical-report.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";

// Mock prisma client
vi.mock("../../infrastructure/prisma/client.js", () => {
    const mockPrisma = {
        organizationUnit: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            count: vi.fn()
        },
        roleAssignment: {
            findMany: vi.fn()
        },
        studentEnrollment: {
            count: vi.fn(),
            groupBy: vi.fn(),
            findMany: vi.fn()
        },
        student: {
            count: vi.fn()
        },
        teacher: {
            count: vi.fn(),
            groupBy: vi.fn()
        },
        grade: {
            count: vi.fn(),
            findMany: vi.fn()
        },
        section: {
            count: vi.fn()
        },
        academicYear: {
            findMany: vi.fn(),
            findUnique: vi.fn()
        }
    };
    return { prisma: mockPrisma };
});

describe("H6: Hierarchical Reports & Export Service", () => {
    // Standard mock hierarchy:
    // Federal (fed-1)
    //   -> Amhara Region (reg-amhara)
    //        -> South Gondar Zone (zone-gondar)
    //             -> Debre Tabor Woreda (wor-tabor)
    //                  -> Tabor Secondary School (sch-tabor)
    //   -> Oromia Region (reg-oromia)
    //        -> Jimma Zone (zone-jimma)
    //             -> Jimma Town Woreda (wor-jimma)
    //                  -> Jimma Secondary School (sch-jimma)

    const mockHierarchyUnits = [
        { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" as OrganizationUnitType, parentId: null, schoolProfile: null },
        { id: "reg-amhara", name: "Amhara Region Education Bureau", type: "REGION" as OrganizationUnitType, parentId: "fed-1", schoolProfile: null },
        { id: "zone-gondar", name: "South Gondar Zone Department", type: "ZONE" as OrganizationUnitType, parentId: "reg-amhara", schoolProfile: null },
        { id: "wor-tabor", name: "Debre Tabor Woreda Office", type: "WOREDA" as OrganizationUnitType, parentId: "zone-gondar", schoolProfile: null },
        { id: "sch-tabor", name: "Tabor Secondary School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-tabor", schoolProfile: { status: "ACTIVE", establishedYear: 1995 } },
        { id: "reg-oromia", name: "Oromia Education Bureau", type: "REGION" as OrganizationUnitType, parentId: "fed-1", schoolProfile: null },
        { id: "zone-jimma", name: "Jimma Zone Department", type: "ZONE" as OrganizationUnitType, parentId: "reg-oromia", schoolProfile: null },
        { id: "wor-jimma", name: "Jimma Town Woreda Office", type: "WOREDA" as OrganizationUnitType, parentId: "zone-jimma", schoolProfile: null },
        { id: "sch-jimma", name: "Jimma Secondary School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-jimma", schoolProfile: { status: "ACTIVE", establishedYear: 2002 } }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock for organizationUnit.findMany (hierarchy graph resolution)
        (prisma.organizationUnit.findMany as any).mockImplementation((args: any) => {
            if (args?.where?.id?.in) {
                const requestedIds = args.where.id.in;
                return Promise.resolve(mockHierarchyUnits.filter(u => requestedIds.includes(u.id)));
            }
            return Promise.resolve(mockHierarchyUnits);
        });

        (prisma.organizationUnit.findUnique as any).mockImplementation((args: any) => {
            const unit = mockHierarchyUnits.find(u => u.id === args.where.id);
            return Promise.resolve(unit || null);
        });

        (prisma.academicYear.findMany as any).mockResolvedValue([
            { id: "ay-2026", name: "2026 Academic Year", status: "ACTIVE", startDate: new Date("2026-09-01"), endDate: new Date("2027-06-30") }
        ]);

        (prisma.studentEnrollment.count as any).mockResolvedValue(1250);
        (prisma.teacher.count as any).mockResolvedValue(48);
        (prisma.grade.count as any).mockResolvedValue(4);
        (prisma.grade.findMany as any).mockResolvedValue([
            {
                id: "gr-9",
                name: "Grade 9",
                level: 9,
                schoolGrades: [
                    {
                        sections: [{ id: "sec-9a", name: "9A" }, { id: "sec-9b", name: "9B" }],
                        studentEnrollments: new Array(120).fill({ id: "enr" })
                    }
                ]
            }
        ]);
        (prisma.section.count as any).mockResolvedValue(12);

        (prisma.studentEnrollment.groupBy as any).mockResolvedValue([
            { organizationId: "sch-tabor", _count: { id: 750 } },
            { organizationId: "sch-jimma", _count: { id: 500 } }
        ]);

        (prisma.teacher.groupBy as any).mockResolvedValue([
            { organizationId: "sch-tabor", _count: { id: 30 } },
            { organizationId: "sch-jimma", _count: { id: 18 } }
        ]);
    });

    describe("1. Scope Resolution & Multi-Tier Reporting Authorization", () => {
        it("Federal user can report on Federal root and all descendants nationwide", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    userId: "user-fed-1",
                    role: { name: "FEDERAL_ADMIN" },
                    scope: mockHierarchyUnits[0] // fed-1
                }
            ]);

            const report = await HierarchicalReportService.generateEducationSummary({
                userId: "user-fed-1",
                targetOrganizationId: "fed-1"
            });

            expect(report.targetOrganization.id).toBe("fed-1");
            expect(report.targetOrganization.type).toBe("FEDERAL");
            expect(report.metrics.regionsCount).toBe(2);
            expect(report.metrics.zonesCount).toBe(2);
            expect(report.metrics.woredasCount).toBe(2);
            expect(report.metrics.schoolsCount).toBe(2);
            expect(report.breakdown.level).toBe("REGION");
            expect(report.breakdown.rows).toHaveLength(2); // Amhara & Oromia
        });

        it("Federal user can drill down and generate report for a specific descendant Region (Amhara)", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    userId: "user-fed-1",
                    role: { name: "FEDERAL_ADMIN" },
                    scope: mockHierarchyUnits[0] // fed-1
                }
            ]);

            const report = await HierarchicalReportService.generateEducationSummary({
                userId: "user-fed-1",
                targetOrganizationId: "reg-amhara"
            });

            expect(report.targetOrganization.id).toBe("reg-amhara");
            expect(report.targetOrganization.type).toBe("REGION");
            expect(report.breakdown.level).toBe("ZONE");
            expect(report.breakdown.rows).toHaveLength(1); // South Gondar
            expect(report.breakdown.rows[0]!.name).toBe("South Gondar Zone Department");
        });

        it("Regional user can generate report within their own Region", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    userId: "user-reg-amhara",
                    role: { name: "REGIONAL_ADMIN" },
                    scope: mockHierarchyUnits[1] // reg-amhara
                }
            ]);

            const report = await HierarchicalReportService.generateEducationSummary({
                userId: "user-reg-amhara",
                targetOrganizationId: "reg-amhara"
            });

            expect(report.targetOrganization.id).toBe("reg-amhara");
            expect(report.metrics.schoolsCount).toBe(1); // sch-tabor
            expect(report.breakdown.level).toBe("ZONE");
        });

        it("Regional user is REJECTED (403 Forbidden) when attempting to report on Federal root or another Region", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    userId: "user-reg-amhara",
                    role: { name: "REGIONAL_ADMIN" },
                    scope: mockHierarchyUnits[1] // reg-amhara
                }
            ]);

            // Attempt to access Federal root
            await expect(
                HierarchicalReportService.generateEducationSummary({
                    userId: "user-reg-amhara",
                    targetOrganizationId: "fed-1"
                })
            ).rejects.toThrow(/outside your authorized administrative hierarchy/);

            // Attempt to access Oromia Region
            await expect(
                HierarchicalReportService.generateEducationSummary({
                    userId: "user-reg-amhara",
                    targetOrganizationId: "reg-oromia"
                })
            ).rejects.toThrow(/outside your authorized administrative hierarchy/);
        });

        it("Zone / Woreda users are strictly isolated to their own administrative branch", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    userId: "user-zone-gondar",
                    role: { name: "ZONE_ADMIN" },
                    scope: mockHierarchyUnits[2] // zone-gondar
                }
            ]);

            // Allowed: Report on own Zone
            const zoneReport = await HierarchicalReportService.generateEducationSummary({
                userId: "user-zone-gondar",
                targetOrganizationId: "zone-gondar"
            });
            expect(zoneReport.targetOrganization.id).toBe("zone-gondar");
            expect(zoneReport.breakdown.level).toBe("WOREDA");

            // Forbidden: Attempt to report on Jimma Zone (different branch)
            await expect(
                HierarchicalReportService.generateEducationSummary({
                    userId: "user-zone-gondar",
                    targetOrganizationId: "zone-jimma"
                })
            ).rejects.toThrow(/outside your authorized administrative hierarchy/);
        });

        it("School user cannot report on another school or parent levels", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    userId: "user-sch-tabor",
                    role: { name: "SCHOOL_ADMIN" },
                    scope: mockHierarchyUnits[4] // sch-tabor
                }
            ]);

            // Allowed: Report on own School
            const schoolReport = await HierarchicalReportService.generateEducationSummary({
                userId: "user-sch-tabor",
                targetOrganizationId: "sch-tabor"
            });
            expect(schoolReport.targetOrganization.id).toBe("sch-tabor");
            expect(schoolReport.breakdown.level).toBe("GRADE_SECTION");

            // Forbidden: Attempt to report on Jimma School
            await expect(
                HierarchicalReportService.generateEducationSummary({
                    userId: "user-sch-tabor",
                    targetOrganizationId: "sch-jimma"
                })
            ).rejects.toThrow(/outside your authorized administrative hierarchy/);

            // Forbidden: Attempt to report on parent Woreda
            await expect(
                HierarchicalReportService.generateEducationSummary({
                    userId: "user-sch-tabor",
                    targetOrganizationId: "wor-tabor"
                })
            ).rejects.toThrow(/outside your authorized administrative hierarchy/);
        });
    });

    describe("2. Scope Mode Filtering", () => {
        it("CURRENT_ONLY mode restricts report scope strictly to the selected unit", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    userId: "user-fed-1",
                    role: { name: "FEDERAL_ADMIN" },
                    scope: mockHierarchyUnits[0]
                }
            ]);

            const report = await HierarchicalReportService.generateEducationSummary({
                userId: "user-fed-1",
                targetOrganizationId: "fed-1",
                scopeMode: "CURRENT_ONLY"
            });

            expect(report.scopeMode).toBe("CURRENT_ONLY");
            expect(report.metrics.regionsCount).toBe(0);
            expect(report.metrics.schoolsCount).toBe(0);
        });
    });

    describe("3. CSV and Excel Exports", () => {
        it("generates well-formatted CSV with metadata, metrics summary, and breakdown table", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    userId: "user-fed-1",
                    role: { name: "FEDERAL_ADMIN" },
                    scope: mockHierarchyUnits[0]
                }
            ]);

            const report = await HierarchicalReportService.generateEducationSummary({
                userId: "user-fed-1",
                targetOrganizationId: "fed-1"
            });

            const csvString = HierarchicalReportService.generateCsvExport(report);

            expect(csvString).toContain("EduBridge — National Education Management Information System");
            expect(csvString).toContain("AUTHORITATIVE HIERARCHICAL REPORT");
            expect(csvString).toContain("REPORT INFORMATION");
            expect(csvString).toContain("Target Administrative Scope:");
            expect(csvString).toContain("Federal Ministry of Education [FEDERAL]");
            expect(csvString).toContain("KEY AGGREGATE SYSTEM METRICS");
            expect(csvString).toContain("Total Operating Schools");
            expect(csvString).toContain("REGIONAL DISTRIBUTION & AGGREGATES");
            expect(csvString).toContain("Amhara Region Education Bureau");
            expect(csvString).toContain("Oromia Education Bureau");
            expect(csvString).toContain("TOTAL / HIERARCHY AGGREGATE");
        });

        it("generates valid Excel (.xlsx) buffer with workbook sheets and styled tables", async () => {
            (prisma.roleAssignment.findMany as any).mockResolvedValue([
                {
                    userId: "user-fed-1",
                    role: { name: "FEDERAL_ADMIN" },
                    scope: mockHierarchyUnits[0]
                }
            ]);

            const report = await HierarchicalReportService.generateEducationSummary({
                userId: "user-fed-1",
                targetOrganizationId: "fed-1"
            });

            const excelBuffer = await HierarchicalReportService.generateExcelExport(report);

            expect(excelBuffer).toBeInstanceOf(Buffer);
            expect(excelBuffer.length).toBeGreaterThan(1000);
            // Check PK zip header signature for valid xlsx binary
            expect(excelBuffer[0]).toBe(0x50); // 'P'
            expect(excelBuffer[1]).toBe(0x4B); // 'K'
        });
    });
});
