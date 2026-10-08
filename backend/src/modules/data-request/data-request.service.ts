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
import { HierarchyScopeService } from "../hierarchy/hierarchy-scope.service.js";
import { GoogleFormsService, GoogleFormFieldInput } from "./google-forms.service.js";

export interface CreateDataRequestFieldInput {
    label: string;
    fieldType: DataRequestFieldType;
    required?: boolean;
    description?: string | null;
    options?: string[] | null;
    order?: number;
}

/**
 * Robust deep comparison helper for dynamic question responses.
 * Ignores key order, key casing/whitespace differences, and primitive type string coercions.
 */
export function areResponsesEqual(
    a: Record<string, any> | null | undefined,
    b: Record<string, any> | null | undefined
): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;

    const normA: Record<string, string> = {};
    for (const [k, v] of Object.entries(a)) {
        if (v !== undefined && v !== null && v !== "") {
            normA[k.trim().toLowerCase()] = String(v).trim();
        }
    }

    const normB: Record<string, string> = {};
    for (const [k, v] of Object.entries(b)) {
        if (v !== undefined && v !== null && v !== "") {
            normB[k.trim().toLowerCase()] = String(v).trim();
        }
    }

    const keysA = Object.keys(normA).sort();
    const keysB = Object.keys(normB).sort();

    if (keysA.length !== keysB.length) return false;

    for (let i = 0; i < keysA.length; i++) {
        const keyA = keysA[i];
        const keyB = keysB[i];
        if (!keyA || !keyB || keyA !== keyB) return false;
        if (normA[keyA] !== normB[keyB]) return false;
    }

    return true;
}

export interface CreateDataRequestInput {
    title: string;
    description?: string;
    objective: string;
    priority?: DataRequestPriority;
    startDate: string | Date;
    deadline: string | Date;
    instructions?: string;
    requiredAction?: string;
    targetScope?: string; // e.g. "ALL_REGIONS", "SELECTED_ORGANIZATIONS"
    targetUnitIds?: string[];
    fields: CreateDataRequestFieldInput[];
    status?: DataRequestStatus;
}

export interface ReviewSubmissionInput {
    status: "ACCEPTED" | "RETURNED";
    reviewComment?: string;
}

export class DataRequestService {
    /**
     * Creates a new Data Request with dynamic field definitions and target organizations.
     * Strictly enforces hierarchical scope jurisdiction.
     */
    static async createDataRequest(
        input: CreateDataRequestInput,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        ipAddress?: string
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }
        if (!userId) {
            throw new Error("Unauthorized: User session required.");
        }

        // 1. Validate required inputs
        if (!input.title || !input.title.trim()) {
            throw new Error("Data request title is required.");
        }
        if (!input.objective || !input.objective.trim()) {
            throw new Error("Data request objective is required.");
        }
        if (!input.startDate) {
            throw new Error("Start date is required.");
        }
        if (!input.deadline) {
            throw new Error("Deadline date is required.");
        }
        if (!input.fields || !Array.isArray(input.fields) || input.fields.length === 0) {
            throw new Error("At least one dynamic field definition is required.");
        }

        const startDate = new Date(input.startDate);
        const deadline = new Date(input.deadline);
        if (isNaN(startDate.getTime()) || isNaN(deadline.getTime())) {
            throw new Error("Invalid start date or deadline format.");
        }
        if (deadline < startDate) {
            throw new Error("Deadline cannot be earlier than start date.");
        }

        // 2. Resolve and validate target organizations against actor scope
        const isFederal = actorScope.type === "FEDERAL";
        const accessibleIds = isFederal
            ? (await prisma.organizationUnit.findMany({ select: { id: true } })).map((u: any) => u.id)
            : await HierarchyScopeService.getAccessibleOrganizationIds(actorScope.id);
        const rawTargetIds = Array.isArray(input.targetUnitIds) ? input.targetUnitIds.filter(Boolean) : [];
        let resolvedTargetIds: string[] = [];

        if (rawTargetIds.length > 0) {
            for (const unitId of rawTargetIds) {
                if (!isFederal && !accessibleIds.includes(unitId)) {
                    const unit = await prisma.organizationUnit.findUnique({
                        where: { id: unitId },
                        select: { name: true }
                    });
                    throw new Error(
                        `Forbidden: Target organization '${unit?.name || unitId}' is outside your authorized hierarchical jurisdiction.`
                    );
                }
            }
            resolvedTargetIds = rawTargetIds;
        } else {
            // Default target: All descendant schools if school-level request, or all immediate child units
            const descendantSchools = await HierarchyScopeService.getDescendantSchoolIds(actorScope.id, actorScope.type);
            resolvedTargetIds = descendantSchools.length > 0 ? descendantSchools : accessibleIds.filter(id => id !== actorScope.id);
        }

