import { prisma } from "../../infrastructure/prisma/client.js";
import {
    DirectiveType,
    DirectivePriority,
    DirectiveStatus,
    OrganizationUnitType
} from "../../generated/prisma/client.js";
import { HierarchyScopeService } from "../hierarchy/hierarchy-scope.service.js";

export interface CreateDirectiveInput {
    title: string;
    type?: DirectiveType;
    code?: string;
    category?: string;
    priority?: DirectivePriority;
    content: string;
    issueDate?: string | Date;
    effectiveDate?: string | Date;
    deadline?: string | Date | null;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    isAcknowledgmentRequired?: boolean;
    targetLevelAll?: boolean;
    targetLevels?: string[]; // ["REGION", "ZONE", "WOREDA", "SCHOOL"]
    targetOrganizationUnitIds?: string[];
    cascadeDescendants?: boolean;
}

export class DirectiveService {
    /**
     * Creates and publishes a National Policy or Directive.
     * Only Federal Administrators can issue National Policies & Directives.
     */
    static async createAndPublishDirective(
        input: CreateDirectiveInput,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        ipAddress?: string
    ) {
        // 1. Verify Federal Authority
        if (!actorScope || actorScope.type !== "FEDERAL") {
            throw new Error("Forbidden: Only Federal administrators can issue National Policies & Directives.");
        }

        // 2. Validate required inputs
        if (!input.title || !input.title.trim()) {
            throw new Error("Directive title is required.");
        }
        if (!input.content || !input.content.trim()) {
            throw new Error("Directive content/description is required.");
        }

        const type = input.type || DirectiveType.DIRECTIVE;
        const priority = input.priority || DirectivePriority.NORMAL;
        const status = DirectiveStatus.PUBLISHED;
        const issueDate = input.issueDate ? new Date(input.issueDate) : new Date();
        const effectiveDate = input.effectiveDate ? new Date(input.effectiveDate) : new Date();
        const deadline = input.deadline ? new Date(input.deadline) : null;
        const targetLevelAll = input.targetLevelAll !== undefined ? input.targetLevelAll : true;
        const targetLevels = input.targetLevels || [];
        const cascadeDescendants = input.cascadeDescendants !== undefined ? input.cascadeDescendants : true;
        const targetUnitIds = input.targetOrganizationUnitIds || [];

        // 3. Create the National Directive record
        const directive = await prisma.nationalDirective.create({
            data: {
                issuerOrganizationId: actorScope.id,
                authorId: userId,
                title: input.title.trim(),
                code: input.code?.trim() || null,
                type,
                category: input.category?.trim() || null,
                priority,
                status,
                content: input.content.trim(),
                issueDate,
                effectiveDate,
                deadline,
                attachmentUrl: input.attachmentUrl?.trim() || null,
                attachmentName: input.attachmentName?.trim() || null,
                isAcknowledgmentRequired: !!input.isAcknowledgmentRequired,
                targetLevelAll,
                targetLevels,
                cascadeDescendants
            }
        });

        // 4. Save specific targeted units if provided
        if (targetUnitIds.length > 0) {
            await prisma.directiveTargetUnit.createMany({
                data: targetUnitIds.map(unitId => ({
                    directiveId: directive.id,
                    organizationId: unitId
                })),
                skipDuplicates: true
            });
        }

        // 5. Resolve all eligible recipient organization units
        const allUnits = await prisma.organizationUnit.findMany({
            select: { id: true, name: true, type: true, parentId: true }
        });

        const nonFederalUnits = allUnits.filter(u => u.type !== "FEDERAL");
        const recipientUnitIds = new Set<string>();

        if (targetUnitIds.length === 0 && targetLevelAll) {
            // Applies to all units matching targetLevels (or all non-federal units if targetLevels is empty)
            for (const unit of nonFederalUnits) {
                if (targetLevels.length === 0 || targetLevels.includes(unit.type)) {
                    recipientUnitIds.add(unit.id);
                }
            }
        } else {
            // Targeted specific units
            for (const unitId of targetUnitIds) {
                const targetUnit = allUnits.find(u => u.id === unitId);
                if (!targetUnit) continue;

                if (targetLevels.length === 0 || targetLevels.includes(targetUnit.type)) {
                    recipientUnitIds.add(targetUnit.id);
                }

                if (cascadeDescendants) {
                    // Traverse and add all child descendants
                    const queue = [targetUnit.id];
                    while (queue.length > 0) {
                        const currentId = queue.shift()!;
                        const children = allUnits.filter(u => u.parentId === currentId);
                        for (const child of children) {
                            if (targetLevels.length === 0 || targetLevels.includes(child.type)) {
                                recipientUnitIds.add(child.id);
                            }
                            queue.push(child.id);
                        }
                    }
                }
            }
        }

        // 6. Initialize DirectiveAcknowledgment / delivery tracking records
        if (recipientUnitIds.size > 0) {
            const ackRecords = Array.from(recipientUnitIds).map(orgId => ({
                directiveId: directive.id,
                organizationId: orgId,
                isRead: false,
                isAcknowledged: false
            }));

            await prisma.directiveAcknowledgment.createMany({
                data: ackRecords,
                skipDuplicates: true
            });
        }

        // 7. Dispatch in-app notifications to all assigned administrators across recipient units
        let notificationsCount = 0;
        if (recipientUnitIds.size > 0) {
            try {
                const roleAssignments = await prisma.roleAssignment.findMany({
                    where: {
                        scopeId: { in: Array.from(recipientUnitIds) }
                    },
                    select: { userId: true, scopeId: true }
                });

                const notifMap = new Map<string, { userId: string; organizationId: string }>();
                for (const ra of roleAssignments) {
                    const key = `${ra.userId}_${ra.scopeId}`;
                    if (!notifMap.has(key)) {
                        notifMap.set(key, { userId: ra.userId, organizationId: ra.scopeId });
                    }
                }

                if (notifMap.size > 0) {
                    const notifResult = await prisma.notification.createMany({
                        data: Array.from(notifMap.values()).map(item => ({
                            userId: item.userId,
                            organizationId: item.organizationId,
                            title: `National ${type}: ${directive.title}`,
                            content: `Priority: ${priority}. Effective: ${effectiveDate.toLocaleDateString()}.${input.isAcknowledgmentRequired ? " Acknowledgment required." : ""}`,
                            link: `/dashboard/directives`,
                            isRead: false
                        })),
                        skipDuplicates: true
                    });
                    notificationsCount = notifResult.count;
                }
            } catch (err) {
                console.error("Failed to create in-app notifications for directive:", err);
            }
        }

        // 8. Audit log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: "NATIONAL_DIRECTIVE_PUBLISHED",
                    resource: "NATIONAL_DIRECTIVE",
                    resourceId: directive.id,
                    newValue: {
                        title: directive.title,
                        type: directive.type,
                        priority: directive.priority,
                        recipientsCount: recipientUnitIds.size,
                        notificationsCount
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch {
            // Ignore audit failure
        }

        return {
            ...directive,
            recipientsCount: recipientUnitIds.size,
            notificationsCount
        };
    }

    /**
     * Retrieves directives applicable to the actor's scope.
     * - Federal Admin sees all issued directives with overall delivery/read/acknowledgment metrics.
     * - Lower levels (Region, Zone, Woreda, School) see directives specifically targeted to them or cascaded to them.
     */
    static async getDirectivesForScope(
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        queryOptions?: {
            type?: DirectiveType;
            priority?: DirectivePriority;
            search?: string;
        }
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }

        if (actorScope.type === "FEDERAL") {
            // Federal view: all directives issued
            const directives = await prisma.nationalDirective.findMany({
                where: {
                    ...(queryOptions?.type ? { type: queryOptions.type } : {}),
                    ...(queryOptions?.priority ? { priority: queryOptions.priority } : {}),
                    ...(queryOptions?.search
                        ? {
                              OR: [
                                  { title: { contains: queryOptions.search, mode: "insensitive" } },
                                  { content: { contains: queryOptions.search, mode: "insensitive" } },
                                  { code: { contains: queryOptions.search, mode: "insensitive" } }
                              ]
                          }
                        : {})
                },
                include: {
                    issuerOrganization: { select: { id: true, name: true, type: true } },
                    author: { select: { id: true, name: true, email: true } },
                    targetOrganizationUnits: {
                        include: { organization: { select: { id: true, name: true, type: true } } }
                    },
                    _count: {
                        select: {
                            acknowledgments: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            });

            // Calculate read & acknowledged rollups for each directive
            const directivesWithStats = await Promise.all(
                directives.map(async d => {
                    const [readCount, acknowledgedCount] = await Promise.all([
                        prisma.directiveAcknowledgment.count({
                            where: { directiveId: d.id, isRead: true }
                        }),
                        prisma.directiveAcknowledgment.count({
                            where: { directiveId: d.id, isAcknowledged: true }
                        })
                    ]);

                    return {
                        ...d,
                        totalRecipients: d._count.acknowledgments,
                        readCount,
                        acknowledgedCount
                    };
                })
            );

            return directivesWithStats;
        }

        // Lower-level recipient view (REGION, ZONE, WOREDA, SCHOOL)
        const lineage = await HierarchyScopeService.getLineage(actorScope.id);
        const ancestorIds = lineage.map(u => u.id); // [unit, parent, grandParent, ..., federal]

        // Find all published directives that apply to this unit or any of its ancestors
        const allPublishedDirectives = await prisma.nationalDirective.findMany({
            where: {
                status: DirectiveStatus.PUBLISHED,
                ...(queryOptions?.type ? { type: queryOptions.type } : {}),
                ...(queryOptions?.priority ? { priority: queryOptions.priority } : {})
            },
            include: {
                issuerOrganization: { select: { id: true, name: true, type: true } },
                author: { select: { id: true, name: true, email: true } },
                targetOrganizationUnits: true,
                acknowledgments: {
                    where: { organizationId: actorScope.id }
                }
            },
            orderBy: { effectiveDate: "desc" }
        });

        // Filter strictly by target scoping
        const applicableDirectives = allPublishedDirectives.filter(d => {
            const matchesLevel = d.targetLevels.length === 0 || d.targetLevels.includes(actorScope.type);
            const targetedUnitIds = d.targetOrganizationUnits.map(t => t.organizationId);

            if (d.targetLevelAll && targetedUnitIds.length === 0) {
                return matchesLevel;
            }

            if (targetedUnitIds.includes(actorScope.id)) {
                return matchesLevel;
            }

            if (d.cascadeDescendants) {
                const targetedAncestor = targetedUnitIds.some(tId => ancestorIds.includes(tId));
                if (targetedAncestor && matchesLevel) {
                    return true;
                }
            }

            return false;
        });

        // Ensure acknowledgment record exists for tracking and format result
        const results = await Promise.all(
            applicableDirectives.map(async d => {
                let userAck = d.acknowledgments[0];
                if (!userAck) {
                    userAck = await prisma.directiveAcknowledgment.upsert({
                        where: {
                            directiveId_organizationId: {
                                directiveId: d.id,
                                organizationId: actorScope.id
                            }
                        },
                        create: {
                            directiveId: d.id,
                            organizationId: actorScope.id,
                            isRead: false,
                            isAcknowledged: false
                        },
                        update: {}
                    });
                }

                return {
                    id: d.id,
                    title: d.title,
                    code: d.code,
                    type: d.type,
                    category: d.category,
                    priority: d.priority,
                    status: d.status,
                    content: d.content,
                    issueDate: d.issueDate,
                    effectiveDate: d.effectiveDate,
                    deadline: d.deadline,
                    attachmentUrl: d.attachmentUrl,
                    attachmentName: d.attachmentName,
                    isAcknowledgmentRequired: d.isAcknowledgmentRequired,
                    targetLevels: d.targetLevels,
                    cascadeDescendants: d.cascadeDescendants,
                    issuer: {
                        id: d.issuerOrganization.id,
                        name: d.issuerOrganization.name,
                        type: d.issuerOrganization.type,
                        authorName: d.author.name
                    },
                    userAcknowledgment: {
                        isRead: userAck.isRead,
                        readAt: userAck.readAt,
                        isAcknowledged: userAck.isAcknowledged,
                        acknowledgedAt: userAck.acknowledgedAt,
                        acknowledgmentNotes: userAck.acknowledgmentNotes
                    }
                };
            })
        );

        if (queryOptions?.search && queryOptions.search.trim()) {
            const q = queryOptions.search.toLowerCase();
            return results.filter(
                r =>
                    r.title.toLowerCase().includes(q) ||
                    r.content.toLowerCase().includes(q) ||
                    (r.code && r.code.toLowerCase().includes(q))
            );
        }

        return results;
    }

    /**
     * Gets a single directive by ID and tracks read status for recipient.
     */
    static async getDirectiveById(
        directiveId: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId?: string
    ) {
        const directive = await prisma.nationalDirective.findUnique({
            where: { id: directiveId },
            include: {
                issuerOrganization: { select: { id: true, name: true, type: true } },
                author: { select: { id: true, name: true, email: true } },
                targetOrganizationUnits: {
                    include: { organization: { select: { id: true, name: true, type: true } } }
                }
            }
        });

        if (!directive) {
            throw new Error(`Directive with ID '${directiveId}' not found.`);
        }

        // Validate scope visibility
        if (actorScope && actorScope.type !== "FEDERAL") {
            const lineage = await HierarchyScopeService.getLineage(actorScope.id);
            const ancestorIds = lineage.map(u => u.id);
            const targetedUnitIds = directive.targetOrganizationUnits.map(t => t.organizationId);
            const matchesLevel = directive.targetLevels.length === 0 || directive.targetLevels.includes(actorScope.type);

            let isAllowed = false;
            if (directive.targetLevelAll && targetedUnitIds.length === 0 && matchesLevel) {
                isAllowed = true;
            } else if (targetedUnitIds.includes(actorScope.id) && matchesLevel) {
                isAllowed = true;
            } else if (directive.cascadeDescendants && targetedUnitIds.some(tId => ancestorIds.includes(tId)) && matchesLevel) {
                isAllowed = true;
            }

            if (!isAllowed) {
                throw new Error("Forbidden: You do not have permission to view this directive.");
            }

            // Auto-mark as read
            await prisma.directiveAcknowledgment.upsert({
                where: {
                    directiveId_organizationId: {
                        directiveId: directive.id,
                        organizationId: actorScope.id
                    }
                },
                create: {
                    directiveId: directive.id,
                    organizationId: actorScope.id,
                    userId: userId || null,
                    isRead: true,
                    readAt: new Date(),
                    isAcknowledged: false
                },
                update: {
                    isRead: true,
                    readAt: new Date(),
                    ...(userId ? { userId } : {})
                }
            });
        }

        // For Federal view, load recipient acknowledgment summary
        let tracking = null;
        if (actorScope?.type === "FEDERAL") {
            const acknowledgments = await prisma.directiveAcknowledgment.findMany({
                where: { directiveId },
                include: {
                    organization: { select: { id: true, name: true, type: true, parentId: true } },
                    user: { select: { id: true, name: true, email: true } }
                },
                orderBy: { organization: { name: "asc" } }
            });

            tracking = {
                totalRecipients: acknowledgments.length,
                readCount: acknowledgments.filter(a => a.isRead).length,
                acknowledgedCount: acknowledgments.filter(a => a.isAcknowledged).length,
                recipients: acknowledgments.map(a => ({
                    organizationId: a.organization.id,
                    organizationName: a.organization.name,
                    organizationType: a.organization.type,
                    isRead: a.isRead,
                    readAt: a.readAt,
                    isAcknowledged: a.isAcknowledged,
                    acknowledgedAt: a.acknowledgedAt,
                    acknowledgedBy: a.user ? { name: a.user.name, email: a.user.email } : null,
                    notes: a.acknowledgmentNotes
                }))
            };
        }

        // Get current user's acknowledgment record
        let userAcknowledgment = null;
        if (actorScope) {
            const ack = await prisma.directiveAcknowledgment.findUnique({
                where: {
                    directiveId_organizationId: {
                        directiveId,
                        organizationId: actorScope.id
                    }
                }
            });
            if (ack) {
                userAcknowledgment = {
                    isRead: ack.isRead,
                    readAt: ack.readAt,
                    isAcknowledged: ack.isAcknowledged,
                    acknowledgedAt: ack.acknowledgedAt,
                    acknowledgmentNotes: ack.acknowledgmentNotes
                };
            }
        }

        return {
            ...directive,
            userAcknowledgment,
            tracking
        };
    }

    /**
     * Acknowledges a directive on behalf of the actor's organization unit.
     */
    static async acknowledgeDirective(
        directiveId: string,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        notes?: string,
        ipAddress?: string
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Active organization scope is required.");
        }

        // Verify directive exists and is published
        const directive = await prisma.nationalDirective.findUnique({
            where: { id: directiveId },
            include: { targetOrganizationUnits: true }
        });

        if (!directive || directive.status !== DirectiveStatus.PUBLISHED) {
            throw new Error("Directive not found or not published.");
        }

        // Verify scope access
        if (actorScope.type !== "FEDERAL") {
            const lineage = await HierarchyScopeService.getLineage(actorScope.id);
            const ancestorIds = lineage.map(u => u.id);
            const targetedUnitIds = directive.targetOrganizationUnits.map(t => t.organizationId);
            const matchesLevel = directive.targetLevels.length === 0 || directive.targetLevels.includes(actorScope.type);

            let isAllowed = false;
            if (directive.targetLevelAll && targetedUnitIds.length === 0 && matchesLevel) {
                isAllowed = true;
            } else if (targetedUnitIds.includes(actorScope.id) && matchesLevel) {
                isAllowed = true;
            } else if (directive.cascadeDescendants && targetedUnitIds.some(tId => ancestorIds.includes(tId)) && matchesLevel) {
                isAllowed = true;
            }

            if (!isAllowed) {
                throw new Error("Forbidden: You do not have permission to acknowledge this directive.");
            }
        }

        const now = new Date();
        const ack = await prisma.directiveAcknowledgment.upsert({
            where: {
                directiveId_organizationId: {
                    directiveId,
                    organizationId: actorScope.id
                }
            },
            create: {
                directiveId,
                organizationId: actorScope.id,
                userId,
                isRead: true,
                readAt: now,
                isAcknowledged: true,
                acknowledgedAt: now,
                acknowledgmentNotes: notes?.trim() || null
            },
            update: {
                userId,
                isRead: true,
                readAt: now,
                isAcknowledged: true,
                acknowledgedAt: now,
                acknowledgmentNotes: notes?.trim() || null
            }
        });

        // Audit log
        try {
            await prisma.auditLog.create({
                data: {
                    organizationId: actorScope.id,
                    userId,
                    action: "NATIONAL_DIRECTIVE_ACKNOWLEDGED",
                    resource: "NATIONAL_DIRECTIVE",
                    resourceId: directiveId,
                    newValue: {
                        directiveTitle: directive.title,
                        acknowledgedAt: now,
                        notes: notes?.trim() || null
                    },
                    ipAddress: ipAddress || null
                }
            });
        } catch {
            // Ignore audit failure
        }

        return {
            success: true,
            message: "Directive acknowledged successfully.",
            data: ack
        };
    }
}
