import { describe, it, expect, vi, beforeEach } from "vitest";
import { DataRequestService } from "./data-request.service.js";
import { GoogleFormsService } from "./google-forms.service.js";
import { prisma } from "../../infrastructure/prisma/client.js";
import {
    OrganizationUnitType,
    DataRequestPriority,
    DataRequestStatus,
    DataRequestFieldType,
    DataRequestTargetStatus,
    DataRequestSubmissionStatus,
    GoogleFormIntegrationStatus
} from "../../generated/prisma/client.js";

vi.mock("../../infrastructure/prisma/client.js", () => ({
    prisma: {
        dataRequest: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            update: vi.fn()
        },
        dataRequestField: {
            update: vi.fn()
        },
        dataRequestTarget: {
            createMany: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn()
        },
        dataRequestSubmission: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            upsert: vi.fn()
        },
        googleFormIntegration: {
            upsert: vi.fn(),
            update: vi.fn()
        },
        organizationUnit: {
            findMany: vi.fn(),
            findUnique: vi.fn()
        },
        auditLog: {
            create: vi.fn()
        }
    }
}));

describe("EduBridge — Data Request & Real Google Forms Integration Service", () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    const mockHierarchy = [
        { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" as OrganizationUnitType, parentId: null },
        { id: "reg-amhara", name: "Amhara Regional Education Bureau", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "reg-oromia", name: "Oromia Regional Education Bureau", type: "REGION" as OrganizationUnitType, parentId: "fed-1" },
        { id: "zone-gondar", name: "South Gondar Zone", type: "ZONE" as OrganizationUnitType, parentId: "reg-amhara" },
        { id: "woreda-tabor", name: "Debre Tabor Woreda", type: "WOREDA" as OrganizationUnitType, parentId: "zone-gondar" },
        { id: "school-tabor-sec", name: "Tabor Secondary School", type: "SCHOOL" as OrganizationUnitType, parentId: "woreda-tabor" },
        { id: "school-gondar-elem", name: "Gondar Elementary School", type: "SCHOOL" as OrganizationUnitType, parentId: "woreda-tabor" }
    ];

    const federalActor = { id: "fed-1", type: "FEDERAL" as OrganizationUnitType, name: "Federal Ministry of Education" };
    const amharaActor = { id: "reg-amhara", type: "REGION" as OrganizationUnitType, name: "Amhara Regional Education Bureau" };
    const schoolActor = { id: "school-tabor-sec", type: "SCHOOL" as OrganizationUnitType, name: "Tabor Secondary School" };

    describe("1. Dynamic Data Request Creation & Hierarchical Validation", () => {
        it("1.1 Federal administrator can create a data request with dynamic ICT fields targeting regions/schools", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchy);
            (prisma.dataRequest.create as any).mockResolvedValue({
                id: "dr-ict-2026",
                title: "2026 National School ICT Infrastructure Data Collection",
                description: "Comprehensive survey of computer labs and connectivity",
                objective: "Determine national device readiness for e-learning curriculum",
                priority: DataRequestPriority.HIGH,
                startDate: new Date("2026-10-01"),
                deadline: new Date("2026-11-15"),
                instructions: "Inspect physical hardware and power before answering.",
                requiredAction: "Complete the survey with accurate inventory numbers.",
                status: DataRequestStatus.DRAFT,
                createdById: "user-fed-1",
                createdOrganizationId: "fed-1",
                fields: [
                    { id: "f-1", label: "School Name", fieldType: "SHORT_TEXT", required: true, order: 1 },
                    { id: "f-2", label: "Number of computers", fieldType: "NUMBER", required: true, order: 2 },
                    { id: "f-3", label: "Number of functional computers", fieldType: "NUMBER", required: true, order: 3 },
                    { id: "f-4", label: "Number of projectors", fieldType: "NUMBER", required: false, order: 4 },
                    { id: "f-5", label: "Is internet available?", fieldType: "YES_NO", required: true, order: 5 },
                    { id: "f-6", label: "Is internet functional?", fieldType: "YES_NO", required: true, order: 6 },
                    { id: "f-7", label: "Is electricity available?", fieldType: "YES_NO", required: true, order: 7 },
                    { id: "f-8", label: "Last equipment inventory date", fieldType: "DATE", required: false, order: 8 },
                    { id: "f-9", label: "Comments", fieldType: "LONG_TEXT", required: false, order: 9 }
                ],
                targets: [
                    { id: "target-1", organizationId: "school-tabor-sec", status: DataRequestTargetStatus.PENDING },
                    { id: "target-2", organizationId: "school-gondar-elem", status: DataRequestTargetStatus.PENDING }
                ]
            });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-1" });

            const result: any = await DataRequestService.createDataRequest(
                {
                    title: "2026 National School ICT Infrastructure Data Collection",
                    description: "Comprehensive survey of computer labs and connectivity",
                    objective: "Determine national device readiness for e-learning curriculum",
                    priority: DataRequestPriority.HIGH,
                    startDate: "2026-10-01",
                    deadline: "2026-11-15",
                    instructions: "Inspect physical hardware and power before answering.",
                    requiredAction: "Complete the survey with accurate inventory numbers.",
                    targetUnitIds: ["school-tabor-sec", "school-gondar-elem"],
                    fields: [
                        { label: "School Name", fieldType: "SHORT_TEXT" as DataRequestFieldType, required: true },
                        { label: "Number of computers", fieldType: "NUMBER" as DataRequestFieldType, required: true },
                        { label: "Number of functional computers", fieldType: "NUMBER" as DataRequestFieldType, required: true },
                        { label: "Number of projectors", fieldType: "NUMBER" as DataRequestFieldType, required: false },
                        { label: "Is internet available?", fieldType: "YES_NO" as DataRequestFieldType, required: true },
                        { label: "Is internet functional?", fieldType: "YES_NO" as DataRequestFieldType, required: true },
                        { label: "Is electricity available?", fieldType: "YES_NO" as DataRequestFieldType, required: true },
                        { label: "Last equipment inventory date", fieldType: "DATE" as DataRequestFieldType, required: false },
                        { label: "Comments", fieldType: "LONG_TEXT" as DataRequestFieldType, required: false }
                    ]
                },
                federalActor,
                "user-fed-1"
            );

            expect(result.id).toBe("dr-ict-2026");
            expect(result.fields.length).toBe(9);
            expect(prisma.dataRequest.create).toHaveBeenCalled();
            expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: "DATA_REQUEST_CREATED",
                    resource: "DataRequest"
                })
            }));
        });

        it("1.2 Rejects data request creation if targeting organizations outside authorized jurisdiction", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchy);
            (prisma.organizationUnit.findUnique as any).mockResolvedValue({ name: "Oromia Regional Education Bureau" });

            // Amhara region attempts to target Oromia
            await expect(
                DataRequestService.createDataRequest(
                    {
                        title: "Cross-region survey",
                        objective: "Collect unauthorized data",
                        startDate: "2026-10-01",
                        deadline: "2026-10-31",
                        targetUnitIds: ["reg-oromia"], // Out of jurisdiction
                        fields: [{ label: "Remarks", fieldType: "SHORT_TEXT" as DataRequestFieldType }]
                    },
                    amharaActor,
                    "user-amhara"
                )
            ).rejects.toThrow("outside your authorized hierarchical jurisdiction");
        });

        it("1.3 Federal administrator creates a request targeting Region ONLY (delivered only to target Region)", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchy);
            (prisma.dataRequest.create as any).mockResolvedValue({
                id: "dr-region-only",
                title: "Amhara Regional Literacy Assessment",
                objective: "Assess regional literacy milestones",
                priority: DataRequestPriority.NORMAL,
                startDate: new Date("2026-10-01"),
                deadline: new Date("2026-10-31"),
                status: DataRequestStatus.DRAFT,
                createdById: "user-fed-1",
                createdOrganizationId: "fed-1",
                fields: [{ id: "f-1", label: "Grade 4 Reading Proficiency Rate (%)", fieldType: "NUMBER", required: true, order: 1 }],
                targets: [
                    { id: "target-reg", organizationId: "reg-amhara", status: DataRequestTargetStatus.PENDING }
                ]
            });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-reg" });

            const result: any = await DataRequestService.createDataRequest(
                {
                    title: "Amhara Regional Literacy Assessment",
                    objective: "Assess regional literacy milestones",
                    priority: DataRequestPriority.NORMAL,
                    startDate: "2026-10-01",
                    deadline: "2026-10-31",
                    targetUnitIds: ["reg-amhara"], // Targeting Region only
                    fields: [{ label: "Grade 4 Reading Proficiency Rate (%)", fieldType: "NUMBER" as DataRequestFieldType, required: true }]
                },
                federalActor,
                "user-fed-1"
            );

            expect(result.id).toBe("dr-region-only");
            expect(result.targets.length).toBe(1);
            expect(result.targets[0]!.organizationId).toBe("reg-amhara");
            expect(prisma.dataRequest.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    createdOrganizationId: "fed-1",
                    targets: {
                        create: [{ organizationId: "reg-amhara", status: DataRequestTargetStatus.PENDING }]
                    }
                })
            }));
        });

        it("1.4 Federal administrator creates a request targeting Zone ONLY (delivered only to target Zone)", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchy);
            (prisma.dataRequest.create as any).mockResolvedValue({
                id: "dr-zone-only",
                title: "South Gondar Special Teacher Allocation Survey",
                objective: "Evaluate science teacher deployment in South Gondar",
                priority: DataRequestPriority.HIGH,
                startDate: new Date("2026-10-01"),
                deadline: new Date("2026-11-01"),
                status: DataRequestStatus.DRAFT,
                createdById: "user-fed-1",
                createdOrganizationId: "fed-1",
                fields: [{ id: "f-1", label: "Science Teachers Needed", fieldType: "NUMBER", required: true, order: 1 }],
                targets: [
                    { id: "target-zone", organizationId: "zone-gondar", status: DataRequestTargetStatus.PENDING }
                ]
            });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-zone" });

            const result: any = await DataRequestService.createDataRequest(
                {
                    title: "South Gondar Special Teacher Allocation Survey",
                    objective: "Evaluate science teacher deployment in South Gondar",
                    priority: DataRequestPriority.HIGH,
                    startDate: "2026-10-01",
                    deadline: "2026-11-01",
                    targetUnitIds: ["zone-gondar"], // Targeting Zone only
                    fields: [{ label: "Science Teachers Needed", fieldType: "NUMBER" as DataRequestFieldType, required: true }]
                },
                federalActor,
                "user-fed-1"
            );

            expect(result.id).toBe("dr-zone-only");
            expect(result.targets.length).toBe(1);
            expect(result.targets[0]!.organizationId).toBe("zone-gondar");
        });
    });

    describe("2. Google Forms API Generation & Link Provision", () => {
        it("2.1 Creates a real external Google Form via GoogleFormsService and saves responder URL", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchy);
            (prisma.dataRequest.findUnique as any).mockResolvedValue({
                id: "dr-ict-2026",
                title: "2026 National School ICT Infrastructure Data Collection",
                objective: "Determine national device readiness",
                instructions: "Inspect physical hardware",
                createdOrganizationId: "fed-1",
                fields: [
                    { id: "f-1", label: "Number of computers", fieldType: "NUMBER", required: true, order: 1 },
                    { id: "f-2", label: "Internet available?", fieldType: "YES_NO", required: true, order: 2 }
                ]
            });
            (prisma.googleFormIntegration.upsert as any).mockResolvedValue({
                id: "g-int-1",
                requestId: "dr-ict-2026",
                googleFormId: "1FAIpQLSc_test_form_id",
                formUrl: "https://docs.google.com/forms/d/1FAIpQLSc_test_form_id/edit",
                responderUri: "https://docs.google.com/forms/d/e/1FAIpQLSc_test_form_id/viewform",
                status: GoogleFormIntegrationStatus.ACTIVE
            });
            (prisma.dataRequest.update as any).mockResolvedValue({ id: "dr-ict-2026", status: DataRequestStatus.PUBLISHED });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-2" });

            const result = await DataRequestService.createGoogleFormForRequest("dr-ict-2026", federalActor, "user-fed-1");

            expect(result.responderUri).toContain("https://docs.google.com/forms/d/e/");
            expect(result.formUrl).toContain("/edit");
            expect(prisma.googleFormIntegration.upsert).toHaveBeenCalledWith(expect.objectContaining({
                where: { requestId: "dr-ict-2026" }
            }));
            expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: "DATA_REQUEST_GOOGLE_FORM_CREATED"
                })
            }));
        });
    });

    describe("3. Response Synchronization & Idempotency", () => {
        it("3.1 Synchronizes live Google Form responses into PostgreSQL JSONB and updates target status", async () => {
            (prisma.dataRequest.findUnique as any).mockResolvedValue({
                id: "dr-ict-2026",
                title: "2026 National School ICT Infrastructure Data Collection",
                fields: [
                    { id: "f-1", label: "Number of computers", fieldType: "NUMBER" },
                    { id: "f-2", label: "Internet available?", fieldType: "YES_NO" }
                ],
                targets: [
                    {
                        id: "target-1",
                        organizationId: "school-tabor-sec",
                        status: DataRequestTargetStatus.PENDING,
                        organization: { id: "school-tabor-sec", name: "Tabor Secondary School", code: "TAB-01" }
                    }
                ],
                googleForm: {
                    id: "g-int-1",
                    googleFormId: "1FAIpQLSc_test_form_id",
                    status: GoogleFormIntegrationStatus.ACTIVE
                }
            });

            // Mock Google Forms API response sync
            vi.spyOn(GoogleFormsService, "syncFormResponses").mockResolvedValue([
                {
                    responseId: "g-resp-1001",
                    createTime: "2026-10-08T09:00:00Z",
                    lastSubmittedTime: "2026-10-08T09:05:00Z",
                    respondentEmail: "tabor.principal@edubridge.et",
                    answers: {
                        "Respondent School / Organization Unit Name": "Tabor Secondary School",
                        "Number of computers": "45",
                        "Internet available?": "Yes"
                    }
                }
            ]);

            (prisma.dataRequestSubmission.findFirst as any).mockResolvedValue(null);
            (prisma.dataRequestSubmission.create as any).mockResolvedValue({
                id: "sub-1",
                requestId: "dr-ict-2026",
                organizationId: "school-tabor-sec",
                googleResponseId: "g-resp-1001",
                responseData: { "Number of computers": "45", "Internet available?": "Yes" },
                status: DataRequestSubmissionStatus.UNDER_REVIEW
            });
            (prisma.dataRequestTarget.update as any).mockResolvedValue({ id: "target-1", status: DataRequestTargetStatus.SUBMITTED });
            (prisma.googleFormIntegration.update as any).mockResolvedValue({ id: "g-int-1" });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-3" });

            const syncResult = await DataRequestService.syncGoogleFormResponses("dr-ict-2026", federalActor, "user-fed-1");

            expect(syncResult.totalFetched).toBe(1);
            expect(syncResult.createdCount).toBe(1);
            expect(prisma.dataRequestSubmission.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    requestId: "dr-ict-2026",
                    organizationId: "school-tabor-sec",
                    googleResponseId: "g-resp-1001",
                    status: DataRequestSubmissionStatus.UNDER_REVIEW
                })
            }));
            expect(prisma.dataRequestTarget.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: DataRequestTargetStatus.SUBMITTED }
            }));
        });

        it("3.2 Idempotently updates existing submission without creating duplicate records on repeated sync", async () => {
            (prisma.dataRequest.findUnique as any).mockResolvedValue({
                id: "dr-ict-2026",
                title: "2026 National School ICT Infrastructure Data Collection",
                fields: [{ id: "f-1", label: "Number of computers", fieldType: "NUMBER" }],
                targets: [
                    {
                        id: "target-1",
                        organizationId: "school-tabor-sec",
                        status: DataRequestTargetStatus.SUBMITTED,
                        organization: { id: "school-tabor-sec", name: "Tabor Secondary School" }
                    }
                ],
                googleForm: { id: "g-int-1", googleFormId: "1FAIpQLSc_test_form_id" }
            });

            vi.spyOn(GoogleFormsService, "syncFormResponses").mockResolvedValue([
                {
                    responseId: "g-resp-1001",
                    createTime: "2026-10-08T09:00:00Z",
                    lastSubmittedTime: "2026-10-08T09:30:00Z",
                    answers: {
                        "Respondent School / Organization Unit Name": "Tabor Secondary School",
                        "Number of computers": "50" // Updated count
                    }
                }
            ]);

            // Existing submission already present with this googleResponseId
            (prisma.dataRequestSubmission.findFirst as any).mockResolvedValue({
                id: "sub-1",
                requestId: "dr-ict-2026",
                organizationId: "school-tabor-sec",
                googleResponseId: "g-resp-1001"
            });
            (prisma.dataRequestSubmission.update as any).mockResolvedValue({
                id: "sub-1",
                responseData: { "Number of computers": "50" }
            });
            (prisma.dataRequestTarget.update as any).mockResolvedValue({ id: "target-1" });
            (prisma.googleFormIntegration.update as any).mockResolvedValue({ id: "g-int-1" });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-4" });

            const syncResult = await DataRequestService.syncGoogleFormResponses("dr-ict-2026", federalActor, "user-fed-1");

            expect(syncResult.createdCount).toBe(0);
            expect(syncResult.updatedCount).toBe(1);
            expect(prisma.dataRequestSubmission.update).toHaveBeenCalled();
            expect(prisma.dataRequestSubmission.create).not.toHaveBeenCalled();
        });
    });

    describe("4. Review Workflow: Accept / Return / Resubmit", () => {
        it("4.1 Reviewer can Accept a valid submission", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchy);
            (prisma.dataRequestSubmission.findUnique as any).mockResolvedValue({
                id: "sub-1",
                requestId: "dr-ict-2026",
                organizationId: "school-tabor-sec",
                status: DataRequestSubmissionStatus.UNDER_REVIEW,
                request: { createdOrganizationId: "fed-1" }
            });
            (prisma.dataRequestSubmission.update as any).mockResolvedValue({
                id: "sub-1",
                status: DataRequestSubmissionStatus.ACCEPTED,
                reviewedById: "user-fed-1",
                reviewComment: "Verified against regional registry."
            });
            (prisma.dataRequestTarget.updateMany as any).mockResolvedValue({ count: 1 });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-5" });

            const result = await DataRequestService.reviewSubmission(
                "sub-1",
                { status: "ACCEPTED", reviewComment: "Verified against regional registry." },
                federalActor,
                "user-fed-1"
            );

            expect(result.status).toBe(DataRequestSubmissionStatus.ACCEPTED);
            expect(prisma.dataRequestTarget.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: DataRequestTargetStatus.ACCEPTED }
            }));
        });

        it("4.2 Reviewer can Return a submission with feedback for revision", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchy);
            (prisma.dataRequestSubmission.findUnique as any).mockResolvedValue({
                id: "sub-1",
                requestId: "dr-ict-2026",
                organizationId: "school-tabor-sec",
                status: DataRequestSubmissionStatus.UNDER_REVIEW,
                request: { createdOrganizationId: "fed-1" }
            });
            (prisma.dataRequestSubmission.update as any).mockResolvedValue({
                id: "sub-1",
                status: DataRequestSubmissionStatus.RETURNED,
                reviewedById: "user-fed-1",
                reviewComment: "Number of functional computers exceeds total computers. Please rectify."
            });
            (prisma.dataRequestTarget.updateMany as any).mockResolvedValue({ count: 1 });
            (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-6" });

            const result = await DataRequestService.reviewSubmission(
                "sub-1",
                { status: "RETURNED", reviewComment: "Number of functional computers exceeds total computers. Please rectify." },
                federalActor,
                "user-fed-1"
            );

            expect(result.status).toBe(DataRequestSubmissionStatus.RETURNED);
            expect(prisma.dataRequestTarget.updateMany).toHaveBeenCalledWith(expect.objectContaining({
                data: { status: DataRequestTargetStatus.RETURNED }
            }));
            expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: "DATA_REQUEST_SUBMISSION_RETURNED"
                })
            }));
        });
    });

    describe("5. Scope-based Listing & School Experience", () => {
        it("5.1 School administrator sees requests targeting their school and direct Google Form link", async () => {
            (prisma.organizationUnit.findMany as any).mockResolvedValue(mockHierarchy);
            (prisma.dataRequest.findMany as any).mockResolvedValue([
                {
                    id: "dr-ict-2026",
                    title: "2026 National School ICT Infrastructure Data Collection",
                    description: "Comprehensive survey",
                    objective: "Determine national device readiness",
                    priority: DataRequestPriority.HIGH,
                    status: DataRequestStatus.PUBLISHED,
                    createdOrganizationId: "fed-1",
                    createdOrganization: { id: "fed-1", name: "Federal Ministry of Education", type: "FEDERAL" },
                    creator: { id: "u-1", name: "Federal Admin", email: "admin@moe.gov.et" },
                    googleForm: {
                        id: "g-int-1",
                        responderUri: "https://docs.google.com/forms/d/e/1FAIpQLSc_test_form_id/viewform",
                        formUrl: "https://docs.google.com/forms/d/1FAIpQLSc_test_form_id/edit"
                    },
                    fields: [{ id: "f-1", label: "Number of computers", fieldType: "NUMBER", order: 1 }],
                    targets: [
                        {
                            id: "t-1",
                            organizationId: "school-tabor-sec",
                            status: DataRequestTargetStatus.PENDING,
                            organization: { id: "school-tabor-sec", name: "Tabor Secondary School", type: "SCHOOL", code: "TAB-01" }
                        }
                    ],
                    submissions: []
                }
            ]);

            const requests = await DataRequestService.getDataRequestsForScope(schoolActor);

            expect(requests.length).toBe(1);
            expect(requests[0]!.googleResponderUri).toBe("https://docs.google.com/forms/d/e/1FAIpQLSc_test_form_id/viewform");
            expect(requests[0]!.myTargetStatus).toBe(DataRequestTargetStatus.PENDING);
        });
    });
});