        if (resolvedTargetIds.length === 0) {
            throw new Error("No valid target organizations could be resolved within your jurisdiction.");
        }

        const priority = input.priority || DataRequestPriority.NORMAL;
        const initialStatus = input.status || DataRequestStatus.DRAFT;

        // 3. Create DataRequest record
        const request: any = await prisma.dataRequest.create({
            data: {
                title: input.title.trim(),
                description: input.description?.trim() || null,
                objective: input.objective.trim(),
                priority,
                startDate,
                deadline,
                instructions: input.instructions?.trim() || null,
                requiredAction: input.requiredAction?.trim() || null,
                targetScope: input.targetScope || "SELECTED_ORGANIZATIONS",
                status: initialStatus,
                createdById: userId,
                createdOrganizationId: actorScope.id,
                fields: {
                    create: input.fields.map((field, idx) => ({
                        label: field.label.trim(),
                        fieldType: field.fieldType,
                        required: field.required !== undefined ? Boolean(field.required) : true,
                        description: field.description?.trim() || null,
                        options: Array.isArray(field.options) ? field.options : [],
                        order: field.order !== undefined ? field.order : idx + 1
                    }))
                },
                targets: {
                    create: resolvedTargetIds.map(orgId => ({
                        organizationId: orgId,
                        status: DataRequestTargetStatus.PENDING
                    }))
                }
            },
            include: {
                fields: { orderBy: { order: "asc" } },
                targets: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                }
            }
        });

        // 4. Audit Logging
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: "DATA_REQUEST_CREATED",
                    resource: "DataRequest",
                    resourceId: request.id,
                    newValue: {
                        title: request.title,
                        priority: request.priority,
                        totalFields: request.fields.length,
                        totalTargets: request.targets.length
                    },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[DataRequestService] AuditLog creation failed:", auditErr);
        }

        // 5. In-app notifications to recipients if published immediately
        if (initialStatus === DataRequestStatus.PUBLISHED) {
            await this.dispatchDataRequestNotifications(request, actorScope);
        }

        return request;
    }

    /**
     * Publishes a data request to active status.
     */
    static async publishDataRequest(
        id: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        ipAddress?: string
    ) {
        if (!actorScope || !userId) {
            throw new Error("Unauthorized: Active session required.");
        }

        const request = await prisma.dataRequest.findUnique({
            where: { id },
            include: {
                targets: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                }
            }
        });

        if (!request) {
            throw new Error(`Data Request with ID '${id}' not found.`);
        }

        const accessibleIds = await HierarchyScopeService.getAccessibleOrganizationIds(actorScope.id);
        if (request.createdOrganizationId !== actorScope.id && !accessibleIds.includes(request.createdOrganizationId)) {
            throw new Error("Forbidden: You do not have permission to publish this data request.");
        }

        const updated = await prisma.dataRequest.update({
            where: { id },
            data: { status: DataRequestStatus.PUBLISHED },
            include: {
                targets: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                }
            }
        });

        // Dispatch in-app notifications
        await this.dispatchDataRequestNotifications(updated, actorScope);

        // Audit Logging
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: "DATA_REQUEST_PUBLISHED",
                    resource: "DataRequest",
                    resourceId: request.id,
                    newValue: { title: request.title, status: DataRequestStatus.PUBLISHED },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[DataRequestService] AuditLog creation failed:", auditErr);
        }

        return updated;
    }

    /**
     * Dispatches in-app notifications to administrators of all target recipient units.
     */
    static async dispatchDataRequestNotifications(
        request: any,
        actorScope: { id: string; type: OrganizationUnitType; name: string }
    ) {
        try {
            const targetOrgIds = (request.targets || []).map((t: any) => t.organizationId).filter(Boolean);
            if (targetOrgIds.length === 0) return;

            const roleAssignments = await prisma.roleAssignment.findMany({
                where: { scopeId: { in: targetOrgIds } },
                include: { scope: { select: { id: true, type: true, name: true } } }
            });

            const notifMap = new Map<string, { userId: string; organizationId: string; scopeType: string }>();
            for (const ra of roleAssignments) {
                const key = `${ra.userId}_${ra.scopeId}`;
                if (!notifMap.has(key)) {
                    notifMap.set(key, {
                        userId: ra.userId,
                        organizationId: ra.scopeId,
                        scopeType: ra.scope?.type || "SCHOOL"
                    });
                }
            }

            if (notifMap.size > 0) {
                const issuerPrefix = actorScope.type === "FEDERAL" ? "Federal Ministry of Education" : actorScope.name;
                await prisma.notification.createMany({
                    data: Array.from(notifMap.values()).map(item => {
                        let link = "/dashboard/data-requests";
                        if (item.scopeType === "REGION") link = "/dashboard/region?tab=data-requests";
                        else if (item.scopeType === "ZONE") link = "/dashboard/zone?tab=data-requests";
                        else if (item.scopeType === "WOREDA") link = "/dashboard/woreda?tab=data-requests";
                        else if (item.scopeType === "FEDERAL") link = "/dashboard/federal?tab=data-requests";
                        else if (item.scopeType === "SCHOOL") link = "/dashboard/data-requests";

                        return {
                            userId: item.userId,
                            organizationId: item.organizationId,
                            title: `New Data Request: ${request.title}`,
                            content: `${issuerPrefix} has issued a new data request: "${request.title}". Please submit the required data.`,
                            link,
                            isRead: false
                        };
                    })
                });
            }
        } catch (notifErr) {
            console.warn("[DataRequestService] Failed to dispatch data request assignment notifications:", notifErr);
        }
    }

    /**
     * Dispatches in-app notification to the data request creator when a recipient unit submits data.
     */
    static async dispatchSubmissionReceivedNotification(
        request: any,
        targetOrg: { id?: string; name?: string }
    ) {
        try {
            if (!request || !request.createdById) return;
            const orgName = targetOrg?.name || "Recipient Unit";

            let creatorOrgType = request.createdOrganization?.type;
            if (!creatorOrgType && request.createdOrganizationId) {
                const org = await prisma.organizationUnit.findUnique({
                    where: { id: request.createdOrganizationId },
                    select: { type: true }
                });
                creatorOrgType = org?.type;
            }

            let link = "/dashboard/data-requests";
            if (creatorOrgType === "REGION") link = "/dashboard/region?tab=data-requests";
            else if (creatorOrgType === "ZONE") link = "/dashboard/zone?tab=data-requests";
            else if (creatorOrgType === "WOREDA") link = "/dashboard/woreda?tab=data-requests";
            else if (creatorOrgType === "FEDERAL") link = "/dashboard/federal?tab=data-requests";
            else if (creatorOrgType === "SCHOOL") link = "/dashboard/data-requests";

            await prisma.notification.create({
                data: {
                    userId: request.createdById,
                    organizationId: request.createdOrganizationId,
                    title: `Submission Received: ${orgName}`,
                    content: `${orgName} has submitted data for request "${request.title}". Click to view and review.`,
                    link,
                    isRead: false
                }
            });
        } catch (notifErr) {
            console.warn("[DataRequestService] Failed to dispatch submission notification:", notifErr);
        }
    }

    /**
     * Dispatches in-app notification to the respondent administrators when their submission is reviewed and accepted.
     */
    static async dispatchReviewCompletedNotification(
        submission: any,
        reviewerScope: { id: string; type: OrganizationUnitType; name: string }
    ) {
        try {
            const roleAssignments = await prisma.roleAssignment.findMany({
                where: { scopeId: submission.organizationId },
                include: { scope: { select: { id: true, type: true, name: true } } }
            });

            const reqTitle = submission.request?.title || "Data Request";
            const reviewerName = reviewerScope.type === "FEDERAL" ? "Federal MoE" : reviewerScope.name;
            const isAccepted = submission.status === DataRequestSubmissionStatus.ACCEPTED;

            for (const ra of roleAssignments) {
                let link = "/dashboard/data-requests";
                if (ra.scope?.type === "REGION") link = "/dashboard/region?tab=data-requests";
                else if (ra.scope?.type === "ZONE") link = "/dashboard/zone?tab=data-requests";
                else if (ra.scope?.type === "WOREDA") link = "/dashboard/woreda?tab=data-requests";

                await prisma.notification.create({
                    data: {
                        userId: ra.userId,
                        organizationId: submission.organizationId,
                        title: isAccepted ? `Submission Accepted: ${reqTitle}` : `Submission Returned: ${reqTitle}`,
                        content: isAccepted
                            ? `Your submission for "${reqTitle}" has been accepted by ${reviewerName}.${submission.reviewComment ? ` Note: "${submission.reviewComment}"` : ""}`
                            : `Your submission for "${reqTitle}" requires revision from ${reviewerName}.${submission.reviewComment ? ` Note: "${submission.reviewComment}"` : ""}`,
                        link,
                        isRead: false
                    }
                });
            }
        } catch (notifErr) {
            console.warn("[DataRequestService] Failed to dispatch review completed notification:", notifErr);
        }
    }

    /**
     * Dynamically generates a real external Google Form for the data request via Google Forms API.
     */
    static async createGoogleFormForRequest(
        id: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        ipAddress?: string
    ) {
        if (!actorScope || !userId) {
            throw new Error("Unauthorized: Active session required.");
        }

        const request: any = await prisma.dataRequest.findUnique({
            where: { id },
            include: {
                fields: { orderBy: { order: "asc" } },
                googleForm: true
            }
        });

        if (!request) {
            throw new Error(`Data Request with ID '${id}' not found.`);
        }

        const accessibleIds = await HierarchyScopeService.getAccessibleOrganizationIds(actorScope.id);
        if (request.createdOrganizationId !== actorScope.id && !accessibleIds.includes(request.createdOrganizationId)) {
            throw new Error("Forbidden: You do not have permission to configure Google Form for this data request.");
        }

        // Map fields for Google Forms API
        const formFields: GoogleFormFieldInput[] = request.fields.map((f: any) => ({
            id: f.id,
            label: f.label,
            fieldType: f.fieldType as any,
            required: f.required,
            description: f.description || undefined,
            options: f.options,
            order: f.order
        }));

        const googleResult = await GoogleFormsService.createGoogleForm({
            title: request.title,
            description: request.objective + (request.instructions ? `\n\nInstructions: ${request.instructions}` : ""),
            fields: formFields
        });

        // Upsert GoogleFormIntegration record
        const integration = await prisma.googleFormIntegration.upsert({
            where: { requestId: request.id },
            create: {
                requestId: request.id,
                googleFormId: googleResult.googleFormId,
                formUrl: googleResult.formUrl,
                responderUri: googleResult.responderUri,
                status: GoogleFormIntegrationStatus.ACTIVE,
                lastSyncedAt: new Date()
            },
            update: {
                googleFormId: googleResult.googleFormId,
                formUrl: googleResult.formUrl,
                responderUri: googleResult.responderUri,
                status: GoogleFormIntegrationStatus.ACTIVE,
                lastSyncedAt: new Date()
            }
        });

        // Update item IDs on individual fields if returned
        if (googleResult.fieldItemMap) {
            for (const [fieldId, itemId] of Object.entries(googleResult.fieldItemMap)) {
                try {
                    await prisma.dataRequestField.update({
                        where: { id: fieldId },
                        data: { googleItemId: itemId }
                    });
                } catch {
                    // Ignore non-blocking field ID update errors
                }
            }
        }

        // Ensure request is active
        await prisma.dataRequest.update({
            where: { id: request.id },
            data: { status: DataRequestStatus.PUBLISHED }
        });

        // Audit Logging
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: "DATA_REQUEST_GOOGLE_FORM_CREATED",
                    resource: "GoogleFormIntegration",
                    resourceId: integration.id,
                    newValue: {
                        requestId: request.id,
                        googleFormId: googleResult.googleFormId,
                        responderUri: googleResult.responderUri
                    },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[DataRequestService] AuditLog creation failed:", auditErr);
        }

        return {
            integration,
            responderUri: googleResult.responderUri,
            formUrl: googleResult.formUrl
        };
    }

    /**
     * Synchronizes live responses from Google Forms API into PostgreSQL JSONB DataRequestSubmission records.
     * Prevents duplicate submissions using external idempotency on googleResponseId.
     */
    static async syncGoogleFormResponses(
        id: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        ipAddress?: string
    ) {
        if (!actorScope || !userId) {
            throw new Error("Unauthorized: Active session required.");
        }

        const request: any = await prisma.dataRequest.findUnique({
            where: { id },
            include: {
                fields: true,
                targets: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                },
                googleForm: true
            }
        });

        if (!request) {
            throw new Error(`Data Request with ID '${id}' not found.`);
        }
        if (!request.googleForm || !request.googleForm.googleFormId) {
            throw new Error("No active Google Form integration exists for this request. Please create a Google Form first.");
        }

        const formFields: GoogleFormFieldInput[] = request.fields.map((f: any) => ({
            id: f.id,
            label: f.label,
            fieldType: f.fieldType as any,
            options: f.options
        }));

        // Fetch live responses from Google Forms API
        const googleResponses = await GoogleFormsService.syncFormResponses(request.googleForm.googleFormId, formFields);

        let createdCount = 0;
        let updatedCount = 0;

        for (const gResp of googleResponses) {
            // Match response to an organization target by looking up organization name in answers or email
            let matchedTarget = request.targets.find((t: any) => {
                const orgName = t.organization.name.toLowerCase();
                return Object.values(gResp.answers).some(ans =>
                    typeof ans === "string" && ans.toLowerCase().includes(orgName)
                );
            });

            // If not found, match to first pending target
            if (!matchedTarget) {
                matchedTarget = request.targets.find((t: any) => t.status === DataRequestTargetStatus.PENDING) || request.targets[0];
            }

            if (!matchedTarget) continue;

            const existingSubmission = await prisma.dataRequestSubmission.findFirst({
                where: {
                    OR: [
                        { googleResponseId: gResp.responseId },
                        { requestId: request.id, organizationId: matchedTarget.organizationId }
                    ]
                }
            });

            if (existingSubmission) {
                const isSameAnswers = areResponsesEqual(existingSubmission.responseData as any, gResp.answers);
                if (!isSameAnswers) {
                    await prisma.dataRequestSubmission.update({
                        where: { id: existingSubmission.id },
                        data: {
                            googleResponseId: gResp.responseId,
                            responseData: gResp.answers,
                            status: DataRequestSubmissionStatus.UNDER_REVIEW,
                            updatedAt: new Date()
                        }
                    });
                    await prisma.dataRequestTarget.update({
                        where: { id: matchedTarget.id },
                        data: { status: DataRequestTargetStatus.SUBMITTED }
                    });
                    updatedCount++;
                } else if (!existingSubmission.googleResponseId && gResp.responseId) {
                    await prisma.dataRequestSubmission.update({
                        where: { id: existingSubmission.id },
                        data: { googleResponseId: gResp.responseId }
                    });
                }
            } else {
                await prisma.dataRequestSubmission.create({
                    data: {
                        requestId: request.id,
                        organizationId: matchedTarget.organizationId,
                        googleResponseId: gResp.responseId,
                        responseData: gResp.answers,
                        status: DataRequestSubmissionStatus.UNDER_REVIEW,
                        submittedAt: new Date(gResp.lastSubmittedTime || Date.now())
                    }
                });
                await prisma.dataRequestTarget.update({
                    where: { id: matchedTarget.id },
                    data: { status: DataRequestTargetStatus.SUBMITTED }
                });
                createdCount++;
            }
        }

        // Update integration lastSyncedAt
        await prisma.googleFormIntegration.update({
            where: { id: request.googleForm.id },
            data: {
                lastSyncedAt: new Date(),
                status: GoogleFormIntegrationStatus.ACTIVE
            }
        });

        // Audit Logging
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: "DATA_REQUEST_RESPONSES_SYNCED",
                    resource: "DataRequest",
                    resourceId: request.id,
                    newValue: {
                        totalFetched: googleResponses.length,
                        createdCount,
                        updatedCount
                    },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[DataRequestService] AuditLog creation failed:", auditErr);
        }

        if (createdCount > 0 || updatedCount > 0) {
            await this.dispatchSubmissionReceivedNotification(request, { name: `${createdCount + updatedCount} unit response(s)` });
        }

        return {
            totalFetched: googleResponses.length,
            createdCount,
            updatedCount,
            lastSyncedAt: new Date()
        };
    }

    /**
     * Handles incoming real-time webhooks from Google Forms Apps Script triggers (onFormSubmit).
     * Ingests submitted answers immediately or triggers API synchronization.
     */
    static async handleGoogleFormsWebhook(requestId: string, payload: any, ipAddress?: string) {
        const request: any = await prisma.dataRequest.findUnique({
            where: { id: requestId },
            include: {
                fields: true,
                targets: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                },
                googleForm: true
            }
        });

        if (!request) {
            throw new Error(`Data Request with ID '${requestId}' not found.`);
        }

        let recorded = false;
        let matchedTarget: any = null;

        // 1. If payload contains direct answers from Google Apps Script onFormSubmit
        if (payload && (payload.answers || payload.responseData)) {
            const rawAnswers = payload.answers || payload.responseData || {};
            const googleResponseId = payload.responseId || payload.id || `webhook_${Date.now()}`;

            // Match response to organization target
            matchedTarget = request.targets.find((t: any) => {
                const orgName = t.organization.name.toLowerCase();
                return Object.values(rawAnswers).some(ans =>
                    typeof ans === "string" && ans.toLowerCase().includes(orgName)
                );
            });

            if (!matchedTarget) {
                matchedTarget = request.targets.find((t: any) => t.status === DataRequestTargetStatus.PENDING) || request.targets[0];
            }

            if (matchedTarget) {
                const existingSubmission = await prisma.dataRequestSubmission.findFirst({
                    where: {
                        OR: [
                            { googleResponseId },
                            { requestId: request.id, organizationId: matchedTarget.organizationId }
                        ]
                    }
                });

                if (existingSubmission) {
                    const isSameAnswers = areResponsesEqual(existingSubmission.responseData as any, rawAnswers);
                    if (!isSameAnswers) {
                        await prisma.dataRequestSubmission.update({
                            where: { id: existingSubmission.id },
                            data: {
                                googleResponseId,
                                responseData: rawAnswers,
                                status: DataRequestSubmissionStatus.UNDER_REVIEW,
                                updatedAt: new Date()
                            }
                        });
                        await prisma.dataRequestTarget.update({
                            where: { id: matchedTarget.id },
                            data: { status: DataRequestTargetStatus.SUBMITTED }
                        });
                    } else if (!existingSubmission.googleResponseId) {
                        await prisma.dataRequestSubmission.update({
                            where: { id: existingSubmission.id },
                            data: { googleResponseId }
                        });
                    }
                } else {
                    await prisma.dataRequestSubmission.create({
                        data: {
                            requestId: request.id,
                            organizationId: matchedTarget.organizationId,
                            googleResponseId,
                            responseData: rawAnswers,
                            status: DataRequestSubmissionStatus.UNDER_REVIEW,
                            submittedAt: new Date(payload.timestamp || Date.now())
                        }
                    });
                    await prisma.dataRequestTarget.update({
                        where: { id: matchedTarget.id },
                        data: { status: DataRequestTargetStatus.SUBMITTED }
                    });
                }

                recorded = true;
                if (matchedTarget?.organization) {
                    await this.dispatchSubmissionReceivedNotification(request, matchedTarget.organization);
                }
            }
        }

        // 2. Also trigger live API sync if Google Form integration exists and has tokens
        if (request.googleForm?.googleFormId && GoogleFormsService.hasAuthorizedTokens()) {
            try {
                const formFields: GoogleFormFieldInput[] = request.fields.map((f: any) => ({
                    id: f.id,
                    label: f.label,
                    fieldType: f.fieldType as any,
                    options: f.options
                }));

                const googleResponses = await GoogleFormsService.syncFormResponses(request.googleForm.googleFormId, formFields);
                for (const gResp of googleResponses) {
                    let target = request.targets.find((t: any) => {
                        const orgName = t.organization.name.toLowerCase();
                        return Object.values(gResp.answers).some(ans =>
                            typeof ans === "string" && ans.toLowerCase().includes(orgName)
                        );
                    });

                    if (!target) {
                        target = request.targets.find((t: any) => t.status === DataRequestTargetStatus.PENDING) || request.targets[0];
                    }

                    if (!target) continue;

                    const existingSub = await prisma.dataRequestSubmission.findFirst({
                        where: {
                            OR: [
                                { googleResponseId: gResp.responseId },
                                { requestId: request.id, organizationId: target.organizationId }
                            ]
                        }
                    });

                    if (existingSub) {
                        const isSame = JSON.stringify(existingSub.responseData || {}) === JSON.stringify(gResp.answers || {});
                        if (!isSame) {
                            await prisma.dataRequestSubmission.update({
                                where: { id: existingSub.id },
                                data: {
                                    googleResponseId: gResp.responseId,
                                    responseData: gResp.answers,
                                    status: DataRequestSubmissionStatus.UNDER_REVIEW,
                                    updatedAt: new Date()
                                }
                            });
                            await prisma.dataRequestTarget.update({
                                where: { id: target.id },
                                data: { status: DataRequestTargetStatus.SUBMITTED }
                            });
                        }
                    } else {
                        await prisma.dataRequestSubmission.create({
                            data: {
                                requestId: request.id,
                                organizationId: target.organizationId,
                                googleResponseId: gResp.responseId,
                                responseData: gResp.answers,
                                status: DataRequestSubmissionStatus.UNDER_REVIEW,
                                submittedAt: new Date(gResp.lastSubmittedTime || Date.now())
                            }
                        });
                        await prisma.dataRequestTarget.update({
                            where: { id: target.id },
                            data: { status: DataRequestTargetStatus.SUBMITTED }
                        });
                    }
                }
            } catch (syncErr) {
                console.warn("[DataRequestService] Webhook triggered sync failed:", syncErr);
            }
        }

        if (request.googleForm) {
            await prisma.googleFormIntegration.update({
                where: { id: request.googleForm.id },
                data: {
                    lastSyncedAt: new Date(),
                    status: GoogleFormIntegrationStatus.ACTIVE
                }
            });
        }

        return {
            success: true,
            recordedDirectly: recorded,
            targetOrganization: matchedTarget?.organization?.name || null
        };
    }

    /**
     * Direct submission recording (for in-app submission or manual proxy entry).
     */
    static async recordDirectSubmission(
        id: string,
        organizationId: string,
        responseData: Record<string, any>,
        userId: string,
        ipAddress?: string
    ) {
        const request: any = await prisma.dataRequest.findUnique({
            where: { id },
            include: {
                targets: { include: { organization: true } },
                createdOrganization: true
            }
        });

        if (!request) {
            throw new Error(`Data Request with ID '${id}' not found.`);
        }

        const target = request.targets.find((t: any) => t.organizationId === organizationId);
        if (!target) {
            throw new Error("Target organization is not registered for this data request.");
        }

        const submission = await prisma.dataRequestSubmission.upsert({
            where: {
                requestId_organizationId: {
                    requestId: id,
                    organizationId
                }
            },
            create: {
                requestId: id,
                organizationId,
                responseData,
                status: DataRequestSubmissionStatus.SUBMITTED,
                submittedAt: new Date()
            },
            update: {
                responseData,
                status: DataRequestSubmissionStatus.RESUBMITTED,
                submittedAt: new Date()
            }
        });

        await prisma.dataRequestTarget.update({
            where: { id: target.id },
            data: { status: DataRequestTargetStatus.SUBMITTED }
        });

        try {
            await prisma.auditLog.create({
                data: {
                    organizationId,
                    userId,
                    action: "DATA_REQUEST_SUBMISSION_CREATED",
                    resource: "DataRequestSubmission",
                    resourceId: submission.id,
                    newValue: { requestId: id, organizationId },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[DataRequestService] AuditLog creation failed:", auditErr);
        }

        // 5. In-app notification to data request creator
        const targetOrg = await prisma.organizationUnit.findUnique({
            where: { id: organizationId },
            select: { id: true, name: true }
        });
        await this.dispatchSubmissionReceivedNotification(request, targetOrg || { id: organizationId });

        return submission;
    }

    /**
     * Reviews a submission (Accepts or Returns with comment for revision).
     */
    static async reviewSubmission(
        submissionId: string,
        input: ReviewSubmissionInput,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        ipAddress?: string
    ) {
        if (!actorScope || !userId) {
            throw new Error("Unauthorized: Active session required.");
        }

        const submission = await prisma.dataRequestSubmission.findUnique({
            where: { id: submissionId },
            include: {
                request: { include: { createdOrganization: true } },
                organization: { select: { id: true, name: true } }
            }
        });

        if (!submission) {
            throw new Error(`Submission with ID '${submissionId}' not found.`);
        }

        const isCreator = submission.request.createdOrganizationId === actorScope.id;
        if (!isCreator) {
            throw new Error("Forbidden: You do not have permission to review this submission.");
        }

        const isAccepted = String(input.status || "").toUpperCase() === "ACCEPTED";
        const newStatus = isAccepted
            ? DataRequestSubmissionStatus.ACCEPTED
            : DataRequestSubmissionStatus.RETURNED;

        const updatedSubmission = await prisma.dataRequestSubmission.update({
            where: { id: submissionId },
            data: {
                status: newStatus,
                reviewedAt: new Date(),
                reviewedById: userId,
                reviewComment: input.reviewComment?.trim() || null
            }
        });

        const targetStatus = isAccepted
            ? DataRequestTargetStatus.ACCEPTED
            : DataRequestTargetStatus.RETURNED;

        await prisma.dataRequestTarget.updateMany({
            where: {
                requestId: submission.requestId,
                organizationId: submission.organizationId
            },
            data: { status: targetStatus }
        });

        // In-app notification to respondent administrators
        await this.dispatchReviewCompletedNotification({
            ...updatedSubmission,
            request: submission.request
        }, actorScope);

        // Audit Logging
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: isAccepted ? "DATA_REQUEST_SUBMISSION_ACCEPTED" : "DATA_REQUEST_SUBMISSION_RETURNED",
                    resource: "DataRequestSubmission",
                    resourceId: submission.id,
                    newValue: {
                        requestId: submission.requestId,
                        organizationId: submission.organizationId,
                        status: newStatus,
                        reviewComment: input.reviewComment
                    },
                    ipAddress
                }
            });
        } catch (auditErr) {
            console.warn("[DataRequestService] AuditLog creation failed:", auditErr);
        }

        return updatedSubmission;
    }

    /**
     * Lists data requests accessible within actor's scope (created by actor + targeted to actor).
     */
    static async getDataRequestsForScope(
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        queryOptions?: {
            status?: DataRequestStatus;
            priority?: DataRequestPriority;
            search?: string;
        }
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }

        const requests = await prisma.dataRequest.findMany({
            where: {
                OR: [
                    { createdOrganizationId: actorScope.id },
                    { targets: { some: { organizationId: actorScope.id } } }
                ],
                ...(queryOptions?.status ? { status: queryOptions.status } : {}),
                ...(queryOptions?.priority ? { priority: queryOptions.priority } : {})
            },
            include: {
                createdOrganization: { select: { id: true, name: true, type: true } },
                creator: { select: { id: true, name: true, email: true } },
                googleForm: true,
                fields: { orderBy: { order: "asc" } },
                targets: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                },
                submissions: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        let filtered = requests;
        if (queryOptions?.search && queryOptions.search.trim()) {
            const q = queryOptions.search.trim().toLowerCase();
            filtered = requests.filter(r =>
                r.title.toLowerCase().includes(q) ||
                (r.description && r.description.toLowerCase().includes(q)) ||
                r.objective.toLowerCase().includes(q)
            );
        }

        return filtered.map(r => {
            const totalTargets = r.targets.length;
            const submittedCount = r.targets.filter(t =>
                t.status === DataRequestTargetStatus.SUBMITTED ||
                t.status === DataRequestTargetStatus.ACCEPTED
            ).length;
            const acceptedCount = r.targets.filter(t => t.status === DataRequestTargetStatus.ACCEPTED).length;
            const completionRate = totalTargets > 0 ? Math.round((submittedCount / totalTargets) * 100) : 0;

            const myTarget = r.targets.find(t => t.organizationId === actorScope.id);
            const mySubmission = r.submissions.find(s => s.organizationId === actorScope.id);

            return {
                ...r,
                isCreatedByMe: r.createdOrganizationId === actorScope.id,
                totalTargets,
                submittedCount,
                acceptedCount,
                completionRate,
                myTargetStatus: myTarget?.status || null,
                mySubmission: mySubmission || null,
                googleResponderUri: r.googleForm?.responderUri || null,
                googleFormEditUrl: r.googleForm?.formUrl || null
            };
        });
    }

    /**
     * Retrieves full single data request details including fields, target ledger, and consolidated submissions.
     */
    static async getDataRequestById(
        id: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }

        // Auto-sync Google Form responses if integrated
        try {
            const hasIntegration = await prisma.googleFormIntegration.findUnique({
                where: { requestId: id }
            });
            if (hasIntegration?.googleFormId && GoogleFormsService.hasAuthorizedTokens()) {
                await this.syncGoogleFormResponses(id, actorScope, userId);
            }
        } catch (syncErr: any) {
            console.warn("[DataRequestService] Auto-sync on detail load note:", syncErr?.message);
        }

        const request: any = await prisma.dataRequest.findUnique({
            where: { id },
            include: {
                createdOrganization: { select: { id: true, name: true, type: true } },
                creator: { select: { id: true, name: true, email: true } },
                googleForm: true,
                fields: { orderBy: { order: "asc" } },
                targets: {
                    include: {
                        organization: {
                            select: { id: true, name: true, type: true, parentId: true }
                        }
                    },
                    orderBy: { createdAt: "asc" }
                },
                submissions: {
                    include: {
                        organization: { select: { id: true, name: true, type: true } },
                        reviewedBy: { select: { id: true, name: true, email: true } }
                    },
                    orderBy: { submittedAt: "desc" }
                }
            }
        });

        if (!request) {
            throw new Error(`Data Request with ID '${id}' not found.`);
        }

        const isTargeted = request.targets.some((t: any) => t.organizationId === actorScope.id);
        const isCreator = request.createdOrganizationId === actorScope.id;

        if (!isCreator && !isTargeted) {
            throw new Error("Forbidden: You do not have access to view this data request.");
        }

        const totalTargets = request.targets.length;
        const submittedCount = request.targets.filter((t: any) =>
            t.status === DataRequestTargetStatus.SUBMITTED ||
            t.status === DataRequestTargetStatus.ACCEPTED
        ).length;
        const acceptedCount = request.targets.filter((t: any) => t.status === DataRequestTargetStatus.ACCEPTED).length;
        const completionRate = totalTargets > 0 ? Math.round((submittedCount / totalTargets) * 100) : 0;

        const myTarget = request.targets.find((t: any) => t.organizationId === actorScope.id);
        const mySubmission = request.submissions.find((s: any) => s.organizationId === actorScope.id);

        return {
            ...request,
            isCreatedByMe: request.createdOrganizationId === actorScope.id,
            totalTargets,
            submittedCount,
            acceptedCount,
            completionRate,
            myTargetStatus: myTarget?.status || null,
            mySubmission: mySubmission || null,
            googleResponderUri: request.googleForm?.responderUri || null,
            googleFormEditUrl: request.googleForm?.formUrl || null
        };
    }
}
