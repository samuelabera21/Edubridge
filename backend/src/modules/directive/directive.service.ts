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
     * Creates and publishes a Directive or Announcement from an Administrative Authority (Federal, Region, Zone, Woreda).
     */
    static async createAndPublishDirective(
        input: CreateDirectiveInput,
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null,
        userId: string,
        ipAddress?: string
    ) {
        // 1. Verify Authority
        if (!actorScope || !["FEDERAL", "REGION", "ZONE", "WOREDA"].includes(actorScope.type)) {
            throw new Error("Forbidden: Only administrative authorities can issue policies, directives, or announcements.");
        }

        // 2. Validate required inputs
        if (!input.title || !input.title.trim()) {
            throw new Error("Announcement title is required.");
        }
        if (!input.content || !input.content.trim()) {
            throw new Error("Announcement content/details are required.");
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

        // 3. Create the Directive record
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

        // Find all descendants of the actor's scope
        const descendantUnitIds = new Set<string>();
        if (actorScope.type === "FEDERAL") {
            for (const u of allUnits) {
                if (u.type !== "FEDERAL") descendantUnitIds.add(u.id);
            }
        } else {
            const queue = [actorScope.id];
            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const children = allUnits.filter(u => u.parentId === currentId);
                for (const child of children) {
                    descendantUnitIds.add(child.id);
                    queue.push(child.id);
                }
            }
        }

        const recipientUnitIds = new Set<string>();

        if (targetUnitIds.length === 0 && targetLevelAll) {
            // Applies to all descendants matching targetLevels (or all descendants if targetLevels is empty)
            for (const unitId of descendantUnitIds) {
                const unit = allUnits.find(u => u.id === unitId);
                if (!unit) continue;
                if (targetLevels.length === 0 || targetLevels.includes(unit.type)) {
                    recipientUnitIds.add(unit.id);
                }
            }
        } else {
            // Targeted specific units within the actor's jurisdiction
            for (const unitId of targetUnitIds) {
                const targetUnit = allUnits.find(u => u.id === unitId);
                if (!targetUnit) continue;

                if (targetLevels.length === 0 || targetLevels.includes(targetUnit.type)) {
                    recipientUnitIds.add(targetUnit.id);
                }

                if (cascadeDescendants) {
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
                    const notifPrefix = actorScope.type === "FEDERAL" ? "National" : `${actorScope.name}`;
                    const notifResult = await prisma.notification.createMany({
                        data: Array.from(notifMap.values()).map(item => ({
                            userId: item.userId,
                            organizationId: item.organizationId,
                            title: `${notifPrefix} Announcement: ${directive.title}`,
                            content: `Effective: ${effectiveDate.toLocaleDateString()}.${input.isAcknowledgmentRequired ? " Acknowledgment required." : ""}`,
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
                    action: "ANNOUNCEMENT_PUBLISHED",
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
     * Retrieves directives and announcements applicable to the actor's scope.
     * - Federal Admin sees all issued directives with overall delivery/read/acknowledgment metrics.
     * - Region/Zone/Woreda sees:
     *     1. Directives/Announcements issued by their unit (with delivery & acknowledgment statistics)
     *     2. Incoming Directives/Announcements cascaded from higher tiers (with user acknowledgment status)
     * - School sees announcements targeted/cascaded to it.
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
                        isIssuedByMe: true,
                        totalRecipients: d._count.acknowledgments,
                        readCount,
                        acknowledgedCount
                    };
                })
            );

            return directivesWithStats;
        }

        // 1. Directives issued by this organization unit (e.g. Regional Bureau)
        const issuedDirectives = await prisma.nationalDirective.findMany({
            where: {
                issuerOrganizationId: actorScope.id,
                ...(queryOptions?.type ? { type: queryOptions.type } : {}),
                ...(queryOptions?.priority ? { priority: queryOptions.priority } : {})
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

        const issuedWithStats = await Promise.all(
            issuedDirectives.map(async d => {
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
                    isIssuedByMe: true,
                    totalRecipients: d._count.acknowledgments,
                    readCount,
                    acknowledgedCount,
                    targetLevels: d.targetLevels,
                    cascadeDescendants: d.cascadeDescendants
                };
            })
        );

        // 2. Incoming Directives cascaded from higher tiers
        const lineage = await HierarchyScopeService.getLineage(actorScope.id);
        const ancestorIds = lineage.map(u => u.id); // [unit, parent, grandParent, ..., federal]

        const incomingDirectives = await prisma.nationalDirective.findMany({
            where: {
                issuerOrganizationId: { not: actorScope.id },
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
        const applicableIncoming = incomingDirectives.filter(d => {
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

        // Ensure acknowledgment record exists for incoming items
        const incomingFormatted = await Promise.all(
            applicableIncoming.map(async d => {
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
                    isIssuedByMe: false,
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

        let combined = [...issuedWithStats, ...incomingFormatted];

        if (queryOptions?.search && queryOptions.search.trim()) {
            const q = queryOptions.search.toLowerCase();
            combined = combined.filter(
                (r: any) =>
                    r.title.toLowerCase().includes(q) ||
                    r.content.toLowerCase().includes(q) ||
                    (r.code && r.code.toLowerCase().includes(q))
            );
        }

        return combined;
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

        const isIssuer = actorScope && (actorScope.id === directive.issuerOrganizationId || actorScope.type === "FEDERAL");

        // Validate scope visibility if not the issuer
        if (!isIssuer && actorScope) {
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

        // For Issuer (Federal or Regional issuer), load recipient acknowledgment summary
        let tracking = null;
        if (isIssuer) {
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
     * Returns subordinate hierarchy tree (Zones -> Woredas -> Schools) for targeted audience selection.
     */
    static async getGovernanceRecipientsHierarchy(
        actorScope: { id: string; type: OrganizationUnitType; name: string } | null
    ) {
        if (!actorScope) {
            throw new Error("Unauthorized: Organization scope is required.");
        }

        if (actorScope.type === "REGION") {
            const zones = await prisma.organizationUnit.findMany({
                where: { parentId: actorScope.id, type: "ZONE" },
                select: {
                    id: true,
                    name: true,
                    children: {
                        where: { type: "WOREDA" },
                        select: {
                            id: true,
                            name: true,
                            children: {
                                where: { type: "SCHOOL" },
                                select: {
                                    id: true,
                                    name: true
                                },
                                orderBy: { name: "asc" }
                            }
                        },
                        orderBy: { name: "asc" }
                    }
                },
                orderBy: { name: "asc" }
            });

            const formattedZones = zones.map(z => ({
                id: z.id,
                name: z.name,
                woredas: z.children.map(w => ({
                    id: w.id,
                    name: w.name,
                    schools: w.children.map(s => ({
                        id: s.id,
                        name: s.name
                    }))
                }))
            }));

            const totalWoredas = formattedZones.reduce((acc, z) => acc + z.woredas.length, 0);
            const totalSchools = formattedZones.reduce(
                (acc, z) => acc + z.woredas.reduce((wAcc, w) => wAcc + w.schools.length, 0),
                0
            );

            return {
                regionId: actorScope.id,
                regionName: actorScope.name,
                totalZones: formattedZones.length,
                totalWoredas,
                totalSchools,
                zones: formattedZones
            };
        } else if (actorScope.type === "FEDERAL") {
            const regions = await prisma.organizationUnit.findMany({
                where: { type: "REGION" },
                select: {
                    id: true,
                    name: true,
                    children: {
                        where: { type: "ZONE" },
                        select: {
                            id: true,
                            name: true,
                            children: {
                                where: { type: "WOREDA" },
                                select: {
                                    id: true,
                                    name: true,
                                    children: {
                                        where: { type: "SCHOOL" },
                                        select: { id: true, name: true },
                                        orderBy: { name: "asc" }
                                    }
                                },
                                orderBy: { name: "asc" }
                            }
                        },
                        orderBy: { name: "asc" }
                    }
                },
                orderBy: { name: "asc" }
            });

            const formattedRegions = regions.map(r => ({
                id: r.id,
                name: r.name,
                zones: r.children.map(z => ({
                    id: z.id,
                    name: z.name,
                    woredas: z.children.map(w => ({
                        id: w.id,
                        name: w.name,
                        schools: w.children.map(s => ({
                            id: s.id,
                            name: s.name
                        }))
                    }))
                }))
            }));

            return {
                federalId: actorScope.id,
                federalName: actorScope.name,
                regions: formattedRegions
            };
        }

        return {
            unitId: actorScope.id,
            unitName: actorScope.name,
            zones: []
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
