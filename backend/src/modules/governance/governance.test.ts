import { describe, it, expect, vi, beforeEach } from "vitest";
import { GovernanceDashboardService } from "./governance.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import { OrganizationUnitType } from "../../generated/prisma/client.js";
import { HierarchyScopeService } from "../hierarchy/hierarchy-scope.service.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        organizationUnit: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
        },
        academicYear: {
            findMany: vi.fn(),
        },
        studentEnrollment: {
            findMany: vi.fn(),
        },
        teacher: {
            findMany: vi.fn(),
        },
        studentAttendance: {
            findMany: vi.fn(),
        },
        studentResult: {
            findMany: vi.fn(),
        },
    },
}));

vi.mock("../hierarchy/hierarchy-scope.service.js", () => ({
    HierarchyScopeService: {
        getAccessibleOrganizationScope: vi.fn(),
        getLineage: vi.fn(),
        getDescendantSchoolIds: vi.fn(),
    },
}));

describe("GovernanceDashboardService (H3 Governance Dashboard Foundation)", () => {
    // Canonical 2-branch national test hierarchy fixture:
    //
    // FEDERAL (fed-1)
    //  ├── REGION A (reg-a)
    //  │    └── ZONE A1 (zone-a1)
    //  │         └── WOREDA A1a (wor-a1a)
    //  │              ├── SCHOOL A1a-1 (sch-a1a1) [Active Year: ay-sch1, 100 students, 10 teachers]
    //  │              └── SCHOOL A1a-2 (sch-a1a2) [Active Year: ay-sch2, 50 students, 5 teachers]
    //  │         └── WOREDA A1b (wor-a1b) [empty, 0 schools]
    //  └── REGION B (reg-b)
    //       └── ZONE B1 (zone-b1)
    //            └── WOREDA B1a (wor-b1a)
    //                 └── SCHOOL B1a-1 (sch-b1a1) [Active Year: ay-sch3, 80 students, 8 teachers]

    const mockAllUnits = [
        { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" as OrganizationUnitType, parentId: null },
        { id: "reg-a", name: "Addis Ababa Region", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-a1", name: "Central Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-a" },
        { id: "wor-a1a", name: "Kirkos Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-a1" },
        { id: "sch-a1a1", name: "Kirkos Primary School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1a" },
        { id: "sch-a1a2", name: "Kirkos Secondary School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-a1a" },
        { id: "wor-a1b", name: "Empty Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-a1" },
        { id: "reg-b", name: "Oromia Region", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-b1", name: "East Shewa Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-b" },
        { id: "wor-b1a", name: "Ada'a Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-b1" },
        { id: "sch-b1a1", name: "Bishoftu Model School", type: "SCHOOL" as OrganizationUnitType, parentId: "wor-b1a" },
    ];

    const mockActiveYears = [
        { id: "ay-sch1", organizationId: "sch-a1a1", status: "ACTIVE" },
        { id: "ay-sch2", organizationId: "sch-a1a2", status: "ACTIVE" },
        { id: "ay-sch3", organizationId: "sch-b1a1", status: "ACTIVE" },
    ];

    const mockEnrollments = [
        // sch-a1a1: 2 students (1 Male Grade 9, 1 Female Grade 10)
        { id: "enr-1", organizationId: "sch-a1a1", schoolGradeId: "g9", schoolGrade: { id: "g9", grade: { id: "g9", name: "Grade 9", level: 9 } }, student: { gender: "MALE" } },
        { id: "enr-2", organizationId: "sch-a1a1", schoolGradeId: "g10", schoolGrade: { id: "g10", grade: { id: "g10", name: "Grade 10", level: 10 } }, student: { gender: "FEMALE" } },
        // sch-a1a2: 1 student (Female Grade 11)
        { id: "enr-3", organizationId: "sch-a1a2", schoolGradeId: "g11", schoolGrade: { id: "g11", grade: { id: "g11", name: "Grade 11", level: 11 } }, student: { gender: "FEMALE" } },
        // sch-b1a1 (Region B): 1 student (Male Grade 9)
        { id: "enr-4", organizationId: "sch-b1a1", schoolGradeId: "g9", schoolGrade: { id: "g9", grade: { id: "g9", name: "Grade 9", level: 9 } }, student: { gender: "MALE" } },
    ];

    const mockTeachers = [
        { id: "t-1", organizationId: "sch-a1a1" },
        { id: "t-2", organizationId: "sch-a1a1" },
        { id: "t-3", organizationId: "sch-a1a2" },
        { id: "t-4", organizationId: "sch-b1a1" },
    ];

    const mockAttendance = [
        { organizationId: "sch-a1a1", status: "PRESENT" },
        { organizationId: "sch-a1a1", status: "PRESENT" },
        { organizationId: "sch-a1a1", status: "ABSENT" },
        { organizationId: "sch-a1a2", status: "PRESENT" },
        { organizationId: "sch-b1a1", status: "ABSENT" },
    ];

    const mockAssessmentResults = [
        { score: 80, assessment: { organizationId: "sch-a1a1", maxScore: 100 } },
        { score: 90, assessment: { organizationId: "sch-a1a1", maxScore: 100 } },
        { score: 70, assessment: { organizationId: "sch-a1a2", maxScore: 100 } },
        { score: 50, assessment: { organizationId: "sch-b1a1", maxScore: 100 } },
    ];

    beforeEach(() => {
        vi.resetAllMocks();
        (prisma.organizationUnit.findMany as any).mockResolvedValue(mockAllUnits);
        (prisma.academicYear.findMany as any).mockResolvedValue(mockActiveYears);
    });

    describe("1. Hierarchy Tiers Aggregation", () => {
        it("1.1 FEDERAL: should aggregate across all authorized descendant schools in the national tree", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-fed",
                currentOrganizationId: "fed-1",
                currentOrganizationType: "FEDERAL",
                currentOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL", parentId: null },
                accessibleOrganizationIds: mockAllUnits.map(u => u.id),
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2", "sch-b1a1"],
                lineage: [{ id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL", parentId: null }],
            });

            (prisma.studentEnrollment.findMany as any).mockResolvedValue(mockEnrollments);
            (prisma.teacher.findMany as any).mockResolvedValue(mockTeachers);
            (prisma.studentAttendance.findMany as any).mockResolvedValue(mockAttendance);
            (prisma.studentResult.findMany as any).mockResolvedValue(mockAssessmentResults);

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-fed");

            expect(dashboard.context.organizationType).toBe("FEDERAL");
            expect(dashboard.context.schoolCount).toBe(3);
            expect(dashboard.context.childUnitType).toBe("REGION");
            expect(dashboard.kpis.totalSchools).toBe(3);
            expect(dashboard.kpis.totalStudents).toBe(4);
            expect(dashboard.kpis.totalTeachers).toBe(4);
            expect(dashboard.kpis.studentTeacherRatio).toBe(1.0);
            expect(dashboard.kpis.totalAssessments).toBe(4);
            expect(dashboard.childUnitsBreakdown).toHaveLength(2); // Region A and Region B
        });

        it("1.2 REGION: should aggregate only schools beneath Region A", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-reg-a",
                currentOrganizationId: "reg-a",
                currentOrganizationType: "REGION",
                currentOrganization: { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                accessibleOrganizationIds: ["reg-a", "zone-a1", "wor-a1a", "sch-a1a1", "sch-a1a2", "wor-a1b"],
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2"],
                lineage: [
                    { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                    { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL", parentId: null },
                ],
            });

            // Return only Region A records from database
            const regionAEnrollments = mockEnrollments.filter(e => e.organizationId.startsWith("sch-a1a"));
            const regionATeachers = mockTeachers.filter(t => t.organizationId.startsWith("sch-a1a"));
            const regionAAttendance = mockAttendance.filter(a => a.organizationId.startsWith("sch-a1a"));
            const regionAAssessments = mockAssessmentResults.filter(r => r.assessment.organizationId.startsWith("sch-a1a"));

            (prisma.studentEnrollment.findMany as any).mockResolvedValue(regionAEnrollments);
            (prisma.teacher.findMany as any).mockResolvedValue(regionATeachers);
            (prisma.studentAttendance.findMany as any).mockResolvedValue(regionAAttendance);
            (prisma.studentResult.findMany as any).mockResolvedValue(regionAAssessments);

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-reg-a");

            expect(dashboard.context.organizationId).toBe("reg-a");
            expect(dashboard.context.organizationType).toBe("REGION");
            expect(dashboard.context.schoolCount).toBe(2);
            expect(dashboard.context.childUnitType).toBe("ZONE");
            expect(dashboard.kpis.totalSchools).toBe(2);
            expect(dashboard.kpis.totalStudents).toBe(3);
            expect(dashboard.kpis.totalTeachers).toBe(3);
            expect(dashboard.childUnitsBreakdown).toHaveLength(1); // Central Zone
            expect(dashboard.childUnitsBreakdown[0]!.name).toBe("Central Zone");
            expect(dashboard.childUnitsBreakdown[0]!.schoolCount).toBe(2);
            expect(dashboard.childUnitsBreakdown[0]!.studentCount).toBe(3);
        });

        it("1.3 ZONE: should aggregate only schools beneath Zone A1", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-zone-a1",
                currentOrganizationId: "zone-a1",
                currentOrganizationType: "ZONE",
                currentOrganization: { id: "zone-a1", name: "Central Zone", type: "ZONE", parentId: "reg-a" },
                accessibleOrganizationIds: ["zone-a1", "wor-a1a", "sch-a1a1", "sch-a1a2", "wor-a1b"],
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2"],
                lineage: [
                    { id: "zone-a1", name: "Central Zone", type: "ZONE", parentId: "reg-a" },
                    { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                    { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null }
                ],
            });

            (prisma.studentEnrollment.findMany as any).mockResolvedValue(mockEnrollments.filter(e => e.organizationId.startsWith("sch-a1a")));
            (prisma.teacher.findMany as any).mockResolvedValue(mockTeachers.filter(t => t.organizationId.startsWith("sch-a1a")));
            (prisma.studentAttendance.findMany as any).mockResolvedValue(mockAttendance.filter(a => a.organizationId.startsWith("sch-a1a")));
            (prisma.studentResult.findMany as any).mockResolvedValue(mockAssessmentResults.filter(r => r.assessment.organizationId.startsWith("sch-a1a")));

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-zone-a1");

            expect(dashboard.context.organizationType).toBe("ZONE");
            expect(dashboard.context.childUnitType).toBe("WOREDA");
            expect(dashboard.childUnitsBreakdown).toHaveLength(2); // Kirkos Woreda & Empty Woreda
            const kirkos = dashboard.childUnitsBreakdown.find(c => c.name === "Kirkos Woreda")!;
            const emptyWoreda = dashboard.childUnitsBreakdown.find(c => c.name === "Empty Woreda")!;
            expect(kirkos.schoolCount).toBe(2);
            expect(kirkos.studentCount).toBe(3);
            expect(emptyWoreda.schoolCount).toBe(0);
            expect(emptyWoreda.studentCount).toBe(0);
        });

        it("1.4 WOREDA: should aggregate only schools beneath Woreda A1a", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-wor-a1a",
                currentOrganizationId: "wor-a1a",
                currentOrganizationType: "WOREDA",
                currentOrganization: { id: "wor-a1a", name: "Kirkos Woreda", type: "WOREDA", parentId: "zone-a1" },
                accessibleOrganizationIds: ["wor-a1a", "sch-a1a1", "sch-a1a2"],
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2"],
                lineage: [
                    { id: "wor-a1a", name: "Kirkos Woreda", type: "WOREDA", parentId: "zone-a1" },
                    { id: "zone-a1", name: "Central Zone", type: "ZONE", parentId: "reg-a" },
                    { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                    { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null }
                ],
            });

            (prisma.studentEnrollment.findMany as any).mockResolvedValue(mockEnrollments.filter(e => e.organizationId.startsWith("sch-a1a")));
            (prisma.teacher.findMany as any).mockResolvedValue(mockTeachers.filter(t => t.organizationId.startsWith("sch-a1a")));
            (prisma.studentAttendance.findMany as any).mockResolvedValue(mockAttendance.filter(a => a.organizationId.startsWith("sch-a1a")));
            (prisma.studentResult.findMany as any).mockResolvedValue(mockAssessmentResults.filter(r => r.assessment.organizationId.startsWith("sch-a1a")));

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-wor-a1a");

            expect(dashboard.context.organizationType).toBe("WOREDA");
            expect(dashboard.context.childUnitType).toBe("SCHOOL");
            expect(dashboard.childUnitsBreakdown).toHaveLength(2); // Kirkos Primary & Kirkos Secondary
            expect(dashboard.childUnitsBreakdown.every(c => c.type === "SCHOOL")).toBe(true);
        });
    });

    describe("2. Cross-Branch Protection & Drill-Down Security", () => {
        it("2.1 should reject Region A user attempting to drill down into Region B target", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-reg-a",
                currentOrganizationId: "reg-a",
                currentOrganizationType: "REGION",
                currentOrganization: { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                accessibleOrganizationIds: ["reg-a", "zone-a1", "wor-a1a", "sch-a1a1", "sch-a1a2", "wor-a1b"],
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2"],
                lineage: [{ id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" }],
            });

            await expect(
                GovernanceDashboardService.getGovernanceDashboard("user-reg-a", "reg-b")
            ).rejects.toThrow("Forbidden: Target organization is outside your authorized hierarchy scope");
        });

        it("2.2 should allow Region A user to drill down into an authorized Zone A1 target", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-reg-a",
                currentOrganizationId: "reg-a",
                currentOrganizationType: "REGION",
                currentOrganization: { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                accessibleOrganizationIds: ["reg-a", "zone-a1", "wor-a1a", "sch-a1a1", "sch-a1a2", "wor-a1b"],
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2"],
                lineage: [{ id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" }],
            });

            (prisma.organizationUnit.findUnique as any).mockResolvedValue({
                id: "zone-a1",
                name: "Central Zone",
                type: "ZONE",
                parentId: "reg-a"
            });

            (HierarchyScopeService.getLineage as any).mockResolvedValue([
                { id: "zone-a1", name: "Central Zone", type: "ZONE", parentId: "reg-a" },
                { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null }
            ]);

            (prisma.studentEnrollment.findMany as any).mockResolvedValue(mockEnrollments.filter(e => e.organizationId.startsWith("sch-a1a")));
            (prisma.teacher.findMany as any).mockResolvedValue(mockTeachers.filter(t => t.organizationId.startsWith("sch-a1a")));
            (prisma.studentAttendance.findMany as any).mockResolvedValue([]);
            (prisma.studentResult.findMany as any).mockResolvedValue([]);

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-reg-a", "zone-a1");

            expect(dashboard.context.organizationId).toBe("zone-a1");
            expect(dashboard.context.organizationType).toBe("ZONE");
            expect(dashboard.context.isDrillDown).toBe(true);
            expect(dashboard.context.lineage).toHaveLength(3);
        });
    });

    describe("3. Empty Data & Domain Metric Precision", () => {
        it("3.1 should return clean zero-state for an organization with zero schools without executing domain queries", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-empty",
                currentOrganizationId: "wor-a1b",
                currentOrganizationType: "WOREDA",
                currentOrganization: { id: "wor-a1b", name: "Empty Woreda", type: "WOREDA", parentId: "zone-a1" },
                accessibleOrganizationIds: ["wor-a1b"],
                descendantSchoolIds: [],
                lineage: [{ id: "wor-a1b", name: "Empty Woreda", type: "WOREDA", parentId: "zone-a1" }],
            });

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-empty");

            expect(dashboard.kpis.totalSchools).toBe(0);
            expect(dashboard.kpis.totalStudents).toBe(0);
            expect(dashboard.kpis.totalTeachers).toBe(0);
            expect(dashboard.kpis.studentTeacherRatio).toBe(0);
            expect(dashboard.kpis.attendanceRate).toBeNull();
            expect(dashboard.kpis.averageAssessmentScore).toBeNull();
            expect(dashboard.childUnitsBreakdown).toEqual([]);
            // Ensure no student or teacher queries were executed
            expect(prisma.studentEnrollment.findMany).not.toHaveBeenCalled();
            expect(prisma.teacher.findMany).not.toHaveBeenCalled();
        });

        it("3.2 should compute student gender and grade distributions accurately", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-fed",
                currentOrganizationId: "fed-1",
                currentOrganizationType: "FEDERAL",
                currentOrganization: { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null },
                accessibleOrganizationIds: mockAllUnits.map(u => u.id),
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2", "sch-b1a1"],
                lineage: [{ id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null }],
            });

            (prisma.studentEnrollment.findMany as any).mockResolvedValue(mockEnrollments);
            (prisma.teacher.findMany as any).mockResolvedValue([]);
            (prisma.studentAttendance.findMany as any).mockResolvedValue([]);
            (prisma.studentResult.findMany as any).mockResolvedValue([]);

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-fed");

            expect(dashboard.students.total).toBe(4);
            expect(dashboard.students.byGender.male).toBe(2);
            expect(dashboard.students.byGender.female).toBe(2);
            expect(dashboard.students.byGrade).toHaveLength(3); // Grade 9 (2), Grade 10 (1), Grade 11 (1)
            const g9 = dashboard.students.byGrade.find(g => g.level === 9)!;
            expect(g9.studentCount).toBe(2);
        });

        it("3.3 should calculate attendance rate from actual records accurately", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-fed",
                currentOrganizationId: "fed-1",
                currentOrganizationType: "FEDERAL",
                currentOrganization: { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null },
                accessibleOrganizationIds: mockAllUnits.map(u => u.id),
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2", "sch-b1a1"],
                lineage: [{ id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null }],
            });

            (prisma.studentEnrollment.findMany as any).mockResolvedValue([]);
            (prisma.teacher.findMany as any).mockResolvedValue([]);
            (prisma.studentAttendance.findMany as any).mockResolvedValue(mockAttendance); // 3 present, 2 absent out of 5 = 60.0%
            (prisma.studentResult.findMany as any).mockResolvedValue([]);

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-fed");

            expect(dashboard.attendance.present).toBe(3);
            expect(dashboard.attendance.absent).toBe(2);
            expect(dashboard.attendance.totalRecords).toBe(5);
            expect(dashboard.attendance.rate).toBe(60.0);
            expect(dashboard.kpis.attendanceRate).toBe(60.0);
        });

        it("3.4 should calculate assessment average score from actual records accurately", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-fed",
                currentOrganizationId: "fed-1",
                currentOrganizationType: "FEDERAL",
                currentOrganization: { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null },
                accessibleOrganizationIds: mockAllUnits.map(u => u.id),
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2", "sch-b1a1"],
                lineage: [{ id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null }],
            });

            (prisma.studentEnrollment.findMany as any).mockResolvedValue([]);
            (prisma.teacher.findMany as any).mockResolvedValue([]);
            (prisma.studentAttendance.findMany as any).mockResolvedValue([]);
            (prisma.studentResult.findMany as any).mockResolvedValue(mockAssessmentResults); // 80, 90, 70, 50 -> sum 290 / 4 = 72.5

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-fed");

            expect(dashboard.assessments.totalResults).toBe(4);
            expect(dashboard.assessments.averageScore).toBe(72.5);
            expect(dashboard.kpis.averageAssessmentScore).toBe(72.5);
        });

        it("3.5 should filter records strictly by active academic years", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-reg-a",
                currentOrganizationId: "reg-a",
                currentOrganizationType: "REGION",
                currentOrganization: { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                accessibleOrganizationIds: ["reg-a", "zone-a1", "wor-a1a", "sch-a1a1", "sch-a1a2", "wor-a1b"],
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2"],
                lineage: [{ id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" }],
            });

            (prisma.academicYear.findMany as any).mockResolvedValue([
                { id: "ay-sch1", organizationId: "sch-a1a1", status: "ACTIVE" },
                { id: "ay-sch2", organizationId: "sch-a1a2", status: "ACTIVE" }
            ]);

            (prisma.studentEnrollment.findMany as any).mockResolvedValue([]);
            (prisma.teacher.findMany as any).mockResolvedValue([]);
            (prisma.studentAttendance.findMany as any).mockResolvedValue([]);
            (prisma.studentResult.findMany as any).mockResolvedValue([]);

            await GovernanceDashboardService.getGovernanceDashboard("user-reg-a");

            expect(prisma.studentEnrollment.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        academicYearId: { in: ["ay-sch1", "ay-sch2"] },
                        status: "ACTIVE"
                    })
                })
            );
        });
    });

    describe("4. Tier Validation & Administrative Boundary Isolation", () => {
        it("4.1 should allow Federal user on FEDERAL tier dashboard", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-fed",
                currentOrganizationId: "fed-1",
                currentOrganizationType: "FEDERAL",
                currentOrganization: { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null },
                accessibleOrganizationIds: mockAllUnits.map(u => u.id),
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2", "sch-b1a1"],
                lineage: [{ id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null }],
            });

            (prisma.studentEnrollment.findMany as any).mockResolvedValue([]);
            (prisma.teacher.findMany as any).mockResolvedValue([]);
            (prisma.studentAttendance.findMany as any).mockResolvedValue([]);
            (prisma.studentResult.findMany as any).mockResolvedValue([]);

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-fed", undefined, "FEDERAL");
            expect(dashboard.context.organizationType).toBe("FEDERAL");
        });

        it("4.2 should reject Region user accessing FEDERAL tier dashboard", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-reg-a",
                currentOrganizationId: "reg-a",
                currentOrganizationType: "REGION",
                currentOrganization: { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                accessibleOrganizationIds: ["reg-a", "zone-a1", "wor-a1a", "sch-a1a1", "sch-a1a2", "wor-a1b"],
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2"],
                lineage: [{ id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" }],
            });

            await expect(
                GovernanceDashboardService.getGovernanceDashboard("user-reg-a", undefined, "FEDERAL")
            ).rejects.toThrow("Forbidden: Organization tier 'REGION' is not authorized for FEDERAL dashboard");
        });

        it("4.3 should reject School user accessing any hierarchy dashboard", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-sch-a1a1",
                currentOrganizationId: "sch-a1a1",
                currentOrganizationType: "SCHOOL",
                currentOrganization: { id: "sch-a1a1", name: "Kirkos Primary School", type: "SCHOOL", parentId: "wor-a1a" },
                accessibleOrganizationIds: ["sch-a1a1"],
                descendantSchoolIds: ["sch-a1a1"],
                lineage: [{ id: "sch-a1a1", name: "Kirkos Primary School", type: "SCHOOL", parentId: "wor-a1a" }],
            });

            await expect(
                GovernanceDashboardService.getGovernanceDashboard("user-sch-a1a1", undefined, "WOREDA")
            ).rejects.toThrow("Forbidden: School level users cannot access administrative hierarchy dashboards");
        });

        it("4.4 should allow Region user on REGION tier dashboard", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-reg-a",
                currentOrganizationId: "reg-a",
                currentOrganizationType: "REGION",
                currentOrganization: { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                accessibleOrganizationIds: ["reg-a", "zone-a1", "wor-a1a", "sch-a1a1", "sch-a1a2", "wor-a1b"],
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2"],
                lineage: [{ id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" }],
            });

            (prisma.studentEnrollment.findMany as any).mockResolvedValue([]);
            (prisma.teacher.findMany as any).mockResolvedValue([]);
            (prisma.studentAttendance.findMany as any).mockResolvedValue([]);
            (prisma.studentResult.findMany as any).mockResolvedValue([]);

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-reg-a", undefined, "REGION");
            expect(dashboard.context.organizationType).toBe("REGION");
        });

        it("4.5 should allow Federal user on subordinate WOREDA tier dashboard and auto-resolve descendant Woreda", async () => {
            (HierarchyScopeService.getAccessibleOrganizationScope as any).mockResolvedValue({
                userId: "user-fed",
                currentOrganizationId: "fed-1",
                currentOrganizationType: "FEDERAL",
                currentOrganization: { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null },
                accessibleOrganizationIds: mockAllUnits.map(u => u.id),
                descendantSchoolIds: ["sch-a1a1", "sch-a1a2", "sch-b1a1"],
                lineage: [{ id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null }],
            });

            (prisma.organizationUnit.findFirst as any).mockResolvedValue({
                id: "wor-a1a",
                name: "Kirkos Woreda",
                type: "WOREDA",
                parentId: "zone-a1",
            });

            (HierarchyScopeService.getLineage as any).mockResolvedValue([
                { id: "wor-a1a", name: "Kirkos Woreda", type: "WOREDA", parentId: "zone-a1" },
                { id: "zone-a1", name: "Central Zone", type: "ZONE", parentId: "reg-a" },
                { id: "reg-a", name: "Addis Ababa Region", type: "REGION", parentId: "fed-1" },
                { id: "fed-1", name: "Federal Ministry", type: "FEDERAL", parentId: null },
            ]);

            (prisma.studentEnrollment.findMany as any).mockResolvedValue([]);
            (prisma.teacher.findMany as any).mockResolvedValue([]);
            (prisma.studentAttendance.findMany as any).mockResolvedValue([]);
            (prisma.studentResult.findMany as any).mockResolvedValue([]);

            const dashboard = await GovernanceDashboardService.getGovernanceDashboard("user-fed", undefined, "WOREDA");
            expect(dashboard.context.organizationType).toBe("WOREDA");
            expect(dashboard.context.organizationId).toBe("wor-a1a");
        });
    });
});

