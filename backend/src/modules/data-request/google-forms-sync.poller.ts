import { prisma } from "../../infrastructure/prisma/client.js";
import { GoogleFormsService, GoogleFormFieldInput } from "./google-forms.service.js";
import { areResponsesEqual } from "./data-request.service.js";
import { DataRequestTargetStatus, DataRequestSubmissionStatus, GoogleFormIntegrationStatus } from "../../generated/prisma/client.js";

/**
 * Background Sync Poller for Google Forms Integration.
 * Automatically polls all active Data Requests with linked Google Forms every 30 seconds.
 * Ingests new submissions and updates targets dynamically with zero manual intervention.
 */
export class GoogleFormsSyncPoller {
    private static intervalId: NodeJS.Timeout | null = null;
    private static isRunning = false;

    /**
     * Starts the automated background polling loop.
     * @param intervalMs Polling interval in milliseconds (default: 30 seconds)
     */
    static startPolling(intervalMs: number = 30000) {
        if (this.intervalId) {
            console.log("[GoogleFormsSyncPoller] Already running.");
            return;
        }

        console.log(`[GoogleFormsSyncPoller] Starting automated background poller (every ${intervalMs / 1000}s)...`);

        // Run an initial sync cycle after 5 seconds
        setTimeout(() => {
            this.syncAllActiveForms().catch(err => {
                console.warn("[GoogleFormsSyncPoller] Initial sync cycle warning:", err?.message);
            });
        }, 5000);

        // Schedule periodic sync
        this.intervalId = setInterval(async () => {
            if (this.isRunning) return; // Prevent overlapping runs
            this.isRunning = true;
            try {
                await this.syncAllActiveForms();
            } catch (err: any) {
                console.warn("[GoogleFormsSyncPoller] Polling cycle error:", err?.message);
            } finally {
                this.isRunning = false;
            }
        }, intervalMs);
    }

    /**
     * Stops the background poller.
     */
    static stopPolling() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log("[GoogleFormsSyncPoller] Stopped background poller.");
        }
    }

    /**
     * Polls and synchronizes all published Data Requests with active Google Forms.
     */
    static async syncAllActiveForms() {
        if (!GoogleFormsService.hasAuthorizedTokens()) {
            return;
        }

        const activeRequests: any[] = await prisma.dataRequest.findMany({
            where: {
                status: "PUBLISHED",
                googleForm: { isNot: null }
            },
            include: {
                fields: true,
                targets: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                },
                googleForm: true
            }
        });

        if (!activeRequests || activeRequests.length === 0) {
            return;
        }

        for (const request of activeRequests) {
            if (!request.googleForm?.googleFormId) continue;

            try {
                const formFields: GoogleFormFieldInput[] = request.fields.map((f: any) => ({
                    id: f.id,
                    label: f.label,
                    fieldType: f.fieldType as any,
                    options: f.options
                }));

                const googleResponses = await GoogleFormsService.syncFormResponses(
                    request.googleForm.googleFormId,
                    formFields
                );

                if (!googleResponses || googleResponses.length === 0) continue;

                let newCount = 0;
                for (const gResp of googleResponses) {
                    // Match respondent to organization unit target
                    let matchedTarget = request.targets.find((t: any) => {
                        const orgName = t.organization?.name?.toLowerCase();
                        if (!orgName) return false;
                        return Object.values(gResp.answers).some(ans =>
                            typeof ans === "string" && ans.toLowerCase().includes(orgName)
                        );
                    });

                    // Fallback to first pending target if not matched by name
                    if (!matchedTarget) {
                        matchedTarget = request.targets.find((t: any) => t.status === DataRequestTargetStatus.PENDING) || request.targets[0];
                    }

                    if (!matchedTarget) continue;

                    const existingSub = await prisma.dataRequestSubmission.findFirst({
                        where: {
                            OR: [
                                { googleResponseId: gResp.responseId },
                                { requestId: request.id, organizationId: matchedTarget.organizationId }
                            ]
                        }
                    });

                    if (existingSub) {
                        const isSameAnswers = areResponsesEqual(existingSub.responseData as any, gResp.answers);
                        if (!isSameAnswers) {
                            // Answers were updated/resubmitted by the respondent
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
                                where: { id: matchedTarget.id },
                                data: { status: DataRequestTargetStatus.SUBMITTED }
                            });
                        } else if (!existingSub.googleResponseId && gResp.responseId) {
                            // Only link googleResponseId if it wasn't linked yet, preserve current status
                            await prisma.dataRequestSubmission.update({
                                where: { id: existingSub.id },
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
                        newCount++;
                    }
                }

                // Update GoogleFormIntegration status & timestamp
                await prisma.googleFormIntegration.update({
                    where: { id: request.googleForm.id },
                    data: {
                        lastSyncedAt: new Date(),
                        status: GoogleFormIntegrationStatus.ACTIVE
                    }
                });

                if (newCount > 0) {
                    console.log(`[GoogleFormsSyncPoller] Auto-synced ${newCount} new submission(s) for Data Request "${request.title}" (${request.id})`);
                }
            } catch (formErr: any) {
                console.warn(`[GoogleFormsSyncPoller] Error syncing form ${request.googleForm.googleFormId} for request "${request.title}":`, formErr?.message);
            }
        }
    }
}
